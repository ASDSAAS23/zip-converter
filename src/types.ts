export interface ExtractedImage {
  id: string;
  name: string;
  originalName: string;
  dataUrl: string; // Base64 data url for preview and rendering
  width: number;
  height: number;
  size: number; // in bytes
  rotation: number; // 0, 90, 180, 270 degrees
  fileType: 'image' | 'code' | 'binary';
  textContent?: string; // Original text for code/text files
  codeLanguage?: string;
}

export type PageSize = 'a4' | 'letter' | 'fit';
export type PageOrientation = 'portrait' | 'landscape' | 'auto';
export type PageMargin = 'none' | 'thin' | 'normal';
export type ExportFormat = 'pdf' | 'docx' | 'md';
export type OutputRepresentation = 'text' | 'images';

export interface PdfOptions {
  pageSize: PageSize;
  orientation: PageOrientation;
  margin: PageMargin;
  compressionQuality: number; // 0.1 to 1.0
  filename: string;
  exportFormat: ExportFormat;
  representation: OutputRepresentation;
}

export type AppState = 'idle' | 'loading' | 'loaded' | 'generating' | 'completed' | 'error';
