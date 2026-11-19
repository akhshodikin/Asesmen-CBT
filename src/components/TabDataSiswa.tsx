import React, { useMemo, useState } from 'react';
import {
  Printer,
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
} from 'lucide-react';
import type { AssessmentConfig, SchoolProfile, Student } from '../types';
import { KopNaskah, getDefaultCrestDataUrl } from './KopNaskah';
import { STUDENTS_DATA } from '../data/schoolData';
import {
  exportStudentsCSV,
  downloadStudentTemplateCSV,
  exportStudentsJSON,
  parseStudentsCSV,
  parseStudentsJSON,
} from '../utils/studentImportExport';

interface TabDataSiswaProps {
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  filterKelasSiswa: string;
  setFilterKelasSiswa: React.Dispatch<React.SetStateAction<string>>;
}

export const TabDataSiswa: React.FC<TabDataSiswaProps> = ({
  config,
  schoolProfile,
  students,
  setStudents,
  filterKelasSiswa,
  setFilterKelasSiswa,
}) => {
  const [filterAgamaSiswa, setFilterAgamaSiswa] = useState('SEMUA');
  const [searchSiswa, setSearchSiswa] = useState('');
  const [studentDocMode, setStudentDocMode] = useState<
    'kelola' | 'daftar_hadir' | 'daftar_nilai' | 'kartu_peserta'
  >('kelola');

  // Edit State
  const [editingItem, setEditingItem] = useState<{
    student: Student;
    originalIndex: number;
  } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [inlineEditMode, setInlineEditMode] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // Upload/Import State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedUploadStudents, setParsedUploadStudents] = useState<Student[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');

  const [newStudent, setNewStudent] = useState<Omit<Student, 'no'>>({
    nama: '',
    nipd: '',
    nisn: '',
    jk: 'L',
    agama: 'ISLAM',
    kelas: filterKelasSiswa !== 'SEMUA' ? filterKelasSiswa : 'Kelas 1',
  });

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const filteredStudentsWithIndex = useMemo(() => {
    return students
      .map((s, originalIndex) => ({ s, originalIndex }))
      .filter(({ s }) => {
        const matchKelas = filterKelasSiswa === 'SEMUA' || s.kelas === filterKelasSiswa;
        const matchAgama = filterAgamaSiswa === 'SEMUA' || s.agama === filterAgamaSiswa;
        const q = searchSiswa.toLowerCase();
        const matchSearch =
          s.nama.toLowerCase().includes(q) || s.nisn.includes(q) || s.nipd.includes(q);
        return matchKelas && matchAgama && matchSearch;
      });
  }, [students, filterKelasSiswa, filterAgamaSiswa, searchSiswa]);

  const filteredStudents = useMemo(() => {
    return filteredStudentsWithIndex.map((item) => item.s);
  }, [filteredStudentsWithIndex]);

  const countByReligion = (agama: string) =>
    students.filter(
      (s) => (filterKelasSiswa === 'SEMUA' || s.kelas === filterKelasSiswa) && s.agama === agama
    ).length;

  const countByClass = (kelasName: string) =>
    students.filter((s) => s.kelas === kelasName).length;

  // Handlers Edit & Add
  const handleOpenEdit = (student: Student, originalIndex: number) => {
    setEditingItem({
      student: { ...student },
      originalIndex,
    });
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const targetIdx = editingItem.originalIndex;
    const updated = {
      ...editingItem.student,
      nama: editingItem.student.nama.trim().toUpperCase(),
      nipd: editingItem.student.nipd.trim(),
      nisn: editingItem.student.nisn.trim() || '-',
    };

    setStudents((prev) => {
      const copy = [...prev];
      if (copy[targetIdx]) {
        copy[targetIdx] = updated;
      }
      return copy;
    });

    setEditingItem(null);
    showToast(`Data siswa "${updated.nama}" berhasil diperbarui!`);
  };

  const handleInlineChange = (
    originalIndex: number,
    field: keyof Student,
    value: string | number
  ) => {
    setStudents((prev) => {
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

  const handleDelete = (originalIndex: number, nama: string) => {
    if (window.confirm(`Yakin ingin menghapus data siswa "${nama}"?`)) {
      setStudents((prev) => prev.filter((_, idx) => idx !== originalIndex));
      showToast(`Siswa "${nama}" telah dihapus.`);
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.nama.trim() || !newStudent.nipd.trim()) {
      alert('Nama Lengkap dan NIPD wajib diisi!');
      return;
    }

    const nextNo = students.length + 1;
    const created: Student = {
      no: nextNo,
      nama: newStudent.nama.trim().toUpperCase(),
      nipd: newStudent.nipd.trim(),
      nisn: newStudent.nisn.trim() || '-',
      jk: newStudent.jk,
      agama: newStudent.agama,
      kelas: newStudent.kelas,
    };

    setStudents((prev) => [...prev, created]);
    setIsAddModalOpen(false);
    setNewStudent({
      nama: '',
      nipd: '',
      nisn: '',
      jk: 'L',
      agama: 'ISLAM',
      kelas: filterKelasSiswa !== 'SEMUA' ? filterKelasSiswa : 'Kelas 1',
    });
    showToast(`Siswa baru "${created.nama}" berhasil ditambahkan!`);
  };

  const handleResetToDefault = () => {
    if (
      window.confirm(
        'Kembalikan semua data siswa ke data awal bawaan (83 siswa SDN Kandangan I Tosari)? Semua penambahan dan perubahan manual akan direset.'
      )
    ) {
      setStudents(STUDENTS_DATA);
      showToast('Data siswa berhasil direset ke data awal bawaan.');
    }
  };

  // Upload/Import Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setUploadErrors([]);
    setParsedUploadStudents([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = (event.target?.result as string) || '';
      if (file.name.toLowerCase().endsWith('.json')) {
        const res = parseStudentsJSON(text);
        if (res.errors.length > 0) {
          setUploadErrors(res.errors);
        }
        setParsedUploadStudents(res.students);
      } else {
        const res = parseStudentsCSV(
          text,
          filterKelasSiswa !== 'SEMUA' ? filterKelasSiswa : 'Kelas 1'
        );
        if (res.errors.length > 0) {
          setUploadErrors(res.errors);
        }
        setParsedUploadStudents(res.students);
      }
    };
    reader.onerror = () => {
      setUploadErrors(['Gagal membaca file dari perangkat Anda.']);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedUploadStudents.length === 0) return;

    if (importMode === 'replace') {
      if (
        window.confirm(
          `PERINGATAN: Mode "Timpa Seluruh Data" akan menggantikan ${students.length} siswa saat ini dengan ${parsedUploadStudents.length} siswa baru dari file. Lanjutkan?`
        )
      ) {
        setStudents(parsedUploadStudents);
        setIsUploadModalOpen(false);
        setUploadedFile(null);
        setParsedUploadStudents([]);
        showToast(`Berhasil mengimpor ${parsedUploadStudents.length} siswa (seluruh data ditimpa)!`);
      }
    } else {
      // Append / Merge based on NIPD
      setStudents((prev) => {
        const map = new Map(prev.map((s) => [s.nipd, s]));
        parsedUploadStudents.forEach((s) => {
          map.set(s.nipd, s);
        });
        return Array.from(map.values()).map((s, idx) => ({
          ...s,
          no: idx + 1,
        }));
      });
      setIsUploadModalOpen(false);
      setUploadedFile(null);
      setParsedUploadStudents([]);
      showToast(`Berhasil menggabungkan/menambahkan ${parsedUploadStudents.length} siswa!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="no-print fixed top-5 right-5 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-top-4">
          <Check className="w-4 h-4 text-emerald-200" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Control Panel */}
      <div className="no-print bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>Administrasi Peserta Didik SDN Kandangan I Tosari</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-semibold">
                Total: {students.length} Siswa
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Data terintegrasi otomatis dengan Kartu Peserta CBT, Daftar Hadir, Daftar Nilai, Portal CBT, dan Ekspor Soal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'kelola' as const, label: '✏️ Kelola & Edit Siswa' },
              { id: 'daftar_hadir' as const, label: 'Daftar Hadir' },
              { id: 'daftar_nilai' as const, label: 'Daftar Nilai' },
              { id: 'kartu_peserta' as const, label: 'Kartu Peserta CBT' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setStudentDocMode(m.id)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  studentDocMode === m.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="font-semibold text-slate-600 block mb-1">Filter Kelas</label>
            <select
              value={filterKelasSiswa}
              onChange={(e) => setFilterKelasSiswa(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold bg-white"
            >
              <option value="SEMUA">Semua Kelas ({students.length} Siswa)</option>
              <option value="Kelas 1">Kelas 1 ({countByClass('Kelas 1')} Siswa)</option>
              <option value="Kelas 2">Kelas 2 ({countByClass('Kelas 2')} Siswa)</option>
              <option value="Kelas 3">Kelas 3 ({countByClass('Kelas 3')} Siswa)</option>
              <option value="Kelas 4">Kelas 4 ({countByClass('Kelas 4')} Siswa)</option>
              <option value="Kelas 5">Kelas 5 ({countByClass('Kelas 5')} Siswa)</option>
              <option value="Kelas 6">Kelas 6 ({countByClass('Kelas 6')} Siswa)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Filter Agama (Mapel Agama)
            </label>
            <select
              value={filterAgamaSiswa}
              onChange={(e) => setFilterAgamaSiswa(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
            >
              <option value="SEMUA">Semua Agama</option>
              <option value="HINDU">Hindu ({countByReligion('HINDU')} Siswa)</option>
              <option value="ISLAM">Islam ({countByReligion('ISLAM')} Siswa)</option>
              <option value="KRISTEN">Kristen ({countByReligion('KRISTEN')} Siswa)</option>
            </select>
          </div>

          <div>
            <label className="font-semibold text-slate-600 block mb-1">
              Cari Nama / NISN / NIPD
            </label>
            <input
              type="text"
              value={searchSiswa}
              onChange={(e) => setSearchSiswa(e.target.value)}
              placeholder="Ketik nama, NISN, atau NIPD..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
            />
          </div>

          <div className="flex items-end gap-1.5">
            {studentDocMode === 'kelola' ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsDownloadModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  title="Unduh / Ekspor Data Siswa (Excel/CSV/JSON)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  title="Unggah / Impor Data Siswa (CSV/Excel/JSON)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center justify-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-2.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                  title="Tambah Siswa Baru Manual"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Siswa</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInlineEditMode(!inlineEditMode)}
                  className={`flex items-center justify-center py-2 px-2 rounded-lg transition-colors cursor-pointer border text-xs font-semibold whitespace-nowrap ${
                    inlineEditMode
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-300'
                  }`}
                  title="Aktifkan mode edit cepat di baris tabel"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak ({filteredStudents.length} Siswa)</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-bar / Quick Actions */}
        {studentDocMode === 'kelola' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-slate-600">
              Menampilkan <strong>{filteredStudents.length}</strong> dari <strong>{students.length}</strong> siswa
              {filterKelasSiswa !== 'SEMUA' && ` (${filterKelasSiswa})`}
              {inlineEditMode && ' — ⚠️ Mode edit cepat di tabel aktif, ketik langsung pada kolom untuk mengubah.'}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => downloadStudentTemplateCSV()}
                className="flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors cursor-pointer underline"
                title="Unduh format template CSV kosong untuk diisi"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Unduh Template CSV</span>
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Reset data kembali ke daftar 83 siswa bawaan"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Data Asli (83 Siswa)</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: KELOLA & EDIT DATA TABLE */}
      {studentDocMode === 'kelola' && (
        <div className="no-print bg-white p-5 rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3 w-24">NIPD</th>
                  <th className="p-3 w-32">NISN</th>
                  <th className="p-3">Nama Lengkap Siswa</th>
                  <th className="p-3 w-16 text-center">L/P</th>
                  <th className="p-3 w-28">Agama</th>
                  <th className="p-3 w-28">Kelas</th>
                  <th className="p-3 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudentsWithIndex.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      Tidak ada data siswa yang cocok dengan filter atau kata kunci pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredStudentsWithIndex.map(({ s, originalIndex }, idx) => (
                    <tr key={`${s.nipd}-${originalIndex}`} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={s.nipd}
                            onChange={(e) => handleInlineChange(originalIndex, 'nipd', e.target.value)}
                            className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-mono text-slate-800 font-semibold">{s.nipd}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={s.nisn}
                            onChange={(e) => handleInlineChange(originalIndex, 'nisn', e.target.value)}
                            className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-mono text-slate-600">{s.nisn}</span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <input
                            type="text"
                            value={s.nama}
                            onChange={(e) => handleInlineChange(originalIndex, 'nama', e.target.value)}
                            className="w-full font-semibold text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                          />
                        ) : (
                          <span className="font-semibold text-slate-900">{s.nama}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {inlineEditMode ? (
                          <select
                            value={s.jk}
                            onChange={(e) => handleInlineChange(originalIndex, 'jk', e.target.value as 'L' | 'P')}
                            className="text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
                          >
                            <option value="L">L</option>
                            <option value="P">P</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              s.jk === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {s.jk}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <select
                            value={s.agama}
                            onChange={(e) => handleInlineChange(originalIndex, 'agama', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-white"
                          >
                            <option value="HINDU">HINDU</option>
                            <option value="ISLAM">ISLAM</option>
                            <option value="KRISTEN">KRISTEN</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                              s.agama === 'HINDU'
                                ? 'bg-amber-100 text-amber-800'
                                : s.agama === 'ISLAM'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {s.agama}
                          </span>
                        )}
                      </td>
                      <td className="p-2.5">
                        {inlineEditMode ? (
                          <select
                            value={s.kelas}
                            onChange={(e) => handleInlineChange(originalIndex, 'kelas', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-medium"
                          >
                            <option value="Kelas 1">Kelas 1</option>
                            <option value="Kelas 2">Kelas 2</option>
                            <option value="Kelas 3">Kelas 3</option>
                            <option value="Kelas 4">Kelas 4</option>
                            <option value="Kelas 5">Kelas 5</option>
                            <option value="Kelas 6">Kelas 6</option>
                          </select>
                        ) : (
                          <span className="font-medium text-slate-700">{s.kelas}</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s, originalIndex)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title="Edit Data Siswa Lengkap"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(originalIndex, s.nama)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hapus Siswa"
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
      )}

      {/* VIEW 2: PRINTABLE OUTPUT (DAFTAR HADIR, DAFTAR NILAI, KARTU PESERTA) */}
      {studentDocMode !== 'kelola' && (
        <div className="print-area bg-white p-8 rounded-xl border border-slate-200 font-serif-exam text-black">
          {studentDocMode !== 'kartu_peserta' ? (
            <>
              <KopNaskah schoolProfile={schoolProfile} />
              <div className="mb-4 text-center">
                <h3 className="text-base font-bold uppercase underline">
                  {studentDocMode === 'daftar_hadir'
                    ? 'DAFTAR HADIR PESERTA ASESMEN SEMESTER'
                    : 'DAFTAR NILAI HASIL ASESMEN SEMESTER'}
                </h3>
                <p className="text-xs font-bold uppercase mt-0.5">
                  TAHUN PELAJARAN {config.tahunPelajaran}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs md:text-sm">
                <div>
                  <p>
                    <strong>Kelas:</strong> {filterKelasSiswa}
                  </p>
                  <p>
                    <strong>Mata Pelajaran:</strong> {config.mapel}
                  </p>
                </div>
                <div>
                  <p>
                    <strong>Hari / Tanggal:</strong> {config.hariTanggal}
                  </p>
                  <p>
                    <strong>Filter Agama:</strong> {filterAgamaSiswa} (Jumlah:{' '}
                    {filteredStudents.length} Peserta Didik)
                  </p>
                </div>
              </div>

              <table className="w-full border-collapse border border-black text-xs">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-black p-2 w-10">No</th>
                    <th className="border border-black p-2 w-16">NIPD</th>
                    <th className="border border-black p-2 w-28">NISN</th>
                    <th className="border border-black p-2">Nama Lengkap Peserta Didik</th>
                    <th className="border border-black p-2 w-12">L/P</th>
                    <th className="border border-black p-2 w-20">Agama</th>
                    <th className="border border-black p-2 w-20">Kelas</th>
                    {studentDocMode === 'daftar_hadir' ? (
                      <>
                        <th className="border border-black p-2 w-40" colSpan={2}>
                          Tanda Tangan Peserta
                        </th>
                        <th className="border border-black p-2 w-24">Ket.</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-black p-2 w-20">Skor PG</th>
                        <th className="border border-black p-2 w-20">Skor Isian/Uraian</th>
                        <th className="border border-black p-2 w-24">Nilai Akhir</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudentsWithIndex.map(({ s, originalIndex }, idx) => (
                    <tr key={`${s.nipd}-${idx}`} className="avoid-break">
                      <td className="border border-black p-2 text-center font-mono">{idx + 1}</td>
                      <td className="border border-black p-2 text-center font-mono">{s.nipd}</td>
                      <td className="border border-black p-2 text-center font-mono">{s.nisn}</td>
                      <td className="border border-black p-2 font-semibold">
                        <div className="flex items-center justify-between group">
                          <span>{s.nama}</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(s, originalIndex)}
                            className="no-print opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 p-0.5 ml-1 transition-opacity cursor-pointer"
                            title="Edit data siswa ini"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="border border-black p-2 text-center">{s.jk}</td>
                      <td className="border border-black p-2 text-center">{s.agama}</td>
                      <td className="border border-black p-2 text-center">{s.kelas}</td>
                      {studentDocMode === 'daftar_hadir' ? (
                        <>
                          <td className="border border-black p-2 w-20 text-left text-[10px]">
                            {idx % 2 === 0 ? `${idx + 1}. ............` : ''}
                          </td>
                          <td className="border border-black p-2 w-20 text-left text-[10px]">
                            {idx % 2 === 1 ? `${idx + 1}. ............` : ''}
                          </td>
                          <td className="border border-black p-2" />
                        </>
                      ) : (
                        <>
                          <td className="border border-black p-2" />
                          <td className="border border-black p-2" />
                          <td className="border border-black p-2" />
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-10 avoid-break text-xs md:text-sm">
                <table className="w-full no-border text-center">
                  <tbody>
                    <tr>
                      <td className="w-1/2">
                        Mengetahui,
                        <br />
                        Kepala {schoolProfile.namaSingkat}
                        <div className="h-16" />
                        <p className="font-bold underline">{schoolProfile.kepsekNama}</p>
                        <p>NIP. {schoolProfile.kepsekNip}</p>
                      </td>
                      <td className="w-1/2">
                        {config.tanggalTtd}
                        <br />
                        Wali Kelas / Guru Pengampu
                        <div className="h-16" />
                        <p className="font-bold underline">{config.guruNama}</p>
                        <p>NIP. {config.guruNip}</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudentsWithIndex.map(({ s, originalIndex }, idx) => (
                <div
                  key={`${s.nipd}-${idx}`}
                  className="avoid-break border-2 border-black p-4 text-xs relative group"
                >
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(s, originalIndex)}
                    className="no-print absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white border border-slate-300 p-1 rounded text-blue-600 hover:text-blue-800 shadow-xs transition-opacity cursor-pointer"
                    title="Edit Data Siswa"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <div className="border-b-2 border-black pb-1.5 mb-2 flex items-center gap-2">
                    {schoolProfile.tampilkanLogoKiri && (
                      <img
                        src={schoolProfile.logoKiri || getDefaultCrestDataUrl()}
                        alt={`Logo ${schoolProfile.namaSingkat}`}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 object-contain shrink-0"
                      />
                    )}
                    <div className="flex-1 text-center min-w-0">
                      <p className="font-bold uppercase text-[10px] truncate">
                        {schoolProfile.namaInstansiAtas}
                      </p>
                      <p className="font-extrabold uppercase text-xs truncate">
                        {schoolProfile.namaSekolahHeader}
                      </p>
                      <p className="font-bold uppercase text-[10px] underline mt-0.5">
                        KARTU PESERTA &amp; AKSES CBT {config.jenisAsesmen} — TP{' '}
                        {config.tahunPelajaran}
                      </p>
                    </div>
                  </div>
                  <table className="w-full no-border text-[11px]">
                    <tbody>
                      <tr>
                        <td className="font-bold py-0.5 w-28">Nama Peserta</td>
                        <td className="w-2">:</td>
                        <td className="font-bold">{s.nama}</td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">NIPD / NISN</td>
                        <td>:</td>
                        <td className="font-mono">
                          {s.nipd} / {s.nisn}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">Kelas / JK</td>
                        <td>:</td>
                        <td>
                          {s.kelas} / {s.jk === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">Agama</td>
                        <td>:</td>
                        <td>{s.agama}</td>
                      </tr>
                      <tr>
                        <td className="font-bold py-0.5">Akses / Token CBT</td>
                        <td>:</td>
                        <td className="font-mono font-bold">
                          {s.nipd} / Token: {config.tokenCBT}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-between items-end text-[10px]">
                    <div className="border border-black w-14 h-16 flex items-center justify-center text-slate-400">
                      Foto 3x4
                    </div>
                    <div className="text-center">
                      <p>{config.tanggalTtd}</p>
                      <p>Kepala Sekolah,</p>
                      <div className="h-8" />
                      <p className="font-bold underline">{schoolProfile.kepsekNama}</p>
                      <p>NIP. {schoolProfile.kepsekNip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DOWNLOAD / EKSPOR SISWA */}
      {isDownloadModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Unduh / Ekspor Data Siswa</span>
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
                Pilih format atau cakupan data siswa yang ingin Anda unduh ke perangkat Anda:
              </p>

              <div className="space-y-2.5">
                {/* Download Sesuai Filter */}
                <button
                  type="button"
                  onClick={() => {
                    const filename =
                      filterKelasSiswa === 'SEMUA'
                        ? 'Data_Semua_Siswa_SDN_Kandangan_I.csv'
                        : `Data_Siswa_${filterKelasSiswa.replace(/\s+/g, '_')}_SDN_Kandangan_I.csv`;
                    exportStudentsCSV(filteredStudents, filename);
                    showToast(`Data (${filteredStudents.length} siswa) berhasil diunduh ke CSV!`);
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700">
                      Unduh Sesuai Filter Saat Ini ({filteredStudents.length} Siswa)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format CSV kompatibel Excel (Kelas: {filterKelasSiswa}, Agama: {filterAgamaSiswa})
                    </p>
                  </div>
                </button>

                {/* Download Semua Siswa */}
                <button
                  type="button"
                  onClick={() => {
                    exportStudentsCSV(students, 'Data_Lengkap_83_Siswa_SDN_Kandangan_I.csv');
                    showToast(`Seluruh data (${students.length} siswa) berhasil diunduh ke CSV!`);
                    setIsDownloadModalOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-start gap-3 cursor-pointer group"
                >
                  <FileSpreadsheet className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-700">
                      Unduh Seluruh Database ({students.length} Siswa)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Format CSV lengkap dari Kelas 1 s/d Kelas 6 untuk Microsoft Excel & Google Sheets
                    </p>
                  </div>
                </button>

                {/* Download Template CSV */}
                <button
                  type="button"
                  onClick={() => {
                    downloadStudentTemplateCSV();
                    showToast('Template CSV berhasil diunduh!');
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
                      Format template baku yang dapat langsung diisi guru sebelum diunggah kembali
                    </p>
                  </div>
                </button>

                {/* Download Backup JSON */}
                <button
                  type="button"
                  onClick={() => {
                    exportStudentsJSON(students, 'Backup_Data_Siswa_SDN_Kandangan_I.json');
                    showToast('Cadangan JSON berhasil diunduh!');
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
                      File backup sistem lengkap untuk pemulihan (restore) data
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

      {/* MODAL UPLOAD / IMPOR SISWA */}
      {isUploadModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileUp className="w-4 h-4 text-amber-600" />
                <span>Unggah &amp; Impor Data Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadedFile(null);
                  setParsedUploadStudents([]);
                  setUploadErrors([]);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* File Dropzone */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1.5">
                  Pilih File Data Siswa (.CSV dari Excel atau .JSON)
                </label>
                <div className="border-2 border-dashed border-slate-300 hover:border-amber-400 rounded-xl p-5 text-center bg-slate-50 transition-colors">
                  <input
                    type="file"
                    id="upload-student-input"
                    accept=".csv, application/vnd.ms-excel, .json, text/csv, text/plain"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="upload-student-input"
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

              {/* Template Helper */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 flex items-center justify-between">
                <span className="text-[11px] text-emerald-800">
                  Belum memiliki format kolom file?
                </span>
                <button
                  type="button"
                  onClick={() => downloadStudentTemplateCSV()}
                  className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh Template CSV Contoh</span>
                </button>
              </div>

              {/* Errors Display */}
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

              {/* Parsed Preview */}
              {uploadedFile && parsedUploadStudents.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-slate-700 font-semibold bg-slate-100 p-2 rounded-lg">
                    <span>
                      File: <strong>{uploadedFile.name}</strong>
                    </span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[11px]">
                      {parsedUploadStudents.length} Siswa Terdeteksi
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
                          name="importMode"
                          checked={importMode === 'append'}
                          onChange={() => setImportMode('append')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-slate-900">Tambahkan / Update</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Perbarui yang ada &amp; tambah siswa baru (aman)
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
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="text-slate-900">Timpa Seluruh Data</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            Ganti semua data lama dengan isi file ini
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Pratinjau Data (5 Siswa Pertama):
                    </label>
                    <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-36 overflow-y-auto text-[11px]">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-100 text-slate-700 sticky top-0">
                          <tr>
                            <th className="p-1.5 w-8 text-center">No</th>
                            <th className="p-1.5 w-16">NIPD</th>
                            <th className="p-1.5">Nama Siswa</th>
                            <th className="p-1.5 w-8 text-center">JK</th>
                            <th className="p-1.5 w-16">Agama</th>
                            <th className="p-1.5 w-16">Kelas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {parsedUploadStudents.slice(0, 5).map((s, idx) => (
                            <tr key={idx}>
                              <td className="p-1.5 text-center font-mono">{idx + 1}</td>
                              <td className="p-1.5 font-mono">{s.nipd}</td>
                              <td className="p-1.5 font-semibold text-slate-900">{s.nama}</td>
                              <td className="p-1.5 text-center">{s.jk}</td>
                              <td className="p-1.5">{s.agama}</td>
                              <td className="p-1.5">{s.kelas}</td>
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
                    setParsedUploadStudents([]);
                    setUploadErrors([]);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={parsedUploadStudents.length === 0}
                  onClick={handleConfirmImport}
                  className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    parsedUploadStudents.length > 0
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>
                    Konfirmasi Impor ({parsedUploadStudents.length} Siswa)
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT DATA SISWA */}
      {editingItem && (
        <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-600" />
                <span>Edit Data Siswa</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Peserta Didik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingItem.student.nama}
                  onChange={(e) =>
                    setEditingItem({
                      ...editingItem,
                      student: { ...editingItem.student, nama: e.target.value },
                    })
                  }
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Contoh: AHMAD FAUZI"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    NIPD (Nomor Induk) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingItem.student.nipd}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        student: { ...editingItem.student, nipd: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="901"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NISN</label>
                  <input
                    type="text"
                    value={editingItem.student.nisn}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        student: { ...editingItem.student, nisn: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="3190xxxxxx atau -"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
                  <select
                    value={editingItem.student.jk}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        student: { ...editingItem.student, jk: e.target.value as 'L' | 'P' },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="L">L (Laki-laki)</option>
                    <option value="P">P (Perempuan)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Agama</label>
                  <select
                    value={editingItem.student.agama}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        student: { ...editingItem.student, agama: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="HINDU">HINDU</option>
                    <option value="ISLAM">ISLAM</option>
                    <option value="KRISTEN">KRISTEN</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas</label>
                  <select
                    value={editingItem.student.kelas}
                    onChange={(e) =>
                      setEditingItem({
                        ...editingItem,
                        student: { ...editingItem.student, kelas: e.target.value },
                      })
                    }
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-medium"
                  >
                    <option value="Kelas 1">Kelas 1</option>
                    <option value="Kelas 2">Kelas 2</option>
                    <option value="Kelas 3">Kelas 3</option>
                    <option value="Kelas 4">Kelas 4</option>
                    <option value="Kelas 5">Kelas 5</option>
                    <option value="Kelas 6">Kelas 6</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
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

      {/* MODAL TAMBAH SISWA BARU */}
      {isAddModalOpen && (
        <div className="no-print fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Tambah Siswa Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Nama Lengkap Peserta Didik <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newStudent.nama}
                  onChange={(e) => setNewStudent({ ...newStudent, nama: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 uppercase font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="Contoh: RANGGA DWI SAPUTRA"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    NIPD (Nomor Induk) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudent.nipd}
                    onChange={(e) => setNewStudent({ ...newStudent, nipd: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="999"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">NISN</label>
                  <input
                    type="text"
                    value={newStudent.nisn}
                    onChange={(e) => setNewStudent({ ...newStudent, nisn: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                    placeholder="3190xxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Jenis Kelamin</label>
                  <select
                    value={newStudent.jk}
                    onChange={(e) => setNewStudent({ ...newStudent, jk: e.target.value as 'L' | 'P' })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="L">L (Laki-laki)</option>
                    <option value="P">P (Perempuan)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Agama</label>
                  <select
                    value={newStudent.agama}
                    onChange={(e) => setNewStudent({ ...newStudent, agama: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
                  >
                    <option value="HINDU">HINDU</option>
                    <option value="ISLAM">ISLAM</option>
                    <option value="KRISTEN">KRISTEN</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas</label>
                  <select
                    value={newStudent.kelas}
                    onChange={(e) => setNewStudent({ ...newStudent, kelas: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white font-medium"
                  >
                    <option value="Kelas 1">Kelas 1</option>
                    <option value="Kelas 2">Kelas 2</option>
                    <option value="Kelas 3">Kelas 3</option>
                    <option value="Kelas 4">Kelas 4</option>
                    <option value="Kelas 5">Kelas 5</option>
                    <option value="Kelas 6">Kelas 6</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambahkan Siswa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
