import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Image as ImageIcon,
  Minimize2,
  Maximize2,
  Crop,
  RotateCw,
  Stamp,
  UserSquare,
  Sparkles,
  Layers,
  Scissors,
  PenTool,
  Hash,
  FileCheck,
  ArrowRight,
  Code2,
  Key,
  Shield,
  QrCode,
  Wifi,
  Terminal,
  Calculator,
  Binary,
  Cpu,
  Globe,
  Database,
  Search,
  Lock,
  GitBranch,
  Network,
  Clock,
  Percent,
} from 'lucide-react';
import { ToolDefinition } from '@/types/tools';

const iconMap: Record<string, React.ReactNode> = {
  // Image & PDF
  'compress-image': <Minimize2 className="w-5 h-5 text-green-500" />,
  'resize-image': <Maximize2 className="w-5 h-5 text-blue-500" />,
  'crop-image': <Crop className="w-5 h-5 text-amber-500" />,
  'rotate-image': <RotateCw className="w-5 h-5 text-purple-500" />,
  'watermark-image': <Stamp className="w-5 h-5 text-pink-500" />,
  'passport-photo-maker': <UserSquare className="w-5 h-5 text-emerald-500" />,
  'remove-ai-watermark': <Sparkles className="w-5 h-5 text-violet-500" />,
  'remove-background': <Scissors className="w-5 h-5 text-cyan-500" />,
  'organize-pdf': <Layers className="w-5 h-5 text-orange-500" />,
  'merge-pdf': <Layers className="w-5 h-5 text-red-500" />,
  'split-pdf': <Scissors className="w-5 h-5 text-indigo-500" />,
  'sign-pdf': <PenTool className="w-5 h-5 text-emerald-500" />,
  'add-page-numbers': <Hash className="w-5 h-5 text-teal-500" />,
  'watermark-pdf': <Stamp className="w-5 h-5 text-rose-500" />,
  'crop-pdf': <Crop className="w-5 h-5 text-yellow-500" />,

  // Developer Tools
  'token-generator': <Key className="w-5 h-5 text-amber-500" />,
  'hash-text': <Hash className="w-5 h-5 text-emerald-500" />,
  'uuid-generator': <Code2 className="w-5 h-5 text-purple-500" />,
  'ulid-generator': <Clock className="w-5 h-5 text-indigo-500" />,
  'encryption': <Lock className="w-5 h-5 text-rose-500" />,
  'hmac-generator': <Shield className="w-5 h-5 text-blue-500" />,
  'rsa-key-pair-generator': <Key className="w-5 h-5 text-violet-500" />,
  'password-strength-analyser': <Shield className="w-5 h-5 text-green-500" />,
  'bip39-generator': <Key className="w-5 h-5 text-yellow-500" />,
  'base64-string-converter': <Binary className="w-5 h-5 text-teal-500" />,
  'base-converter': <Binary className="w-5 h-5 text-cyan-500" />,
  'date-converter': <Clock className="w-5 h-5 text-sky-500" />,
  'roman-numeral-converter': <Hash className="w-5 h-5 text-amber-500" />,
  'color-converter': <Sparkles className="w-5 h-5 text-pink-500" />,
  'case-converter': <Code2 className="w-5 h-5 text-blue-500" />,
  'text-to-binary': <Binary className="w-5 h-5 text-green-500" />,
  'text-to-unicode': <Code2 className="w-5 h-5 text-indigo-500" />,
  'text-to-nato-alphabet': <Globe className="w-5 h-5 text-violet-500" />,
  'json-to-csv': <Database className="w-5 h-5 text-emerald-500" />,
  'url-encoder': <Globe className="w-5 h-5 text-blue-500" />,
  'url-parser': <Globe className="w-5 h-5 text-sky-500" />,
  'device-information': <Cpu className="w-5 h-5 text-purple-500" />,
  'jwt-parser': <Key className="w-5 h-5 text-amber-500" />,
  'keycode-info': <Terminal className="w-5 h-5 text-rose-500" />,
  'slugify-string': <Code2 className="w-5 h-5 text-teal-500" />,
  'html-entities': <Code2 className="w-5 h-5 text-orange-500" />,
  'qrcode-generator': <QrCode className="w-5 h-5 text-blue-500" />,
  'wifi-qrcode-generator': <Wifi className="w-5 h-5 text-emerald-500" />,
  'chmod-calculator': <Terminal className="w-5 h-5 text-yellow-500" />,
  'sql-prettify': <Database className="w-5 h-5 text-cyan-500" />,
  'docker-run-to-compose': <Layers className="w-5 h-5 text-blue-500" />,
  'ipv4-subnet-calculator': <Network className="w-5 h-5 text-teal-500" />,
  'ipv4-address-converter': <Network className="w-5 h-5 text-emerald-500" />,
  'mac-address-generator': <Network className="w-5 h-5 text-indigo-500" />,
  'math-evaluator': <Calculator className="w-5 h-5 text-violet-500" />,
  'percentage-calculator': <Percent className="w-5 h-5 text-rose-500" />,
  'text-statistics': <FileText className="w-5 h-5 text-blue-500" />,
  'text-diff': <GitBranch className="w-5 h-5 text-orange-500" />,
  'regex-tester': <Search className="w-5 h-5 text-purple-500" />,
  'lorem-ipsum-generator': <FileText className="w-5 h-5 text-gray-500" />,
  'json-prettify': <Code2 className="w-5 h-5 text-green-500" />,
  'json-minify': <Minimize2 className="w-5 h-5 text-amber-500" />,
  'xml-formatter': <Code2 className="w-5 h-5 text-sky-500" />,
};

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const icon =
    iconMap[tool.slug] ||
    (tool.category === 'pdf' ? (
      <FileText className="w-5 h-5 text-red-500" />
    ) : tool.category === 'developer' ? (
      <Code2 className="w-5 h-5 text-emerald-500" />
    ) : (
      <ImageIcon className="w-5 h-5 text-blue-500" />
    ));

  return (
    <Link
      href={`/${tool.slug}`}
      className="group relative flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200/90 dark:border-dark-border hover:border-green-500/50 dark:hover:border-green-500/40 shadow-sm hover:shadow-lg dark:hover:shadow-green-950/20 transition-all duration-200"
    >
      <div>
        {/* Top header row */}
        <div className="flex items-center justify-between mb-3.5">
          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border group-hover:scale-105 transition-transform">
            {icon}
          </div>

          <div className="flex items-center gap-1.5">
            {tool.category === 'developer' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Dev
              </span>
            )}
            {tool.visual && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-dark-bg text-[10px] font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-dark-border">
                <span>{tool.visual.from}</span>
                <ArrowRight className="w-2.5 h-2.5 text-gray-400" />
                <span className="text-green-600 dark:text-green-400">{tool.visual.to}</span>
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
          {tool.name}
        </h3>

        {/* Summary */}
        <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
          {tool.summary}
        </p>
      </div>

      {/* Footer tags */}
      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border/60 flex items-center justify-between text-[11px] text-gray-400">
        <span className="capitalize">{tool.group}</span>
        <span className="inline-flex items-center gap-1 font-medium text-green-600 dark:text-green-400 group-hover:translate-x-0.5 transition-transform">
          Open tool
          <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </Link>
  );
}
