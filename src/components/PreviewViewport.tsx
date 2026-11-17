'use client';

import React from 'react';
import { Download, CheckCircle2, ArrowRight } from 'lucide-react';
import { ProcessedOutput } from '@/types/tools';

interface PreviewViewportProps {
  outputs: ProcessedOutput[];
  isProcessing: boolean;
  progress: number;
}

export function PreviewViewport({ outputs, isProcessing, progress }: PreviewViewportProps) {
  if (isProcessing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-center space-y-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-dark-border" />
          <div
            className="absolute inset-0 rounded-full border-4 border-green-500 border-t-transparent animate-spin"
          />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Processing In-Browser...
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Running 100% on local hardware ({progress}%)
          </p>
        </div>
        <div className="w-48 h-2 bg-gray-100 dark:bg-dark-bg rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (outputs.length === 0) {
    return null;
  }

  const handleDownload = (output: ProcessedOutput) => {
    const url = URL.createObjectURL(output.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = output.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAll = () => {
    outputs.forEach((out) => handleDownload(out));
  };

  return (
    <div className="space-y-4 p-6 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Ready for Download ({outputs.length} {outputs.length === 1 ? 'file' : 'files'})
          </h3>
        </div>

        {outputs.length > 1 && (
          <button
            onClick={handleDownloadAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {outputs.map((out, idx) => {
          const hasSavings =
            out.originalSize && out.newSize && out.newSize < out.originalSize;
          const savingsPercent = hasSavings
            ? Math.round((1 - out.newSize! / out.originalSize!) * 100)
            : 0;

          return (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                {out.previewUrl && out.blob.type.startsWith('image/') && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={out.previewUrl}
                      alt={out.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                    {out.name}
                  </p>
                  <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    {hasSavings ? (
                      <>
                        <span>{(out.originalSize! / 1024).toFixed(1)} KB</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {(out.newSize! / 1024).toFixed(1)} KB
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                          -{savingsPercent}%
                        </span>
                      </>
                    ) : (
                      <span>{(out.blob.size / 1024).toFixed(1)} KB</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(out)}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
