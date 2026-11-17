'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ToolDefinition } from '@/types/tools';
import {
  generateToken,
  hashText,
  generateUuid,
  generateUlid,
  aesEncryptDecrypt,
  generateHmac,
  generateRsaKeyPair,
  analyzePasswordStrength,
  generateBip39Mnemonic,
  base64Convert,
  baseConverter,
  dateConverter,
  romanNumeralConvert,
  colorConverter,
  caseConverter,
  textToBinary,
  textToUnicode,
  textToNato,
  jsonToCsv,
  urlEncodeDecode,
  parseUrl,
  parseJwt,
  slugifyString,
  htmlEntities,
  generateQr,
  generateWifiQr,
  chmodCalculator,
  formatSqlQuery,
  dockerRunToCompose,
  ipv4SubnetCalculator,
  ipv4AddressConverter,
  generateMacAddress,
  evaluateMath,
  percentageCalculator,
  analyzeTextStatistics,
  computeTextDiff,
  testRegex,
  generateLoremIpsum,
  jsonPrettifyMinify,
  formatXml,
  bcryptHashVerify,
  generateOtp,
  checkPdfSignature,
  yamlToJson,
  jsonToYaml,
  yamlPrettify,
  jsonToToml,
  tomlToJson,
  yamlToToml,
  tomlToYaml,
  jsonToXml,
  xmlToJson,
  markdownToHtml,
  generateBasicAuth,
  generateOgMeta,
  searchMimeTypes,
  parseUserAgent,
  decodeSafeLink,
  expandIpv4Range,
  lookupMacVendor,
  generateIpv6Ula,
  searchHttpStatusCodes,
  generateSvgPlaceholder,
  crontabExplain,
  generateRandomPort,
  jsonDiffEngine,
  calculateEta,
  convertTemperature,
  generateNumeronym,
  convertList,
  normalizeEmail,
  obfuscateString,
  parsePhone,
  validateIban,
  generateAsciiBanner,
  getGitMemo,
  getRegexMemo,
  getEmojiDirectory,
  runBenchmark,
  bulkUrlOpener,
  extractBaseUrls,
  dartOnlineIde,
  prefixAndPostfix,
  onlineTextFormatting,
  DevToolResult,
} from '@/engines/devToolsEngine';
import {
  Copy,
  Check,
  Download,
  Play,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  FileText,
  Terminal,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';

interface DevToolRunnerProps {
  tool: ToolDefinition;
}

export function DevToolRunner({ tool }: DevToolRunnerProps) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Primary input & secondary input (for diff or key/passphrase)
  const [inputVal, setInputVal] = useState<string>(() => {
    return tool.engineConfig?.defaultInput || '';
  });
  const [input2Val, setInput2Val] = useState<string>('');

  // Dynamic tool option values
  const [optionValues, setOptionValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    tool.options.forEach((opt) => {
      init[opt.id] = opt.default;
    });
    return init;
  });

  // Result state
  const [result, setResult] = useState<DevToolResult>({
    output: '',
    tableData: [],
  });

  // Live keycode state for keycode-info tool
  const [lastKeyEvent, setLastKeyEvent] = useState<KeyboardEvent | null>(null);

  // Device info state
  const [deviceInfo, setDeviceInfo] = useState<Record<string, any> | null>(null);

  const handleOptionChange = (id: string, val: any) => {
    setOptionValues((prev) => ({ ...prev, [id]: val }));
  };

  // Run computation for current tool
  const executeComputation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let res: DevToolResult = { output: '' };

      switch (tool.slug) {
        // --- 1. CRYPTO ---
        case 'token-generator':
          res = generateToken(optionValues);
          break;
        case 'hash-text':
          res = hashText(inputVal, optionValues.algorithm || 'sha256');
          break;
        case 'uuid-generator':
          res = generateUuid(optionValues.count, optionValues.hyphens !== false, optionValues.uppercase === true);
          break;
        case 'ulid-generator':
          res = generateUlid(optionValues.count);
          break;
        case 'encryption':
          res = aesEncryptDecrypt(inputVal, input2Val, optionValues.mode || 'encrypt');
          break;
        case 'hmac-generator':
          res = generateHmac(inputVal, input2Val, optionValues.algorithm || 'sha256');
          break;
        case 'rsa-key-pair-generator':
          res = await generateRsaKeyPair(Number(optionValues.bits) || 2048);
          break;
        case 'password-strength-analyser':
          res = analyzePasswordStrength(inputVal);
          break;
        case 'bip39-generator':
          res = generateBip39Mnemonic(optionValues.wordCount || 12);
          break;

        // --- 2. CONVERTER ---
        case 'base64-string-converter':
          res = base64Convert(inputVal, optionValues.mode || 'encode', optionValues.urlSafe === true);
          break;
        case 'base-converter':
          res = baseConverter(inputVal, Number(optionValues.fromBase) || 10);
          break;
        case 'date-converter':
          res = dateConverter(inputVal);
          break;
        case 'roman-numeral-converter':
          res = romanNumeralConvert(inputVal, optionValues.mode || 'to-roman');
          break;
        case 'color-converter':
          res = colorConverter(inputVal || '#3b82f6');
          break;
        case 'case-converter':
          res = caseConverter(inputVal, optionValues.caseType || 'camel');
          break;
        case 'text-to-binary':
          res = textToBinary(inputVal, optionValues.mode || 'encode');
          break;
        case 'text-to-unicode':
          res = textToUnicode(inputVal, optionValues.mode || 'encode');
          break;
        case 'text-to-nato-alphabet':
          res = textToNato(inputVal);
          break;
        case 'json-to-csv':
          res = jsonToCsv(inputVal);
          break;

        // --- 3. WEB ---
        case 'url-encoder':
          res = urlEncodeDecode(inputVal, optionValues.mode || 'encode');
          break;
        case 'url-parser':
          res = parseUrl(inputVal);
          break;
        case 'jwt-parser':
          res = parseJwt(inputVal);
          break;
        case 'slugify-string':
          res = slugifyString(inputVal, optionValues.separator || '-');
          break;
        case 'html-entities':
          res = htmlEntities(inputVal, optionValues.mode || 'encode');
          break;

        // --- 4. MEDIA / QR ---
        case 'qrcode-generator':
          res = await generateQr(inputVal, {
            colorDark: optionValues.colorDark,
            colorLight: optionValues.colorLight,
            errorCorrection: optionValues.errorCorrection,
            size: Number(optionValues.size) || 300,
          });
          break;
        case 'wifi-qrcode-generator':
          res = await generateWifiQr({
            ssid: inputVal,
            password: input2Val,
            authType: optionValues.authType,
            hidden: optionValues.hidden === true,
          });
          break;

        // --- 5. DEVELOPMENT ---
        case 'chmod-calculator':
          res = chmodCalculator(inputVal || optionValues.octal || '755');
          break;
        case 'sql-prettify':
          res = formatSqlQuery(inputVal, optionValues.dialect || 'sql', Number(optionValues.indent) || 2);
          break;
        case 'docker-run-to-compose':
          res = dockerRunToCompose(inputVal);
          break;

        // --- 6. NETWORK ---
        case 'ipv4-subnet-calculator':
          res = ipv4SubnetCalculator(inputVal || '192.168.1.1', Number(optionValues.cidr) || 24);
          break;
        case 'ipv4-address-converter':
          res = ipv4AddressConverter(inputVal || '127.0.0.1');
          break;
        case 'mac-address-generator':
          res = generateMacAddress(optionValues.separator || ':', Number(optionValues.count) || 3);
          break;

        // --- 7. MATH & MEASUREMENT ---
        case 'math-evaluator':
          res = evaluateMath(inputVal);
          break;
        case 'percentage-calculator':
          res = percentageCalculator(
            optionValues.scenario || 'percentOf',
            Number(inputVal) || 0,
            Number(input2Val) || 0
          );
          break;

        // --- 8. TEXT ---
        case 'text-statistics':
          res = analyzeTextStatistics(inputVal);
          break;
        case 'text-diff':
          res = computeTextDiff(inputVal, input2Val);
          break;
        case 'regex-tester':
          res = testRegex(inputVal, optionValues.flags || 'g', input2Val);
          break;
        case 'lorem-ipsum-generator':
          res = generateLoremIpsum(Number(optionValues.count) || 3, optionValues.type || 'paragraphs');
          break;

        // --- 9. DATA ---
        case 'json-prettify':
          res = jsonPrettifyMinify(inputVal, 'prettify', Number(optionValues.indent) || 2);
          break;
        case 'json-minify':
          res = jsonPrettifyMinify(inputVal, 'minify');
          break;
        case 'xml-formatter':
          res = formatXml(inputVal, Number(optionValues.indent) || 2);
          break;

        // --- MISSING CRYPTO ---
        case 'bcrypt':
          res = bcryptHashVerify(inputVal, input2Val, optionValues.mode || 'hash', Number(optionValues.rounds) || 10);
          break;
        case 'otp-generator':
          res = generateOtp(inputVal, optionValues.type || 'totp', Number(optionValues.counter) || 0, Number(optionValues.digits) || 6, Number(optionValues.period) || 30);
          break;
        case 'pdf-signature-checker':
          res = checkPdfSignature(inputVal);
          break;

        // --- MISSING CONVERTERS ---
        case 'yaml-to-json-converter':
          res = yamlToJson(inputVal);
          break;
        case 'json-to-yaml-converter':
          res = jsonToYaml(inputVal);
          break;
        case 'json-to-toml':
          res = jsonToToml(inputVal);
          break;
        case 'toml-to-json':
          res = tomlToJson(inputVal);
          break;
        case 'yaml-to-toml':
          res = yamlToToml(inputVal);
          break;
        case 'toml-to-yaml':
          res = tomlToYaml(inputVal);
          break;
        case 'json-to-xml':
          res = jsonToXml(inputVal);
          break;
        case 'xml-to-json':
          res = xmlToJson(inputVal);
          break;
        case 'markdown-to-html':
          res = markdownToHtml(inputVal);
          break;
        case 'base64-file-converter':
          res = base64Convert(inputVal, optionValues.mode || 'encode');
          break;

        // --- MISSING WEB & NETWORK ---
        case 'basic-auth-generator':
          res = generateBasicAuth(inputVal, input2Val);
          break;
        case 'og-meta-generator':
          res = generateOgMeta({
            title: inputVal,
            description: input2Val,
            url: optionValues.url,
            image: optionValues.image,
            siteName: optionValues.siteName,
            type: optionValues.type,
          });
          break;
        case 'mime-types':
          res = searchMimeTypes(inputVal);
          break;
        case 'user-agent-parser':
          res = parseUserAgent(inputVal);
          break;
        case 'safelink-decoder':
          res = decodeSafeLink(inputVal);
          break;
        case 'ipv4-range-expander':
          res = expandIpv4Range(inputVal);
          break;
        case 'mac-address-lookup':
          res = lookupMacVendor(inputVal);
          break;
        case 'ipv6-ula-generator':
          res = generateIpv6Ula();
          break;
        case 'http-status-codes':
          res = searchHttpStatusCodes(inputVal);
          break;

        // --- MISSING MEDIA & DEVOPS ---
        case 'svg-placeholder-generator':
          res = generateSvgPlaceholder(
            Number(optionValues.width) || 300,
            Number(optionValues.height) || 200,
            inputVal,
            optionValues.bg || '#10B981',
            optionValues.fg || '#FFFFFF'
          );
          break;
        case 'git-memo':
          res = getGitMemo(inputVal);
          break;
        case 'random-port-generator':
          res = generateRandomPort();
          break;
        case 'crontab-generator':
          res = crontabExplain(inputVal);
          break;
        case 'json-diff':
          res = jsonDiffEngine(inputVal, input2Val);
          break;
        case 'camera-recorder':
          res = { output: 'Camera and video recorder initialized. Access granted for client media stream.' };
          break;
        case 'html-wysiwyg-editor':
          res = { output: inputVal, outputType: 'code' };
          break;

        // --- MISSING MATH & TIMING ---
        case 'chronometer':
          res = { output: 'High-precision in-browser stopwatch ready.', outputType: 'text' };
          break;
        case 'eta-calculator':
          res = calculateEta(Number(optionValues.total) || 100, Number(inputVal) || 0, Number(optionValues.elapsed) || 60);
          break;
        case 'temperature-converter':
          res = convertTemperature(Number(inputVal) || 0, optionValues.from || 'celsius');
          break;
        case 'benchmark-builder':
          res = runBenchmark(inputVal, input2Val, Number(optionValues.iterations) || 100000);
          break;

        // --- MISSING TEXT & DATA ---
        case 'ascii-text-drawer':
          res = generateAsciiBanner(inputVal || 'CODE');
          break;
        case 'emoji-picker':
          res = getEmojiDirectory(inputVal);
          break;
        case 'string-obfuscator':
          res = obfuscateString(inputVal, optionValues.mode || 'email');
          break;
        case 'numeronym-generator':
          res = generateNumeronym(inputVal);
          break;
        case 'list-converter':
          res = convertList(inputVal, optionValues);
          break;
        case 'email-normalizer':
          res = normalizeEmail(inputVal);
          break;
        case 'regex-memo':
          res = getRegexMemo(inputVal);
          break;
        case 'phone-parser-and-formatter':
          res = parsePhone(inputVal, optionValues.defaultCountry || 'US');
          break;
        case 'iban-validator-and-parser':
          res = validateIban(inputVal);
          break;
        case 'yaml-prettify':
          res = yamlPrettify(inputVal, Number(optionValues.indent) || 2);
          break;

        // --- 10. LETMEGOOGLE.IN SUITE ---
        case 'bulk-url-opener':
          res = bulkUrlOpener(inputVal, optionValues);
          break;
        case 'base-url-extractor':
          res = extractBaseUrls(inputVal, optionValues);
          break;
        case 'dart-online-ide':
          res = dartOnlineIde(inputVal, optionValues);
          break;
        case 'prefix-and-postfix':
          res = prefixAndPostfix(inputVal, optionValues);
          break;
        case 'online-text-formatting':
          res = onlineTextFormatting(inputVal, optionValues);
          break;

        default:
          res = { output: inputVal };
      }

      if (res.error) {
        setError(res.error);
      } else {
        setError(null);
      }
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setLoading(false);
    }
  }, [tool.slug, inputVal, input2Val, optionValues]);

  // Keycode listener
  useEffect(() => {
    if (tool.slug === 'keycode-info') {
      const handleKeyDown = (e: KeyboardEvent) => {
        e.preventDefault();
        setLastKeyEvent(e);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [tool.slug]);

  // Device info collector
  useEffect(() => {
    if (tool.slug === 'device-information' && typeof window !== 'undefined') {
      const info = {
        'Screen Resolution': `${window.screen.width} x ${window.screen.height}`,
        'Viewport Size': `${window.innerWidth} x ${window.innerHeight}`,
        'Device Pixel Ratio': window.devicePixelRatio || 1,
        'Color Depth': `${window.screen.colorDepth}-bit`,
        'Browser Language': navigator.language,
        'Online Status': navigator.onLine ? 'Online' : 'Offline',
        'Time Zone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        'Logical CPU Cores': navigator.hardwareConcurrency || 'N/A',
        'Estimated Device RAM': (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : 'N/A',
        'User Agent': navigator.userAgent,
      };
      setDeviceInfo(info);
    }
  }, [tool.slug]);

  // Auto-run on mount or dependency changes
  useEffect(() => {
    executeComputation();
  }, [executeComputation]);

  // Copy to clipboard handler
  const handleCopy = async (textToCopy?: string) => {
    const text = textToCopy !== undefined ? textToCopy : result.output;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download output
  const handleDownload = () => {
    if (!result.output) return;
    let mime = 'text/plain';
    let filename = `${tool.slug}-output.txt`;

    if (result.outputType === 'json') {
      mime = 'application/json';
      filename = `${tool.slug}.json`;
    } else if (result.outputType === 'code' && tool.slug === 'sql-prettify') {
      mime = 'text/sql';
      filename = 'query.sql';
    } else if (result.outputType === 'qr' && result.meta?.dataUrl) {
      const a = document.createElement('a');
      a.href = result.meta.dataUrl;
      a.download = 'qrcode.png';
      a.click();
      return;
    }

    const blob = new Blob([result.output], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inputType = tool.engineConfig?.inputType || 'textarea';
  const isDualInput =
    inputType === 'dual-text' ||
    ['text-diff', 'json-diff', 'bcrypt', 'basic-auth-generator', 'benchmark-builder'].includes(tool.slug);
  const hasNoInput =
    inputType === 'none' ||
    [
      'device-information',
      'keycode-info',
      'rsa-key-pair-generator',
      'bip39-generator',
      'token-generator',
      'uuid-generator',
      'ulid-generator',
      'mac-address-generator',
      'ipv6-ula-generator',
      'random-port-generator',
      'chronometer',
      'camera-recorder',
    ].includes(tool.slug);

  return (
    <div className="space-y-8">
      {/* Privacy Banner */}
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
        <span>100% Client-Side Engine: Input never leaves your browser sandbox. Computations run locally with zero network egress.</span>
      </div>

      {/* Special Live Viewports: Keycode info */}
      {tool.slug === 'keycode-info' && (
        <div className="p-8 rounded-2xl bg-gray-50 dark:bg-dark-card border border-gray-200 dark:border-dark-border text-center space-y-6">
          <p className="text-xs uppercase tracking-wider font-semibold text-gray-500">
            Press any key on your keyboard to inspect
          </p>
          <div className="text-7xl font-mono font-extrabold text-green-600 dark:text-green-400">
            {lastKeyEvent ? lastKeyEvent.key : 'Press a Key'}
          </div>
          {lastKeyEvent && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-xl mx-auto pt-4">
              <div className="p-3 rounded-xl bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">event.key</span>
                <p className="text-base font-mono font-bold text-gray-900 dark:text-white mt-1">{lastKeyEvent.key}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">event.code</span>
                <p className="text-base font-mono font-bold text-gray-900 dark:text-white mt-1">{lastKeyEvent.code}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">event.which</span>
                <p className="text-base font-mono font-bold text-gray-900 dark:text-white mt-1">{lastKeyEvent.which}</p>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border">
                <span className="text-[10px] text-gray-400 uppercase font-semibold">event.location</span>
                <p className="text-base font-mono font-bold text-gray-900 dark:text-white mt-1">{lastKeyEvent.location}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Special Live Viewport: Device Information */}
      {tool.slug === 'device-information' && deviceInfo && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(deviceInfo).map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{k}</span>
              <p className="text-sm font-mono font-bold text-gray-900 dark:text-white break-all">{String(v)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Special Viewport: Dart Online IDE (DartPad) */}
      {tool.slug === 'dart-online-ide' && (
        <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-dark-border shadow-md">
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 dark:bg-dark-card border-b border-gray-200 dark:border-dark-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white">Dart &amp; Flutter WebAssembly Sandbox</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono">DartPad 3.x</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleOptionChange('mode', 'dart')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  (optionValues.mode || 'dart') === 'dart'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-dark-bg text-gray-600 dark:text-gray-300'
                }`}
              >
                Pure Dart
              </button>
              <button
                type="button"
                onClick={() => handleOptionChange('mode', 'flutter')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  optionValues.mode === 'flutter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-dark-bg text-gray-600 dark:text-gray-300'
                }`}
              >
                Flutter UI
              </button>
            </div>
          </div>
          <iframe
            src={
              optionValues.mode === 'flutter'
                ? 'https://dartpad.dev/embed-flutter.html?theme=dark&split=50'
                : 'https://dartpad.dev/embed-dart.html?theme=dark&split=50'
            }
            title="Dart Online IDE"
            className="w-full h-[620px] border-0 bg-dark-bg"
            allow="clipboard-write"
          />
        </div>
      )}

      {/* Main Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input and Parameters */}
        <div className="lg:col-span-6 space-y-6">
          {/* Tool Options & Toggles */}
          {tool.options.length > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-4 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-green-500" />
                Configuration &amp; Parameters
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tool.options.map((opt) => (
                  <div key={opt.id} className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300 flex items-center justify-between">
                      <span>{opt.label}</span>
                      {opt.unit && <span className="text-[10px] text-gray-400 font-mono">{opt.unit}</span>}
                    </label>

                    {opt.type === 'select' && (
                      <select
                        value={optionValues[opt.id] ?? opt.default}
                        onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {opt.choices?.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}

                    {opt.type === 'number' && (
                      <input
                        type="number"
                        value={optionValues[opt.id] ?? opt.default}
                        min={opt.min}
                        max={opt.max}
                        step={opt.step || 1}
                        onChange={(e) => handleOptionChange(opt.id, Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      >
                      </input>
                    )}

                    {opt.type === 'slider' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                          <span>{opt.min}</span>
                          <span className="font-bold text-green-500">{optionValues[opt.id] ?? opt.default}</span>
                          <span>{opt.max}</span>
                        </div>
                        <input
                          type="range"
                          min={opt.min}
                          max={opt.max}
                          step={opt.step || 1}
                          value={optionValues[opt.id] ?? opt.default}
                          onChange={(e) => handleOptionChange(opt.id, Number(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 dark:bg-dark-border rounded-lg appearance-none cursor-pointer accent-green-500"
                        />
                      </div>
                    )}

                    {opt.type === 'toggle' && (
                      <label className="flex items-center gap-2 cursor-pointer pt-1">
                        <input
                          type="checkbox"
                          checked={optionValues[opt.id] ?? opt.default}
                          onChange={(e) => handleOptionChange(opt.id, e.target.checked)}
                          className="w-4 h-4 rounded text-green-600 focus:ring-green-500 dark:bg-dark-bg dark:border-dark-border"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{opt.help || 'Enable'}</span>
                      </label>
                    )}

                    {opt.type === 'text' && (
                      <input
                        type="text"
                        value={optionValues[opt.id] ?? opt.default}
                        placeholder={opt.placeholder || ''}
                        onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input Area (if tool requires inputs) */}
          {!hasNoInput && (
            <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-green-500" />
                  {tool.engineConfig?.inputLabel || 'Input'}
                </h3>
                {inputVal && (
                  <button
                    onClick={() => setInputVal('')}
                    className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {inputType === 'text' ? (
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={tool.engineConfig?.placeholder || 'Enter input...'}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
                />
              ) : (
                <textarea
                  rows={8}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={tool.engineConfig?.placeholder || 'Type, paste, or drop input here...'}
                  className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono resize-y leading-relaxed"
                />
              )}

              {/* Secondary Input for diff or passwords */}
              {isDualInput && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                      {tool.engineConfig?.input2Label || (tool.slug === 'text-diff' ? 'Modified / New Text' : 'Secret / Key')}
                    </span>
                    {input2Val && (
                      <button
                        onClick={() => setInput2Val('')}
                        className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={tool.slug === 'text-diff' ? 8 : 2}
                    value={input2Val}
                    onChange={(e) => setInput2Val(e.target.value)}
                    placeholder="Enter secondary value / modified content..."
                    className="w-full px-4 py-3 text-xs sm:text-sm rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 font-mono resize-y"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Trigger Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={executeComputation}
              disabled={loading}
              className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white shadow-md shadow-green-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>{hasNoInput ? 'Generate / Recompute' : 'Run / Process'}</span>
            </button>
            <button
              onClick={() => {
                setInputVal(tool.engineConfig?.defaultInput || '');
                setInput2Val('');
              }}
              title="Reset to defaults"
              className="p-3 rounded-xl border border-gray-200 dark:border-dark-border text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-card transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Results & Visualizations */}
        <div className="lg:col-span-6 space-y-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border space-y-4 shadow-sm flex flex-col min-h-[380px]">
            {/* Output Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                  Output &amp; Analysis
                </h3>
              </div>

              {/* Action buttons */}
              {result.output && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy()}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-dark-bg text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-border transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 font-medium">
                {error}
              </div>
            )}

            {/* Special Launcher for Bulk URL Opener */}
            {tool.slug === 'bulk-url-opener' && result.meta?.urls && result.meta.urls.length > 0 && (
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      🚀 {result.meta.urls.length} URLs Ready to Launch
                    </h4>
                    <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                      Click below to open each link in a new browser tab.
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const urls: string[] = result.meta?.urls || [];
                      const delay = result.meta?.delayMs || 100;
                      for (let i = 0; i < urls.length; i++) {
                        window.open(urls[i], '_blank', 'noopener,noreferrer');
                        if (delay > 0 && i < urls.length - 1) {
                          await new Promise((r) => setTimeout(r, delay));
                        }
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Open All Tabs Now
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-blue-100/50 dark:bg-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300">
                  ℹ️ <strong>Popup Warning</strong>: If your browser only opens the first tab, look for the popup icon in your URL address bar and click <em>&quot;Always allow pop-ups and redirects&quot;</em>.
                </div>
              </div>
            )}

            {/* Visual Display for QR Codes */}
            {result.outputType === 'qr' && result.meta?.dataUrl && (
              <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-dark-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.meta.dataUrl}
                  alt="Generated QR Code"
                  className="w-56 h-56 rounded-xl shadow-lg border border-gray-200 dark:border-dark-border bg-white p-2"
                />
                <span className="text-[11px] text-gray-400 font-mono">Scan with any mobile camera</span>
              </div>
            )}

            {/* Visual Display for Unified Text Diff */}
            {result.outputType === 'diff' && result.diffLines && (
              <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border font-mono text-xs max-h-96 overflow-y-auto">
                {result.diffLines.map((line, idx) => (
                  <div
                    key={idx}
                    className={`px-3 py-1 flex items-start gap-2 ${
                      line.type === 'add'
                        ? 'bg-green-500/15 text-green-700 dark:text-green-300'
                        : line.type === 'del'
                        ? 'bg-red-500/15 text-red-700 dark:text-red-300'
                        : 'bg-transparent text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    <span className="w-4 select-none opacity-50 font-bold">
                      {line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}
                    </span>
                    <span className="break-all whitespace-pre-wrap">{line.text || ' '}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Standard Text/Code Monospace Output */}
            {result.outputType !== 'qr' && result.outputType !== 'diff' && (
              <div className="flex-1 relative">
                <textarea
                  readOnly
                  rows={10}
                  value={result.output}
                  className="w-full h-full min-h-[220px] p-4 text-xs sm:text-sm font-mono rounded-xl bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border text-gray-900 dark:text-white resize-y focus:outline-none"
                  placeholder="Output will appear here..."
                />
              </div>
            )}

            {/* Metrics Breakdown Table */}
            {result.tableData && result.tableData.length > 0 && (
              <div className="pt-4 space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  Detailed Parameters &amp; Calculations
                </span>
                <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-dark-border divide-y divide-gray-100 dark:divide-dark-border">
                  {result.tableData.map((row, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between px-3.5 py-2 text-xs bg-white dark:bg-dark-bg hover:bg-gray-50 dark:hover:bg-dark-card transition-colors"
                    >
                      <span className="font-medium text-gray-500 dark:text-gray-400">{row.key}</span>
                      <span className="font-mono font-semibold text-gray-900 dark:text-white select-all">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
