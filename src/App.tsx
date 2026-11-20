import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Building2,
  CheckSquare,
  Code,
  FileText,
  GraduationCap,
  KeyRound,
  Layers,
  LayoutDashboard,
  Menu,
  Monitor,
  Package,
  Printer,
  Settings,
  Share2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { ModalShareStudentLink } from './components/ModalShareStudentLink';
import { TabConfigKisi } from './components/TabConfigKisi';
import { TabDashboard } from './components/TabDashboard';
import { TabDataGuru } from './components/TabDataGuru';
import { TabDataSiswa } from './components/TabDataSiswa';
import { TabGoogleForm } from './components/TabGoogleForm';
import { TabKisiMatriks } from './components/TabKisiMatriks';
import { TabKunciRubrik } from './components/TabKunciRubrik';
import { TabLoginPortal } from './components/TabLoginPortal';
import { TabNaskahSoal } from './components/TabNaskahSoal';
import { TabPaketBankCBT } from './components/TabPaketBankCBT';
import { TabPenilaianAnalisis } from './components/TabPenilaianAnalisis';
import { TabPortalCBT } from './components/TabPortalCBT';
import { TabProfilSekolah } from './components/TabProfilSekolah';
import { generateQuestionsClientAI } from './utils/aiClientService';
import {
  buildLocalTemplateQuestions,
  DEFAULT_CONFIG,
  DEFAULT_SCHOOL_PROFILE,
  INITIAL_BANK_QUESTIONS,
  INITIAL_CBT_SUBMISSIONS,
  INITIAL_EXAM_PACKAGES,
  INITIAL_SAMPLE_QUESTIONS,
  INITIAL_TEACHERS,
  PRESET_KISI_KISI,
  STUDENTS_DATA,
} from './data/schoolData';
import type {
  ActiveTab,
  AssessmentConfig,
  AuthSession,
  BankQuestionItem,
  CBTSubmission,
  ExamPackage,
  KisiKisiItem,
  QuestionItem,
  SchoolProfile,
  Student,
  StudentGradeRecord,
  Teacher,
  UserRole,
} from './types';
import { generateRandomToken } from './utils/cbtPackageHelpers';

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const DEFAULT_AUTH_SESSION: AuthSession = {
  role: 'admin',
  name: 'Administrator Sekolah',
  identifier: 'ADMIN-OP',
  loggedInAt: 'Aktif',
};

const ALLOWED_TABS_BY_ROLE: Record<UserRole, ActiveTab[]> = {
  siswa: ['cbt', 'login'],
  guru: [
    'dashboard',
    'generator',
    'naskah',
    'kisikisi',
    'kunci',
    'paket',
    'cbt',
    'analisis',
    'gform',
    'siswa',
    'login',
  ],
  kepsek: [
    'dashboard',
    'naskah',
    'kisikisi',
    'kunci',
    'paket',
    'cbt',
    'analisis',
    'siswa',
    'guru',
    'profil',
    'login',
  ],
  admin: [
    'dashboard',
    'generator',
    'naskah',
    'kisikisi',
    'kunci',
    'paket',
    'cbt',
    'analisis',
    'gform',
    'siswa',
    'guru',
    'profil',
    'login',
  ],
};

export default function App() {
  const [authSession, setAuthSession] = useState<AuthSession>(() =>
    loadStored('sdn_kandangan1_auth_v1', DEFAULT_AUTH_SESSION)
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const storedSession = loadStored('sdn_kandangan1_auth_v1', DEFAULT_AUTH_SESSION);
    const allowed = ALLOWED_TABS_BY_ROLE[storedSession.role] || ALLOWED_TABS_BY_ROLE.admin;
    return allowed[0] || 'login';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [teachers, setTeachers] = useState<Teacher[]>(() =>
    loadStored('sdn_kandangan1_teachers_v1', INITIAL_TEACHERS)
  );
  const [students, setStudents] = useState<Student[]>(() =>
    loadStored('sdn_kandangan1_students_v1', STUDENTS_DATA)
  );
  const [config, setConfig] = useState<AssessmentConfig>(() => {
    const stored = loadStored('sdn_kandangan1_config_v1', DEFAULT_CONFIG);
    return {
      ...DEFAULT_CONFIG,
      ...stored,
      sertakanGambar: stored.sertakanGambar ?? true,
      kepsekNama:
        stored.kepsekNama === 'Akhmad Shodikin, S.Pd.' || !stored.kepsekNama
          ? DEFAULT_CONFIG.kepsekNama
          : stored.kepsekNama,
      kepsekNip:
        stored.kepsekNip === '196905141994031006' || !stored.kepsekNip
          ? DEFAULT_CONFIG.kepsekNip
          : stored.kepsekNip,
    };
  });
  const [kisiKisiList, setKisiKisiList] = useState<KisiKisiItem[]>(() =>
    loadStored(
      'sdn_kandangan1_kisikisi_v1',
      PRESET_KISI_KISI['Ilmu Pengetahuan Alam dan Sosial (IPAS)']
    )
  );
  const [questions, setQuestions] = useState<QuestionItem[]>(() =>
    loadStored('sdn_kandangan1_questions_v1', INITIAL_SAMPLE_QUESTIONS)
  );
  const [cbtSubmissions, setCbtSubmissions] = useState<CBTSubmission[]>(() =>
    loadStored('sdn_kandangan1_cbt_v1', INITIAL_CBT_SUBMISSIONS)
  );
  const [gradeRecords, setGradeRecords] = useState<Record<string, StudentGradeRecord>>(() =>
    loadStored('sdn_kandangan1_grades_v1', {})
  );
  const [kktp, setKktp] = useState<number>(() =>
    loadStored('sdn_kandangan1_kktp_v1', 75)
  );
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => {
    const stored = loadStored('sdn_kandangan1_school_profile_v1', DEFAULT_SCHOOL_PROFILE);
    const rawHeader = stored.namaSekolahHeader || DEFAULT_SCHOOL_PROFILE.namaSekolahHeader;
    const cleanHeader = rawHeader.replace(/^UPT\s+(SATUAN\s+PENDIDIKAN\s+)?/i, '').trim();
    return {
      ...DEFAULT_SCHOOL_PROFILE,
      ...stored,
      namaSekolahHeader: cleanHeader || 'SDN KANDANGAN I TOSARI',
      kepsekNama:
        stored.kepsekNama === 'Akhmad Shodikin, S.Pd.' || !stored.kepsekNama
          ? DEFAULT_SCHOOL_PROFILE.kepsekNama
          : stored.kepsekNama,
      kepsekNip:
        stored.kepsekNip === '196905141994031006' || !stored.kepsekNip
          ? DEFAULT_SCHOOL_PROFILE.kepsekNip
          : stored.kepsekNip,
      logoKiri: stored.logoKiri || DEFAULT_SCHOOL_PROFILE.logoKiri,
      logoKanan: stored.logoKanan || DEFAULT_SCHOOL_PROFILE.logoKanan,
      tampilkanLogoKiri: true,
      tampilkanLogoKanan: true,
    };
  });
  const [bankQuestions, setBankQuestions] = useState<BankQuestionItem[]>(() =>
    loadStored('sdn_kandangan1_bank_questions_v1', INITIAL_BANK_QUESTIONS)
  );
  const [examPackages, setExamPackages] = useState<ExamPackage[]>(() =>
    loadStored('sdn_kandangan1_exam_packages_v1', INITIAL_EXAM_PACKAGES)
  );
  const [activePackageId, setActivePackageId] = useState<string | null>(() =>
    loadStored('sdn_kandangan1_active_pkg_v1', INITIAL_EXAM_PACKAGES[0]?.id || null)
  );

  const [rawKisiText, setRawKisiText] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genElapsedSeconds, setGenElapsedSeconds] = useState(0);
  const [genError, setGenError] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [filterKelasSiswa, setFilterKelasSiswa] = useState(config.kelas);
  const [shareStudentModalOpen, setShareStudentModalOpen] = useState(false);

  // URL Parameter Detection: Mengaktifkan Portal Siswa otomatis jika tautan khusus dibuka (?portal=siswa)
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const isSiswaPortal =
        params.get('portal') === 'siswa' ||
        params.get('role') === 'siswa' ||
        params.get('siswa') === '1' ||
        window.location.hash.toLowerCase().includes('siswa');

      if (isSiswaPortal) {
        const paramKelas = params.get('kelas') || undefined;
        const paramToken = params.get('token') || undefined;
        const paramNipd = params.get('nipd') || undefined;
        const paramNisn = params.get('nisn') || undefined;

        let matchedStudentName = 'Peserta Didik';
        let matchedKelas = paramKelas || 'Kelas 5';
        let matchedNipd = paramNipd;
        let matchedNisn = paramNisn;

        if (paramNisn || paramNipd) {
          const found = students.find(
            (s) =>
              (paramNisn && s.nisn.trim() === paramNisn.trim()) ||
              (paramNipd && s.nipd.trim() === paramNipd.trim())
          );
          if (found) {
            matchedStudentName = found.nama;
            matchedKelas = found.kelas;
            matchedNipd = found.nipd;
            matchedNisn = found.nisn;
          }
        }

        setAuthSession({
          role: 'siswa',
          name: matchedStudentName,
          identifier: matchedNisn || matchedNipd || 'SISWA-CBT',
          loggedInAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          kelas: matchedKelas,
          nipd: matchedNipd,
          nisn: matchedNisn,
        });

        setActiveTab('cbt');

        if (paramToken) {
          setConfig((prev) => ({ ...prev, tokenCBT: paramToken.toUpperCase() }));
        }
        if (matchedKelas) {
          setConfig((prev) => ({ ...prev, kelas: matchedKelas }));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_auth_v1', JSON.stringify(authSession));
    } catch {
      // ignore
    }
    const allowed = ALLOWED_TABS_BY_ROLE[authSession.role] || ALLOWED_TABS_BY_ROLE.admin;
    if (!allowed.includes(activeTab)) {
      setActiveTab(allowed[0] || 'login');
    }
  }, [authSession, activeTab]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_teachers_v1', JSON.stringify(teachers));
    } catch {
      // ignore storage quota errors
    }
  }, [teachers]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_students_v1', JSON.stringify(students));
    } catch {
      // ignore storage quota errors
    }
  }, [students]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_config_v1', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_kisikisi_v1', JSON.stringify(kisiKisiList));
    } catch {
      // ignore
    }
  }, [kisiKisiList]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_questions_v1', JSON.stringify(questions));
    } catch {
      // ignore
    }
  }, [questions]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_cbt_v1', JSON.stringify(cbtSubmissions));
    } catch {
      // ignore
    }
  }, [cbtSubmissions]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_grades_v1', JSON.stringify(gradeRecords));
    } catch {
      // ignore
    }
  }, [gradeRecords]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_kktp_v1', JSON.stringify(kktp));
    } catch {
      // ignore
    }
  }, [kktp]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'sdn_kandangan1_school_profile_v1',
        JSON.stringify(schoolProfile)
      );
    } catch {
      // ignore
    }
    setConfig((prev) => {
      if (
        prev.kepsekNama === schoolProfile.kepsekNama &&
        prev.kepsekNip === schoolProfile.kepsekNip
      ) {
        return prev;
      }
      return {
        ...prev,
        kepsekNama: schoolProfile.kepsekNama,
        kepsekNip: schoolProfile.kepsekNip,
      };
    });
  }, [schoolProfile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'sdn_kandangan1_bank_questions_v1',
        JSON.stringify(bankQuestions)
      );
    } catch {
      // ignore
    }
  }, [bankQuestions]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_exam_packages_v1', JSON.stringify(examPackages));
    } catch {
      // ignore
    }
  }, [examPackages]);

  useEffect(() => {
    try {
      window.localStorage.setItem('sdn_kandangan1_active_pkg_v1', JSON.stringify(activePackageId));
    } catch {
      // ignore
    }
  }, [activePackageId]);

  // Automatically sync Fase & Guru when Kelas or Mapel changes
  useEffect(() => {
    const kNum = parseInt(config.kelas.replace(/\D/g, ''), 10) || 1;
    let newFase = 'Fase A';
    if (kNum === 3 || kNum === 4) newFase = 'Fase B';
    if (kNum === 5 || kNum === 6) newFase = 'Fase C';

    let matchedTeacher: Teacher | undefined;
    if (config.mapel.toLowerCase().includes('agama islam')) {
      matchedTeacher = teachers.find((t) => t.ugk.toLowerCase().includes('agama islam'));
    }
    if (!matchedTeacher) {
      matchedTeacher = teachers.find((t) => t.ugk === config.kelas);
    }

    setConfig((prev) => ({
      ...prev,
      fase: newFase,
      guruNama: matchedTeacher ? matchedTeacher.nama : prev.guruNama,
      guruNip: matchedTeacher ? matchedTeacher.nip : prev.guruNip,
    }));
    setFilterKelasSiswa(config.kelas);
  }, [config.kelas, config.mapel, teachers]);

  const totalRequestedQuestions =
    Number(config.jmlPG || 0) +
    Number(config.jmlPGK || 0) +
    Number(config.jmlIsian || 0) +
    Number(config.jmlMencocokkan || 0) +
    Number(config.jmlUraian || 0);

  const questionStats = useMemo(() => {
    const bloomCounts: Record<string, number> = { C1: 0, C2: 0, C3: 0, C4: 0, C5: 0, C6: 0 };
    const diffCounts = { Mudah: 0, Sedang: 0, Sulit: 0 };
    let totalScore = 0;

    questions.forEach((q) => {
      const b = (q.bloom || 'C3').toUpperCase().substring(0, 2);
      if (bloomCounts[b] !== undefined) bloomCounts[b]++;
      if (q.kesulitan?.toLowerCase().includes('mudah')) diffCounts.Mudah++;
      else if (q.kesulitan?.toLowerCase().includes('sulit')) diffCounts.Sulit++;
      else diffCounts.Sedang++;
      totalScore += Number(q.skor || 1);
    });

    return { bloomCounts, diffCounts, totalScore };
  }, [questions]);

  const handleLoadTemplateKisi = () => {
    const preset = PRESET_KISI_KISI[config.mapel] || PRESET_KISI_KISI.DEFAULT;
    setKisiKisiList([...preset]);
    setUploadStatus(`Template Kisi-Kisi ${config.mapel} (${config.kelas}) berhasil dimuat.`);
    setTimeout(() => setUploadStatus(''), 4000);
  };

  const parseRawTextToKisi = (text: string, sourceName = 'Teks Input') => {
    if (!text || !text.trim()) return;
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: KisiKisiItem[] = [];

    lines.forEach((line, idx) => {
      if (
        idx === 0 &&
        (line.toLowerCase().includes('indikator') || line.toLowerCase().includes('capaian'))
      ) {
        return;
      }
      const parts = line.includes('\t')
        ? line.split('\t')
        : line.includes(';')
          ? line.split(';')
          : line.split('|');

      if (parts.length >= 2) {
        parsed.push({
          cp: parts[0]?.trim() || 'Capaian Pembelajaran sesuai Kurikulum Merdeka',
          materi: parts[1]?.trim() || 'Materi Pokok Semester',
          indikator: parts[2]?.trim() || parts[1]?.trim(),
          dimensi: parts[3]?.trim() || 'Penalaran Kritis',
          bloom: parts[4]?.trim().toUpperCase().match(/C[1-6]/)?.[0] || 'C3',
          kesulitan: parts[5]?.trim() || 'Sedang',
          bentuk: parts[6]?.trim() || 'PG',
        });
      } else {
        parsed.push({
          cp: `Memahami materi ${config.mapel} ${config.kelas}`,
          materi: line.length > 50 ? line.substring(0, 45) + '...' : line,
          indikator: line,
          dimensi:
            config.dimensiPilihan[idx % Math.max(1, config.dimensiPilihan.length)] ||
            'Penalaran Kritis',
          bloom: ['C2', 'C3', 'C4'][idx % 3],
          kesulitan: ['Mudah', 'Sedang', 'Sulit'][idx % 3],
          bentuk: 'PG',
        });
      }
    });

    if (parsed.length > 0) {
      setKisiKisiList(parsed);
      setUploadStatus(`Berhasil mengekstrak ${parsed.length} indikator dari ${sourceName}.`);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? '');
      setRawKisiText(content);
      parseRawTextToKisi(content, file.name);
    };
    reader.readAsText(file);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setGenError('');
    setGenElapsedSeconds(0);

    const timer = setInterval(() => {
      setGenElapsedSeconds((sec) => sec + 1);
    }, 1000);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 50000);

    try {
      let questionsResult: QuestionItem[] | null = null;
      let needClientFallback = false;

      // 1. Coba hubungi server backend lokal terlebih dahulu jika ada
      try {
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            config,
            kisiKisiList,
            rawKisiText,
            totalRequestedQuestions,
          }),
        });

        const contentType = response.headers.get('content-type') || '';
        // Jika server mengembalikan HTML (misal rewrite index.html di Firebase Hosting)
        if (!contentType.includes('application/json')) {
          needClientFallback = true;
        } else {
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data?.error || `Gagal menyusun soal (HTTP ${response.status})`);
          }
          if (Array.isArray(data?.questions) && data.questions.length > 0) {
            questionsResult = data.questions;
          } else {
            needClientFallback = true;
          }
        }
      } catch (backendErr: unknown) {
        if (backendErr instanceof Error && backendErr.name === 'AbortError') {
          throw backendErr;
        }
        needClientFallback = true;
      }

      // 2. Jika backend tidak tersedia (misal di Firebase Hosting), eksekusi AI langsung dari Browser
      if (needClientFallback || !questionsResult) {
        const clientRes = await generateQuestionsClientAI(
          config,
          kisiKisiList,
          rawKisiText,
          totalRequestedQuestions,
          controller.signal
        );
        questionsResult = clientRes.questions;
      }

      if (Array.isArray(questionsResult) && questionsResult.length > 0) {
        setQuestions(questionsResult);
        setActivePackageId(null);
        setActiveTab('naskah');
      } else {
        throw new Error('Respons AI tidak menghasilkan daftar soal yang valid.');
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setGenError(
          'Proses penyusunan AI dihentikan atau melebihi batas waktu 50 detik. Anda dapat langsung menggunakan tombol "Gunakan Template Cerdas Lokal" di bawah ini yang siap pakai seketika (0 detik) tanpa perlu menunggu AI!'
        );
      } else {
        const rawMessage = err instanceof Error ? err.message : String(err);
        const message =
          rawMessage.includes("Unexpected token '<'") || rawMessage.includes('is not valid JSON')
            ? 'Koneksi backend AI tidak aktif pada hosting Firebase. Silakan masukkan API Key Gemini Anda di menu "Setting Multi-AI" (pojok kanan atas), atau gunakan tombol "Gunakan Template Cerdas Lokal" di bawah ini yang siap pakai seketika!'
            : rawMessage;
        setGenError(message);
      }
    } finally {
      clearInterval(timer);
      clearTimeout(timeoutId);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancelGenerateAI = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleGenerateLocalTemplate = () => {
    setGenError('');
    const list = buildLocalTemplateQuestions(config, kisiKisiList);
    setQuestions(list);
    setActivePackageId(null);
    setActiveTab('naskah');
  };

  const handleActivatePackage = (pkg: ExamPackage, targetTab?: ActiveTab) => {
    setActivePackageId(pkg.id);
    setQuestions(pkg.questions.map((q, idx) => ({ ...q, nomor: idx + 1 })));
    setKktp(pkg.kktp || 75);
    setConfig((prev) => ({
      ...prev,
      mapel: pkg.mapel,
      kelas: pkg.kelas,
      fase: pkg.fase,
      jenisAsesmen: pkg.jenisAsesmen,
      durasiMenit: pkg.durasiMenit,
      tokenCBT: pkg.tokenCBT,
    }));
    if (targetTab) {
      handleSelectTab(targetTab);
    }
  };

  const handleRegenerateSingle = async (idx: number) => {
    const q = questions[idx];
    if (!q) return;
    setEditingIndex(idx);
    setGenError('');
    try {
      const response = await fetch('/api/regenerate-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, config }),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Fitur ganti soal AI memerlukan backend aktif atau silakan edit manual pada kartu soal.');
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Gagal mengganti butir soal.');
      }
      if (data?.question) {
        setQuestions((prev) => {
          const updated = [...prev];
          updated[idx] = { ...data.question, nomor: q.nomor };
          return updated;
        });
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : 'Gagal mengganti butir soal.';
      const message = rawMessage.includes("Unexpected token '<'")
        ? 'Layanan backend AI tidak tersedia pada hosting. Anda dapat mengedit soal secara manual langsung pada kolom teks di atas.'
        : rawMessage;
      setGenError(message);
    } finally {
      setEditingIndex(null);
    }
  };

  const handleRandomizeToken = () => {
    const newTok = generateRandomToken(config.mapel.slice(0, 3));
    setConfig((prev) => ({ ...prev, tokenCBT: newTok }));
    if (activePackageId) {
      setExamPackages((prev) =>
        prev.map((p) =>
          p.id === activePackageId
            ? { ...p, tokenCBT: newTok, updatedAt: new Date().toISOString() }
            : p
        )
      );
    }
  };

  const handleLoginSuccess = (session: AuthSession) => {
    setAuthSession(session);
    const allowed = ALLOWED_TABS_BY_ROLE[session.role];
    if (session.role === 'siswa') {
      setActiveTab('cbt');
      if (session.kelas) setFilterKelasSiswa(session.kelas);
    } else if (!allowed.includes(activeTab) || activeTab === 'login') {
      setActiveTab('dashboard');
    }
  };

  const rawNavGroups: {
    groupTitle: string;
    items: {
      id: ActiveTab;
      label: string;
      count?: number;
      icon: React.ComponentType<{ className?: string }>;
    }[];
  }[] = [
    {
      groupTitle: 'Utama',
      items: [
        { id: 'dashboard', label: 'Dasbor Utama', icon: LayoutDashboard },
      ],
    },
    {
      groupTitle: 'Penyusunan Asesmen',
      items: [
        { id: 'generator', label: 'Konfigurasi & Kisi-Kisi', icon: Settings },
        { id: 'naskah', label: 'Naskah Soal', count: questions.length, icon: FileText },
        { id: 'kisikisi', label: 'Matriks Kisi-Kisi', icon: Layers },
        { id: 'kunci', label: 'Kunci & Rubrik', icon: CheckSquare },
      ],
    },
    {
      groupTitle: 'Ujian & Evaluasi Hasil',
      items: [
        { id: 'paket', label: 'Bank Soal & Paket CBT', count: examPackages.length, icon: Package },
        { id: 'cbt', label: 'Portal Ujian CBT', icon: Monitor },
        { id: 'analisis', label: 'Penilaian & Analisis', icon: BarChart3 },
        { id: 'gform', label: 'Google Form & Ekspor', icon: Code },
      ],
    },
    {
      groupTitle: 'Administrasi Sekolah',
      items: [
        { id: 'siswa', label: 'Data Siswa & Kartu', count: students.length, icon: Users },
        { id: 'guru', label: 'Data Guru', count: teachers.length, icon: UserCheck },
        { id: 'profil', label: 'Profil Sekolah & Kop', icon: Building2 },
      ],
    },
    {
      groupTitle: 'Akun & Akses Pengguna',
      items: [{ id: 'login', label: 'Login & Ganti Peran', icon: KeyRound }],
    },
  ];

  const allowedSet = new Set(ALLOWED_TABS_BY_ROLE[authSession.role]);
  const navGroups = rawNavGroups
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => allowedSet.has(item.id)),
    }))
    .filter((g) => g.items.length > 0);

  const allTabs = navGroups.flatMap((g) => g.items);
  const currentTabInfo = allTabs.find((t) => t.id === activeTab) || allTabs[0];

  const handleSelectTab = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="no-print fixed inset-0 bg-slate-950/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside
        className={`no-print fixed lg:sticky top-0 left-0 z-50 h-screen w-[264px] shrink-0 bg-emerald-950 text-white flex flex-col border-r border-emerald-900 transition-transform duration-200 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* School Brand Header in Sidebar */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-emerald-900 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer min-w-0"
          >
            <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-white/20">
              <img
                src="/assets/logo-sekolah.png"
                alt={schoolProfile.namaSingkat}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-sm text-amber-300 block truncate tracking-wide">
                SMART ASESMEN
              </span>
              <span className="text-[11px] text-emerald-200 block truncate">
                {schoolProfile.namaSingkat}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-emerald-200 hover:bg-emerald-900 cursor-pointer"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Menu Utama">
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <p className="px-3 text-[11px] font-semibold text-emerald-400 tracking-wide mb-1.5">
                {group.groupTitle}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-400 text-emerald-950 font-bold'
                        : 'text-emerald-100 hover:bg-emerald-900/80 hover:text-white'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isActive ? 'text-emerald-950' : 'text-emerald-300'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    {typeof item.count === 'number' && (
                      <span
                        className={`font-mono text-[11px] tabular-nums shrink-0 ${
                          isActive ? 'text-emerald-950 font-bold' : 'text-emerald-300'
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Active User & School Footer Summary inside Sidebar */}
        <div className="p-3.5 border-t border-emerald-900 text-xs space-y-2 bg-emerald-950 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectTab('login')}
            className="w-full text-left bg-emerald-900/70 hover:bg-emerald-900 border border-emerald-800 rounded-lg px-3 py-2 transition-colors cursor-pointer"
          >
            <span className="text-[10px] font-semibold text-amber-300 block uppercase">
              Login: {authSession.role}
            </span>
            <span className="font-semibold text-white text-xs block truncate">
              {authSession.name}
            </span>
            <span className="text-[11px] text-emerald-300 block mt-0.5">
              Klik untuk ganti akun peran
            </span>
          </button>
          <p className="text-emerald-300 text-[11px] px-1">
            TP {config.tahunPelajaran} · {config.kelas} ({config.fase})
          </p>
        </div>
      </aside>

      {/* RIGHT MAIN WORKSPACE COLUMN */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Contextual Top Header */}
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-bold text-slate-800">SMART ASESMEN</span>
                <span className="hidden sm:inline" aria-hidden="true">
                  /
                </span>
                <span className="font-semibold text-emerald-800 truncate">
                  {currentTabInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate hidden md:block">
                {config.mapel} · {config.kelas} ({config.fase})
                {authSession.role !== 'siswa' && (
                  <>
                    {' '}
                    · Token CBT:{' '}
                    <span className="font-mono font-semibold text-slate-800">
                      {config.tokenCBT}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {authSession.role !== 'siswa' && (
              <>
                <button
                  type="button"
                  onClick={() => setShareStudentModalOpen(true)}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-800 hover:to-teal-800 text-white font-bold px-3 py-2 rounded-lg text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
                  title="Dapatkan link khusus siswa untuk dibagikan ke WhatsApp atau scan QR Code"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Link Siswa</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectTab('generator')}
                  className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-semibold px-3 py-2 rounded-lg text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  title="Buka Pengaturan Multi-AI (Gemini, GPT, Claude)"
                >
                  <KeyRound className="w-3.5 h-3.5 text-purple-700" />
                  <span className="hidden sm:inline">Setting Multi-AI</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-4 py-2 rounded-lg text-xs md:text-sm transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 lg:px-6 py-6">
          {activeTab === 'dashboard' && (
            <TabDashboard
              schoolProfile={schoolProfile}
              config={config}
              students={students}
              teachers={teachers}
              examPackages={examPackages}
              bankQuestions={bankQuestions}
              cbtSubmissions={cbtSubmissions}
              authSession={authSession}
              onNavigate={handleSelectTab}
              kktp={kktp}
            />
          )}

          {activeTab === 'generator' && (
            <TabConfigKisi
              config={config}
              setConfig={setConfig}
              kisiKisiList={kisiKisiList}
              setKisiKisiList={setKisiKisiList}
              rawKisiText={rawKisiText}
              setRawKisiText={setRawKisiText}
              uploadStatus={uploadStatus}
              isGenerating={isGenerating}
              genElapsedSeconds={genElapsedSeconds}
              genError={genError}
              totalRequestedQuestions={totalRequestedQuestions}
              onGenerateAI={handleGenerateAI}
              onCancelGenerateAI={handleCancelGenerateAI}
              onGenerateLocalTemplate={handleGenerateLocalTemplate}
              onLoadTemplateKisi={handleLoadTemplateKisi}
              onFileUpload={handleFileUpload}
              onParseRawText={parseRawTextToKisi}
            />
          )}

          {activeTab === 'naskah' && (
            <TabNaskahSoal
              config={config}
              schoolProfile={schoolProfile}
              questions={questions}
              setQuestions={setQuestions}
              editingIndex={editingIndex}
              onRegenerateSingle={handleRegenerateSingle}
              onSwitchTab={handleSelectTab}
            />
          )}

          {activeTab === 'paket' && (
            <TabPaketBankCBT
              config={config}
              questions={questions}
              students={students}
              bankQuestions={bankQuestions}
              setBankQuestions={setBankQuestions}
              examPackages={examPackages}
              setExamPackages={setExamPackages}
              activePackageId={activePackageId}
              onActivatePackage={handleActivatePackage}
            />
          )}

          {activeTab === 'cbt' && (
            <TabPortalCBT
              authSession={authSession}
              config={config}
              schoolProfile={schoolProfile}
              questions={questions}
              students={students}
              totalScore={questionStats.totalScore}
              cbtSubmissions={cbtSubmissions}
              setCbtSubmissions={setCbtSubmissions}
              examPackages={examPackages}
              activePackageId={activePackageId}
              onActivatePackage={handleActivatePackage}
              onRandomizeToken={handleRandomizeToken}
              onSwitchTab={handleSelectTab}
              onOpenShareLinkModal={() => setShareStudentModalOpen(true)}
            />
          )}

          {activeTab === 'analisis' && (
            <TabPenilaianAnalisis
              config={config}
              schoolProfile={schoolProfile}
              questions={questions}
              students={students}
              cbtSubmissions={cbtSubmissions}
              gradeRecords={gradeRecords}
              setGradeRecords={setGradeRecords}
              kktp={kktp}
              setKktp={setKktp}
            />
          )}

          {activeTab === 'gform' && (
            <TabGoogleForm
              config={config}
              questions={questions}
              students={students}
              examPackages={examPackages}
              activePackageId={activePackageId}
              onActivatePackage={handleActivatePackage}
            />
          )}

          {activeTab === 'kisikisi' && (
            <TabKisiMatriks
              config={config}
              schoolProfile={schoolProfile}
              questions={questions}
              bloomCounts={questionStats.bloomCounts}
              diffCounts={questionStats.diffCounts}
            />
          )}

          {activeTab === 'kunci' && (
            <TabKunciRubrik
              config={config}
              schoolProfile={schoolProfile}
              questions={questions}
              totalScore={questionStats.totalScore}
            />
          )}

          {activeTab === 'siswa' && (
            <TabDataSiswa
              config={config}
              schoolProfile={schoolProfile}
              students={students}
              setStudents={setStudents}
              filterKelasSiswa={filterKelasSiswa}
              setFilterKelasSiswa={setFilterKelasSiswa}
            />
          )}

          {activeTab === 'guru' && (
            <TabDataGuru teachers={teachers} setTeachers={setTeachers} />
          )}

          {activeTab === 'profil' && (
            <TabProfilSekolah
              schoolProfile={schoolProfile}
              setSchoolProfile={setSchoolProfile}
            />
          )}

          {activeTab === 'login' && (
            <TabLoginPortal
              authSession={authSession}
              onLoginSuccess={handleLoginSuccess}
              students={students}
              teachers={teachers}
              schoolProfile={schoolProfile}
              onOpenShareLinkModal={() => setShareStudentModalOpen(true)}
            />
          )}
        </main>

        <footer className="no-print border-t border-slate-200 bg-white py-3.5 px-4 lg:px-6 text-xs text-slate-500">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              {schoolProfile.namaSekolahHeader} · {schoolProfile.lokasiSingkat} · TP{' '}
              {config.tahunPelajaran}
            </span>
            <span>Kepala Sekolah: {schoolProfile.kepsekNama}</span>
          </div>
        </footer>
      </div>

      {/* Modal Bagikan Link Siswa */}
      <ModalShareStudentLink
        isOpen={shareStudentModalOpen}
        onClose={() => setShareStudentModalOpen(false)}
        config={config}
        schoolProfile={schoolProfile}
        examPackages={examPackages}
        activePackageId={activePackageId}
      />
    </div>
  );
}
