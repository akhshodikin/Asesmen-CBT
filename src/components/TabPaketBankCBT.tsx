import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Edit3,
  ExternalLink,
  FileCheck2,
  Layers,
  Monitor,
  Package,
  Plus,
  RefreshCw,
  Shuffle,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import {
  BLOOM_LEVELS,
  EIGHT_DIMENSIONS,
  PRESET_KISI_KISI,
  SUBJECTS,
  buildLocalTemplateQuestions,
} from '../data/schoolData';
import type {
  ActiveTab,
  AssessmentConfig,
  BankQuestionItem,
  ExamPackage,
  ExamPackageStatus,
  QuestionItem,
  Student,
} from '../types';
import {
  generateRandomToken,
  pickBankQuestionsForTest,
  prepareQuestionsForPackage,
} from '../utils/cbtPackageHelpers';
import {
  GoogleDriveLogo,
  GoogleFormsLogo,
  GoogleSheetsLogo,
} from './TabGoogleForm';
import {
  buildGoogleAppsScript,
  downloadTextFile,
} from '../utils/exportHelpers';

interface TabPaketBankCBTProps {
  config: AssessmentConfig;
  questions: QuestionItem[];
  students: Student[];
  bankQuestions: BankQuestionItem[];
  setBankQuestions: React.Dispatch<React.SetStateAction<BankQuestionItem[]>>;
  examPackages: ExamPackage[];
  setExamPackages: React.Dispatch<React.SetStateAction<ExamPackage[]>>;
  activePackageId: string | null;
  onActivatePackage: (pkg: ExamPackage, targetTab?: ActiveTab) => void;
}

const KELAS_LIST = ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'];

function resolveFase(kelas: string): string {
  const kNum = parseInt(kelas.replace(/\D/g, ''), 10) || 5;
  if (kNum <= 2) return 'Fase A';
  if (kNum <= 4) return 'Fase B';
  return 'Fase C';
}

export const TabPaketBankCBT: React.FC<TabPaketBankCBTProps> = ({
  config,
  questions,
  students,
  bankQuestions,
  setBankQuestions,
  examPackages,
  setExamPackages,
  activePackageId,
  onActivatePackage,
}) => {
  const [subView, setSubView] = useState<'daftar' | 'generator' | 'bank'>('daftar');
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Google Form Modal State for Exam Package
  const [gformModalPkg, setGformModalPkg] = useState<ExamPackage | null>(null);
  const [gformIncludeDropdown, setGformIncludeDropdown] = useState(true);
  const [gformShuffle, setGformShuffle] = useState(false);
  const [gformAutoSheet, setGformAutoSheet] = useState(true);
  const [gformOrganizeDrive, setGformOrganizeDrive] = useState(true);
  const [copiedGFormScript, setCopiedGFormScript] = useState(false);

  // Filters: Daftar Paket
  const [pkgSearch, setPkgSearch] = useState('');
  const [pkgMapelFilter, setPkgMapelFilter] = useState('SEMUA');
  const [pkgKelasFilter, setPkgKelasFilter] = useState('SEMUA');
  const [pkgStatusFilter, setPkgStatusFilter] = useState<'SEMUA' | ExamPackageStatus>('SEMUA');

  // Package Editor State
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMapel, setPickerMapel] = useState('SEMUA');

  // Generator Tes State
  const [genMode, setGenMode] = useState<'bank' | 'ai'>('bank');
  const [genNamaPaket, setGenNamaPaket] = useState(
    `Paket Tes ${config.mapel.split('(')[0].trim()} ${config.kelas}`
  );
  const [genKodePaket, setGenKodePaket] = useState(`PKT-${Date.now().toString().slice(-4)}`);
  const [genMapel, setGenMapel] = useState(config.mapel);
  const [genKelas, setGenKelas] = useState(config.kelas);
  const [genJenisAsesmen, setGenJenisAsesmen] = useState(config.jenisAsesmen);
  const [genDurasi, setGenDurasi] = useState(config.durasiMenit || 60);
  const [genKktp, setGenKktp] = useState(75);
  const [genToken, setGenToken] = useState(() => generateRandomToken('CBT'));
  const [genPG, setGenPG] = useState(4);
  const [genPGK, setGenPGK] = useState(1);
  const [genIsian, setGenIsian] = useState(1);
  const [genMencocokkan, setGenMencocokkan] = useState(1);
  const [genUraian, setGenUraian] = useState(1);
  const [genDiffFilter, setGenDiffFilter] = useState('SEIMBANG');
  const [genBloomFilter, setGenBloomFilter] = useState<string[]>([
    'C1',
    'C2',
    'C3',
    'C4',
    'C5',
    'C6',
  ]);
  const [genAcakSoal, setGenAcakSoal] = useState(true);
  const [genAcakOpsi, setGenAcakOpsi] = useState(true);
  const [genVariants, setGenVariants] = useState<1 | 2 | 3>(1);
  const [genAiTopik, setGenAiTopik] = useState('');
  const [genSaveToBank, setGenSaveToBank] = useState(true);
  const [isGeneratingPkg, setIsGeneratingPkg] = useState(false);

  // Google Form generation for selected Exam Package
  const gformModalClassStudentsCount = useMemo(() => {
    if (!gformModalPkg) return 0;
    return students.filter((s) => s.kelas === gformModalPkg.kelas).length;
  }, [students, gformModalPkg]);

  const gformScriptCode = useMemo(() => {
    if (!gformModalPkg) return '';
    const pkgConfig: AssessmentConfig = {
      ...config,
      mapel: gformModalPkg.mapel,
      kelas: gformModalPkg.kelas,
      fase: gformModalPkg.fase,
      jenisAsesmen: gformModalPkg.jenisAsesmen,
      durasiMenit: gformModalPkg.durasiMenit,
      tokenCBT: gformModalPkg.tokenCBT,
      waktu: `${gformModalPkg.durasiMenit} Menit`,
    };
    return buildGoogleAppsScript(
      gformModalPkg.questions,
      students,
      pkgConfig,
      gformIncludeDropdown,
      gformShuffle,
      gformAutoSheet,
      gformOrganizeDrive,
      gformModalPkg.namaPaket
    );
  }, [
    gformModalPkg,
    students,
    config,
    gformIncludeDropdown,
    gformShuffle,
    gformAutoSheet,
    gformOrganizeDrive,
  ]);

  // Bank Soal Filters & Manual Editor State
  const [bankSearch, setBankSearch] = useState('');
  const [bankMapel, setBankMapel] = useState('SEMUA');
  const [bankKelas, setBankKelas] = useState('SEMUA');
  const [bankBentuk, setBankBentuk] = useState('SEMUA');
  const [bankBloom, setBankBloom] = useState('SEMUA');
  const [selectedBankIds, setSelectedBankIds] = useState<string[]>([]);
  const [targetBulkPkgId, setTargetBulkPkgId] = useState<string>(examPackages[0]?.id || '');

  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankForm, setBankForm] = useState({
    mapel: config.mapel,
    kelas: config.kelas,
    bentuk: 'PG',
    stimulus: '',
    pertanyaan: '',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    kunci: 'A',
    pembahasan: '',
    skor: 1,
    materi: '',
    indikator: '',
    bloom: 'C3',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
  });

  const notify = (msg: string) => {
    setErrorMsg('');
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 5000);
  };

  // Filtered Exam Packages
  const filteredPackages = useMemo(() => {
    return examPackages.filter((p) => {
      const q = pkgSearch.toLowerCase();
      const matchSearch =
        !q ||
        p.namaPaket.toLowerCase().includes(q) ||
        p.kodePaket.toLowerCase().includes(q) ||
        p.tokenCBT.toLowerCase().includes(q) ||
        p.mapel.toLowerCase().includes(q);
      const matchMapel = pkgMapelFilter === 'SEMUA' || p.mapel === pkgMapelFilter;
      const matchKelas = pkgKelasFilter === 'SEMUA' || p.kelas === pkgKelasFilter;
      const matchStatus = pkgStatusFilter === 'SEMUA' || p.status === pkgStatusFilter;
      return matchSearch && matchMapel && matchKelas && matchStatus;
    });
  }, [examPackages, pkgSearch, pkgMapelFilter, pkgKelasFilter, pkgStatusFilter]);

  const editingPackage = useMemo(
    () => examPackages.find((p) => p.id === editingPkgId) || null,
    [examPackages, editingPkgId]
  );

  // Availability counts inside Generator Tes (Mode Bank Soal)
  const bankPoolAvailability = useMemo(() => {
    const matching = bankQuestions.filter((q) => {
      const mMapel = genMapel === 'SEMUA' || q.mapel === genMapel;
      const mKelas = genKelas === 'SEMUA' || q.kelas === genKelas;
      const mDiff =
        genDiffFilter === 'SEIMBANG' ||
        q.kesulitan?.toLowerCase() === genDiffFilter.toLowerCase();
      const bCode = (q.bloom || 'C3').toUpperCase().slice(0, 2);
      const mBloom = genBloomFilter.length === 0 || genBloomFilter.includes(bCode);
      return mMapel && mKelas && mDiff && mBloom;
    });
    return {
      total: matching.length,
      PG: matching.filter((q) => q.bentuk === 'PG').length,
      PGK: matching.filter((q) => q.bentuk === 'PGK').length,
      Isian: matching.filter((q) => q.bentuk === 'Isian').length,
      Mencocokkan: matching.filter((q) => q.bentuk === 'Mencocokkan').length,
      Uraian: matching.filter((q) => q.bentuk === 'Uraian').length,
    };
  }, [bankQuestions, genMapel, genKelas, genDiffFilter, genBloomFilter]);

  // Filtered Bank Soal
  const filteredBankQuestions = useMemo(() => {
    return bankQuestions.filter((q) => {
      const s = bankSearch.toLowerCase();
      const mSearch =
        !s ||
        q.pertanyaan.toLowerCase().includes(s) ||
        q.materi.toLowerCase().includes(s) ||
        q.indikator.toLowerCase().includes(s) ||
        q.stimulus.toLowerCase().includes(s);
      const mMapel = bankMapel === 'SEMUA' || q.mapel === bankMapel;
      const mKelas = bankKelas === 'SEMUA' || q.kelas === bankKelas;
      const mBentuk = bankBentuk === 'SEMUA' || q.bentuk === bankBentuk;
      const mBloom =
        bankBloom === 'SEMUA' || (q.bloom || '').toUpperCase().startsWith(bankBloom);
      return mSearch && mMapel && mKelas && mBentuk && mBloom;
    });
  }, [bankQuestions, bankSearch, bankMapel, bankKelas, bankBentuk, bankBloom]);

  // Save current active Naskah Soal as a new ExamPackage
  const handleSaveCurrentAsPackage = () => {
    if (questions.length === 0) {
      setErrorMsg('Belum ada butir soal aktif untuk disimpan menjadi Paket Tes.');
      return;
    }
    const now = new Date().toISOString();
    const newPkg: ExamPackage = {
      id: `pkg-${Date.now()}`,
      kodePaket: `PKT-${config.kelas.replace(/\D/g, '') || '5'}-${String(examPackages.length + 1).padStart(2, '0')}`,
      namaPaket: `${config.jenisAsesmen.split('(')[0].trim()} — ${config.mapel} (${config.kelas})`,
      deskripsi: `Paket tes dibuat dari Naskah Soal aktif (${questions.length} butir soal).`,
      mapel: config.mapel,
      kelas: config.kelas,
      fase: config.fase,
      jenisAsesmen: config.jenisAsesmen,
      durasiMenit: Number(config.durasiMenit) || 60,
      tokenCBT: config.tokenCBT || generateRandomToken('CBT'),
      kktp: 75,
      acakSoal: false,
      acakOpsi: false,
      status: 'Aktif',
      questions: questions.map((q, i) => ({ ...q, nomor: i + 1 })),
      createdAt: now,
      updatedAt: now,
    };
    setExamPackages((prev) => [newPkg, ...prev]);
    setTargetBulkPkgId(newPkg.id);
    notify(`Paket "${newPkg.namaPaket}" (${newPkg.questions.length} soal) berhasil disimpan ke Daftar Paket.`);
  };

  // Clone package as shuffled variant
  const handleDuplicateVariant = (pkg: ExamPackage) => {
    const now = new Date().toISOString();
    const variantSuffix = String.fromCharCode(
      65 + Math.min(25, examPackages.filter((p) => p.mapel === pkg.mapel).length)
    );
    const shuffledQuestions = prepareQuestionsForPackage(pkg.questions, true, true);
    const cloned: ExamPackage = {
      ...pkg,
      id: `pkg-${Date.now()}-${Math.floor(Math.random() * 100)}`,
      kodePaket: `${pkg.kodePaket}-${variantSuffix}`,
      namaPaket: `${pkg.namaPaket} (Varian ${variantSuffix})`,
      tokenCBT: generateRandomToken(pkg.mapel.slice(0, 3)),
      acakSoal: true,
      acakOpsi: true,
      status: 'Aktif',
      questions: shuffledQuestions,
      createdAt: now,
      updatedAt: now,
    };
    setExamPackages((prev) => [cloned, ...prev]);
    notify(
      `Varian paket "${cloned.namaPaket}" (Token: ${cloned.tokenCBT}) dengan urutan soal & opsi acak berhasil dibuat.`
    );
  };

  const handleUpdatePackage = (pkgId: string, updater: (pkg: ExamPackage) => ExamPackage) => {
    setExamPackages((prev) =>
      prev.map((p) =>
        p.id === pkgId ? { ...updater(p), updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const handleDeletePackage = (pkg: ExamPackage) => {
    setExamPackages((prev) => prev.filter((p) => p.id !== pkg.id));
    if (editingPkgId === pkg.id) setEditingPkgId(null);
    notify(`Paket "${pkg.namaPaket}" telah dihapus.`);
  };

  const handleAddBankQuestionToPackage = (pkgId: string, bq: BankQuestionItem) => {
    handleUpdatePackage(pkgId, (pkg) => {
      const nextNum = pkg.questions.length + 1;
      const item: QuestionItem = {
        nomor: nextNum,
        bentuk: bq.bentuk,
        stimulus: bq.stimulus,
        pertanyaan: bq.pertanyaan,
        opsi: [...(bq.opsi || [])],
        kunci: bq.kunci,
        pembahasan: bq.pembahasan,
        skor: Number(bq.skor) || 1,
        materi: bq.materi,
        indikator: bq.indikator,
        bloom: bq.bloom,
        kesulitan: bq.kesulitan,
        dimensi: bq.dimensi,
      };
      return { ...pkg, questions: [...pkg.questions, item] };
    });
    notify('Butir soal dari Bank Soal berhasil ditambahkan ke paket.');
  };

  const handleRemoveQuestionFromPackage = (pkgId: string, indexToRemove: number) => {
    handleUpdatePackage(pkgId, (pkg) => {
      const nextQuestions = pkg.questions
        .filter((_, idx) => idx !== indexToRemove)
        .map((q, idx) => ({ ...q, nomor: idx + 1 }));
      return { ...pkg, questions: nextQuestions };
    });
  };

  // Generator Tes Handler
  const handleGenerateTestPackages = async () => {
    setErrorMsg('');
    const totalReq =
      Number(genPG) +
      Number(genPGK) +
      Number(genIsian) +
      Number(genMencocokkan) +
      Number(genUraian);
    if (totalReq <= 0) {
      setErrorMsg('Jumlah soal minimal 1 butir.');
      return;
    }

    const now = new Date().toISOString();
    const resolvedKelas = genKelas === 'SEMUA' ? config.kelas : genKelas;
    const resolvedMapel = genMapel === 'SEMUA' ? config.mapel : genMapel;
    const resolvedFase = resolveFase(resolvedKelas);

    if (genMode === 'bank') {
      const created: ExamPackage[] = [];
      let lastShortfalls: string[] = [];

      for (let v = 0; v < genVariants; v++) {
        const variantLetter = genVariants > 1 ? ` (Paket ${String.fromCharCode(65 + v)})` : '';
        const { selected, shortfalls } = pickBankQuestionsForTest({
          bankQuestions,
          mapel: genMapel,
          kelas: genKelas,
          kesulitanFilter: genDiffFilter,
          bloomFilter: genBloomFilter,
          jmlPG: Number(genPG),
          jmlPGK: Number(genPGK),
          jmlIsian: Number(genIsian),
          jmlMencocokkan: Number(genMencocokkan),
          jmlUraian: Number(genUraian),
          acakSoal: genAcakSoal || v > 0,
          acakOpsi: genAcakOpsi || v > 0,
        });

        if (selected.length === 0) {
          setErrorMsg(
            'Tidak ada soal di Bank Soal yang cocok dengan filter Mapel/Kelas/Kesulitan/Bloom yang dipilih. Tambahkan soal di Bank Soal atau gunakan mode Generate AI / Template.'
          );
          return;
        }
        lastShortfalls = shortfalls;

        const tokenForVariant =
          v === 0 && genToken.trim()
            ? genToken.trim().toUpperCase()
            : generateRandomToken(resolvedMapel.slice(0, 3));

        created.push({
          id: `pkg-${Date.now()}-${v}`,
          kodePaket: `${genKodePaket || 'PKT'}${genVariants > 1 ? `-${String.fromCharCode(65 + v)}` : ''}`,
          namaPaket: `${genNamaPaket || `Paket Tes ${resolvedMapel}`}${variantLetter}`,
          deskripsi: `Dirakit otomatis dari Bank Soal (${selected.length} soal · ${
            genAcakSoal ? 'Soal Acak' : 'Urutan Tetap'
          }).`,
          mapel: resolvedMapel,
          kelas: resolvedKelas,
          fase: resolvedFase,
          jenisAsesmen: genJenisAsesmen,
          durasiMenit: Number(genDurasi) || 60,
          tokenCBT: tokenForVariant,
          kktp: Number(genKktp) || 75,
          acakSoal: genAcakSoal,
          acakOpsi: genAcakOpsi,
          status: 'Aktif',
          questions: selected,
          createdAt: now,
          updatedAt: now,
        });
      }

      setExamPackages((prev) => [...created, ...prev]);
      setTargetBulkPkgId(created[0].id);
      setSubView('daftar');
      const shortfallNote =
        lastShortfalls.length > 0 ? ` Catatan stok Bank Soal: ${lastShortfalls.join('; ')}.` : '';
      notify(
        `${created.length} Paket Tes CBT (${created[0].questions.length} soal) berhasil dirakit otomatis.${shortfallNote}`
      );
      return;
    }

    // Mode B: Generate new questions via AI Gemini or Local Template fallback
    setIsGeneratingPkg(true);
    try {
      const presetKisi = PRESET_KISI_KISI[resolvedMapel] || PRESET_KISI_KISI.DEFAULT;
      const customKisi = genAiTopik.trim()
        ? [
            {
              cp: `Capaian Pembelajaran ${resolvedMapel} ${resolvedKelas}`,
              materi: genAiTopik.trim(),
              indikator: `Peserta didik dapat menguasai dan menganalisis konsep ${genAiTopik.trim()}`,
              dimensi: 'Penalaran Kritis',
              bloom: 'C3',
              kesulitan: 'Sedang',
              bentuk: 'PG',
            },
          ]
        : presetKisi;

      const genConfig: AssessmentConfig = {
        ...config,
        mapel: resolvedMapel,
        kelas: resolvedKelas,
        fase: resolvedFase,
        jenisAsesmen: genJenisAsesmen,
        durasiMenit: Number(genDurasi) || 60,
        tokenCBT: genToken.trim().toUpperCase() || generateRandomToken('CBT'),
        jmlPG: Number(genPG),
        jmlPGK: Number(genPGK),
        jmlIsian: Number(genIsian),
        jmlMencocokkan: Number(genMencocokkan),
        jmlUraian: Number(genUraian),
      };

      let generatedList: QuestionItem[] = [];
      let sourceLabel: 'AI Gemini' | 'Template Lokal' = 'AI Gemini';

      try {
        const response = await fetch('/api/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: genConfig,
            kisiKisiList: customKisi,
            rawKisiText: genAiTopik.trim(),
            totalRequestedQuestions: totalReq,
          }),
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data?.questions) && data.questions.length > 0) {
          generatedList = data.questions;
        } else {
          throw new Error(data?.error || 'AI tidak tersedia');
        }
      } catch {
        // Fallback smoothly to Local Template generator so teacher always gets a working test package
        generatedList = buildLocalTemplateQuestions(genConfig, customKisi);
        sourceLabel = 'Template Lokal';
      }

      const finalQuestions = prepareQuestionsForPackage(generatedList, genAcakSoal, genAcakOpsi);
      const newPkg: ExamPackage = {
        id: `pkg-${Date.now()}`,
        kodePaket: genKodePaket || `PKT-${Date.now().toString().slice(-4)}`,
        namaPaket: genNamaPaket || `Paket ${resolvedMapel} (${resolvedKelas})`,
        deskripsi: `Dihasilkan lewat Generator Tes (${sourceLabel}) — ${finalQuestions.length} butir soal.`,
        mapel: resolvedMapel,
        kelas: resolvedKelas,
        fase: resolvedFase,
        jenisAsesmen: genJenisAsesmen,
        durasiMenit: Number(genDurasi) || 60,
        tokenCBT: genConfig.tokenCBT,
        kktp: Number(genKktp) || 75,
        acakSoal: genAcakSoal,
        acakOpsi: genAcakOpsi,
        status: 'Aktif',
        questions: finalQuestions,
        createdAt: now,
        updatedAt: now,
      };

      setExamPackages((prev) => [newPkg, ...prev]);
      setTargetBulkPkgId(newPkg.id);

      if (genSaveToBank) {
        const addedBankItems: BankQuestionItem[] = finalQuestions.map((q, idx) => ({
          ...q,
          id: `bank-${Date.now()}-${idx}`,
          mapel: resolvedMapel,
          kelas: resolvedKelas,
          sumber: sourceLabel,
          createdAt: now,
        }));
        setBankQuestions((prev) => [...addedBankItems, ...prev]);
      }

      setSubView('daftar');
      notify(
        `Paket "${newPkg.namaPaket}" (${finalQuestions.length} soal via ${sourceLabel}) berhasil dibuat${
          genSaveToBank ? ' dan disimpan ke Bank Soal' : ''
        }.`
      );
    } finally {
      setIsGeneratingPkg(false);
    }
  };

  // Bank Soal Manual CRUD
  const openCreateBankForm = () => {
    setEditingBankId(null);
    setBankForm({
      mapel: bankMapel === 'SEMUA' ? config.mapel : bankMapel,
      kelas: bankKelas === 'SEMUA' ? config.kelas : bankKelas,
      bentuk: 'PG',
      stimulus: '',
      pertanyaan: '',
      opsiA: '',
      opsiB: '',
      opsiC: '',
      opsiD: '',
      kunci: 'A',
      pembahasan: '',
      skor: 1,
      materi: '',
      indikator: '',
      bloom: 'C3',
      kesulitan: 'Sedang',
      dimensi: 'Penalaran Kritis',
    });
    setShowBankForm(true);
  };

  const openEditBankForm = (bq: BankQuestionItem) => {
    setEditingBankId(bq.id);
    const cleanOpt = (idx: number) =>
      (bq.opsi?.[idx] || '')
        .replace(/^[A-Da-d][.)]\s*/, '')
        .replace(/^\[\s*\]\s*/, '')
        .replace(/^\d+[.)]\s*/, '');
    setBankForm({
      mapel: bq.mapel,
      kelas: bq.kelas,
      bentuk: String(bq.bentuk),
      stimulus: bq.stimulus || '',
      pertanyaan: bq.pertanyaan || '',
      opsiA: cleanOpt(0),
      opsiB: cleanOpt(1),
      opsiC: cleanOpt(2),
      opsiD: cleanOpt(3),
      kunci: bq.kunci || 'A',
      pembahasan: bq.pembahasan || '',
      skor: Number(bq.skor) || 1,
      materi: bq.materi || '',
      indikator: bq.indikator || '',
      bloom: bq.bloom || 'C3',
      kesulitan: bq.kesulitan || 'Sedang',
      dimensi: bq.dimensi || 'Penalaran Kritis',
    });
    setShowBankForm(true);
  };

  const handleSaveBankQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.pertanyaan.trim()) {
      setErrorMsg('Teks pertanyaan wajib diisi.');
      return;
    }

    let opsi: string[] = [];
    if (bankForm.bentuk === 'PG') {
      opsi = [
        `A. ${bankForm.opsiA || 'Pilihan A'}`,
        `B. ${bankForm.opsiB || 'Pilihan B'}`,
        `C. ${bankForm.opsiC || 'Pilihan C'}`,
        ...(parseInt(bankForm.kelas.replace(/\D/g, ''), 10) > 2 || bankForm.opsiD.trim()
          ? [`D. ${bankForm.opsiD || 'Pilihan D'}`]
          : []),
      ];
    } else if (bankForm.bentuk === 'PGK') {
      opsi = [
        `[ ] ${bankForm.opsiA || 'Pernyataan 1'}`,
        `[ ] ${bankForm.opsiB || 'Pernyataan 2'}`,
        `[ ] ${bankForm.opsiC || 'Pernyataan 3'}`,
        `[ ] ${bankForm.opsiD || 'Pernyataan 4'}`,
      ];
    } else if (bankForm.bentuk === 'Mencocokkan') {
      opsi = [bankForm.opsiA, bankForm.opsiB, bankForm.opsiC, bankForm.opsiD]
        .filter((x) => x.trim().length > 0)
        .map((pair, idx) => (pair.includes('=>') ? `${idx + 1}. ${pair}` : `${idx + 1}. ${pair} => Pasangan ${idx + 1}`));
    }

    const now = new Date().toISOString();

    if (editingBankId) {
      setBankQuestions((prev) =>
        prev.map((item) =>
          item.id === editingBankId
            ? {
                ...item,
                mapel: bankForm.mapel,
                kelas: bankForm.kelas,
                bentuk: bankForm.bentuk,
                stimulus: bankForm.stimulus.trim(),
                pertanyaan: bankForm.pertanyaan.trim(),
                opsi,
                kunci: bankForm.kunci.trim(),
                pembahasan: bankForm.pembahasan.trim(),
                skor: Number(bankForm.skor) || 1,
                materi: bankForm.materi.trim() || 'Materi Umum',
                indikator: bankForm.indikator.trim() || bankForm.pertanyaan.trim().slice(0, 60),
                bloom: bankForm.bloom,
                kesulitan: bankForm.kesulitan,
                dimensi: bankForm.dimensi,
              }
            : item
        )
      );
      notify('Butir soal di Bank Soal berhasil diperbarui.');
    } else {
      const newItem: BankQuestionItem = {
        id: `bank-${Date.now()}`,
        nomor: bankQuestions.length + 1,
        mapel: bankForm.mapel,
        kelas: bankForm.kelas,
        bentuk: bankForm.bentuk,
        stimulus: bankForm.stimulus.trim(),
        pertanyaan: bankForm.pertanyaan.trim(),
        opsi,
        kunci: bankForm.kunci.trim(),
        pembahasan: bankForm.pembahasan.trim(),
        skor: Number(bankForm.skor) || 1,
        materi: bankForm.materi.trim() || 'Materi Umum',
        indikator: bankForm.indikator.trim() || bankForm.pertanyaan.trim().slice(0, 60),
        bloom: bankForm.bloom,
        kesulitan: bankForm.kesulitan,
        dimensi: bankForm.dimensi,
        sumber: 'Manual Guru',
        createdAt: now,
      };
      setBankQuestions((prev) => [newItem, ...prev]);
      notify('Butir soal baru berhasil ditambahkan ke Bank Soal CBT.');
    }

    setShowBankForm(false);
    setEditingBankId(null);
  };

  const handleImportActiveQuestionsToBank = () => {
    if (questions.length === 0) {
      setErrorMsg('Belum ada soal di Naskah Aktif.');
      return;
    }
    const existingSet = new Set(
      bankQuestions.map((b) => `${b.mapel}__${b.kelas}__${b.pertanyaan.trim().toLowerCase()}`)
    );
    const now = new Date().toISOString();
    const toAdd: BankQuestionItem[] = [];

    questions.forEach((q, idx) => {
      const sig = `${config.mapel}__${config.kelas}__${q.pertanyaan.trim().toLowerCase()}`;
      if (!existingSet.has(sig)) {
        existingSet.add(sig);
        toAdd.push({
          ...q,
          id: `bank-imp-${Date.now()}-${idx}`,
          mapel: config.mapel,
          kelas: config.kelas,
          sumber: 'Template Lokal',
          createdAt: now,
        });
      }
    });

    if (toAdd.length === 0) {
      notify('Seluruh soal pada Naskah Aktif sudah tersimpan di Bank Soal.');
      return;
    }
    setBankQuestions((prev) => [...toAdd, ...prev]);
    notify(`${toAdd.length} butir soal dari Naskah Aktif berhasil diimpor ke Bank Soal.`);
  };

  const handleBulkAddToPackage = () => {
    if (selectedBankIds.length === 0) return;
    const targetPkg = examPackages.find((p) => p.id === targetBulkPkgId);
    if (!targetPkg) {
      setErrorMsg('Pilih Paket Tes tujuan terlebih dahulu.');
      return;
    }
    const picked = bankQuestions.filter((b) => selectedBankIds.includes(b.id));
    handleUpdatePackage(targetPkg.id, (pkg) => {
      const baseNum = pkg.questions.length;
      const appended: QuestionItem[] = picked.map((b, i) => ({
        nomor: baseNum + i + 1,
        bentuk: b.bentuk,
        stimulus: b.stimulus,
        pertanyaan: b.pertanyaan,
        opsi: [...(b.opsi || [])],
        kunci: b.kunci,
        pembahasan: b.pembahasan,
        skor: Number(b.skor) || 1,
        materi: b.materi,
        indikator: b.indikator,
        bloom: b.bloom,
        kesulitan: b.kesulitan,
        dimensi: b.dimensi,
      }));
      return { ...pkg, questions: [...pkg.questions, ...appended] };
    });
    notify(`${picked.length} soal ditambahkan ke paket "${targetPkg.namaPaket}".`);
    setSelectedBankIds([]);
  };

  return (
    <div className="space-y-6 no-print">
      {/* Header & Sub-Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <span>Manajemen Tes CBT</span>
              <span aria-hidden="true">·</span>
              <span>Paket Tes, Generator &amp; Bank Soal</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Paket Tes Soal, Daftar Paket, Generator Tes &amp; Bank Soal CBT
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Kelola koleksi bank soal, rakit paket ujian otomatis atau varian acak, dan aktifkan
              langsung ke Portal Ujian CBT.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSaveCurrentAsPackage}
              className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Package className="w-3.5 h-3.5 text-emerald-700" />
              <span>Simpan Naskah Aktif Jadi Paket</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('generator')}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Buka Generator Tes</span>
            </button>
          </div>
        </div>

        {/* Sub-view Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              {
                id: 'daftar' as const,
                label: `1. Daftar Paket Tes (${examPackages.length})`,
                icon: Layers,
              },
              {
                id: 'generator' as const,
                label: '2. Generator Tes CBT',
                icon: Wand2,
              },
              {
                id: 'bank' as const,
                label: `3. Bank Soal (${bankQuestions.length})`,
                icon: Database,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSubView(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    subView === tab.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="text-xs text-slate-600 flex items-center gap-3">
            <span>
              Paket Aktif:{' '}
              <strong className="text-emerald-800">
                {examPackages.find((p) => p.id === activePackageId)?.kodePaket || 'Naskah Custom'}
              </strong>
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              Token CBT: <strong className="text-slate-900">{config.tokenCBT}</strong>
            </span>
          </div>
        </div>

        {feedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 rounded-lg px-4 py-2.5 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* ============================================================
          SUB-VIEW 1: DAFTAR PAKET TES SOAL
          ============================================================ */}
      {subView === 'daftar' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Cari Paket / Token</label>
              <input
                type="text"
                value={pkgSearch}
                onChange={(e) => setPkgSearch(e.target.value)}
                placeholder="Nama paket, kode, atau token..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Mata Pelajaran</label>
              <select
                value={pkgMapelFilter}
                onChange={(e) => setPkgMapelFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Mata Pelajaran</option>
                {SUBJECTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Kelas</label>
              <select
                value={pkgKelasFilter}
                onChange={(e) => setPkgKelasFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Kelas</option>
                {KELAS_LIST.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-slate-600 block mb-1">Status Paket</label>
              <select
                value={pkgStatusFilter}
                onChange={(e) =>
                  setPkgStatusFilter(e.target.value as 'SEMUA' | ExamPackageStatus)
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Status</option>
                <option value="Aktif">Aktif (Siap CBT)</option>
                <option value="Draf">Draf</option>
                <option value="Arsip">Arsip</option>
              </select>
            </div>
          </div>

          {/* Inline Editor for Selected Package */}
          {editingPackage && (
            <div className="bg-white rounded-xl border border-emerald-300 p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-mono font-bold text-emerald-800">
                    Editor Paket · {editingPackage.kodePaket}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    Kelola Detail &amp; Daftar Soal — {editingPackage.namaPaket}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingPkgId(null)}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  Tutup Editor
                </button>
              </div>

              {/* Metadata fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div className="md:col-span-2">
                  <label className="font-semibold text-slate-600 block mb-1">Nama Paket Tes</label>
                  <input
                    type="text"
                    value={editingPackage.namaPaket}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        namaPaket: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Kode Paket</label>
                  <input
                    type="text"
                    value={editingPackage.kodePaket}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        kodePaket: e.target.value,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Token CBT</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={editingPackage.tokenCBT}
                      onChange={(e) =>
                        handleUpdatePackage(editingPackage.id, (p) => ({
                          ...p,
                          tokenCBT: e.target.value.toUpperCase(),
                        }))
                      }
                      className="w-full min-w-0 border border-slate-300 rounded-lg px-2.5 py-2 font-mono font-bold text-emerald-800"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdatePackage(editingPackage.id, (p) => ({
                          ...p,
                          tokenCBT: generateRandomToken(p.mapel.slice(0, 3)),
                        }))
                      }
                      className="px-2 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer shrink-0"
                      title="Acak Token"
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={editingPackage.durasiMenit}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        durasiMenit: Number(e.target.value) || 60,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Status</label>
                  <select
                    value={editingPackage.status}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        status: e.target.value as ExamPackageStatus,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                  >
                    <option value="Aktif">Aktif</option>
                    <option value="Draf">Draf</option>
                    <option value="Arsip">Arsip</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs pt-1">
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPackage.acakSoal}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        acakSoal: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Acak Urutan Soal saat CBT Dimulai</span>
                </label>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingPackage.acakOpsi}
                    onChange={(e) =>
                      handleUpdatePackage(editingPackage.id, (p) => ({
                        ...p,
                        acakOpsi: e.target.checked,
                      }))
                    }
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Acak Opsi Pilihan Ganda saat CBT Dimulai</span>
                </label>
              </div>

              {/* Split: Questions inside package vs Pick from Bank Soal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-xs">
                      Soal di Dalam Paket ({editingPackage.questions.length} Butir)
                    </h4>
                    <span className="text-[11px] font-mono text-slate-500">
                      Total Skor:{' '}
                      {editingPackage.questions.reduce((acc, q) => acc + (Number(q.skor) || 1), 0)}
                    </span>
                  </div>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {editingPackage.questions.length === 0 ? (
                      <p className="text-xs text-slate-500 py-6 text-center">
                        Paket masih kosong. Tambahkan soal dari Bank Soal di sebelah kanan.
                      </p>
                    ) : (
                      editingPackage.questions.map((q, idx) => (
                        <div
                          key={`${q.nomor}-${idx}`}
                          className="border border-slate-200 rounded-lg p-3 text-xs flex items-start justify-between gap-2 bg-slate-50/60"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600">
                              <span className="font-bold text-emerald-800">No. {q.nomor}</span>
                              <span aria-hidden="true">·</span>
                              <span>{q.bentuk}</span>
                              <span aria-hidden="true">·</span>
                              <span>{q.bloom}</span>
                              <span aria-hidden="true">·</span>
                              <span>Skor {q.skor}</span>
                            </div>
                            <p className="font-medium text-slate-900 line-clamp-2">
                              {q.pertanyaan}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionFromPackage(editingPackage.id, idx)}
                            className="p-1.5 text-rose-700 hover:bg-rose-50 rounded shrink-0 cursor-pointer"
                            title="Keluarkan dari paket"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Add from Bank Soal */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-bold text-slate-900 text-xs">
                      Tambah Soal dari Bank Soal CBT
                    </h4>
                    <select
                      value={pickerMapel}
                      onChange={(e) => setPickerMapel(e.target.value)}
                      className="border border-slate-300 rounded px-2 py-1 text-[11px] bg-white"
                    >
                      <option value="SEMUA">Semua Mapel</option>
                      {SUBJECTS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <input
                    type="text"
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                    placeholder="Cari pertanyaan atau materi di Bank Soal..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                  />
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {bankQuestions
                      .filter((b) => {
                        const mMapel = pickerMapel === 'SEMUA' || b.mapel === pickerMapel;
                        const s = pickerSearch.toLowerCase();
                        const mSearch =
                          !s ||
                          b.pertanyaan.toLowerCase().includes(s) ||
                          b.materi.toLowerCase().includes(s);
                        return mMapel && mSearch;
                      })
                      .map((bq) => (
                        <div
                          key={bq.id}
                          className="border border-slate-200 rounded-lg p-2.5 text-xs flex items-start justify-between gap-2 hover:bg-slate-50"
                        >
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-500 font-mono truncate">
                              {bq.mapel} · {bq.kelas} · {bq.bentuk} · {bq.bloom}
                            </p>
                            <p className="font-medium text-slate-900 line-clamp-2 mt-0.5">
                              {bq.pertanyaan}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddBankQuestionToPackage(editingPackage.id, bq)}
                            className="flex items-center gap-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah</span>
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daftar Paket Cards */}
          {filteredPackages.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <p className="font-bold text-slate-800 text-sm">
                Belum Ada Paket Tes yang Cocok dengan Filter
              </p>
              <p className="text-xs text-slate-500">
                Gunakan <strong>Generator Tes CBT</strong> untuk merakit paket soal otomatis dari
                Bank Soal, atau simpan Naskah Soal aktif sebagai paket baru.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPackages.map((pkg) => {
                const isActive = activePackageId === pkg.id;
                const totalPoin = pkg.questions.reduce(
                  (acc, q) => acc + (Number(q.skor) || 1),
                  0
                );
                const pgC = pkg.questions.filter((q) => q.bentuk === 'PG').length;
                const pgkC = pkg.questions.filter((q) => q.bentuk === 'PGK').length;
                const isianC = pkg.questions.filter((q) => q.bentuk === 'Isian').length;
                const cocokC = pkg.questions.filter((q) => q.bentuk === 'Mencocokkan').length;
                const uraianC = pkg.questions.filter((q) => q.bentuk === 'Uraian').length;

                return (
                  <div
                    key={pkg.id}
                    className={`bg-white rounded-xl border p-5 flex flex-col justify-between gap-4 ${
                      isActive ? 'border-emerald-600 ring-1 ring-emerald-600' : 'border-slate-200'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-700">
                              {pkg.kodePaket}
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 font-semibold ${
                                pkg.status === 'Aktif'
                                  ? 'text-emerald-800'
                                  : pkg.status === 'Draf'
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                              }`}
                            >
                              {pkg.status === 'Aktif' ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : pkg.status === 'Draf' ? (
                                <Edit3 className="w-3.5 h-3.5" />
                              ) : (
                                <Archive className="w-3.5 h-3.5" />
                              )}
                              <span>{pkg.status}</span>
                            </span>
                            {isActive && (
                              <>
                                <span aria-hidden="true" className="text-slate-300">
                                  ·
                                </span>
                                <span className="font-bold text-emerald-700">
                                  Sedang Aktif di CBT
                                </span>
                              </>
                            )}
                          </div>
                          <h3 className="font-bold text-slate-900 text-base leading-snug">
                            {pkg.namaPaket}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-2">{pkg.deskripsi}</p>
                        </div>

                        <div className="text-right shrink-0 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 space-y-1">
                          <span className="text-[11px] text-slate-500 block">Token CBT</span>
                          <div className="flex items-center justify-end gap-1.5">
                            <span className="font-mono font-bold text-sm text-emerald-900">
                              {pkg.tokenCBT}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const newTok = generateRandomToken(pkg.mapel.slice(0, 3));
                                handleUpdatePackage(pkg.id, (p) => ({ ...p, tokenCBT: newTok }));
                                notify(`Token paket ${pkg.kodePaket} diacak menjadi ${newTok}.`);
                              }}
                              className="p-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 cursor-pointer"
                              title="Acak Token Paket"
                            >
                              <Shuffle className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Metadata grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Mapel &amp; Kelas</span>
                          <span className="font-semibold text-slate-900 block truncate">
                            {pkg.mapel.split('(')[0].trim()}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            {pkg.kelas} ({pkg.fase})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Komposisi Soal</span>
                          <span className="font-mono font-bold text-slate-900 block tabular-nums">
                            {pkg.questions.length} Butir
                          </span>
                          <span className="text-slate-600 text-[11px] font-mono">
                            {pgC} PG · {isianC} Is · {cocokC} Coc · {uraianC} Es · {pgkC} PGK
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Waktu &amp; Skor</span>
                          <span className="font-mono font-bold text-slate-900 block tabular-nums">
                            {pkg.durasiMenit} Menit
                          </span>
                          <span className="text-slate-600 text-[11px] font-mono">
                            Maks {totalPoin} Poin · KKTP {pkg.kktp}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[11px]">Pengacakan CBT</span>
                          <span className="font-semibold text-slate-800 block">
                            {pkg.acakSoal ? 'Soal Diacak' : 'Soal Urut'}
                          </span>
                          <span className="text-slate-600 text-[11px]">
                            {pkg.acakOpsi ? 'Opsi Diacak' : 'Opsi Tetap'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onActivatePackage(pkg, 'cbt')}
                          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Monitor className="w-3.5 h-3.5" />
                          <span>Aktifkan &amp; Buka CBT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onActivatePackage(pkg, 'naskah')}
                          className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Muat ke Naskah</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGformModalPkg(pkg)}
                          className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer shadow-xs"
                          title="Buat Google Form Kuis & Rekap Sheets otomatis dari paket tes ini"
                        >
                          <GoogleFormsLogo className="w-3.5 h-3.5" />
                          <span>Jadikan G-Form</span>
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            setEditingPkgId(editingPkgId === pkg.id ? null : pkg.id)
                          }
                          className="flex items-center gap-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicateVariant(pkg)}
                          className="flex items-center gap-1 bg-white hover:bg-slate-50 text-sky-800 border border-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer whitespace-nowrap"
                          title="Buat varian paket dengan soal dan opsi teracak"
                        >
                          <Shuffle className="w-3.5 h-3.5" />
                          <span>Varian</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePackage(pkg)}
                          className="p-1.5 text-rose-700 hover:bg-rose-50 border border-slate-200 rounded-lg cursor-pointer"
                          title="Hapus paket tes"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          SUB-VIEW 2: GENERATOR TES CBT
          ============================================================ */}
      {subView === 'generator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Generator Paket Tes CBT Otomatis
                </h3>
                <p className="text-xs text-slate-500">
                  Pilih sumber perakitan soal: merakit langsung dari Bank Soal atau menyusun soal
                  baru via AI / Template Lokal.
                </p>
              </div>
              <div className="flex gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setGenMode('bank')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    genMode === 'bank' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Dari Bank Soal
                </button>
                <button
                  type="button"
                  onClick={() => setGenMode('ai')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap cursor-pointer ${
                    genMode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Generate Baru (AI/Lokal)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">Nama Paket Tes CBT</label>
                <input
                  type="text"
                  value={genNamaPaket}
                  onChange={(e) => setGenNamaPaket(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kode Paket</label>
                <input
                  type="text"
                  value={genKodePaket}
                  onChange={(e) => setGenKodePaket(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Token Akses CBT</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={genToken}
                    onChange={(e) => setGenToken(e.target.value.toUpperCase())}
                    className="flex-1 border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold text-emerald-800"
                  />
                  <button
                    type="button"
                    onClick={() => setGenToken(generateRandomToken(genMapel.slice(0, 3)))}
                    className="px-3 py-2 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer whitespace-nowrap"
                  >
                    Acak Token
                  </button>
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran</label>
                <select
                  value={genMapel}
                  onChange={(e) => setGenMapel(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {genMode === 'bank' && <option value="SEMUA">Semua Mapel di Bank Soal</option>}
                  {SUBJECTS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Kelas Sasaran</label>
                <select
                  value={genKelas}
                  onChange={(e) => setGenKelas(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                >
                  {genMode === 'bank' && <option value="SEMUA">Semua Kelas</option>}
                  {KELAS_LIST.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Jenis Asesmen</label>
                <input
                  type="text"
                  value={genJenisAsesmen}
                  onChange={(e) => setGenJenisAsesmen(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={genDurasi}
                    onChange={(e) => setGenDurasi(Number(e.target.value) || 60)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">KKTP</label>
                  <input
                    type="number"
                    min={50}
                    max={95}
                    value={genKktp}
                    onChange={(e) => setGenKktp(Number(e.target.value) || 75)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Komposisi Soal */}
            <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
              <p className="font-bold text-slate-900">Komposisi Bentuk Soal</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">
                    Pilihan Ganda
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={genPG}
                    onChange={(e) => setGenPG(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Isian Singkat</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={genIsian}
                    onChange={(e) => setGenIsian(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Esai / Uraian</label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={genUraian}
                    onChange={(e) => setGenUraian(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">Mencocokkan</label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={genMencocokkan}
                    onChange={(e) => setGenMencocokkan(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-600 block mb-1">PG Kompleks</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={genPGK}
                    onChange={(e) => setGenPGK(Math.max(0, Number(e.target.value)))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {genMode === 'bank' ? (
              <div className="border-t border-slate-100 pt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Filter Tingkat Kesulitan
                    </label>
                    <select
                      value={genDiffFilter}
                      onChange={(e) => setGenDiffFilter(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                    >
                      <option value="SEIMBANG">Semua Tingkat (Campuran)</option>
                      <option value="Mudah">Khusus Soal Mudah</option>
                      <option value="Sedang">Khusus Soal Sedang</option>
                      <option value="Sulit">Khusus Soal Sulit (HOTS)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      Jumlah Varian Paket Sekaligus
                    </label>
                    <select
                      value={genVariants}
                      onChange={(e) => setGenVariants(Number(e.target.value) as 1 | 2 | 3)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                    >
                      <option value={1}>1 Paket Tunggal</option>
                      <option value={2}>2 Varian Acak (Paket A &amp; B)</option>
                      <option value={3}>3 Varian Acak (Paket A, B &amp; C)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1.5">
                    Filter Level Taksonomi Bloom
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {BLOOM_LEVELS.map((b) => {
                      const active = genBloomFilter.includes(b.code);
                      return (
                        <button
                          key={b.code}
                          type="button"
                          onClick={() =>
                            setGenBloomFilter((prev) =>
                              active ? prev.filter((x) => x !== b.code) : [...prev, b.code]
                            )
                          }
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                            active
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-white text-slate-700 border-slate-300'
                          }`}
                        >
                          {b.code} · {b.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-4 space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Topik / Materi Khusus (Opsional — Kosongkan untuk Memakai Kisi-Kisi Bawaan)
                  </label>
                  <input
                    type="text"
                    value={genAiTopik}
                    onChange={(e) => setGenAiTopik(e.target.value)}
                    placeholder="Contoh: Siklus Air, Pecahan Senilai, atau Toleransi di Masyarakat..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSaveToBank}
                    onChange={(e) => setGenSaveToBank(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-700"
                  />
                  <span>Simpan otomatis seluruh butir soal yang dihasilkan ke Bank Soal CBT</span>
                </label>
              </div>
            )}

            {/* Shuffling Toggles */}
            <div className="flex flex-wrap items-center gap-6 text-xs pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genAcakSoal}
                  onChange={(e) => setGenAcakSoal(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                <span>Acak Urutan Soal</span>
              </label>
              <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={genAcakOpsi}
                  onChange={(e) => setGenAcakOpsi(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-700"
                />
                <span>Acak Opsi Pilihan Ganda</span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="button"
                disabled={isGeneratingPkg}
                onClick={handleGenerateTestPackages}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                {isGeneratingPkg ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyusun Paket Tes CBT...</span>
                  </>
                ) : genMode === 'bank' ? (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Paket Tes dari Bank Soal</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Paket Soal Baru &amp; Simpan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Summary Card: Stok Bank Soal */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Ketersediaan Stok Bank Soal Sesuai Filter
            </h4>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Total Soal Cocok</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {bankPoolAvailability.total} Butir
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Pilihan Ganda (PG)</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    bankPoolAvailability.PG < genPG ? 'text-amber-700' : 'text-emerald-800'
                  }`}
                >
                  {bankPoolAvailability.PG} tersedia (diminta {genPG})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">PG Kompleks (PGK)</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    bankPoolAvailability.PGK < genPGK ? 'text-amber-700' : 'text-emerald-800'
                  }`}
                >
                  {bankPoolAvailability.PGK} tersedia (diminta {genPGK})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Isian Singkat</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    bankPoolAvailability.Isian < genIsian ? 'text-amber-700' : 'text-emerald-800'
                  }`}
                >
                  {bankPoolAvailability.Isian} tersedia (diminta {genIsian})
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-600">Mencocokkan</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    bankPoolAvailability.Mencocokkan < genMencocokkan
                      ? 'text-amber-700'
                      : 'text-emerald-800'
                  }`}
                >
                  {bankPoolAvailability.Mencocokkan} tersedia (diminta {genMencocokkan})
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-600">Esai / Uraian</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    bankPoolAvailability.Uraian < genUraian ? 'text-amber-700' : 'text-emerald-800'
                  }`}
                >
                  {bankPoolAvailability.Uraian} tersedia (diminta {genUraian})
                </span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-1.5">
              <p className="font-semibold text-slate-800">Tips Merakit Paket CBT:</p>
              <p>
                Jika stok Bank Soal untuk mapel tertentu masih sedikit, Anda dapat beralih ke tab{' '}
                <strong>Generate Baru (AI/Lokal)</strong> atau mengimpor soal dari{' '}
                <strong>Naskah Soal Aktif</strong> di menu Bank Soal.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          SUB-VIEW 3: BANK SOAL CBT
          ============================================================ */}
      {subView === 'bank' && (
        <div className="space-y-5">
          {/* Toolbar Bank Soal */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={openCreateBankForm}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Butir Soal Manual</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportActiveQuestionsToBank}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Impor dari Naskah Aktif ({questions.length})</span>
                </button>
              </div>

              {selectedBankIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg text-xs">
                  <span className="font-bold text-emerald-900">
                    {selectedBankIds.length} Soal Dipilih →
                  </span>
                  <select
                    value={targetBulkPkgId}
                    onChange={(e) => setTargetBulkPkgId(e.target.value)}
                    className="border border-emerald-300 rounded px-2 py-1 bg-white text-xs"
                  >
                    {examPackages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.kodePaket} · {p.namaPaket}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleBulkAddToPackage}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3 py-1 rounded cursor-pointer whitespace-nowrap"
                  >
                    Masukkan ke Paket
                  </button>
                </div>
              )}
            </div>

            {/* Filter Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs pt-2 border-t border-slate-100">
              <input
                type="text"
                value={bankSearch}
                onChange={(e) => setBankSearch(e.target.value)}
                placeholder="Cari pertanyaan / materi..."
                className="border border-slate-300 rounded-lg px-3 py-2"
              />
              <select
                value={bankMapel}
                onChange={(e) => setBankMapel(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Mata Pelajaran</option>
                {SUBJECTS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={bankKelas}
                onChange={(e) => setBankKelas(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Kelas</option>
                {KELAS_LIST.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <select
                value={bankBentuk}
                onChange={(e) => setBankBentuk(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Bentuk Soal</option>
                <option value="PG">Pilihan Ganda (PG)</option>
                <option value="PGK">PG Kompleks (PGK)</option>
                <option value="Isian">Isian Singkat</option>
                <option value="Mencocokkan">Mencocokkan</option>
                <option value="Uraian">Esai / Uraian</option>
              </select>
              <select
                value={bankBloom}
                onChange={(e) => setBankBloom(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                <option value="SEMUA">Semua Level Bloom</option>
                {BLOOM_LEVELS.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} · {b.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add / Edit Bank Question Form */}
          {showBankForm && (
            <form
              onSubmit={handleSaveBankQuestion}
              className="bg-white rounded-xl border border-emerald-300 p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingBankId ? 'Edit Butir Soal di Bank Soal' : 'Tambah Butir Soal Baru ke Bank Soal'}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowBankForm(false)}
                  className="text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Mata Pelajaran</label>
                  <select
                    value={bankForm.mapel}
                    onChange={(e) => setBankForm((p) => ({ ...p, mapel: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {SUBJECTS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kelas</label>
                  <select
                    value={bankForm.kelas}
                    onChange={(e) => setBankForm((p) => ({ ...p, kelas: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {KELAS_LIST.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bentuk Soal</label>
                  <select
                    value={bankForm.bentuk}
                    onChange={(e) =>
                      setBankForm((p) => ({
                        ...p,
                        bentuk: e.target.value,
                        skor:
                          e.target.value === 'PG'
                            ? 1
                            : e.target.value === 'Uraian'
                              ? 4
                              : e.target.value === 'Mencocokkan'
                                ? 3
                                : 2,
                      }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white font-semibold"
                  >
                    <option value="PG">Pilihan Ganda (PG)</option>
                    <option value="PGK">PG Kompleks (PGK)</option>
                    <option value="Isian">Isian Singkat</option>
                    <option value="Mencocokkan">Mencocokkan</option>
                    <option value="Uraian">Esai / Uraian</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Skor Maksimal</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={bankForm.skor}
                    onChange={(e) =>
                      setBankForm((p) => ({ ...p, skor: Number(e.target.value) || 1 }))
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Level Bloom</label>
                  <select
                    value={bankForm.bloom}
                    onChange={(e) => setBankForm((p) => ({ ...p, bloom: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {BLOOM_LEVELS.map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.code} · {b.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tingkat Kesulitan
                  </label>
                  <select
                    value={bankForm.kesulitan}
                    onChange={(e) => setBankForm((p) => ({ ...p, kesulitan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="Mudah">Mudah</option>
                    <option value="Sedang">Sedang</option>
                    <option value="Sulit">Sulit</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    8 Dimensi Profil Lulusan
                  </label>
                  <select
                    value={bankForm.dimensi}
                    onChange={(e) => setBankForm((p) => ({ ...p, dimensi: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 bg-white"
                  >
                    {EIGHT_DIMENSIONS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Materi Pokok</label>
                  <input
                    type="text"
                    value={bankForm.materi}
                    onChange={(e) => setBankForm((p) => ({ ...p, materi: e.target.value }))}
                    placeholder="Contoh: Siklus Air, Operasi Hitung Pecahan..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Indikator Soal</label>
                  <input
                    type="text"
                    value={bankForm.indikator}
                    onChange={(e) => setBankForm((p) => ({ ...p, indikator: e.target.value }))}
                    placeholder="Peserta didik dapat..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Stimulus / Teks Pengantar (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={bankForm.stimulus}
                  onChange={(e) => setBankForm((p) => ({ ...p, stimulus: e.target.value }))}
                  placeholder="Teks bacaan atau konteks kasus..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Pokok Pertanyaan *</label>
                <textarea
                  rows={2}
                  required
                  value={bankForm.pertanyaan}
                  onChange={(e) => setBankForm((p) => ({ ...p, pertanyaan: e.target.value }))}
                  placeholder="Tuliskan pertanyaan soal..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 font-medium"
                />
              </div>

              {(bankForm.bentuk === 'PG' ||
                bankForm.bentuk === 'PGK' ||
                bankForm.bentuk === 'Mencocokkan') && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {bankForm.bentuk === 'PG'
                        ? 'Opsi A'
                        : bankForm.bentuk === 'Mencocokkan'
                          ? 'Pasangan 1 (Format: Premis => Jawaban)'
                          : 'Pernyataan 1'}
                    </label>
                    <input
                      type="text"
                      value={bankForm.opsiA}
                      onChange={(e) => setBankForm((p) => ({ ...p, opsiA: e.target.value }))}
                      placeholder={
                        bankForm.bentuk === 'Mencocokkan' ? 'Contoh: Persegi => sisi × sisi' : ''
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {bankForm.bentuk === 'PG'
                        ? 'Opsi B'
                        : bankForm.bentuk === 'Mencocokkan'
                          ? 'Pasangan 2 (Format: Premis => Jawaban)'
                          : 'Pernyataan 2'}
                    </label>
                    <input
                      type="text"
                      value={bankForm.opsiB}
                      onChange={(e) => setBankForm((p) => ({ ...p, opsiB: e.target.value }))}
                      placeholder={
                        bankForm.bentuk === 'Mencocokkan' ? 'Contoh: Segitiga => 1/2 × a × t' : ''
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {bankForm.bentuk === 'PG'
                        ? 'Opsi C'
                        : bankForm.bentuk === 'Mencocokkan'
                          ? 'Pasangan 3 (Format: Premis => Jawaban)'
                          : 'Pernyataan 3'}
                    </label>
                    <input
                      type="text"
                      value={bankForm.opsiC}
                      onChange={(e) => setBankForm((p) => ({ ...p, opsiC: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {bankForm.bentuk === 'PG'
                        ? 'Opsi D'
                        : bankForm.bentuk === 'Mencocokkan'
                          ? 'Pasangan 4 (Opsional)'
                          : 'Pernyataan 4'}
                    </label>
                    <input
                      type="text"
                      value={bankForm.opsiD}
                      onChange={(e) => setBankForm((p) => ({ ...p, opsiD: e.target.value }))}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Kunci Jawaban</label>
                  <input
                    type="text"
                    value={bankForm.kunci}
                    onChange={(e) => setBankForm((p) => ({ ...p, kunci: e.target.value }))}
                    placeholder={
                      bankForm.bentuk === 'PG'
                        ? 'Contoh: A'
                        : bankForm.bentuk === 'PGK'
                          ? 'Contoh: Pernyataan 1 dan Pernyataan 3'
                          : 'Jawaban kunci / pedoman penskoran...'
                    }
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-bold text-emerald-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pembahasan / Rubrik
                  </label>
                  <input
                    type="text"
                    value={bankForm.pembahasan}
                    onChange={(e) => setBankForm((p) => ({ ...p, pembahasan: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-5 py-2 rounded-lg cursor-pointer"
                >
                  {editingBankId ? 'Simpan Perubahan Soal' : 'Simpan ke Bank Soal'}
                </button>
              </div>
            </form>
          )}

          {/* Bank Soal List */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredBankQuestions.length > 0 &&
                          filteredBankQuestions.every((b) => selectedBankIds.includes(b.id))
                        }
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedBankIds(filteredBankQuestions.map((b) => b.id));
                          } else {
                            setSelectedBankIds([]);
                          }
                        }}
                        aria-label="Pilih semua soal"
                      />
                    </th>
                    <th className="p-3 w-40">Mapel &amp; Kelas</th>
                    <th className="p-3 w-28">Bentuk &amp; Level</th>
                    <th className="p-3">Pertanyaan &amp; Kunci Jawaban</th>
                    <th className="p-3 w-36 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredBankQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500">
                        Tidak ada soal di Bank Soal yang cocok dengan pencarian atau filter.
                      </td>
                    </tr>
                  ) : (
                    filteredBankQuestions.map((bq) => {
                      const isChecked = selectedBankIds.includes(bq.id);
                      return (
                        <tr key={bq.id} className="hover:bg-slate-50 align-top">
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedBankIds((prev) => [...prev, bq.id]);
                                } else {
                                  setSelectedBankIds((prev) => prev.filter((id) => id !== bq.id));
                                }
                              }}
                              aria-label={`Pilih soal ${bq.materi}`}
                            />
                          </td>
                          <td className="p-3 space-y-0.5">
                            <span className="font-semibold text-slate-900 block">
                              {bq.mapel.split('(')[0].trim()}
                            </span>
                            <span className="text-slate-600 block">{bq.kelas}</span>
                            <span className="text-[11px] text-slate-400 block">{bq.sumber}</span>
                          </td>
                          <td className="p-3 font-mono space-y-0.5">
                            <span className="font-bold text-emerald-800 block">{bq.bentuk}</span>
                            <span className="text-slate-700 block">
                              {bq.bloom} · {bq.kesulitan}
                            </span>
                            <span className="text-slate-500 block">Skor {bq.skor}</span>
                          </td>
                          <td className="p-3 space-y-1">
                            <p className="text-[11px] font-semibold text-slate-500">
                              Materi: {bq.materi}
                            </p>
                            {bq.stimulus && (
                              <p className="text-slate-600 italic bg-slate-50 border border-slate-200 rounded p-2">
                                {bq.stimulus}
                              </p>
                            )}
                            <p className="font-semibold text-slate-900">{bq.pertanyaan}</p>
                            {bq.opsi && bq.opsi.length > 0 && (
                              <p className="text-[11px] text-slate-600">
                                {bq.opsi.join('  |  ')}
                              </p>
                            )}
                            <p className="text-[11px] font-bold text-emerald-800">
                              Kunci: {bq.kunci}
                            </p>
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditBankForm(bq)}
                                className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setBankQuestions((prev) => prev.filter((x) => x.id !== bq.id))
                                }
                                className="p-1.5 rounded border border-slate-200 text-rose-700 hover:bg-rose-50 cursor-pointer"
                                title="Hapus soal dari bank"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL JADIKAN PAKET SOAL SEBAGAI GOOGLE FORM & REKAP SHEETS
          ============================================================ */}
      {gformModalPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col my-auto overflow-hidden animate-in fade-in duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-purple-50 via-slate-50 to-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-700 text-white rounded-xl shadow-xs">
                  <GoogleFormsLogo className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-900 uppercase tracking-wide bg-purple-100 px-2 py-0.5 rounded-full">
                      Google Workspace &amp; Drive
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-xs font-semibold text-slate-600">
                      SDN Kandangan I Tosari
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    Generator Google Form Kuis &amp; Rekap Sheets dari Paket Soal
                  </h3>
                  <p className="text-xs text-slate-600">
                    Paket: <strong className="text-purple-900">{gformModalPkg.namaPaket}</strong> (Kode: {gformModalPkg.kodePaket})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGformModalPkg(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Info Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Mata Pelajaran &amp; Kelas</span>
                  <span className="font-bold text-slate-800">{gformModalPkg.mapel}</span>
                  <span className="text-slate-500 block text-[11px]">{gformModalPkg.kelas} ({gformModalPkg.fase})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Jumlah Butir Soal</span>
                  <span className="font-bold text-purple-900 text-sm font-mono">{gformModalPkg.questions.length} Butir</span>
                  <span className="text-slate-500 block text-[11px]">Kunci &amp; Pembahasan Lengkap</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Token &amp; Durasi CBT</span>
                  <span className="font-bold text-emerald-800 font-mono">{gformModalPkg.tokenCBT}</span>
                  <span className="text-slate-500 block text-[11px]">{gformModalPkg.durasiMenit} Menit</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Daftar Siswa SDN Kandangan I</span>
                  <span className="font-bold text-blue-900">{gformModalClassStudentsCount} Peserta Didik</span>
                  <span className="text-slate-500 block text-[11px]">Siap Dropdown di Form</span>
                </div>
              </div>

              {/* Checkbox Options */}
              <div className="bg-purple-50/50 border border-purple-200/70 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                  Opsi Otomasi Pembuatan:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={gformIncludeDropdown}
                      onChange={(e) => setGformIncludeDropdown(e.target.checked)}
                      className="rounded text-purple-700 focus:ring-purple-600"
                    />
                    <span>Sertakan Dropdown Siswa {gformModalPkg.kelas} ({gformModalClassStudentsCount} Siswa)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={gformShuffle}
                      onChange={(e) => setGformShuffle(e.target.checked)}
                      className="rounded text-purple-700 focus:ring-purple-600"
                    />
                    <span>Acak Urutan Soal (Shuffle Questions)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={gformAutoSheet}
                      onChange={(e) => setGformAutoSheet(e.target.checked)}
                      className="rounded text-emerald-700 focus:ring-emerald-600"
                    />
                    <span className="flex items-center gap-1.5">
                      <GoogleSheetsLogo className="w-3.5 h-3.5" />
                      <span>Otomatis Buat Google Sheets Rekap &amp; Tautkan</span>
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-medium">
                    <input
                      type="checkbox"
                      checked={gformOrganizeDrive}
                      onChange={(e) => setGformOrganizeDrive(e.target.checked)}
                      className="rounded text-blue-700 focus:ring-blue-600"
                    />
                    <span className="flex items-center gap-1.5">
                      <GoogleDriveLogo className="w-3.5 h-3.5" />
                      <span>Simpan ke Folder Drive SDN Kandangan I</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-900 rounded-xl text-white">
                <div>
                  <h5 className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Script Otomasi Google Apps Script (.gs) Siap Digunakan</span>
                  </h5>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Salin script ini, lalu tempelkan ke Google Apps Script untuk membuat Google Form &amp; Sheets dalam sekejap.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      downloadTextFile(
                        gformScriptCode,
                        `Generator_GForm_${gformModalPkg.kodePaket}_${gformModalPkg.kelas}.gs`,
                        'application/javascript;charset=utf-8'
                      );
                    }}
                    className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh .gs</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(gformScriptCode);
                      setCopiedGFormScript(true);
                      setTimeout(() => setCopiedGFormScript(false), 3000);
                    }}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    {copiedGFormScript ? (
                      <Check className="w-4 h-4 text-amber-300" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                    <span>{copiedGFormScript ? 'Tersalin ke Clipboard!' : 'Salin Script Otomasi'}</span>
                  </button>

                  <a
                    href="https://script.google.com"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    <span>Buka script.google.com</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Code Preview */}
              <div className="relative">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 bg-slate-100 px-3 py-1.5 rounded-t-lg border-x border-t border-slate-200">
                  <span>Preview Kode Google Apps Script ({gformModalPkg.namaPaket})</span>
                  <span>{gformScriptCode.split('\n').length} baris</span>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-b-lg text-xs font-mono max-h-48 overflow-y-auto leading-relaxed border-x border-b border-slate-800">
                  {gformScriptCode}
                </pre>
              </div>

              {/* 4-Step Instructions */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs space-y-2">
                <h5 className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>💡 Panduan 4 Langkah Menjalankan di Akun Google Anda:</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-amber-900 leading-relaxed">
                  <li>
                    Klik tombol <strong>"Salin Script Otomasi"</strong> di atas.
                  </li>
                  <li>
                    Klik <strong>"Buka script.google.com"</strong> &gt; Klik <strong>"Project Baru" (New Project)</strong>.
                  </li>
                  <li>
                    Hapus kode bawaan <code>myFunction()</code>, lalu <strong>Paste (Tempel)</strong> kode yang sudah disalin tadi.
                  </li>
                  <li>
                    Klik tombol <strong>Simpan (ikon disket)</strong> lalu klik tombol <strong>Jalankan (Run)</strong>. Berikan izin akun Google, dan formulir kuis serta rekap Google Sheets Anda langsung aktif!
                  </li>
                </ol>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const targetPkg = gformModalPkg;
                  setGformModalPkg(null);
                  onActivatePackage(targetPkg, 'gform');
                }}
                className="flex items-center gap-1.5 text-xs font-semibold text-purple-800 hover:text-purple-950 hover:underline cursor-pointer"
              >
                <span>Buka di Menu "Google Form &amp; Ekspor" Lengkap</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setGformModalPkg(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
