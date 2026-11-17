'use client';

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, Type, Upload, Eraser, Check, X } from 'lucide-react';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSignatureCreated: (dataUrl: string) => void;
}

export function SignatureModal({ isOpen, onClose, onSignatureCreated }: SignatureModalProps) {
  const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedText, setTypedText] = useState('John Doe');
  const [fontFamily, setFontFamily] = useState('cursive');
  const [penColor, setPenColor] = useState('#000000');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);

  useEffect(() => {
    if (isOpen && tab === 'draw') {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5;
          ctx.strokeStyle = penColor;
        }
      }
    }
  }, [isOpen, tab, penColor]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApply = () => {
    if (tab === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      onSignatureCreated(canvas.toDataURL('image/png'));
    } else if (tab === 'type') {
      // Render cursive typography to canvas
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.font = `64px ${fontFamily}`;
      ctx.fillStyle = penColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedText, 300, 100);
      onSignatureCreated(canvas.toDataURL('image/png'));
    }
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        // Remove white background
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 220 && data[i + 1] > 220 && data[i + 2] > 220) {
            data[i + 3] = 0; // Transparent
          }
        }
        ctx.putImageData(imgData, 0, 0);
        onSignatureCreated(canvas.toDataURL('image/png'));
        onClose();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">Create Electronic Signature</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50 p-1.5 gap-1.5">
          <button
            onClick={() => setTab('draw')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
              tab === 'draw'
                ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Draw</span>
          </button>
          <button
            onClick={() => setTab('type')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
              tab === 'type'
                ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Type</span>
          </button>
          <button
            onClick={() => setTab('upload')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-xl transition-colors ${
              tab === 'upload'
                ? 'bg-white dark:bg-dark-card text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-5">
          {tab === 'draw' && (
            <div className="space-y-3">
              <div className="border border-gray-300 dark:border-dark-border rounded-xl bg-white dark:bg-dark-bg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={460}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Color:</span>
                  {['#000000', '#1E40AF', '#B91C1C'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPenColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        penColor === c ? 'border-green-500 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>

                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
          )}

          {tab === 'type' && (
            <div className="space-y-4">
              <input
                type="text"
                value={typedText}
                onChange={(e) => setTypedText(e.target.value)}
                placeholder="Type your name"
                className="w-full px-3 py-2 text-sm rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
              />

              <div className="p-6 border border-gray-200 dark:border-dark-border rounded-xl bg-gray-50 dark:bg-dark-bg text-center">
                <p className="text-4xl text-gray-900 dark:text-white" style={{ fontFamily }}>
                  {typedText || 'Signature'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Font:</span>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white"
                >
                  <option value="cursive">Classic Cursive</option>
                  <option value="'Brush Script MT', cursive">Brush Script</option>
                  <option value="'Segoe Script', cursive">Segoe Script</option>
                </select>
              </div>
            </div>
          )}

          {tab === 'upload' && (
            <div className="p-8 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-xl text-center space-y-3">
              <Upload className="w-8 h-8 mx-auto text-gray-400" />
              <div>
                <p className="text-xs font-medium text-gray-900 dark:text-white">Upload signature image</p>
                <p className="text-[11px] text-gray-500">White background will be automatically removed</p>
              </div>
              <label className="inline-block px-4 py-2 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white cursor-pointer shadow-sm transition-colors">
                Choose Image
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl border border-gray-300 dark:border-dark-border text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
          >
            Cancel
          </button>
          {tab !== 'upload' && (
            <button
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Use Signature</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
