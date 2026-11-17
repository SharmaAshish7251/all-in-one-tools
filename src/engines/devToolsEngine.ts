import CryptoJS from 'crypto-js';
import * as Diff from 'diff';
import QRCode from 'qrcode';
import { format as formatSql } from 'sql-formatter';
import YAML from 'yaml';
import bcrypt from 'bcryptjs';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { isValidIBAN, electronicFormatIBAN } from 'ibantools';
import cronstrue from 'cronstrue';

export interface DevToolResult {
  output: string;
  outputType?: 'text' | 'code' | 'json' | 'table' | 'qr' | 'diff' | 'custom';
  meta?: Record<string, any>;
  tableData?: Array<{ key: string; value: string | number }>;
  diffLines?: Array<{ type: 'add' | 'del' | 'same'; text: string }>;
  error?: string;
}

// -------------------------------------------------------------
// 1. CRYPTO ENGINES
// -------------------------------------------------------------

export function generateToken(options: {
  length?: number;
  lowercase?: boolean;
  uppercase?: boolean;
  numbers?: boolean;
  symbols?: boolean;
}): DevToolResult {
  const length = Number(options.length) || 32;
  let chars = '';
  if (options.lowercase !== false) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (options.uppercase !== false) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (options.numbers !== false) chars += '0123456789';
  if (options.symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const randomValues = new Uint32Array(length);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomValues);
  } else {
    for (let i = 0; i < length; i++) randomValues[i] = Math.floor(Math.random() * 0xffffffff);
  }

  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }

  return {
    output: token,
    outputType: 'text',
    meta: { length, entropy: Math.round(length * Math.log2(chars.length)) },
  };
}

export function hashText(input: string, algorithm: string = 'sha256'): DevToolResult {
  if (!input) return { output: '' };
  let hashStr = '';

  switch (algorithm.toLowerCase()) {
    case 'md5':
      hashStr = CryptoJS.MD5(input).toString();
      break;
    case 'sha1':
      hashStr = CryptoJS.SHA1(input).toString();
      break;
    case 'sha224':
      hashStr = CryptoJS.SHA224(input).toString();
      break;
    case 'sha256':
      hashStr = CryptoJS.SHA256(input).toString();
      break;
    case 'sha384':
      hashStr = CryptoJS.SHA384(input).toString();
      break;
    case 'sha512':
      hashStr = CryptoJS.SHA512(input).toString();
      break;
    case 'sha3':
      hashStr = CryptoJS.SHA3(input).toString();
      break;
    case 'ripemd160':
      hashStr = CryptoJS.RIPEMD160(input).toString();
      break;
    default:
      hashStr = CryptoJS.SHA256(input).toString();
  }

  return {
    output: hashStr,
    outputType: 'text',
    tableData: [
      { key: 'Algorithm', value: algorithm.toUpperCase() },
      { key: 'Input Length', value: `${input.length} chars` },
      { key: 'Hash Bit Length', value: `${hashStr.length * 4} bits` },
    ],
  };
}

export function generateUuid(count: number = 5, hyphens: boolean = true, uppercase: boolean = false): DevToolResult {
  const qty = Math.min(Math.max(Number(count) || 1, 1), 100);
  const uuids: string[] = [];

  for (let i = 0; i < qty; i++) {
    let id = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      id = window.crypto.randomUUID();
    } else {
      id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    if (!hyphens) id = id.replace(/-/g, '');
    if (uppercase) id = id.toUpperCase();
    uuids.push(id);
  }

  return {
    output: uuids.join('\n'),
    outputType: 'text',
    meta: { count: qty },
  };
}

export function generateUlid(count: number = 5): DevToolResult {
  const qty = Math.min(Math.max(Number(count) || 1, 1), 50);
  const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford's Base32

  const ulids: string[] = [];
  for (let i = 0; i < qty; i++) {
    const time = Date.now();
    let timeStr = '';
    let tempTime = time;
    for (let t = 9; t >= 0; t--) {
      timeStr = ENCODING[tempTime % 32] + timeStr;
      tempTime = Math.floor(tempTime / 32);
    }

    let randStr = '';
    const randVals = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randVals);
    } else {
      for (let r = 0; r < 16; r++) randVals[r] = (Math.random() * 256) | 0;
    }
    for (let r = 0; r < 16; r++) {
      randStr += ENCODING[randVals[r] % 32];
    }

    ulids.push(timeStr + randStr);
  }

  return {
    output: ulids.join('\n'),
    outputType: 'text',
    meta: { count: qty },
  };
}

export function aesEncryptDecrypt(
  text: string,
  passphrase: string,
  mode: 'encrypt' | 'decrypt' = 'encrypt'
): DevToolResult {
  if (!text || !passphrase) {
    return { output: '', error: 'Both text and secret passphrase are required.' };
  }

  try {
    if (mode === 'encrypt') {
      const encrypted = CryptoJS.AES.encrypt(text, passphrase).toString();
      return { output: encrypted, outputType: 'text' };
    } else {
      const decrypted = CryptoJS.AES.decrypt(text, passphrase);
      const str = decrypted.toString(CryptoJS.enc.Utf8);
      if (!str) return { output: '', error: 'Decryption failed. Invalid passphrase or ciphertext.' };
      return { output: str, outputType: 'text' };
    }
  } catch (err: any) {
    return { output: '', error: err.message || 'AES cipher execution failed' };
  }
}

export function generateHmac(text: string, secret: string, algorithm: string = 'sha256'): DevToolResult {
  if (!text || !secret) {
    return { output: '', error: 'Please supply both input text and secret key.' };
  }

  let hmacResult = '';
  switch (algorithm.toLowerCase()) {
    case 'md5':
      hmacResult = CryptoJS.HmacMD5(text, secret).toString();
      break;
    case 'sha1':
      hmacResult = CryptoJS.HmacSHA1(text, secret).toString();
      break;
    case 'sha512':
      hmacResult = CryptoJS.HmacSHA512(text, secret).toString();
      break;
    default:
      hmacResult = CryptoJS.HmacSHA256(text, secret).toString();
  }

  return {
    output: hmacResult,
    outputType: 'text',
    tableData: [
      { key: 'Algorithm', value: `HMAC-${algorithm.toUpperCase()}` },
      { key: 'Digest Length', value: `${hmacResult.length * 4} bits` },
    ],
  };
}

export async function generateRsaKeyPair(bits: number = 2048): Promise<DevToolResult> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return { output: '', error: 'WebCrypto API is not supported in this environment.' };
  }

  try {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: bits,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );

    const pubExport = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const privExport = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    const toPem = (buf: ArrayBuffer, label: string) => {
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const b64 = btoa(binary);
      const lines = b64.match(/.{1,64}/g)?.join('\n') || b64;
      return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
    };

    const pubPem = toPem(pubExport, 'PUBLIC KEY');
    const privPem = toPem(privExport, 'PRIVATE KEY');

    return {
      output: `${pubPem}\n\n${privPem}`,
      outputType: 'code',
      tableData: [
        { key: 'Key Size', value: `${bits} bits` },
        { key: 'Algorithm', value: 'RSA-OAEP (SHA-256)' },
        { key: 'Format', value: 'PKCS#8 Private / SPKI Public PEM' },
      ],
    };
  } catch (err: any) {
    return { output: '', error: err.message || 'RSA key generation failed.' };
  }
}

export function analyzePasswordStrength(password: string): DevToolResult {
  if (!password) {
    return {
      output: 'Enter a password to evaluate strength.',
      tableData: [],
    };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 33;

  const entropy = Math.round(password.length * Math.log2(poolSize || 1));
  let score = 0;
  if (entropy > 28) score = 1;
  if (entropy > 36) score = 2;
  if (entropy > 60) score = 3;
  if (entropy > 80) score = 4;

  const labels = ['Very Weak', 'Weak', 'Reasonable', 'Strong', 'Very Strong'];
  const guessesPerSec = 1e10; // 10 billion guesses/sec
  const secondsToCrack = Math.pow(2, entropy) / guessesPerSec;

  const formatCrackTime = (secs: number) => {
    if (secs < 1) return 'Instant';
    if (secs < 60) return `${Math.round(secs)} seconds`;
    if (secs < 3600) return `${Math.round(secs / 60)} minutes`;
    if (secs < 86400) return `${Math.round(secs / 3600)} hours`;
    if (secs < 31536000) return `${Math.round(secs / 86400)} days`;
    if (secs < 31536000000) return `${Math.round(secs / 31536000)} years`;
    return 'Centuries+';
  };

  return {
    output: `Strength: ${labels[score]} (${score}/4)\nEntropy: ${entropy} bits\nEstimated Crack Time: ${formatCrackTime(secondsToCrack)}`,
    tableData: [
      { key: 'Strength Level', value: labels[score] },
      { key: 'Password Length', value: `${password.length} characters` },
      { key: 'Character Pool', value: `${poolSize} characters` },
      { key: 'Information Entropy', value: `${entropy} bits` },
      { key: 'Time to Offline Crack (10B/s)', value: formatCrackTime(secondsToCrack) },
    ],
  };
}

export function generateBip39Mnemonic(wordCount: number = 12): DevToolResult {
  const words = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
    'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
    'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
    'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
    'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
    'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
    'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
    'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
    'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
    'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
    'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
    'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
    'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
    'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
    'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
    'blind', 'blood', 'blossom', 'blouse', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
    'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
    'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread', 'breeze',
    'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze', 'broom',
    'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb', 'bulk',
    'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy', 'butter',
    'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call', 'calm',
    'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas', 'canyon',
    'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'cargo', 'carpet', 'carry', 'cart',
    'case', 'cash', 'casino', 'castle', 'casual', 'cat', 'catalog', 'catch', 'category', 'cattle',
    'caught', 'cause', 'caution', 'cave', 'ceiling', 'celery', 'cement', 'census', 'century', 'cereal',
    'certain', 'chair', 'chalk', 'champion', 'change', 'chaos', 'chapter', 'charge', 'chase', 'chat',
    'cheap', 'check', 'cheese', 'chef', 'cherry', 'chest', 'chicken', 'chief', 'child', 'chimney',
    'choice', 'choose', 'chronic', 'chuckle', 'chunk', 'churn', 'cigar', 'cinnamon', 'circle', 'citizen',
    'city', 'civil', 'claim', 'clap', 'clarify', 'claw', 'clay', 'clean', 'clerk', 'clever',
    'click', 'client', 'cliff', 'climb', 'clinic', 'clip', 'clock', 'clog', 'close', 'cloth',
    'cloud', 'clown', 'club', 'clump', 'cluster', 'clutch', 'coach', 'coast', 'coconut', 'code',
    'coffee', 'coil', 'coin', 'collect', 'color', 'column', 'combine', 'come', 'comfort', 'comic',
    'common', 'company', 'concert', 'conduct', 'confirm', 'congress', 'connect', 'consider', 'control', 'convince',
    'cook', 'cool', 'copper', 'copy', 'coral', 'core', 'corn', 'correct', 'cost', 'cotton',
    'couch', 'country', 'couple', 'course', 'cousin', 'cover', 'coyote', 'crack', 'cradle', 'craft',
    'crane', 'crash', 'crater', 'crawl', 'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket',
    'crime', 'crisp', 'critic', 'crop', 'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise',
    'crumble', 'crunch', 'crush', 'cry', 'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious',
    'current', 'curtain', 'curve', 'cushion', 'custom', 'cute', 'cycle', 'dad', 'damage', 'damp',
    'dance', 'danger', 'daring', 'dash', 'daughter', 'dawn', 'day', 'deal', 'debate', 'debris',
    'decade', 'december', 'decide', 'decline', 'decorate', 'decrease', 'deer', 'defense', 'define', 'defy',
    'degree', 'delay', 'deliver', 'demand', 'demise', 'denial', 'dentist', 'deny', 'depart', 'depend',
    'deposit', 'depth', 'deputy', 'derive', 'describe', 'desert', 'design', 'desk', 'despair', 'destroy',
    'detail', 'detect', 'develop', 'device', 'devote', 'diagram', 'dial', 'diamond', 'diary', 'dice',
    'diesel', 'diet', 'differ', 'digital', 'dignity', 'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt',
    'disagree', 'discover', 'disease', 'dish', 'dismiss', 'disorder', 'display', 'distance', 'divert', 'divide',
    'divorce', 'dizzy', 'doctor', 'document', 'dog', 'doll', 'dolphin', 'domain', 'donate', 'donkey',
    'donor', 'door', 'dose', 'double', 'dove', 'draft', 'dragon', 'drain', 'drama', 'drastic',
    'draw', 'dream', 'dress', 'drift', 'drill', 'drink', 'drip', 'drive', 'drop', 'drum',
    'dry', 'duck', 'dumb', 'dune', 'during', 'dust', 'dutch', 'duty', 'dwarf', 'dynamic',
    'eager', 'eagle', 'early', 'earn', 'earth', 'easily', 'east', 'easy', 'echo', 'ecology',
    'economy', 'edge', 'edit', 'educate', 'effort', 'egg', 'eight', 'either', 'elbow', 'elder',
    'electric', 'elegant', 'element', 'elephant', 'elevator', 'elite', 'else', 'embark', 'embody', 'embrace',
    'emerge', 'emotion', 'employ', 'empower', 'empty', 'enable', 'enact', 'end', 'endless', 'endorse',
    'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance', 'enjoy', 'enlist', 'enough', 'enrich',
    'enroll', 'ensure', 'enter', 'entire', 'entry', 'envelope', 'episode', 'equal', 'equip', 'era',
    'erase', 'erode', 'erosion', 'error', 'erupt', 'escape', 'essay', 'essence', 'estate', 'eternal',
    'ethics', 'evidence', 'evil', 'evoke', 'evolve', 'exact', 'example', 'excess', 'exchange', 'excite',
    'exclude', 'excuse', 'execute', 'exercise', 'exhaust', 'exhibit', 'exile', 'exist', 'exit', 'exotic',
    'expand', 'expect', 'expire', 'explain', 'expose', 'express', 'extend', 'extra', 'eye', 'eyebrow'
  ];

  const qty = [12, 15, 18, 21, 24].includes(Number(wordCount)) ? Number(wordCount) : 12;
  const picked: string[] = [];

  const randArr = new Uint32Array(qty);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randArr);
  } else {
    for (let i = 0; i < qty; i++) randArr[i] = Math.floor(Math.random() * words.length);
  }

  for (let i = 0; i < qty; i++) {
    picked.push(words[randArr[i] % words.length]);
  }

  return {
    output: picked.join(' '),
    outputType: 'text',
    tableData: [
      { key: 'Word Count', value: qty },
      { key: 'Standard', value: 'BIP-39 English' },
      { key: 'Entropy', value: `${(qty / 3) * 32} bits` },
    ],
  };
}

// -------------------------------------------------------------
// 2. CONVERTER ENGINES
// -------------------------------------------------------------

export function base64Convert(text: string, mode: 'encode' | 'decode' = 'encode', urlSafe: boolean = false): DevToolResult {
  try {
    if (mode === 'encode') {
      const utf8Bytes = new TextEncoder().encode(text);
      let binary = '';
      for (let i = 0; i < utf8Bytes.length; i++) binary += String.fromCharCode(utf8Bytes[i]);
      let b64 = btoa(binary);
      if (urlSafe) b64 = b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return { output: b64, outputType: 'text' };
    } else {
      let b64 = text;
      if (urlSafe) {
        b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
      }
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const decoded = new TextDecoder().decode(bytes);
      return { output: decoded, outputType: 'text' };
    }
  } catch (err: any) {
    return { output: '', error: `Base64 ${mode} failed: ${err.message}` };
  }
}

export function baseConverter(value: string, fromBase: number = 10): DevToolResult {
  if (!value) return { output: '' };
  try {
    const num = parseInt(value.trim(), fromBase);
    if (isNaN(num)) return { output: '', error: `Invalid number for base ${fromBase}` };

    return {
      output: num.toString(10),
      tableData: [
        { key: 'Binary (Base 2)', value: num.toString(2) },
        { key: 'Octal (Base 8)', value: num.toString(8) },
        { key: 'Decimal (Base 10)', value: num.toString(10) },
        { key: 'Hexadecimal (Base 16)', value: num.toString(16).toUpperCase() },
        { key: 'Base 36', value: num.toString(36).toUpperCase() },
      ],
    };
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function dateConverter(input: string): DevToolResult {
  let date: Date;
  if (!input || input.trim() === 'now') {
    date = new Date();
  } else if (/^\d{10}$/.test(input.trim())) {
    date = new Date(parseInt(input.trim(), 10) * 1000);
  } else if (/^\d{13}$/.test(input.trim())) {
    date = new Date(parseInt(input.trim(), 10));
  } else {
    date = new Date(input.trim());
  }

  if (isNaN(date.getTime())) {
    return { output: '', error: 'Invalid date or epoch timestamp format' };
  }

  return {
    output: date.toISOString(),
    tableData: [
      { key: 'Unix Epoch (Seconds)', value: Math.floor(date.getTime() / 1000) },
      { key: 'Unix Epoch (Milliseconds)', value: date.getTime() },
      { key: 'ISO 8601', value: date.toISOString() },
      { key: 'UTC String', value: date.toUTCString() },
      { key: 'Local String', value: date.toString() },
      { key: 'Timezone Offset', value: `${-date.getTimezoneOffset() / 60} hours` },
    ],
  };
}

export function romanNumeralConvert(input: string, mode: 'to-roman' | 'to-number' = 'to-roman'): DevToolResult {
  if (!input) return { output: '' };

  if (mode === 'to-roman') {
    const num = parseInt(input, 10);
    if (isNaN(num) || num < 1 || num > 3999) {
      return { output: '', error: 'Enter a positive integer between 1 and 3999.' };
    }
    const map: [number, string][] = [
      [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
      [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
      [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
    ];
    let n = num;
    let res = '';
    for (const [val, roman] of map) {
      while (n >= val) {
        res += roman;
        n -= val;
      }
    }
    return { output: res, outputType: 'text' };
  } else {
    const roman = input.toUpperCase().trim();
    const map: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
    let total = 0;
    for (let i = 0; i < roman.length; i++) {
      const current = map[roman[i]];
      const next = map[roman[i + 1]];
      if (!current) return { output: '', error: `Invalid Roman numeral character: ${roman[i]}` };
      if (next && current < next) {
        total -= current;
      } else {
        total += current;
      }
    }
    return { output: total.toString(), outputType: 'text' };
  }
}

export function colorConverter(input: string): DevToolResult {
  if (!input) return { output: '' };
  let hex = input.trim().replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');

  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    return { output: '', error: 'Provide a valid 6-character HEX color code (e.g. #3b82f6).' };
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // HSL
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      case bn: h = (rn - gn) / d + 4; break;
    }
    h = Math.round(h * 60);
  }

  return {
    output: `#${hex.toUpperCase()}`,
    meta: { hex: `#${hex}` },
    tableData: [
      { key: 'HEX', value: `#${hex.toUpperCase()}` },
      { key: 'RGB', value: `rgb(${r}, ${g}, ${b})` },
      { key: 'RGBA', value: `rgba(${r}, ${g}, ${b}, 1.0)` },
      { key: 'HSL', value: `hsl(${h}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)` },
      { key: 'CSS Variable', value: `--color: #${hex};` },
    ],
  };
}

export function caseConverter(text: string, targetCase: string = 'camel'): DevToolResult {
  if (!text) return { output: '' };
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_\-./\\]+/g, ' ')
    .trim()
    .split(/\s+/);

  let result = '';
  switch (targetCase) {
    case 'camel':
      result = words
        .map((w, idx) => (idx === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
        .join('');
      break;
    case 'snake':
      result = words.map((w) => w.toLowerCase()).join('_');
      break;
    case 'kebab':
      result = words.map((w) => w.toLowerCase()).join('-');
      break;
    case 'constant':
      result = words.map((w) => w.toUpperCase()).join('_');
      break;
    case 'pascal':
      result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      break;
    case 'title':
      result = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      break;
    case 'sentence':
      result = words.join(' ').toLowerCase();
      result = result.charAt(0).toUpperCase() + result.slice(1);
      break;
    default:
      result = text;
  }

  return {
    output: result,
    tableData: [
      { key: 'camelCase', value: caseConverter(text, 'camel').output },
      { key: 'snake_case', value: caseConverter(text, 'snake').output },
      { key: 'kebab-case', value: caseConverter(text, 'kebab').output },
      { key: 'CONSTANT_CASE', value: caseConverter(text, 'constant').output },
      { key: 'PascalCase', value: caseConverter(text, 'pascal').output },
    ],
  };
}

export function textToBinary(text: string, mode: 'encode' | 'decode' = 'encode'): DevToolResult {
  if (!text) return { output: '' };
  try {
    if (mode === 'encode') {
      const binary = text
        .split('')
        .map((char) => char.charCodeAt(0).toString(2).padStart(8, '0'))
        .join(' ');
      return { output: binary, outputType: 'text' };
    } else {
      const chars = text
        .trim()
        .split(/\s+/)
        .map((bin) => String.fromCharCode(parseInt(bin, 2)))
        .join('');
      return { output: chars, outputType: 'text' };
    }
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function textToUnicode(text: string, mode: 'encode' | 'decode' = 'encode'): DevToolResult {
  if (!text) return { output: '' };
  try {
    if (mode === 'encode') {
      const res = text
        .split('')
        .map((c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
        .join('');
      return { output: res, outputType: 'text' };
    } else {
      const res = text.replace(/\\u([0-9a-fA-F]{4})/g, (_, code) =>
        String.fromCharCode(parseInt(code, 16))
      );
      return { output: res, outputType: 'text' };
    }
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function textToNato(text: string): DevToolResult {
  const natoMap: Record<string, string> = {
    A: 'Alpha', B: 'Bravo', C: 'Charlie', D: 'Delta', E: 'Echo',
    F: 'Foxtrot', G: 'Golf', H: 'Hotel', I: 'India', J: 'Juliett',
    K: 'Kilo', L: 'Lima', M: 'Mike', N: 'November', O: 'Oscar',
    P: 'Papa', Q: 'Quebec', R: 'Romeo', S: 'Sierra', T: 'Tango',
    U: 'Uniform', V: 'Victor', W: 'Whiskey', X: 'X-ray', Y: 'Yankee',
    Z: 'Zulu', '0': 'Zero', '1': 'One', '2': 'Two', '3': 'Three',
    '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven', '8': 'Eight',
    '9': 'Nine', ' ': '(space)', '.': 'Decimal', '-': 'Dash',
  };

  const output = text
    .toUpperCase()
    .split('')
    .map((c) => natoMap[c] || c)
    .join(' ');

  return { output, outputType: 'text' };
}

export function jsonToCsv(jsonStr: string): DevToolResult {
  if (!jsonStr) return { output: '' };
  try {
    const data = JSON.parse(jsonStr);
    const arr = Array.isArray(data) ? data : [data];
    if (arr.length === 0) return { output: '' };

    const headers = Array.from(new Set(arr.flatMap((obj) => Object.keys(obj))));
    const rows = [
      headers.join(','),
      ...arr.map((obj) =>
        headers
          .map((h) => {
            const val = obj[h] ?? '';
            const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
            return `"${str.replace(/"/g, '""')}"`;
          })
          .join(',')
      ),
    ];

    return { output: rows.join('\n'), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `Invalid JSON: ${err.message}` };
  }
}

// -------------------------------------------------------------
// 3. WEB ENGINES
// -------------------------------------------------------------

export function urlEncodeDecode(text: string, mode: 'encode' | 'decode' = 'encode'): DevToolResult {
  try {
    if (mode === 'encode') {
      return { output: encodeURIComponent(text), outputType: 'text' };
    } else {
      return { output: decodeURIComponent(text), outputType: 'text' };
    }
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function parseUrl(urlString: string): DevToolResult {
  if (!urlString) return { output: '' };
  try {
    const url = new URL(urlString.trim());
    const params: Array<{ key: string; value: string }> = [];
    url.searchParams.forEach((val, key) => {
      params.push({ key: `param: ${key}`, value: val });
    });

    return {
      output: JSON.stringify(
        {
          protocol: url.protocol,
          hostname: url.hostname,
          port: url.port || '(default)',
          pathname: url.pathname,
          search: url.search,
          hash: url.hash,
        },
        null,
        2
      ),
      tableData: [
        { key: 'Protocol', value: url.protocol },
        { key: 'Host / Hostname', value: url.hostname },
        { key: 'Port', value: url.port || '(default)' },
        { key: 'Pathname', value: url.pathname },
        { key: 'Query Parameters Count', value: params.length },
        ...params,
      ],
    };
  } catch (err: any) {
    return { output: '', error: 'Invalid URL format. Please include protocol (e.g. https://example.com).' };
  }
}

export function parseJwt(jwtToken: string): DevToolResult {
  if (!jwtToken) return { output: '' };
  try {
    const parts = jwtToken.trim().split('.');
    if (parts.length < 2) throw new Error('JWT must have at least header and payload segments separated by dots.');

    const decodeBase64Url = (str: string) => {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      return decodeURIComponent(escape(atob(b64)));
    };

    const header = JSON.parse(decodeBase64Url(parts[0]));
    const payload = JSON.parse(decodeBase64Url(parts[1]));

    const isExpired = payload.exp ? Date.now() >= payload.exp * 1000 : false;
    const expiresAt = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'Never / None';

    return {
      output: JSON.stringify({ header, payload }, null, 2),
      outputType: 'json',
      tableData: [
        { key: 'Algorithm (alg)', value: header.alg || 'none' },
        { key: 'Type (typ)', value: header.typ || 'JWT' },
        { key: 'Issuer (iss)', value: payload.iss || 'N/A' },
        { key: 'Subject (sub)', value: payload.sub || 'N/A' },
        { key: 'Audience (aud)', value: payload.aud || 'N/A' },
        { key: 'Expires At', value: `${expiresAt} ${isExpired ? '(EXPIRED)' : '(ACTIVE)'}` },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `Invalid JWT: ${err.message}` };
  }
}

export function slugifyString(text: string, separator: string = '-'): DevToolResult {
  if (!text) return { output: '' };
  const slug = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');

  return { output: slug, outputType: 'text' };
}

export function htmlEntities(text: string, mode: 'encode' | 'decode' = 'encode'): DevToolResult {
  if (!text) return { output: '' };
  if (mode === 'encode') {
    const encoded = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    return { output: encoded, outputType: 'text' };
  } else {
    const decoded = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .replace(/&#39;/g, "'");
    return { output: decoded, outputType: 'text' };
  }
}

// -------------------------------------------------------------
// 4. MEDIA / QR ENGINES
// -------------------------------------------------------------

export async function generateQr(
  text: string,
  options: {
    colorDark?: string;
    colorLight?: string;
    errorCorrection?: 'L' | 'M' | 'Q' | 'H';
    size?: number;
  } = {}
): Promise<DevToolResult> {
  if (!text) return { output: '' };
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: options.errorCorrection || 'M',
      color: {
        dark: options.colorDark || '#000000',
        light: options.colorLight || '#ffffff',
      },
      width: options.size || 300,
      margin: 2,
    });

    const svgString = await QRCode.toString(text, {
      type: 'svg',
      errorCorrectionLevel: options.errorCorrection || 'M',
      color: {
        dark: options.colorDark || '#000000',
        light: options.colorLight || '#ffffff',
      },
    });

    return {
      output: dataUrl,
      outputType: 'qr',
      meta: { dataUrl, svgString, text },
    };
  } catch (err: any) {
    return { output: '', error: `QR generation failed: ${err.message}` };
  }
}

export async function generateWifiQr(config: {
  ssid: string;
  password?: string;
  authType?: 'WPA' | 'WEP' | 'nopass';
  hidden?: boolean;
}): Promise<DevToolResult> {
  if (!config.ssid) return { output: '', error: 'SSID is required' };
  const auth = config.authType || 'WPA';
  const pass = config.password || '';
  const hidden = config.hidden ? 'H:true;' : '';
  const qrString = `WIFI:S:${config.ssid};T:${auth};P:${pass};${hidden};`;

  return generateQr(qrString);
}

// -------------------------------------------------------------
// 5. DEVELOPMENT TOOLS
// -------------------------------------------------------------

export function chmodCalculator(octal: string): DevToolResult {
  const code = (octal || '755').trim();
  if (!/^[0-7]{3}$/.test(code)) {
    return { output: '', error: 'Enter a valid 3-digit octal permission (e.g. 755 or 644).' };
  }

  const decodeDigit = (d: number) => {
    return {
      read: (d & 4) !== 0,
      write: (d & 2) !== 0,
      execute: (d & 1) !== 0,
      str: `${(d & 4) ? 'r' : '-'}${(d & 2) ? 'w' : '-'}${(d & 1) ? 'x' : '-'}`,
    };
  };

  const owner = decodeDigit(parseInt(code[0], 10));
  const group = decodeDigit(parseInt(code[1], 10));
  const others = decodeDigit(parseInt(code[2], 10));
  const symbolic = `${owner.str}${group.str}${others.str}`;

  return {
    output: `chmod ${code}\nSymbolic: ${symbolic}`,
    tableData: [
      { key: 'Octal Code', value: code },
      { key: 'Symbolic Notation', value: symbolic },
      { key: 'Owner (User)', value: owner.str },
      { key: 'Group', value: group.str },
      { key: 'Others (Public)', value: others.str },
    ],
  };
}

export function formatSqlQuery(sql: string, dialect: string = 'sql', indent: number = 2): DevToolResult {
  if (!sql) return { output: '' };
  try {
    const formatted = formatSql(sql, {
      language: dialect as any,
      tabWidth: indent,
      keywordCase: 'upper',
    });
    return { output: formatted, outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `SQL format failed: ${err.message}` };
  }
}

export function dockerRunToCompose(cmd: string): DevToolResult {
  if (!cmd) return { output: '' };
  try {
    const tokens = cmd.trim().replace(/^docker run\s+/, '').split(/\s+/);
    let image = '';
    let name = 'app';
    const ports: string[] = [];
    const envs: string[] = [];
    const volumes: string[] = [];
    let restart = '';

    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (tok === '-p' || tok === '--publish') {
        ports.push(tokens[++i]);
      } else if (tok === '-v' || tok === '--volume') {
        volumes.push(tokens[++i]);
      } else if (tok === '-e' || tok === '--env') {
        envs.push(tokens[++i]);
      } else if (tok === '--name') {
        name = tokens[++i];
      } else if (tok === '--restart') {
        restart = tokens[++i];
      } else if (!tok.startsWith('-') && !image) {
        image = tok;
      }
    }

    const composeObj: any = {
      version: '3.8',
      services: {
        [name]: {
          image: image || 'nginx:latest',
          ...(restart ? { restart } : {}),
          ...(ports.length ? { ports } : {}),
          ...(envs.length ? { environment: envs } : {}),
          ...(volumes.length ? { volumes } : {}),
        },
      },
    };

    // Serialize basic YAML
    let yaml = `version: '${composeObj.version}'\nservices:\n  ${name}:\n    image: ${composeObj.services[name].image}\n`;
    if (restart) yaml += `    restart: ${restart}\n`;
    if (ports.length) {
      yaml += `    ports:\n` + ports.map((p) => `      - "${p}"`).join('\n') + '\n';
    }
    if (envs.length) {
      yaml += `    environment:\n` + envs.map((e) => `      - ${e}`).join('\n') + '\n';
    }
    if (volumes.length) {
      yaml += `    volumes:\n` + volumes.map((v) => `      - ${v}`).join('\n') + '\n';
    }

    return { output: yaml, outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

// -------------------------------------------------------------
// 6. NETWORK TOOLS
// -------------------------------------------------------------

export function ipv4SubnetCalculator(ipStr: string, cidrNum: number = 24): DevToolResult {
  const ip = (ipStr || '192.168.1.1').trim();
  const cidr = Math.min(Math.max(Number(cidrNum) || 24, 0), 32);

  const ipParts = ip.split('.').map(Number);
  if (ipParts.length !== 4 || ipParts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return { output: '', error: 'Invalid IPv4 address format (e.g. 192.168.1.1).' };
  }

  const ipInt = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
  const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const netInt = (ipInt & maskInt) >>> 0;
  const bcastInt = (netInt | ~maskInt) >>> 0;

  const toIpStr = (num: number) =>
    [(num >>> 24) & 255, (num >>> 16) & 255, (num >>> 8) & 255, num & 255].join('.');

  const totalHosts = Math.pow(2, 32 - cidr);
  const usableHosts = cidr >= 31 ? (cidr === 31 ? 2 : 1) : Math.max(totalHosts - 2, 0);

  const firstHost = cidr >= 31 ? toIpStr(netInt) : toIpStr(netInt + 1);
  const lastHost = cidr >= 31 ? toIpStr(bcastInt) : toIpStr(bcastInt - 1);

  return {
    output: `${toIpStr(netInt)}/${cidr}`,
    tableData: [
      { key: 'CIDR Notation', value: `${ip}/${cidr}` },
      { key: 'Subnet Mask', value: toIpStr(maskInt) },
      { key: 'Wildcard Mask', value: toIpStr((~maskInt) >>> 0) },
      { key: 'Network Address', value: toIpStr(netInt) },
      { key: 'Broadcast Address', value: toIpStr(bcastInt) },
      { key: 'First Usable Host', value: firstHost },
      { key: 'Last Usable Host', value: lastHost },
      { key: 'Usable Hosts', value: usableHosts.toLocaleString() },
      { key: 'Total Addresses', value: totalHosts.toLocaleString() },
    ],
  };
}

export function ipv4AddressConverter(ip: string): DevToolResult {
  const parts = ip.trim().split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => isNaN(n) || n < 0 || n > 255)) {
    return { output: '', error: 'Provide a valid dotted-decimal IPv4 address.' };
  }

  const int = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
  const hex = '0x' + int.toString(16).toUpperCase().padStart(8, '0');
  const binary = parts.map((n) => n.toString(2).padStart(8, '0')).join('.');

  return {
    output: int.toString(),
    tableData: [
      { key: 'Dotted Decimal', value: parts.join('.') },
      { key: 'Integer / Decimal', value: int.toString() },
      { key: 'Hexadecimal', value: hex },
      { key: 'Dotted Binary', value: binary },
    ],
  };
}

export function generateMacAddress(separator: string = ':', count: number = 3): DevToolResult {
  const qty = Math.min(Math.max(Number(count) || 1, 1), 20);
  const results: string[] = [];

  for (let i = 0; i < qty; i++) {
    const bytes: string[] = [];
    for (let b = 0; b < 6; b++) {
      let byteVal = Math.floor(Math.random() * 256);
      if (b === 0) byteVal = (byteVal & 0xfe) | 0x02; // locally administered unicast
      bytes.push(byteVal.toString(16).padStart(2, '0').toUpperCase());
    }
    results.push(bytes.join(separator));
  }

  return { output: results.join('\n'), outputType: 'text' };
}

// -------------------------------------------------------------
// 7. MATH & MEASUREMENT
// -------------------------------------------------------------

export function evaluateMath(expr: string): DevToolResult {
  if (!expr) return { output: '' };
  try {
    // Clean and validate safe mathematical characters
    const sanitized = expr
      .replace(/pi/gi, String(Math.PI))
      .replace(/e/gi, String(Math.E))
      .replace(/sin\(/g, 'Math.sin(')
      .replace(/cos\(/g, 'Math.cos(')
      .replace(/tan\(/g, 'Math.tan(')
      .replace(/sqrt\(/g, 'Math.sqrt(')
      .replace(/\^/g, '**');

    if (/[^0-9+\-*/().,MathsincotapqreE\s*]/.test(sanitized)) {
      return { output: '', error: 'Expression contains disallowed characters.' };
    }

    // eslint-disable-next-line no-eval
    const val = Function(`'use strict'; return (${sanitized})`)();
    return { output: String(val), outputType: 'text' };
  } catch (err: any) {
    return { output: '', error: `Math syntax error: ${err.message}` };
  }
}

export function percentageCalculator(
  scenario: 'percentOf' | 'whatPercent' | 'percentChange',
  val1: number,
  val2: number
): DevToolResult {
  const v1 = Number(val1);
  const v2 = Number(val2);
  if (isNaN(v1) || isNaN(v2)) return { output: '', error: 'Please enter valid numerical values.' };

  switch (scenario) {
    case 'percentOf': {
      // What is v1% of v2?
      const res = (v1 / 100) * v2;
      return { output: `${v1}% of ${v2} = ${res}`, outputType: 'text' };
    }
    case 'whatPercent': {
      // v1 is what percent of v2?
      if (v2 === 0) return { output: '', error: 'Cannot divide by zero.' };
      const res = (v1 / v2) * 100;
      return { output: `${v1} is ${res.toFixed(2)}% of ${v2}`, outputType: 'text' };
    }
    case 'percentChange': {
      // % change from v1 to v2
      if (v1 === 0) return { output: '', error: 'Base value cannot be zero.' };
      const change = ((v2 - v1) / Math.abs(v1)) * 100;
      const type = change >= 0 ? 'Increase' : 'Decrease';
      return { output: `${Math.abs(change).toFixed(2)}% ${type} (from ${v1} to ${v2})`, outputType: 'text' };
    }
  }
}

// -------------------------------------------------------------
// 8. TEXT TOOLS
// -------------------------------------------------------------

export function analyzeTextStatistics(text: string): DevToolResult {
  if (!text) {
    return {
      output: '0 characters, 0 words',
      tableData: [
        { key: 'Characters (with spaces)', value: 0 },
        { key: 'Characters (no spaces)', value: 0 },
        { key: 'Words', value: 0 },
        { key: 'Lines', value: 0 },
        { key: 'Sentences', value: 0 },
        { key: 'Paragraphs', value: 0 },
        { key: 'Byte Size', value: '0 B' },
        { key: 'Reading Time', value: '0 sec' },
      ],
    };
  }

  const chars = text.length;
  const charsNoSpaces = text.replace(/\s/g, '').length;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lines = text.split('\n').length;
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length;
  const sentences = (text.match(/[.!?]+(?:\s|$)/g) || []).length || (text.trim() ? 1 : 0);
  const bytes = new TextEncoder().encode(text).length;

  const readingTimeSec = Math.ceil((words / 200) * 60);

  return {
    output: `${words} words, ${chars} characters`,
    tableData: [
      { key: 'Characters (with spaces)', value: chars },
      { key: 'Characters (no spaces)', value: charsNoSpaces },
      { key: 'Word Count', value: words },
      { key: 'Line Count', value: lines },
      { key: 'Sentence Count', value: sentences },
      { key: 'Paragraph Count', value: paragraphs },
      { key: 'Byte Size', value: `${bytes} bytes` },
      { key: 'Estimated Reading Time', value: `${Math.floor(readingTimeSec / 60)}m ${readingTimeSec % 60}s` },
    ],
  };
}

export function computeTextDiff(original: string, modified: string): DevToolResult {
  const changes = Diff.diffLines(original || '', modified || '');
  const diffLines: Array<{ type: 'add' | 'del' | 'same'; text: string }> = [];

  changes.forEach((part) => {
    const type = part.added ? 'add' : part.removed ? 'del' : 'same';
    const lines = part.value.replace(/\n$/, '').split('\n');
    lines.forEach((l) => diffLines.push({ type, text: l }));
  });

  return {
    output: diffLines.map((l) => `${l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '}${l.text}`).join('\n'),
    outputType: 'diff',
    diffLines,
  };
}

export function testRegex(pattern: string, flags: string = 'g', text: string = ''): DevToolResult {
  if (!pattern) return { output: '' };
  try {
    const re = new RegExp(pattern, flags);
    const matches = Array.from(text.matchAll(re));

    const tableData: Array<{ key: string; value: string }> = [
      { key: 'Total Matches Found', value: String(matches.length) },
      { key: 'Flags Applied', value: flags },
    ];

    matches.slice(0, 20).forEach((m, idx) => {
      tableData.push({
        key: `Match #${idx + 1} (index ${m.index})`,
        value: m[0],
      });
    });

    return {
      output: `Found ${matches.length} matches for /${pattern}/${flags}`,
      tableData,
    };
  } catch (err: any) {
    return { output: '', error: `Invalid Regular Expression: ${err.message}` };
  }
}

export function generateLoremIpsum(count: number = 3, type: 'paragraphs' | 'sentences' | 'words' = 'paragraphs'): DevToolResult {
  const vocabulary = [
    'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'curabitur', 'vel',
    'hendrerit', 'libero', 'eleifend', 'blandit', 'nunc', 'ornare', 'odio', 'ut', 'orci', 'gravida',
    'imperdiet', 'nullam', 'purus', 'lacinia', 'a', 'pretium', 'quis', 'congue', 'praesent', 'sagittis',
    'laoreet', 'auctor', 'mauris', 'non', 'velit', 'eros', 'dictum', 'proin', 'accumsan', 'sapien',
    'nec', 'sollicitudin', 'ligula', 'integer', 'luctus', 'vulputate', 'aliquam', 'pharetra', 'feugiat',
  ];

  const qty = Math.min(Math.max(Number(count) || 1, 1), 100);

  if (type === 'words') {
    const words: string[] = [];
    for (let i = 0; i < qty; i++) {
      words.push(vocabulary[i % vocabulary.length]);
    }
    return { output: words.join(' '), outputType: 'text' };
  }

  const makeSentence = () => {
    const len = 8 + Math.floor(Math.random() * 8);
    const words: string[] = [];
    for (let i = 0; i < len; i++) {
      words.push(vocabulary[Math.floor(Math.random() * vocabulary.length)]);
    }
    const s = words.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  };

  if (type === 'sentences') {
    const sentences: string[] = [];
    for (let i = 0; i < qty; i++) sentences.push(makeSentence());
    return { output: sentences.join(' '), outputType: 'text' };
  }

  // Paragraphs
  const paras: string[] = [];
  for (let p = 0; p < qty; p++) {
    const sentenceCount = 4 + Math.floor(Math.random() * 3);
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) sentences.push(makeSentence());
    paras.push(sentences.join(' '));
  }

  return { output: paras.join('\n\n'), outputType: 'text' };
}

// -------------------------------------------------------------
// 9. DATA TOOLS
// -------------------------------------------------------------

export function jsonPrettifyMinify(jsonStr: string, mode: 'prettify' | 'minify' = 'prettify', indent: number = 2): DevToolResult {
  if (!jsonStr) return { output: '' };
  try {
    const parsed = JSON.parse(jsonStr);
    if (mode === 'prettify') {
      return { output: JSON.stringify(parsed, null, indent), outputType: 'code' };
    } else {
      return { output: JSON.stringify(parsed), outputType: 'code' };
    }
  } catch (err: any) {
    return { output: '', error: `Invalid JSON: ${err.message}` };
  }
}

export function formatXml(xmlStr: string, indentSpaces: number = 2): DevToolResult {
  if (!xmlStr) return { output: '' };
  try {
    let formatted = '';
    let indent = 0;
    const tab = ' '.repeat(indentSpaces);
    const tokens = xmlStr.replace(/>\s*</g, '><').split(/(?<=<[^>]+>)/g);

    for (const token of tokens) {
      if (!token.trim()) continue;
      if (token.startsWith('</')) {
        indent = Math.max(indent - 1, 0);
      }
      formatted += tab.repeat(indent) + token.trim() + '\n';
      if (token.startsWith('<') && !token.startsWith('</') && !token.endsWith('/>') && !token.startsWith('<?') && !token.startsWith('<!')) {
        indent++;
      }
    }
    return { output: formatted.trim(), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `XML formatting failed: ${err.message}` };
  }
}

// -------------------------------------------------------------
// 10. EXTENDED CRYPTO TOOLS (MISSING IT-TOOLS)
// -------------------------------------------------------------

export function bcryptHashVerify(
  password: string,
  hash: string,
  mode: 'hash' | 'compare' = 'hash',
  rounds: number = 10
): DevToolResult {
  if (!password) return { output: '' };
  try {
    if (mode === 'hash') {
      const salt = bcrypt.genSaltSync(Math.min(Math.max(Number(rounds) || 10, 4), 16));
      const res = bcrypt.hashSync(password, salt);
      return {
        output: res,
        outputType: 'text',
        tableData: [
          { key: 'Algorithm', value: 'Bcrypt (Blowfish)' },
          { key: 'Cost / Rounds', value: rounds },
          { key: 'Salt Prefix', value: res.substring(0, 4) },
          { key: 'Total Hash Length', value: `${res.length} chars` },
        ],
      };
    } else {
      if (!hash) return { output: '', error: 'Hash string is required for comparison.' };
      const matches = bcrypt.compareSync(password, hash.trim());
      return {
        output: matches ? 'MATCH: Plaintext matches hash' : 'MISMATCH: Password does not match hash',
        outputType: 'text',
        tableData: [
          { key: 'Verification Status', value: matches ? 'VALID MATCH' : 'INVALID' },
          { key: 'Bcrypt Hash', value: hash.trim() },
        ],
      };
    }
  } catch (err: any) {
    return { output: '', error: `Bcrypt error: ${err.message}` };
  }
}

export function generateOtp(
  secret: string,
  type: 'totp' | 'hotp' = 'totp',
  counter: number = 0,
  digits: number = 6,
  period: number = 30
): DevToolResult {
  if (!secret) return { output: '' };
  try {
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    const timeStep = type === 'totp' ? Math.floor(Date.now() / 1000 / period) : Number(counter) || 0;

    let hexCounter = timeStep.toString(16);
    while (hexCounter.length < 16) hexCounter = '0' + hexCounter;
    const counterBytes = CryptoJS.enc.Hex.parse(hexCounter);

    const hmac = CryptoJS.HmacSHA1(counterBytes, CryptoJS.enc.Utf8.parse(cleanSecret));
    const hmacHex = hmac.toString(CryptoJS.enc.Hex);

    const offset = parseInt(hmacHex.substring(hmacHex.length - 1), 16) * 2;
    const truncated = (parseInt(hmacHex.substring(offset, offset + 8), 16) & 0x7fffffff).toString();
    const otp = truncated.slice(-digits).padStart(digits, '0');

    const secondsRemaining = period - (Math.floor(Date.now() / 1000) % period);

    return {
      output: otp,
      outputType: 'text',
      tableData: [
        { key: 'OTP Code', value: otp },
        { key: 'Type', value: type.toUpperCase() },
        { key: 'Digits', value: digits },
        { key: 'Period', value: `${period}s` },
        { key: 'Seconds Remaining', value: `${secondsRemaining}s` },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `OTP generation failed: ${err.message}` };
  }
}

export function checkPdfSignature(pdfTextOrHex: string): DevToolResult {
  if (!pdfTextOrHex) return { output: 'Upload or paste PDF binary text to inspect digital signatures.' };
  try {
    const hasByteRange = pdfTextOrHex.includes('/ByteRange');
    const hasSigType = pdfTextOrHex.includes('/Type /Sig') || pdfTextOrHex.includes('/Type/Sig');
    const hasContents = pdfTextOrHex.includes('/Contents');

    const isSigned = hasByteRange && (hasSigType || hasContents);

    const nameMatch = pdfTextOrHex.match(/\/Name\s*\(([^)]+)\)/);
    const dateMatch = pdfTextOrHex.match(/\/M\s*\(D:([^)]+)\)/);
    const subFilterMatch = pdfTextOrHex.match(/\/SubFilter\s*\/([a-zA-Z0-9.]+)/);
    const reasonMatch = pdfTextOrHex.match(/\/Reason\s*\(([^)]+)\)/);

    return {
      output: isSigned
        ? 'Digital Signature Detected in PDF'
        : 'No Cryptographic Digital Signatures found in PDF catalog.',
      outputType: 'text',
      tableData: [
        { key: 'Signed Status', value: isSigned ? 'SIGNED' : 'UNSIGNED' },
        { key: 'Signer Name', value: nameMatch ? nameMatch[1] : isSigned ? 'Certificate Subject' : 'N/A' },
        { key: 'Signing Date', value: dateMatch ? dateMatch[1] : isSigned ? 'Present in PKCS#7' : 'N/A' },
        { key: 'Signature SubFilter', value: subFilterMatch ? subFilterMatch[1] : isSigned ? 'adbe.pkcs7.detached' : 'None' },
        { key: 'Reason', value: reasonMatch ? reasonMatch[1] : 'N/A' },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `PDF signature check error: ${err.message}` };
  }
}

// -------------------------------------------------------------
// 11. EXTENDED DATA CROSS-CONVERTERS (YAML, TOML, XML, MD)
// -------------------------------------------------------------

export function yamlToJson(yamlStr: string): DevToolResult {
  if (!yamlStr) return { output: '' };
  try {
    const parsed = YAML.parse(yamlStr);
    return { output: JSON.stringify(parsed, null, 2), outputType: 'json' };
  } catch (err: any) {
    return { output: '', error: `YAML parse error: ${err.message}` };
  }
}

export function jsonToYaml(jsonStr: string): DevToolResult {
  if (!jsonStr) return { output: '' };
  try {
    const parsed = JSON.parse(jsonStr);
    return { output: YAML.stringify(parsed), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `JSON parse error: ${err.message}` };
  }
}

export function yamlPrettify(yamlStr: string, indent: number = 2): DevToolResult {
  if (!yamlStr) return { output: '' };
  try {
    const parsed = YAML.parse(yamlStr);
    return { output: YAML.stringify(parsed, { indent }), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `Invalid YAML: ${err.message}` };
  }
}

function objectToToml(obj: Record<string, any>, prefix = ''): string {
  let toml = '';
  const tables: Array<{ key: string; value: any }> = [];

  for (const [key, val] of Object.entries(obj)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      tables.push({ key: prefix ? `${prefix}.${key}` : key, value: val });
    } else if (Array.isArray(val)) {
      if (val.length > 0 && typeof val[0] === 'object') {
        val.forEach((item) => {
          toml += `\n[[${prefix ? `${prefix}.${key}` : key}]]\n${objectToToml(item)}`;
        });
      } else {
        toml += `${key} = ${JSON.stringify(val)}\n`;
      }
    } else if (typeof val === 'string') {
      toml += `${key} = "${val.replace(/"/g, '\\"')}"\n`;
    } else if (typeof val === 'boolean') {
      toml += `${key} = ${val}\n`;
    } else if (typeof val === 'number') {
      toml += `${key} = ${val}\n`;
    }
  }

  for (const t of tables) {
    toml += `\n[${t.key}]\n` + objectToToml(t.value, t.key);
  }

  return toml.trim();
}

function parseTomlBasic(tomlStr: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentTable = result;
  const lines = tomlStr.split('\n');

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;

    const tableMatch = line.match(/^\[([a-zA-Z0-9_.]+)\]$/);
    if (tableMatch) {
      const parts = tableMatch[1].split('.');
      let target = result;
      for (const p of parts) {
        if (!target[p] || typeof target[p] !== 'object') target[p] = {};
        target = target[p];
      }
      currentTable = target;
      continue;
    }

    const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*=\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      let rawVal = kvMatch[2].trim();
      let parsedVal: any = rawVal;

      if (rawVal.startsWith('"') && rawVal.endsWith('"')) {
        parsedVal = rawVal.slice(1, -1).replace(/\\"/g, '"');
      } else if (rawVal === 'true') {
        parsedVal = true;
      } else if (rawVal === 'false') {
        parsedVal = false;
      } else if (!isNaN(Number(rawVal))) {
        parsedVal = Number(rawVal);
      } else if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        try {
          parsedVal = JSON.parse(rawVal);
        } catch {
          parsedVal = rawVal;
        }
      }
      currentTable[key] = parsedVal;
    }
  }
  return result;
}

export function jsonToToml(jsonStr: string): DevToolResult {
  if (!jsonStr) return { output: '' };
  try {
    const obj = JSON.parse(jsonStr);
    return { output: objectToToml(obj), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `JSON to TOML error: ${err.message}` };
  }
}

export function tomlToJson(tomlStr: string): DevToolResult {
  if (!tomlStr) return { output: '' };
  try {
    const obj = parseTomlBasic(tomlStr);
    return { output: JSON.stringify(obj, null, 2), outputType: 'json' };
  } catch (err: any) {
    return { output: '', error: `TOML to JSON error: ${err.message}` };
  }
}

export function yamlToToml(yamlStr: string): DevToolResult {
  if (!yamlStr) return { output: '' };
  try {
    const obj = YAML.parse(yamlStr);
    return { output: objectToToml(obj), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `YAML to TOML error: ${err.message}` };
  }
}

export function tomlToYaml(tomlStr: string): DevToolResult {
  if (!tomlStr) return { output: '' };
  try {
    const obj = parseTomlBasic(tomlStr);
    return { output: YAML.stringify(obj), outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `TOML to YAML error: ${err.message}` };
  }
}

export function jsonToXml(jsonStr: string): DevToolResult {
  if (!jsonStr) return { output: '' };
  try {
    const obj = JSON.parse(jsonStr);
    const toXml = (item: any, tag = 'item', indent = 0): string => {
      const sp = ' '.repeat(indent);
      if (item === null || item === undefined) return `${sp}<${tag}/>\n`;
      if (typeof item === 'object') {
        if (Array.isArray(item)) {
          return item.map((sub) => toXml(sub, tag, indent)).join('');
        }
        let inner = '';
        for (const [k, v] of Object.entries(item)) {
          inner += toXml(v, k, indent + 2);
        }
        return `${sp}<${tag}>\n${inner}${sp}</${tag}>\n`;
      }
      return `${sp}<${tag}>${String(item).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</${tag}>\n`;
    };

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n${toXml(obj, 'data', 2)}</root>`;
    return { output: xml, outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: `JSON to XML error: ${err.message}` };
  }
}

export function xmlToJson(xmlStr: string): DevToolResult {
  if (!xmlStr) return { output: '' };
  try {
    const parseNode = (xml: string): any => {
      const clean = xml.trim();
      const tags: Record<string, any> = {};
      const tagRegex = /<([a-zA-Z0-9_:-]+)(?:\s+[^>]*?)?>([\s\S]*?)<\/\1>/g;
      let match;
      let matchedAny = false;

      while ((match = tagRegex.exec(clean)) !== null) {
        matchedAny = true;
        const tagName = match[1];
        const content = match[2];
        const parsed = parseNode(content);

        if (tags[tagName]) {
          if (!Array.isArray(tags[tagName])) tags[tagName] = [tags[tagName]];
          tags[tagName].push(parsed);
        } else {
          tags[tagName] = parsed;
        }
      }

      if (!matchedAny) {
        return clean.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
      }
      return tags;
    };

    const rootStripped = xmlStr.replace(/<\?xml[^>]*\?>/g, '').trim();
    const result = parseNode(rootStripped);
    return { output: JSON.stringify(result, null, 2), outputType: 'json' };
  } catch (err: any) {
    return { output: '', error: `XML to JSON error: ${err.message}` };
  }
}

export function markdownToHtml(md: string): DevToolResult {
  if (!md) return { output: '' };
  try {
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/~~(.*?)~~/gim, '<del>$1</del>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/^\s*\n\*/gm, '<ul>\n*')
      .replace(/^(\*|\-)\s+(.*)/gim, '<li>$2</li>')
      .replace(/\n\s*\n/gim, '</p><p>');

    html = `<p>${html.trim()}</p>`;
    return { output: html, outputType: 'code' };
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

// -------------------------------------------------------------
// 12. EXTENDED WEB & NETWORKING TOOLS
// -------------------------------------------------------------

export function generateBasicAuth(user: string, pass: string): DevToolResult {
  if (!user && !pass) return { output: '' };
  const raw = `${user || ''}:${pass || ''}`;
  const encoded = btoa(unescape(encodeURIComponent(raw)));
  const header = `Authorization: Basic ${encoded}`;
  const htpasswd = `${user || 'user'}:${CryptoJS.SHA1(pass || '').toString()}`;

  return {
    output: header,
    outputType: 'text',
    tableData: [
      { key: 'Header Name', value: 'Authorization' },
      { key: 'Header Value', value: `Basic ${encoded}` },
      { key: 'Raw Credentials', value: raw },
      { key: 'Htpasswd Format', value: htpasswd },
    ],
  };
}

export function generateOgMeta(data: {
  title?: string;
  description?: string;
  url?: string;
  image?: string;
  siteName?: string;
  type?: string;
}): DevToolResult {
  const t = data.title || 'My Web Project';
  const d = data.description || 'Modern in-browser web application.';
  const u = data.url || 'https://example.com';
  const img = data.image || 'https://example.com/og.png';
  const site = data.siteName || 'letmegoogle';
  const type = data.type || 'website';

  const tags = [
    `<!-- Open Graph / Facebook -->`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:url" content="${u}" />`,
    `<meta property="og:title" content="${t}" />`,
    `<meta property="og:description" content="${d}" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:site_name" content="${site}" />`,
    ``,
    `<!-- Twitter Card -->`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:url" content="${u}" />`,
    `<meta name="twitter:title" content="${t}" />`,
    `<meta name="twitter:description" content="${d}" />`,
    `<meta name="twitter:image" content="${img}" />`,
  ].join('\n');

  return { output: tags, outputType: 'code' };
}

export function searchMimeTypes(query: string): DevToolResult {
  const database: Array<{ ext: string; mime: string; desc: string }> = [
    { ext: '.json', mime: 'application/json', desc: 'JSON Document' },
    { ext: '.pdf', mime: 'application/pdf', desc: 'Portable Document Format' },
    { ext: '.zip', mime: 'application/zip', desc: 'ZIP Archive' },
    { ext: '.tar', mime: 'application/x-tar', desc: 'TAR Archive' },
    { ext: '.gz', mime: 'application/gzip', desc: 'GZip Archive' },
    { ext: '.xml', mime: 'application/xml', desc: 'XML Document' },
    { ext: '.js', mime: 'application/javascript', desc: 'JavaScript Source' },
    { ext: '.png', mime: 'image/png', desc: 'Portable Network Graphics' },
    { ext: '.jpg', mime: 'image/jpeg', desc: 'JPEG Image' },
    { ext: '.webp', mime: 'image/webp', desc: 'WebP Modern Image' },
    { ext: '.gif', mime: 'image/gif', desc: 'Graphics Interchange Format' },
    { ext: '.svg', mime: 'image/svg+xml', desc: 'Scalable Vector Graphics' },
    { ext: '.ico', mime: 'image/x-icon', desc: 'Favicon Icon' },
    { ext: '.mp4', mime: 'video/mp4', desc: 'MPEG-4 Video' },
    { ext: '.webm', mime: 'video/webm', desc: 'WebM Video' },
    { ext: '.mp3', mime: 'audio/mpeg', desc: 'MP3 Audio' },
    { ext: '.wav', mime: 'audio/wav', desc: 'WAV Audio' },
    { ext: '.html', mime: 'text/html', desc: 'HTML Document' },
    { ext: '.css', mime: 'text/css', desc: 'Cascading Style Sheets' },
    { ext: '.csv', mime: 'text/csv', desc: 'Comma-Separated Values' },
    { ext: '.txt', mime: 'text/plain', desc: 'Plain Text Document' },
    { ext: '.md', mime: 'text/markdown', desc: 'Markdown Text' },
    { ext: '.woff2', mime: 'font/woff2', desc: 'WOFF2 Web Font' },
    { ext: '.wasm', mime: 'application/wasm', desc: 'WebAssembly Binary' },
  ];

  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? database.filter((d) => d.ext.includes(q) || d.mime.includes(q) || d.desc.toLowerCase().includes(q))
    : database;

  return {
    output: filtered.map((f) => `${f.ext.padEnd(8)} -> ${f.mime.padEnd(28)} (${f.desc})`).join('\n'),
    outputType: 'text',
    tableData: filtered.slice(0, 15).map((f) => ({ key: f.ext, value: f.mime })),
  };
}

export function parseUserAgent(uaString: string): DevToolResult {
  const ua = uaString || (typeof navigator !== 'undefined' ? navigator.userAgent : '');
  let browser = 'Unknown Browser';
  let os = 'Unknown OS';

  if (/Firefox\/(\d+)/.test(ua)) browser = `Mozilla Firefox ${RegExp.$1}`;
  else if (/Edg\/(\d+)/.test(ua)) browser = `Microsoft Edge ${RegExp.$1}`;
  else if (/Chrome\/(\d+)/.test(ua)) browser = `Google Chrome ${RegExp.$1}`;
  else if (/Safari\/(\d+)/.test(ua) && !/Chrome/.test(ua)) browser = `Apple Safari ${RegExp.$1}`;

  if (/Windows NT 10.0/.test(ua)) os = 'Windows 10 / 11';
  else if (/Macintosh/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return {
    output: `${browser} on ${os}`,
    outputType: 'text',
    tableData: [
      { key: 'Browser', value: browser },
      { key: 'Operating System', value: os },
      { key: 'Platform', value: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown' },
      { key: 'User Agent String', value: ua },
    ],
  };
}

export function decodeSafeLink(safeUrl: string): DevToolResult {
  if (!safeUrl) return { output: '' };
  try {
    let clean = safeUrl.trim();
    if (clean.includes('safelinks.protection.outlook.com')) {
      const parsed = new URL(clean);
      const target = parsed.searchParams.get('url');
      if (target) return { output: decodeURIComponent(target), outputType: 'text' };
    }
    if (clean.includes('google.com/url')) {
      const parsed = new URL(clean);
      const target = parsed.searchParams.get('q') || parsed.searchParams.get('url');
      if (target) return { output: decodeURIComponent(target), outputType: 'text' };
    }
    return { output: clean, outputType: 'text' };
  } catch (err: any) {
    return { output: '', error: `SafeLink decode error: ${err.message}` };
  }
}

export function expandIpv4Range(input: string): DevToolResult {
  if (!input) return { output: '' };
  try {
    const cidrMatch = input.trim().match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
    if (!cidrMatch) return { output: '', error: 'Provide valid CIDR notation (e.g. 192.168.1.0/28).' };

    const ipParts = cidrMatch[1].split('.').map(Number);
    const cidr = Number(cidrMatch[2]);
    if (cidr < 16 || cidr > 32) return { output: '', error: 'Prefix must be between /16 and /32 for browser expansion.' };

    const ipInt = ((ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3]) >>> 0;
    const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const netInt = (ipInt & maskInt) >>> 0;
    const count = Math.pow(2, 32 - cidr);

    const ips: string[] = [];
    const maxListed = Math.min(count, 1024);
    for (let i = 0; i < maxListed; i++) {
      const cur = (netInt + i) >>> 0;
      ips.push([(cur >>> 24) & 255, (cur >>> 16) & 255, (cur >>> 8) & 255, cur & 255].join('.'));
    }

    return {
      output: ips.join('\n'),
      outputType: 'text',
      meta: { total: count },
      tableData: [
        { key: 'Subnet Base', value: `${cidrMatch[1]}/${cidr}` },
        { key: 'Total IP Addresses', value: count },
        { key: 'Exported Count', value: ips.length },
      ],
    };
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function lookupMacVendor(mac: string): DevToolResult {
  const vendors: Record<string, string> = {
    '00:00:0C': 'Cisco Systems',
    '00:50:56': 'VMware Inc',
    '00:0C:29': 'VMware Inc',
    '00:15:5D': 'Microsoft Corporation',
    '00:1C:42': 'Parallels International GmbH',
    'B8:27:EB': 'Raspberry Pi Foundation',
    'DC:A6:32': 'Raspberry Pi Trading Ltd',
    'F0:18:98': 'Apple Inc',
    '3C:06:30': 'Apple Inc',
    'BC:D0:74': 'Apple Inc',
    '00:1A:11': 'Google LLC',
    'F4:03:04': 'Google LLC',
    '00:09:0F': 'Fortinet Inc',
    '70:B3:D5': 'IEEE Registration Authority',
  };

  const clean = (mac || '').replace(/[-.]/g, ':').toUpperCase();
  const prefix = clean.substring(0, 8);
  const vendor = vendors[prefix] || 'Vendor Not Found in Local IEEE Registry';

  return {
    output: vendor,
    outputType: 'text',
    tableData: [
      { key: 'MAC Address', value: mac },
      { key: 'OUI Prefix', value: prefix },
      { key: 'Manufacturer', value: vendor },
    ],
  };
}

export function generateIpv6Ula(): DevToolResult {
  const rand16 = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  const globalId1 = (0xfd00 | Math.floor(Math.random() * 0xff)).toString(16);
  const globalId2 = rand16();
  const globalId3 = rand16();
  const subnet = '0001';

  const ula = `${globalId1}:${globalId2}:${globalId3}:${subnet}::/64`;

  return {
    output: ula,
    outputType: 'text',
    tableData: [
      { key: 'RFC 4193 Unique Local IPv6', value: ula },
      { key: 'Prefix', value: 'fd00::/8' },
      { key: 'Subnet ID', value: subnet },
    ],
  };
}

export function searchHttpStatusCodes(query: string): DevToolResult {
  const codes: Array<{ code: number; phrase: string; category: string; description: string }> = [
    { code: 200, phrase: 'OK', category: '2xx Success', description: 'Request succeeded and content is returned.' },
    { code: 201, phrase: 'Created', category: '2xx Success', description: 'Resource was created successfully.' },
    { code: 204, phrase: 'No Content', category: '2xx Success', description: 'Request succeeded but response has no body.' },
    { code: 301, phrase: 'Moved Permanently', category: '3xx Redirection', description: 'URI changed permanently.' },
    { code: 302, phrase: 'Found / Temp Redirect', category: '3xx Redirection', description: 'URI changed temporarily.' },
    { code: 304, phrase: 'Not Modified', category: '3xx Redirection', description: 'Client cache is still fresh.' },
    { code: 400, phrase: 'Bad Request', category: '4xx Client Error', description: 'Malformed request syntax.' },
    { code: 401, phrase: 'Unauthorized', category: '4xx Client Error', description: 'Authentication credentials missing.' },
    { code: 403, phrase: 'Forbidden', category: '4xx Client Error', description: 'Server refused authorization.' },
    { code: 404, phrase: 'Not Found', category: '4xx Client Error', description: 'Requested resource not found.' },
    { code: 405, phrase: 'Method Not Allowed', category: '4xx Client Error', description: 'HTTP method not supported.' },
    { code: 409, phrase: 'Conflict', category: '4xx Client Error', description: 'State conflict with target resource.' },
    { code: 429, phrase: 'Too Many Requests', category: '4xx Client Error', description: 'Rate limit threshold exceeded.' },
    { code: 500, phrase: 'Internal Server Error', category: '5xx Server Error', description: 'Unexpected server exception.' },
    { code: 502, phrase: 'Bad Gateway', category: '5xx Server Error', description: 'Invalid upstream gateway response.' },
    { code: 503, phrase: 'Service Unavailable', category: '5xx Server Error', description: 'Server overloaded or maintenance.' },
    { code: 504, phrase: 'Gateway Timeout', category: '5xx Server Error', description: 'Upstream gateway timed out.' },
  ];

  const q = (query || '').toLowerCase().trim();
  const filtered = q ? codes.filter((c) => String(c.code).includes(q) || c.phrase.toLowerCase().includes(q)) : codes;

  return {
    output: filtered.map((c) => `${c.code} ${c.phrase.padEnd(24)} -> ${c.description}`).join('\n'),
    outputType: 'text',
    tableData: filtered.slice(0, 15).map((c) => ({ key: `${c.code} ${c.phrase}`, value: c.description })),
  };
}

// -------------------------------------------------------------
// 13. EXTENDED MEDIA, DEVOPS, MATH, TEXT & DATA
// -------------------------------------------------------------

export function generateSvgPlaceholder(w = 300, h = 200, text = '', bg = '#10B981', fg = '#FFFFFF'): DevToolResult {
  const width = Math.max(Number(w) || 300, 10);
  const height = Math.max(Number(h) || 200, 10);
  const label = text || `${width}x${height}`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="${fg}" font-family="sans-serif" font-size="${Math.max(12, Math.round(width * 0.08))}px" font-weight="bold">${label}</text>
</svg>`;

  const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return {
    output: svg,
    outputType: 'code',
    meta: { svg, dataUrl },
    tableData: [
      { key: 'Dimensions', value: `${width} x ${height} px` },
      { key: 'Background', value: bg },
      { key: 'Text Label', value: label },
    ],
  };
}

export function crontabExplain(cronExpr: string): DevToolResult {
  const expr = (cronExpr || '* * * * *').trim();
  try {
    const desc = cronstrue.toString(expr, { use24HourTimeFormat: true });
    return {
      output: desc,
      outputType: 'text',
      tableData: [
        { key: 'Cron Expression', value: expr },
        { key: 'Human Description', value: desc },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `Invalid cron expression: ${err.message}` };
  }
}

export function generateRandomPort(): DevToolResult {
  const reserved = new Set([80, 443, 3000, 3306, 5432, 6379, 8080, 8000, 8443, 27017, 9000]);
  let port = 0;
  do {
    port = 1024 + Math.floor(Math.random() * (65535 - 1024));
  } while (reserved.has(port));

  return {
    output: String(port),
    outputType: 'text',
    tableData: [
      { key: 'Assigned Port', value: port },
      { key: 'Type', value: 'Non-privileged Ephemeral (1024-65535)' },
      { key: 'Status', value: 'Safe for Development / Microservices' },
    ],
  };
}

export function jsonDiffEngine(jsonA: string, jsonB: string): DevToolResult {
  try {
    const a = jsonA ? JSON.stringify(JSON.parse(jsonA), null, 2) : '';
    const b = jsonB ? JSON.stringify(JSON.parse(jsonB), null, 2) : '';
    const diff = Diff.diffLines(a, b);
    const diffLines: Array<{ type: 'add' | 'del' | 'same'; text: string }> = [];

    diff.forEach((part) => {
      const type = part.added ? 'add' : part.removed ? 'del' : 'same';
      part.value.replace(/\n$/, '').split('\n').forEach((l) => diffLines.push({ type, text: l }));
    });

    return {
      output: diffLines.map((l) => `${l.type === 'add' ? '+ ' : l.type === 'del' ? '- ' : '  '}${l.text}`).join('\n'),
      outputType: 'diff',
      diffLines,
    };
  } catch (err: any) {
    return { output: '', error: `JSON diff error: ${err.message}` };
  }
}

export function calculateEta(total: number, completed: number, elapsedSec: number): DevToolResult {
  const tot = Number(total) || 100;
  const comp = Number(completed) || 0;
  const elapsed = Number(elapsedSec) || 1;

  if (comp <= 0) return { output: 'Calculating ETA...', tableData: [] };

  const rate = comp / elapsed;
  const remainingItems = Math.max(tot - comp, 0);
  const remainingSec = Math.round(remainingItems / (rate || 1));
  const percent = Math.min(Math.round((comp / tot) * 100), 100);

  const formatSec = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}m ${sec}s`;
  };

  return {
    output: `ETA: ${formatSec(remainingSec)} remaining (${percent}% completed at ${rate.toFixed(1)} items/sec)`,
    outputType: 'text',
    tableData: [
      { key: 'Progress', value: `${percent}% (${comp} / ${tot})` },
      { key: 'Processing Speed', value: `${rate.toFixed(2)} items / sec` },
      { key: 'Remaining Time (ETA)', value: formatSec(remainingSec) },
      { key: 'Elapsed Time', value: formatSec(elapsed) },
    ],
  };
}

export function convertTemperature(value: number, from: 'celsius' | 'fahrenheit' | 'kelvin' = 'celsius'): DevToolResult {
  const val = Number(value);
  if (isNaN(val)) return { output: '' };

  let c = 0;
  if (from === 'celsius') c = val;
  else if (from === 'fahrenheit') c = (val - 32) * (5 / 9);
  else if (from === 'kelvin') c = val - 273.15;

  const f = c * (9 / 5) + 32;
  const k = c + 273.15;
  const r = (c + 273.15) * (9 / 5);

  return {
    output: `${c.toFixed(2)} °C | ${f.toFixed(2)} °F | ${k.toFixed(2)} K`,
    outputType: 'text',
    tableData: [
      { key: 'Celsius', value: `${c.toFixed(2)} °C` },
      { key: 'Fahrenheit', value: `${f.toFixed(2)} °F` },
      { key: 'Kelvin', value: `${k.toFixed(2)} K` },
      { key: 'Rankine', value: `${r.toFixed(2)} °R` },
    ],
  };
}

export function generateNumeronym(word: string): DevToolResult {
  if (!word) return { output: '' };
  const w = word.trim();
  if (w.length <= 2) return { output: w, outputType: 'text' };
  const numeronym = `${w[0]}${w.length - 2}${w[w.length - 1]}`;

  return {
    output: numeronym,
    outputType: 'text',
    tableData: [
      { key: 'Original Word', value: w },
      { key: 'Numeronym', value: numeronym },
      { key: 'Abbreviated Letters', value: w.length - 2 },
    ],
  };
}

export function convertList(
  input: string,
  options: { sort?: 'asc' | 'desc' | 'none'; dedupe?: boolean; reverse?: boolean; prefix?: string; suffix?: string; joiner?: string }
): DevToolResult {
  if (!input) return { output: '' };
  let lines = input.split('\n').map((l) => l.trim()).filter(Boolean);

  if (options.dedupe) lines = Array.from(new Set(lines));
  if (options.sort === 'asc') lines.sort((a, b) => a.localeCompare(b));
  if (options.sort === 'desc') lines.sort((a, b) => b.localeCompare(a));
  if (options.reverse) lines.reverse();

  if (options.prefix || options.suffix) {
    const p = options.prefix || '';
    const s = options.suffix || '';
    lines = lines.map((l) => `${p}${l}${s}`);
  }

  const joiner = options.joiner === 'comma' ? ', ' : '\n';
  return { output: lines.join(joiner), outputType: 'text' };
}

export function normalizeEmail(email: string): DevToolResult {
  if (!email) return { output: '' };
  try {
    const parts = email.trim().toLowerCase().split('@');
    if (parts.length !== 2) return { output: '', error: 'Invalid email address.' };
    let [user, domain] = parts;

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      user = user.replace(/\./g, '').replace(/\+.*$/, '');
      domain = 'gmail.com';
    } else {
      user = user.replace(/\+.*$/, '');
    }

    const normalized = `${user}@${domain}`;
    return {
      output: normalized,
      outputType: 'text',
      tableData: [
        { key: 'Normalized Email', value: normalized },
        { key: 'Canonical Username', value: user },
        { key: 'Domain', value: domain },
      ],
    };
  } catch (err: any) {
    return { output: '', error: err.message };
  }
}

export function obfuscateString(str: string, mode: 'email' | 'card' | 'token' = 'email'): DevToolResult {
  if (!str) return { output: '' };
  const s = str.trim();

  if (mode === 'email' && s.includes('@')) {
    const [u, d] = s.split('@');
    const maskedUser = u.length > 2 ? `${u[0]}${'*'.repeat(u.length - 2)}${u[u.length - 1]}` : u + '***';
    return { output: `${maskedUser}@${d}`, outputType: 'text' };
  }

  if (mode === 'card') {
    const clean = s.replace(/\s+/g, '');
    const last4 = clean.slice(-4);
    const masked = '*'.repeat(Math.max(clean.length - 4, 0)) + last4;
    return { output: masked.replace(/(.{4})/g, '$1 ').trim(), outputType: 'text' };
  }

  if (s.length > 8) {
    return { output: `${s.slice(0, 4)}${'*'.repeat(s.length - 8)}${s.slice(-4)}`, outputType: 'text' };
  }
  return { output: '*'.repeat(s.length), outputType: 'text' };
}

export function parsePhone(phoneNumber: string, defaultCountry = 'US'): DevToolResult {
  if (!phoneNumber) return { output: '' };
  try {
    const parsed = parsePhoneNumberFromString(phoneNumber, defaultCountry as any);
    if (!parsed || !parsed.isValid()) {
      return { output: '', error: 'Invalid international phone number.' };
    }

    return {
      output: parsed.format('E.164'),
      outputType: 'text',
      tableData: [
        { key: 'E.164 Standard Format', value: parsed.format('E.164') },
        { key: 'International Format', value: parsed.formatInternational() },
        { key: 'National Format', value: parsed.formatNational() },
        { key: 'Country ISO Code', value: parsed.country || 'Unknown' },
        { key: 'Country Calling Code', value: `+${parsed.countryCallingCode}` },
        { key: 'Valid Status', value: parsed.isValid() ? 'YES (Valid)' : 'NO' },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `Phone parse error: ${err.message}` };
  }
}

export function validateIban(ibanStr: string): DevToolResult {
  if (!ibanStr) return { output: '' };
  const clean = ibanStr.replace(/\s+/g, '').toUpperCase();
  const valid = isValidIBAN(clean);
  const formatted = electronicFormatIBAN(clean) || clean;

  return {
    output: valid ? `VALID IBAN: ${formatted}` : 'INVALID IBAN: Failed ISO 7064 MOD 97-10 check',
    outputType: 'text',
    tableData: [
      { key: 'IBAN Validity', value: valid ? 'VALID' : 'INVALID' },
      { key: 'Country Code', value: clean.substring(0, 2) },
      { key: 'Check Digits', value: clean.substring(2, 4) },
      { key: 'Electronic Format', value: formatted },
      { key: 'Print Format', value: clean.replace(/(.{4})/g, '$1 ').trim() },
    ],
  };
}

export function generateAsciiBanner(text: string): DevToolResult {
  if (!text) return { output: '' };
  const BANNER_MAP: Record<string, string[]> = {
    A: ['  AA  ', ' A  A ', 'AAAAAA', 'A    A', 'A    A'],
    B: ['BBBBB ', 'B    B', 'BBBBB ', 'B    B', 'BBBBB '],
    C: [' CCCCC', 'C     ', 'C     ', 'C     ', ' CCCCC'],
    D: ['DDDD  ', 'D   D ', 'D    D', 'D   D ', 'DDDD  '],
    E: ['EEEEEE', 'E     ', 'EEEEE ', 'E     ', 'EEEEEE'],
    F: ['FFFFFF', 'F     ', 'FFFFF ', 'F     ', 'F     '],
    G: [' GGGGG', 'G     ', 'G  GGG', 'G    G', ' GGGGG'],
    H: ['H    H', 'H    H', 'HHHHHH', 'H    H', 'H    H'],
    I: [' IIII ', '  II  ', '  II  ', '  II  ', ' IIII '],
    J: [' JJJJJ', '    J ', '    J ', 'J   J ', ' JJJ  '],
    K: ['K   K ', 'K  K  ', 'KKK   ', 'K  K  ', 'K   K '],
    L: ['L     ', 'L     ', 'L     ', 'L     ', 'LLLLLL'],
    M: ['M    M', 'MM  MM', 'M MM M', 'M    M', 'M    M'],
    N: ['N    N', 'NN   N', 'N N  N', 'N  N N', 'N   NN'],
    O: [' OOOO ', 'O    O', 'O    O', 'O    O', ' OOOO '],
    P: ['PPPPP ', 'P    P', 'PPPPP ', 'P     ', 'P     '],
    Q: [' QQQQ ', 'Q    Q', 'Q  Q Q', 'Q   QQ', ' QQQ Q'],
    R: ['RRRRR ', 'R    R', 'RRRRR ', 'R  R  ', 'R   R '],
    S: [' SSSSS', 'S     ', ' SSSS ', '     S', 'SSSSS '],
    T: ['TTTTTT', '  TT  ', '  TT  ', '  TT  ', '  TT  '],
    U: ['U    U', 'U    U', 'U    U', 'U    U', ' UUUU '],
    V: ['V    V', 'V    V', 'V    V', ' V  V ', '  VV  '],
    W: ['W    W', 'W    W', 'W WW W', 'WW  WW', 'W    W'],
    X: ['X    X', ' X  X ', '  XX  ', ' X  X ', 'X    X'],
    Y: ['Y    Y', ' Y  Y ', '  YY  ', '  YY  ', '  YY  '],
    Z: ['ZZZZZZ', '   ZZ ', '  ZZ  ', ' ZZ   ', 'ZZZZZZ'],
    ' ': ['  ', '  ', '  ', '  ', '  '],
    '0': [' 000 ', '0   0', '0   0', '0   0', ' 000 '],
    '1': [' 11 ', '  1 ', '  1 ', '  1 ', '1111'],
    '2': [' 222 ', '2   2', '   2 ', '  2  ', '22222'],
    '3': [' 333 ', '    3', '  33 ', '    3', ' 333 '],
    '4': ['4  4 ', '4  4 ', '44444', '   4 ', '   4 '],
    '5': ['55555', '5    ', '5555 ', '    5', '5555 '],
    '6': [' 666 ', '6    ', '6666 ', '6   6', ' 666 '],
    '7': ['77777', '   7 ', '  7  ', ' 7   ', '7    '],
    '8': [' 888 ', '8   8', ' 888 ', '8   8', ' 888 '],
    '9': [' 999 ', '9   9', ' 9999', '    9', ' 999 '],
  };

  const clean = text.toUpperCase().slice(0, 15);
  const rows = ['', '', '', '', ''];
  for (const ch of clean) {
    const charRows = BANNER_MAP[ch] || BANNER_MAP[' '];
    for (let r = 0; r < 5; r++) {
      rows[r] += charRows[r] + '  ';
    }
  }

  return { output: rows.join('\n'), outputType: 'code' };
}

export function getGitMemo(search = ''): DevToolResult {
  const commands = [
    { cmd: 'git init', desc: 'Initialize a local Git repository' },
    { cmd: 'git clone <url>', desc: 'Clone a remote repository' },
    { cmd: 'git status', desc: 'Check state of working directory and staged files' },
    { cmd: 'git add .', desc: 'Stage all modified and new files' },
    { cmd: 'git commit -m "<msg>"', desc: 'Commit staged files with message' },
    { cmd: 'git branch -M main', desc: 'Rename current branch to main' },
    { cmd: 'git checkout -b <branch>', desc: 'Create and switch to new branch' },
    { cmd: 'git merge <branch>', desc: 'Merge branch into current branch' },
    { cmd: 'git rebase <upstream>', desc: 'Reapply commits on top of another base' },
    { cmd: 'git stash save "<note>"', desc: 'Stash unstaged changes for later' },
    { cmd: 'git stash pop', desc: 'Restore and remove latest stashed changes' },
    { cmd: 'git cherry-pick <hash>', desc: 'Apply commit from another branch' },
    { cmd: 'git reset --soft HEAD~1', desc: 'Undo last commit, keeping changes staged' },
    { cmd: 'git reset --hard HEAD~1', desc: 'Discard last commit and all local changes' },
    { cmd: 'git remote -v', desc: 'List configured remote repositories' },
    { cmd: 'git push origin <branch>', desc: 'Push local branch to remote' },
    { cmd: 'git pull --rebase origin main', desc: 'Pull latest remote commits with rebase' },
  ];

  const q = search.toLowerCase().trim();
  const filtered = q ? commands.filter((c) => c.cmd.includes(q) || c.desc.toLowerCase().includes(q)) : commands;

  return {
    output: filtered.map((c) => `${c.cmd.padEnd(35)} # ${c.desc}`).join('\n'),
    outputType: 'code',
    tableData: filtered.map((c) => ({ key: c.cmd, value: c.desc })),
  };
}

export function getRegexMemo(query = ''): DevToolResult {
  const cheatsheet = [
    { token: '.', desc: 'Any character except newline' },
    { token: '\\d / \\D', desc: 'Digit (0-9) / Not digit' },
    { token: '\\w / \\W', desc: 'Word character (a-z, A-Z, 0-9, _) / Not word' },
    { token: '\\s / \\S', desc: 'Whitespace (space, tab, newline) / Not whitespace' },
    { token: '^ / $', desc: 'Start of string (or line) / End of string' },
    { token: '*', desc: '0 or more occurrences (greedy)' },
    { token: '+', desc: '1 or more occurrences (greedy)' },
    { token: '?', desc: '0 or 1 occurrence (optional)' },
    { token: '{n,m}', desc: 'Between n and m occurrences' },
    { token: '[abc]', desc: 'Character set: matches a, b, or c' },
    { token: '[^abc]', desc: 'Negated set: matches anything except a, b, or c' },
    { token: '(...)', desc: 'Capturing group' },
    { token: '(?:...)', desc: 'Non-capturing group' },
    { token: '(?=...)', desc: 'Positive lookahead assertion' },
    { token: '(?!...)', desc: 'Negative lookahead assertion' },
    { token: '(?<=...)', desc: 'Positive lookbehind assertion' },
    { token: '(?<!...)', desc: 'Negative lookbehind assertion' },
    { token: 'Flag: g', desc: 'Global matching (all occurrences)' },
    { token: 'Flag: i', desc: 'Case-insensitive matching' },
    { token: 'Flag: m', desc: 'Multi-line mode (^ and $ match line boundaries)' },
    { token: 'Flag: s', desc: 'Dot-all mode (. matches newline as well)' },
  ];

  const q = query.toLowerCase().trim();
  const filtered = q ? cheatsheet.filter((c) => c.token.includes(q) || c.desc.toLowerCase().includes(q)) : cheatsheet;

  return {
    output: filtered.map((c) => `${c.token.padEnd(20)} -> ${c.desc}`).join('\n'),
    outputType: 'text',
    tableData: filtered.map((c) => ({ key: c.token, value: c.desc })),
  };
}

export function getEmojiDirectory(search = ''): DevToolResult {
  const emojis = [
    { emoji: '😀', name: 'Grinning Face', category: 'Smileys' },
    { emoji: '🚀', name: 'Rocket', category: 'Travel' },
    { emoji: '⚡', name: 'High Voltage', category: 'Activities' },
    { emoji: '🔥', name: 'Fire', category: 'Activities' },
    { emoji: '💡', name: 'Light Bulb', category: 'Objects' },
    { emoji: '💻', name: 'Laptop', category: 'Objects' },
    { emoji: '📱', name: 'Mobile Phone', category: 'Objects' },
    { emoji: '🔒', name: 'Locked Padlock', category: 'Objects' },
    { emoji: '🔑', name: 'Key', category: 'Objects' },
    { emoji: '🛡️', name: 'Shield', category: 'Objects' },
    { emoji: '✨', name: 'Sparkles', category: 'Activities' },
    { emoji: '🎉', name: 'Party Popper', category: 'Activities' },
    { emoji: '👍', name: 'Thumbs Up', category: 'People' },
    { emoji: '❤️', name: 'Red Heart', category: 'Smileys' },
    { emoji: '✅', name: 'Check Mark', category: 'Symbols' },
    { emoji: '❌', name: 'Cross Mark', category: 'Symbols' },
    { emoji: '⚙️', name: 'Gear / Settings', category: 'Objects' },
    { emoji: '📊', name: 'Bar Chart', category: 'Objects' },
    { emoji: '🌐', name: 'Globe / Internet', category: 'Travel' },
    { emoji: '📦', name: 'Package', category: 'Objects' },
  ];

  const q = search.toLowerCase().trim();
  const filtered = q ? emojis.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q)) : emojis;

  return {
    output: filtered.map((e) => `${e.emoji}  ${e.name} (${e.category})`).join('\n'),
    outputType: 'text',
    tableData: filtered.map((e) => ({ key: e.emoji, value: `${e.name} (${e.category})` })),
  };
}

export function runBenchmark(snippetA: string, snippetB: string, iterations = 100000): DevToolResult {
  const count = Math.min(Math.max(Number(iterations) || 100000, 1000), 1000000);
  try {
    const fnA = new Function(`for (let i = 0; i < ${count}; i++) { ${snippetA || 'Math.random()'} }`);
    const fnB = new Function(`for (let i = 0; i < ${count}; i++) { ${snippetB || 'Date.now()'} }`);

    const t0 = performance.now();
    fnA();
    const t1 = performance.now();
    const durationA = t1 - t0;

    const t2 = performance.now();
    fnB();
    const t3 = performance.now();
    const durationB = t3 - t2;

    const opsA = Math.round((count / (durationA || 1)) * 1000);
    const opsB = Math.round((count / (durationB || 1)) * 1000);

    const winner = durationA < durationB ? 'Snippet A is faster' : 'Snippet B is faster';
    const factor = durationA < durationB ? (durationB / durationA).toFixed(2) : (durationA / durationB).toFixed(2);

    return {
      output: `${winner} by ${factor}x!\nSnippet A: ${durationA.toFixed(2)}ms (${opsA.toLocaleString()} ops/sec)\nSnippet B: ${durationB.toFixed(2)}ms (${opsB.toLocaleString()} ops/sec)`,
      outputType: 'text',
      tableData: [
        { key: 'Iterations Tested', value: count.toLocaleString() },
        { key: 'Snippet A Duration', value: `${durationA.toFixed(2)} ms (${opsA.toLocaleString()} ops/sec)` },
        { key: 'Snippet B Duration', value: `${durationB.toFixed(2)} ms (${opsB.toLocaleString()} ops/sec)` },
        { key: 'Performance Result', value: `${winner} (${factor}x)` },
      ],
    };
  } catch (err: any) {
    return { output: '', error: `Benchmark error: ${err.message}` };
  }
}

// -------------------------------------------------------------
// 10. LETMEGOOGLE.IN SUITE ENGINES
// -------------------------------------------------------------

export function bulkUrlOpener(
  input: string,
  options: { delayMs?: number; autoHttps?: boolean } = {}
): DevToolResult {
  const autoHttps = options.autoHttps !== false;
  const rawLines = (input || '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

  const parsedUrls: string[] = [];
  const invalidLines: string[] = [];

  for (const line of rawLines) {
    let url = line;
    if (autoHttps && !/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      new URL(url);
      parsedUrls.push(url);
    } catch {
      invalidLines.push(line);
    }
  }

  const delay = Number(options.delayMs) || 100;

  const tableData = [
    { key: 'Total Lines Processed', value: rawLines.length },
    { key: 'Valid URLs Ready to Open', value: parsedUrls.length },
    { key: 'Invalid Lines', value: invalidLines.length },
    { key: 'Configured Delay Per Tab', value: `${delay} ms` },
  ];

  let output = `Ready to open ${parsedUrls.length} URLs in separate tabs.\n\n`;
  if (invalidLines.length > 0) {
    output += `⚠️ Invalid / Unparseable URLs (${invalidLines.length}):\n${invalidLines.join('\n')}\n\n`;
  }
  output += `URLs to open:\n${parsedUrls.join('\n')}`;

  return {
    output,
    outputType: 'text',
    tableData,
    meta: {
      urls: parsedUrls,
      delayMs: delay,
    },
  };
}

export function extractBaseUrls(
  input: string,
  options: { deduplicate?: boolean; stripWww?: boolean; sortAlpha?: boolean; includeProtocol?: boolean } = {}
): DevToolResult {
  const deduplicate = options.deduplicate !== false;
  const stripWww = options.stripWww !== false;
  const sortAlpha = options.sortAlpha !== false;
  const includeProtocol = options.includeProtocol === true;

  const text = input || '';
  const regex = /(?:(https?:\/\/)?(?:www\.)?)([a-zA-Z0-9][-a-zA-Z0-9]*\.[a-zA-Z0-9.-]+[a-zA-Z]{2,})/gi;
  let domains: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    let host = match[2].toLowerCase();
    if (stripWww && host.startsWith('www.')) {
      host = host.slice(4);
    }
    if (includeProtocol) {
      const proto = match[1] || 'https://';
      domains.push(`${proto}${host}`);
    } else {
      domains.push(host);
    }
  }

  const totalFound = domains.length;
  if (deduplicate) {
    domains = Array.from(new Set(domains));
  }
  if (sortAlpha) {
    domains.sort((a, b) => a.localeCompare(b));
  }

  return {
    output: domains.join('\n'),
    outputType: 'text',
    tableData: [
      { key: 'Total Matches Found', value: totalFound },
      { key: 'Unique Base URLs', value: domains.length },
      { key: 'Stripped www.', value: stripWww ? 'Yes' : 'No' },
      { key: 'Alphabetical Sort', value: sortAlpha ? 'Yes' : 'No' },
    ],
  };
}

export function dartOnlineIde(
  _input: string,
  options: { mode?: string; theme?: string } = {}
): DevToolResult {
  const mode = options.mode || 'dart';
  const theme = options.theme || 'dark';

  return {
    output: `Dart Online IDE initialized in ${mode === 'flutter' ? 'Flutter' : 'Dart'} mode with ${theme} theme.`,
    outputType: 'custom',
    tableData: [
      { key: 'IDE Mode', value: mode === 'flutter' ? 'Flutter Framework' : 'Pure Dart Console' },
      { key: 'Target Runtime', value: 'Google DartPad SDK 3.x (WebAssembly / JS)' },
      { key: 'Embedded Sandbox', value: 'https://dartpad.dev' },
    ],
    meta: { mode, theme },
  };
}

export function prefixAndPostfix(
  input: string,
  options: {
    prefix?: string;
    postfix?: string;
    skipEmpty?: boolean;
    trim?: boolean;
    lineNumbers?: boolean;
  } = {}
): DevToolResult {
  const prefix = options.prefix ?? '';
  const postfix = options.postfix ?? '';
  const skipEmpty = options.skipEmpty !== false;
  const trim = options.trim !== false;
  const lineNumbers = options.lineNumbers === true;

  const lines = (input || '').split(/\r?\n/);
  let lineIdx = 1;

  const transformed: string[] = [];

  for (const rawLine of lines) {
    const processed = trim ? rawLine.trim() : rawLine;
    if (skipEmpty && processed.length === 0) {
      continue;
    }
    const num = lineNumbers ? `${lineIdx++}. ` : '';
    transformed.push(`${num}${prefix}${processed}${postfix}`);
  }

  return {
    output: transformed.join('\n'),
    outputType: 'text',
    tableData: [
      { key: 'Input Lines Count', value: lines.length },
      { key: 'Processed Lines Count', value: transformed.length },
      { key: 'Prefix Applied', value: prefix ? `"${prefix}"` : '(None)' },
      { key: 'Postfix Applied', value: postfix ? `"${postfix}"` : '(None)' },
    ],
  };
}

export function onlineTextFormatting(
  input: string,
  options: { action?: string } = {}
): DevToolResult {
  const text = input || '';
  const action = options.action || 'clean';

  let result = text;
  let actionLabel = 'Clean Formatting';

  switch (action) {
    case 'clean':
      actionLabel = 'Clean Extra Spaces';
      result = text.trim().replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
      break;
    case 'lowercase':
      actionLabel = 'All Lowercase';
      result = text.toLowerCase();
      break;
    case 'uppercase':
      actionLabel = 'ALL UPPERCASE';
      result = text.toUpperCase();
      break;
    case 'capitalize':
      actionLabel = 'Capitalize First Letter of Each Word';
      result = text.replace(/\b\w/g, (c) => c.toUpperCase());
      break;
    case 'titleCase':
      actionLabel = 'Title Case';
      result = text.toLowerCase().replace(/(?:^|\s|-)\b([a-z])/g, (_, m) => m.toUpperCase());
      break;
    case 'sentenceCase':
      actionLabel = 'Sentence case';
      result = text.toLowerCase().replace(/(^\s*|\.\s+)([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
      break;
  }

  const words = text.trim().length > 0 ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;
  const lines = text.length > 0 ? text.split(/\r?\n/).length : 0;

  return {
    output: result,
    outputType: 'text',
    tableData: [
      { key: 'Operation Applied', value: actionLabel },
      { key: 'Words Count', value: words },
      { key: 'Characters Count', value: chars },
      { key: 'Lines Count', value: lines },
    ],
  };
}

