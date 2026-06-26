import React, { useState, useRef } from 'react';
import { Upload, FolderArchive, ArrowRight, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface DropzoneProps {
  onFileSelect: (file: File) => void;
  onDemoClick: () => void;
  isExtracting: boolean;
}

export const Dropzone: React.FC<DropzoneProps> = ({ onFileSelect, onDemoClick, isExtracting }) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        onFileSelect(file);
      } else {
        alert("Please upload a valid ZIP archive containing images.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div id="dropzone-container" className="w-full">
      <motion.div
        id="dropzone"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 min-h-[300px] ${
          isDragActive
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 scale-[1.01] shadow-lg shadow-blue-100/50 dark:shadow-none'
            : 'border-blue-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-slate-600 bg-blue-50/20 dark:bg-slate-900/40 backdrop-blur-sm'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileInput}
          className="hidden"
          disabled={isExtracting}
        />

        <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-md mb-6 text-blue-600 dark:text-blue-400">
          <Upload className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">
          Drag and drop your ZIP file here
        </h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 max-w-md">
          Supports any .zip archive containing images, documents, or source code files (HTML, PHP, CSS, JS, SQL, MySQL, and more)
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            type="button"
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:scale-[1.02] active:scale-95 transition-all text-sm"
          >
            Select File
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* Demo helper */}
      <motion.div
        id="demo-helper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center"
      >
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-2 font-mono uppercase tracking-widest">
          No zip file ready? Test instantly with sample pages:
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDemoClick();
          }}
          disabled={isExtracting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-slate-900 dark:hover:bg-slate-850 dark:text-blue-400 font-bold rounded-xl border border-blue-100/50 dark:border-slate-850 transition-all text-sm"
        >
          <Sparkles className="w-4 h-4" />
          Generate & Load Demo ZIP
        </button>
      </motion.div>
    </div>
  );
};
