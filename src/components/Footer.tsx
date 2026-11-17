import React from 'react';
import { Shield, Cpu, Lock, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-dark-border bg-gray-50/50 dark:bg-dark-bg/50 py-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Value prop pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border">
            <div className="p-2.5 rounded-lg bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">100% Client-Side Privacy</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Files never leave your device. All computations happen in local Web Workers with zero server logging.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border">
            <div className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Hardware Accelerated</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                Uses OffscreenCanvas, multi-threaded Web Workers, and WebAssembly for instantaneous local execution.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5 p-4 rounded-xl bg-white dark:bg-dark-card border border-gray-200/80 dark:border-dark-border">
            <div className="p-2.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">No Limits, Free Forever</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                No sign-up required, no daily caps, no paywalls, and no hidden file size throttles.
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 dark:border-dark-border text-xs text-gray-500 dark:text-gray-400">
          <p>© {new Date().getFullYear()} letmegoogle. Built with modern web standards.</p>
          <p className="flex items-center gap-1">
            Engineered for complete data sovereignty
          </p>
        </div>
      </div>
    </footer>
  );
}
