import { jsPDF } from 'jspdf';
import { ExtractedImage, PdfOptions } from '../types';

// Pre-rotates an image using Canvas to ensure flawless orientation in PDF
export const rotateImage = (dataUrl: string, angle: number): Promise<{ dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (angle === 0 || angle === 360) {
        resolve({ dataUrl, width: img.naturalWidth, height: img.naturalHeight });
        return;
      }
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const is90or270 = angle === 90 || angle === 270;
      canvas.width = is90or270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = is90or270 ? img.naturalWidth : img.naturalHeight;
      
      // Center rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((angle * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', 0.95),
        width: canvas.width,
        height: canvas.height,
      });
    };
    img.onerror = () => {
      resolve({ dataUrl, width: 800, height: 600 });
    };
    img.src = dataUrl;
  });
};

export const generatePdfFromImages = async (
  images: ExtractedImage[],
  options: PdfOptions,
  onProgress: (current: number, total: number, message: string) => void
): Promise<Blob> => {
  const total = images.length;
  let doc: jsPDF | null = null;

  // Margin mapping in mm
  let marginMm = 0;
  if (options.margin === 'thin') {
    marginMm = 5;
  } else if (options.margin === 'normal') {
    marginMm = 12;
  }

  for (let i = 0; i < total; i++) {
    const imgItem = images[i];
    onProgress(i + 1, total, `Processing and rotating page ${i + 1}...`);

    // 1. Rotate the image on Canvas if needed
    const rotated = await rotateImage(imgItem.dataUrl, imgItem.rotation);

    // Pixels to MM at 96 DPI
    const pxToMm = 25.4 / 96;
    const imgWidthMm = rotated.width * pxToMm;
    const imgHeightMm = rotated.height * pxToMm;

    // 2. Determine Page Dimensions and Orientation
    let pageWidth = 210; // A4 default
    let pageHeight = 297;
    let format: string | [number, number] = 'a4';
    let isLandscape = false;

    if (options.pageSize === 'letter') {
      pageWidth = 215.9;
      pageHeight = 279.4;
      format = 'letter';
    }

    // Determine Orientation
    if (options.pageSize !== 'fit') {
      const isImageWide = imgWidthMm > imgHeightMm;
      if (options.orientation === 'landscape') {
        isLandscape = true;
      } else if (options.orientation === 'auto') {
        isLandscape = isImageWide;
      }

      if (isLandscape) {
        // Swap dimensions for landscape
        const temp = pageWidth;
        pageWidth = pageHeight;
        pageHeight = temp;
      }
    } else {
      // Fit to image dimensions
      pageWidth = imgWidthMm + 2 * marginMm;
      pageHeight = imgHeightMm + 2 * marginMm;
      format = [pageWidth, pageHeight];
    }

    // 3. Initialize or Add Page
    const docOrientation = isLandscape ? 'landscape' : 'portrait';
    if (i === 0) {
      doc = new jsPDF({
        orientation: docOrientation,
        unit: 'mm',
        format: format,
      });
    } else {
      doc!.addPage(format, docOrientation);
    }

    // 4. Calculate drawn dimensions and coordinates
    let drawnWidth = imgWidthMm;
    let drawnHeight = imgHeightMm;
    let x = marginMm;
    let y = marginMm;

    if (options.pageSize !== 'fit') {
      const printableWidth = pageWidth - 2 * marginMm;
      const printableHeight = pageHeight - 2 * marginMm;

      const scale = Math.min(printableWidth / imgWidthMm, printableHeight / imgHeightMm);
      drawnWidth = imgWidthMm * scale;
      drawnHeight = imgHeightMm * scale;

      // Center the image in printable area
      x = marginMm + (printableWidth - drawnWidth) / 2;
      y = marginMm + (printableHeight - drawnHeight) / 2;
    }

    // 5. Add Image to PDF
    // We use standard jpeg/png from dataUrl. Format is determined by the mime-type.
    // Quality compression is handled here: jsPDF addImage accepts compression level.
    // 'FAST', 'MEDIUM', 'SLOW' are typical compression aliases, but jsPDF also supports JPEG format
    // where compression can be passed.
    onProgress(i + 1, total, `Adding page ${i + 1} to PDF...`);
    
    // Extract file format from base64 string header
    let imgFormat = 'JPEG';
    if (rotated.dataUrl.includes('image/png')) {
      imgFormat = 'PNG';
    } else if (rotated.dataUrl.includes('image/webp')) {
      imgFormat = 'WEBP';
    }

    doc!.addImage(
      rotated.dataUrl,
      imgFormat,
      x,
      y,
      drawnWidth,
      drawnHeight,
      undefined,
      options.compressionQuality > 0.7 ? 'NONE' : 'FAST'
    );
  }

  onProgress(total, total, 'Compiling and packaging PDF file...');
  const pdfOutput = doc!.output('blob');
  return pdfOutput;
};
