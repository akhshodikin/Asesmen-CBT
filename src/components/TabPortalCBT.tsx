import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileSpreadsheet,
  Flag,
  Key,
  Monitor,
  Play,
  RotateCcw,
  Share2,
  ShieldCheck,
  Shuffle,
} from 'lucide-react';
import type {
  ActiveTab,
  AssessmentConfig,
  AuthSession,
  CBTDetail,
  CBTSubmission,
  ExamPackage,
  QuestionItem,
  SchoolProfile,
  Student,
} from '../types';
import {
  getShuffledRightOptions,
  parseMatchingPairs,
  prepareQuestionsForPackage,
} from '../utils/cbtPackageHelpers';
import { exportRekapCBTCSV } from '../utils/exportHelpers';

interface TabPortalCBTProps {
  authSession: AuthSession;
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  questions: QuestionItem[];
  students: Student[];
  totalScore: number;
  cbtSubmissions: CBTSubmission[];
  setCbtSubmissions: React.Dispatch<React.SetStateAction<CBTSubmission[]>>;
  examPackages: ExamPackage[];
  activePackageId: string | null;
  onActivatePackage: (pkg: ExamPackage, targetTab?: ActiveTab) => void;
  onRandomizeToken: () => void;
  onSwitchTab: (tab: ActiveTab) => void;
  onOpenShareLinkModal?: () => void;
}

type CBTAnswerValue = string | number[] | Record<number, string>;

export const TabPortalCBT: React.FC<TabPortalCBTProps> = ({
  authSession,
  config,
  schoolProfile,
  questions,
  students,
  totalScore,
  cbtSubmissions,
  setCbtSubmissions,
  examPackages,
  activePackageId,
  onActivatePackage,
  onRandomizeToken,
  onSwitchTab,
  onOpenShareLinkModal,
}) => {
  const isSiswaRole = authSession.role === 'siswa';
  const [cbtStage, setCbtStage] = useState<'login' | 'exam' | 'result' | 'rekap'>('login');
  const [cbtKelas, setCbtKelas] = useState(
    isSiswaRole && authSession.kelas ? authSession.kelas : config.kelas
  );
  const [cbtStudentNipd, setCbtStudentNipd] = useState(
    isSiswaRole && authSession.nipd ? authSession.nipd : '908'
  );
  const [cbtTokenInput, setCbtTokenInput] = useState(() =>
    isSiswaRole ? '' : config.tokenCBT
  );
  const [cbtLoginError, setCbtLoginError] = useState('');
  const [cbtCurrentIndex, setCbtCurrentIndex] = useState(0);
  const [cbtAnswers, setCbtAnswers] = useState<Record<number, CBTAnswerValue>>({});
  const [cbtDoubt, setCbtDoubt] = useState<Record<number, boolean>>({});
  const [cbtTimeLeft, setCbtTimeLeft] = useState((Number(config.durasiMenit) || 60) * 60);
  const [cbtFontSize, setCbtFontSize] = useState<'sm' | 'normal' | 'lg'>('normal');
  const [cbtConfirmSubmit, setCbtConfirmSubmit] = useState(false);
  const [cbtLastResult, setCbtLastResult] = useState<CBTSubmission | null>(null);
  const [sessionQuestions, setSessionQuestions] = useState<QuestionItem[]>(questions);

  const activePackage = useMemo(
    () => examPackages.find((p) => p.id === activePackageId) || null,
    [examPackages, activePackageId]
  );

  const availableCbtPackages = useMemo(
    () => examPackages.filter((p) => p.status !== 'Arsip'),
    [examPackages]
  );

  useEffect(() => {
    if (isSiswaRole) {
      if (authSession.kelas) setCbtKelas(authSession.kelas);
      if (authSession.nipd) setCbtStudentNipd(authSession.nipd);
      const params = new URLSearchParams(window.location.search);
      const urlToken = params.get('token');
      if (urlToken) {
        setCbtTokenInput(urlToken.trim().toUpperCase());
      } else {
        setCbtTokenInput('');
      }
      if (cbtStage === 'rekap') setCbtStage('login');
    } else {
      setCbtKelas(config.kelas);
      setCbtTokenInput(config.tokenCBT);
    }
  }, [isSiswaRole, authSession.kelas, authSession.nipd, config.kelas, config.tokenCBT]);

  useEffect(() => {
    if (isSiswaRole && authSession.nipd) {
      setCbtStudentNipd(authSession.nipd);
      return;
    }
    const firstStd = students.find((s) => s.kelas === cbtKelas);
    if (firstStd) {
      setCbtStudentNipd(firstStd.nipd);
    }
  }, [cbtKelas, students, isSiswaRole, authSession.nipd]);

  const selectedCbtStudent = useMemo(() => {
    return students.find((s) => s.nipd === cbtStudentNipd) || students[0];
  }, [students, cbtStudentNipd]);

  const pgCount = questions.filter((q) => q.bentuk === 'PG').length;
  const pgkCount = questions.filter((q) => q.bentuk === 'PGK').length;
  const isianCount = questions.filter((q) => q.bentuk === 'Isian').length;
  const cocokCount = questions.filter((q) => q.bentuk === 'Mencocokkan').length;
  const uraianCount = questions.filter((q) => q.bentuk === 'Uraian').length;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleFinishCBTExam = () => {
    let earnedScore = 0;
    let maxScore = 0;
    let correctPGCount = 0;
    const bloomStats: Record<string, { earned: number; max: number }> = {};
    const details: CBTDetail[] = [];

    const activeExamQuestions = sessionQuestions.length > 0 ? sessionQuestions : questions;
    activeExamQuestions.forEach((q) => {
      const qMax = Number(q.skor || 1);
      maxScore += qMax;
      const userAns = cbtAnswers[q.nomor];
      let qEarned = 0;
      let isCorrect = false;

      if (q.bentuk === 'PG') {
        const cleanKey = (q.kunci || 'A').trim().toUpperCase().charAt(0);
        if (typeof userAns === 'string' && userAns.toUpperCase() === cleanKey) {
          qEarned = qMax;
          isCorrect = true;
          correctPGCount++;
        }
      } else if (q.bentuk === 'PGK') {
        const selectedArr = Array.isArray(userAns) ? userAns : [];
        const numsInKey = (q.kunci || '').match(/\d+/g)?.map((n) => parseInt(n, 10) - 1) || [
          0, 2,
        ];
        const matchCount = selectedArr.filter((idx) => numsInKey.includes(idx)).length;
        const wrongCount = selectedArr.filter((idx) => !numsInKey.includes(idx)).length;
        if (matchCount === numsInKey.length && wrongCount === 0) {
          qEarned = qMax;
          isCorrect = true;
        } else if (matchCount > 0 && wrongCount === 0) {
          qEarned = Math.round(qMax / 2);
        }
      } else if (q.bentuk === 'Isian') {
        const cleanUser = (typeof userAns === 'string' ? userAns : '').trim().toLowerCase();
        const cleanKey = (q.kunci || '').toString().trim().toLowerCase();
        if (cleanUser && (cleanKey.includes(cleanUser) || cleanUser.includes(cleanKey))) {
          qEarned = qMax;
          isCorrect = true;
        }
      } else if (q.bentuk === 'Mencocokkan') {
        const pairs = parseMatchingPairs(q.opsi || []);
        const mapAns =
          userAns && typeof userAns === 'object' && !Array.isArray(userAns)
            ? (userAns as Record<number, string>)
            : {};
        if (pairs.length > 0) {
          let matched = 0;
          pairs.forEach((p, idx) => {
            if ((mapAns[idx] || '').trim().toLowerCase() === p.right.trim().toLowerCase()) {
              matched++;
            }
          });
          qEarned = Math.round((matched / pairs.length) * qMax);
          isCorrect = matched === pairs.length;
        }
      } else if (q.bentuk === 'Uraian') {
        const cleanUser = (typeof userAns === 'string' ? userAns : '').trim();
        if (cleanUser.length >= 25) {
          qEarned = qMax;
          isCorrect = true;
        } else if (cleanUser.length > 5) {
          qEarned = Math.ceil(qMax / 2);
        }
      }

      earnedScore += qEarned;
      const bCode = (q.bloom || 'C3').toUpperCase().substring(0, 2);
      if (!bloomStats[bCode]) bloomStats[bCode] = { earned: 0, max: 0 };
      bloomStats[bCode].earned += qEarned;
      bloomStats[bCode].max += qMax;

      let formattedAnswer = '(Kosong)';
      if (Array.isArray(userAns)) {
        formattedAnswer = userAns.length > 0 ? userAns.map((i) => `Pernyataan ${i + 1}`).join(', ') : '(Kosong)';
      } else if (userAns && typeof userAns === 'object') {
        const entries = Object.entries(userAns as Record<number, string>).filter(([, v]) => Boolean(v));
        formattedAnswer =
          entries.length > 0
            ? entries.map(([k, v]) => `${Number(k) + 1} → ${v}`).join('; ')
            : '(Kosong)';
      } else if (typeof userAns === 'string' && userAns.trim() !== '') {
        formattedAnswer = userAns;
      }

      details.push({
        nomor: q.nomor,
        bentuk: String(q.bentuk),
        bloom: bCode,
        jawabanSiswa: formattedAnswer,
        kunci: q.kunci,
        skorPerolehan: qEarned,
        skorMaks: qMax,
        isCorrect,
      });
    });

    const finalGrade = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;
    const bloomSummaryText = Object.entries(bloomStats)
      .map(([k, v]) => `${k}: ${v.max > 0 ? Math.round((v.earned / v.max) * 100) : 0}%`)
      .join(', ');

    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(
      now.getMonth() + 1
    ).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const resultRecord: CBTSubmission = {
      id: 'sub-' + Date.now(),
      waktuSelesai: timeStr,
      nama: selectedCbtStudent?.nama || 'Siswa',
      nipd: selectedCbtStudent?.nipd || '-',
      nisn: selectedCbtStudent?.nisn || '-',
      kelas: selectedCbtStudent?.kelas || cbtKelas,
      agama: selectedCbtStudent?.agama || '-',
      mapel: config.mapel,
      paketId: activePackage?.id,
      namaPaket: activePackage?.namaPaket,
      skorPerolehan: earnedScore,
      skorMaksimal: maxScore,
      nilaiAkhir: finalGrade,
      benarPG: correctPGCount,
      detailBloom: bloomSummaryText,
      details,
    };

    setCbtLastResult(resultRecord);
    setCbtSubmissions((prev) => [resultRecord, ...prev]);
    setCbtConfirmSubmit(false);
    setCbtStage('result');
  };

  useEffect(() => {
    if (cbtStage !== 'exam') return;
    const timer = setInterval(() => {
      setCbtTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinishCBTExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cbtStage]);

  const handleStartCBT = (e: React.FormEvent) => {
    e.preventDefault();
    if (cbtTokenInput.trim().toUpperCase() !== config.tokenCBT.trim().toUpperCase()) {
      setCbtLoginError(
        isSiswaRole
          ? 'Token Ujian tidak sesuai. Mintalah token ujian yang aktif kepada Bapak/Ibu Guru.'
          : `Token Ujian tidak sesuai. Gunakan token aktif: ${config.tokenCBT}`
      );
      return;
    }
    if (questions.length === 0) {
      setCbtLoginError('Belum ada soal yang tersedia. Silakan susun soal terlebih dahulu.');
      return;
    }
    const prepared = prepareQuestionsForPackage(
      questions,
      Boolean(activePackage?.acakSoal),
      Boolean(activePackage?.acakOpsi)
    );
    setSessionQuestions(prepared);
    setCbtLoginError('');
    setCbtAnswers({});
    setCbtDoubt({});
    setCbtCurrentIndex(0);
    setCbtTimeLeft((Number(config.durasiMenit) || 60) * 60);
    setCbtConfirmSubmit(false);
    setCbtStage('exam');
  };

  const handleSelectPGOption = (nomor: number, letter: string) => {
    setCbtAnswers((prev) => ({ ...prev, [nomor]: letter }));
  };

  const handleTogglePGKOption = (nomor: number, idx: number) => {
    setCbtAnswers((prev) => {
      const current = Array.isArray(prev[nomor]) ? (prev[nomor] as number[]) : [];
      const exists = current.includes(idx);
      const updated = exists ? current.filter((i) => i !== idx) : [...current, idx].sort();
      return { ...prev, [nomor]: updated };
    });
  };

  const handleTextAnswerChange = (nomor: number, text: string) => {
    setCbtAnswers((prev) => ({ ...prev, [nomor]: text }));
  };

  const handleMatchSelect = (nomor: number, pairIdx: number, chosenRightText: string) => {
    setCbtAnswers((prev) => {
      const prevMap =
        prev[nomor] && typeof prev[nomor] === 'object' && !Array.isArray(prev[nomor])
          ? (prev[nomor] as Record<number, string>)
          : {};
      return {
        ...prev,
        [nomor]: {
          ...prevMap,
          [pairIdx]: chosenRightText,
        },
      };
    });
  };

  const handleToggleDoubt = (nomor: number) => {
    setCbtDoubt((prev) => ({ ...prev, [nomor]: !prev[nomor] }));
  };

  return (
    <div className="space-y-6 no-print">
      {/* Mode Switcher */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
            <Monitor className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Portal Ujian Computer-Based Test (CBT)
            </h2>
            <p className="text-xs text-slate-500">
              {!isSiswaRole ? (
                <>
                  Token: <span className="font-mono font-bold text-emerald-800">{config.tokenCBT}</span>{' '}
                  <span aria-hidden="true">·</span>{' '}
                </>
              ) : null}
              {config.mapel} <span aria-hidden="true">·</span> Durasi: {config.durasiMenit} Menit
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isSiswaRole && onOpenShareLinkModal && (
            <button
              type="button"
              onClick={onOpenShareLinkModal}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
              title="Bagikan link langsung ujian untuk siswa via WhatsApp / QR Code"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Bagikan Link Siswa</span>
            </button>
          )}
          {!isSiswaRole && (
            <button
              type="button"
              onClick={onRandomizeToken}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Acak Token Baru</span>
            </button>
          )}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setCbtStage('login')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                cbtStage === 'login' || cbtStage === 'exam'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Layar Ujian Siswa
            </button>
            {!isSiswaRole && (
              <button
                type="button"
                onClick={() => setCbtStage('rekap')}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  cbtStage === 'rekap'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-amber-600" />
                <span>Rekap Nilai ({cbtSubmissions.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STAGE 1: LOGIN PESERTA CBT */}
      {cbtStage === 'login' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-emerald-900 text-white p-6">
              <p className="text-xs font-semibold text-amber-300">
                Login Peserta Didik · Tahun Pelajaran {config.tahunPelajaran}
              </p>
              <h3 className="text-xl font-bold mt-1">
                Portal Ujian CBT {schoolProfile.namaSingkat}
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                {isSiswaRole
                  ? `Akun siswa aktif: ${authSession.name} (${authSession.kelas}). Pilih paket ujian lalu masukkan Token Ujian dari Bapak/Ibu Guru.`
                  : 'Pilih paket tes, kelas, dan nama lengkap sesuai daftar absen sekolah, lalu masukkan Token Ujian untuk memulai.'}
              </p>
            </div>

            <form onSubmit={handleStartCBT} className="p-6 space-y-4">
              {cbtLoginError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{cbtLoginError}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Paket Tes Soal CBT
                  </label>
                  {!isSiswaRole && (
                    <button
                      type="button"
                      onClick={() => onSwitchTab('paket')}
                      className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Kelola Paket &amp; Bank Soal
                    </button>
                  )}
                </div>
                <select
                  value={activePackageId || '__custom__'}
                  onChange={(e) => {
                    const selected = availableCbtPackages.find((p) => p.id === e.target.value);
                    if (selected) onActivatePackage(selected);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {!activePackageId && (
                    <option value="__custom__">
                      Naskah Soal Aktif ({config.mapel} · {config.kelas} · {questions.length} Soal)
                    </option>
                  )}
                  {availableCbtPackages.map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>
                      [{pkg.kodePaket}] {pkg.namaPaket} — {pkg.questions.length} Soal
                      {!isSiswaRole ? ` (Token: ${pkg.tokenCBT})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    1. Pilih Kelas Peserta
                  </label>
                  <select
                    value={cbtKelas}
                    disabled={isSiswaRole}
                    onChange={(e) => setCbtKelas(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold bg-slate-50 disabled:opacity-80 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(
                      (k) => (
                        <option key={k} value={k}>
                          {k} ({students.filter((s) => s.kelas === k).length} Siswa)
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    2. Masukkan Token Ujian
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={cbtTokenInput}
                      onChange={(e) => setCbtTokenInput(e.target.value.toUpperCase())}
                      placeholder="Masukkan Token dari Guru"
                      className="w-full rounded-lg border border-emerald-400 bg-emerald-50/40 px-3 py-2.5 text-sm font-mono font-bold text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <Key className="w-4 h-4 text-emerald-700 absolute right-3 top-3" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3. Pilih Nama Lengkap Peserta Didik ({cbtKelas})
                </label>
                <select
                  value={cbtStudentNipd}
                  disabled={isSiswaRole}
                  onChange={(e) => setCbtStudentNipd(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-900 disabled:bg-slate-100 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  {students
                    .filter((s) => s.kelas === cbtKelas)
                    .map((s) => (
                      <option key={s.nipd} value={s.nipd}>
                        {s.no}. {s.nama} — NIPD: {s.nipd} | NISN: {s.nisn}
                      </option>
                    ))}
                </select>
              </div>

              {selectedCbtStudent && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">NIPD / No Induk</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedCbtStudent.nipd}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">NISN</span>
                    <span className="font-mono font-bold text-slate-900">
                      {selectedCbtStudent.nisn}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Jenis Kelamin</span>
                    <span className="font-semibold text-slate-900">
                      {selectedCbtStudent.jk === 'L' ? 'Laki-laki (L)' : 'Perempuan (P)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Agama</span>
                    <span className="font-semibold text-emerald-800">
                      {selectedCbtStudent.agama}
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-6 rounded-lg transition-colors cursor-pointer text-sm"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Mulai Kerjakan Ujian CBT</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Ringkasan Paket Soal CBT Aktif</span>
              </h4>

              <dl className="divide-y divide-slate-100 text-xs">
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Satuan Pendidikan</dt>
                  <dd className="font-semibold text-slate-900">{schoolProfile.namaSingkat}</dd>
                </div>
                {activePackage && (
                  <div className="flex justify-between py-2 gap-3">
                    <dt className="text-slate-500">Paket Tes Aktif</dt>
                    <dd className="font-semibold text-slate-900 text-right">
                      {activePackage.kodePaket} · {activePackage.acakSoal ? 'Soal Acak' : 'Urut'}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between py-2 gap-3">
                  <dt className="text-slate-500">Mata Pelajaran</dt>
                  <dd className="font-semibold text-emerald-800 text-right">{config.mapel}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Kelas Sasaran</dt>
                  <dd className="font-semibold text-slate-900">
                    {config.kelas} ({config.fase})
                  </dd>
                </div>
                <div className="flex justify-between py-2 gap-3">
                  <dt className="text-slate-500">Guru Pengampu</dt>
                  <dd className="font-semibold text-slate-900 text-right">{config.guruNama}</dd>
                </div>
                <div className="flex justify-between py-2 gap-3">
                  <dt className="text-slate-500">Jumlah Butir Soal</dt>
                  <dd className="font-mono font-semibold text-slate-900 text-right">
                    {questions.length} ({pgCount} PG, {isianCount} Isian, {cocokCount} Cocok,{' '}
                    {uraianCount} Esai, {pgkCount} PGK)
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-slate-500">Total Skor Maksimal</dt>
                  <dd className="font-mono font-bold text-emerald-800">{totalScore} Poin</dd>
                </div>
              </dl>
            </div>

            <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3.5 text-xs text-amber-950 space-y-1">
              <strong className="block">Petunjuk Pengerjaan CBT:</strong>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Pilih jawaban dengan mengklik opsi pada layar.</li>
                <li>
                  Gunakan tombol <strong>Ragu-Ragu</strong> bila ingin meninjau ulang soal tersebut
                  nanti.
                </li>
                <li>
                  Nilai otomatis dihitung begitu tombol <strong>Selesai &amp; Kumpulkan</strong>{' '}
                  ditekan.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 2: EXAM SCREEN */}
      {cbtStage === 'exam' &&
        sessionQuestions.length > 0 &&
        (() => {
          const currentQ = sessionQuestions[cbtCurrentIndex] || sessionQuestions[0];
          const currentAns = cbtAnswers[currentQ.nomor];
          const isDoubtful = !!cbtDoubt[currentQ.nomor];
          const answeredCount = Object.keys(cbtAnswers).filter((k) => {
            const v = cbtAnswers[Number(k)];
            if (Array.isArray(v)) return v.length > 0;
            if (v && typeof v === 'object') {
              return Object.values(v).some((val) => Boolean(val && val.trim() !== ''));
            }
            return Boolean(v && v.toString().trim() !== '');
          }).length;

          return (
            <div className="space-y-4">
              {/* Exam Top Bar */}
              <div className="bg-slate-900 text-white rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-700 flex items-center justify-center font-bold text-base">
                    {selectedCbtStudent?.nama?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                      <span>{selectedCbtStudent?.nama}</span>
                      <span className="text-slate-400 font-normal">·</span>
                      <span className="text-xs font-mono text-emerald-300">
                        {selectedCbtStudent?.kelas} / NIPD {selectedCbtStudent?.nipd}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {config.mapel} — {config.jenisAsesmen}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5 text-xs">
                    <span className="text-slate-400 mr-1">Ukuran Teks:</span>
                    {[
                      { id: 'sm' as const, label: 'A-' },
                      { id: 'normal' as const, label: 'A' },
                      { id: 'lg' as const, label: 'A+' },
                    ].map((sz) => (
                      <button
                        key={sz.id}
                        type="button"
                        onClick={() => setCbtFontSize(sz.id)}
                        className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                          cbtFontSize === sz.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>

                  <div
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-base border ${
                      cbtTimeLeft < 300
                        ? 'bg-rose-700 border-rose-400 text-white'
                        : 'bg-emerald-800 border-emerald-600 text-white'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span>{formatTimer(cbtTimeLeft)}</span>
                  </div>
                </div>
              </div>

              {/* Exam Main Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col justify-between min-h-[460px]">
                  <div>
                    <div className="bg-slate-50 border-b border-slate-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-emerald-700 text-white font-mono font-bold text-xs px-3 py-1 rounded-md">
                          SOAL NO. {currentQ.nomor}
                        </span>
                        <span className="text-xs font-semibold text-slate-600">
                          {currentQ.bentuk === 'PG'
                            ? 'Pilihan Ganda'
                            : currentQ.bentuk === 'PGK'
                              ? 'Pilihan Ganda Kompleks'
                              : currentQ.bentuk === 'Isian'
                                ? 'Isian Singkat'
                                : currentQ.bentuk === 'Mencocokkan'
                                  ? 'Mencocokkan / Menjodohkan'
                                  : 'Esai / Uraian'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-mono">
                        <span>Bloom: {currentQ.bloom}</span>
                        <span aria-hidden="true">·</span>
                        <span>Bobot: {currentQ.skor} Poin</span>
                      </div>
                    </div>

                    <div
                      className={`p-6 space-y-5 ${
                        cbtFontSize === 'sm'
                          ? 'text-sm'
                          : cbtFontSize === 'lg'
                            ? 'text-lg'
                            : 'text-base'
                      }`}
                    >
                      {currentQ.stimulus && (
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg text-slate-700 whitespace-pre-line leading-relaxed">
                          {currentQ.stimulus}
                        </div>
                      )}

                      {currentQ.gambarUrl && (
                        <div className="my-3 text-center">
                          <img
                            src={currentQ.gambarUrl}
                            alt={currentQ.gambarDeskripsi || 'Gambar Stimulus Soal'}
                            className="max-h-72 max-w-full rounded-xl border border-slate-200 shadow-xs mx-auto object-contain bg-white"
                          />
                          {currentQ.gambarDeskripsi && (
                            <p className="text-xs text-slate-500 mt-1.5 italic">
                              {currentQ.gambarDeskripsi}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="font-semibold text-slate-900 leading-relaxed">
                        {currentQ.pertanyaan}
                      </div>

                      {currentQ.bentuk === 'PG' && (
                        <div className="space-y-2.5 pt-2">
                          {(currentQ.opsi || []).map((opt, idx) => {
                            const letter = String.fromCharCode(65 + idx);
                            const isSelected = currentAns === letter;
                            const cleanText = opt.replace(/^[A-Da-d][.)]\s*/, '');
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleSelectPGOption(currentQ.nomor, letter)}
                                className={`w-full text-left p-3.5 rounded-lg border-2 transition-colors flex items-start gap-3.5 cursor-pointer ${
                                  isSelected
                                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-semibold'
                                    : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 ${
                                    isSelected
                                      ? 'bg-emerald-700 text-white'
                                      : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {letter}
                                </span>
                                <span className="flex-1 leading-snug">{cleanText}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentQ.bentuk === 'PGK' && (
                        <div className="space-y-2.5 pt-2">
                          <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md inline-block">
                            Petunjuk: Klik pada kotak pernyataan yang benar (Jawaban benar lebih
                            dari satu)
                          </p>
                          {(currentQ.opsi || []).map((opt, idx) => {
                            const selectedArr = Array.isArray(currentAns)
                              ? (currentAns as number[])
                              : [];
                            const isChecked = selectedArr.includes(idx);
                            const cleanText = opt.replace(/^\[\s*\]\s*/, '');
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleTogglePGKOption(currentQ.nomor, idx)}
                                className={`w-full text-left p-3.5 rounded-lg border-2 transition-colors flex items-start gap-3.5 cursor-pointer ${
                                  isChecked
                                    ? 'border-emerald-700 bg-emerald-50 text-emerald-950 font-semibold'
                                    : 'border-slate-200 hover:border-emerald-400 hover:bg-slate-50 text-slate-800'
                                }`}
                              >
                                <span
                                  className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 border ${
                                    isChecked
                                      ? 'bg-emerald-700 border-emerald-700 text-white'
                                      : 'bg-white border-slate-400 text-transparent'
                                  }`}
                                >
                                  ✓
                                </span>
                                <span className="flex-1 leading-snug">{cleanText}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {currentQ.bentuk === 'Isian' && (
                        <div className="pt-2 space-y-2">
                          <label className="block text-xs font-semibold text-slate-600">
                            Ketik Jawaban Singkat Anda:
                          </label>
                          <input
                            type="text"
                            value={typeof currentAns === 'string' ? currentAns : ''}
                            onChange={(e) => handleTextAnswerChange(currentQ.nomor, e.target.value)}
                            placeholder="Ketik jawaban singkat di sini..."
                            className="w-full rounded-lg border-2 border-slate-300 focus:border-emerald-700 px-4 py-3 text-base font-semibold text-slate-900 focus:outline-none"
                          />
                        </div>
                      )}

                      {currentQ.bentuk === 'Mencocokkan' &&
                        (() => {
                          const pairs = parseMatchingPairs(currentQ.opsi || []);
                          const rightOptions = getShuffledRightOptions(pairs, currentQ.nomor);
                          const currentMap =
                            currentAns && typeof currentAns === 'object' && !Array.isArray(currentAns)
                              ? (currentAns as Record<number, string>)
                              : {};
                          return (
                            <div className="pt-2 space-y-3">
                              <p className="text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-md inline-block">
                                Petunjuk: Pilih pasangan jawaban yang paling tepat pada Kolom Kanan
                                untuk setiap pernyataan di Kolom Kiri.
                              </p>
                              <div className="border border-slate-200 rounded-lg divide-y divide-slate-200">
                                {pairs.map((p, idx) => (
                                  <div
                                    key={idx}
                                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white"
                                  >
                                    <div className="flex items-start gap-2.5 text-sm font-medium text-slate-900 flex-1">
                                      <span className="font-mono font-bold text-emerald-800 shrink-0">
                                        {idx + 1}.
                                      </span>
                                      <span>{p.left}</span>
                                    </div>
                                    <div className="sm:w-72 shrink-0">
                                      <select
                                        value={currentMap[idx] || ''}
                                        onChange={(e) =>
                                          handleMatchSelect(currentQ.nomor, idx, e.target.value)
                                        }
                                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold bg-slate-50 focus:border-emerald-700 focus:outline-none"
                                      >
                                        <option value="">-- Pilih Pasangan --</option>
                                        {rightOptions.map((ro) => (
                                          <option key={ro.letter} value={ro.text}>
                                            {ro.letter}. {ro.text}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                      {currentQ.bentuk === 'Uraian' && (
                        <div className="pt-2 space-y-2">
                          <label className="block text-xs font-semibold text-slate-600">
                            Ketik Jawaban Uraian Lengkap Anda:
                          </label>
                          <textarea
                            rows={4}
                            value={typeof currentAns === 'string' ? currentAns : ''}
                            onChange={(e) => handleTextAnswerChange(currentQ.nomor, e.target.value)}
                            placeholder="Tuliskan penjelasan atau langkah penyelesaian secara lengkap di sini..."
                            className="w-full rounded-lg border-2 border-slate-300 focus:border-emerald-700 p-4 text-base text-slate-900 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={cbtCurrentIndex === 0}
                      onClick={() => setCbtCurrentIndex((prev) => Math.max(0, prev - 1))}
                      className="flex items-center gap-1.5 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-700 font-semibold px-4 py-2 rounded-lg border border-slate-300 text-xs md:text-sm transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Sebelumnya</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleDoubt(currentQ.nomor)}
                      className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-lg text-xs md:text-sm border transition-colors cursor-pointer whitespace-nowrap ${
                        isDoubtful
                          ? 'bg-amber-400 text-amber-950 border-amber-500'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      <Flag className="w-4 h-4" />
                      <span>{isDoubtful ? 'Ditandai Ragu-Ragu' : 'Ragu-Ragu'}</span>
                    </button>

                    {cbtCurrentIndex < sessionQuestions.length - 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setCbtCurrentIndex((prev) =>
                            Math.min(sessionQuestions.length - 1, prev + 1)
                          )
                        }
                        className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-lg text-xs md:text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <span>Selanjutnya</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCbtConfirmSubmit(true)}
                        className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold px-5 py-2 rounded-lg text-xs md:text-sm transition-colors cursor-pointer whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesai &amp; Kumpulkan</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Number Grid */}
                <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-bold text-slate-900 text-sm">Navigasi Nomor Soal</span>
                    <span className="text-xs font-mono font-semibold text-emerald-800">
                      Terjawab: {answeredCount}/{sessionQuestions.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {sessionQuestions.map((q, idx) => {
                      const ans = cbtAnswers[q.nomor];
                      const hasAns = Array.isArray(ans)
                        ? ans.length > 0
                        : ans && typeof ans === 'object'
                          ? Object.values(ans).some((val) => Boolean(val && val.trim() !== ''))
                          : Boolean(ans && ans.toString().trim() !== '');
                      const doubt = !!cbtDoubt[q.nomor];
                      const isCurrent = idx === cbtCurrentIndex;

                      let btnClass =
                        'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
                      if (doubt) {
                        btnClass = 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
                      } else if (hasAns) {
                        btnClass = 'bg-emerald-700 text-white border-emerald-800 font-bold';
                      }

                      return (
                        <button
                          key={q.nomor}
                          type="button"
                          onClick={() => setCbtCurrentIndex(idx)}
                          className={`h-11 rounded-lg border font-mono text-xs flex flex-col items-center justify-center transition-transform cursor-pointer ${btnClass} ${
                            isCurrent ? 'ring-2 ring-offset-2 ring-slate-900' : ''
                          }`}
                        >
                          <span>{q.nomor}</span>
                          {hasAns && typeof ans === 'string' && ans.length <= 2 && (
                            <span className="text-[9px] opacity-90">{ans}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-emerald-700 inline-block" />
                      <span>Terjawab</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                      <span>Ragu</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded bg-slate-200 border border-slate-300 inline-block" />
                      <span>Kosong</span>
                    </div>
                  </div>

                  {!cbtConfirmSubmit ? (
                    <button
                      type="button"
                      onClick={() => setCbtConfirmSubmit(true)}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 rounded-lg text-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                      <span>Kumpulkan Jawaban Ujian</span>
                    </button>
                  ) : (
                    <div className="bg-rose-50 border border-rose-300 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-bold text-rose-950">
                        Konfirmasi Pengumpulan Ujian
                      </p>
                      <p className="text-xs text-rose-800">
                        Anda telah menjawab{' '}
                        <strong>
                          {answeredCount} dari {sessionQuestions.length} soal
                        </strong>
                        . Yakin ingin mengakhiri ujian dan melihat hasil nilai?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleFinishCBTExam}
                          className="flex-1 bg-rose-700 hover:bg-rose-800 text-white font-bold py-2 rounded-lg text-xs cursor-pointer"
                        >
                          Ya, Selesai Ujian
                        </button>
                        <button
                          type="button"
                          onClick={() => setCbtConfirmSubmit(false)}
                          className="flex-1 bg-white hover:bg-slate-100 text-slate-700 font-semibold py-2 rounded-lg border border-slate-300 text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* STAGE 3: HASIL UJIAN CBT */}
      {cbtStage === 'result' && cbtLastResult && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="text-xs font-bold text-emerald-700">Ujian CBT Selesai Direkam</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{cbtLastResult.nama}</h3>
              <p className="text-xs text-slate-500 mt-1">
                {cbtLastResult.kelas} <span aria-hidden="true">·</span> NIPD:{' '}
                <span className="font-mono">{cbtLastResult.nipd}</span>{' '}
                <span aria-hidden="true">·</span> NISN:{' '}
                <span className="font-mono">{cbtLastResult.nisn}</span>{' '}
                <span aria-hidden="true">·</span> {cbtLastResult.mapel}
              </p>
            </div>

            <div className="flex items-center gap-4 bg-emerald-900 text-white px-6 py-4 rounded-xl">
              <div className="text-right">
                <span className="text-[11px] text-emerald-200 block">Nilai Akhir CBT</span>
                <span className="text-3xl font-mono font-bold">{cbtLastResult.nilaiAkhir}</span>
              </div>
              <div className="border-l border-emerald-700 pl-4 text-xs">
                <div className="font-mono">
                  Skor: <strong>{cbtLastResult.skorPerolehan}</strong> /{' '}
                  {cbtLastResult.skorMaksimal}
                </div>
                <div className="text-emerald-200 mt-0.5">Ketuntasan Bloom:</div>
                <div className="font-mono text-[11px]">{cbtLastResult.detailBloom}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-slate-900 text-sm">
              Rincian Jawaban &amp; Analisis Kognitif Taksonomi Bloom
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700">
                    <th className="p-2.5 w-12 text-center">No</th>
                    <th className="p-2.5 w-24">Bentuk</th>
                    <th className="p-2.5 w-20 text-center">Bloom</th>
                    <th className="p-2.5">Jawaban Peserta Didik</th>
                    <th className="p-2.5">Kunci Jawaban / Rubrik</th>
                    <th className="p-2.5 w-24 text-center">Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {(cbtLastResult.details || []).map((d) => (
                    <tr key={d.nomor} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono font-bold">{d.nomor}</td>
                      <td className="p-2.5">{d.bentuk}</td>
                      <td className="p-2.5 text-center font-mono font-semibold text-emerald-800">
                        {d.bloom}
                      </td>
                      <td className="p-2.5 font-medium">{d.jawabanSiswa}</td>
                      <td className="p-2.5 text-slate-600">{d.kunci}</td>
                      <td className="p-2.5 text-center font-mono font-bold">
                        <span
                          className={
                            d.skorPerolehan === d.skorMaks
                              ? 'text-emerald-700'
                              : d.skorPerolehan > 0
                                ? 'text-amber-700'
                                : 'text-rose-700'
                          }
                        >
                          {d.skorPerolehan} / {d.skorMaks}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCbtStage('login')}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-4 py-2 rounded-lg text-xs cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isSiswaRole ? 'Kembali ke Beranda CBT' : 'Login Siswa Berikutnya'}</span>
            </button>
            {!isSiswaRole && (
              <button
                type="button"
                onClick={() => setCbtStage('rekap')}
                className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-lg text-xs cursor-pointer"
              >
                <Award className="w-4 h-4 text-amber-300" />
                <span>Lihat Rekap Nilai CBT Kelas</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STAGE 4: REKAP NILAI CBT */}
      {cbtStage === 'rekap' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Rekapitulasi Nilai Ujian CBT Siswa — SDN Kandangan I Tosari
              </h3>
              <p className="text-xs text-slate-500">
                Setiap peserta yang menyelesaikan ujian CBT tercatat otomatis beserta ketuntasan
                Taksonomi Bloom.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => exportRekapCBTCSV(cbtSubmissions, config)}
                className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Unduh Rekap Excel/CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setCbtStage('login')}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3.5 py-2 rounded-lg text-xs cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Tambah Peserta Ujian</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Waktu Selesai</th>
                  <th className="p-3">NIPD / NISN</th>
                  <th className="p-3">Nama Peserta Didik</th>
                  <th className="p-3">Kelas</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">Skor</th>
                  <th className="p-3 text-center">Nilai Akhir</th>
                  <th className="p-3">Ketuntasan Taksonomi Bloom</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cbtSubmissions.map((sub, i) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="p-3 text-center font-mono font-bold">{i + 1}</td>
                    <td className="p-3 text-slate-500 font-mono">{sub.waktuSelesai}</td>
                    <td className="p-3 font-mono">
                      {sub.nipd} / {sub.nisn}
                    </td>
                    <td className="p-3 font-semibold text-slate-900">{sub.nama}</td>
                    <td className="p-3">{sub.kelas}</td>
                    <td className="p-3">{sub.mapel}</td>
                    <td className="p-3 text-center font-mono font-semibold">
                      {sub.skorPerolehan} / {sub.skorMaksimal}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-800 text-sm">
                      {sub.nilaiAkhir}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-600">{sub.detailBloom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
