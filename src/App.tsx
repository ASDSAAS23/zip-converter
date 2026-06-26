import { useState, useEffect } from 'react';
import { 
  FileArchive, 
  Sparkles, 
  FileDown, 
  RotateCcw, 
  AlertCircle, 
  HelpCircle, 
  CheckCircle2, 
  Eye, 
  FileImage, 
  Maximize2, 
  ArrowLeftRight,
  RefreshCw,
  FolderOpen,
  TrendingUp,
  Database,
  Trash2,
  Cpu,
  History,
  Volume2,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { ExtractedImage, PdfOptions, AppState } from './types';
import { Dropzone } from './components/Dropzone';
import { ImageItem } from './components/ImageItem';
import { PdfOptionsForm } from './components/PdfOptionsForm';
import { ProgressOverlay } from './components/ProgressOverlay';
import { extractImagesFromZip, generateDemoZip } from './utils/zipHelper';
import { generatePdfFromImages } from './utils/pdfHelper';
import { generateDocxFromZipItems } from './utils/docxHelper';
import { generateMarkdownFromZipItems } from './utils/markdownHelper';

const INITIAL_OPTIONS: PdfOptions = {
  pageSize: 'a4',
  orientation: 'auto',
  margin: 'none',
  compressionQuality: 0.8,
  filename: 'converted_document',
  exportFormat: 'pdf',
  representation: 'text',
};

interface HistoryItem {
  id: string;
  filename: string;
  pageCount: number;
  size: number;
  timestamp: number;
}

export default function App() {
  const [appState, setAppState] = useState<AppState>('idle');
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // PDF compilation results
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfSize, setPdfSize] = useState<number>(0);
  
  const [options, setOptions] = useState<PdfOptions>(INITIAL_OPTIONS);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Selection Handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(images.map(img => img.id));
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  // Download selected parts individually
  const handleDownloadSelectedIndividually = () => {
    const selectedImages = images.filter(img => selectedIds.includes(img.id));
    if (selectedImages.length === 0) return;
    
    selectedImages.forEach((img, idx) => {
      setTimeout(() => {
        const a = document.createElement('a');
        if (img.fileType === 'code' && img.textContent) {
          const blob = new Blob([img.textContent], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          a.href = url;
          a.download = img.originalName || img.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          a.href = img.dataUrl;
          a.download = img.originalName || img.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      }, idx * 150);
    });
  };
  
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
    type: 'extracting' | 'compiling';
  }>({
    current: 0,
    total: 0,
    message: '',
    type: 'extracting',
  });

  const [activePreview, setActivePreview] = useState<ExtractedImage | null>(null);
  const [previewMode, setPreviewMode] = useState<'text' | 'image'>('text');

  useEffect(() => {
    if (activePreview) {
      setPreviewMode(activePreview.fileType === 'code' ? 'text' : 'image');
    }
  }, [activePreview]);

  // Keyboard navigation for previews (sequential browsing, one page preview at a time)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePreview) return;
      const index = images.findIndex(img => img.id === activePreview.id);
      if (index === -1) return;

      if (e.key === 'ArrowRight' && index < images.length - 1) {
        setActivePreview(images[index + 1]);
      } else if (e.key === 'ArrowLeft' && index > 0) {
        setActivePreview(images[index - 1]);
      } else if (e.key === 'Escape') {
        setActivePreview(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreview, images]);

  // Load history on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zip_to_pdf_history');
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error loading history:', e);
    }
  }, []);

  const addToHistory = (filename: string, pageCount: number, size: number) => {
    const item: HistoryItem = {
      id: Date.now().toString(),
      filename,
      pageCount,
      size,
      timestamp: Date.now(),
    };
    setHistory(prev => {
      const updated = [item, ...prev].slice(0, 5); // limit to 5 items
      localStorage.setItem('zip_to_pdf_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('zip_to_pdf_history');
  };

  // Clean up Blob URL on unmount or reset
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  // Handle ZIP File extraction
  const handleZipSelection = async (file: File) => {
    try {
      setZipFile(file);
      setAppState('loading');
      setErrorMsg('');
      
      const cleanName = file.name.replace(/\.[^/.]+$/, ""); // strip extension
      const safeFilename = cleanName.replace(/[^a-zA-Z0-9_-]/g, "_");
      
      const extracted = await extractImagesFromZip(file, (current, total, currentName) => {
        setProgress({
          type: 'extracting',
          current,
          total,
          message: `Reading: ${currentName}`,
        });
      });

      if (extracted.length === 0) {
        setAppState('error');
        setErrorMsg('No files found in this ZIP archive.');
        return;
      }

      setImages(extracted);
      setSelectedIds(extracted.map(img => img.id));
      setOptions(prev => ({
        ...prev,
        filename: safeFilename || 'converted_document',
      }));
      setAppState('loaded');
    } catch (err: any) {
      console.error(err);
      setAppState('error');
      setErrorMsg(err.message || 'An error occurred while extracting the ZIP archive.');
    }
  };

  // Helper to load a demo ZIP file dynamically
  const handleLoadDemo = async () => {
    try {
      setAppState('loading');
      setProgress({
        type: 'extracting',
        current: 0,
        total: 100,
        message: 'Synthesizing demo vector images...',
      });
      const demoFile = await generateDemoZip();
      await handleZipSelection(demoFile);
    } catch (err: any) {
      console.error(err);
      setAppState('error');
      setErrorMsg('Failed to generate demo ZIP file.');
    }
  };

  // Move page up in compilation list
  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  // Move page down in compilation list
  const handleMoveDown = (index: number) => {
    if (index === images.length - 1) return;
    setImages(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Rotate image clockwise by 90 degrees
  const handleRotate = (id: string) => {
    setImages(prev =>
      prev.map(img => (img.id === id ? { ...img, rotation: (img.rotation + 90) % 360 } : img))
    );
    // If active preview is showing, rotate that too
    if (activePreview?.id === id) {
      setActivePreview(prev => prev ? { ...prev, rotation: (prev.rotation + 90) % 360 } : null);
    }
  };

  // Delete image from compilation list
  const handleDelete = (id: string) => {
    setSelectedIds(prev => prev.filter(x => x !== id));
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (filtered.length === 0) {
        setAppState('idle');
      }
      return filtered;
    });
  };

  // Reverse list order
  const handleReverseOrder = () => {
    setImages(prev => [...prev].reverse());
  };

  // Generate Document trigger
  const handleGenerateDocument = async () => {
    const selectedImages = images.filter(img => selectedIds.includes(img.id));
    if (selectedImages.length === 0) return;
    try {
      setAppState('generating');
      
      let blob: Blob;
      const fmt = options.exportFormat || 'pdf';
      
      if (fmt === 'docx') {
        blob = await generateDocxFromZipItems(selectedImages, options, (current, total, message) => {
          setProgress({
            type: 'compiling',
            current,
            total,
            message,
          });
        });
      } else if (fmt === 'md') {
        blob = await generateMarkdownFromZipItems(selectedImages, options, (current, total, message) => {
          setProgress({
            type: 'compiling',
            current,
            total,
            message,
          });
        });
      } else {
        blob = await generatePdfFromImages(selectedImages, options, (current, total, message) => {
          setProgress({
            type: 'compiling',
            current,
            total,
            message,
          });
        });
      }

      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }

      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      setPdfSize(blob.size);
      setAppState('completed');
      addToHistory(`${options.filename}.${fmt}`, selectedImages.length, blob.size);
    } catch (err: any) {
      console.error(err);
      setAppState('error');
      setErrorMsg(err.message || `An error occurred while compiling the ${(options.exportFormat || 'pdf').toUpperCase()} document.`);
    }
  };

  // Download compiled document file
  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `${options.filename || 'converted_document'}.${options.exportFormat || 'pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Reset state to start over
  const handleClear = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setImages([]);
    setSelectedIds([]);
    setZipFile(null);
    setPdfUrl(null);
    setPdfSize(0);
    setErrorMsg('');
    setOptions(INITIAL_OPTIONS);
    setAppState('idle');
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Computed totals for stats section
  const totalConversions = history.length;
  const totalBytesProcessed = history.reduce((acc, curr) => acc + curr.size, 0);

  return (
    <div className="min-h-screen bg-white text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex flex-col antialiased selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="w-full py-4 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div className="flex items-center">
              <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
                ZipToPdf<span className="text-blue-600">Converter</span>
              </h1>
              <span className="ml-4 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-medium border border-slate-200 dark:border-slate-700">v1.2.0</span>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">System Status</p>
            <p className="text-sm font-bold text-emerald-500 flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Engine Ready
            </p>
          </div>
        </div>
      </header>

      {/* Main Workspace with sidebar & content stage */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar - Statistics & Recent Sessions */}
        <aside className="w-72 bg-slate-50 dark:bg-slate-900/40 border-r border-slate-200 dark:border-slate-900 p-6 flex flex-col justify-between hidden lg:flex shrink-0">
          <div className="flex flex-col gap-8">
            
            {/* Process Stats Section */}
            <div>
              <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Process Stats</p>
              <div className="flex flex-col gap-3">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">PDFs Compiled</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{totalConversions}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Data Compiled</span>
                  <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-200 mt-1">{formatBytes(totalBytesProcessed)}</p>
                </div>
              </div>
            </div>

            {/* Recent Sessions Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Recent Sessions</p>
                {history.length > 0 && (
                  <button 
                    type="button" 
                    onClick={clearHistory}
                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>
              
              {history.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/50 dark:bg-slate-900/10">
                  <History className="w-5 h-5 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No recent exports in this session.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {history.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs flex items-start gap-2.5"
                    >
                      <div className="p-1.5 bg-blue-50 dark:bg-slate-800 rounded text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
                        <FileDown className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={`${item.filename}.pdf`}>
                          {item.filename}.pdf
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
                          {item.pageCount} pages | {formatBytes(item.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Engines / Sandbox Information */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Engine Specs</span>
            </div>
            <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400 dark:text-slate-500">
              <p>JSZip Parser: v3.10.1</p>
              <p>jsPDF Engine: v2.5.1</p>
              <p>Sandbox: Browser Isolated</p>
            </div>
          </div>
        </aside>

        {/* Content Workspace Area */}
        <main className="flex-1 flex flex-col p-8 overflow-y-auto bg-white dark:bg-slate-950">
          
          <div className="max-w-6xl w-full mx-auto flex-1 flex flex-col justify-between">
            
            {/* Stage Body */}
            <div>
              {/* Dynamic Workspace title/subtitle */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Convert New Archive</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Upload your compressed archive containing images, documents, or source code files and merge them into a high-quality PDF document.</p>
              </div>

              <AnimatePresence mode="wait">
                
                {/* Progress Overlay */}
                {(appState === 'loading' || appState === 'generating') && (
                  <ProgressOverlay
                    title={appState === 'loading' ? 'Extracting ZIP Archive' : 'Assembling PDF Document'}
                    message={progress.message}
                    current={progress.current}
                    total={progress.total}
                    type={appState === 'loading' ? 'extracting' : 'compiling'}
                  />
                )}

                {/* Idle State / File Uploader */}
                {appState === 'idle' && (
                  <motion.div
                    key="idle-state"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Dropzone 
                      onFileSelect={handleZipSelection} 
                      onDemoClick={handleLoadDemo} 
                      isExtracting={false}
                    />

                    {/* Informational feature badges */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 pt-8 border-t border-slate-100 dark:border-slate-900">
                      <div className="flex flex-col items-center text-center p-2">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400 mb-3">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Strictly Private</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                          All transformations take place in your browser cache.
                        </p>
                      </div>

                      <div className="flex flex-col items-center text-center p-2">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400 mb-3">
                          <ArrowLeftRight className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Flexible Sorting</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                          Rearrange pages, rotate orientations, or skip images.
                        </p>
                      </div>

                      <div className="flex flex-col items-center text-center p-2">
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-blue-600 dark:text-blue-400 mb-3">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Page Sizing</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                          Standardize to A4 / Letter, or size exactly to images.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error State */}
                {appState === 'error' && (
                  <motion.div
                    key="error-state"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-md mx-auto text-center py-12"
                  >
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-full inline-block text-rose-600 dark:text-rose-400 mb-4">
                      <AlertCircle className="w-12 h-12" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Extraction Failed</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                      {errorMsg}
                    </p>
                    <div className="flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleClear}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
                      >
                        Upload Another File
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Loaded State (Editor View) */}
                {appState === 'loaded' && (
                  <motion.div
                    key="editor-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
                  >
                    {/* Left Column: Image list */}
                    <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
                      
                      {/* Image count header with dynamic actions */}
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                        <div>
                          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            Extracted Archive Files
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                            Archive: <span className="font-mono bg-slate-50 dark:bg-slate-950 px-1.5 py-0.5 border border-slate-200 dark:border-slate-800 rounded">{zipFile?.name || 'demo_images.zip'}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 shrink-0">
                          {/* Document Type Segmented Slider */}
                          <div className="relative flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                            {(['pdf', 'docx', 'md'] as const).map((fmt) => (
                              <button
                                key={fmt}
                                type="button"
                                onClick={() => setOptions(prev => ({ ...prev, exportFormat: fmt }))}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase cursor-pointer select-none ${
                                  options.exportFormat === fmt
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/30 dark:border-slate-700/30'
                                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                                title={`Convert to ${fmt.toUpperCase()}`}
                              >
                                {fmt}
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={handleReverseOrder}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 font-bold text-xs transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Invert Page Order
                          </button>
                        </div>
                      </div>

                      {/* Selection Control Toolbar */}
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedIds.length === images.length) {
                                handleDeselectAll();
                              } else {
                                handleSelectAll();
                              }
                            }}
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                              selectedIds.length === images.length && images.length > 0
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400'
                            }`}
                            title={selectedIds.length === images.length ? "Deselect All" : "Select All"}
                          >
                            {selectedIds.length === images.length && images.length > 0 && (
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                            {selectedIds.length > 0 && selectedIds.length < images.length && (
                              <div className="w-2.5 h-0.5 bg-blue-600 rounded-sm" />
                            )}
                          </button>
                          
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            {selectedIds.length === images.length ? (
                              <span>All files selected ({images.length})</span>
                            ) : (
                              <span>{selectedIds.length} of {images.length} files selected</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                          >
                            Select All
                          </button>
                          <button
                            type="button"
                            onClick={handleDeselectAll}
                            className="text-xs font-semibold text-slate-500 hover:underline px-2 py-1"
                          >
                            Deselect All
                          </button>
                          
                          <span className="w-px h-4 bg-slate-200 dark:bg-slate-800 hidden sm:inline" />

                          <button
                            type="button"
                            disabled={selectedIds.length === 0}
                            onClick={handleDownloadSelectedIndividually}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:dark:text-slate-600 text-white rounded-lg font-bold text-xs transition-all cursor-pointer disabled:cursor-not-allowed shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Individually ({selectedIds.length})
                          </button>
                        </div>
                      </div>

                      {/* Images compilation container */}
                      <div className="flex flex-col gap-4 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence initial={false}>
                          {images.map((img, idx) => (
                            <ImageItem
                              key={img.id}
                              image={img}
                              index={idx}
                              totalImages={images.length}
                              isSelected={selectedIds.includes(img.id)}
                              onToggleSelect={() => handleToggleSelect(img.id)}
                              onMoveUp={() => handleMoveUp(idx)}
                              onMoveDown={() => handleMoveDown(idx)}
                              onRotate={() => handleRotate(img.id)}
                              onDelete={() => handleDelete(img.id)}
                              onPreview={() => setActivePreview(img)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Right Column: PDF configurations */}
                    <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
                      <PdfOptionsForm
                        options={options}
                        onChange={setOptions}
                        imageCount={selectedIds.length}
                        isGenerating={false}
                        onGenerate={handleGenerateDocument}
                        onClear={handleClear}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Completed State */}
                {appState === 'completed' && (
                  <motion.div
                    key="completed-state"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="max-w-xl mx-auto"
                  >
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl text-center flex flex-col items-center">
                      
                      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400 mb-6">
                        <CheckCircle2 className="w-12 h-12" />
                      </div>

                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {(options.exportFormat || 'pdf').toUpperCase()} Generated Successfully!
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                        Your document has been compiled and is ready for download in your browser.
                      </p>

                      {/* File Info Card */}
                      <div className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 text-left mb-8 flex flex-col gap-3 font-medium">
                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-150 dark:border-slate-800">
                          <span className="text-slate-400 font-mono">FILE NAME</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[200px]">{options.filename}.{options.exportFormat || 'pdf'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-150 dark:border-slate-800">
                          <span className="text-slate-400 font-mono">ZIP ITEMS INCLUDED</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold font-mono">{images.length} Items</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-mono">OUTPUT FILE SIZE</span>
                          <span className="text-slate-700 dark:text-slate-300 font-bold font-mono text-emerald-600 dark:text-emerald-400">{formatBytes(pdfSize)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                        <button
                          type="button"
                          onClick={handleDownload}
                          className="w-full py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" />
                          Download {(options.exportFormat || 'pdf').toUpperCase()} File
                        </button>

                        <button
                          type="button"
                          onClick={handleClear}
                          className="w-full py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-300 font-bold rounded-xl transition-all text-sm flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Convert Another Zip
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

            {/* High-fidelity Active Workspace Status Row (renders when ZIP loaded) */}
            {appState === 'loaded' && (
              <div className="h-20 bg-slate-900 dark:bg-slate-900 rounded-2xl flex items-center justify-between px-8 text-white mt-8 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg text-blue-400">
                    <FileImage className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Active Workspace</p>
                    <p className="text-sm font-bold text-white">{images.length} files loaded</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateDocument}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Generate Now
                </button>
              </div>
            )}

            {/* Stage Footer */}
            <div className="mt-12 pt-6 border-t border-slate-100 dark:border-slate-900 flex flex-col sm:flex-row justify-between items-center text-[11px] font-mono text-slate-400 dark:text-slate-600">
              <p>Local Sandbox instance: active | Buffer allocation: 256MB</p>
              <p>All files processed locally. No server uploads.</p>
            </div>

          </div>
        </main>
      </div>

      {/* Lightbox / Preview Dialog Modal */}
      <AnimatePresence>
        {activePreview && (
          <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col justify-between p-4 md:p-6" id="preview-modal">
            
            {/* Modal Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-white border-b border-white/10 pb-4 gap-4">
              <div className="flex items-center gap-3">
                {activePreview.fileType === 'code' ? (
                  <FileText className="w-5 h-5 text-emerald-400" />
                ) : activePreview.fileType === 'binary' ? (
                  <FileArchive className="w-5 h-5 text-purple-400" />
                ) : (
                  <FileImage className="w-5 h-5 text-blue-400" />
                )}
                <div>
                  <h4 className="font-bold text-sm truncate max-w-[200px] sm:max-w-[400px]">
                    {activePreview.name}
                  </h4>
                  <p className="text-[11px] text-white/50 font-mono">
                    {activePreview.fileType === 'code' ? 'Code/Text File' : activePreview.fileType === 'binary' ? 'Binary File' : 'Image File'} | {formatBytes(activePreview.size)}
                  </p>
                </div>
              </div>

              {/* Mode Toggle Tabs for Code Files */}
              {activePreview.fileType === 'code' && (
                <div className="flex bg-white/10 p-1 rounded-xl self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewMode('text')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      previewMode === 'text'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Raw Text
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode('image')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      previewMode === 'image'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/70 hover:text-white'
                    }`}
                  >
                    Rendered Page
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-2 self-end sm:self-auto">
                {/* Download Button */}
                <button
                  type="button"
                  onClick={() => {
                    const a = document.createElement('a');
                    if (activePreview.fileType === 'code' && activePreview.textContent) {
                      const blob = new Blob([activePreview.textContent], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      a.href = url;
                      a.download = activePreview.originalName || activePreview.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    } else {
                      a.href = activePreview.dataUrl;
                      a.download = activePreview.originalName || activePreview.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                  title="Download individual part"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>

                {/* Rotate inside Modal */}
                {previewMode === 'image' && (
                  <button
                    type="button"
                    onClick={() => handleRotate(activePreview.id)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/80 hover:text-white"
                    title="Rotate 90° Clockwise"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Modal Content Body with side arrows */}
            <div className="flex-1 flex items-center justify-center overflow-hidden my-6 w-full relative">
              {(() => {
                const activeIdx = images.findIndex(img => img.id === activePreview.id);
                const hasPrev = activeIdx > 0;
                const hasNext = activeIdx < images.length - 1;
                return (
                  <>
                    {hasPrev && (
                      <button
                        type="button"
                        onClick={() => setActivePreview(images[activeIdx - 1])}
                        className="absolute left-2 sm:left-4 p-3 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white rounded-full transition-all border border-white/10 backdrop-blur-sm shadow-xl hover:scale-105 active:scale-95 cursor-pointer z-10 flex items-center justify-center"
                        title="Previous Page (ArrowLeft)"
                      >
                        <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
                      </button>
                    )}

                    {activePreview.fileType === 'code' && previewMode === 'text' ? (
                      <div className="w-full max-w-4xl h-full flex flex-col bg-slate-900/90 border border-white/10 rounded-xl p-4 overflow-hidden mx-12 sm:mx-16">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs text-slate-400 font-mono">
                          <span>{activePreview.originalName || activePreview.name}</span>
                          <span>{activePreview.codeLanguage ? activePreview.codeLanguage.toUpperCase() : 'TEXT'}</span>
                        </div>
                        <pre className="flex-1 overflow-auto text-left font-mono text-xs text-slate-200 p-2 whitespace-pre select-text selection:bg-blue-500/30">
                          {activePreview.textContent || ''}
                        </pre>
                      </div>
                    ) : (
                      <motion.img
                        key={`${activePreview.id}-${activePreview.rotation}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={activePreview.dataUrl}
                        alt={activePreview.name}
                        className={`max-w-[75%] sm:max-w-[80%] max-h-full object-contain transition-transform duration-300 ${
                          activePreview.rotation === 90 ? 'rotate-90' :
                          activePreview.rotation === 180 ? 'rotate-180' :
                          activePreview.rotation === 270 ? 'rotate-270' : 'rotate-0'
                        }`}
                      />
                    )}

                    {hasNext && (
                      <button
                        type="button"
                        onClick={() => setActivePreview(images[activeIdx + 1])}
                        className="absolute right-2 sm:right-4 p-3 bg-white/5 hover:bg-white/10 active:bg-white/20 text-white rounded-full transition-all border border-white/10 backdrop-blur-sm shadow-xl hover:scale-105 active:scale-95 cursor-pointer z-10 flex items-center justify-center"
                        title="Next Page (ArrowRight)"
                      >
                        <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
                      </button>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Modal Footer (Page hint) */}
            <div className="text-center text-xs text-white/50 font-mono pb-2">
              {(() => {
                const activeIdx = images.findIndex(img => img.id === activePreview.id);
                return `Page ${activeIdx + 1} of ${images.length} — ${activePreview.name}`;
              })()}
            </div>

          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
