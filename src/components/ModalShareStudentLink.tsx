import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  GraduationCap,
  KeyRound,
  MessageCircle,
  QrCode,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import type { AssessmentConfig, ExamPackage, SchoolProfile } from '../types';

interface ModalShareStudentLinkProps {
  isOpen: boolean;
  onClose: () => void;
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  examPackages?: ExamPackage[];
  activePackageId?: string | null;
}

const KELAS_OPTIONS = [
  'SEMUA',
  'Kelas 1',
  'Kelas 2',
  'Kelas 3',
  'Kelas 4',
  'Kelas 5',
  'Kelas 6',
];

export const ModalShareStudentLink: React.FC<ModalShareStudentLinkProps> = ({
  isOpen,
  onClose,
  config,
  schoolProfile,
  examPackages = [],
  activePackageId,
}) => {
  const [selectedKelas, setSelectedKelas] = useState<string>(config.kelas || 'Kelas 5');
  const [includeToken, setIncludeToken] = useState<boolean>(true);
  const [customToken, setCustomToken] = useState<string>(config.tokenCBT || 'CBT');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedWA, setCopiedWA] = useState<boolean>(false);
  const [showQR, setShowQR] = useState<boolean>(true);

  // Dapatkan origin domain (https://asesmencbt.web.app atau localhost)
  const baseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}${window.location.pathname}`.replace(/\/$/, '');
    }
    return 'https://asesmencbt.web.app';
  }, []);

  // Susun URL Khusus Siswa
  const studentUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('portal', 'siswa');

    if (selectedKelas && selectedKelas !== 'SEMUA') {
      params.set('kelas', selectedKelas);
    }
    if (includeToken && customToken.trim()) {
      params.set('token', customToken.trim());
    }

    return `${baseUrl}?${params.toString()}`;
  }, [baseUrl, selectedKelas, includeToken, customToken]);

  // URL QR Code
  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
      studentUrl
    )}&margin=10`;
  }, [studentUrl]);

  // Format Pesan WhatsApp untuk Guru & Wali Murid
  const whatsappMessage = useMemo(() => {
    const namaSekolah = schoolProfile.namaSekolahHeader || 'SDN KANDANGAN I TOSARI';
    const kelasText = selectedKelas === 'SEMUA' ? config.kelas : selectedKelas;

    return `*PEMBERITAHUAN UJIAN CBT ONLINE*
*${namaSekolah.toUpperCase()}*

Yth. Bapak/Ibu Wali Murid dan Peserta Didik,
Berikut adalah tautan resmi pelaksanaan Ujian CBT Daring:

📚 *Mata Pelajaran:* ${config.mapel}
🏛 *Kelas:* ${kelasText}
${includeToken && customToken ? `🔑 *Token Ujian:* ${customToken.toUpperCase()}\n` : ''}⏱ *Durasi:* ${config.durasiMenit || 60} Menit

👉 *KLIK TAUTAN UNTUK LANGSUNG MULAI UJIAN:*
${studentUrl}

_Petunjuk: Buka tautan di HP/Laptop/Komputer. Pilih nama peserta didik pada daftar kelas, masukkan token jika diminta, lalu klik Mulai Mengerjakan Ujian._`;
  }, [schoolProfile, config, selectedKelas, includeToken, customToken, studentUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(studentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyWA = () => {
    navigator.clipboard.writeText(whatsappMessage);
    setCopiedWA(true);
    setTimeout(() => setCopiedWA(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(waUrl, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
        {/* Header Modal */}
        <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide bg-emerald-100 px-2 py-0.5 rounded-full">
                  Portal Siswa CBT
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-xs font-semibold text-slate-600">
                  {schoolProfile.namaSekolahHeader || 'SDN Kandangan I Tosari'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 mt-0.5">
                Tautan Khusus Siswa untuk Ujian CBT
              </h3>
              <p className="text-xs text-slate-600">
                Siswa yang membuka link ini akan langsung diarahkan ke ruang ujian CBT tanpa menu guru/admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Opsi Pengaturan Link */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 text-xs">
            <h4 className="font-bold text-slate-800 uppercase tracking-wide">
              Pengaturan Tautan Siswa:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Sasaran Kelas
                </label>
                <select
                  value={selectedKelas}
                  onChange={(e) => setSelectedKelas(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-medium"
                >
                  <option value="SEMUA">Semua Kelas (Siswa memilih kelas sendiri)</option>
                  {KELAS_OPTIONS.filter((k) => k !== 'SEMUA').map((k) => (
                    <option key={k} value={k}>
                      Khusus {k} (Langsung terkunci ke {k})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Token Ujian CBT
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value.toUpperCase())}
                    disabled={!includeToken}
                    placeholder="Contoh: CBT-7391"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-mono font-bold text-emerald-800 disabled:opacity-40"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium pt-1">
              <input
                type="checkbox"
                checked={includeToken}
                onChange={(e) => setIncludeToken(e.target.checked)}
                className="rounded text-emerald-700 focus:ring-emerald-600"
              />
              <span>
                Sertakan Token Ujian di dalam link (Siswa langsung bisa mulai tanpa perlu mengetik token manual)
              </span>
            </label>
          </div>

          {/* URL Box Siap Salin */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>🔗 Link Siap Bagikan ke Siswa:</span>
              <span className="text-[11px] font-normal text-emerald-700 font-medium">
                Langsung masuk ke Portal Ujian CBT
              </span>
            </label>
            <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl text-white">
              <input
                type="text"
                readOnly
                value={studentUrl}
                className="bg-transparent text-xs font-mono text-emerald-300 px-2 py-1.5 w-full focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0 shadow-xs"
              >
                {copiedLink ? (
                  <Check className="w-4 h-4 text-amber-300" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copiedLink ? 'Tersalin!' : 'Salin Link'}</span>
              </button>
              <a
                href={studentUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
                title="Buka & Uji Tampilan Siswa di Tab Baru"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Bagikan ke WhatsApp & QR Code */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Box WhatsApp */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs mb-1">
                  <MessageCircle className="w-4 h-4 text-emerald-700" />
                  <span>Kirim ke WhatsApp Grup Kelas / Wali Murid</span>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  Kirim pengumuman resmi ujian lengkap dengan mata pelajaran, token, dan tautan langsung dalam 1 klik.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 rounded-lg cursor-pointer transition-colors shadow-xs"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Kirim ke WhatsApp Sekarang</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyWA}
                  className="w-full flex items-center justify-center gap-1.5 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {copiedWA ? (
                    <Check className="w-3.5 h-3.5 text-emerald-700" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>{copiedWA ? 'Teks WhatsApp Tersalin!' : 'Salin Teks Pesan'}</span>
                </button>
              </div>
            </div>

            {/* Box QR Code */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-xs">
                    <QrCode className="w-4 h-4 text-purple-700" />
                    <span>Scan QR Code di Kelas</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Scan via Kamera HP</span>
                </div>
                <p className="text-[11px] text-slate-600">
                  Tampilkan di proyektor kelas atau cetak agar siswa langsung scan untuk mulai ujian.
                </p>
              </div>

              <div className="flex items-center justify-center py-1">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code Portal Siswa CBT"
                    className="w-32 h-32 object-contain"
                  />
                </div>
              </div>

              <a
                href={qrCodeUrl}
                download={`QR_Code_CBT_${selectedKelas}.png`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold py-2 rounded-lg cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Gambar QR Code</span>
              </a>
            </div>
          </div>

          {/* Panduan Siswa */}
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs space-y-1.5 text-blue-950">
            <h5 className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-700" />
              <span>Petunjuk untuk Siswa saat Membuka Link:</span>
            </h5>
            <ol className="list-decimal list-inside space-y-0.5 text-blue-900 leading-relaxed text-[11px]">
              <li>Siswa mengklik tautan dari WhatsApp atau scan QR code dari HP/Komputer.</li>
              <li>Siswa memilih nama mereka dari daftar peserta didik SDN Kandangan I.</li>
              <li>Jika link sudah memuat token, siswa cukup klik <strong>"Mulai Mengerjakan Ujian"</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <a
            href={studentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
          >
            <span>Uji Coba Tampilan Siswa (Buka Tab Baru)</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
