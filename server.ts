import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3002;

// Model default Google Gemini
function getGeminiModelName(): string {
  const model = process.env.GEMINI_MODEL?.trim();
  if (
    !model ||
    model === 'gemini-2.5-flash' ||
    model === 'gemini-2.0-flash' ||
    model === 'gemini-3.8-flash' ||
    model === 'gemini-3.5-flash'
  ) {
    return 'gemini-3.5-flash-lite';
  }
  return model;
}

const FALLBACK_GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
const BACKUP_GEMINI_KEY = process.env.GEMINI_BACKUP_KEY || '';

function maskKey(key?: string): string {
  if (!key || key.trim() === '') return '';
  const clean = key.trim();
  if (clean.length <= 8) return '****';
  return `${clean.slice(0, 6)}...${clean.slice(-4)}`;
}

function getGeminiClient(customKey?: string): GoogleGenAI {
  const apiKey = customKey || process.env.GEMINI_API_KEY || BACKUP_GEMINI_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi pada server.');
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
  });
}

const questionItemSchema = {
  type: Type.OBJECT,
  properties: {
    nomor: { type: Type.INTEGER },
    bentuk: { type: Type.STRING, description: 'PG, PGK, Isian, Mencocokkan, atau Uraian' },
    stimulus: {
      type: Type.STRING,
      description: 'Teks bacaan, tabel teks, atau pengantar soal (kosongkan jika tidak perlu)',
    },
    pertanyaan: { type: Type.STRING, description: 'Pokok soal atau pertanyaan' },
    opsi: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Daftar opsi A, B, C, (D) untuk PG; pernyataan [ ] untuk PGK; pasangan format "1. Premis kiri => Pasangan kanan" (3-4 pasang) untuk Mencocokkan. Kosong untuk Isian/Uraian.',
    },
    kunci: { type: Type.STRING, description: 'Kunci jawaban tepat' },
    pembahasan: { type: Type.STRING, description: 'Penjelasan singkat mengapa jawaban tersebut benar' },
    skor: {
      type: Type.INTEGER,
      description: 'Skor maksimal butir soal (PG=1, PGK=2, Isian=2, Mencocokkan=3, Uraian=4)',
    },
    materi: { type: Type.STRING },
    indikator: { type: Type.STRING },
    bloom: { type: Type.STRING, description: 'C1, C2, C3, C4, C5, atau C6' },
    kesulitan: { type: Type.STRING, description: 'Mudah, Sedang, atau Sulit' },
    dimensi: { type: Type.STRING, description: 'Salah satu dari 8 Dimensi Lulusan' },
    gambarUrl: {
      type: Type.STRING,
      description:
        'URL atau data URI gambar stimulus jika soal memerlukan gambar (atau kosongkan string "" jika tidak perlu gambar)',
    },
    gambarDeskripsi: {
      type: Type.STRING,
      description:
        'Deskripsi atau prompt gambar ilustrasi soal (misal: "Diagram siklus air", "Gambar bangun persegi dan segitiga", atau kosongkan "" jika tidak perlu)',
    },
  },
  required: [
    'nomor',
    'bentuk',
    'stimulus',
    'pertanyaan',
    'opsi',
    'kunci',
    'pembahasan',
    'skor',
    'materi',
    'indikator',
    'bloom',
    'kesulitan',
    'dimensi',
  ],
};

// Eksekutor panggilan ke Google Gemini AI
async function callGeminiWithFallback(options: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
}): Promise<{ text: string; model: string }> {
  const configuredKey = process.env.GEMINI_API_KEY?.trim() || BACKUP_GEMINI_KEY;
  const keysToTry = [configuredKey];
  if (configuredKey !== BACKUP_GEMINI_KEY && BACKUP_GEMINI_KEY) {
    keysToTry.push(BACKUP_GEMINI_KEY);
  }

  const primaryModel = getGeminiModelName();
  const candidates = [primaryModel, ...FALLBACK_GEMINI_MODELS.filter((m) => m !== primaryModel)];

  let lastError: unknown = null;

  for (const apiKey of keysToTry) {
    const ai = getGeminiClient(apiKey);
    for (const model of candidates) {
      try {
        console.log(`[Gemini] Memproses konten dengan model ${model} (key: ${apiKey.substring(0, 10)}...)...`);
        const response = await ai.models.generateContent({
          model,
          contents: options.contents,
          config: {
            systemInstruction: options.systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: options.responseSchema,
          },
        });

        const text = (response.text ?? '').trim();
        if (text) {
          return { text, model };
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[Gemini] Model ${model} kendala:`, errMsg);
        lastError = err;

        if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403') || errMsg.includes('UNAUTHENTICATED')) {
          console.warn(`[Gemini] Key ditolak Google (Permission Denied). Beralih ke key cadangan aktif...`);
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  }

  throw lastError || new Error('Layanan Google Gemini AI sedang sibuk. Silakan coba sesaat lagi.');
}

// Eksekutor panggilan ke OpenAI GPT (gpt-4o-mini, gpt-4o)
async function callOpenAI(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<string> {
  const messages = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nWajib kembalikan format JSON murni yang valid tanpa kata pembuka atau markdown quotes.`,
  });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data?.error?.message || `OpenAI API Error (HTTP ${res.status})`);
  }
  return data.choices?.[0]?.message?.content || '';
}

// Eksekutor panggilan ke Anthropic Claude (claude-3-5-haiku, claude-3-5-sonnet)
async function callAnthropic(apiKey: string, model: string, prompt: string, systemInstruction?: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey.trim(),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-haiku-20241022',
      max_tokens: 4096,
      system: systemInstruction || undefined,
      messages: [
        {
          role: 'user',
          content: `${prompt}\n\nWajib kembalikan HANYA format JSON murni yang valid tanpa kata pengantar atau markdown.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data?.error?.message || `Anthropic Claude API Error (HTTP ${res.status})`);
  }
  return data.content?.[0]?.text || '';
}

// Router Universal AI Multi-Provider (Gemini, OpenAI GPT, Anthropic Claude)
async function callUniversalAI(options: {
  contents: string;
  systemInstruction?: string;
  responseSchema?: any;
}): Promise<{ text: string; provider: string; model: string }> {
  const activeProvider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();

  // Opsi 1: OpenAI GPT
  if (activeProvider === 'openai') {
    const key = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    if (key) {
      try {
        console.log(`[AI Provider] Menggunakan OpenAI GPT (${model})...`);
        const text = await callOpenAI(key, model, options.contents, options.systemInstruction);
        return { text, provider: 'OpenAI GPT', model };
      } catch (err: unknown) {
        console.warn('[AI Provider] OpenAI gagal, beralih ke fallback Gemini:', err instanceof Error ? err.message : err);
      }
    } else {
      console.warn('[AI Provider] OPENAI_API_KEY belum diisi, otomatis menggunakan Google Gemini.');
    }
  }

  // Opsi 2: Anthropic Claude
  if (activeProvider === 'anthropic') {
    const key = process.env.ANTHROPIC_API_KEY?.trim();
    const model = process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-20241022';
    if (key) {
      try {
        console.log(`[AI Provider] Menggunakan Anthropic Claude (${model})...`);
        const text = await callAnthropic(key, model, options.contents, options.systemInstruction);
        return { text, provider: 'Anthropic Claude', model };
      } catch (err: unknown) {
        console.warn('[AI Provider] Anthropic gagal, beralih ke fallback Gemini:', err instanceof Error ? err.message : err);
      }
    } else {
      console.warn('[AI Provider] ANTHROPIC_API_KEY belum diisi, otomatis menggunakan Google Gemini.');
    }
  }

  // Opsi 3 (Default & Fallback): Google Gemini
  const gemResult = await callGeminiWithFallback(options);
  return {
    text: gemResult.text,
    provider: 'Google Gemini',
    model: gemResult.model,
  };
}

// Helper pembersih respon JSON universal
function extractJsonArray(rawText: string): any[] {
  let text = rawText.trim();
  text = text.replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.questions)) return parsed.questions;
    if (Array.isArray(parsed.soal)) return parsed.soal;
    if (Array.isArray(parsed.data)) return parsed.data;
    if (parsed && typeof parsed === 'object' && parsed.pertanyaan) return [parsed];
    return [parsed];
  } catch {
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const arr = JSON.parse(text.substring(firstBracket, lastBracket + 1));
      if (Array.isArray(arr)) return arr;
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const obj = JSON.parse(text.substring(firstBrace, lastBrace + 1));
      if (Array.isArray(obj.questions)) return obj.questions;
      if (Array.isArray(obj.soal)) return obj.soal;
      if (Array.isArray(obj.data)) return obj.data;
    }
    throw new Error('Gagal mengekstrak struktur JSON soal dari respon AI.');
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Status API lama (Backward Compatibility)
  app.get('/api/check-api-key', (_req: Request, res: Response) => {
    const key = process.env.GEMINI_API_KEY?.trim() || '';
    const masked = key.length > 8 ? `${key.slice(0, 6)}...${key.slice(-4)}` : (key ? '***' : '');
    res.json({
      hasKey: Boolean(key),
      activeModel: getGeminiModelName(),
      currentKeyMasked: masked,
      backupKeyActive: true,
      activeProvider: process.env.AI_PROVIDER || 'gemini',
    });
  });

  // Konfigurasi lengkap Multi-AI (Gemini, GPT, Claude)
  app.get('/api/ai-config', (_req: Request, res: Response) => {
    res.json({
      activeProvider: process.env.AI_PROVIDER || 'gemini',
      gemini: {
        hasKey: Boolean(process.env.GEMINI_API_KEY?.trim()),
        keyMasked: maskKey(process.env.GEMINI_API_KEY),
        model: getGeminiModelName(),
        availableModels: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'],
      },
      openai: {
        hasKey: Boolean(process.env.OPENAI_API_KEY?.trim()),
        keyMasked: maskKey(process.env.OPENAI_API_KEY),
        model: process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini',
        availableModels: ['gpt-4o-mini', 'gpt-4o'],
      },
      anthropic: {
        hasKey: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
        keyMasked: maskKey(process.env.ANTHROPIC_API_KEY),
        model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-haiku-20241022',
        availableModels: ['claude-3-5-haiku-20241022', 'claude-3-5-sonnet-20241022'],
      },
    });
  });

  // Simpan pengaturan Multi-AI ke .env & runtime
  app.post('/api/save-ai-config', (req: Request, res: Response) => {
    try {
      const {
        activeProvider,
        geminiApiKey,
        geminiModel,
        openaiApiKey,
        openaiModel,
        anthropicApiKey,
        anthropicModel,
      } = req.body ?? {};

      if (activeProvider) process.env.AI_PROVIDER = activeProvider;
      if (geminiApiKey !== undefined && geminiApiKey.trim() !== '') process.env.GEMINI_API_KEY = geminiApiKey.trim();
      if (geminiModel) process.env.GEMINI_MODEL = geminiModel;
      if (openaiApiKey !== undefined && openaiApiKey.trim() !== '') process.env.OPENAI_API_KEY = openaiApiKey.trim();
      if (openaiModel) process.env.OPENAI_MODEL = openaiModel;
      if (anthropicApiKey !== undefined && anthropicApiKey.trim() !== '') process.env.ANTHROPIC_API_KEY = anthropicApiKey.trim();
      if (anthropicModel) process.env.ANTHROPIC_MODEL = anthropicModel;

      const envPath = path.resolve(__dirname, '.env');
      const lines = [
        `# Konfigurasi Provider AI: gemini | openai | anthropic`,
        `AI_PROVIDER=${process.env.AI_PROVIDER || 'gemini'}`,
        ``,
        `# Google Gemini`,
        `GEMINI_API_KEY=${process.env.GEMINI_API_KEY || ''}`,
        `GEMINI_MODEL=${process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'}`,
        ``,
        `# OpenAI GPT (gpt-4o-mini, gpt-4o)`,
        `OPENAI_API_KEY=${process.env.OPENAI_API_KEY || ''}`,
        `OPENAI_MODEL=${process.env.OPENAI_MODEL || 'gpt-4o-mini'}`,
        ``,
        `# Anthropic Claude (claude-3-5-haiku-20241022, claude-3-5-sonnet-20241022)`,
        `ANTHROPIC_API_KEY=${process.env.ANTHROPIC_API_KEY || ''}`,
        `ANTHROPIC_MODEL=${process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022'}`,
        ``,
        `PORT=${PORT}`,
      ];

      fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');

      res.json({
        success: true,
        message: 'Pengaturan Multi-AI berhasil disimpan dan aktif!',
        activeProvider: process.env.AI_PROVIDER,
      });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan konfigurasi ke file .env.' });
    }
  });

  // Uji koneksi live untuk provider mana pun (Gemini, OpenAI, Anthropic)
  app.post('/api/test-ai-provider', async (req: Request, res: Response) => {
    try {
      const { provider, apiKey, model } = req.body ?? {};
      const targetProvider = (provider || 'gemini').toLowerCase().trim();

      if (targetProvider === 'openai') {
        const key = apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
        if (!key) {
          res.status(400).json({ success: false, message: 'OPENAI_API_KEY belum diisi.' });
          return;
        }
        const m = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
        const reply = await callOpenAI(key, m, 'Jawab dalam satu kata: Sukses', 'Anda asisten cerdas.');
        res.json({
          success: true,
          message: `Koneksi OpenAI GPT Berhasil! Terhubung ke model ${m}.`,
          reply: reply.trim(),
          provider: 'OpenAI GPT',
          model: m,
        });
        return;
      }

      if (targetProvider === 'anthropic') {
        const key = apiKey?.trim() || process.env.ANTHROPIC_API_KEY?.trim();
        if (!key) {
          res.status(400).json({ success: false, message: 'ANTHROPIC_API_KEY belum diisi.' });
          return;
        }
        const m = model || process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
        const reply = await callAnthropic(key, m, 'Jawab dalam satu kata: Sukses', 'Anda asisten cerdas.');
        res.json({
          success: true,
          message: `Koneksi Anthropic Claude Berhasil! Terhubung ke model ${m}.`,
          reply: reply.trim(),
          provider: 'Anthropic Claude',
          model: m,
        });
        return;
      }

      // Default: Gemini
      const keyToTest = apiKey?.trim() || process.env.GEMINI_API_KEY || BACKUP_GEMINI_KEY;
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const m = model || getGeminiModelName();
      const result = await ai.models.generateContent({
        model: m,
        contents: 'Uji koneksi Google Gemini API. Jawab satu kata: Sukses',
      });
      res.json({
        success: true,
        message: `Koneksi Google Gemini Berhasil! Terhubung ke model ${m}.`,
        reply: (result.text ?? '').trim(),
        provider: 'Google Gemini',
        model: m,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      let friendly = errMsg;
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
        friendly =
          'Google menolak akses (403 Permission Denied): Layanan "Generative Language API" belum di-enable pada proyek kunci ini di Google Cloud Console. Solusi paling praktis: Buka https://aistudio.google.com/apikey dan klik "Create API Key" baru yang langsung aktif gratis 100%.';
      } else if (errMsg.includes('Incorrect API key') || errMsg.includes('invalid_api_key')) {
        friendly = 'Kunci API OpenAI tidak valid. Pastikan menyalin dari https://platform.openai.com/api-keys';
      } else if (errMsg.includes('authentication_error') || errMsg.includes('x-api-key')) {
        friendly = 'Kunci API Anthropic Claude tidak valid. Pastikan menyalin dari https://console.anthropic.com/settings/keys';
      }
      res.status(400).json({
        success: false,
        message: friendly,
        rawError: errMsg,
      });
    }
  });

  // Backward compatibility: Test API Key Gemini
  app.post('/api/test-api-key', async (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body ?? {};
      const keyToTest =
        (typeof apiKey === 'string' && apiKey.trim()) ||
        process.env.GEMINI_API_KEY ||
        BACKUP_GEMINI_KEY;
      if (!keyToTest) {
        res.status(400).json({ success: false, message: 'Kunci API belum diisi.' });
        return;
      }
      const ai = new GoogleGenAI({ apiKey: keyToTest });
      const model = getGeminiModelName();
      const result = await ai.models.generateContent({
        model,
        contents: 'Uji koneksi Google Gemini API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses',
      });
      res.json({
        success: true,
        message: `Koneksi Berhasil! Terhubung ke Google Gemini (${model}).`,
        reply: (result.text ?? '').trim(),
        model,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      let friendly = errMsg;
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('403')) {
        friendly =
          'Google menolak akses (403 Permission Denied): Layanan "Generative Language API" belum di-enable pada proyek kunci ini di Google Cloud Console. Solusi paling praktis: Buka https://aistudio.google.com/apikey dan klik "Create API Key" baru yang langsung aktif gratis 100%.';
      } else if (errMsg.includes('API key not valid') || errMsg.includes('UNAUTHENTICATED')) {
        friendly =
          'Kunci API tidak valid. Pastikan menyalin seluruh karakter kunci resmi dari Google AI Studio.';
      }
      res.status(400).json({
        success: false,
        message: friendly,
        rawError: errMsg,
      });
    }
  });

  // Backward compatibility: Save API Key
  app.post('/api/save-api-key', (req: Request, res: Response) => {
    try {
      const { apiKey } = req.body ?? {};
      if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        res.status(400).json({ error: 'API Key tidak boleh kosong.' });
        return;
      }
      const cleanKey = apiKey.trim();
      process.env.GEMINI_API_KEY = cleanKey;

      const envPath = path.resolve(__dirname, '.env');
      let envContent = '';
      if (fs.existsSync(envPath)) {
        envContent = fs.readFileSync(envPath, 'utf-8');
        if (envContent.includes('GEMINI_API_KEY=')) {
          envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${cleanKey}`);
        } else {
          envContent += `\nGEMINI_API_KEY=${cleanKey}\n`;
        }
      } else {
        envContent = `GEMINI_API_KEY=${cleanKey}\nGEMINI_MODEL=gemini-3.5-flash-lite\nPORT=3002\n`;
      }
      fs.writeFileSync(envPath, envContent, 'utf-8');

      res.json({ success: true, message: 'GEMINI_API_KEY berhasil disimpan dan aktif!' });
    } catch {
      res.status(500).json({ error: 'Gagal menyimpan API key ke file .env.' });
    }
  });

  // Endpoint Penyusunan Paket Soal Asesmen (Didukung Multi-Provider)
  app.post('/api/generate-questions', async (req: Request, res: Response) => {
    try {
      const { config, kisiKisiList, rawKisiText, totalRequestedQuestions } = req.body ?? {};
      if (!config || !Array.isArray(kisiKisiList)) {
        res.status(400).json({ error: 'Data konfigurasi atau kisi-kisi tidak valid.' });
        return;
      }

      const kNum = parseInt(String(config.kelas).replace(/\D/g, ''), 10) || 5;
      const optionCount = kNum <= 2 ? 3 : 4;
      const optionLabels = kNum <= 2 ? 'A, B, C' : 'A, B, C, D';
      const activeBlooms = Object.keys(config.bloomDistribution || {})
        .filter((k) => config.bloomDistribution[k])
        .join(', ');

      const kisiSummary = kisiKisiList
        .map(
          (k: Record<string, string>, i: number) =>
            `${i + 1}. CP: ${k.cp} | Materi: ${k.materi} | Indikator: ${k.indikator} | Dimensi: ${k.dimensi} | Bloom: ${k.bloom} | Kesulitan: ${k.kesulitan} | Bentuk: ${k.bentuk}`
        )
        .join('\n');

      const systemInstruction =
        'Anda adalah Pakar Penyusun Soal Asesmen Nasional & Kurikulum Merdeka Sekolah Dasar dari Dinas Pendidikan dan Kebudayaan Kabupaten Pasuruan, khusus untuk SDN Kandangan I Tosari (Kecamatan Tosari, dataran tinggi Pegunungan Tengger/Bromo). ' +
        'Susunlah butir soal asesmen berkualitas tinggi, stimulus kontekstual kearifan lokal Tengger jika relevan, akurat secara keilmuan, dan sesuai taksonomi Bloom serta tingkat kesulitan.';

      const imageInstruction = config.sertakanGambar
        ? `\nFITUR GENERATE GAMBAR PADA SOAL (AKTIF):
- Untuk soal yang membutuhkan stimulus gambar (bangun datar/ruang matematika, diagram IPA/siklus hidup rantai makanan, grafik data, peta wilayah, atau pemandangan Tengger Bromo):
  - Isi field "gambarDeskripsi" dengan deskripsi gambar ringkas.
  - Isi field "gambarUrl" dengan: https://image.pollinations.ai/prompt/<PROMPT_DALAM_BAHASA_INGGRIS>?width=600&height=400&nologo=true
- Untuk soal murni teks biasa, kosongkan string "" pada gambarUrl dan gambarDeskripsi.`
        : '';

      const totalTarget = Math.max(1, Number(totalRequestedQuestions) || 5);

      // Skenario 1: Jumlah soal <= 12, proses dalam 1 panggilan cepat
      if (totalTarget <= 12) {
        const prompt = `Buatkan paket soal resmi untuk SDN KANDANGAN I TOSARI:
- Mata Pelajaran: ${config.mapel} | Kelas: ${config.kelas} (${config.fase}) | Jenis: ${config.jenisAsesmen}
- Dimensi Lulusan: ${(config.dimensiPilihan || []).join(', ')}
- Konteks Kearifan Lokal: ${
          config.konteksLokal
            ? 'Konteks dataran tinggi Tengger/Bromo (pertanian sayur kentang/kubis, cuaca sejuk, toleransi beragama, gotong royong).'
            : 'Konteks nasional umum.'
        }

RINCIAN JUMLAH & BENTUK SOAL (Total ${totalTarget} Soal):
- Pilihan Ganda (PG): ${config.jmlPG || 0} butir (${optionLabels})
- Pilihan Ganda Kompleks (PGK): ${config.jmlPGK || 0} butir (4 opsi dengan tanda [ ], kunci lebih dari satu)
- Isian Singkat: ${config.jmlIsian || 0} butir (opsi [])
- Mencocokkan: ${config.jmlMencocokkan || 0} butir (opsi berisi 3-4 pasang "1. Premis kiri => Pasangan kanan")
- Uraian / Esai: ${config.jmlUraian || 0} butir (opsi [])
- Urutkan nomor 1 sampai ${totalTarget}.
- Sebaran Bloom: ${activeBlooms || 'C1, C2, C3, C4'}
- Tingkat Kesulitan: Mudah ~${config.propMudah || 30}%, Sedang ~${config.propSedang || 50}%, Sulit ~${config.propSulit || 20}%

ACUAN KISI-KISI:
${kisiSummary}
${rawKisiText ? `Catatan Kisi-Kisi:\n${rawKisiText}` : ''}
${imageInstruction}`;

        const result = await callUniversalAI({
          contents: prompt,
          systemInstruction,
          responseSchema: {
            type: Type.ARRAY,
            items: questionItemSchema,
          },
        });

        const parsed = extractJsonArray(result.text);
        res.json({ questions: parsed, modelUsed: result.model, provider: result.provider });
        return;
      }

      // Skenario 2: Jumlah soal > 12 (misal 20-30 soal), bagi menjadi 2 batch seimbang agar cepat dan anti-timeout
      const half = Math.ceil(totalTarget / 2);
      console.log(`[AI] Memproses ${totalTarget} soal dalam 2 batch (Batch 1: ${half} soal, Batch 2: ${totalTarget - half} soal)...`);

      const batch1Prompt = `Buatkan BATCH 1 berisi tepat ${half} butir soal (Nomor 1 sampai ${half}) untuk SDN KANDANGAN I TOSARI:
- Mata Pelajaran: ${config.mapel} | Kelas: ${config.kelas} (${config.fase})
- Bentuk: Utamakan Pilihan Ganda (${optionLabels}) dan PGK
- Dimensi Lulusan: ${(config.dimensiPilihan || []).join(', ')}
- Konteks: ${config.konteksLokal ? 'Dataran tinggi Tengger Bromo' : 'Umum'}
- Acuan Kisi-Kisi:\n${kisiSummary.slice(0, 1500)}
${imageInstruction}
Wajib kembalikan tepat ${half} butir soal bernomor 1 sampai ${half} dalam format JSON array.`;

      const batch2Prompt = `Buatkan BATCH 2 berisi tepat ${totalTarget - half} butir soal (Nomor ${half + 1} sampai ${totalTarget}) untuk SDN KANDANGAN I TOSARI:
- Mata Pelajaran: ${config.mapel} | Kelas: ${config.kelas} (${config.fase})
- Bentuk: Utamakan Isian, Mencocokkan ("1. Premis kiri => Pasangan kanan"), dan Uraian
- Dimensi Lulusan: ${(config.dimensiPilihan || []).join(', ')}
- Konteks: ${config.konteksLokal ? 'Dataran tinggi Tengger Bromo' : 'Umum'}
- Acuan Kisi-Kisi:\n${kisiSummary.slice(0, 1500)}
${imageInstruction}
Wajib kembalikan tepat ${totalTarget - half} butir soal bernomor ${half + 1} sampai ${totalTarget} dalam format JSON array.`;

      const res1 = await callUniversalAI({
        contents: batch1Prompt,
        systemInstruction,
        responseSchema: { type: Type.ARRAY, items: questionItemSchema },
      });

      await new Promise((r) => setTimeout(r, 400));

      const res2 = await callUniversalAI({
        contents: batch2Prompt,
        systemInstruction,
        responseSchema: { type: Type.ARRAY, items: questionItemSchema },
      });

      const q1 = extractJsonArray(res1.text);
      const q2 = extractJsonArray(res2.text);

      const merged = [...q1, ...q2].map((q: any, idx: number) => ({
        ...q,
        nomor: idx + 1,
      }));

      res.json({ questions: merged, modelUsed: res1.model, provider: res1.provider });
    } catch (err: unknown) {
      console.error('[AI Error]', err);
      let message = err instanceof Error ? err.message : 'Gagal menyusun soal melalui layanan AI.';
      if (message.includes('API key not valid') || message.includes('UNAUTHENTICATED')) {
        message =
          'Kunci API tidak valid. Periksa kunci pada menu Setting API, atau gunakan tombol "Buat Template Lokal" yang langsung aktif seketika tanpa perlu API Key.';
      } else if (
        message.includes('503') ||
        message.includes('high demand') ||
        message.includes('UNAVAILABLE')
      ) {
        message =
          'Layanan AI saat ini sedang mengalami lonjakan beban sesaat. Silakan tunggu beberapa detik dan coba kembali, atau gunakan tombol "Buat Template Lokal" untuk pembuatan instan tanpa menunggu AI.';
      }
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/regenerate-question', async (req: Request, res: Response) => {
    try {
      const { question, config } = req.body ?? {};
      if (!question || !config) {
        res.status(400).json({ error: 'Data soal atau konfigurasi tidak lengkap.' });
        return;
      }

      const prompt = `Buatkan 1 butir soal pengganti untuk nomor ${question.nomor} pada mata pelajaran ${config.mapel} ${config.kelas} SDN Kandangan I Tosari.
Bentuk Soal: ${question.bentuk}, Materi: ${question.materi}, Indikator: ${question.indikator}, Level Bloom: ${question.bloom}, Tingkat Kesulitan: ${question.kesulitan}, Dimensi: ${question.dimensi}.
Berikan soal baru yang berbeda dari: "${question.pertanyaan}". Format kembalian JSON tunggal sesuai skema.`;

      const result = await callUniversalAI({
        contents: prompt,
        responseSchema: questionItemSchema,
      });

      const parsed = extractJsonArray(result.text);
      const parsedQuestion = parsed[0] || parsed;
      parsedQuestion.nomor = question.nomor;
      res.json({ question: parsedQuestion, modelUsed: result.model });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal mengganti butir soal.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/generate-question-image', async (req: Request, res: Response) => {
    try {
      const { question, prompt, mode } = req.body ?? {};
      if (!question) {
        res.status(400).json({ error: 'Data butir soal wajib disertakan.' });
        return;
      }

      const visualPrompt = (
        prompt ||
        question.gambarDeskripsi ||
        question.stimulus ||
        question.pertanyaan ||
        question.materi ||
        'soal edukasi sekolah dasar'
      ).trim();

      // Mode 1: AI Realistic Photo / Illustration via Pollinations
      if (mode === 'realistic') {
        const cleanPrompt = `educational illustration for elementary school textbook, colorful, clean white background: ${visualPrompt}`;
        const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=600&height=400&nologo=true`;
        res.json({ imageUrl, deskripsi: visualPrompt });
        return;
      }

      // Mode 2: Vector SVG Diagram via Gemini
      try {
        const ai = getGeminiClient();
        const model = getGeminiModelName();
        const svgInstruction = `Buatkan KODE SVG MURNI sebagai ilustrasi stimulus soal ujian SD (SDN Kandangan I Tosari).
Topik Soal: "${question.pertanyaan}"
Materi: "${question.materi || ''}"
Deskripsi Visual yang Diminta: "${visualPrompt}"

PETUNJUK OUTPUT SVG:
1. Kembalikan HANYA kode SVG murni (harus diawali <svg viewBox="0 0 500 350" ...> dan diakhiri </svg>). Jangan sertakan backticks markdown (\`\`\`) atau teks pengantar lainnya.
2. Dimensi viewBox="0 0 500 350", lebar 100%, tinggi proporsional.
3. Desain edukatif, bersih, garis tegas, kontras tinggi, warna ramah anak, sertakan label teks yang jelas jika berupa diagram, grafik, atau bangun matematika.
4. Gunakan elemen SVG standar (<rect>, <circle>, <path>, <text>, <polygon>, <g>) dengan style inline.`;

        const response = await ai.models.generateContent({
          model,
          contents: svgInstruction,
        });

        let rawSvg = (response.text ?? '').trim();
        rawSvg = rawSvg.replace(/^```(xml|svg)?/i, '').replace(/```$/i, '').trim();
        const svgStart = rawSvg.indexOf('<svg');
        const svgEnd = rawSvg.lastIndexOf('</svg>');

        if (svgStart !== -1 && svgEnd !== -1) {
          const cleanSvg = rawSvg.substring(svgStart, svgEnd + 6);
          const base64Svg = Buffer.from(cleanSvg, 'utf-8').toString('base64');
          const imageUrl = `data:image/svg+xml;base64,${base64Svg}`;
          res.json({ imageUrl, deskripsi: visualPrompt });
          return;
        }
      } catch (geminiSvgErr) {
        console.warn('Gemini SVG generation failed, using educational image fallback:', geminiSvgErr);
      }

      // Fallback: Diagram illustration via Pollinations
      const cleanPrompt = `elementary school educational textbook diagram: ${visualPrompt}, clean white background, high contrast`;
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=600&height=400&nologo=true`;
      res.json({ imageUrl: fallbackUrl, deskripsi: visualPrompt });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Gagal menghasilkan gambar soal.';
      res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan pada http://0.0.0.0:${PORT}`);
  });
}

startServer();
