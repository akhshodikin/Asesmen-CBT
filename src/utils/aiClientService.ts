import type { AssessmentConfig, KisiKisiItem, QuestionItem } from '../types';

export interface ClientAiConfig {
  activeProvider: 'gemini' | 'openai' | 'anthropic';
  gemini: {
    apiKey: string;
    model: string;
  };
  openai: {
    apiKey: string;
    model: string;
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
}

const STORAGE_KEY = 'sdn_kandangan1_ai_config';

// Mengambil konfigurasi AI dari localStorage atau default
export function getStoredAiConfig(): ClientAiConfig {
  const defaultConfig: ClientAiConfig = {
    activeProvider: 'gemini',
    gemini: {
      apiKey: (import.meta as any).env?.VITE_GEMINI_API_KEY || '',
      model: 'gemini-2.5-flash',
    },
    openai: {
      apiKey: (import.meta as any).env?.VITE_OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-haiku-20241022',
    },
  };

  try {
    if (typeof window === 'undefined') return defaultConfig;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    return {
      activeProvider: parsed.activeProvider || defaultConfig.activeProvider,
      gemini: {
        apiKey: parsed.gemini?.apiKey || defaultConfig.gemini.apiKey,
        model: parsed.gemini?.model || defaultConfig.gemini.model,
      },
      openai: {
        apiKey: parsed.openai?.apiKey || defaultConfig.openai.apiKey,
        model: parsed.openai?.model || defaultConfig.openai.model,
      },
      anthropic: {
        apiKey: parsed.anthropic?.apiKey || defaultConfig.anthropic.apiKey,
        model: parsed.anthropic?.model || defaultConfig.anthropic.model,
      },
    };
  } catch {
    return defaultConfig;
  }
}

// Menyimpan konfigurasi AI ke localStorage
export function saveStoredAiConfig(updates: Partial<ClientAiConfig>): ClientAiConfig {
  const current = getStoredAiConfig();
  const next: ClientAiConfig = {
    activeProvider: updates.activeProvider || current.activeProvider,
    gemini: {
      ...current.gemini,
      ...(updates.gemini || {}),
    },
    openai: {
      ...current.openai,
      ...(updates.openai || {}),
    },
    anthropic: {
      ...current.anthropic,
      ...(updates.anthropic || {}),
    },
  };

  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore
  }

  return next;
}

// Helper pembersih respons JSON dari AI
export function extractJsonFromText(rawText: string): any[] {
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
    throw new Error('Gagal mengekstrak struktur butir soal dari respons AI.');
  }
}

// Panggilan langsung ke Google Gemini API dari Browser
async function callGeminiDirect(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  signal?: AbortSignal
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key Google Gemini belum diisi. Silakan masukkan API Key di menu Setting Multi-AI.');
  }

  // Model yang didukung: gemini-2.5-flash, gemini-2.5-flash-lite, gemini-2.0-flash, gemini-1.5-flash
  let targetModel = model.trim() || 'gemini-2.5-flash';
  if (targetModel.includes('3.5') || targetModel.includes('3.8')) {
    targetModel = 'gemini-2.5-flash';
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;

  const requestBody: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      responseMimeType: 'application/json',
    },
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || `Gemini API Error (HTTP ${response.status})`;
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      throw new Error('API Key Google Gemini tidak valid. Pastikan menyalin kunci resmi dari aistudio.google.com/apikey');
    }
    throw new Error(msg);
  }

  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Google Gemini tidak menghasilkan teks jawaban.');
  }

  return text;
}

// Panggilan langsung ke OpenAI API dari Browser
async function callOpenAIDirect(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  signal?: AbortSignal
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key OpenAI belum diisi. Silakan masukkan API Key di menu Setting Multi-AI.');
  }

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nWajib kembalikan format JSON murni yang valid tanpa kata pembuka atau markdown quotes.`,
  });

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `OpenAI API Error (HTTP ${response.status})`);
  }

  return data.choices?.[0]?.message?.content || '';
}

// Eksekusi Pembuatan Paket Soal via Client-Side AI
export async function generateQuestionsClientAI(
  config: AssessmentConfig,
  kisiKisiList: KisiKisiItem[],
  rawKisiText: string,
  totalRequestedQuestions: number,
  signal?: AbortSignal
): Promise<{ questions: QuestionItem[]; provider: string; model: string }> {
  const aiCfg = getStoredAiConfig();
  const provider = aiCfg.activeProvider;

  const kNum = parseInt(String(config.kelas).replace(/\D/g, ''), 10) || 5;
  const optionLabels = kNum <= 2 ? 'A, B, C' : 'A, B, C, D';
  const activeBlooms = Object.keys(config.bloomDistribution || {})
    .filter((k) => config.bloomDistribution[k])
    .join(', ');

  const kisiSummary = kisiKisiList
    .map(
      (k, i) =>
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
${imageInstruction}

Format kembalian wajib JSON array:
[
  {
    "nomor": 1,
    "bentuk": "PG",
    "stimulus": "Teks bacaan pengantar...",
    "pertanyaan": "Pokok pertanyaan...",
    "opsi": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "kunci": "A",
    "pembahasan": "Penjelasan kunci...",
    "skor": 1,
    "materi": "Materi...",
    "indikator": "Indikator...",
    "bloom": "C2",
    "kesulitan": "Sedang",
    "dimensi": "Bernalar Kritis",
    "gambarUrl": "",
    "gambarDeskripsi": ""
  }
]`;

  let responseText = '';
  let modelUsed = '';
  let providerName = '';

  if (provider === 'openai') {
    const key = aiCfg.openai.apiKey.trim();
    if (!key) {
      throw new Error(
        'API Key OpenAI belum diatur. Masukkan API Key di menu "Setting Multi-AI" atau gunakan Google Gemini / Template Cerdas Lokal.'
      );
    }
    modelUsed = aiCfg.openai.model || 'gpt-4o-mini';
    providerName = 'OpenAI GPT';
    responseText = await callOpenAIDirect(key, modelUsed, prompt, systemInstruction, signal);
  } else {
    // Default: Google Gemini
    const key = aiCfg.gemini.apiKey.trim();
    if (!key) {
      throw new Error(
        'Koneksi server AI tidak tersedia di hosting Firebase. Untuk membuat soal AI langsung dari browser, silakan masukkan API Key Gemini Anda di menu "Setting Multi-AI" (pojok kanan atas), ATAU gunakan tombol "Gunakan Template Cerdas Lokal" di bawah ini yang siap pakai seketika!'
      );
    }
    modelUsed = aiCfg.gemini.model || 'gemini-2.5-flash';
    providerName = 'Google Gemini';
    responseText = await callGeminiDirect(key, modelUsed, prompt, systemInstruction, signal);
  }

  const parsedArray = extractJsonFromText(responseText);

  const formattedQuestions: QuestionItem[] = parsedArray.map((q: any, idx: number) => ({
    nomor: idx + 1,
    bentuk: q.bentuk || 'PG',
    stimulus: q.stimulus || '',
    pertanyaan: q.pertanyaan || 'Pertanyaan asesmen',
    opsi: Array.isArray(q.opsi) ? q.opsi : [],
    kunci: String(q.kunci || (q.bentuk === 'PG' ? 'A' : '')),
    pembahasan: q.pembahasan || 'Pembahasan kunci jawaban.',
    skor: Number(q.skor || 1),
    materi: q.materi || config.mapel,
    indikator: q.indikator || `Indikator soal ${idx + 1}`,
    bloom: q.bloom || 'C2',
    kesulitan: q.kesulitan || 'Sedang',
    dimensi: q.dimensi || (config.dimensiPilihan?.[0] || 'Mandiri'),
    gambarUrl: q.gambarUrl || undefined,
    gambarDeskripsi: q.gambarDeskripsi || undefined,
  }));

  return {
    questions: formattedQuestions,
    provider: providerName,
    model: modelUsed,
  };
}

// Uji Koneksi Provider AI dari Browser
export async function testAiProviderClient(
  provider: 'gemini' | 'openai' | 'anthropic',
  apiKey: string,
  model?: string
): Promise<{ success: boolean; message: string; reply?: string; model?: string }> {
  try {
    if (provider === 'gemini') {
      const m = model || 'gemini-2.5-flash';
      const text = await callGeminiDirect(
        apiKey,
        m,
        'Uji koneksi Google Gemini API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses'
      );
      return {
        success: true,
        message: `Koneksi Google Gemini Berhasil! Terhubung langsung ke model ${m}.`,
        reply: text.trim(),
        model: m,
      };
    } else if (provider === 'openai') {
      const m = model || 'gpt-4o-mini';
      const text = await callOpenAIDirect(
        apiKey,
        m,
        'Uji koneksi OpenAI API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses'
      );
      return {
        success: true,
        message: `Koneksi OpenAI GPT Berhasil! Terhubung ke model ${m}.`,
        reply: text.trim(),
        model: m,
      };
    } else {
      return {
        success: false,
        message: 'Anthropic Claude memblokir panggilan langsung dari peramban (CORS). Gunakan Google Gemini atau OpenAI.',
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menghubungi penyedia AI.',
    };
  }
}
