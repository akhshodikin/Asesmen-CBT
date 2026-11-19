import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode,
  FileSpreadsheet,
  FolderSync,
  Sparkles,
  Link2,
  Package,
} from 'lucide-react';
import type { ActiveTab, AssessmentConfig, ExamPackage, QuestionItem, Student } from '../types';
import {
  buildAikenFormat,
  buildGoogleAppsScript,
  downloadTextFile,
  exportQuizizzCSV,
} from '../utils/exportHelpers';

interface TabGoogleFormProps {
  config: AssessmentConfig;
  questions: QuestionItem[];
  students: Student[];
  examPackages?: ExamPackage[];
  activePackageId?: string | null;
  onActivatePackage?: (pkg: ExamPackage, targetTab?: ActiveTab) => void;
}

export const GoogleDriveLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 87.3 78" className={className} fill="none">
    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47"/>
    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z" fill="#ea4335"/>
    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

export const GoogleFormsLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="4" fill="#7248B9"/>
    <path d="M7 7.5h10v2H7v-2zm0 3.5h10v2H7v-2zm0 3.5h6v2H7v-2z" fill="#FFFFFF"/>
  </svg>
);

export const GoogleSheetsLogo: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <rect width="24" height="24" rx="4" fill="#0F9D58"/>
    <path d="M6 6.5h12v3H6v-3zm0 4h5v3H6v-3zm6 0h6v3h-6v-3zm-6 4h5v3H6v-3zm6 0h6v3h-6v-3z" fill="#FFFFFF"/>
  </svg>
);

export const TabGoogleForm: React.FC<TabGoogleFormProps> = ({
  config,
  questions,
  students,
  examPackages = [],
  activePackageId = null,
  onActivatePackage,
}) => {
  const [selectedPackageId, setSelectedPackageId] = useState<string>('active');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedAiken, setCopiedAiken] = useState(false);
  const [includeStudentDropdown, setIncludeStudentDropdown] = useState(true);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [autoCreateSheet, setAutoCreateSheet] = useState(true);
  const [organizeInDriveFolder, setOrganizeInDriveFolder] = useState(true);

  const selectedPkg = useMemo(
    () => examPackages.find((p) => p.id === selectedPackageId),
    [examPackages, selectedPackageId]
  );

  const activeQuestions = useMemo(() => {
    if (selectedPackageId !== 'active' && selectedPkg) {
      return selectedPkg.questions;
    }
    return questions;
  }, [selectedPackageId, selectedPkg, questions]);

  const activeConfig = useMemo(() => {
    if (selectedPackageId !== 'active' && selectedPkg) {
      return {
        ...config,
        mapel: selectedPkg.mapel,
        kelas: selectedPkg.kelas,
        fase: selectedPkg.fase,
        jenisAsesmen: selectedPkg.jenisAsesmen,
        durasiMenit: selectedPkg.durasiMenit,
        tokenCBT: selectedPkg.tokenCBT,
        waktu: `${selectedPkg.durasiMenit} Menit`,
      };
    }
    return config;
  }, [selectedPackageId, selectedPkg, config]);

  const customTitle = useMemo(() => {
    if (selectedPackageId !== 'active' && selectedPkg) {
      return selectedPkg.namaPaket;
    }
    return undefined;
  }, [selectedPackageId, selectedPkg]);

  const classStudentCount = useMemo(
    () => students.filter((s) => s.kelas === activeConfig.kelas).length,
    [students, activeConfig.kelas]
  );

  const googleAppsScriptCode = useMemo(
    () =>
      buildGoogleAppsScript(
        activeQuestions,
        students,
        activeConfig,
        includeStudentDropdown,
        shuffleQuestions,
        autoCreateSheet,
        organizeInDriveFolder,
        customTitle
      ),
    [
      activeQuestions,
      students,
      activeConfig,
      includeStudentDropdown,
      shuffleQuestions,
      autoCreateSheet,
      organizeInDriveFolder,
      customTitle,
    ]
  );

  const aikenFormatText = useMemo(() => buildAikenFormat(activeQuestions), [activeQuestions]);

  return (
    <div className="space-y-6 no-print">
      {/* Top Banner with Google Workspace Ecosystem */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800">
              <span className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                <GoogleDriveLogo className="w-4 h-4" />
                Google Workspace &amp; Drive
              </span>
              <span>·</span>
              <span>SDN Kandangan I Tosari</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1 flex items-center gap-2">
              <span>Generator Otomatis Google Form &amp; Rekap Google Sheets</span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Buat paket ujian daring dalam 1 kali klik. Script ini secara otomatis menyusun <strong>Google Form Kuis</strong> (dengan kunci, skor, pembahasan &amp; daftar siswa) sekaligus <strong>menghubungkannya ke Google Sheets</strong> di dalam folder <strong>Google Drive</strong> Anda.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <a
              href="https://drive.google.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-3 py-2 rounded-lg transition-colors border border-slate-300"
            >
              <GoogleDriveLogo className="w-4 h-4" />
              <span>Buka Google Drive</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <button
              type="button"
              onClick={() => exportQuizizzCSV(activeQuestions, activeConfig)}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV Quizizz</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  aikenFormatText,
                  `Moodle_Aiken_${activeConfig.mapel}_${activeConfig.kelas}.txt`
                )
              }
              className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <FileCode className="w-4 h-4" />
              <span>Format Aiken</span>
            </button>
            <button
              type="button"
              onClick={() =>
                downloadTextFile(
                  JSON.stringify(activeQuestions, null, 2),
                  `Bank_Soal_CBT_${activeConfig.mapel}_${activeConfig.kelas}.json`,
                  'application/json'
                )
              }
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>JSON CBT</span>
            </button>
          </div>
        </div>

        {/* Source Selector: Paket Soal vs Naskah Soal Saat Ini */}
        {examPackages && examPackages.length > 0 && (
          <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 border border-purple-200/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                    Pilih Paket Soal untuk Dibuat Google Form:
                  </span>
                  {selectedPackageId !== 'active' && selectedPkg && (
                    <span className="bg-purple-200 text-purple-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Paket Tes CBT
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-purple-900 mt-0.5">
                  {selectedPackageId === 'active'
                    ? 'Saat ini menggunakan Naskah Soal Aktif di workspace.'
                    : `Menggunakan butir soal dari paket: "${selectedPkg?.namaPaket}" (Kode: ${selectedPkg?.kodePaket})`}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="text-xs bg-white border border-purple-300 rounded-lg px-3 py-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 shadow-xs max-w-xs md:max-w-md"
              >
                <option value="active">
                  📄 Naskah Soal Aktif ({config.mapel} - {config.kelas} - {questions.length} Soal)
                </option>
                {examPackages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    📦 {pkg.namaPaket} ({pkg.mapel} - {pkg.kelas} - {pkg.questions.length} Soal)
                  </option>
                ))}
              </select>

              {selectedPackageId !== 'active' && selectedPkg && onActivatePackage && (
                <button
                  type="button"
                  onClick={() => onActivatePackage(selectedPkg)}
                  className="text-xs font-semibold bg-white hover:bg-purple-100 text-purple-800 border border-purple-300 px-2.5 py-2 rounded-lg cursor-pointer whitespace-nowrap shadow-xs transition-colors"
                  title="Jadikan paket ini sebagai naskah soal aktif aplikasi"
                >
                  Jadikan Naskah Aktif
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3 Steps Pipeline Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Card 1: Google Form */}
          <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <GoogleFormsLogo className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-xs text-purple-950">1. Google Form Kuis</h4>
            </div>
            <p className="text-[11px] text-purple-900 leading-snug">
              Semua <strong>{activeQuestions.length} butir soal</strong>, pilihan ganda, kunci jawaban, skor, dan feedback pembahasan otomatis tersusun.
            </p>
          </div>

          {/* Card 2: Google Sheets */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <GoogleSheetsLogo className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-xs text-emerald-950">2. Rekap Google Sheets Otomatis</h4>
            </div>
            <p className="text-[11px] text-emerald-900 leading-snug">
              Google Spreadsheet otomatis terbuat dan langsung terhubung sebagai tempat penampungan nilai siswa secara *real-time*.
            </p>
          </div>

          {/* Card 3: Google Drive */}
          <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center gap-2">
              <GoogleDriveLogo className="w-5 h-5 shrink-0" />
              <h4 className="font-bold text-xs text-blue-950">3. Folder Google Drive</h4>
            </div>
            <p className="text-[11px] text-blue-900 leading-snug">
              File Form &amp; Sheet otomatis dirapikan ke dalam folder <strong>SMART ASESMEN - SDN KANDANGAN I TOSARI</strong>.
            </p>
          </div>
        </div>

        {/* Workspace Code & Control Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
          {/* Left: Apps Script Code */}
          <div className="lg:col-span-8 space-y-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                <span className="text-xs font-bold text-slate-800">
                  Opsi Otomatisasi Google Workspace:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadTextFile(
                        googleAppsScriptCode,
                        `Generator_GoogleForm_GSheet_${activeConfig.mapel}_${activeConfig.kelas}.gs`,
                        'application/javascript;charset=utf-8'
                      );
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded px-2.5 py-1 bg-white hover:bg-slate-50 cursor-pointer"
                    title="Unduh file script Google Apps Script (.gs)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .gs</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(googleAppsScriptCode);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 3000);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3.5 py-1.5 rounded text-xs transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                  >
                    {copiedScript ? (
                      <Check className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedScript ? 'Kode Berhasil Disalin!' : 'Salin Kode Google Apps Script'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                  <input
                    type="checkbox"
                    checked={autoCreateSheet}
                    onChange={(e) => setAutoCreateSheet(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span className="flex items-center gap-1.5">
                    <GoogleSheetsLogo className="w-4 h-4" />
                    Otomatis Buat &amp; Tautkan Google Sheet
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                  <input
                    type="checkbox"
                    checked={organizeInDriveFolder}
                    onChange={(e) => setOrganizeInDriveFolder(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span className="flex items-center gap-1.5">
                    <GoogleDriveLogo className="w-4 h-4" />
                    Simpan ke Folder Google Drive Sekolah
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                  <input
                    type="checkbox"
                    checked={includeStudentDropdown}
                    onChange={(e) => setIncludeStudentDropdown(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span>
                    Dropdown Nama Siswa {config.kelas} ({classStudentCount} Siswa)
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 bg-white p-2 rounded border border-slate-200">
                  <input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={(e) => setShuffleQuestions(e.target.checked)}
                    className="rounded text-emerald-700"
                  />
                  <span>Acak Urutan Butir Soal</span>
                </label>
              </div>
            </div>

            <div className="relative">
              <pre className="bg-slate-900 text-emerald-300 font-mono text-[11px] p-4 rounded-xl overflow-x-auto max-h-[460px] leading-relaxed border border-slate-800">
                {googleAppsScriptCode}
              </pre>
            </div>
          </div>

          {/* Right: Instructions & Aiken */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5 text-xs text-slate-800 shadow-xs">
              <h4 className="font-bold text-sm flex items-center gap-2 text-slate-900 border-b border-slate-200 pb-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>Panduan 1-Klik di Google Apps Script</span>
              </h4>
              <ol className="list-decimal list-inside space-y-2.5 leading-relaxed">
                <li>
                  Klik tombol <strong>Salin Kode Google Apps Script</strong> di samping.
                </li>
                <li>
                  Buka{' '}
                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="underline font-bold text-emerald-700 inline-flex items-center gap-1"
                  >
                    script.google.com <ExternalLink className="w-3 h-3" />
                  </a>{' '}
                  pada tab baru browser Anda, lalu klik <strong>Project Baru (New Project)</strong>.
                </li>
                <li>
                  Hapus kode <code>myFunction()</code> yang ada, lalu tekan <strong>Ctrl + V</strong> (Paste) kode yang baru disalin.
                </li>
                <li>
                  Klik ikon <strong>Simpan</strong> (disket), lalu klik tombol <strong>Jalankan (Run)</strong>.
                </li>
                <li>
                  Izinkan akses Google Anda (klik <em>Review Permissions</em> &rarr; <em>Advanced</em> &rarr; <em>Allow</em>).
                </li>
                <li className="font-semibold text-emerald-900 bg-emerald-100/70 p-2 rounded-lg">
                  🎉 Selesai! Lihat bagian <strong>Execution Log</strong> di bawah layar untuk membuka tautan Google Form kuis dan Google Sheet rekap nilai yang otomatis tersimpan di Google Drive!
                </li>
              </ol>

              <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                <a
                  href="https://drive.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-[11px] text-blue-700 hover:underline bg-white p-2 rounded border border-slate-200 font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <GoogleDriveLogo className="w-3.5 h-3.5" />
                    Buka Folder Google Drive Saya
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://forms.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-[11px] text-purple-700 hover:underline bg-white p-2 rounded border border-slate-200 font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <GoogleFormsLogo className="w-3.5 h-3.5" />
                    Buka Google Forms Saya
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href="https://sheets.google.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between text-[11px] text-emerald-700 hover:underline bg-white p-2 rounded border border-slate-200 font-semibold"
                >
                  <span className="flex items-center gap-1.5">
                    <GoogleSheetsLogo className="w-3.5 h-3.5" />
                    Buka Google Sheets Saya
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Pratinjau Format Aiken (Moodle)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(aikenFormatText);
                    setCopiedAiken(true);
                    setTimeout(() => setCopiedAiken(false), 3000);
                  }}
                  className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                >
                  {copiedAiken ? '✓ Tersalin' : 'Salin Teks Aiken'}
                </button>
              </div>
              <pre className="bg-white border border-slate-200 rounded-lg p-2.5 text-[10px] font-mono text-slate-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
                {aikenFormatText || 'Belum ada soal Pilihan Ganda.'}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
