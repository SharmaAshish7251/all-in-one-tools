'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X, AlertCircle } from 'lucide-react';

interface DropzoneProps {
  accept: string[] | string;
  multiple: boolean;
  maxFileSizeMB: number;
  files: File[];
  onFilesSelected: (files: File[]) => void;
  onFileRemoved: (index: number) => void;
}

export function Dropzone({
  accept,
  multiple,
  maxFileSizeMB,
  files,
  onFilesSelected,
  onFileRemoved,
}: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedMimes = Array.isArray(accept) ? accept : [accept];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndAddFiles = (incoming: FileList | File[]) => {
    setError(null);
    const valid: File[] = [];

    for (let i = 0; i < incoming.length; i++) {
      const file = incoming[i];
      if (file.size > maxFileSizeMB * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the ${maxFileSizeMB} MB limit.`);
        continue;
      }
      valid.push(file);
    }

    if (valid.length > 0) {
      if (multiple) {
        onFilesSelected([...files, ...valid]);
      } else {
        onFilesSelected([valid[0]]);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop zone box */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20 scale-[0.99]'
            : 'border-gray-300 dark:border-dark-border hover:border-gray-400 dark:hover:border-gray-700 bg-white/50 dark:bg-dark-card/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedMimes.join(',')}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
        />

        <div className="mx-auto w-16 h-16 mb-4 rounded-2xl bg-gray-100 dark:bg-dark-bg flex items-center justify-center text-gray-500 dark:text-gray-400 shadow-inner">
          <UploadCloud className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>

        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Drop your files here, or <span className="text-green-600 dark:text-green-400 underline">browse</span>
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
          {multiple ? 'Supports multiple files' : 'Single file'} • Max size {maxFileSizeMB} MB • Processed locally
        </p>
      </div>

      {/* Error alert */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected file list */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Selected Files ({files.length})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm text-xs"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-dark-bg text-gray-500">
                    <FileIcon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFileRemoved(idx);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
