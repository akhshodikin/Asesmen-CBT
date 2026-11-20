import React, { useState } from 'react';
import {
  Code,
  Download,
  Image as ImageIcon,
  Link as LinkIcon,
  Monitor,
  Printer,
  RefreshCw,
  Sparkles,
  Trash2,
  Upload,
  X,
  Check,
} from 'lucide-react';
import type { ActiveTab, AssessmentConfig, QuestionItem, SchoolProfile } from '../types';
import { getShuffledRightOptions, parseMatchingPairs } from '../utils/cbtPackageHelpers';
import { exportWordDocument } from '../utils/exportHelpers';
import { KopNaskah } from './KopNaskah';

interface TabNaskahSoalProps {
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  questions: QuestionItem[];
  setQuestions: React.Dispatch<React.SetStateAction<QuestionItem[]>>;
  editingIndex: number | null;
  onRegenerateSingle: (idx: number) => void;
  onSwitchTab: (tab: ActiveTab) => void;
}

const ROMANS = ['I', 'II', 'III', 'IV', 'V'];

export const TabNaskahSoal: React.FC<TabNaskahSoalProps> = ({
  config,
  schoolProfile,
  questions,
  setQuestions,
  editingIndex,
  onRegenerateSingle,
  onSwitchTab,
}) => {
  // Modal Generator / Editor Gambar Soal State
  const [imageModalIdx, setImageModalIdx] = useState<number | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const [imageStyle, setImageStyle] = useState<'svg' | 'realistic' | 'upload' | 'url'>('svg');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewDesc, setPreviewDesc] = useState('');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const openImageModal = (idx: number) => {
    const q = questions[idx];
    if (!q) return;
    setImageModalIdx(idx);
    setPreviewUrl(q.gambarUrl || '');
    setPreviewDesc(q.gambarDeskripsi || '');
    setPromptInput(q.gambarDeskripsi || q.stimulus || q.pertanyaan || q.materi);
    setImageError('');
    setImageStyle('svg');
  };

  const handleGenerateAIImage = async () => {
    if (imageModalIdx === null) return;
    const q = questions[imageModalIdx];
    if (!q) return;

    setIsGeneratingImage(true);
    setImageError('');
    try {
      const mode = imageStyle === 'realistic' ? 'realistic' : 'svg';
      let imageUrl = '';
      let deskripsi = promptInput;

      // 1. Coba lewat backend jika ada
      try {
        const response = await fetch('/api/generate-question-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: q,
            prompt: promptInput,
            mode,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        if (response.ok && contentType.includes('application/json')) {
          const data = await response.json();
          if (data?.imageUrl) {
            imageUrl = data.imageUrl;
            deskripsi = data.deskripsi || promptInput;
          }
        }
      } catch {
        // Backend not available
      }

      // 2. Direct client-side generation jika backend tidak ada
      if (!imageUrl) {
        const cleanPrompt = encodeURIComponent(
          (promptInput.trim() || `${q.materi} ${q.pertanyaan}`).slice(0, 100)
        );
        imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=600&height=400&nologo=true`;
      }

      setPreviewUrl(imageUrl);
      setPreviewDesc(deskripsi);
    } catch (err: unknown) {
      setImageError(err instanceof Error ? err.message : 'Gagal menghasilkan gambar AI.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleApplyImage = () => {
    if (imageModalIdx === null) return;
    setQuestions((prev) => {
      const updated = [...prev];
      updated[imageModalIdx] = {
        ...updated[imageModalIdx],
        gambarUrl: previewUrl.trim() || undefined,
        gambarDeskripsi: previewDesc.trim() || undefined,
      };
      return updated;
    });
    setImageModalIdx(null);
  };

  const handleRemoveImage = () => {
    if (imageModalIdx === null) return;
    setQuestions((prev) => {
      const updated = [...prev];
      updated[imageModalIdx] = {
        ...updated[imageModalIdx],
        gambarUrl: undefined,
        gambarDeskripsi: undefined,
      };
      return updated;
    });
    setImageModalIdx(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Ukuran file maksimal 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewUrl(reader.result);
        setPreviewDesc(file.name.replace(/\.[^/.]+$/, ''));
      }
    };
    reader.readAsDataURL(file);
  };

  const pgQuestions = questions.filter((q) => q.bentuk === 'PG');
  const pgkQuestions = questions.filter((q) => q.bentuk === 'PGK');
  const isianQuestions = questions.filter((q) => q.bentuk === 'Isian');
  const mencocokkanQuestions = questions.filter((q) => q.bentuk === 'Mencocokkan');
  const uraianQuestions = questions.filter((q) => q.bentuk === 'Uraian');

  const activeSections = [
    pgQuestions.length > 0 ? 'PG' : null,
    pgkQuestions.length > 0 ? 'PGK' : null,
    isianQuestions.length > 0 ? 'Isian' : null,
    mencocokkanQuestions.length > 0 ? 'Mencocokkan' : null,
    uraianQuestions.length > 0 ? 'Uraian' : null,
  ].filter(Boolean) as string[];

  const getRoman = (key: string) => {
    const idx = activeSections.indexOf(key);
    return ROMANS[idx >= 0 ? idx : 0];
  };

  const isUpperGrade = (parseInt(config.kelas.replace(/\D/g, ''), 10) || 5) > 2;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="no-print bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span className="font-bold text-emerald-800 font-mono tabular-nums">
            {questions.length} Butir Soal
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Terhubung langsung dengan Portal Ujian CBT &amp; Generator Google Form
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSwitchTab('cbt')}
            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Monitor className="w-4 h-4" />
            <span>Uji Coba CBT</span>
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab('gform')}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Code className="w-4 h-4" />
            <span>Ekspor Google Form</span>
          </button>
          <button
            type="button"
            onClick={() =>
              exportWordDocument(
                'printable-naskah-soal',
                `Naskah_Soal_${config.mapel}_${config.kelas}_SDN_Kandangan_I`
              )
            }
            className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Unduh MS Word (.doc)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Naskah Soal</span>
          </button>
        </div>
      </div>

      {/* Printable Exam Document */}
      <div
        id="printable-naskah-soal"
        className="print-area bg-white max-w-4xl mx-auto p-8 md:p-12 rounded-xl border border-slate-200 font-serif-exam text-black leading-relaxed"
      >
        {/* Kop Surat Resmi */}
        <KopNaskah schoolProfile={schoolProfile} />

        {/* Judul Asesmen */}
        <div className="text-center mb-5">
          <h3 className="text-base md:text-lg font-bold uppercase underline">
            NASKAH SOAL {config.jenisAsesmen}
          </h3>
          <p className="text-sm font-bold uppercase">TAHUN PELAJARAN {config.tahunPelajaran}</p>
        </div>

        {/* Tabel Identitas */}
        <div className="border-2 border-black p-3 mb-6 text-xs md:text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <table className="w-full no-border">
              <tbody>
                <tr>
                  <td className="font-bold py-0.5 w-36">Mata Pelajaran</td>
                  <td className="py-0.5 w-3">:</td>
                  <td className="font-bold py-0.5">{config.mapel}</td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Kelas / Fase</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">
                    {config.kelas} ({config.fase})
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Hari / Tanggal</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{config.hariTanggal}</td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Waktu</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">{config.waktu}</td>
                </tr>
              </tbody>
            </table>

            <table className="w-full no-border">
              <tbody>
                <tr>
                  <td className="font-bold py-0.5 w-36">Nama Peserta</td>
                  <td className="py-0.5 w-3">:</td>
                  <td className="py-0.5 border-b border-dotted border-black">
                    ......................................................
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Nomor Absen / NIPD</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5 border-b border-dotted border-black">
                    ......................................................
                  </td>
                </tr>
                <tr>
                  <td className="font-bold py-0.5">Nilai Asesmen</td>
                  <td className="py-0.5">:</td>
                  <td className="py-0.5">
                    <span className="inline-block border border-black px-6 py-2 font-bold">
                      &nbsp;
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Petunjuk Umum */}
        <div className="mb-6 text-xs md:text-sm">
          <p className="font-bold underline mb-1">PETUNJUK UMUM:</p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>
              Berdoalah terlebih dahulu menurut agama dan kepercayaan masing-masing sebelum
              mengerjakan soal!
            </li>
            <li>Tulislah Nama Lengkap dan Nomor Absen pada kolom yang telah disediakan!</li>
            <li>
              Bacalah setiap bacaan dan pertanyaan dengan teliti sebelum memilih atau menuliskan
              jawaban!
            </li>
            <li>Kerjakan terlebih dahulu soal-soal yang kamu anggap paling mudah!</li>
            <li>Periksa kembali seluruh pekerjaanmu sebelum diserahkan kepada Bapak/Ibu Guru!</li>
          </ol>
        </div>

        {/* Bagian PG */}
        {pgQuestions.length > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm md:text-base mb-3 uppercase">
              {getRoman('PG')}. Berilah tanda silang (X) pada huruf A, B, C
              {isUpperGrade ? ', atau D' : ''} di depan jawaban yang paling benar!
            </p>
            <div className="space-y-5">
              {pgQuestions.map((q) => {
                const globalIdx = questions.findIndex((item) => item.nomor === q.nomor);
                return (
                  <div
                    key={q.nomor}
                    className="avoid-break pb-2 border-b border-transparent hover:border-slate-200"
                  >
                    <div className="no-print flex items-center justify-between mb-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[11px] font-sans text-slate-600">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-emerald-800">Soal #{q.nomor}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">{q.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.kesulitan}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-slate-500 truncate">{q.dimensi}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openImageModal(globalIdx)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            q.gambarUrl
                              ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title={q.gambarUrl ? 'Kelola gambar soal ini' : 'Tambahkan / generate gambar soal'}
                        >
                          <ImageIcon className="w-3 h-3 text-purple-700" />
                          <span>{q.gambarUrl ? 'Gambar Ada' : '+ Gambar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerateSingle(globalIdx)}
                          disabled={editingIndex === globalIdx}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              editingIndex === globalIdx ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Ganti Soal Ini</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:text-base">
                      <span className="font-bold min-w-[24px]">{q.nomor}.</span>
                      <div className="flex-1 space-y-2">
                        {q.stimulus && (
                          <div className="bg-slate-50 border border-slate-300 rounded px-3.5 py-2 italic text-xs md:text-sm whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )}
                        {q.gambarUrl && (
                          <div className="my-2.5 text-center avoid-break">
                            <img
                              src={q.gambarUrl}
                              alt={q.gambarDeskripsi || `Gambar Soal Nomor ${q.nomor}`}
                              className="max-h-60 max-w-full rounded-lg border border-slate-300 shadow-2xs mx-auto object-contain bg-white"
                            />
                            {q.gambarDeskripsi && (
                              <p className="text-[11px] md:text-xs text-slate-600 mt-1 italic font-sans">
                                {q.gambarDeskripsi}
                              </p>
                            )}
                          </div>
                        )}
                        <p
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={(e) => {
                            const updated = [...questions];
                            updated[globalIdx] = {
                              ...updated[globalIdx],
                              pertanyaan: e.currentTarget.innerText,
                            };
                            setQuestions(updated);
                          }}
                          className="focus:outline-dashed focus:outline-1 focus:outline-emerald-600"
                        >
                          {q.pertanyaan}
                        </p>
                        <div className="space-y-1 pl-1">
                          {(q.opsi || []).map((opt, oIdx) => (
                            <p key={oIdx} className="leading-snug">
                              {opt}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bagian PGK */}
        {pgkQuestions.length > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm md:text-base mb-3 uppercase">
              {getRoman('PGK')}. Pilihan Ganda Kompleks — Berilah tanda centang (✓) pada kotak di
              depan pernyataan yang benar! (Jawaban benar lebih dari satu)
            </p>
            <div className="space-y-5">
              {pgkQuestions.map((q) => {
                const globalIdx = questions.findIndex((item) => item.nomor === q.nomor);
                return (
                  <div key={q.nomor} className="avoid-break">
                    <div className="no-print flex items-center justify-between mb-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[11px] font-sans text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">Soal #{q.nomor} (PGK)</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">{q.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.kesulitan}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openImageModal(globalIdx)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            q.gambarUrl
                              ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title={q.gambarUrl ? 'Kelola gambar soal ini' : 'Tambahkan / generate gambar soal'}
                        >
                          <ImageIcon className="w-3 h-3 text-purple-700" />
                          <span>{q.gambarUrl ? 'Gambar Ada' : '+ Gambar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerateSingle(globalIdx)}
                          disabled={editingIndex === globalIdx}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              editingIndex === globalIdx ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Ganti Soal Ini</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:text-base">
                      <span className="font-bold min-w-[24px]">{q.nomor}.</span>
                      <div className="flex-1 space-y-2">
                        {q.stimulus && (
                          <div className="bg-slate-50 border border-slate-300 rounded px-3.5 py-2 italic text-xs md:text-sm whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )}
                        {q.gambarUrl && (
                          <div className="my-2.5 text-center avoid-break">
                            <img
                              src={q.gambarUrl}
                              alt={q.gambarDeskripsi || `Gambar Soal Nomor ${q.nomor}`}
                              className="max-h-60 max-w-full rounded-lg border border-slate-300 shadow-2xs mx-auto object-contain bg-white"
                            />
                            {q.gambarDeskripsi && (
                              <p className="text-[11px] md:text-xs text-slate-600 mt-1 italic font-sans">
                                {q.gambarDeskripsi}
                              </p>
                            )}
                          </div>
                        )}
                        <p>{q.pertanyaan}</p>
                        <div className="space-y-1.5 pl-1">
                          {(q.opsi || []).map((opt, oIdx) => (
                            <p key={oIdx} className="leading-snug">
                              {opt.startsWith('[') ? opt : `[   ] ${opt}`}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bagian Isian */}
        {isianQuestions.length > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm md:text-base mb-3 uppercase">
              {getRoman('Isian')}. Isilah titik-titik di bawah ini dengan jawaban yang singkat dan
              tepat!
            </p>
            <div className="space-y-4">
              {isianQuestions.map((q) => {
                const globalIdx = questions.findIndex((item) => item.nomor === q.nomor);
                return (
                  <div key={q.nomor} className="avoid-break">
                    <div className="no-print flex items-center justify-between mb-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[11px] font-sans text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">Soal #{q.nomor} (Isian)</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">{q.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.kesulitan}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRegenerateSingle(globalIdx)}
                        disabled={editingIndex === globalIdx}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            editingIndex === globalIdx ? 'animate-spin' : ''
                          }`}
                        />
                        <span>Ganti Soal Ini</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:text-base">
                      <span className="font-bold min-w-[24px]">{q.nomor}.</span>
                      <div className="flex-1 space-y-1.5">
                        {q.stimulus && (
                          <div className="bg-slate-50 border border-slate-300 rounded px-3.5 py-2 italic text-xs md:text-sm whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )}
                        <p>{q.pertanyaan}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bagian Mencocokkan */}
        {mencocokkanQuestions.length > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm md:text-base mb-3 uppercase">
              {getRoman('Mencocokkan')}. Jodohkanlah / Cocokkanlah pernyataan pada Kolom A dengan
              pasangan jawaban yang tepat pada Kolom B!
            </p>
            <div className="space-y-5">
              {mencocokkanQuestions.map((q) => {
                const globalIdx = questions.findIndex((item) => item.nomor === q.nomor);
                const pairs = parseMatchingPairs(q.opsi || []);
                const rightOptions = getShuffledRightOptions(pairs, q.nomor);
                return (
                  <div key={q.nomor} className="avoid-break">
                    <div className="no-print flex items-center justify-between mb-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[11px] font-sans text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">
                          Soal #{q.nomor} (Mencocokkan)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">{q.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.kesulitan}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openImageModal(globalIdx)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            q.gambarUrl
                              ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title={q.gambarUrl ? 'Kelola gambar soal ini' : 'Tambahkan / generate gambar soal'}
                        >
                          <ImageIcon className="w-3 h-3 text-purple-700" />
                          <span>{q.gambarUrl ? 'Gambar Ada' : '+ Gambar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerateSingle(globalIdx)}
                          disabled={editingIndex === globalIdx}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              editingIndex === globalIdx ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Ganti Soal Ini</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:text-base">
                      <span className="font-bold min-w-[24px]">{q.nomor}.</span>
                      <div className="flex-1 space-y-2.5">
                        {q.stimulus && (
                          <div className="bg-slate-50 border border-slate-300 rounded px-3.5 py-2 italic text-xs md:text-sm whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )}
                        {q.gambarUrl && (
                          <div className="my-2.5 text-center avoid-break">
                            <img
                              src={q.gambarUrl}
                              alt={q.gambarDeskripsi || `Gambar Soal Nomor ${q.nomor}`}
                              className="max-h-60 max-w-full rounded-lg border border-slate-300 shadow-2xs mx-auto object-contain bg-white"
                            />
                            {q.gambarDeskripsi && (
                              <p className="text-[11px] md:text-xs text-slate-600 mt-1 italic font-sans">
                                {q.gambarDeskripsi}
                              </p>
                            )}
                          </div>
                        )}
                        <p>{q.pertanyaan}</p>
                        {pairs.length > 0 && (
                          <table className="w-full border-collapse border border-black text-xs md:text-sm">
                            <thead>
                              <tr className="bg-slate-100 font-bold">
                                <th className="border border-black p-2 w-1/2 text-left">
                                  Kolom A (Pernyataan)
                                </th>
                                <th className="border border-black p-2 w-20 text-center">
                                  Jawaban
                                </th>
                                <th className="border border-black p-2 w-1/2 text-left">
                                  Kolom B (Pasangan)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pairs.map((p, idx) => (
                                <tr key={idx}>
                                  <td className="border border-black p-2">
                                    {idx + 1}. {p.left}
                                  </td>
                                  <td className="border border-black p-2 text-center font-mono">
                                    ( ... )
                                  </td>
                                  <td className="border border-black p-2">
                                    {rightOptions[idx]
                                      ? `${rightOptions[idx].letter}. ${rightOptions[idx].text}`
                                      : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bagian Esai / Uraian */}
        {uraianQuestions.length > 0 && (
          <div className="mb-8">
            <p className="font-bold text-sm md:text-base mb-3 uppercase">
              {getRoman('Uraian')}. Jawablah pertanyaan-pertanyaan di bawah ini dengan uraian yang
              jelas dan benar!
            </p>
            <div className="space-y-5">
              {uraianQuestions.map((q) => {
                const globalIdx = questions.findIndex((item) => item.nomor === q.nomor);
                return (
                  <div key={q.nomor} className="avoid-break">
                    <div className="no-print flex items-center justify-between mb-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded text-[11px] font-sans text-slate-600">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-800">Soal #{q.nomor} (Uraian)</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono font-semibold text-slate-800">{q.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>{q.kesulitan}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openImageModal(globalIdx)}
                          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            q.gambarUrl
                              ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                          }`}
                          title={q.gambarUrl ? 'Kelola gambar soal ini' : 'Tambahkan / generate gambar soal'}
                        >
                          <ImageIcon className="w-3 h-3 text-purple-700" />
                          <span>{q.gambarUrl ? 'Gambar Ada' : '+ Gambar'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onRegenerateSingle(globalIdx)}
                          disabled={editingIndex === globalIdx}
                          className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 ${
                              editingIndex === globalIdx ? 'animate-spin' : ''
                            }`}
                          />
                          <span>Ganti Soal Ini</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-start gap-2 text-sm md:text-base">
                      <span className="font-bold min-w-[24px]">{q.nomor}.</span>
                      <div className="flex-1 space-y-2">
                        {q.stimulus && (
                          <div className="bg-slate-50 border border-slate-300 rounded px-3.5 py-2 italic text-xs md:text-sm whitespace-pre-line">
                            {q.stimulus}
                          </div>
                        )}
                        {q.gambarUrl && (
                          <div className="my-2.5 text-center avoid-break">
                            <img
                              src={q.gambarUrl}
                              alt={q.gambarDeskripsi || `Gambar Soal Nomor ${q.nomor}`}
                              className="max-h-60 max-w-full rounded-lg border border-slate-300 shadow-2xs mx-auto object-contain bg-white"
                            />
                            {q.gambarDeskripsi && (
                              <p className="text-[11px] md:text-xs text-slate-600 mt-1 italic font-sans">
                                {q.gambarDeskripsi}
                              </p>
                            )}
                          </div>
                        )}
                        <p>{q.pertanyaan}</p>
                        <div className="border-b border-dotted border-slate-400 h-6 w-full" />
                        <div className="border-b border-dotted border-slate-400 h-6 w-full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Kolom Pengesahan */}
        <div className="mt-12 pt-4 avoid-break text-xs md:text-sm">
          <table className="w-full no-border text-center">
            <tbody>
              <tr>
                <td className="w-1/2">
                  Mengetahui,
                  <br />
                  Kepala {schoolProfile.namaSingkat}
                  <div className="h-20" />
                  <p className="font-bold underline">{schoolProfile.kepsekNama}</p>
                  <p>NIP. {schoolProfile.kepsekNip}</p>
                </td>
                <td className="w-1/2">
                  {config.tanggalTtd}
                  <br />
                  Guru {config.mapel.includes('Agama Islam') ? 'Mata Pelajaran PAI' : config.kelas}
                  <div className="h-20" />
                  <p className="font-bold underline">{config.guruNama}</p>
                  <p>NIP. {config.guruNip}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          MODAL GENERATOR & EDITOR GAMBAR SOAL
          ============================================================ */}
      {imageModalIdx !== null && questions[imageModalIdx] && (() => {
        const targetQ = questions[imageModalIdx];
        return (
          <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
              {/* Header */}
              <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-white flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-700 text-white rounded-xl shadow-xs">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Generator &amp; Editor Gambar Soal</span>
                      <span className="bg-purple-100 text-purple-900 text-xs px-2 py-0.5 rounded-full font-bold">
                        Nomor #{targetQ.nomor} ({targetQ.bentuk})
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {targetQ.materi} · {config.mapel} {config.kelas}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setImageModalIdx(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Question Prompt Preview */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                  <span className="font-bold text-slate-700 block">Pertanyaan Soal:</span>
                  <p className="text-slate-800 line-clamp-2 italic">"{targetQ.pertanyaan}"</p>
                </div>

                {/* Generator Modes / Tabs */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Pilih Metode Pembuatan Gambar:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setImageStyle('svg')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                        imageStyle === 'svg'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Diagram Vektor SVG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageStyle('realistic')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                        imageStyle === 'realistic'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span>Ilustrasi Visual AI</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageStyle('upload')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                        imageStyle === 'upload'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah File</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageStyle('url')}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                        imageStyle === 'url'
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>Tautan URL</span>
                    </button>
                  </div>
                </div>

                {/* Mode Controls */}
                {imageStyle === 'svg' || imageStyle === 'realistic' ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-700">
                        Deskripsi / Prompt Gambar yang Diinginkan:
                      </label>
                      <span className="text-[11px] text-slate-500">
                        {imageStyle === 'svg' ? 'AI Diagram Vektor' : 'AI Ilustrasi'}
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Contoh: Diagram siklus air dengan awan dan hujan di lereng pegunungan..."
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateAIImage}
                      disabled={isGeneratingImage || !promptInput.trim()}
                      className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-xs transition-colors"
                    >
                      {isGeneratingImage ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Menghasilkan Gambar dengan AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 text-amber-300" />
                          <span>Hasilkan Gambar Sekarang (Generate AI)</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : imageStyle === 'upload' ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Pilih File Gambar dari Komputer:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-slate-300 rounded-lg p-1.5"
                    />
                    <p className="text-[11px] text-slate-500">
                      Format didukung: PNG, JPG, JPEG, WEBP, SVG (Maksimal 5 MB).
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Tautan URL Gambar Langsung:
                    </label>
                    <input
                      type="url"
                      value={previewUrl}
                      onChange={(e) => setPreviewUrl(e.target.value)}
                      placeholder="https://contoh.com/gambar-soal.png"
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                )}

                {imageError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-2.5 rounded-lg flex items-center gap-2">
                    <span>⚠️ {imageError}</span>
                  </div>
                )}

                {/* Preview Box */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200 pb-1.5">
                    <span>Hasil Pratinjau Gambar Soal:</span>
                    {previewUrl && (
                      <span className="text-emerald-700 font-normal text-[11px] flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Gambar Siap Dipasang</span>
                      </span>
                    )}
                  </div>
                  {previewUrl ? (
                    <div className="space-y-2 text-center">
                      <div className="bg-white p-2 rounded-lg border border-slate-200 max-h-56 overflow-hidden flex items-center justify-center">
                        <img
                          src={previewUrl}
                          alt={previewDesc || 'Pratinjau Gambar'}
                          className="max-h-52 max-w-full object-contain mx-auto rounded"
                        />
                      </div>
                      <div className="text-left space-y-1">
                        <label className="block text-[11px] font-bold text-slate-600">
                          Keterangan / Kepsyen Gambar (Opsional):
                        </label>
                        <input
                          type="text"
                          value={previewDesc}
                          onChange={(e) => setPreviewDesc(e.target.value)}
                          placeholder="Keterangan singkat gambar yang tampil di bawah soal..."
                          className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      <ImageIcon className="w-8 h-8 mx-auto mb-1 text-slate-300" />
                      <span>Belum ada gambar yang dipilih atau di-generate.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
                <div>
                  {targetQ.gambarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 px-3 py-2 rounded-lg hover:bg-rose-50 border border-rose-200 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Gambar dari Soal</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setImageModalIdx(null)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyImage}
                    disabled={!previewUrl}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-xs"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan Gambar ke Soal</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
