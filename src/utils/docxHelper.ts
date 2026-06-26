import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  ImageRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  HeadingLevel 
} from 'docx';
import { ExtractedImage, PdfOptions } from '../types';

// Convert base64 dataUrl to Uint8Array for docx embedding
const dataUrlToUint8Array = (dataUrl: string): Uint8Array => {
  const parts = dataUrl.split(';base64,');
  const base64 = parts[parts.length - 1];
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const generateDocxFromZipItems = async (
  items: ExtractedImage[],
  options: PdfOptions,
  onProgress: (current: number, total: number, message: string) => void
): Promise<Blob> => {
  const total = items.length;
  const docChildren: any[] = [];

  // Create Title Page / Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: options.filename.toUpperCase(),
          bold: true,
          size: 48, // 24pt
          color: '2563eb', // Blue-600
          font: 'Arial',
        }),
      ],
      spacing: { before: 400, after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generated via Zip-to-PDF Conversion Engine`,
          italics: true,
          size: 22, // 11pt
          color: '64748b', // Slate-500
          font: 'Arial',
        }),
      ],
      spacing: { after: 600 },
    })
  );

  // Group items by originalName to ensure we don't write duplicate code files
  // when a code file was split into multiple canvas pages.
  const processedFiles = new Set<string>();

  for (let i = 0; i < total; i++) {
    const item = items[i];
    onProgress(i + 1, total, `Processing item ${i + 1} of ${total} into Word document...`);

    const isTextMode = options.representation === 'text';

    if (isTextMode) {
      if (item.fileType === 'code') {
        // Since code files might have been split into multiple pages during ZIP extraction,
        // we only write the text content ONCE per unique original file path.
        if (processedFiles.has(item.originalName)) {
          continue; // skip duplicate pages since we are writing full text
        }
        processedFiles.add(item.originalName);

        // File Header
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `File: ${item.originalName}`,
                bold: true,
                size: 28, // 14pt
                color: '1e3a8a', // Dark blue
                font: 'Consolas',
              }),
            ],
            spacing: { before: 300, after: 100 },
          })
        );

        // For the text part, don't use a table or IDE style. Use normal text and no emojis.
        const lines = (item.textContent || '').split(/\r?\n/);
        lines.forEach((line) => {
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: 'Consolas',
                  size: 20, // 10pt
                  color: '000000', // normal text
                }),
              ],
              spacing: { before: 20, after: 20 },
            })
          );
        });
        docChildren.push(new Paragraph({ spacing: { after: 200 } })); // spacer

      } else if (item.fileType === 'binary') {
        if (processedFiles.has(item.originalName)) {
          continue;
        }
        processedFiles.add(item.originalName);

        // Binary File Preservation Notice (No emojis, no tables, just normal text)
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Archived File: ${item.name}`,
                bold: true,
                size: 26, // 13pt
                color: '7c3aed', // Purple
                font: 'Arial',
              }),
            ],
            spacing: { before: 300, after: 100 },
          })
        );

        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Preserved Document Metadata`,
                bold: true,
                size: 20,
                color: '4c1d95',
              }),
            ],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Path: `, bold: true, size: 18 }),
              new TextRun({ text: `${item.originalName}`, font: 'Consolas', size: 18 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Size: `, bold: true, size: 18 }),
              new TextRun({ text: `${(item.size / 1024).toFixed(2)} KB`, font: 'Consolas', size: 18 }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: `Format: `, bold: true, size: 18 }),
              new TextRun({ text: `Non-image / Binary Archive Segment`, italics: true, size: 18 }),
            ],
          })
        );
        docChildren.push(new Paragraph({ spacing: { after: 200 } }));

      } else {
        // Image
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Image: ${item.name}`,
                bold: true,
                size: 26,
                color: '10b981', // Emerald-600
                font: 'Arial',
              }),
            ],
            spacing: { before: 300, after: 100 },
          })
        );

        // Proportional scale to fit document width (Max width of 500pt)
        const maxWidth = 500;
        let dWidth = item.width;
        let dHeight = item.height;
        if (dWidth > maxWidth) {
          const ratio = maxWidth / dWidth;
          dWidth = maxWidth;
          dHeight = dHeight * ratio;
        }

        try {
          docChildren.push(
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new ImageRun({
                  data: dataUrlToUint8Array(item.dataUrl),
                  transformation: {
                    width: dWidth,
                    height: dHeight,
                  },
                } as any),
              ],
              spacing: { after: 300 },
            })
          );
        } catch (err) {
          console.error('Error drawing image in docx:', err);
          docChildren.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Error drawing image: ${item.name}]`,
                  italics: true,
                  color: 'ef4444',
                }),
              ],
            })
          );
        }
      }
    } else {
      // Image-centric mode: Embed full page images for every extracted page / screenshot
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Page: ${item.name}`,
              bold: true,
              size: 24,
              color: '1e293b', // Slate-800
              font: 'Arial',
            }),
          ],
          spacing: { before: 200, after: 100 },
        })
      );

      // Proportional scale
      const maxWidth = 500;
      let dWidth = item.width;
      let dHeight = item.height;
      if (dWidth > maxWidth) {
        const ratio = maxWidth / dWidth;
        dWidth = maxWidth;
        dHeight = dHeight * ratio;
      }

      try {
        docChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: dataUrlToUint8Array(item.dataUrl),
                transformation: {
                  width: dWidth,
                  height: dHeight,
                },
              } as any),
            ],
            spacing: { after: 300 },
          })
        );
      } catch (err) {
        console.error('Error drawing screenshot in docx:', err);
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[Error drawing screenshot page: ${item.name}]`,
                italics: true,
                color: 'ef4444',
              }),
            ],
          })
        );
      }
    }
  }

  // Build the Word document section
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  onProgress(total, total, 'Compiling and packing Word document file...');
  const blobOutput = await Packer.toBlob(doc);
  return blobOutput;
};
