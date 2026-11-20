export type ActiveTab =
  | 'dashboard'
  | 'generator'
  | 'naskah'
  | 'paket'
  | 'cbt'
  | 'gform'
  | 'kisikisi'
  | 'kunci'
  | 'analisis'
  | 'siswa'
  | 'guru'
  | 'profil'
  | 'login';

export type UserRole = 'siswa' | 'guru' | 'kepsek' | 'admin';

export interface AuthSession {
  role: UserRole;
  name: string;
  identifier: string; // NIPD for siswa, NIP for guru/kepsek, ADMIN for admin
  kelas?: string;
  nipd?: string;
  nisn?: string;
  loggedInAt: string;
}

export interface Teacher {
  id: string;
  nama: string;
  namaAsli: string;
  nip: string;
  jabatan: string;
  ugk: string;
  fase: string;
  status: string;
  wa: string;
  email: string;
}

export interface Student {
  no: number;
  nama: string;
  nipd: string;
  jk: 'L' | 'P';
  nisn: string;
  agama: string;
  kelas: string;
}

export interface KisiKisiItem {
  cp: string;
  materi: string;
  indikator: string;
  dimensi: string;
  bloom: string;
  kesulitan: string;
  bentuk: string;
}

export type QuestionShape = 'PG' | 'PGK' | 'Isian' | 'Uraian' | 'Mencocokkan';

export interface QuestionItem {
  nomor: number;
  bentuk: QuestionShape | string;
  stimulus: string;
  pertanyaan: string;
  opsi: string[];
  kunci: string;
  pembahasan: string;
  skor: number;
  materi: string;
  indikator: string;
  bloom: string;
  kesulitan: string;
  dimensi: string;
  gambarUrl?: string;
  gambarDeskripsi?: string;
}

export interface BankQuestionItem extends QuestionItem {
  id: string;
  mapel: string;
  kelas: string;
  sumber: 'Bank Bawaan' | 'AI Gemini' | 'Template Lokal' | 'Manual Guru';
  createdAt: string;
}

export type ExamPackageStatus = 'Aktif' | 'Draf' | 'Arsip';

export interface ExamPackage {
  id: string;
  kodePaket: string;
  namaPaket: string;
  deskripsi: string;
  mapel: string;
  kelas: string;
  fase: string;
  jenisAsesmen: string;
  durasiMenit: number;
  tokenCBT: string;
  kktp: number;
  acakSoal: boolean;
  acakOpsi: boolean;
  status: ExamPackageStatus;
  questions: QuestionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentConfig {
  jenisAsesmen: string;
  tahunPelajaran: string;
  kelas: string;
  fase: string;
  mapel: string;
  guruNama: string;
  guruNip: string;
  kepsekNama: string;
  kepsekNip: string;
  hariTanggal: string;
  waktu: string;
  durasiMenit: number;
  tokenCBT: string;
  tanggalTtd: string;
  konteksLokal: boolean;
  dimensiPilihan: string[];
  jmlPG: number;
  jmlPGK: number;
  jmlIsian: number;
  jmlUraian: number;
  jmlMencocokkan: number;
  propMudah: number;
  propSedang: number;
  propSulit: number;
  bloomDistribution: Record<string, boolean>;
  sertakanGambar?: boolean;
}

export interface CBTDetail {
  nomor: number;
  bentuk: string;
  bloom: string;
  jawabanSiswa: string;
  kunci: string;
  skorPerolehan: number;
  skorMaks: number;
  isCorrect: boolean;
}

export interface CBTSubmission {
  id: string;
  waktuSelesai: string;
  nama: string;
  nipd: string;
  nisn: string;
  kelas: string;
  agama: string;
  mapel: string;
  paketId?: string;
  namaPaket?: string;
  skorPerolehan: number;
  skorMaksimal: number;
  nilaiAkhir: number;
  benarPG: number;
  detailBloom: string;
  details?: CBTDetail[];
  violations?: number;
  violationLogs?: string[];
}

export interface StudentGradeRecord {
  key: string; // `${kelas}__${mapel}__${nipd}`
  nipd: string;
  kelas: string;
  mapel: string;
  scores: Record<number, number>; // question nomor -> earned score
  catatan: string;
  updatedAt: string;
}

export interface SchoolProfile {
  namaInstansiAtas: string;
  namaDinas: string;
  namaSekolahHeader: string;
  namaSingkat: string;
  lokasiSingkat: string;
  npsn: string;
  akreditasi: string;
  alamatLengkap: string;
  kontakInfo: string;
  kepsekNama: string;
  kepsekNip: string;
  kotaTtd: string;
  logoKiri: string; // base64 data URL or empty string for built-in emblem
  logoKanan: string; // base64 data URL or empty string
  tampilkanLogoKiri: boolean;
  tampilkanLogoKanan: boolean;
  perataanKop: 'center' | 'left';
  gayaGarisKop: 'double' | 'thick-thin' | 'single';
}
