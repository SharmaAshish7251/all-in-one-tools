export type ToolCategory = 'image' | 'pdf' | 'developer';

export type ToolGroup =
  | 'optimize'
  | 'edit'
  | 'ai'
  | 'convert-from'
  | 'convert-to'
  | 'organize'
  | 'general'
  | 'crypto'
  | 'converter'
  | 'web'
  | 'network'
  | 'math'
  | 'text'
  | 'data'
  | 'development';

export type OptionType = 'slider' | 'range' | 'select' | 'number' | 'toggle' | 'text' | 'textarea';

export interface SelectChoice {
  value: string;
  label: string;
}

export interface ToolOption {
  id: string;
  type: OptionType;
  label: string;
  default: any;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  choices?: SelectChoice[];
  help?: string;
  placeholder?: string;
}

export interface EngineConfig {
  mode?: string;
  target?: string;
  extension?: string;
  devToolId?: string;
  defaultInput?: string;
  inputType?: 'text' | 'textarea' | 'dual-text' | 'none' | 'file';
  inputLabel?: string;
  input2Label?: string;
  outputType?: 'text' | 'code' | 'json' | 'table' | 'qr' | 'diff' | 'custom';
  [key: string]: any;
}

export interface ToolVisual {
  from: string;
  to: string;
}

export interface ToolDefinition {
  slug: string;
  name: string;
  category: ToolCategory;
  group: ToolGroup;
  summary: string;
  description: string;
  keywords: string[];
  visual?: ToolVisual;
  accept?: string[] | string;
  extensions?: string[];
  multiple?: boolean;
  maxFileSizeMB?: number;
  engine:
    | 'image-process'
    | 'passport-photo'
    | 'remove-background'
    | 'pdf-organize'
    | 'pdf-merge'
    | 'pdf-pages'
    | 'image-to-pdf'
    | 'pdf-to-image'
    | 'pdf-stamp'
    | 'pdf-sign'
    | 'dev-tool';
  engineConfig?: EngineConfig | null;
  options: ToolOption[];
}

export interface ProcessedOutput {
  name: string;
  blob: Blob;
  previewUrl?: string;
  originalSize?: number;
  newSize?: number;
}
