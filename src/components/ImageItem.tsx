import React from 'react';
import { ChevronUp, ChevronDown, RotateCw, Trash2, Maximize2, FileImage, Download } from 'lucide-react';
import { ExtractedImage } from '../types';
import { motion } from 'motion/react';

interface ImageItemProps {
  image: ExtractedImage;
  index: number;
  totalImages: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRotate: () => void;
  onDelete: () => void;
  onPreview: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const ImageItem: React.FC<ImageItemProps> = ({
  image,
  index,
  totalImages,
  onMoveUp,
  onMoveDown,
  onRotate,
  onDelete,
  onPreview,
  isSelected,
  onToggleSelect,
}) => {
  // Tailwind rotation class
  const getRotationClass = (rot: number) => {
    switch (rot) {
      case 90: return 'rotate-90';
      case 180: return 'rotate-180';
      case 270: return 'rotate-270';
      default: return 'rotate-0';
    }
  };

  return (
    <motion.div
      id={`image-item-${image.id}`}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`flex items-center gap-4 p-4 border rounded-xl shadow-sm hover:shadow-md transition-all group ${
        isSelected
          ? 'bg-blue-50/30 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/60'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
      }`}
    >
      {/* Checkbox for selection */}
      <button
        type="button"
        onClick={onToggleSelect}
        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isSelected
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-400'
        }`}
        title={isSelected ? "Deselect item" : "Select item"}
      >
        {isSelected && (
          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="3.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Page Badge */}
      <div className="flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg py-2 px-3 min-w-[54px]">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-slate-500">Page</span>
        <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{index + 1}</span>
      </div>

      {/* Image Thumbnail Container */}
      <div className="relative w-20 h-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
        <img
          src={image.dataUrl}
          alt={image.name}
          className={`w-full h-full object-contain transition-transform duration-300 ${getRotationClass(image.rotation)}`}
          loading="lazy"
        />
        
        {/* Hover Zoom overlay */}
        <button
          type="button"
          onClick={onPreview}
          className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-zoom-in"
        >
          <Maximize2 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Metadata */}
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate pr-2" title={image.name}>
          {image.name}
        </h4>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-400 dark:text-slate-500 font-mono">
          <span className="flex items-center gap-1">
            <FileImage className="w-3 h-3" />
            {image.width} × {image.height} px
          </span>
          <span className="inline-block w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          <span>{formatBytes(image.size)}</span>
          {image.rotation > 0 && (
            <>
              <span className="inline-block w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
              <span className="text-blue-600 dark:text-blue-400">Rotated {image.rotation}°</span>
            </>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Re-ordering Buttons */}
        <div className="flex flex-col gap-1 mr-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className={`p-1.5 rounded-lg transition-colors ${
              index === 0
                ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
            title="Move Page Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === totalImages - 1}
            className={`p-1.5 rounded-lg transition-colors ${
              index === totalImages - 1
                ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed'
                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
            title="Move Page Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Download Button */}
        <button
          type="button"
          onClick={() => {
            const a = document.createElement('a');
            if (image.fileType === 'code' && image.textContent) {
              const blob = new Blob([image.textContent], { type: 'text/plain;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              a.href = url;
              a.download = image.originalName || image.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            } else {
              a.href = image.dataUrl;
              a.download = image.originalName || image.name;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          }}
          className="p-2.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors"
          title="Download original file"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Rotate Button */}
        <button
          type="button"
          onClick={onRotate}
          className="p-2.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"
          title="Rotate 90° Clockwise"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={onDelete}
          className="p-2.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
          title="Exclude from PDF"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};
