import React from 'react';
import { Loader2, Zap, FileText } from 'lucide-react';
import { motion } from 'motion/react';

interface ProgressOverlayProps {
  title: string;
  message: string;
  current: number;
  total: number;
  type: 'extracting' | 'compiling';
}

export const ProgressOverlay: React.FC<ProgressOverlayProps> = ({
  title,
  message,
  current,
  total,
  type,
}) => {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div id="progress-overlay" className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center text-center"
      >
        <div className="mb-6 relative">
          <div className="p-4 bg-blue-50 dark:bg-blue-950/50 rounded-2xl text-blue-600 dark:text-blue-400">
            {type === 'extracting' ? (
              <Zap className="w-10 h-10 animate-pulse" />
            ) : (
              <FileText className="w-10 h-10 animate-bounce" />
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-1">
          {title}
        </h3>
        <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold font-mono mb-4">
          {percentage}% Complete
        </p>

        {/* Progress Bar Container */}
        <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-4 relative">
          <motion.div
            className="h-full bg-blue-600 dark:bg-blue-400 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>

        {/* Progress Description */}
        <div className="w-full truncate text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 py-2 px-3 rounded-lg">
          {message || 'Please wait...'}
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-6 font-mono">
          Page {current} of {total} processed
        </p>
      </motion.div>
    </div>
  );
};
