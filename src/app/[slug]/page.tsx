'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { notFound, useParams } from 'next/navigation';
import Link from 'next/link';
import { toolsCatalog } from '@/config/toolsCatalog';
import { Dropzone } from '@/components/Dropzone';
import { OptionsPanel } from '@/components/OptionsPanel';
import { PreviewViewport } from '@/components/PreviewViewport';
import { SignatureModal } from '@/components/SignatureModal';
import { processImages } from '@/engines/imageProcess';
import { processPassportPhoto } from '@/engines/passportPhoto';
import { processRemoveBackground } from '@/engines/removeBackground';
import {
  mergePdfs,
  processPdfPages,
  processPdfStamp,
  imagesToPdf,
} from '@/engines/pdfLibAdapter';
import { rasterizePdfToImages } from '@/engines/pdfRasterizer';
import { flattenSignatureOnPdf } from '@/engines/pdfSignFlattener';
import { DevToolRunner } from '@/components/DevToolRunner';
import { ProcessedOutput } from '@/types/tools';
import { ArrowLeft, Play, AlertCircle, ShieldCheck, PenTool } from 'lucide-react';

export default function ToolPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const tool = toolsCatalog.find((t) => t.slug === slug);

  const [files, setFiles] = useState<File[]>([]);
  const [optionValues, setOptionValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    tool?.options?.forEach((opt) => {
      init[opt.id] = opt.default;
    });
    return init;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [outputs, setOutputs] = useState<ProcessedOutput[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sign modal state
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (tool) {
      document.title = `${tool.name} – letmegoogle`;
    }
  }, [tool]);

  if (!tool) {
    notFound();
  }

  // Developer Tools Runner
  if (tool.category === 'developer' || tool.engine === 'dev-tool') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Tools</span>
          </Link>
          <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
            Developer Tool • 100% In-Browser
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            {tool.name}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
            {tool.description}
          </p>
        </div>

        <DevToolRunner tool={tool} />
      </div>
    );
  }

  const handleOptionChange = (id: string, val: any) => {
    setOptionValues((prev) => ({ ...prev, [id]: val }));
  };

  const handleFileRemoved = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setOutputs([]);
  };

  const handleProcess = async () => {
    if (files.length === 0) {
      setError('Please select or drop at least one file first.');
      return;
    }

    setError(null);
    setIsProcessing(true);
    setProgress(10);

    try {
      let results: ProcessedOutput[] = [];

      switch (tool.engine) {
        case 'image-process': {
          results = await processImages({
            files,
            mode: tool.engineConfig?.mode,
            options: optionValues,
            targetMime: tool.engineConfig?.target,
            targetExtension: tool.engineConfig?.extension,
            onProgress: setProgress,
          });
          break;
        }

        case 'passport-photo': {
          results = await processPassportPhoto(files[0], optionValues);
          break;
        }

        case 'remove-background': {
          results = await processRemoveBackground(files, optionValues);
          break;
        }

        case 'pdf-merge': {
          results = await mergePdfs(files);
          break;
        }

        case 'pdf-pages': {
          results = await processPdfPages(
            files[0],
            tool.engineConfig?.mode || 'rotate',
            optionValues
          );
          break;
        }

        case 'pdf-stamp': {
          results = await processPdfStamp(
            files[0],
            tool.engineConfig?.mode || 'watermark',
            optionValues
          );
          break;
        }

        case 'image-to-pdf': {
          results = await imagesToPdf(files, optionValues);
          break;
        }

        case 'pdf-to-image': {
          results = await rasterizePdfToImages(
            files[0],
            tool.engineConfig?.target || 'image/jpeg',
            tool.engineConfig?.extension || '.jpg',
            optionValues
          );
          break;
        }

        case 'pdf-sign': {
          if (!signatureDataUrl) {
            setIsSignModalOpen(true);
            setIsProcessing(false);
            return;
          }
          // Default stamp placement bottom-right of page 0
          results = await flattenSignatureOnPdf(files[0], signatureDataUrl, {
            pageIndex: 0,
            relX: 0.65,
            relY: 0.8,
            relWidth: 0.25,
            relHeight: 0.1,
          });
          break;
        }

        default:
          throw new Error(`Engine ${tool.engine} not implemented`);
      }

      setProgress(100);
      setOutputs(results);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during in-browser processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignatureCreated = (dataUrl: string) => {
    setSignatureDataUrl(dataUrl);
    // Auto trigger process after signature creation
    setTimeout(() => {
      flattenSignatureOnPdf(files[0], dataUrl, {
        pageIndex: 0,
        relX: 0.65,
        relY: 0.8,
        relWidth: 0.25,
        relHeight: 0.1,
      })
        .then((res) => setOutputs(res))
        .catch((err) => setError(err.message));
    }, 100);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>All Tools</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
              {tool.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
              {tool.description}
            </p>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 dark:text-green-400 shrink-0 self-start sm:self-auto">
            <ShieldCheck className="w-4 h-4" />
            <span>100% In-Browser</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Uploader & Preview */}
        <div className="lg:col-span-2 space-y-6">
          <Dropzone
            accept={tool.accept || '*/*'}
            multiple={tool.multiple ?? false}
            maxFileSizeMB={tool.maxFileSizeMB ?? 50}
            files={files}
            onFilesSelected={(newFiles) => {
              setFiles(newFiles);
              setOutputs([]);
              setError(null);
            }}
            onFileRemoved={handleFileRemoved}
          />

          {tool.slug === 'sign-pdf' && files.length > 0 && (
            <div className="p-4 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-900 dark:text-white">
                  Electronic Signature
                </p>
                <p className="text-[11px] text-gray-500">
                  {signatureDataUrl ? 'Signature ready to stamp' : 'No signature created yet'}
                </p>
              </div>

              <button
                onClick={() => setIsSignModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>{signatureDataUrl ? 'Change Signature' : 'Create Signature'}</span>
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Viewport */}
          <PreviewViewport
            outputs={outputs}
            isProcessing={isProcessing}
            progress={progress}
          />
        </div>

        {/* Right 1 Col: Settings & Action */}
        <div className="space-y-6">
          <OptionsPanel
            options={tool.options}
            values={optionValues}
            onChange={handleOptionChange}
          />

          <button
            onClick={handleProcess}
            disabled={files.length === 0 || isProcessing}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold tracking-wide uppercase shadow-md transition-all ${
              files.length === 0 || isProcessing
                ? 'bg-gray-200 dark:bg-dark-card text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white shadow-green-600/20'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{isProcessing ? 'Processing...' : `Apply & Process`}</span>
          </button>
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignModalOpen}
        onClose={() => setIsSignModalOpen(false)}
        onSignatureCreated={handleSignatureCreated}
      />
    </div>
  );
}
