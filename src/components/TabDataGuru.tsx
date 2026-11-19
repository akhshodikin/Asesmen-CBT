import React, { useMemo, useState } from 'react';
import {
  Pencil,
  Trash2,
  Plus,
  RotateCcw,
  Check,
  X,
  UserPlus,
  SlidersHorizontal,
  Download,
  Upload,
  FileSpreadsheet,
  FileDown,
  FileUp,
  AlertCircle,
  FileText,
  Search,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import type { Teacher } from '../types';
import { INITIAL_TEACHERS } from '../data/schoolData';
import {
  exportTeachersCSV,
  downloadTeacherTemplateCSV,
  exportTeachersJSON,
  parseTeachersCSV,
  parseTeachersJSON,
} from '../utils/teacherImportExport';

interface TabDataGuruProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
}

export const TabDataGuru: React.FC<TabDataGuruProps> = ({ teachers, setTeachers }) => {
  const [searchGuru, setSearchGuru] = useState('');
  const [filterJabatan, setFilterJabatan] = useState('SEMUA');
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Modals state
  const [editingTeacher, setEditingTeacher] = useState<{
    teacher: Teacher;
    originalIndex: number;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedUploadTeachers, setParsedUploadTeachers] = useState<Teacher[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const [newTeacher, setNewTeacher] = useState({
    nama: '',
    nip: '',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 2',
    wa: '',
    email: '',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredTeachersWithIndex = useMemo(() => {
    return teachers
      .map((t, originalIndex) => ({ t, originalIndex }))
      .filter(({ t }) => {
        const matchJabatan = filterJabatan === 'SEMUA' || t.jabatan === filterJabatan;
        const q = searchGuru.toLowerCase();
        const matchSearch =
          t.nama.toLowerCase().includes(q) ||
          t.nip.includes(q) ||
          t.ugk.toLowerCase().includes(q) ||
          t.wa.includes(q);
        return matchJabatan && matchSearch;
      });
  }, [teachers, filterJabatan, searchGuru]);

  const filteredTeachers = useMemo(() => {
    return filteredTeachersWithIndex.map((item) => item.t);
  }, [filteredTeachersWithIndex]);

  // Handlers Edit & Add
  const handleOpenEdit = (teacher: Teacher, originalIndex: number) => {
    setEditingTeacher({
      teacher: { ...teacher },
      originalIndex,
    });
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher) return;

    const targetIdx = editingTeacher.originalIndex;
    const t = editingTeacher.teacher;
    const fase =
      t.ugk.includes('1') || t.ugk.includes('2')
        ? 'Fase A'
        : t.ugk.includes('3') || t.ugk.includes('4')
          ? 'Fase B'
          : 'Fase C';

    const updated: Teacher = {
      ...t,
      nama: t.nama.trim(),
      namaAsli: t.nama.trim().replace(/,\s*.*$/, ''),
      nip: t.nip.trim() || '-',
      ugk: t.ugk.trim(),
      fase,
      wa: t.wa.trim() || '-',
      email: t.email.trim() || '-',
    };

    setTeachers((prev) => {
      const copy = [...prev];
      if (copy[targetIdx]) {
        copy[targetIdx] = updated;
      }
      return copy;
    });

    setEditingTeacher(null);
    showToast(`Data guru "${updated.nama}" berhasil diperbarui!`);
  };

  const handleInlineChange = (
    originalIndex: number,
    field: keyof Teacher,
    value: string
  ) => {
    setTeachers((prev) => {
      const copy = [...prev];
      if (copy[originalIndex]) {
        copy[originalIndex] = {
          ...copy[originalIndex],
          [field]: value,
        };
      }
      return copy;
    });
  };

  const handleDeleteTeacher = (originalIndex: number, nama: string) => {
    if (window.confirm(`Yakin ingin menghapus guru "${nama}" dari sistem?`)) {
      setTeachers((prev) => prev.filter((_, idx) => idx !== originalIndex));
      showToast(`Guru "${nama}" telah dihapus.`);
    }
  };

  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeacher.nama.trim()) {
      alert('Nama guru wajib diisi!');
      return;
    }

    const fase =
      newTeacher.ugk.includes('1') || newTeacher.ugk.includes('2')
        ? 'Fase A'
        : newTeacher.ugk.includes('3') || newTeacher.ugk.includes('4')
          ? 'Fase B'
          : 'Fase C';

    const created: Teacher = {
      id: 'g' + Date.now(),
      nama: newTeacher.nama.trim(),
      namaAsli: newTeacher.nama.trim().replace(/,\s*.*$/, ''),
      nip: newTeacher.nip.trim() || '-',
      jabatan: newTeacher.jabatan,
      ugk: newTeacher.ugk.trim(),
      fase,
      status: 'Aktif',
      wa: newTeacher.wa.trim() || '-',
      email: newTeacher.email.trim() || '-',
    };

    setTeachers((prev) => [...prev, created]);
    setIsAddModalOpen(false);
    setNewTeacher({ nama: '', nip: '', jabatan: 'Guru Kelas', ugk: 'Kelas 2', wa: '', email: '' });
    showToast(`Guru "${created.nama}" berhasil ditambahkan!`);
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Kembalikan data guru ke daftar awal bawaan (9 pendidik SDN Kandangan I Tosari)? Semua perubahan manual akan direset.'
      )
    ) {
      setTeachers(INITIAL_TEACHERS);
      showToast('Data guru berhasil direset ke data bawaan sekolah.');
    }
  };

  // Upload / Import Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadErrors([]);
    setParsedUploadTeachers([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      if (file.name.toLowerCase().endsWith('.json')) {
        const res = parseTeachersJSON(text);
        if (res.errors.length > 0) {
          setUploadErrors(res.errors);
        }
        setParsedUploadTeachers(res.teachers);
      } else {
        const res = parseTeachersCSV(text);
        if (res.errors.length > 0) {
          setUploadErrors(res.errors);
        }
        setParsedUploadTeachers(res.teachers);
      }
    };
    reader.onerror = () => {
      setUploadErrors(['Gagal membaca file dari perangkat Anda.']);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedUploadTeachers.length === 0) return;

    if (importMode === 'replace') {
      if (
        window.confirm(
          `PERINGATAN: Mode "Timpa Seluruh Data" akan menggantikan seluruh data guru saat ini (${teachers.length} guru) dengan ${parsedUploadTeachers.length} guru baru dari file. Lanjutkan?`
        )
      ) {
        setTeachers(parsedUploadTeachers);
        setIsUploadModalOpen(false);
        setUploadedFile(null);
        setParsedUploadTeachers([]);
        showToast(`Berhasil mengimpor ${parsedUploadTeachers.length} guru (seluruh data ditimpa)!`);
      }
    } else {
      // Append / Merge based on NIP or Nama
      setTeachers((prev) => {
        const map = new Map(prev.map((t) => [t.nip !== '-' ? t.nip : t.nama, t]));
        parsedUploadTeachers.forEach((t) => {
          const key = t.nip !== '-' ? t.nip : t.nama;
          map.set(key, t);
        });
        return Array.from(map.values());
      });
      setIsUploadModalOpen(false);
      setUploadedFile(null);
      setParsedUploadTeachers([]);
      showToast(`Berhasil menggabungkan/menambahkan ${parsedUploadTeachers.length} data guru!`);
    }
  };

  return (
    <div className="space-y-6 no-print">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Master Table (8 or 12 cols depending on layout) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200 space-y-4 shadow-xs">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <span>Data Master Pendidik SDN Kandangan I Tosari</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                  Total: {teachers.length} Guru
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Terhubung otomatis dengan kolom tanda tangan Naskah Soal, Kisi-Kisi, dan Kartu Peserta CBT.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(true)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Unduh / Ekspor Data Guru"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Unggah / Impor Data Guru"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload</span>
              </button>
              <button
                type="button"
                onClick={() => setInlineEditMode(!inlineEditMode)}
                className={`flex items-center gap-1 text-xs font-semibold py-1.5 px-2.5 rounded-lg transition-colors cursor-pointer border ${
                  inlineEditMode
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                }`}
                title="Aktifkan mode edit cepat di tabel"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{inlineEditMode ? 'Mode Biasa' : 'Edit Cepat'}</span>
              </button>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Filter Jabatan</label>
              <select
                value={filterJabatan}
                onChange={(e) => setFilterJabatan(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Jabatan</option>
                <option value="Guru Kelas">Guru Kelas</option>
                <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                <option value="Kepala Sekolah">Kepala Sekolah</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="font-semibold text-slate-600 block mb-1">
                Cari Nama / NIP / Unit / WhatsApp
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchGuru}
                  onChange={(e) => setSearchGuru(e.target.value)}
                  placeholder="Ketik nama guru, NIP, atau mata pelajaran..."
                  className="w-full border border-slate-300 rounded-lg pl-8 pr-3 py-2 bg-white"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>
          </div>

          {/* Sub-bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600">
              Menampilkan <strong>{filteredTeachers.length}</strong> dari <strong>{teachers.length}</strong> guru
              {inlineEditMode && ' — ⚠️ Mode edit cepat aktif, Anda dapat mengetik langsung pada kolom tabel.'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadTeacherTemplateCSV()}
                className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer underline"
                title="Unduh format template CSV kosong"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Template CSV</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Kembalikan data guru ke 9 pendidik bawaan sekolah"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data Asli</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 w-10 text-center">No</th>
                  <th className="p-3">Nama Guru</th>
                  <th className="p-3 w-32">NIP</th>
                  <th className="p-3 w-28">Jabatan</th>
                  <th className="p-3 w-24">Unit / Diampu</th>
                  <th className="p-3 w-32">Kontak</th>
                  <th className="p-3 w-20 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTeachersWithIndex.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      Tidak ada data guru yang cocok dengan pencarian atau filter.
                    </td>
                  </tr>
                ) : (
                  filteredTeachersWithIndex.map(({ t, originalIndex }, idx) => (
                    <tr key={t.id || originalIndex} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={t.nama}
                            onChange={(e) => handleInlineChange(originalIndex, 'nama', e.target.value)}
                            className="w-full font-semibold text-slate-900 border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{t.nama}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={t.nip}
                            onChange={(e) => handleInlineChange(originalIndex, 'nip', e.target.value)}
                            className="w-full font-mono text-slate-700 border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{t.nip}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <select
                            value={t.jabatan}
                            onChange={(e) => handleInlineChange(originalIndex, 'jabatan', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
                          >
                            <option value="Guru Kelas">Guru Kelas</option>
                            <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                            <option value="Kepala Sekolah">Kepala Sekolah</option>
                          </select>
                        ) : (
                          <span className="text-slate-600">{t.jabatan}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={t.ugk}
                            onChange={(e) => handleInlineChange(originalIndex, 'ugk', e.target.value)}
                            className="w-full font-semibold text-emerald-800 border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-semibold text-emerald-800">{t.ugk}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {inlineEditMode ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={t.wa}
                              placeholder="WhatsApp"
                              onChange={(e) => handleInlineChange(originalIndex, 'wa', e.target.value)}
                              className="w-full text-[11px] font-mono border border-slate-200 rounded px-1.5 py-0.5 bg-white"
                            />
                            <input
                              type="text"
                              value={t.email}
                              placeholder="Email"
                              onChange={(e) => handleInlineChange(originalIndex, 'email', e.target.value)}
                              className="w-full text-[11px] border border-slate-200 rounded px-1.5 py-0.5 bg-white"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="font-mono text-slate-700 flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{t.wa}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3 text-slate-300" />
                              <span className="truncate max-w-[120px]">{t.email}</span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t, originalIndex)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Data Guru Lengkap"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTeacher(originalIndex, t.nama)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Guru"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Tambah Guru Baru Form */}
        <div className="lg:col-span-4 bg-white p-6 rounded-xl border border-slate-200 space-y-4 h-fit shadow-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-emerald-700" />
              <span>Tambah Guru / Pendidik</span>
            </h3>
          </div>
          <form onSubmit={handleAddTeacher} className="space-y-3.5 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={newTeacher.nama}
                onChange={(e) => setNewTeacher({ ...newTeacher, nama: e.target.value })}
                placeholder="Contoh: Budi Santoso, S.Pd."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">NIP</label>
              <input
                type="text"
                value={newTeacher.nip}
                onChange={(e) => setNewTeacher({ ...newTeacher, nip: e.target.value })}
                placeholder="199xxxxxxxxxxxxxxx atau -"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Jabatan</label>
              <select
                value={newTeacher.jabatan}
                onChange={(e) => setNewTeacher({ ...newTeacher, jabatan: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="Guru Kelas">Guru Kelas</option>
                <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                <option value="Kepala Sekolah">Kepala Sekolah</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Kelas / Mata Pelajaran Diampu
              </label>
              <input
                type="text"
                value={newTeacher.ugk}
                onChange={(e) => setNewTeacher({ ...newTeacher, ugk: e.target.value })}
                placeholder="Contoh: Kelas 2 atau PJOK"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={newTeacher.wa}
                  onChange={(e) => setNewTeacher({ ...newTeacher, wa: e.target.value })}
                  placeholder="0812xxxxxxx"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={newTeacher.email}
                  onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                  placeholder="guru@gmail.com"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-2 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-lg transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Simpan ke Data Master Guru</span>
            </button>
          </form>
        </div>
      </div>

      {/* MODAL EDIT GURU LENGKAP */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Data Guru</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingTeacher.teacher.nama}
                  onChange={(e) =>
                    setEditingTeacher({
                      ...editingTeacher,
                      teacher: { ...editingTeacher.teacher, nama: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: Nevilía Yunitasari, S.Pd."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NIP</label>
                  <input
                    type="text"
                    value={editingTeacher.teacher.nip}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, nip: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="1990xxxxxxxxxxxx"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jabatan</label>
                  <select
                    value={editingTeacher.teacher.jabatan}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, jabatan: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="Guru Kelas">Guru Kelas</option>
                    <option value="Guru Mata Pelajaran">Guru Mata Pelajaran</option>
                    <option value="Kepala Sekolah">Kepala Sekolah</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Unit / Kelas Diampu
                  </label>
                  <input
                    type="text"
                    value={editingTeacher.teacher.ugk}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, ugk: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Contoh: Kelas 1 atau PJOK"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Status Keaktifan</label>
                  <select
                    value={editingTeacher.teacher.status}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, status: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Cuti">Cuti</option>
                    <option value="Non-Aktif">Non-Aktif</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={editingTeacher.teacher.wa}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, wa: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0857xxxxxxxx"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Email</label>
                  <input
                    type="email"
                    value={editingTeacher.teacher.email}
                    onChange={(e) =>
                      setEditingTeacher({
                        ...editingTeacher,
                        teacher: { ...editingTeacher.teacher, email: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="nama@gmail.com"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DOWNLOAD GURU */}
      {isDownloadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Unduh / Ekspor Data Guru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsDownloadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Pilih format atau cakupan data pendidik yang ingin Anda unduh:
              </p>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    exportTeachersCSV(filteredTeachers, 'Data_Guru_SDN_Kandangan_I.csv');
                    showToast(`Data (${filteredTeachers.length} guru) berhasil diunduh ke CSV!`);
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700">
                      Unduh CSV Kompatibel Excel ({filteredTeachers.length} Guru)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format CSV standar UTF-8 BOM untuk Microsoft Excel &amp; Google Sheets
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    downloadTeacherTemplateCSV();
                    showToast('Template CSV guru berhasil diunduh!');
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <FileDown className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-emerald-700">
                      Unduh Template Kosong (.CSV)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format kolom baku dengan contoh data untuk diisi sebelum diunggah kembali
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    exportTeachersJSON(teachers, 'Backup_Data_Guru_SDN_Kandangan_I.json');
                    showToast('Cadangan JSON guru berhasil diunduh!');
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <FileText className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-purple-700">
                      Cadangkan Database (.JSON)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      File backup sistem data pendidik
                    </p>
                  </div>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL UPLOAD GURU */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileUp className="w-4 h-4 text-amber-600" />
                <span>Unggah &amp; Impor Data Guru</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedFile(null);
                  setParsedUploadTeachers([]);
                  setUploadErrors([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Pilih File Data Guru (.CSV dari Excel atau .JSON)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-5 text-center bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="upload-teacher-input"
                    accept=".csv, application/vnd.ms-excel, .json, text/csv, text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="upload-teacher-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-2"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-amber-600" />
                    <div>
                      <span className="font-semibold text-blue-600 hover:underline">
                        Klik untuk memilih file
                      </span>{' '}
                      atau tarik file ke sini
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Format yang didukung: <strong>.CSV</strong> (Microsoft Excel / Google Sheets) atau <strong>.JSON</strong>
                    </p>
                  </label>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-[11px] text-emerald-800">
                  Belum memiliki format kolom file guru?
                </span>
                <button
                  type="button"
                  onClick={() => downloadTeacherTemplateCSV()}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV Contoh</span>
                </button>
              </div>

              {uploadErrors.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Terjadi Kendala Saat Membaca File:</span>
                  </div>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {uploadErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadedFile && parsedUploadTeachers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-700 font-semibold bg-slate-100 p-2 rounded-lg">
                    <span>
                      File: <strong>{uploadedFile.name}</strong>
                    </span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px]">
                      {parsedUploadTeachers.length} Guru Terdeteksi
                    </span>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pilih Metode Penggabungan:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <label
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start gap-2 ${
                          importMode === 'append'
                            ? 'border-blue-500 bg-blue-50/50 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importTeacherMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-slate-900">Tambahkan / Update</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Perbarui guru yang ada &amp; tambah guru baru
                          </div>
                        </div>
                      </label>

                      <label
                        className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-start gap-2 ${
                          importMode === 'replace'
                            ? 'border-rose-500 bg-rose-50/50 font-semibold'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importTeacherMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-slate-900">Timpa Seluruh Data</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Ganti semua daftar guru lama dengan file ini
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pratinjau Data Guru:
                    </label>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-36 overflow-y-auto text-[11px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0">
                          <tr>
                            <th className="p-1.5 w-8 text-center">No</th>
                            <th className="p-1.5">Nama Guru</th>
                            <th className="p-1.5 w-24">NIP</th>
                            <th className="p-1.5 w-20">Jabatan</th>
                            <th className="p-1.5 w-20">Unit</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedUploadTeachers.map((t, idx) => (
                            <tr key={idx}>
                              <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                              <td className="p-1.5 font-semibold text-slate-900">{t.nama}</td>
                              <td className="p-1.5 font-mono">{t.nip}</td>
                              <td className="p-1.5">{t.jabatan}</td>
                              <td className="p-1.5">{t.ugk}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsUploadModalOpen(false);
                    setUploadedFile(null);
                    setParsedUploadTeachers([]);
                    setUploadErrors([]);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={parsedUploadTeachers.length === 0}
                  onClick={handleConfirmImport}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    parsedUploadTeachers.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Konfirmasi Impor ({parsedUploadTeachers.length} Guru)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
