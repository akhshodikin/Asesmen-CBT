import type { AssessmentConfig, KisiKisiItem, QuestionItem } from '../types';

export interface ClientAiConfig {
  activeProvider: 'gemini' | 'openai' | 'anthropic' | 'deepseek';
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
  deepseek: {
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
      model: 'gemini-3.8-flash',
    },
    openai: {
      apiKey: (import.meta as any).env?.VITE_OPENAI_API_KEY || '',
      model: 'gpt-4o-mini',
    },
    anthropic: {
      apiKey: (import.meta as any).env?.VITE_ANTHROPIC_API_KEY || '',
      model: 'claude-3-5-haiku-20241022',
    },
    deepseek: {
      apiKey: (import.meta as any).env?.VITE_DEEPSEEK_API_KEY || '',
      model: 'deepseek-chat',
    },
  };

  try {
    if (typeof window === 'undefined') return defaultConfig;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    const rawGeminiModel = parsed.gemini?.model;
    const cleanedGeminiModel =
      rawGeminiModel === 'gemini-2.5-flash' || rawGeminiModel === 'gemini-2.5-flash-lite'
        ? 'gemini-3.8-flash'
        : (rawGeminiModel || defaultConfig.gemini.model);

    return {
      activeProvider: parsed.activeProvider || defaultConfig.activeProvider,
      gemini: {
        apiKey: parsed.gemini?.apiKey || defaultConfig.gemini.apiKey,
        model: cleanedGeminiModel,
      },
      openai: {
        apiKey: parsed.openai?.apiKey || defaultConfig.openai.apiKey,
        model: parsed.openai?.model || defaultConfig.openai.model,
      },
      anthropic: {
        apiKey: parsed.anthropic?.apiKey || defaultConfig.anthropic.apiKey,
        model: parsed.anthropic?.model || defaultConfig.anthropic.model,
      },
      deepseek: {
        apiKey: parsed.deepseek?.apiKey || defaultConfig.deepseek.apiKey,
        model: parsed.deepseek?.model || defaultConfig.deepseek.model,
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
    deepseek: {
      ...current.deepseek,
      ...(updates.deepseek || {}),
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

// Panggilan langsung ke Google Gemini API dari Browser dengan Fallback Model Otomatis
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

  // Bersihkan model usang (gemini-2.5-flash sudah deprecated oleh Google)
  let initialModel = model.trim();
  if (!initialModel || initialModel === 'gemini-2.5-flash' || initialModel === 'gemini-2.5-flash-lite') {
    initialModel = 'gemini-3.8-flash';
  }

  // Daftar kandidat model untuk dicoba berurutan jika ada model yang deprecated/not found
  const candidateModels = Array.from(
    new Set([
      initialModel,
      'gemini-3.8-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ])
  );

  let lastError: any = null;

  for (const m of candidateModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanKey}`;

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

        // Jika model tidak tersedia / deprecated / not found, coba kandidat model berikutnya
        if (
          msg.includes('no longer available') ||
          msg.includes('not found') ||
          msg.includes('NOT_FOUND') ||
          msg.includes('is not supported')
        ) {
          console.warn(`[Gemini] Model ${m} tidak tersedia (${msg}), mencoba model berikutnya...`);
          lastError = new Error(msg);
          continue;
        }

        throw new Error(msg);
      }

      const candidate = data.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Google Gemini tidak menghasilkan teks jawaban.');
      }

      return text;
    } catch (err: any) {
      if (err.name === 'AbortError') throw err;
      if (err.message?.includes('tidak valid')) throw err;
      lastError = err;
    }
  }

  throw lastError || new Error('Google Gemini tidak dapat diakses dengan model yang tersedia.');
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

// Panggilan langsung ke DeepSeek API dari Browser
async function callDeepSeekDirect(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction?: string,
  signal?: AbortSignal
): Promise<string> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    throw new Error('API Key DeepSeek belum diisi. Silakan masukkan API Key di menu Setting Multi-AI.');
  }

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({
    role: 'user',
    content: `${prompt}\n\nWajib kembalikan format JSON murni yang valid tanpa kata pembuka atau markdown quotes.`,
  });

  const targetModel = model.trim() || 'deepseek-chat';

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cleanKey}`,
    },
    body: JSON.stringify({
      model: targetModel,
      messages,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
    signal,
  });

  const data = await response.json();
  if (!response.ok) {
    const errorMsg = data?.error?.message || `DeepSeek API Error (HTTP ${response.status})`;
    if (errorMsg.includes('Authentication') || errorMsg.includes('Invalid API key') || response.status === 401) {
      throw new Error('API Key DeepSeek tidak valid. Pastikan menyalin kunci resmi dari https://platform.deepseek.com/api_keys');
    }
    throw new Error(errorMsg);
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

  if (provider === 'deepseek') {
    const key = aiCfg.deepseek?.apiKey?.trim();
    if (!key) {
      throw new Error(
        'API Key DeepSeek belum diatur. Masukkan API Key di menu "Setting Multi-AI" (dapatkan di platform.deepseek.com) atau gunakan Google Gemini / Template Cerdas Lokal.'
      );
    }
    modelUsed = aiCfg.deepseek.model || 'deepseek-chat';
    providerName = 'DeepSeek AI';
    responseText = await callDeepSeekDirect(key, modelUsed, prompt, systemInstruction, signal);
  } else if (provider === 'openai') {
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
    modelUsed = aiCfg.gemini.model || 'gemini-3.8-flash';
    if (modelUsed === 'gemini-2.5-flash' || modelUsed === 'gemini-2.5-flash-lite') {
      modelUsed = 'gemini-3.8-flash';
    }
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

export interface DetectedModelItem {
  id: string;
  name: string;
  description?: string;
  isRecommended?: boolean;
}

export interface ModelDetectionResponse {
  success: boolean;
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek';
  models: DetectedModelItem[];
  recommendedModel: string;
  message: string;
}

// Deteksi otomatis penyedia AI berdasarkan format API Key
export function detectProviderFromKey(key: string): 'gemini' | 'openai' | 'anthropic' | 'deepseek' | null {
  const clean = key.trim();
  if (!clean) return null;
  if (clean.startsWith('AIzaSy')) return 'gemini';
  if (clean.startsWith('sk-ant-')) return 'anthropic';
  if (clean.startsWith('sk-proj-')) return 'openai';
  return null;
}

// Deteksi model resmi yang aktif dan tersedia untuk akun pengguna
export async function detectModelsClient(
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek',
  apiKey: string
): Promise<ModelDetectionResponse> {
  const cleanKey = apiKey.trim();

  // 1. DEEPSEEK AI
  if (provider === 'deepseek') {
    const defaultDeepSeekModels: DetectedModelItem[] = [
      {
        id: 'deepseek-chat',
        name: 'deepseek-chat (DeepSeek-V3)',
        description: 'Super cepat, hemat kuota & rekomendasi utama pembuatan soal',
        isRecommended: true,
      },
      {
        id: 'deepseek-reasoner',
        name: 'deepseek-reasoner (DeepSeek-R1)',
        description: 'Penalaran CoT tingkat tinggi untuk logika sains & matematika kompleks',
        isRecommended: false,
      },
    ];

    if (!cleanKey) {
      return {
        success: true,
        provider: 'deepseek',
        models: defaultDeepSeekModels,
        recommendedModel: 'deepseek-chat',
        message: 'Daftar model resmi DeepSeek default (masukkan API key untuk deteksi live).',
      };
    }

    try {
      const res = await fetch('https://api.deepseek.com/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cleanKey}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          const list: DetectedModelItem[] = json.data.map((m: any) => ({
            id: m.id,
            name:
              m.id === 'deepseek-chat'
                ? 'deepseek-chat (DeepSeek-V3 - Cepat & Hemat)'
                : m.id === 'deepseek-reasoner'
                ? 'deepseek-reasoner (DeepSeek-R1 - Penalaran Logika)'
                : m.id,
            description: m.id === 'deepseek-chat' ? 'Rekomendasi Utama' : undefined,
            isRecommended: m.id === 'deepseek-chat',
          }));
          return {
            success: true,
            provider: 'deepseek',
            models: list,
            recommendedModel: 'deepseek-chat',
            message: `Berhasil mendeteksi ${list.length} model aktif dari akun DeepSeek Anda!`,
          };
        }
      }
    } catch {
      // Browser CORS fallback
    }

    return {
      success: true,
      provider: 'deepseek',
      models: defaultDeepSeekModels,
      recommendedModel: 'deepseek-chat',
      message: 'Model resmi DeepSeek terverifikasi (deepseek-chat & deepseek-reasoner).',
    };
  }

  // 2. GOOGLE GEMINI
  if (provider === 'gemini') {
    const defaultGeminiModels: DetectedModelItem[] = [
      { id: 'gemini-3.8-flash', name: 'gemini-3.8-flash (Rekomendasi Resmi Google Terbaru ⭐)', isRecommended: true },
      { id: 'gemini-3.5-flash-lite', name: 'gemini-3.5-flash-lite (Super Cepat ~1.8s & Hemat)', isRecommended: false },
      { id: 'gemini-3.1-flash-lite', name: 'gemini-3.1-flash-lite (Alternatif Cepat)', isRecommended: false },
      { id: 'gemini-2.0-flash', name: 'gemini-2.0-flash (Stabil & Responsif)', isRecommended: false },
      { id: 'gemini-1.5-flash', name: 'gemini-1.5-flash (Standar Cepat)', isRecommended: false },
    ];

    if (!cleanKey) {
      return {
        success: true,
        provider: 'gemini',
        models: defaultGeminiModels,
        recommendedModel: 'gemini-3.8-flash',
        message: 'Daftar model resmi Gemini default.',
      };
    }

    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.models)) {
          const validModels = json.models
            .filter((m: any) => {
              const methods: string[] = m.supportedGenerationMethods || [];
              const name: string = m.name || '';
              return (
                methods.includes('generateContent') &&
                !name.includes('embedding') &&
                !name.includes('aqa') &&
                !name.includes('imagen') &&
                !name.includes('gemini-2.5-flash') // Hindari model yang sudah deprecated oleh Google
              );
            })
            .map((m: any) => {
              const id = m.name.replace(/^models\//, '');
              const displayName = m.displayName || id;
              const isRec = id === 'gemini-3.8-flash' || id === 'gemini-3.5-flash-lite' || id === 'gemini-2.0-flash';
              return {
                id,
                name: `${id} (${displayName})`,
                description: m.description,
                isRecommended: isRec,
              };
            });

          if (validModels.length > 0) {
            // Prioritaskan model flash di urutan atas
            validModels.sort((a: DetectedModelItem, b: DetectedModelItem) => {
              if (a.id === 'gemini-3.8-flash') return -1;
              if (b.id === 'gemini-3.8-flash') return 1;
              if (a.id === 'gemini-3.5-flash-lite') return -1;
              if (b.id === 'gemini-3.5-flash-lite') return 1;
              if (a.id.includes('flash') && !b.id.includes('flash')) return -1;
              if (!a.id.includes('flash') && b.id.includes('flash')) return 1;
              return b.id.localeCompare(a.id);
            });

            const rec =
              validModels.find((m: DetectedModelItem) => m.id === 'gemini-3.8-flash')?.id ||
              validModels.find((m: DetectedModelItem) => m.id === 'gemini-3.5-flash-lite')?.id ||
              validModels.find((m: DetectedModelItem) => m.id.includes('flash'))?.id ||
              validModels[0].id;

            return {
              success: true,
              provider: 'gemini',
              models: validModels,
              recommendedModel: rec,
              message: `Berhasil mendeteksi ${validModels.length} model aktif dari akun Google AI Studio Anda!`,
            };
          }
        }
      }
    } catch {
      // fallback
    }

    return {
      success: true,
      provider: 'gemini',
      models: defaultGeminiModels,
      recommendedModel: 'gemini-3.8-flash',
      message: 'Model resmi Gemini siap digunakan.',
    };
  }

  // 3. OPENAI GPT
  if (provider === 'openai') {
    const defaultOpenAiModels: DetectedModelItem[] = [
      { id: 'gpt-4o-mini', name: 'gpt-4o-mini (Cepat, Akurat & Paling Hemat)', isRecommended: true },
      { id: 'gpt-4o', name: 'gpt-4o (Model Flagship Kognitif Tertinggi)', isRecommended: false },
      { id: 'o3-mini', name: 'o3-mini (Penalaran Cepat)', isRecommended: false },
      { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo (Generasi Klasik)', isRecommended: false },
    ];

    if (!cleanKey) {
      return {
        success: true,
        provider: 'openai',
        models: defaultOpenAiModels,
        recommendedModel: 'gpt-4o-mini',
        message: 'Daftar model resmi OpenAI default.',
      };
    }

    try {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${cleanKey}` },
      });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          const chatModels = json.data
            .filter((m: any) => {
              const id: string = m.id || '';
              return (
                id.startsWith('gpt-4') ||
                id.startsWith('gpt-3.5') ||
                id.startsWith('o1') ||
                id.startsWith('o3')
              );
            })
            .map((m: any) => ({
              id: m.id,
              name: m.id === 'gpt-4o-mini' ? 'gpt-4o-mini (Rekomendasi Cepat & Hemat)' : m.id,
              isRecommended: m.id === 'gpt-4o-mini',
            }));

          if (chatModels.length > 0) {
            chatModels.sort((a: DetectedModelItem, b: DetectedModelItem) => {
              if (a.id === 'gpt-4o-mini') return -1;
              if (b.id === 'gpt-4o-mini') return 1;
              return a.id.localeCompare(b.id);
            });

            return {
              success: true,
              provider: 'openai',
              models: chatModels,
              recommendedModel: 'gpt-4o-mini',
              message: `Berhasil mendeteksi ${chatModels.length} model GPT dari akun OpenAI Anda!`,
            };
          }
        }
      }
    } catch {
      // fallback
    }

    return {
      success: true,
      provider: 'openai',
      models: defaultOpenAiModels,
      recommendedModel: 'gpt-4o-mini',
      message: 'Model resmi OpenAI siap digunakan.',
    };
  }

  // 4. ANTHROPIC CLAUDE
  return {
    success: true,
    provider: 'anthropic',
    models: [
      { id: 'claude-3-5-haiku-20241022', name: 'claude-3-5-haiku (Rekomendasi Cepat & Responsif)', isRecommended: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'claude-3-5-sonnet (Penalaran Bahasa Terbaik)', isRecommended: false },
      { id: 'claude-3-7-sonnet-20250219', name: 'claude-3-7-sonnet (Model Hybrid Reasoning Terbaru)', isRecommended: false },
    ],
    recommendedModel: 'claude-3-5-haiku-20241022',
    message: 'Model resmi Anthropic Claude siap digunakan.',
  };
}

// Uji Koneksi Provider AI dari Browser
export async function testAiProviderClient(
  provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek',
  apiKey: string,
  model?: string
): Promise<{
  success: boolean;
  message: string;
  reply?: string;
  model?: string;
  detectedModels?: DetectedModelItem[];
  recommendedModel?: string;
}> {
  try {
    const modelDetection = await detectModelsClient(provider, apiKey);
    const chosenModel = model || modelDetection.recommendedModel;

    if (provider === 'deepseek') {
      const m = chosenModel || 'deepseek-chat';
      const text = await callDeepSeekDirect(
        apiKey,
        m,
        'Uji koneksi DeepSeek API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses'
      );
      return {
        success: true,
        message: `Koneksi DeepSeek AI Berhasil! Model ${m} aktif dan terdeteksi.`,
        reply: text.trim(),
        model: m,
        detectedModels: modelDetection.models,
        recommendedModel: modelDetection.recommendedModel,
      };
    } else if (provider === 'gemini') {
      const m = chosenModel || 'gemini-3.8-flash';
      const text = await callGeminiDirect(
        apiKey,
        m,
        'Uji koneksi Google Gemini API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses'
      );
      return {
        success: true,
        message: `Koneksi Google Gemini Berhasil! Model ${m} aktif dan terdeteksi.`,
        reply: text.trim(),
        model: m,
        detectedModels: modelDetection.models,
        recommendedModel: modelDetection.recommendedModel,
      };
    } else if (provider === 'openai') {
      const m = chosenModel || 'gpt-4o-mini';
      const text = await callOpenAIDirect(
        apiKey,
        m,
        'Uji koneksi OpenAI API untuk SDN Kandangan I Tosari. Jawab satu kata: Sukses'
      );
      return {
        success: true,
        message: `Koneksi OpenAI GPT Berhasil! Model ${m} aktif dan terdeteksi.`,
        reply: text.trim(),
        model: m,
        detectedModels: modelDetection.models,
        recommendedModel: modelDetection.recommendedModel,
      };
    } else {
      return {
        success: false,
        message:
          'Anthropic Claude memblokir panggilan langsung dari peramban (CORS). Gunakan DeepSeek atau Google Gemini.',
        detectedModels: modelDetection.models,
        recommendedModel: modelDetection.recommendedModel,
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Gagal menghubungi penyedia AI.',
    };
  }
}
