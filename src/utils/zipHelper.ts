import JSZip from 'jszip';
import { ExtractedImage } from '../types';

// Simple natural sort for strings (handles digits inside strings correctly, e.g. img_2 before img_10)
const naturalSort = (a: string, b: string): number => {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

export const getImageDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 800, height: 600 }); // Fallback
    };
    img.src = dataUrl;
  });
};

const getMimeType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    default:
      return 'image/jpeg'; // fallback
  }
};

// --- Custom Syntax Highlighting and High-fidelity Code Pages ---
interface Token {
  text: string;
  color: string;
}

const tokenizeLine = (line: string, isCommentBlock: boolean): { tokens: Token[]; isCommentBlock: boolean } => {
  const tokens: Token[] = [];
  
  if (isCommentBlock) {
    const endCommentIdx = line.indexOf('*/');
    if (endCommentIdx !== -1) {
      tokens.push({ text: line.substring(0, endCommentIdx + 2), color: '#64748b' }); // slate-500
      const rest = line.substring(endCommentIdx + 2);
      const restRes = tokenizeLine(rest, false);
      tokens.push(...restRes.tokens);
      return { tokens, isCommentBlock: restRes.isCommentBlock };
    } else {
      tokens.push({ text: line, color: '#64748b' });
      return { tokens, isCommentBlock: true };
    }
  }

  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('#')) {
    tokens.push({ text: line, color: '#64748b' });
    return { tokens, isCommentBlock: false };
  }
  
  if (trimmed.startsWith('--') || trimmed.startsWith('/*')) {
    if (trimmed.startsWith('/*') && !trimmed.includes('*/')) {
      tokens.push({ text: line, color: '#64748b' });
      return { tokens, isCommentBlock: true };
    }
    tokens.push({ text: line, color: '#64748b' });
    return { tokens, isCommentBlock: false };
  }

  // Common keywords across PHP, CSS, HTML, JS/TS, SQL, Python, C++, etc.
  const keywordRegex = /\b(function|class|import|export|return|const|let|var|if|else|for|while|select|insert|update|delete|from|where|php|echo|html|div|body|public|private|protected|extends|implements|interface|namespace|use|table|create|primary|key|varchar|int|null|true|false|void|this|new|try|catch|finally|throw|break|continue|default|switch|case|as|from|import|default)\b/i;
  
  const regex = /("[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|`[^`\\]*(?:\\.[`\\]*)*`|\b\d+\b|\b[a-zA-Z_][a-zA-Z0-9_]*\b|\s+|[^a-zA-Z0-9_\s'"`]+)/g;
  
  let match;
  while ((match = regex.exec(line)) !== null) {
    const part = match[0];
    if (part.startsWith('"') || part.startsWith("'") || part.startsWith('`')) {
      tokens.push({ text: part, color: '#34d399' }); // green strings
    } else if (/^\d+$/.test(part)) {
      tokens.push({ text: part, color: '#facc15' }); // yellow numbers
    } else if (keywordRegex.test(part)) {
      tokens.push({ text: part, color: '#38bdf8' }); // cyan/blue keywords
    } else if (/^\s+$/.test(part)) {
      tokens.push({ text: part, color: '#e2e8f0' }); // whitespace
    } else if (/^[\\{\\}\\(\\)\\[\\]\\;\\,\\.]+$/.test(part)) {
      tokens.push({ text: part, color: '#94a3b8' }); // punctuation
    } else {
      tokens.push({ text: part, color: '#e2e8f0' }); // default slate-200
    }
  }

  if (tokens.length === 0) {
    tokens.push({ text: line, color: '#e2e8f0' });
  }

  return { tokens, isCommentBlock: false };
};

const wrapCodeLine = (line: string, maxChars: number): string[] => {
  if (line.length <= maxChars) return [line];
  const wrapped: string[] = [];
  let current = line;
  while (current.length > maxChars) {
    wrapped.push(current.substring(0, maxChars));
    current = '  ' + current.substring(maxChars); // add indent for wrapped part
  }
  wrapped.push(current);
  return wrapped;
};

const getLanguageFromFilename = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'php': return 'PHP Source';
    case 'css': return 'CSS Stylesheet';
    case 'html': return 'HTML Document';
    case 'js':
    case 'jsx': return 'JavaScript Source';
    case 'ts':
    case 'tsx': return 'TypeScript Source';
    case 'json': return 'JSON Configuration';
    case 'sql':
    case 'mysql': return 'MySQL / SQL Script';
    case 'py': return 'Python Script';
    case 'sh': return 'Shell Script';
    case 'xml': return 'XML Document';
    case 'yaml':
    case 'yml': return 'YAML File';
    case 'java': return 'Java Source';
    case 'cpp': return 'C++ Source';
    case 'c': return 'C Source';
    case 'h': return 'C Header';
    case 'cs': return 'C# Source';
    case 'go': return 'Go Source';
    case 'rs': return 'Rust Source';
    case 'rb': return 'Ruby Script';
    case 'md': return 'Markdown';
    case 'txt': return 'Plain Text';
    default: return ext ? ext.toUpperCase() : 'Text Source';
  }
};

const formatBytesLocal = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const renderTextToPages = (
  filename: string,
  content: string,
  fileSize: number
): ExtractedImage[] => {
  const rawLines = content.split(/\r?\n/);
  const processedLines: string[] = [];
  for (const line of rawLines) {
    processedLines.push(...wrapCodeLine(line, 60));
  }

  const linesPerPage = 28;
  const totalPages = Math.max(1, Math.ceil(processedLines.length / linesPerPage));
  const pages: ExtractedImage[] = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d')!;

    // Background (Slate-950)
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 1200, 1600);

    // Grid pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.012)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1600);
      ctx.stroke();
    }
    for (let y = 0; y < 1600; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // IDE Header bar
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, 1200, 90);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 90);
    ctx.lineTo(1200, 90);
    ctx.stroke();

    // Red, yellow, green window actions
    const drawCircle = (cx: number, cy: number, r: number, color: string) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    };
    drawCircle(50, 45, 10, '#ef4444');
    drawCircle(85, 45, 10, '#eab308');
    drawCircle(120, 45, 10, '#22c55e');

    // Filename center
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 28px Courier, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const pageLabel = totalPages > 1 ? ` (${pageIdx + 1}/${totalPages})` : '';
    ctx.fillText(`${filename}${pageLabel}`, 600, 45);

    // IDE logo far right
    ctx.fillStyle = '#4b5563';
    ctx.font = '22px Courier, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('ZIP-TO-PDF IDE', 1150, 45);

    // Gutter for line numbers
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 90, 110, 1510);

    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(110, 90);
    ctx.lineTo(110, 1600);
    ctx.stroke();

    const startLineIdx = pageIdx * linesPerPage;
    const endLineIdx = Math.min(processedLines.length, startLineIdx + linesPerPage);
    
    let isCommentBlock = false;
    let yCoord = 150;

    for (let i = startLineIdx; i < endLineIdx; i++) {
      const lineText = processedLines[i];
      const lineNum = i + 1;

      // Draw line number
      ctx.fillStyle = '#4b5563';
      ctx.font = '26px Courier, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(lineNum.toString(), 90, yCoord);

      // Tokenize
      const { tokens, isCommentBlock: nextIsCommentBlock } = tokenizeLine(lineText, isCommentBlock);
      isCommentBlock = nextIsCommentBlock;

      let xCoord = 140;
      ctx.font = '28px Courier, monospace';
      ctx.textAlign = 'left';

      for (const t of tokens) {
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, xCoord, yCoord);
        xCoord += ctx.measureText(t.text).width;
      }

      yCoord += 48; // Line spacing
    }

    // Status bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 1540, 1200, 60);
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 1540);
    ctx.lineTo(1200, 1540);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '20px Courier, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`UTF-8  |  Language: ${getLanguageFromFilename(filename)}`, 40, 1570);

    ctx.textAlign = 'right';
    ctx.fillText(`Lines: ${processedLines.length}  |  Size: ${formatBytesLocal(fileSize)}`, 1160, 1570);

    const dataUrl = canvas.toDataURL('image/png');

    pages.push({
      id: `${Date.now()}-${pageIdx}-${Math.random().toString(36).substr(2, 5)}`,
      name: totalPages > 1 ? `${filename} (Part ${pageIdx + 1})` : filename,
      originalName: filename,
      dataUrl,
      width: 1200,
      height: 1600,
      size: fileSize,
      rotation: 0,
      fileType: 'code',
      textContent: content,
      codeLanguage: filename.split('.').pop()?.toLowerCase() || '',
    });
  }

  return pages;
};

export const renderDocumentPlaceholderToPage = (
  filename: string,
  fileSize: number
): ExtractedImage => {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, 1200, 1600);

  // Glow
  const glow = ctx.createRadialGradient(600, 800, 50, 600, 800, 700);
  glow.addColorStop(0, '#111e36');
  glow.addColorStop(1, '#090d16');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1200, 1600);

  // Grid
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1200; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1600);
    ctx.stroke();
  }
  for (let y = 0; y < 1600; y += 80) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1200, y);
    ctx.stroke();
  }

  // Border
  ctx.strokeStyle = '#2563eb';
  ctx.lineWidth = 10;
  ctx.strokeRect(50, 50, 1100, 1500);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 2;
  ctx.strokeRect(70, 70, 1060, 1460);

  // Card Box
  const cardX = 150;
  const cardY = 250;
  const cardW = 900;
  const cardH = 1100;
  const radius = 30;

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(cardX + radius, cardY);
  ctx.lineTo(cardX + cardW - radius, cardY);
  ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
  ctx.lineTo(cardX + cardW, cardY + cardH - radius);
  ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
  ctx.lineTo(cardX + radius, cardY + cardH);
  ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
  ctx.lineTo(cardX, cardY + radius);
  ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Document graphic
  const ext = filename.split('.').pop()?.toLowerCase() || 'bin';
  let badgeColor = '#64748b';
  if (ext === 'pdf') badgeColor = '#ef4444';
  else if (['zip', 'rar', 'tar', '7z', 'gz'].includes(ext)) badgeColor = '#a855f7';
  else if (['docx', 'doc', 'rtf', 'odt'].includes(ext)) badgeColor = '#3b82f6';
  else if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) badgeColor = '#10b981';
  else if (['pptx', 'ppt', 'key'].includes(ext)) badgeColor = '#f97316';
  else if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) badgeColor = '#ec4899';
  else if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) badgeColor = '#06b6d4';

  const sheetX = 600 - 150;
  const sheetY = 380;
  const sheetW = 300;
  const sheetH = 400;
  const foldSize = 80;

  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(sheetX, sheetY);
  ctx.lineTo(sheetX + sheetW - foldSize, sheetY);
  ctx.lineTo(sheetX + sheetW, sheetY + foldSize);
  ctx.lineTo(sheetX + sheetW, sheetY + sheetH);
  ctx.lineTo(sheetX, sheetY + sheetH);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = badgeColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.moveTo(sheetX + sheetW - foldSize, sheetY);
  ctx.lineTo(sheetX + sheetW - foldSize, sheetY + foldSize);
  ctx.lineTo(sheetX + sheetW, sheetY + foldSize);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  for (let offset = 140; offset <= 300; offset += 50) {
    if (offset === 140) {
      ctx.beginPath();
      ctx.moveTo(sheetX + 50, sheetY + offset);
      ctx.lineTo(sheetX + 150, sheetY + offset);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(sheetX + 50, sheetY + offset);
      ctx.lineTo(sheetX + 250, sheetY + offset);
      ctx.stroke();
    }
  }

  const pillW = 200;
  const pillH = 60;
  const pillX = 600 - pillW / 2;
  const pillY = 740;

  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.arc(pillX + 30, pillY + 30, 30, 0, 2 * Math.PI);
  ctx.arc(pillX + pillW - 30, pillY + 30, 30, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillRect(pillX + 30, pillY, pillW - 60, pillH);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Courier, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(ext.toUpperCase(), 600, pillY + 30);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('Preserved Document Page', 600, 880);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '32px sans-serif';
  ctx.fillText(filename, 600, 940);

  ctx.strokeStyle = '#1f2937';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cardX + 100, 1010);
  ctx.lineTo(cardX + cardW - 100, 1010);
  ctx.stroke();

  ctx.fillStyle = '#4b5563';
  ctx.font = 'bold 24px Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ARCHIVE PATH', cardX + 120, 1060);
  ctx.fillText('FILE CAPACITY', cardX + 120, 1120);
  ctx.fillText('ENCODING FORMAT', cardX + 120, 1180);

  ctx.fillStyle = '#9ca3af';
  ctx.font = '24px Courier, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(filename, cardX + cardW - 120, 1060);
  ctx.fillText(formatBytesLocal(fileSize), cardX + cardW - 120, 1120);
  ctx.fillText('Binary Blob Frame', cardX + cardW - 120, 1180);

  ctx.fillStyle = '#4b5563';
  ctx.font = 'italic 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('This binary/non-image document has been successfully preserved.', 600, 1260);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.font = 'bold 24px Courier, monospace';
  ctx.fillText('ZIP-TO-PDF RECONSTRUCTION PIPELINE', 600, 1440);

  const dataUrl = canvas.toDataURL('image/png');

  return {
    id: `${Date.now()}-doc-${Math.random().toString(36).substr(2, 5)}`,
    name: filename,
    originalName: filename,
    dataUrl,
    width: 1200,
    height: 1600,
    size: fileSize,
    rotation: 0,
    fileType: 'binary',
  };
};

export const extractImagesFromZip = async (
  file: File,
  onProgress: (current: number, total: number, currentName: string) => void
): Promise<ExtractedImage[]> => {
  const zip = new JSZip();
  const contents = await zip.loadAsync(file);
  
  // Find all files (ignoring Mac metadata, e.g. __MACOSX and directories)
  const allFiles = Object.keys(contents.files)
    .filter((filepath) => {
      const isMacMeta = filepath.includes('__MACOSX');
      const isDir = contents.files[filepath].dir;
      return !isMacMeta && !isDir;
    })
    // Sort files naturally by path/filename
    .sort(naturalSort);

  const total = allFiles.length;
  const extracted: ExtractedImage[] = [];

  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'];
  const codeExtensions = [
    'txt', 'md', 'html', 'css', 'js', 'jsx', 'ts', 'tsx', 'json', 
    'php', 'sql', 'mysql', 'py', 'sh', 'xml', 'yaml', 'yml', 
    'java', 'cpp', 'c', 'h', 'cs', 'go', 'rs', 'rb', 
    'ini', 'cfg', 'config', 'env', 'gitignore', 'lock', 'properties'
  ];

  for (let i = 0; i < total; i++) {
    const path = allFiles[i];
    const zipEntry = contents.files[path];
    const filename = path.split('/').pop() || path;
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    onProgress(i + 1, total, filename);

    const isImage = imageExtensions.includes(ext);
    const isCode = codeExtensions.includes(ext);

    if (isImage) {
      // Read the file as uint8array
      const fileData = await zipEntry.async('uint8array');
      const mimeType = getMimeType(filename);
      
      // Convert to Base64 Data URL
      let binary = '';
      const len = fileData.byteLength;
      for (let j = 0; j < len; j++) {
        binary += String.fromCharCode(fileData[j]);
      }
      const base64 = window.btoa(binary);
      const dataUrl = `data:${mimeType};base64,${base64}`;

      // Get dimensions
      const { width, height } = await getImageDimensions(dataUrl);

      extracted.push({
        id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: filename,
        originalName: path,
        dataUrl,
        width,
        height,
        size: fileData.byteLength,
        rotation: 0,
        fileType: 'image',
      });
    } else if (isCode) {
      // Read as text content
      const textContent = await zipEntry.async('text');
      const fileData = await zipEntry.async('uint8array');
      
      const pages = renderTextToPages(filename, textContent, fileData.byteLength);
      pages.forEach(p => p.originalName = path);
      extracted.push(...pages);
    } else {
      // Read as binary to draw placeholder
      const fileData = await zipEntry.async('uint8array');
      const page = renderDocumentPlaceholderToPage(filename, fileData.byteLength);
      page.originalName = path;
      extracted.push(page);
    }
  }

  return extracted;
};

// Generates a mock ZIP file with 3 beautiful programmatically drawn images
// This lets users test the app instantly without finding a real zip file of images.
export const generateDemoZip = async (): Promise<File> => {
  const zip = new JSZip();
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d')!;

  const drawPage = (pageNum: number, bgColor: string, accentColor: string, title: string) => {
    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, 1600);
    grad.addColorStop(0, bgColor);
    grad.addColorStop(1, '#0f172a'); // slate-900 fallback
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 1600);

    // Decorative geometric background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1600);
      ctx.stroke();
    }
    for (let y = 0; y < 1600; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Outer frame
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 20;
    ctx.strokeRect(40, 40, 1120, 1520);

    // Sub-frame inside
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.strokeRect(60, 60, 1080, 1480);

    // Draw stylized circle/ring
    ctx.beginPath();
    ctx.arc(600, 550, 240, 0, Math.PI * 2);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 12;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(600, 550, 180, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Large numbers inside the ring
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 240px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pageNum.toString(), 600, 550);

    // Accent header text
    ctx.fillStyle = accentColor;
    ctx.font = 'bold 44px JetBrains Mono, monospace';
    ctx.letterSpacing = '6px';
    ctx.fillText('ZIP TO PDF CONVERTER DEMO', 600, 220);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 80px Inter, system-ui, sans-serif';
    ctx.fillText(title, 600, 960);

    // Description/body text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '400 36px Inter, system-ui, sans-serif';
    ctx.fillText('This high-quality page was drawn fully client-side', 600, 1080);
    ctx.fillText('and packed into a zip archive dynamically.', 600, 1140);

    // Metadata block at bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '30px JetBrains Mono, monospace';
    ctx.fillText(`Resolution: 1200 x 1600 px  |  Page ID: demo-page-${pageNum}`, 600, 1420);
    ctx.fillText(`Generated: ${new Date().toLocaleDateString()}`, 600, 1470);

    // Return as blob
    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob!);
      }, 'image/png');
    });
  };

  const blob1 = await drawPage(1, '#1e1b4b', '#6366f1', 'Extract Zip Files'); // Indigo
  const blob2 = await drawPage(2, '#064e3b', '#10b981', 'Arrange Images & Reorder'); // Emerald
  const blob3 = await drawPage(3, '#701a75', '#f43f5e', 'Compile to Elegant PDF'); // Rose / Pink

  zip.file('01_extract_zip_files.png', blob1);
  zip.file('02_arrange_images.png', blob2);
  zip.file('03_compile_to_pdf.png', blob3);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  return new File([zipBlob], 'demo_images.zip', { type: 'application/zip' });
};
