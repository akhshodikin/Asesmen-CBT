import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  LogIn,
  Shield,
  UserCheck,
  Users,
} from 'lucide-react';
import type { AuthSession, SchoolProfile, Student, Teacher, UserRole } from '../types';

interface TabLoginPortalProps {
  authSession: AuthSession;
  onLoginSuccess: (session: AuthSession) => void;
  students: Student[];
  teachers: Teacher[];
  schoolProfile: SchoolProfile;
}

const ROLE_META: {
  id: UserRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  accessSummary: string[];
}[] = [
  {
    id: 'siswa',
    label: 'Siswa',
    subtitle: 'Peserta Didik Kelas 1–6',
    icon: GraduationCap,
    accessSummary: [
      'Masuk Portal Ujian CBT menggunakan Token Ujian acak dari guru',
      'Mengerjakan soal PG, PGK, Isian, Mencocokkan, dan Esai',
      'Melihat ringkasan nilai akhir & daftar kartu peserta kelas',
    ],
  },
  {
    id: 'guru',
    label: 'Guru',
    subtitle: 'Guru Kelas & Mata Pelajaran',
    icon: UserCheck,
    accessSummary: [
      'Menyusun Konfigurasi, Kisi-Kisi & jumlah soal (PG, Isian, Esai, Mencocokkan)',
      'Generate soal AI / Template, Naskah Soal, Kunci & Rubrik, Ekspor Google Form',
      'Mengelola Bank Soal, Paket Tes CBT, Acak Token, serta Penilaian & Analisis PDF',
    ],
  },
  {
    id: 'kepsek',
    label: 'Kepala Sekolah',
    subtitle: 'Pimpinan & Supervisi Sekolah',
    icon: Shield,
    accessSummary: [
      'Supervisi Naskah Soal, Matriks Kisi-Kisi, Kunci & Rubrik Pengesahan',
      'Monitoring hasil CBT, Penilaian & Analisis Ketuntasan Belajar',
      'Melihat Data Siswa, Data Guru, serta mengelola Profil Sekolah & Kop Naskah',
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    subtitle: 'Operator & Pengelola Sistem',
    icon: Users,
    accessSummary: [
      'Akses penuh seluruh modul asesmen, Bank Soal, Generator & CBT',
      'Mengelola Data Guru, Data Siswa, serta Profil & Logo Kop Sekolah',
      'Mengatur ulang token ujian acak dan akun akses peran',
    ],
  },
];

export const TabLoginPortal: React.FC<TabLoginPortalProps> = ({
  authSession,
  onLoginSuccess,
  students,
  teachers,
  schoolProfile,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(authSession.role);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Siswa state
  const [siswaKelas, setSiswaKelas] = useState(authSession.kelas || 'Kelas 5');
  const classStudents = useMemo(
    () => students.filter((s) => s.kelas === siswaKelas),
    [students, siswaKelas]
  );
  const [siswaNipd, setSiswaNipd] = useState(
    () => students.find((s) => s.kelas === (authSession.kelas || 'Kelas 5'))?.nipd || '908'
  );
  const [siswaPinInput, setSiswaPinInput] = useState('');

  // Guru state
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[4]?.id || teachers[0]?.id || '');
  const [guruPinInput, setGuruPinInput] = useState('');

  // Kepsek state
  const [kepsekPinInput, setKepsekPinInput] = useState('');

  // Admin state
  const [adminUserInput, setAdminUserInput] = useState('admin');
  const [adminPinInput, setAdminPinInput] = useState('');

  const activeRoleMeta = ROLE_META.find((r) => r.id === selectedRole) || ROLE_META[0];
  const selectedTeacher = teachers.find((t) => t.id === selectedTeacherId) || teachers[0];
  const selectedStudent = classStudents.find((s) => s.nipd === siswaNipd) || classStudents[0];

  const handleKelasChange = (newKelas: string) => {
    setSiswaKelas(newKelas);
    const first = students.find((s) => s.kelas === newKelas);
    if (first) setSiswaNipd(first.nipd);
    setSiswaPinInput('');
    setErrorMsg('');
  };

  const submitLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    const now = new Date().toLocaleString('id-ID');

    if (selectedRole === 'siswa') {
      if (!selectedStudent) {
        setErrorMsg('Pilih siswa terlebih dahulu.');
        return;
      }
      const clean = siswaPinInput.trim();
      if (clean !== selectedStudent.nipd && clean !== selectedStudent.nisn) {
        setErrorMsg(
          `NIPD atau NISN tidak cocok untuk ${selectedStudent.nama}. (NIPD terdaftar: ${selectedStudent.nipd})`
        );
        return;
      }
      const session: AuthSession = {
        role: 'siswa',
        name: selectedStudent.nama,
        identifier: selectedStudent.nipd,
        kelas: selectedStudent.kelas,
        nipd: selectedStudent.nipd,
        loggedInAt: now,
      };
      onLoginSuccess(session);
      setSuccessMsg(`Berhasil masuk sebagai Siswa (${selectedStudent.nama}).`);
      return;
    }

    if (selectedRole === 'guru') {
      if (!selectedTeacher) {
        setErrorMsg('Pilih data guru terlebih dahulu.');
        return;
      }
      const clean = guruPinInput.trim();
      const validNip = selectedTeacher.nip && selectedTeacher.nip !== '-' ? selectedTeacher.nip : '';
      if (clean !== 'guru123' && (!validNip || clean !== validNip)) {
        setErrorMsg('NIP Guru atau PIN akses salah. Gunakan NIP terdaftar atau PIN demo: guru123');
        return;
      }
      const session: AuthSession = {
        role: 'guru',
        name: selectedTeacher.nama,
        identifier: validNip || 'GURU-SDN',
        loggedInAt: now,
      };
      onLoginSuccess(session);
      setSuccessMsg(`Berhasil masuk sebagai Guru (${selectedTeacher.nama}).`);
      return;
    }

    if (selectedRole === 'kepsek') {
      const clean = kepsekPinInput.trim();
      if (clean !== 'kepsek123' && clean !== schoolProfile.kepsekNip) {
        setErrorMsg(
          `NIP Kepala Sekolah atau PIN salah. Gunakan NIP (${schoolProfile.kepsekNip}) atau PIN demo: kepsek123`
        );
        return;
      }
      const session: AuthSession = {
        role: 'kepsek',
        name: schoolProfile.kepsekNama,
        identifier: schoolProfile.kepsekNip,
        loggedInAt: now,
      };
      onLoginSuccess(session);
      setSuccessMsg(`Berhasil masuk sebagai Kepala Sekolah (${schoolProfile.kepsekNama}).`);
      return;
    }

    if (selectedRole === 'admin') {
      const cleanUser = adminUserInput.trim().toLowerCase();
      const cleanPin = adminPinInput.trim();
      if (cleanUser !== 'admin' || cleanPin !== 'admin123') {
        setErrorMsg('Username atau PIN Admin salah. Gunakan username "admin" dan PIN "admin123".');
        return;
      }
      const session: AuthSession = {
        role: 'admin',
        name: 'Administrator Sekolah',
        identifier: 'ADMIN-OP',
        loggedInAt: now,
      };
      onLoginSuccess(session);
      setSuccessMsg('Berhasil masuk sebagai Admin Sekolah.');
    }
  };

  const quickLoginAs = (role: UserRole) => {
    setErrorMsg('');
    const now = new Date().toLocaleString('id-ID');
    if (role === 'siswa') {
      const st = selectedStudent || students[0];
      onLoginSuccess({
        role: 'siswa',
        name: st.nama,
        identifier: st.nipd,
        kelas: st.kelas,
        nipd: st.nipd,
        loggedInAt: now,
      });
    } else if (role === 'guru') {
      const t = selectedTeacher || teachers[0];
      onLoginSuccess({
        role: 'guru',
        name: t.nama,
        identifier: t.nip,
        loggedInAt: now,
      });
    } else if (role === 'kepsek') {
      onLoginSuccess({
        role: 'kepsek',
        name: schoolProfile.kepsekNama,
        identifier: schoolProfile.kepsekNip,
        loggedInAt: now,
      });
    } else {
      onLoginSuccess({
        role: 'admin',
        name: 'Administrator Sekolah',
        identifier: 'ADMIN-OP',
        loggedInAt: now,
      });
    }
  };

  return (
    <div className="space-y-6 no-print">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
            <span>Autentikasi &amp; Hak Akses Peran</span>
            <span aria-hidden="true">·</span>
            <span>{schoolProfile.namaSingkat}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            SMART ASESMEN — Login Siswa, Guru, Kepala Sekolah &amp; Admin
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl">
            Pilih peran akun untuk masuk ke portal asesmen. Menu di sebelah kiri otomatis
            menyesuaikan hak akses peran yang sedang aktif.
          </p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-xs shrink-0 space-y-0.5">
          <span className="text-emerald-700 font-semibold block">Sesi Aktif Saat Ini</span>
          <p className="font-bold text-slate-900 text-sm">{authSession.name}</p>
          <p className="text-slate-600 font-mono">
            Peran: {authSession.role.toUpperCase()} · ID: {authSession.identifier}
          </p>
        </div>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Login Form */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
          {/* Role Segmented Switcher */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <p className="text-xs font-semibold text-slate-700 mb-2.5">1. Pilih Peran Pengguna</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROLE_META.map((role) => {
                const Icon = role.icon;
                const active = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{role.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={submitLogin} className="p-6 space-y-4 text-xs">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-3 rounded-lg flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-700" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Form Siswa */}
            {selectedRole === 'siswa' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Kelas</label>
                    <select
                      value={siswaKelas}
                      onChange={(e) => handleKelasChange(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white font-semibold"
                    >
                      {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map(
                        (k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Nama Peserta Didik
                    </label>
                    <select
                      value={siswaNipd}
                      onChange={(e) => setSiswaNipd(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white font-semibold"
                    >
                      {classStudents.map((s) => (
                        <option key={s.nipd} value={s.nipd}>
                          {s.no}. {s.nama}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      NIPD atau NISN Peserta Didik
                    </label>
                    {selectedStudent && (
                      <button
                        type="button"
                        onClick={() => setSiswaPinInput(selectedStudent.nipd)}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Isi NIPD Otomatis ({selectedStudent.nipd})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={siswaPinInput}
                    onChange={(e) => setSiswaPinInput(e.target.value)}
                    placeholder="Masukkan NIPD atau NISN..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Form Guru */}
            {selectedRole === 'guru' && (
              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pilih Nama Guru
                  </label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 bg-white font-semibold"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} — {t.ugk}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">NIP Guru atau PIN Akses</label>
                    <button
                      type="button"
                      onClick={() => setGuruPinInput('guru123')}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Isi PIN Demo (guru123)
                    </button>
                  </div>
                  <input
                    type="password"
                    value={guruPinInput}
                    onChange={(e) => setGuruPinInput(e.target.value)}
                    placeholder="Masukkan NIP atau PIN guru123..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Form Kepala Sekolah */}
            {selectedRole === 'kepsek' && (
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <span className="text-[11px] text-slate-500 block">Kepala Sekolah Terdaftar</span>
                  <p className="font-bold text-slate-900 text-sm">{schoolProfile.kepsekNama}</p>
                  <p className="font-mono text-slate-600 mt-0.5">
                    NIP. {schoolProfile.kepsekNip}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      NIP Kepala Sekolah atau PIN Akses
                    </label>
                    <button
                      type="button"
                      onClick={() => setKepsekPinInput('kepsek123')}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Isi PIN Demo (kepsek123)
                    </button>
                  </div>
                  <input
                    type="password"
                    value={kepsekPinInput}
                    onChange={(e) => setKepsekPinInput(e.target.value)}
                    placeholder="Masukkan NIP atau PIN kepsek123..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Form Admin */}
            {selectedRole === 'admin' && (
              <div className="space-y-4">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Username Operator / Admin
                  </label>
                  <input
                    type="text"
                    value={adminUserInput}
                    onChange={(e) => setAdminUserInput(e.target.value)}
                    placeholder="admin"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">PIN / Kata Sandi Admin</label>
                    <button
                      type="button"
                      onClick={() => setAdminPinInput('admin123')}
                      className="text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Isi PIN Demo (admin123)
                    </button>
                  </div>
                  <input
                    type="password"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    placeholder="Masukkan PIN admin123..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-5 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk sebagai {activeRoleMeta.label}</span>
            </button>
          </form>

          {/* 1-Click Quick Role Switch for Easy Simulation */}
          <div className="px-6 pb-6 pt-2 border-t border-slate-100 space-y-2.5">
            <p className="text-[11px] font-semibold text-slate-500">
              Simulasi Cepat Pindah Peran (1 Klik):
            </p>
            <div className="flex flex-wrap gap-2">
              {ROLE_META.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => quickLoginAs(r.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    authSession.role === r.id
                      ? 'bg-amber-100 border-amber-400 text-amber-950'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  Coba Akun {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Role Permissions & Keterangan */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <KeyRound className="w-4 h-4 text-emerald-700" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Hak Akses Peran: {activeRoleMeta.label}
                </h3>
                <p className="text-xs text-slate-500">{activeRoleMeta.subtitle}</p>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-700">
              {activeRoleMeta.accessSummary.map((line, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs space-y-1.5">
              <p className="font-bold text-slate-800">Panduan Kredensial Uji Coba:</p>
              <p className="text-slate-600">
                <strong className="text-slate-800">Siswa:</strong> Gunakan NIPD / NISN siswa (mis.{' '}
                <span className="font-mono font-semibold">908</span> untuk Bintang Kelas 5).
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-800">Guru:</strong> Gunakan NIP guru atau PIN{' '}
                <span className="font-mono font-semibold">guru123</span>.
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-800">Kepala Sekolah:</strong> Gunakan NIP Kepsek atau PIN{' '}
                <span className="font-mono font-semibold">kepsek123</span>.
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-800">Admin:</strong> Username{' '}
                <span className="font-mono font-semibold">admin</span> · PIN{' '}
                <span className="font-mono font-semibold">admin123</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
