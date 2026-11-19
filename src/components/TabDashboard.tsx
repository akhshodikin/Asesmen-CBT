import React, { useMemo } from 'react';
import {
  Users,
  UserCheck,
  Package,
  BarChart3,
  Monitor,
  FileText,
  Settings,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Clock,
  KeyRound,
  CheckCircle2,
  Calendar,
  Layers,
  Code,
  ShieldAlert,
} from 'lucide-react';
import type {
  ActiveTab,
  AssessmentConfig,
  AuthSession,
  BankQuestionItem,
  CBTSubmission,
  ExamPackage,
  SchoolProfile,
  Student,
  Teacher,
} from '../types';
import { getDefaultCrestDataUrl } from './KopNaskah';

interface TabDashboardProps {
  schoolProfile: SchoolProfile;
  config: AssessmentConfig;
  students: Student[];
  teachers: Teacher[];
  examPackages: ExamPackage[];
  bankQuestions: BankQuestionItem[];
  cbtSubmissions: CBTSubmission[];
  authSession: AuthSession;
  onNavigate: (tabId: ActiveTab) => void;
  kktp: number;
}

export const TabDashboard: React.FC<TabDashboardProps> = ({
  schoolProfile,
  config,
  students,
  teachers,
  examPackages,
  bankQuestions,
  cbtSubmissions,
  authSession,
  onNavigate,
  kktp,
}) => {
  // Statistics calculations
  const classBreakdown = useMemo(() => {
    const classes = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];
    const total = students.length || 1;
    return classes.map((k) => {
      const count = students.filter((s) => s.kelas === k).length;
      const pct = Math.round((count / total) * 100);
      return { kelas: k, count, pct };
    });
  }, [students]);

  const religionBreakdown = useMemo(() => {
    const total = students.length || 1;
    const hindu = students.filter((s) => s.agama === 'HINDU').length;
    const islam = students.filter((s) => s.agama === 'ISLAM').length;
    const kristen = students.filter((s) => s.agama === 'KRISTEN').length;
    return {
      hindu: { count: hindu, pct: Math.round((hindu / total) * 100) },
      islam: { count: islam, pct: Math.round((islam / total) * 100) },
      kristen: { count: kristen, pct: Math.round((kristen / total) * 100) },
    };
  }, [students]);

  const cbtStats = useMemo(() => {
    if (cbtSubmissions.length === 0) {
      return { avgScore: 0, passCount: 0, passRate: 0 };
    }
    const totalScore = cbtSubmissions.reduce((acc, curr) => acc + (curr.nilaiAkhir || 0), 0);
    const avgScore = Math.round(totalScore / cbtSubmissions.length);
    const passCount = cbtSubmissions.filter((s) => (s.nilaiAkhir || 0) >= kktp).length;
    const passRate = Math.round((passCount / cbtSubmissions.length) * 100);
    return { avgScore, passCount, passRate };
  }, [cbtSubmissions, kktp]);

  const recentSubmissions = useMemo(() => {
    return [...cbtSubmissions].reverse().slice(0, 5);
  }, [cbtSubmissions]);

  return (
    <div className="space-y-6 no-print">
      {/* HERO BANNER: SMART ASESMEN */}
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-2xl p-6 lg:p-8 shadow-md relative overflow-hidden">
        {/* Subtle Decorative Elements */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-10 w-48 h-48 bg-emerald-400/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-amber-400 text-emerald-950 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-md tracking-wider flex items-center gap-1 shadow-xs">
                <Sparkles className="w-3.5 h-3.5" />
                SMART ASESMEN
              </span>
              <span className="bg-emerald-800/80 text-emerald-200 text-xs px-2.5 py-1 rounded-md border border-emerald-700/60 font-medium">
                Kurikulum Merdeka &amp; CBT
              </span>
              <span className="bg-emerald-800/80 text-emerald-200 text-xs px-2.5 py-1 rounded-md border border-emerald-700/60 font-medium">
                {schoolProfile.namaSingkat}
              </span>
            </div>

            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
                SMART ASESMEN — {schoolProfile.namaSekolahHeader}
              </h1>
              <p className="text-xs lg:text-sm text-emerald-100/90 mt-1 leading-relaxed">
                Platform terpadu penyusunan kisi-kisi, naskah asesmen siap cetak, bank soal digital,
                dan pelaksanaan ujian Computer Based Test (CBT) berbasis kearifan lokal lereng Bromo.
              </p>
            </div>

            {/* Quick Meta Pills */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-emerald-200">
              <div className="flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                <Calendar className="w-3.5 h-3.5 text-amber-300" />
                <span>TP {config.tahunPelajaran} ({config.jenisAsesmen})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                <span>Target: {config.kelas} ({config.fase})</span>
              </div>
              <div className="flex items-center gap-1.5 bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-800/60">
                <KeyRound className="w-3.5 h-3.5 text-amber-300" />
                <span>Token CBT: <strong className="font-mono text-white">{config.tokenCBT}</strong></span>
              </div>
            </div>
          </div>

          {/* School Badge / Logo Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 flex items-center gap-3.5 shrink-0 shadow-inner">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shadow-md shrink-0">
                <img
                  src="/assets/logo-sekolah.png"
                  alt="Logo SDN Kandangan I Tosari"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center shadow-md shrink-0">
                <img
                  src="/assets/logo-pasuruan.png"
                  alt="Logo Kabupaten Pasuruan"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div className="text-left text-xs space-y-0.5">
              <p className="text-amber-300 font-bold uppercase tracking-wider text-[10px]">
                {schoolProfile.namaDinas || 'DINAS PENDIDIKAN DAN KEBUDAYAAN'}
              </p>
              <p className="font-bold text-white text-sm leading-tight">
                {schoolProfile.namaSingkat}
              </p>
              <p className="text-emerald-200 text-[11px]">
                {schoolProfile.lokasiSingkat}
              </p>
              <div className="pt-1">
                <span className="inline-block text-[10px] bg-emerald-700/80 text-emerald-100 px-2 py-0.5 rounded font-mono">
                  NPSN: {schoolProfile.npsn}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STAT CARDS: 4 METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Siswa */}
        <div
          onClick={() => onNavigate('siswa')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Peserta Didik
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {students.length} <span className="text-xs font-normal text-slate-500">Siswa</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              L: {students.filter((s) => s.jk === 'L').length} siswa · P: {students.filter((s) => s.jk === 'P').length} siswa
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700 group-hover:text-emerald-800">
            <span>Kelola Data Siswa</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Guru */}
        <div
          onClick={() => onNavigate('guru')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pendidik &amp; Guru
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {teachers.length} <span className="text-xs font-normal text-slate-500">Guru</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Guru Kelas: {teachers.filter((t) => t.jabatan === 'Guru Kelas').length} · Mapel/Lain: {teachers.filter((t) => t.jabatan !== 'Guru Kelas').length}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700 group-hover:text-blue-800">
            <span>Data Master Guru</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Paket CBT */}
        <div
          onClick={() => onNavigate('paket')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Paket Ujian CBT
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-700 group-hover:text-white transition-colors">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {examPackages.length} <span className="text-xs font-normal text-slate-500">Paket</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {bankQuestions.length} butir tersimpan di Bank Soal
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700 group-hover:text-purple-800">
            <span>Bank Soal &amp; Paket</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Hasil CBT */}
        <div
          onClick={() => onNavigate('analisis')}
          className="bg-white p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Evaluasi &amp; Nilai
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-700 group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">
              {cbtStats.avgScore} <span className="text-xs font-normal text-slate-500">Rerata Nilai</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Ketuntasan KKTP ({kktp}): <span className="font-semibold text-emerald-700">{cbtStats.passRate}%</span> ({cbtStats.passCount}/{cbtSubmissions.length})
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:text-amber-800">
            <span>Analisis Hasil &amp; Rekap</span>
            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* PUSAT PINTASAN CEPAT (ACTION CENTER) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Pusat Aksi Cepat Asesmen</h3>
            <p className="text-xs text-slate-500">
              Navigasi instan untuk menyelesaikan seluruh tahapan asesmen dan administrasi sekolah.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-400">
            Peran Aktif: <strong className="text-emerald-700 uppercase">{authSession.role}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('generator')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-emerald-100 text-emerald-800 group-hover:bg-emerald-700 group-hover:text-white transition-colors">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-emerald-800">
                1. Susun Kisi-Kisi &amp; Soal
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Konfigurasi CP, Taksonomi Bloom (C1-C6), dan generator soal AI &amp; template lokal.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('naskah')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-blue-100 text-blue-800 group-hover:bg-blue-700 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-blue-800">
                2. Naskah Soal Siap Cetak
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Format resmi dengan Kop Sekolah, lembar jawaban, dan tombol cetak langsung / PDF.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('cbt')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-700 group-hover:text-white transition-colors">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-amber-800">
                3. Buka Portal Ujian CBT
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Simulasi ujian online siswa dengan timer, ragu-ragu, dan koreksi otomatis.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('analisis')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-teal-100 text-teal-800 group-hover:bg-teal-700 group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-teal-800">
                4. Analisis Butir Soal &amp; Nilai
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Analisis ketuntasan KKTP, sebaran Bloom, serta ekspor rekap ke format Excel.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('kisikisi')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-indigo-100 text-indigo-800 group-hover:bg-indigo-700 group-hover:text-white transition-colors">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-indigo-800">
                5. Matriks 8 Dimensi Lulusan
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pemetaan capaian pembelajaran, indikator soal, dan level kesulitan kognitif.
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('gform')}
            className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-rose-500 hover:bg-rose-50/40 transition-all flex items-start gap-3.5 cursor-pointer group"
          >
            <div className="p-2.5 rounded-lg bg-rose-100 text-rose-800 group-hover:bg-rose-700 group-hover:text-white transition-colors">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs group-hover:text-rose-800">
                6. Ekspor Google Form &amp; Aiken
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Generator script otomatis Google Forms untuk ujian daring tanpa ketik ulang.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* DUAL WIDGETS: DEMOGRAFI KELAS & KEARIFAN LOKAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Distribusi Siswa per Kelas */}
        <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Sebaran Peserta Didik per Kelas (Kelas 1–6)
              </h3>
              <p className="text-[11px] text-slate-500">
                Total {students.length} peserta didik terdaftar pada Tahun Pelajaran {config.tahunPelajaran}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('siswa')}
              className="text-xs text-emerald-700 hover:underline font-semibold cursor-pointer"
            >
              Lihat Detail
            </button>
          </div>

          <div className="space-y-3 pt-1">
            {classBreakdown.map((item) => (
              <div key={item.kelas} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{item.kelas}</span>
                  <span className="text-slate-600 font-mono">
                    <strong>{item.count}</strong> Siswa ({item.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(item.pct, 5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Kearifan Lokal & Agama Tengger */}
        <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <span>Kearifan Lokal &amp; Keragaman Agama</span>
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                  Tosari / Tengger
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                SDN Kandangan I Tosari menjunjung tinggi kerukunan dan toleransi beragama.
              </p>
            </div>

            <div className="space-y-3 pt-3">
              <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-950 text-xs">Agama Hindu</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">Tradisi adat Suku Tengger</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-amber-900">{religionBreakdown.hindu.count}</span>
                  <span className="text-xs text-amber-700 ml-1">({religionBreakdown.hindu.pct}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs">Agama Islam</h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">Masyarakat lereng pegunungan</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-emerald-900">{religionBreakdown.islam.count}</span>
                  <span className="text-xs text-emerald-700 ml-1">({religionBreakdown.islam.pct}%)</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-purple-200 bg-purple-50/60 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-purple-950 text-xs">Agama Kristen</h4>
                  <p className="text-[11px] text-purple-800 mt-0.5">Keberagaman warga Kandangan</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-purple-900">{religionBreakdown.kristen.count}</span>
                  <span className="text-xs text-purple-700 ml-1">({religionBreakdown.kristen.pct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">💡 Konteks Pembelajaran:</span>
            <p>
              Soal pada SMART ASESMEN dapat diintegrasikan dengan konteks pertanian sayur dataran tinggi (kentang, kubis, wortel) serta budaya gotong royong Tengger.
            </p>
          </div>
        </div>
      </div>

      {/* RECENT CBT EXAMS & PACKAGES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Paket Asesmen Tersedia */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Paket Soal CBT Aktif</h3>
              <p className="text-[11px] text-slate-500">Daftar paket asesmen siap diujikan kepada siswa</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('paket')}
              className="text-xs text-purple-700 hover:underline font-semibold cursor-pointer"
            >
              Semua Paket
            </button>
          </div>

          <div className="space-y-2">
            {examPackages.slice(0, 3).map((pkg) => (
              <div
                key={pkg.id}
                className="p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <h4 className="font-bold text-slate-900">{pkg.namaPaket}</h4>
                  <div className="flex items-center gap-2 text-slate-500 mt-0.5">
                    <span>{pkg.mapel}</span>
                    <span>·</span>
                    <span>{pkg.kelas}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1 font-mono text-[11px]">
                      <Clock className="w-3 h-3" />
                      {pkg.durasiMenit} Menit
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="block font-mono font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-[11px]">
                    Token: {pkg.tokenCBT}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate('cbt')}
                    className="text-[11px] text-blue-600 hover:underline mt-1 block font-semibold cursor-pointer"
                  >
                    Buka Ujian &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Riwayat Ujian CBT Terkini */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Riwayat Ujian CBT Siswa Terkini</h3>
              <p className="text-[11px] text-slate-500">Hasil pengerjaan asesmen yang telah dikumpulkan</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('analisis')}
              className="text-xs text-amber-700 hover:underline font-semibold cursor-pointer"
            >
              Lihat Rekap
            </button>
          </div>

          {recentSubmissions.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              Belum ada riwayat pelaksanaan ujian CBT yang terekam.
            </div>
          ) : (
            <div className="space-y-2">
              {recentSubmissions.map((sub, idx) => {
                const isPassed = (sub.nilaiAkhir || 0) >= kktp;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{sub.nama}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>{sub.kelas}</span>
                        <span>·</span>
                        <span>NIPD: {sub.nipd}</span>
                        <span>·</span>
                        <span>{sub.mapel}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {sub.nilaiAkhir}{' '}
                        <span className="text-[10px] text-slate-400 font-normal">/ 100</span>
                      </div>
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPassed ? 'Tuntas' : 'Perlu Bimbingan'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
