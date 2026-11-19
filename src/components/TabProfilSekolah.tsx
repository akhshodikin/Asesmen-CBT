import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Image as ImageIcon,
  RotateCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { DEFAULT_SCHOOL_PROFILE } from '../data/schoolData';
import type { SchoolProfile } from '../types';
import { KopNaskah, getDefaultCrestDataUrl } from './KopNaskah';

interface TabProfilSekolahProps {
  schoolProfile: SchoolProfile;
  setSchoolProfile: React.Dispatch<React.SetStateAction<SchoolProfile>>;
}

function resizeLogoImage(file: File, maxDim = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Gagal membaca file SVG'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result || ''));
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('File gambar tidak valid'));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.readAsDataURL(file);
  });
}

export const TabProfilSekolah: React.FC<TabProfilSekolahProps> = ({
  schoolProfile,
  setSchoolProfile,
}) => {
  const [feedback, setFeedback] = useState('');
  const [uploadError, setUploadError] = useState('');

  const updateField = <K extends keyof SchoolProfile>(field: K, value: SchoolProfile[K]) => {
    setSchoolProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleLogoUpload = async (
    side: 'logoKiri' | 'logoKanan',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');

    try {
      const dataUrl = await resizeLogoImage(file, 320);
      setSchoolProfile((prev) => ({
        ...prev,
        [side]: dataUrl,
        ...(side === 'logoKiri' ? { tampilkanLogoKiri: true } : { tampilkanLogoKanan: true }),
      }));
      setFeedback(
        side === 'logoKiri'
          ? 'Logo kiri berhasil diperbarui dan diterapkan ke seluruh kop naskah.'
          : 'Logo kanan berhasil diperbarui dan diterapkan ke seluruh kop naskah.'
      );
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Gagal mengunggah gambar logo.');
    }
    e.target.value = '';
  };

  const handleResetProfile = () => {
    setSchoolProfile(DEFAULT_SCHOOL_PROFILE);
    setUploadError('');
    setFeedback('Profil sekolah dan kop naskah dikembalikan ke pengaturan awal SDN Kandangan I.');
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <div className="space-y-6 no-print">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <span>Administrasi Sekolah</span>
            <span aria-hidden="true">·</span>
            <span>Identitas, Logo &amp; Kop Naskah Resmi</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">
            Edit Profil Sekolah, Logo Lembaga &amp; Kop Naskah
          </h2>
          <p className="text-xs text-slate-600 mt-0.5">
            Setiap perubahan otomatis tersinkron ke Naskah Soal, Kisi-Kisi, Kunci Jawaban, Kartu
            Peserta CBT, Daftar Hadir, Laporan Analisis Hasil, dan Ekspor PDF/Word.
          </p>
        </div>

        <button
          type="button"
          onClick={handleResetProfile}
          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Default Sekolah</span>
        </button>
      </div>

      {feedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-xl px-4 py-3 text-xs font-medium">
          {uploadError}
        </div>
      )}

      {/* Live Preview Kop Naskah */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Pratinjau Kop Naskah Resmi (Tampilan Cetak &amp; PDF)
            </h3>
            <p className="text-xs text-slate-500">
              Tampilan langsung saat dokumen dicetak atau diekspor ke PDF / MS Word.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            NPSN {schoolProfile.npsn || '-'} · Akreditasi {schoolProfile.akreditasi || '-'}
          </span>
        </div>

        <div className="bg-slate-50 p-4 md:p-6 rounded-lg border border-slate-200">
          <div className="bg-white max-w-4xl mx-auto p-6 md:p-8 border border-slate-300 font-serif-exam text-black">
            <KopNaskah schoolProfile={schoolProfile} />
            <p className="text-center text-xs text-slate-400 italic">
              — Area Judul &amp; Butir Dokumen Asesmen / Laporan Analisis Hasil Belajar —
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Form Identitas Sekolah & Teks Kop Naskah */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <h3 className="font-bold text-slate-900 text-sm">
              Identitas Sekolah &amp; Redaksi Kop Naskah
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Baris 1 Kop (Pemerintah Daerah / Yayasan)
              </label>
              <input
                type="text"
                value={schoolProfile.namaInstansiAtas}
                onChange={(e) => updateField('namaInstansiAtas', e.target.value)}
                placeholder="Contoh: PEMERINTAH KABUPATEN PASURUAN"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Baris 2 Kop (Dinas / Instansi Pembina)
              </label>
              <input
                type="text"
                value={schoolProfile.namaDinas}
                onChange={(e) => updateField('namaDinas', e.target.value)}
                placeholder="Contoh: DINAS PENDIDIKAN DAN KEBUDAYAAN"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Baris Utama Kop (Nama Resmi Satuan Pendidikan)
              </label>
              <input
                type="text"
                value={schoolProfile.namaSekolahHeader}
                onChange={(e) => updateField('namaSekolahHeader', e.target.value)}
                placeholder="Contoh: SDN KANDANGAN I TOSARI"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nama Singkat (Sidebar Menu)
              </label>
              <input
                type="text"
                value={schoolProfile.namaSingkat}
                onChange={(e) => updateField('namaSingkat', e.target.value)}
                placeholder="SDN Kandangan I"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Lokasi Singkat (Sidebar)
              </label>
              <input
                type="text"
                value={schoolProfile.lokasiSingkat}
                onChange={(e) => updateField('lokasiSingkat', e.target.value)}
                placeholder="Tosari · Kab. Pasuruan"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">NPSN Sekolah</label>
              <input
                type="text"
                value={schoolProfile.npsn}
                onChange={(e) => updateField('npsn', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Akreditasi</label>
              <select
                value={schoolProfile.akreditasi}
                onChange={(e) => updateField('akreditasi', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="A">Akreditasi A</option>
                <option value="B">Akreditasi B</option>
                <option value="C">Akreditasi C</option>
                <option value="">Tidak Ditampilkan</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Alamat Lengkap Sekolah &amp; Kode Pos (Baris Bawah Kop)
              </label>
              <input
                type="text"
                value={schoolProfile.alamatLengkap}
                onChange={(e) => updateField('alamatLengkap', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-semibold text-slate-700 block mb-1">
                Kontak / Email / Website Sekolah
              </label>
              <input
                type="text"
                value={schoolProfile.kontakInfo}
                onChange={(e) => updateField('kontakInfo', e.target.value)}
                placeholder="Email: sdnkandangan1tosari@gmail.com | Telp: ..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nama Kepala Sekolah &amp; Gelar
              </label>
              <input
                type="text"
                value={schoolProfile.kepsekNama}
                onChange={(e) => updateField('kepsekNama', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">NIP Kepala Sekolah</label>
              <input
                type="text"
                value={schoolProfile.kepsekNip}
                onChange={(e) => updateField('kepsekNip', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Kota / Kecamatan Penetapan TTD
              </label>
              <input
                type="text"
                value={schoolProfile.kotaTtd}
                onChange={(e) => updateField('kotaTtd', e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Right: Logo Upload & Kop Styling */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Logo Lembaga &amp; Pengaturan Tata Letak Kop
              </h3>
            </div>

            {/* Logo Kiri */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Logo Kiri (Pemda / Kabupaten / Sekolah)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Format PNG/JPG/SVG (disarankan rasio 1:1 latar transparan).
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schoolProfile.tampilkanLogoKiri}
                    onChange={(e) => updateField('tampilkanLogoKiri', e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1.5 shrink-0">
                  <img
                    src={schoolProfile.logoKiri || getDefaultCrestDataUrl()}
                    alt="Preview Logo Kiri"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Logo Kiri</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleLogoUpload('logoKiri', e)}
                      className="hidden"
                    />
                  </label>
                  {schoolProfile.logoKiri && (
                    <button
                      type="button"
                      onClick={() => updateField('logoKiri', '')}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Pakai Bawaan</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Logo Kanan */}
            <div className="border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-900">
                    Logo Kanan (Opsional — Tut Wuri / Logo Sekolah)
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Aktifkan jika ingin menggunakan 2 logo di kiri dan kanan kop surat.
                  </p>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schoolProfile.tampilkanLogoKanan}
                    onChange={(e) => updateField('tampilkanLogoKanan', e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Tampilkan</span>
                </label>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center p-1.5 shrink-0">
                  {schoolProfile.logoKanan ? (
                    <img
                      src={schoolProfile.logoKanan}
                      alt="Preview Logo Kanan"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-400 text-center leading-tight">
                      Belum ada logo
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors whitespace-nowrap">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Unggah Logo Kanan</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={(e) => handleLogoUpload('logoKanan', e)}
                      className="hidden"
                    />
                  </label>
                  {schoolProfile.logoKanan && (
                    <button
                      type="button"
                      onClick={() => {
                        updateField('logoKanan', '');
                        updateField('tampilkanLogoKanan', false);
                      }}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 text-rose-700 border border-slate-300 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Gaya Teks & Garis */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Perataan Teks Kop</label>
                <select
                  value={schoolProfile.perataanKop}
                  onChange={(e) =>
                    updateField('perataanKop', e.target.value as 'center' | 'left')
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="center">Rata Tengah (Resmi)</option>
                  <option value="left">Rata Kiri (Modern)</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Garis Pembatas Kop
                </label>
                <select
                  value={schoolProfile.gayaGarisKop}
                  onChange={(e) =>
                    updateField(
                      'gayaGarisKop',
                      e.target.value as 'double' | 'thick-thin' | 'single'
                    )
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  <option value="double">Garis Ganda (Resmi)</option>
                  <option value="thick-thin">Garis Tebal</option>
                  <option value="single">Garis Tunggal Tipis</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
