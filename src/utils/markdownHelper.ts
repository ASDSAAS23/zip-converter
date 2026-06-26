import { ExtractedImage, PdfOptions } from '../types';

export const generateMarkdownFromZipItems = async (
  items: ExtractedImage[],
  options: PdfOptions,
  onProgress: (current: number, total: number, message: string) => void
): Promise<Blob> => {
  const total = items.length;
  let mdContent = '';

  // Document Title Header
  mdContent += `# ${options.filename.toUpperCase()}\n\n`;
  mdContent += `*Generated on ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} using the Zip-to-PDF/Docx Reconstruction Engine.*\n\n`;
  mdContent += `---\n\n`;

  const processedFiles = new Set<string>();

  for (let i = 0; i < total; i++) {
    const item = items[i];
    onProgress(i + 1, total, `Processing item ${i + 1} of ${total} into Markdown...`);

    const isTextMode = options.representation === 'text';

    if (isTextMode) {
      if (item.fileType === 'code') {
        // Dedup pages for the same file in text-centric mode
        if (processedFiles.has(item.originalName)) {
          continue;
        }
        processedFiles.add(item.originalName);

        mdContent += `## File: \`${item.originalName}\`\n\n`;
        mdContent += `\`\`\`${item.codeLanguage || ''}\n`;
        mdContent += `${item.textContent || ''}\n`;
        mdContent += `\`\`\`\n\n`;
        mdContent += `---\n\n`;

      } else if (item.fileType === 'binary') {
        if (processedFiles.has(item.originalName)) {
          continue;
        }
        processedFiles.add(item.originalName);

        mdContent += `## Archived Binary: \`${item.name}\`\n\n`;
        mdContent += `**Preserved Document Metadata**\n`;
        mdContent += `- **Path**: \`${item.originalName}\`\n`;
        mdContent += `- **Size**: \`${(item.size / 1024).toFixed(2)} KB\`\n`;
        mdContent += `- **Type**: Non-image / Binary Archive Segment\n`;
        mdContent += `- **Status**: Successfully Preserved in Archive\n\n`;
        mdContent += `---\n\n`;

      } else {
        // Image
        mdContent += `## Image: \`${item.name}\`\n\n`;
        mdContent += `![${item.name}](${item.dataUrl})\n\n`;
        mdContent += `---\n\n`;
      }
    } else {
      // Image-centric mode: Embed full page high-fidelity screenshots / preview dataUrl images
      mdContent += `## Page: ${item.name}\n\n`;
      mdContent += `![${item.name}](${item.dataUrl})\n\n`;
      mdContent += `---\n\n`;
    }
  }

  onProgress(total, total, 'Assembling and compiling markdown file...');
  const blobOutput = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  return blobOutput;
};
