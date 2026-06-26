import React from 'react';
import { Settings, FileText, Layout, Sparkles, Sliders, ChevronRight } from 'lucide-react';
import { PdfOptions, PageSize, PageOrientation, PageMargin, ExportFormat, OutputRepresentation } from '../types';

interface PdfOptionsFormProps {
  options: PdfOptions;
  onChange: (options: PdfOptions) => void;
  onGenerate: () => void;
  onClear: () => void;
  imageCount: number;
  isGenerating: boolean;
}

export const PdfOptionsForm: React.FC<PdfOptionsFormProps> = ({
  options,
  onChange,
  onGenerate,
  onClear,
  imageCount,
  isGenerating,
}) => {
  const setPageSize = (pageSize: PageSize) => {
    onChange({ ...options, pageSize });
  };

  const setOrientation = (orientation: PageOrientation) => {
    onChange({ ...options, orientation });
  };

  const setMargin = (margin: PageMargin) => {
    onChange({ ...options, margin });
  };

  const setFilename = (filename: string) => {
    onChange({ ...options, filename });
  };

  const setCompression = (quality: number) => {
    onChange({ ...options, compressionQuality: quality });
  };

  const setExportFormat = (exportFormat: ExportFormat) => {
    onChange({ ...options, exportFormat });
  };

  const setRepresentation = (representation: OutputRepresentation) => {
    onChange({ ...options, representation });
  };

  const isMarkdown = options.exportFormat === 'md';

  return (
    <div id="pdf-options-panel" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base">Export Settings</h3>
      </div>


      {/* Code & Text Representation Option */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Output Content Style</span>
          <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[9px] font-semibold text-slate-500">ZIP Content</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRepresentation('text')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center text-center gap-0.5 cursor-pointer ${
              options.representation === 'text'
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span>Real Selectable Text</span>
            <span className="text-[9px] font-normal opacity-75">Clean, copyable code & text</span>
          </button>
          <button
            type="button"
            onClick={() => setRepresentation('images')}
            className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all flex flex-col items-center justify-center text-center gap-0.5 cursor-pointer ${
              options.representation === 'images'
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <span>IDE Screenshots</span>
            <span className="text-[9px] font-normal opacity-75">High-fidelity page renders</span>
          </button>
        </div>
      </div>

      {/* Output Filename */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
          Output Filename
        </label>
        <div className="relative">
          <input
            type="text"
            value={options.filename}
            onChange={(e) => setFilename(e.target.value)}
            className="w-full pl-4 pr-16 py-3 bg-slate-50 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-700 dark:text-slate-200"
            placeholder="document"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-slate-400">
            .{options.exportFormat}
          </span>
        </div>
      </div>

      {/* Page Size (Hide or disable for MD) */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${isMarkdown ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
          <Layout className="w-3.5 h-3.5" />
          Page Size
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['a4', 'letter', 'fit'] as PageSize[]).map((size) => (
            <button
              key={size}
              type="button"
              disabled={isMarkdown}
              onClick={() => setPageSize(size)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                options.pageSize === size && !isMarkdown
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="capitalize">{size}</span>
              {size === 'fit' && ' (Image)'}
            </button>
          ))}
        </div>
        {isMarkdown && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">
            Not applicable to Markdown (continuous stream)
          </p>
        )}
      </div>

      {/* Page Orientation */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${isMarkdown || options.pageSize === 'fit' ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
          Orientation
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['portrait', 'landscape', 'auto'] as PageOrientation[]).map((or) => (
            <button
              key={or}
              type="button"
              disabled={isMarkdown || options.pageSize === 'fit'}
              onClick={() => setOrientation(or)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                options.orientation === or && !isMarkdown && options.pageSize !== 'fit'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="capitalize">{or}</span>
            </button>
          ))}
        </div>
        {(isMarkdown || options.pageSize === 'fit') && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono italic">
            {isMarkdown ? 'Not applicable to Markdown' : 'Locked to Image Orientation in Fit Mode'}
          </p>
        )}
      </div>

      {/* Page Margins */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${isMarkdown ? 'opacity-40 pointer-events-none' : ''}`}>
        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
          Page Margin
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['none', 'thin', 'normal'] as PageMargin[]).map((m) => (
            <button
              key={m}
              type="button"
              disabled={isMarkdown}
              onClick={() => setMargin(m)}
              className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                options.margin === m && !isMarkdown
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950/40 dark:border-blue-900/60 dark:text-blue-300'
                  : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <span className="capitalize">{m}</span>
              <span className="block text-[9px] text-slate-400 font-mono mt-0.5 font-normal">
                {m === 'none' ? '0mm' : m === 'thin' ? '5mm' : '12mm'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Compression & Quality Slider */}
      <div className={`flex flex-col gap-2 transition-all duration-300 ${isMarkdown ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            Image Quality
          </label>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono">
            {Math.round(options.compressionQuality * 100)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="1.0"
          step="0.05"
          disabled={isMarkdown}
          value={options.compressionQuality}
          onChange={(e) => setCompression(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-slate-200 rounded-lg cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          <span>Smaller Size</span>
          <span>Original</span>
        </div>
      </div>

      {/* Summary / Stats block */}
      <div className="bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 flex flex-col gap-2 mt-2">
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>ZIP Items Included:</span>
          <span className="font-bold text-slate-700 dark:text-slate-300 font-mono">{imageCount}</span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Est. Output Size:</span>
          <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
            {imageCount === 0 
              ? '0 KB' 
              : isMarkdown 
                ? `~${(imageCount * (options.representation === 'text' ? 5 : 150) / 1024).toFixed(2)} MB`
                : `~${(imageCount * (options.compressionQuality > 0.75 ? 0.35 : 0.12)).toFixed(2)} MB`
            }
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-2">
        <button
          type="button"
          disabled={imageCount === 0 || isGenerating}
          onClick={onGenerate}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.01] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
        >
          <FileText className="w-4 h-4" />
          Generate {options.exportFormat.toUpperCase()}
          <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
        </button>

        <button
          type="button"
          onClick={onClear}
          disabled={isGenerating}
          className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-400 font-medium rounded-xl transition-all text-sm cursor-pointer"
        >
          Start Over
        </button>
      </div>
    </div>
  );
};

