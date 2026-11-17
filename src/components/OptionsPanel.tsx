'use client';

import React from 'react';
import { ToolOption } from '@/types/tools';

interface OptionsPanelProps {
  options: ToolOption[];
  values: Record<string, any>;
  onChange: (id: string, val: any) => void;
}

export function OptionsPanel({ options, values, onChange }: OptionsPanelProps) {
  if (!options || options.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs text-gray-500">
        No additional settings needed for this tool. Click &ldquo;Process File&rdquo; to begin.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        Tool Settings
      </h3>

      <div className="space-y-4">
        {options.map((opt) => {
          const val = values[opt.id] !== undefined ? values[opt.id] : opt.default;

          if (opt.type === 'slider' || opt.type === 'range') {
            return (
              <div key={opt.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor={opt.id} className="font-medium text-gray-700 dark:text-gray-300">
                    {opt.label}
                  </label>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {val}
                    {opt.unit || ''}
                  </span>
                </div>
                <input
                  id={opt.id}
                  type="range"
                  min={opt.min ?? 0}
                  max={opt.max ?? 100}
                  step={opt.step ?? 1}
                  value={val}
                  onChange={(e) => onChange(opt.id, Number(e.target.value))}
                  className="w-full accent-green-600 cursor-pointer h-2 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none"
                />
              </div>
            );
          }

          if (opt.type === 'select') {
            return (
              <div key={opt.id} className="space-y-1.5">
                <label htmlFor={opt.id} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {opt.label}
                </label>
                <select
                  id={opt.id}
                  value={val}
                  onChange={(e) => onChange(opt.id, e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                >
                  {opt.choices?.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                {opt.help && <p className="text-[11px] text-gray-500">{opt.help}</p>}
              </div>
            );
          }

          if (opt.type === 'toggle') {
            return (
              <div key={opt.id} className="flex items-center justify-between py-1">
                <label htmlFor={opt.id} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  {opt.label}
                </label>
                <button
                  id={opt.id}
                  type="button"
                  role="switch"
                  aria-checked={!!val}
                  onClick={() => onChange(opt.id, !val)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    val ? 'bg-green-600' : 'bg-gray-300 dark:bg-dark-border'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      val ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            );
          }

          if (opt.type === 'number') {
            return (
              <div key={opt.id} className="space-y-1.5">
                <label htmlFor={opt.id} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {opt.label}
                </label>
                <input
                  id={opt.id}
                  type="number"
                  min={opt.min}
                  max={opt.max}
                  value={val}
                  onChange={(e) => onChange(opt.id, Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            );
          }

          if (opt.type === 'text') {
            return (
              <div key={opt.id} className="space-y-1.5">
                <label htmlFor={opt.id} className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  {opt.label}
                </label>
                <input
                  id={opt.id}
                  type="text"
                  value={val}
                  onChange={(e) => onChange(opt.id, e.target.value)}
                  placeholder={opt.help || ''}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-300 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {opt.help && <p className="text-[11px] text-gray-500">{opt.help}</p>}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
