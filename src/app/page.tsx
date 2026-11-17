'use client';

import React, { useState, useEffect } from 'react';
import { toolsCatalog } from '@/config/toolsCatalog';
import { ToolCard } from '@/components/ToolCard';
import { Search, Sparkles, ShieldCheck, Zap, Terminal, Code2 } from 'lucide-react';

export default function HomePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'developer' | 'image' | 'pdf' | 'ai'>('all');

  useEffect(() => {
    document.title = 'letmegoogle – Free Developer, Image & PDF Tools (100% Local)';
  }, []);

  const filteredTools = toolsCatalog.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.summary.toLowerCase().includes(search.toLowerCase()) ||
      tool.keywords.some((k) => k.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'ai') return tool.group === 'ai';
    return tool.category === selectedCategory;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
      {/* Hero section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-xs font-semibold text-green-600 dark:text-green-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Server Uploads • 100% Private In-Browser</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-[1.15]">
          Developer, Media &amp; PDF tools that run{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-400">
            100% locally
          </span>
        </h1>

        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Cryptographic token generation, hashes, UUIDs, formatters, Base64 converters, subnet calculators, image compression, AI watermark removal, biometric passport photos, and PDF signing directly on your device. Zero data leakage, zero backend latency.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-4xl mx-auto">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-xs font-medium w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: `All Tools (${toolsCatalog.length})` },
            { id: 'developer', label: `Developer Tools (${toolsCatalog.filter((t) => t.category === 'developer').length})` },
            { id: 'image', label: `Image Tools (${toolsCatalog.filter((t) => t.category === 'image').length})` },
            { id: 'pdf', label: `PDF Tools (${toolsCatalog.filter((t) => t.category === 'pdf').length})` },
            { id: 'ai', label: 'AI & Smart' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                selectedCategory === tab.id
                  ? 'bg-white dark:bg-dark-bg text-gray-900 dark:text-white shadow-sm font-semibold'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${toolsCatalog.length} tools...`}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>
            Showing <strong className="text-gray-900 dark:text-white">{filteredTools.length}</strong> tools
          </span>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-green-600 dark:text-green-400 hover:underline"
            >
              Clear search
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              No tools matched your search &quot;{search}&quot;.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setSelectedCategory('all');
              }}
              className="text-xs font-semibold text-green-600 dark:text-green-400 hover:underline"
            >
              Reset filters &amp; view all tools
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
