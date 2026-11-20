import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Bot,
  Brain,
  Check,
  CheckCircle2,
  ClipboardList,
  Cpu,
  ExternalLink,
  HelpCircle,
  Image as ImageIcon,
  Key,
  Layers,
  Plus,
  RefreshCw,
  Settings,
  Shuffle,
  Sparkles,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { BLOOM_LEVELS, EIGHT_DIMENSIONS, SUBJECTS } from '../data/schoolData';
import type { AssessmentConfig, KisiKisiItem } from '../types';
import {
  DetectedModelItem,
  detectModelsClient,
  detectProviderFromKey,
  getStoredAiConfig,
  saveStoredAiConfig,
  testAiProviderClient,
} from '../utils/aiClientService';
import { generateRandomToken } from '../utils/cbtPackageHelpers';

interface TabConfigKisiProps {
  config: AssessmentConfig;
  setConfig: React.Dispatch<React.SetStateAction<AssessmentConfig>>;
  kisiKisiList: KisiKisiItem[];
  setKisiKisiList: React.Dispatch<React.SetStateAction<KisiKisiItem[]>>;
  rawKisiText: string;
  setRawKisiText: React.Dispatch<React.SetStateAction<string>>;
  uploadStatus: string;
  isGenerating: boolean;
  genElapsedSeconds?: number;
  genError: string;
  totalRequestedQuestions: number;
  onGenerateAI: () => void;
  onCancelGenerateAI?: () => void;
  onGenerateLocalTemplate: () => void;
  onLoadTemplateKisi: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onParseRawText: (text: string, sourceName?: string) => void;
}

export const TabConfigKisi: React.FC<TabConfigKisiProps> = ({
  config,
  setConfig,
  kisiKisiList,
  setKisiKisiList,
  rawKisiText,
  setRawKisiText,
  uploadStatus,
  isGenerating,
  genElapsedSeconds = 0,
  genError,
  totalRequestedQuestions,
  onGenerateAI,
  onCancelGenerateAI,
  onGenerateLocalTemplate,
  onLoadTemplateKisi,
  onFileUpload,
  onParseRawText,
}) => {
  // Multi-AI Provider State (Gemini, DeepSeek, OpenAI GPT, Anthropic Claude)
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [activeProviderTab, setActiveProviderTab] = useState<'gemini' | 'openai' | 'anthropic' | 'deepseek'>('gemini');
  const [selectedMainProvider, setSelectedMainProvider] = useState<string>('gemini');

  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [geminiModelInput, setGeminiModelInput] = useState('gemini-3.5-flash-lite');

  const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
  const [deepseekModelInput, setDeepseekModelInput] = useState('deepseek-chat');

  const [openaiKeyInput, setOpenaiKeyInput] = useState('');
  const [openaiModelInput, setOpenaiModelInput] = useState('gpt-4o-mini');

  const [anthropicKeyInput, setAnthropicKeyInput] = useState('');
  const [anthropicModelInput, setAnthropicModelInput] = useState('claude-3-5-haiku-20241022');

  // Deteksi Model Otomatis State
  const [detectedModels, setDetectedModels] = useState<{
    gemini: DetectedModelItem[];
    deepseek: DetectedModelItem[];
    openai: DetectedModelItem[];
    anthropic: DetectedModelItem[];
  }>({
    gemini: [],
    deepseek: [],
    openai: [],
    anthropic: [],
  });
  const [isDetectingModel, setIsDetectingModel] = useState(false);
  const [modelDetectStatus, setModelDetectStatus] = useState<{ [key: string]: string }>({});
  const [smartKeyInput, setSmartKeyInput] = useState('');

  const [isSavingKey, setIsSavingKey] = useState(false);
  const [saveKeySuccess, setSaveKeySuccess] = useState(false);
  const [saveKeyError, setSaveKeyError] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testKeyResult, setTestKeyResult] = useState<{
    success: boolean;
    message: string;
    reply?: string;
    model?: string;
    provider?: string;
  } | null>(null);

  const [aiConfig, setAiConfig] = useState<any>(null);

  const handleAutoDetectModel = async (
    targetProv: 'gemini' | 'openai' | 'anthropic' | 'deepseek' = activeProviderTab,
    customKey?: string
  ) => {
    setIsDetectingModel(true);
    let keyToUse = (customKey !== undefined ? customKey : '').trim();
    if (!keyToUse) {
      if (targetProv === 'gemini') keyToUse = geminiKeyInput.trim();
      else if (targetProv === 'deepseek') keyToUse = deepseekKeyInput.trim();
      else if (targetProv === 'openai') keyToUse = openaiKeyInput.trim();
      else if (targetProv === 'anthropic') keyToUse = anthropicKeyInput.trim();
    }

    let detected: any = null;

    // 1. Coba lewat backend jika ada
    try {
      const res = await fetch('/api/detect-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: targetProv, apiKey: keyToUse }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.models)) {
          detected = data;
        }
      }
    } catch {
      // offline/firebase hosting
    }

    // 2. Client-side fallback (Firebase Hosting)
    if (!detected) {
      detected = await detectModelsClient(targetProv, keyToUse);
    }

    if (detected && detected.models && detected.models.length > 0) {
      setDetectedModels((prev) => ({
        ...prev,
        [targetProv]: detected.models,
      }));

      // Set model terpilih otomatis ke rekomendasi
      if (targetProv === 'gemini' && detected.recommendedModel) {
        setGeminiModelInput(detected.recommendedModel);
      } else if (targetProv === 'deepseek' && detected.recommendedModel) {
        setDeepseekModelInput(detected.recommendedModel);
      } else if (targetProv === 'openai' && detected.recommendedModel) {
        setOpenaiModelInput(detected.recommendedModel);
      } else if (targetProv === 'anthropic' && detected.recommendedModel) {
        setAnthropicModelInput(detected.recommendedModel);
      }

      setModelDetectStatus((prev) => ({
        ...prev,
        [targetProv]:
          detected.message ||
          `✓ Berhasil mendeteksi ${detected.models.length} model resmi (Terpilih: ${detected.recommendedModel})`,
      }));
    }

    setIsDetectingModel(false);
  };

  const handleSmartKeyPaste = async (pastedKey: string) => {
    const clean = pastedKey.trim();
    setSmartKeyInput(clean);
    if (!clean) return;

    let targetProv: 'gemini' | 'openai' | 'anthropic' | 'deepseek' = activeProviderTab;
    const detectedProv = detectProviderFromKey(clean);
    if (detectedProv) {
      targetProv = detectedProv;
    } else if (clean.startsWith('sk-')) {
      targetProv =
        activeProviderTab === 'deepseek'
          ? 'deepseek'
          : activeProviderTab === 'openai'
          ? 'openai'
          : 'deepseek';
    }

    setActiveProviderTab(targetProv);
    setSelectedMainProvider(targetProv);
    if (targetProv === 'gemini') setGeminiKeyInput(clean);
    else if (targetProv === 'deepseek') setDeepseekKeyInput(clean);
    else if (targetProv === 'openai') setOpenaiKeyInput(clean);
    else if (targetProv === 'anthropic') setAnthropicKeyInput(clean);

    await handleAutoDetectModel(targetProv, clean);
  };

  const fetchAiConfig = async () => {
    // 1. Ambil dari localStorage terlebih dahulu (Bekerja 100% di browser & Firebase Hosting)
    const stored = getStoredAiConfig();
    if (stored.activeProvider) {
      setSelectedMainProvider(stored.activeProvider);
      setActiveProviderTab(stored.activeProvider as 'gemini' | 'openai' | 'anthropic' | 'deepseek');
    }
    if (stored.gemini?.apiKey) setGeminiKeyInput(stored.gemini.apiKey);
    if (stored.gemini?.model) setGeminiModelInput(stored.gemini.model);
    if (stored.deepseek?.apiKey) setDeepseekKeyInput(stored.deepseek.apiKey);
    if (stored.deepseek?.model) setDeepseekModelInput(stored.deepseek.model);
    if (stored.openai?.apiKey) setOpenaiKeyInput(stored.openai.apiKey);
    if (stored.openai?.model) setOpenaiModelInput(stored.openai.model);
    if (stored.anthropic?.apiKey) setAnthropicKeyInput(stored.anthropic.apiKey);
    if (stored.anthropic?.model) setAnthropicModelInput(stored.anthropic.model);

    // 2. Coba sinkronisasi dengan server backend lokal jika ada
    try {
      const res = await fetch('/api/ai-config');
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setAiConfig(data);
        if (data.activeProvider) {
          setSelectedMainProvider(data.activeProvider);
          setActiveProviderTab(data.activeProvider as 'gemini' | 'openai' | 'anthropic' | 'deepseek');
        }
        if (data.gemini?.model && !stored.gemini?.model) setGeminiModelInput(data.gemini.model);
        if (data.deepseek?.model && !stored.deepseek?.model) setDeepseekModelInput(data.deepseek.model);
        if (data.openai?.model && !stored.openai?.model) setOpenaiModelInput(data.openai.model);
        if (data.anthropic?.model && !stored.anthropic?.model) setAnthropicModelInput(data.anthropic.model);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchAiConfig();
  }, []);

  const handleTestProvider = async (provider: 'gemini' | 'openai' | 'anthropic' | 'deepseek') => {
    setIsTestingKey(true);
    setTestKeyResult(null);
    let apiKey = '';
    let model = '';
    if (provider === 'gemini') {
      apiKey = geminiKeyInput.trim();
      model = geminiModelInput;
    } else if (provider === 'deepseek') {
      apiKey = deepseekKeyInput.trim();
      model = deepseekModelInput;
    } else if (provider === 'openai') {
      apiKey = openaiKeyInput.trim();
      model = openaiModelInput;
    } else if (provider === 'anthropic') {
      apiKey = anthropicKeyInput.trim();
      model = anthropicModelInput;
    }

    let testedViaBackend = false;

    // 1. Coba lewat backend jika ada
    try {
      const res = await fetch('/api/test-ai-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        setTestKeyResult(data);
        testedViaBackend = true;
      }
    } catch {
      // Backend not running / offline
    }

    // 2. Jika di Firebase Hosting (tanpa backend), uji langsung dari Browser
    if (!testedViaBackend) {
      const clientResult = await testAiProviderClient(provider, apiKey, model);
      setTestKeyResult(clientResult);
      if (clientResult.detectedModels && clientResult.detectedModels.length > 0) {
        setDetectedModels((prev) => ({
          ...prev,
          [provider]: clientResult.detectedModels!,
        }));
        if (clientResult.recommendedModel) {
          if (provider === 'gemini') setGeminiModelInput(clientResult.recommendedModel);
          else if (provider === 'deepseek') setDeepseekModelInput(clientResult.recommendedModel);
          else if (provider === 'openai') setOpenaiModelInput(clientResult.recommendedModel);
          else if (provider === 'anthropic') setAnthropicModelInput(clientResult.recommendedModel);
        }
      }
    }

    // Jalankan juga deteksi model
    await handleAutoDetectModel(provider, apiKey);

    setIsTestingKey(false);
  };

  const handleSaveAiConfig = async (triggerGenerate = false) => {
    setIsSavingKey(true);
    setSaveKeyError('');

    // 1. Simpan langsung ke localStorage (Permanen di browser)
    saveStoredAiConfig({
      activeProvider: selectedMainProvider as any,
      gemini: {
        apiKey: geminiKeyInput.trim(),
        model: geminiModelInput,
      },
      deepseek: {
        apiKey: deepseekKeyInput.trim(),
        model: deepseekModelInput,
      },
      openai: {
        apiKey: openaiKeyInput.trim(),
        model: openaiModelInput,
      },
      anthropic: {
        apiKey: anthropicKeyInput.trim(),
        model: anthropicModelInput,
      },
    });

    // 2. Coba simpan ke backend jika backend aktif
    try {
      await fetch('/api/save-ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeProvider: selectedMainProvider,
          geminiApiKey: geminiKeyInput.trim(),
          geminiModel: geminiModelInput,
          deepseekApiKey: deepseekKeyInput.trim(),
          deepseekModel: deepseekModelInput,
          openaiApiKey: openaiKeyInput.trim(),
          openaiModel: openaiModelInput,
          anthropicApiKey: anthropicKeyInput.trim(),
          anthropicModel: anthropicModelInput,
        }),
      });
    } catch {
      // ignore
    }

    setSaveKeySuccess(true);
    setIsSavingKey(false);
    fetchAiConfig();
    if (triggerGenerate) {
      setTimeout(() => {
        setShowApiKeyModal(false);
        setSaveKeySuccess(false);
        onGenerateAI();
      }, 800);
    } else {
      setTimeout(() => {
        setSaveKeySuccess(false);
      }, 3000);
    }
  };

  const addKisiRow = () => {
    setKisiKisiList((prev) => [
      ...prev,
      {
        cp: `Capaian Pembelajaran ${config.mapel} ${config.fase}`,
        materi: 'Materi Baru',
        indikator: 'Peserta didik dapat menganalisis...',
        dimensi: 'Penalaran Kritis',
        bloom: 'C3',
        kesulitan: 'Sedang',
        bentuk: 'PG',
      },
    ]);
  };

  const updateKisiRow = (index: number, field: keyof KisiKisiItem, value: string) => {
    setKisiKisiList((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeKisiRow = (index: number) => {
    setKisiKisiList((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleDimensi = (dim: string) => {
    setConfig((prev) => {
      const exists = prev.dimensiPilihan.includes(dim);
      if (exists && prev.dimensiPilihan.length === 1) return prev;
      return {
        ...prev,
        dimensiPilihan: exists
          ? prev.dimensiPilihan.filter((d) => d !== dim)
          : [...prev.dimensiPilihan, dim],
      };
    });
  };

  const toggleBloom = (code: string) => {
    setConfig((prev) => ({
      ...prev,
      bloomDistribution: {
        ...prev.bloomDistribution,
        [code]: !prev.bloomDistribution[code],
      },
    }));
  };

  const optionCountLabel =
    (parseInt(config.kelas.replace(/\D/g, ''), 10) || 5) <= 2 ? '3 Opsi (A-C)' : '4 Opsi (A-D)';

  return (
    <div className="space-y-6 no-print">
      {/* Top Action Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <span>Kurikulum Merdeka</span>
            <span aria-hidden="true">·</span>
            <span>Naskah Cetak, Simulasi CBT &amp; Google Form</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Penyusunan Instrumen Asesmen Semester Tahun Pelajaran {config.tahunPelajaran}
          </h2>
          <p className="text-sm text-slate-600 max-w-3xl">
            Susun butir soal sesuai kisi-kisi guru, sebaran Taksonomi Bloom, dan 8 Dimensi Lulusan untuk
            Naskah Cetak, Portal Ujian CBT, serta Google Forms otomatis.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              setSaveKeyError('');
              setSaveKeySuccess(false);
              setTestKeyResult(null);
              fetchAiConfig();
              setShowApiKeyModal(true);
            }}
            className="px-3.5 py-2.5 rounded-lg border border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 shadow-2xs"
            title="Buka Pengaturan AI (Gemini, OpenAI GPT, Anthropic Claude)"
          >
            <Cpu className="w-4 h-4 text-purple-700" />
            <span>Setting AI (Gemini / GPT / Claude)</span>
            <span
              className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
              title="Provider AI Siap Digunakan"
            />
          </button>
          <button
            type="button"
            onClick={onGenerateLocalTemplate}
            disabled={isGenerating}
            className="px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Buat Template Lokal ({totalRequestedQuestions})</span>
          </button>
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={isGenerating}
            className="flex-1 lg:flex-initial flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-75 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-200" />
                <span>Menyusun AI ({genElapsedSeconds}s)...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Generate {totalRequestedQuestions} Soal AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isGenerating && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-xl p-4 shadow-xs space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <RefreshCw className="w-5 h-5 text-emerald-700 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-950">
                  Sedang Menyusun {totalRequestedQuestions} Soal dengan Google Gemini AI Flash Lite...
                </p>
                <p className="text-xs text-emerald-800">
                  Waktu proses: <span className="font-mono font-bold text-emerald-950">{genElapsedSeconds} detik</span> • Memadukan taksonomi Bloom & kearifan lokal Tengger Tosari
                </p>
              </div>
            </div>
            {onCancelGenerateAI && (
              <button
                type="button"
                onClick={onCancelGenerateAI}
                className="text-xs bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 hover:border-rose-400 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 self-start sm:self-center shadow-xs"
              >
                Batalkan &amp; Gunakan Template Lokal
              </button>
            )}
          </div>
          <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(95, Math.max(5, (genElapsedSeconds / 25) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {genError && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 text-amber-950 p-4 rounded-xl space-y-3 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-amber-700 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-sm text-amber-950">
                {genError.includes('GEMINI_API_KEY')
                  ? 'Konfigurasi Google Gemini API Key Diperlukan untuk Fitur AI'
                  : 'Informasi Pembuatan Soal AI'}
              </p>
              <p className="text-xs text-amber-900 leading-relaxed">
                {genError.includes('GEMINI_API_KEY')
                  ? 'Untuk menyusun butir soal baru secara otomatis menggunakan kecerdasan buatan Gemini AI, server memerlukan API Key gratis dari Google AI Studio. Namun Anda juga dapat langsung membuat seluruh paket soal berkualitas tinggi menggunakan tombol "Buat Template Lokal" di bawah ini secara instan tanpa perlu API Key!'
                  : genError}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/70">
            <button
              type="button"
              onClick={onGenerateLocalTemplate}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Layers className="w-4 h-4" />
              <span>Gunakan Template Cerdas Lokal Sekarang (Gratis &amp; Instan)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveKeyError('');
                setSaveKeySuccess(false);
                setShowApiKeyModal(true);
              }}
              className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
            >
              <Key className="w-4 h-4" />
              <span>Masukkan Gemini API Key</span>
            </button>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950 hover:underline px-2 py-2 cursor-pointer"
            >
              <span>Dapatkan API Key Gratis di Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Main 2-Column Config Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 space-y-6">
          {/* Identitas Asesmen & CBT */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BookOpen className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                01. Identitas Asesmen, Guru &amp; Pengaturan CBT
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Jenis Asesmen
                </label>
                <select
                  value={config.jenisAsesmen}
                  onChange={(e) => setConfig({ ...config, jenisAsesmen: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value="SUMATIF AKHIR SEMESTER (SAS) GANJIL">
                    Sumatif Akhir Semester (SAS) Ganjil
                  </option>
                  <option value="SUMATIF AKHIR TAHUN (SAT) / GENAP">
                    Sumatif Akhir Tahun (SAT) / Semester Genap
                  </option>
                  <option value="SUMATIF TENGAH SEMESTER (STS)">Sumatif Tengah Semester (STS)</option>
                  <option value="ASESMEN SUMATIF AKHIR JENJANG (ASAJ)">
                    Asesmen Sumatif Akhir Jenjang (Kelas 6)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Kelas (Otomatis Guru)
                </label>
                <select
                  value={config.kelas}
                  onChange={(e) => setConfig({ ...config, kelas: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-semibold text-emerald-950 bg-emerald-50/40 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Fase Kurikulum
                </label>
                <input
                  type="text"
                  value={config.fase}
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-slate-700 font-medium"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mata Pelajaran Nasional
                </label>
                <select
                  value={config.mapel}
                  onChange={(e) => setConfig({ ...config, mapel: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Guru Kelas / Mapel
                </label>
                <input
                  type="text"
                  value={config.guruNama}
                  onChange={(e) => setConfig({ ...config, guruNama: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">NIP Guru</label>
                <input
                  type="text"
                  value={config.guruNip}
                  onChange={(e) => setConfig({ ...config, guruNip: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Hari, Tanggal Ujian
                </label>
                <input
                  type="text"
                  value={config.hariTanggal}
                  onChange={(e) => setConfig({ ...config, hariTanggal: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Alokasi Waktu Cetak
                </label>
                <input
                  type="text"
                  value={config.waktu}
                  onChange={(e) => setConfig({ ...config, waktu: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Token Ujian CBT &amp; GForm (Acak)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={config.tokenCBT}
                    onChange={(e) =>
                      setConfig({ ...config, tokenCBT: e.target.value.toUpperCase() })
                    }
                    className="flex-1 min-w-0 rounded-lg border border-emerald-400 bg-emerald-50/40 font-mono font-bold text-emerald-950 px-3 py-2"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setConfig({
                        ...config,
                        tokenCBT: generateRandomToken(config.mapel.slice(0, 3)),
                      })
                    }
                    className="px-3 py-2 rounded-lg border border-emerald-400 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                    title="Buat token acak baru"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Acak</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-emerald-800 mb-1">
                  Durasi Timer CBT (Menit)
                </label>
                <input
                  type="number"
                  min={10}
                  max={180}
                  value={config.durasiMenit}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      durasiMenit: Math.max(10, parseInt(e.target.value || '60', 10)),
                    })
                  }
                  className="w-full rounded-lg border border-emerald-400 bg-emerald-50/40 font-mono font-bold text-emerald-950 px-3 py-2"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={config.konteksLokal}
                  onChange={(e) => setConfig({ ...config, konteksLokal: e.target.checked })}
                  className="mt-1 rounded text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  <strong className="text-slate-800 block">
                    Integrasi Konteks Lokal SDN Kandangan I Tosari
                  </strong>
                  Sertakan stimulus kontekstual lingkungan Pegunungan Tengger/Bromo, pertanian
                  dataran tinggi, dan kerukunan masyarakat Kecamatan Tosari.
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer select-none bg-purple-50/70 border border-purple-200/80 p-2.5 rounded-lg">
                <input
                  type="checkbox"
                  checked={!!config.sertakanGambar}
                  onChange={(e) => setConfig({ ...config, sertakanGambar: e.target.checked })}
                  className="mt-1 rounded text-purple-700 focus:ring-purple-600"
                />
                <span className="text-xs text-purple-950 leading-relaxed">
                  <strong className="text-purple-900 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-purple-700" />
                    <span>Fitur Generate Gambar / Stimulus Visual pada Soal</span>
                  </strong>
                  Otomatis menghasilkan gambar ilustrasi, diagram bangun datar/ruang matematika, bagan sains, peta, atau pemandangan alam pendukung soal.
                </span>
              </label>
            </div>
          </section>

          {/* Jumlah Soal & Taksonomi Bloom */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">
                  02. Jumlah Soal &amp; Taksonomi Bloom
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-800 font-mono tabular-nums">
                Total: {totalRequestedQuestions} Soal
              </span>
            </div>

            {/* Jumlah per Bentuk */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Tentukan Jumlah Soal per Bentuk (PG, Isian, Esai, Mencocokkan, PGK)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Pilihan Ganda (PG)
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.jmlPG}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        jmlPG: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className="w-full mt-1 font-mono font-bold text-base text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                  <span className="text-[11px] text-emerald-700 font-medium mt-0.5 block">
                    {optionCountLabel}
                  </span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block">Isian Singkat</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={config.jmlIsian}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        jmlIsian: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className="w-full mt-1 font-mono font-bold text-base text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Jawaban Pendek</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block">Esai / Uraian</span>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={config.jmlUraian}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        jmlUraian: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className="w-full mt-1 font-mono font-bold text-base text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Penalaran HOTS</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block">Mencocokkan</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={config.jmlMencocokkan || 0}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        jmlMencocokkan: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className="w-full mt-1 font-mono font-bold text-base text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Menjodohkan</span>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-xs font-semibold text-slate-700 block">PG Kompleks</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={config.jmlPGK}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        jmlPGK: Math.max(0, parseInt(e.target.value || '0', 10)),
                      })
                    }
                    className="w-full mt-1 font-mono font-bold text-base text-slate-900 bg-white border border-slate-300 rounded px-2 py-1"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">Multi Jawaban</span>
                </div>
              </div>
            </div>

            {/* Tingkat Kesulitan */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Proporsi Tingkat Kesulitan (%)
              </p>
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-2">
                  <span className="text-xs font-semibold text-emerald-900 block">Mudah (L1)</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.propMudah}
                      onChange={(e) =>
                        setConfig({ ...config, propMudah: parseInt(e.target.value || '0', 10) })
                      }
                      className="w-14 text-center font-mono font-bold text-emerald-950 bg-white border border-emerald-300 rounded px-1 py-0.5 text-sm"
                    />
                    <span className="text-xs text-emerald-800">%</span>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-2">
                  <span className="text-xs font-semibold text-amber-900 block">Sedang (L2)</span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.propSedang}
                      onChange={(e) =>
                        setConfig({ ...config, propSedang: parseInt(e.target.value || '0', 10) })
                      }
                      className="w-14 text-center font-mono font-bold text-amber-950 bg-white border border-amber-300 rounded px-1 py-0.5 text-sm"
                    />
                    <span className="text-xs text-amber-800">%</span>
                  </div>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2">
                  <span className="text-xs font-semibold text-rose-900 block">
                    Sulit / HOTS (L3)
                  </span>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={config.propSulit}
                      onChange={(e) =>
                        setConfig({ ...config, propSulit: parseInt(e.target.value || '0', 10) })
                      }
                      className="w-14 text-center font-mono font-bold text-rose-950 bg-white border border-rose-300 rounded px-1 py-0.5 text-sm"
                    />
                    <span className="text-xs text-rose-800">%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Taksonomi Bloom */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Level Kognitif Taksonomi Bloom (C1 – C6)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BLOOM_LEVELS.map((b) => {
                  const checked = config.bloomDistribution[b.code];
                  return (
                    <button
                      key={b.code}
                      type="button"
                      onClick={() => toggleBloom(b.code)}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                        checked
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{b.label}</span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded shrink-0 ml-1 ${
                          checked ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {b.category}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8 Dimensi Lulusan */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-2">
                Fokus 8 Dimensi Lulusan Kurikulum Merdeka
              </p>
              <div className="flex flex-wrap gap-1.5">
                {EIGHT_DIMENSIONS.map((dim) => {
                  const active = config.dimensiPilihan.includes(dim);
                  return (
                    <button
                      key={dim}
                      type="button"
                      onClick={() => toggleDimensi(dim)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-700 text-white border-emerald-700 font-medium'
                          : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {dim}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Kisi-Kisi */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    03. Upload &amp; Editor Kisi-Kisi Asesmen
                  </h3>
                  <p className="text-xs text-slate-500">
                    Unggah file kisi-kisi (.csv/.txt), tempel dari Excel/Word, atau edit tabel
                    indikator.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={onLoadTemplateKisi}
                  className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-950 font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Muat Template {config.mapel.split(' ')[0]}
                </button>
                <label className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                  <input
                    type="file"
                    accept=".csv,.txt,.tsv"
                    onChange={onFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {uploadStatus && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{uploadStatus}</span>
              </div>
            )}

            {/* Quick Paste Box */}
            <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-slate-700">
                  Salin &amp; Tempel (Copy-Paste) Kisi-Kisi dari Word / Excel (Opsional)
                </label>
                {rawKisiText && (
                  <button
                    type="button"
                    onClick={() => onParseRawText(rawKisiText, 'Teks Paste')}
                    className="text-xs bg-emerald-700 text-white px-3 py-1 rounded-md font-semibold hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
                  >
                    Konversi ke Tabel
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                value={rawKisiText}
                onChange={(e) => setRawKisiText(e.target.value)}
                placeholder="Tempelkan baris indikator soal atau materi dari Excel/Word di sini, lalu klik 'Konversi ke Tabel'..."
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>

            {/* Interactive Kisi-Kisi Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  Daftar Indikator Kisi-Kisi ({kisiKisiList.length} Indikator Inti)
                </span>
                <button
                  type="button"
                  onClick={addKisiRow}
                  className="flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Indikator
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                      <th className="p-2.5 w-8 text-center">No</th>
                      <th className="p-2.5 min-w-[140px]">Materi &amp; CP</th>
                      <th className="p-2.5 min-w-[200px]">Indikator Soal</th>
                      <th className="p-2.5 w-20">Bloom</th>
                      <th className="p-2.5 w-24">Kesulitan</th>
                      <th className="p-2.5 w-24">Bentuk</th>
                      <th className="p-2.5 w-10 text-center">Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {kisiKisiList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-mono font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-2 space-y-1">
                          <input
                            type="text"
                            value={item.materi}
                            onChange={(e) => updateKisiRow(idx, 'materi', e.target.value)}
                            placeholder="Materi Pokok"
                            className="w-full font-semibold text-slate-800 border border-slate-200 rounded px-2 py-1"
                          />
                          <input
                            type="text"
                            value={item.cp}
                            onChange={(e) => updateKisiRow(idx, 'cp', e.target.value)}
                            placeholder="Capaian Pembelajaran"
                            className="w-full text-[11px] text-slate-500 border border-slate-200 rounded px-2 py-1"
                          />
                        </td>
                        <td className="p-2">
                          <textarea
                            rows={2}
                            value={item.indikator}
                            onChange={(e) => updateKisiRow(idx, 'indikator', e.target.value)}
                            className="w-full border border-slate-200 rounded p-1.5 text-slate-700"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={item.bloom}
                            onChange={(e) => updateKisiRow(idx, 'bloom', e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-1 font-mono font-semibold text-emerald-900 bg-emerald-50/40"
                          >
                            {['C1', 'C2', 'C3', 'C4', 'C5', 'C6'].map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={item.kesulitan}
                            onChange={(e) => updateKisiRow(idx, 'kesulitan', e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-1"
                          >
                            <option value="Mudah">Mudah</option>
                            <option value="Sedang">Sedang</option>
                            <option value="Sulit">Sulit</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={item.bentuk}
                            onChange={(e) => updateKisiRow(idx, 'bentuk', e.target.value)}
                            className="w-full border border-slate-200 rounded px-1.5 py-1"
                          >
                            <option value="PG">PG</option>
                            <option value="PGK">PGK</option>
                            <option value="Isian">Isian</option>
                            <option value="Mencocokkan">Mencocokkan</option>
                            <option value="Uraian">Esai / Uraian</option>
                          </select>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeKisiRow(idx)}
                            className="text-rose-600 hover:text-rose-800 p-1 cursor-pointer"
                            title="Hapus Indikator"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3.5 flex items-start gap-3 text-xs text-amber-950">
              <HelpCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Pengembangan Proporsional:</strong> Dari {kisiKisiList.length} indikator
                inti yang tersusun di atas, sistem otomatis mengembangkan menjadi tepat{' '}
                <strong>{totalRequestedQuestions} butir soal</strong> sesuai proporsi Tingkat
                Kesulitan dan Taksonomi Bloom (C1–C6).
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ============================================================
          MODAL KONFIGURASI MULTI-AI (GEMINI, OPENAI GPT, ANTHROPIC CLAUDE)
          ============================================================ */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-700 text-white rounded-xl shadow-xs">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pengaturan Multi-AI (Gemini, DeepSeek, GPT &amp; Claude)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pilih model kecerdasan buatan favorit Anda untuk menyusun butir asesmen otomatis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Provider Tabs Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-slate-200 bg-slate-50/70 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setActiveProviderTab('gemini');
                  setTestKeyResult(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeProviderTab === 'gemini'
                    ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">Gemini</span>
                {selectedMainProvider === 'gemini' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Provider Utama Aktif" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProviderTab('deepseek');
                  setTestKeyResult(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeProviderTab === 'deepseek'
                    ? 'bg-white text-blue-900 shadow-xs border border-blue-300'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Zap className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="truncate">DeepSeek</span>
                {selectedMainProvider === 'deepseek' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Provider Utama Aktif" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProviderTab('openai');
                  setTestKeyResult(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeProviderTab === 'openai'
                    ? 'bg-white text-emerald-900 shadow-xs border border-emerald-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Bot className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">OpenAI</span>
                {selectedMainProvider === 'openai' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Provider Utama Aktif" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveProviderTab('anthropic');
                  setTestKeyResult(null);
                }}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeProviderTab === 'anthropic'
                    ? 'bg-white text-amber-900 shadow-xs border border-amber-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Brain className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="truncate">Claude</span>
                {selectedMainProvider === 'anthropic' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Provider Utama Aktif" />
                )}
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[68vh] overflow-y-auto">
              {/* Smart Key & Provider Auto-Detector */}
              <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-emerald-50 border border-blue-200/90 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-slate-900">
                      Deteksi Cerdas API Key &amp; Model Otomatis
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-800 bg-blue-100/90 px-2 py-0.5 rounded-full border border-blue-200">
                    Otomatis
                  </span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Tempelkan API Key apa saja (DeepSeek, Gemini, OpenAI, Claude) — sistem langsung mengenali provider, beralih tab, dan otomatis mendeteksi model resmi aktif Anda!
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={smartKeyInput}
                    onChange={(e) => handleSmartKeyPaste(e.target.value)}
                    placeholder="Tempel API Key di sini (misal: sk-... atau AIzaSy...)"
                    className="w-full text-xs font-mono p-2.5 pr-24 border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleSmartKeyPaste(smartKeyInput)}
                    disabled={isDetectingModel || !smartKeyInput.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                  >
                    {isDetectingModel ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    <span>Deteksi</span>
                  </button>
                </div>
              </div>

              {/* Active Provider Indicator & Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-bold block">
                    Status Provider Pilihan
                  </span>
                  <span className="text-xs font-bold text-slate-800">
                    {selectedMainProvider === activeProviderTab ? (
                      <span className="text-emerald-700 flex items-center gap-1.5 mt-0.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Aktif sebagai Provider Utama Pembuatan Soal
                      </span>
                    ) : (
                      <span className="text-slate-600 block mt-0.5">
                        Saat ini bukan provider utama
                      </span>
                    )}
                  </span>
                </div>
                {selectedMainProvider !== activeProviderTab && (
                  <button
                    type="button"
                    onClick={() => setSelectedMainProvider(activeProviderTab)}
                    className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    Jadikan Provider Utama
                  </button>
                )}
              </div>

              {/* TAB 1: GOOGLE GEMINI */}
              {activeProviderTab === 'gemini' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">Pilih Model Gemini:</label>
                      <button
                        type="button"
                        onClick={() => handleAutoDetectModel('gemini')}
                        disabled={isDetectingModel}
                        className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        title="Deteksi otomatis model Gemini dari akun Google Anda"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingModel ? 'animate-spin' : ''}`} />
                        <span>{isDetectingModel ? 'Mendeteksi...' : '🔍 Deteksi Model Otomatis'}</span>
                      </button>
                    </div>
                    <select
                      value={geminiModelInput}
                      onChange={(e) => setGeminiModelInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-purple-600 focus:outline-none"
                    >
                      {detectedModels.gemini.length > 0 ? (
                        detectedModels.gemini.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.isRecommended ? `⭐ ${m.name} [Rekomendasi]` : m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gemini-2.5-flash">gemini-2.5-flash (Generasi Terbaru, Cepat &amp; Cerdas ⭐)</option>
                          <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Ringan &amp; Cepat)</option>
                          <option value="gemini-2.0-flash">gemini-2.0-flash (Stabil &amp; Responsif)</option>
                          <option value="gemini-1.5-flash">gemini-1.5-flash (Standar Cepat)</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro (Penalaran Kompleks)</option>
                        </>
                      )}
                    </select>
                    {modelDetectStatus.gemini && (
                      <div className="text-[11px] font-medium text-purple-900 bg-purple-50 border border-purple-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span>{modelDetectStatus.gemini}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">GEMINI_API_KEY:</label>
                      <span className="text-[11px] font-mono text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {geminiKeyInput ? 'Tersimpan di Browser' : (aiConfig?.gemini?.keyMasked || 'Tersedia di Server')}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={geminiKeyInput}
                        onChange={(e) => {
                          setGeminiKeyInput(e.target.value);
                          if (e.target.value.trim().length > 15) {
                            handleAutoDetectModel('gemini', e.target.value);
                          }
                        }}
                        placeholder="Contoh: AIzaSyxxxxxxxxxxxxxxxx..."
                        className="w-full text-xs font-mono p-2.5 pr-20 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestProvider('gemini')}
                        disabled={isTestingKey}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {isTestingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>⚡ Uji API</span>}
                      </button>
                    </div>
                  </div>

                  <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-3 text-xs text-purple-950 flex items-center justify-between gap-2">
                    <span className="text-[11px]">Dapatkan Kunci Gratis Resmi di Google AI Studio:</span>
                    <a
                      href="https://aistudio.google.com/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-purple-700 hover:text-purple-900 flex items-center gap-1 text-[11px] shrink-0"
                    >
                      <span>aistudio.google.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 2: DEEPSEEK AI */}
              {activeProviderTab === 'deepseek' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">Pilih Model DeepSeek:</label>
                      <button
                        type="button"
                        onClick={() => handleAutoDetectModel('deepseek')}
                        disabled={isDetectingModel}
                        className="text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        title="Deteksi otomatis model DeepSeek dari API"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingModel ? 'animate-spin' : ''}`} />
                        <span>{isDetectingModel ? 'Mendeteksi...' : '🔍 Deteksi Model Otomatis'}</span>
                      </button>
                    </div>
                    <select
                      value={deepseekModelInput}
                      onChange={(e) => setDeepseekModelInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-600 focus:outline-none"
                    >
                      {detectedModels.deepseek.length > 0 ? (
                        detectedModels.deepseek.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.isRecommended ? `⭐ ${m.name} [Rekomendasi]` : m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="deepseek-chat">deepseek-chat (DeepSeek-V3, Cepat, Pintar &amp; Paling Hemat ⭐)</option>
                          <option value="deepseek-reasoner">deepseek-reasoner (DeepSeek-R1, Penalaran Logika &amp; Sains Mendalam)</option>
                        </>
                      )}
                    </select>
                    {modelDetectStatus.deepseek && (
                      <div className="text-[11px] font-medium text-blue-900 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{modelDetectStatus.deepseek}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">DEEPSEEK_API_KEY:</label>
                      <span className="text-[11px] font-mono text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {deepseekKeyInput ? 'Tersimpan di Browser' : (aiConfig?.deepseek?.keyMasked || 'Belum Ada Kunci')}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={deepseekKeyInput}
                        onChange={(e) => {
                          setDeepseekKeyInput(e.target.value);
                          if (e.target.value.trim().length > 15) {
                            handleAutoDetectModel('deepseek', e.target.value);
                          }
                        }}
                        placeholder="Contoh: sk-xxxxxxxxxxxxxxxx..."
                        className="w-full text-xs font-mono p-2.5 pr-20 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestProvider('deepseek')}
                        disabled={isTestingKey}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-blue-100 hover:bg-blue-200 text-blue-900 font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {isTestingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>⚡ Uji API</span>}
                      </button>
                    </div>
                  </div>

                  <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-950 flex items-center justify-between gap-2">
                    <span className="text-[11px]">Dapatkan Kunci Resmi di Platform DeepSeek:</span>
                    <a
                      href="https://platform.deepseek.com/api_keys"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-blue-700 hover:text-blue-900 flex items-center gap-1 text-[11px] shrink-0"
                    >
                      <span>platform.deepseek.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 3: OPENAI GPT */}
              {activeProviderTab === 'openai' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">Pilih Model OpenAI GPT:</label>
                      <button
                        type="button"
                        onClick={() => handleAutoDetectModel('openai')}
                        disabled={isDetectingModel}
                        className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        title="Deteksi otomatis model GPT dari akun OpenAI Anda"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingModel ? 'animate-spin' : ''}`} />
                        <span>{isDetectingModel ? 'Mendeteksi...' : '🔍 Deteksi Model Otomatis'}</span>
                      </button>
                    </div>
                    <select
                      value={openaiModelInput}
                      onChange={(e) => setOpenaiModelInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      {detectedModels.openai.length > 0 ? (
                        detectedModels.openai.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.isRecommended ? `⭐ ${m.name} [Rekomendasi]` : m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="gpt-4o-mini">gpt-4o-mini (Rekomendasi Cepat, Akurat &amp; Hemat Biaya ⭐)</option>
                          <option value="gpt-4o">gpt-4o (Model Flagship OpenAI, Kemampuan Kognitif Tertinggi)</option>
                          <option value="o3-mini">o3-mini (Penalaran Cepat)</option>
                        </>
                      )}
                    </select>
                    {modelDetectStatus.openai && (
                      <div className="text-[11px] font-medium text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{modelDetectStatus.openai}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">OPENAI_API_KEY:</label>
                      <span className="text-[11px] font-mono text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {openaiKeyInput ? 'Tersimpan di Browser' : (aiConfig?.openai?.keyMasked ? `Aktif: ${aiConfig.openai.keyMasked}` : 'Belum Ada Kunci')}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={openaiKeyInput}
                        onChange={(e) => {
                          setOpenaiKeyInput(e.target.value);
                          if (e.target.value.trim().length > 15) {
                            handleAutoDetectModel('openai', e.target.value);
                          }
                        }}
                        placeholder="Contoh: sk-proj-xxxxxxxx..."
                        className="w-full text-xs font-mono p-2.5 pr-20 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestProvider('openai')}
                        disabled={isTestingKey}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {isTestingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>⚡ Uji API</span>}
                      </button>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950 flex items-center justify-between gap-2">
                    <span className="text-[11px]">Dapatkan Kunci API OpenAI di Platform Dashboard:</span>
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-[11px] shrink-0"
                    >
                      <span>platform.openai.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* TAB 4: ANTHROPIC CLAUDE */}
              {activeProviderTab === 'anthropic' && (
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">Pilih Model Anthropic Claude:</label>
                      <button
                        type="button"
                        onClick={() => handleAutoDetectModel('anthropic')}
                        disabled={isDetectingModel}
                        className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                        title="Deteksi model Claude"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingModel ? 'animate-spin' : ''}`} />
                        <span>{isDetectingModel ? 'Mendeteksi...' : '🔍 Deteksi Model Otomatis'}</span>
                      </button>
                    </div>
                    <select
                      value={anthropicModelInput}
                      onChange={(e) => setAnthropicModelInput(e.target.value)}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-600 focus:outline-none"
                    >
                      {detectedModels.anthropic.length > 0 ? (
                        detectedModels.anthropic.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.isRecommended ? `⭐ ${m.name} [Rekomendasi]` : m.name}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="claude-3-5-haiku-20241022">claude-3-5-haiku (Rekomendasi Cepat &amp; Responsif ⭐)</option>
                          <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet (Model Penalaran Bahasa Terbaik)</option>
                          <option value="claude-3-7-sonnet-20250219">claude-3-7-sonnet (Model Hybrid Reasoning Terbaru)</option>
                        </>
                      )}
                    </select>
                    {modelDetectStatus.anthropic && (
                      <div className="text-[11px] font-medium text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 animate-in fade-in">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{modelDetectStatus.anthropic}</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">ANTHROPIC_API_KEY:</label>
                      <span className="text-[11px] font-mono text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {anthropicKeyInput ? 'Tersimpan di Browser' : (aiConfig?.anthropic?.keyMasked ? `Aktif: ${aiConfig.anthropic.keyMasked}` : 'Belum Ada Kunci')}
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={anthropicKeyInput}
                        onChange={(e) => {
                          setAnthropicKeyInput(e.target.value);
                          if (e.target.value.trim().length > 15) {
                            handleAutoDetectModel('anthropic', e.target.value);
                          }
                        }}
                        placeholder="Contoh: sk-ant-api03-xxxxxxxx..."
                        className="w-full text-xs font-mono p-2.5 pr-20 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600 bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => handleTestProvider('anthropic')}
                        disabled={isTestingKey}
                        className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] rounded-md transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {isTestingKey ? <RefreshCw className="w-3 h-3 animate-spin" /> : <span>⚡ Uji API</span>}
                      </button>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-center justify-between gap-2">
                    <span className="text-[11px]">Dapatkan Kunci API Claude di Anthropic Console:</span>
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold underline text-amber-800 hover:text-amber-950 flex items-center gap-1 text-[11px] shrink-0"
                    >
                      <span>console.anthropic.com</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}

              {/* Test Result Alert */}
              {testKeyResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    testKeyResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {testKeyResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Koneksi {testKeyResult.provider || 'AI'} Berhasil!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Hasil Pengujian Kunci API</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] leading-relaxed pl-6">{testKeyResult.message}</p>
                </div>
              )}

              {saveKeyError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-2.5 rounded-lg flex items-center gap-2">
                  <span>⚠️ {saveKeyError}</span>
                </div>
              )}

              {saveKeySuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-2.5 rounded-lg flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Pengaturan Multi-AI berhasil disimpan dan aktif di server!</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveAiConfig(false)}
                  disabled={isSavingKey}
                  className="flex items-center gap-1.5 bg-white hover:bg-purple-50 text-purple-700 border border-purple-300 disabled:opacity-50 text-xs font-bold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-2xs"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Simpan Pengaturan</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAiConfig(true)}
                  disabled={isSavingKey}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  {isSavingKey ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Simpan &amp; Generate Soal</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
