import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FileDown,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  RotateCcw,
  TrendingUp,
} from 'lucide-react';
import type {
  AssessmentConfig,
  CBTSubmission,
  QuestionItem,
  SchoolProfile,
  Student,
  StudentGradeRecord,
} from '../types';
import { exportAnalisisHasilCSV, exportWordDocument } from '../utils/exportHelpers';
import { exportAnalisisHasilPDF } from '../utils/pdfExport';
import { KopNaskah } from './KopNaskah';

interface TabPenilaianAnalisisProps {
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  questions: QuestionItem[];
  students: Student[];
  cbtSubmissions: CBTSubmission[];
  gradeRecords: Record<string, StudentGradeRecord>;
  setGradeRecords: React.Dispatch<React.SetStateAction<Record<string, StudentGradeRecord>>>;
  kktp: number;
  setKktp: React.Dispatch<React.SetStateAction<number>>;
}

interface GradedStudentRow {
  student: Student;
  recordKey: string;
  hasAnyInput: boolean;
  perQuestionScores: number[];
  totalSkor: number;
  nilaiAkhir: number;
  statusKKTP: 'Tuntas' | 'Perlu Remedial' | 'Belum Dinilai';
  predikat: string;
  tindakLanjut: string;
  weakTopics: string[];
  catatan: string;
}

export const TabPenilaianAnalisis: React.FC<TabPenilaianAnalisisProps> = ({
  config,
  schoolProfile,
  questions,
  students,
  cbtSubmissions,
  gradeRecords,
  setGradeRecords,
  kktp,
  setKktp,
}) => {
  const [subView, setSubView] = useState<'input' | 'analisis' | 'butir' | 'laporan'>('input');
  const [selectedKelas, setSelectedKelas] = useState(config.kelas);
  const [filterAgama, setFilterAgama] = useState('SEMUA');
  const [statusMessage, setStatusMessage] = useState('');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    setSelectedKelas(config.kelas);
  }, [config.kelas]);

  const classStudents = useMemo(() => {
    return students.filter((s) => {
      const matchKelas = s.kelas === selectedKelas;
      const matchAgama = filterAgama === 'SEMUA' || s.agama === filterAgama;
      return matchKelas && matchAgama;
    });
  }, [students, selectedKelas, filterAgama]);

  const totalMaxScore = useMemo(
    () => questions.reduce((acc, q) => acc + (Number(q.skor) || 1), 0),
    [questions]
  );

  const makeKey = (nipd: string) => `${selectedKelas}__${config.mapel}__${nipd}`;

  const getPredikat = (nilai: number): string => {
    if (nilai >= 90) return 'Sangat Baik (A)';
    if (nilai >= kktp) return 'Baik (B)';
    if (nilai >= 60) return 'Cukup (C)';
    return 'Perlu Bimbingan (D)';
  };

  // Update a single student's score on a single question
  const handleScoreChange = (student: Student, qNomor: number, maxSkor: number, rawVal: string) => {
    const num = rawVal === '' ? 0 : Math.max(0, Math.min(maxSkor, Number(rawVal) || 0));
    const key = makeKey(student.nipd);
    setGradeRecords((prev) => {
      const existing = prev[key] || {
        key,
        nipd: student.nipd,
        kelas: selectedKelas,
        mapel: config.mapel,
        scores: {},
        catatan: '',
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [key]: {
          ...existing,
          scores: {
            ...existing.scores,
            [qNomor]: num,
          },
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleCatatanChange = (student: Student, catatan: string) => {
    const key = makeKey(student.nipd);
    setGradeRecords((prev) => {
      const existing = prev[key] || {
        key,
        nipd: student.nipd,
        kelas: selectedKelas,
        mapel: config.mapel,
        scores: {},
        catatan: '',
        updatedAt: new Date().toISOString(),
      };
      return {
        ...prev,
        [key]: {
          ...existing,
          catatan,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  const handleFillFullStudent = (student: Student) => {
    const key = makeKey(student.nipd);
    const fullScores: Record<number, number> = {};
    questions.forEach((q) => {
      fullScores[q.nomor] = Number(q.skor) || 1;
    });
    setGradeRecords((prev) => ({
      ...prev,
      [key]: {
        key,
        nipd: student.nipd,
        kelas: selectedKelas,
        mapel: config.mapel,
        scores: fullScores,
        catatan: prev[key]?.catatan || '',
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleSyncFromCBT = () => {
    const matchingSubs = cbtSubmissions.filter(
      (sub) => sub.kelas === selectedKelas && sub.mapel === config.mapel
    );
    if (matchingSubs.length === 0) {
      setStatusMessage(
        `Belum ada data ujian CBT untuk ${selectedKelas} (${config.mapel}). Siswa dapat mengerjakan di menu Portal Ujian CBT terlebih dahulu.`
      );
      setTimeout(() => setStatusMessage(''), 5000);
      return;
    }

    let syncedCount = 0;
    setGradeRecords((prev) => {
      const next = { ...prev };
      matchingSubs.forEach((sub) => {
        const key = `${selectedKelas}__${config.mapel}__${sub.nipd}`;
        const scores: Record<number, number> = {};
        if (Array.isArray(sub.details) && sub.details.length > 0) {
          sub.details.forEach((d) => {
            scores[d.nomor] = d.skorPerolehan;
          });
        } else {
          // Distribute total score proportionally across current questions if demo record lacks details
          let remaining = sub.skorPerolehan;
          questions.forEach((q) => {
            const qMax = Number(q.skor) || 1;
            const take = Math.min(qMax, Math.max(0, remaining));
            scores[q.nomor] = take;
            remaining -= take;
          });
        }
        next[key] = {
          key,
          nipd: sub.nipd,
          kelas: selectedKelas,
          mapel: config.mapel,
          scores,
          catatan: next[key]?.catatan || `Disinkronkan dari CBT (${sub.waktuSelesai})`,
          updatedAt: new Date().toISOString(),
        };
        syncedCount++;
      });
      return next;
    });

    setStatusMessage(
      `Berhasil menyinkronkan nilai ${syncedCount} peserta didik dari Portal Ujian CBT.`
    );
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handlePopulateSampleClassScores = () => {
    setGradeRecords((prev) => {
      const next = { ...prev };
      classStudents.forEach((student, sIdx) => {
        const key = makeKey(student.nipd);
        const scores: Record<number, number> = {};
        questions.forEach((q, qIdx) => {
          const maxS = Number(q.skor) || 1;
          // Create realistic varied student mastery profiles (some high, some average, some needing remedial)
          const seed = (sIdx * 7 + qIdx * 3) % 10;
          if (sIdx % 5 === 4) {
            // Remedial profile (~55-65%)
            scores[q.nomor] = seed < 5 ? maxS : seed < 7 ? Math.floor(maxS / 2) : 0;
          } else if (sIdx % 3 === 0) {
            // High achiever (~90-100%)
            scores[q.nomor] = seed === 9 ? Math.max(0, maxS - 1) : maxS;
          } else {
            // Standard achiever (~75-85%)
            scores[q.nomor] = seed < 7 ? maxS : Math.floor(maxS / 2);
          }
        });
        next[key] = {
          key,
          nipd: student.nipd,
          kelas: selectedKelas,
          mapel: config.mapel,
          scores,
          catatan: next[key]?.catatan || '',
          updatedAt: new Date().toISOString(),
        };
      });
      return next;
    });
    setStatusMessage(
      `Data simulasi penilaian untuk ${classStudents.length} siswa ${selectedKelas} berhasil diisi.`
    );
    setTimeout(() => setStatusMessage(''), 4000);
  };

  const handleResetClassScores = () => {
    setGradeRecords((prev) => {
      const next = { ...prev };
      classStudents.forEach((s) => {
        delete next[makeKey(s.nipd)];
      });
      return next;
    });
    setStatusMessage(`Data nilai ${selectedKelas} (${config.mapel}) telah dikosongkan.`);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  // Compute graded rows for all filtered students
  const gradedRows: GradedStudentRow[] = useMemo(() => {
    return classStudents.map((student) => {
      const key = makeKey(student.nipd);
      const rec = gradeRecords[key];
      const hasAnyInput = Boolean(rec && Object.keys(rec.scores || {}).length > 0);
      const perQuestionScores = questions.map((q) => {
        const val = rec?.scores?.[q.nomor];
        return typeof val === 'number' ? val : 0;
      });
      const totalSkor = perQuestionScores.reduce((a, b) => a + b, 0);
      const nilaiAkhir = totalMaxScore > 0 ? Math.round((totalSkor / totalMaxScore) * 100) : 0;

      let statusKKTP: GradedStudentRow['statusKKTP'] = 'Belum Dinilai';
      if (hasAnyInput) {
        statusKKTP = nilaiAkhir >= kktp ? 'Tuntas' : 'Perlu Remedial';
      }

      const weakTopics: string[] = [];
      if (hasAnyInput) {
        questions.forEach((q, idx) => {
          const maxQ = Number(q.skor) || 1;
          if (perQuestionScores[idx] < maxQ * 0.6 && q.materi && !weakTopics.includes(q.materi)) {
            weakTopics.push(q.materi);
          }
        });
      }

      const tindakLanjut = !hasAnyInput
        ? 'Menunggu Input Nilai'
        : nilaiAkhir >= 90
          ? 'Pengayaan (Materi Lanjutan)'
          : nilaiAkhir >= kktp
            ? 'Tuntas / Pemantapan'
            : `Remedial (${weakTopics.slice(0, 2).join(', ') || 'Pendampingan Materi'})`;

      return {
        student,
        recordKey: key,
        hasAnyInput,
        perQuestionScores,
        totalSkor,
        nilaiAkhir,
        statusKKTP,
        predikat: hasAnyInput ? getPredikat(nilaiAkhir) : '-',
        tindakLanjut,
        weakTopics,
        catatan: rec?.catatan || '',
      };
    });
  }, [classStudents, gradeRecords, questions, totalMaxScore, kktp, selectedKelas, config.mapel]);

  // Graded-only subset for statistics & item analysis
  const evaluatedRows = useMemo(
    () => gradedRows.filter((r) => r.hasAnyInput),
    [gradedRows]
  );

  // Class Summary Statistics
  const classAnalytics = useMemo(() => {
    const count = evaluatedRows.length;
    if (count === 0) {
      return {
        evaluatedCount: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        tuntasCount: 0,
        remedialCount: 0,
        pengayaanCount: 0,
        tuntasPercent: 0,
        bloomMastery: [] as { code: string; percent: number; questionCount: number }[],
        dimensionMastery: [] as { dimensi: string; percent: number; questionCount: number }[],
      };
    }

    const scores = evaluatedRows.map((r) => r.nilaiAkhir);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / count);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const tuntasCount = evaluatedRows.filter((r) => r.nilaiAkhir >= kktp).length;
    const remedialCount = count - tuntasCount;
    const pengayaanCount = evaluatedRows.filter((r) => r.nilaiAkhir >= 90).length;
    const tuntasPercent = Math.round((tuntasCount / count) * 100);

    // Bloom Mastery
    const bloomMap: Record<string, { earned: number; max: number; qCount: number }> = {};
    const dimMap: Record<string, { earned: number; max: number; qCount: number }> = {};

    questions.forEach((q, qIdx) => {
      const bCode = (q.bloom || 'C3').toUpperCase().substring(0, 2);
      const dim = q.dimensi || 'Penalaran Kritis';
      const qMax = Number(q.skor) || 1;

      if (!bloomMap[bCode]) bloomMap[bCode] = { earned: 0, max: 0, qCount: 0 };
      if (!dimMap[dim]) dimMap[dim] = { earned: 0, max: 0, qCount: 0 };

      bloomMap[bCode].qCount += 1;
      dimMap[dim].qCount += 1;

      evaluatedRows.forEach((row) => {
        bloomMap[bCode].earned += row.perQuestionScores[qIdx] || 0;
        bloomMap[bCode].max += qMax;
        dimMap[dim].earned += row.perQuestionScores[qIdx] || 0;
        dimMap[dim].max += qMax;
      });
    });

    const bloomMastery = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']
      .filter((code) => bloomMap[code])
      .map((code) => ({
        code,
        percent:
          bloomMap[code].max > 0
            ? Math.round((bloomMap[code].earned / bloomMap[code].max) * 100)
            : 0,
        questionCount: bloomMap[code].qCount,
      }));

    const dimensionMastery = Object.entries(dimMap).map(([dimensi, val]) => ({
      dimensi,
      percent: val.max > 0 ? Math.round((val.earned / val.max) * 100) : 0,
      questionCount: val.qCount,
    }));

    return {
      evaluatedCount: count,
      average,
      highest,
      lowest,
      tuntasCount,
      remedialCount,
      pengayaanCount,
      tuntasPercent,
      bloomMastery,
      dimensionMastery,
    };
  }, [evaluatedRows, questions, kktp]);

  // Item Analysis (Analisis Kualitas Butir Soal: Tingkat Kesukaran P & Daya Pembeda D)
  const itemAnalysis = useMemo(() => {
    const n = evaluatedRows.length;
    const sortedDesc = [...evaluatedRows].sort((a, b) => b.totalSkor - a.totalSkor);
    const groupSize = Math.max(1, Math.round(n * 0.27));
    const upperGroup = sortedDesc.slice(0, groupSize);
    const lowerGroup = sortedDesc.slice(Math.max(0, n - groupSize));

    return questions.map((q, qIdx) => {
      const maxQ = Number(q.skor) || 1;
      if (n === 0) {
        return {
          question: q,
          avgScore: 0,
          difficultyIndex: 0,
          difficultyLabel: '-',
          discriminationIndex: 0,
          discriminationLabel: '-',
          recommendation: 'Belum ada data nilai siswa',
        };
      }

      const sumScore = evaluatedRows.reduce(
        (acc, row) => acc + (row.perQuestionScores[qIdx] || 0),
        0
      );
      const avgScore = sumScore / n;
      const pIndex = avgScore / maxQ; // 0.00 - 1.00

      let difficultyLabel = 'Sedang';
      if (pIndex > 0.7) difficultyLabel = 'Mudah';
      else if (pIndex < 0.3) difficultyLabel = 'Sukar';

      const upperMean =
        upperGroup.reduce((acc, r) => acc + (r.perQuestionScores[qIdx] || 0), 0) /
        (upperGroup.length * maxQ);
      const lowerMean =
        lowerGroup.reduce((acc, r) => acc + (r.perQuestionScores[qIdx] || 0), 0) /
        (lowerGroup.length * maxQ);
      const dIndex = n >= 2 ? upperMean - lowerMean : 0;

      let discriminationLabel = 'Cukup';
      if (dIndex >= 0.3) discriminationLabel = 'Baik';
      else if (dIndex < 0.2) discriminationLabel = 'Lemah';

      let recommendation = 'Diterima (Layak Pakai)';
      if (n < 4) {
        recommendation = 'Butuh >= 4 siswa dinilai untuk uji daya pembeda';
      } else if (dIndex < 0.1 || pIndex === 0 || pIndex === 1) {
        recommendation = 'Perlu Revisi / Diganti';
      } else if (dIndex < 0.25) {
        recommendation = 'Revisi Sebagian Pengecoh';
      }

      return {
        question: q,
        avgScore: Number(avgScore.toFixed(2)),
        difficultyIndex: Number(pIndex.toFixed(2)),
        difficultyLabel,
        discriminationIndex: Number(dIndex.toFixed(2)),
        discriminationLabel,
        recommendation,
      };
    });
  }, [evaluatedRows, questions]);

  const handleExportCSV = () => {
    const exportRows = gradedRows.map((r, i) => ({
      no: i + 1,
      nipd: r.student.nipd,
      nisn: r.student.nisn,
      nama: r.student.nama,
      agama: r.student.agama,
      perQuestion: r.perQuestionScores,
      totalSkor: r.totalSkor,
      nilaiAkhir: r.nilaiAkhir,
      statusKKTP: r.statusKKTP,
      tindakLanjut: r.tindakLanjut,
    }));
    exportAnalisisHasilCSV(exportRows, questions, config, selectedKelas, kktp);
  };

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      await exportAnalisisHasilPDF({
        schoolProfile,
        config,
        selectedKelas,
        filterAgama,
        kktp,
        totalMaxScore,
        classAnalytics: {
          ...classAnalytics,
          totalStudents: classStudents.length,
        },
        gradedRows: gradedRows.map((r, i) => ({
          no: i + 1,
          nipd: r.student.nipd,
          nama: r.student.nama,
          hasAnyInput: r.hasAnyInput,
          totalSkor: r.totalSkor,
          nilaiAkhir: r.nilaiAkhir,
          predikat: r.predikat,
          statusKKTP: r.statusKKTP,
          tindakLanjut: r.tindakLanjut,
        })),
        bloomMastery: classAnalytics.bloomMastery,
        itemAnalysis,
      });
      setStatusMessage(
        `Laporan Analisis Hasil (${selectedKelas} · ${config.mapel}) berhasil diunduh dalam format PDF.`
      );
      setTimeout(() => setStatusMessage(''), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control & Filter Bar */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-800">
              <span>Penilaian &amp; Analisis Hasil</span>
              <span aria-hidden="true">·</span>
              <span>Kurikulum Merdeka</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-0.5">
              Input Nilai, Analisis Ketuntasan KKTP &amp; Kualitas Butir Soal
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Kelola skor per butir soal untuk {config.mapel} ({selectedKelas}), sinkronkan hasil
              CBT, dan unduh laporan analisis hasil belajar resmi dalam format PDF, Word, atau CSV.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleSyncFromCBT}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan dari CBT</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-60 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Membuat PDF...' : 'Unduh Laporan PDF'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Unduh Excel/CSV</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportWordDocument(
                  'printable-analisis-hasil',
                  `Laporan_Analisis_Hasil_${config.mapel}_${selectedKelas}_${schoolProfile.namaSingkat.replace(/\s+/g, '_')}`
                )
              }
              className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Word</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSubView('laporan');
                setTimeout(() => window.print(), 100);
              }}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Laporan</span>
            </button>
          </div>
        </div>

        {/* Sub-view Tabs & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'input' as const, label: '1. Input Skor Per Soal', icon: ClipboardCheck },
              { id: 'analisis' as const, label: '2. Analisis Hasil & Remedial', icon: BarChart3 },
              { id: 'butir' as const, label: '3. Analisis Butir Soal', icon: TrendingUp },
              { id: 'laporan' as const, label: '4. Preview Laporan Cetak', icon: Printer },
            ].map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSubView(v.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    subView === v.id
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{v.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">Kelas:</label>
              <select
                value={selectedKelas}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold bg-white"
              >
                {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6'].map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">Agama:</label>
              <select
                value={filterAgama}
                onChange={(e) => setFilterAgama(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
              >
                <option value="SEMUA">Semua</option>
                <option value="HINDU">Hindu</option>
                <option value="ISLAM">Islam</option>
                <option value="KRISTEN">Kristen</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-slate-600">KKTP:</label>
              <input
                type="number"
                min={50}
                max={95}
                value={kktp}
                onChange={(e) => setKktp(Math.max(50, Math.min(95, Number(e.target.value) || 75)))}
                className="w-16 border border-slate-300 rounded-lg px-2 py-1.5 font-mono font-bold text-center"
              />
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-3.5 py-2.5 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Summary Row (Always visible on non-print screens) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Rata-Rata Nilai Kelas</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
              {classAnalytics.average}
            </span>
            <span className="text-xs font-mono text-slate-500">
              Min {classAnalytics.lowest} · Maks {classAnalytics.highest}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">
            Ketuntasan Klasikal (KKTP {kktp})
          </span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">
              {classAnalytics.tuntasPercent}%
            </span>
            <span className="text-xs font-mono text-slate-600">
              {classAnalytics.tuntasCount} / {classAnalytics.evaluatedCount} Siswa Dinilai
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Perlu Remedial (&lt; {kktp})</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-rose-700 tabular-nums">
              {classAnalytics.remedialCount}
            </span>
            <span className="text-xs text-slate-600">Peserta Didik</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <span className="text-xs font-semibold text-slate-500">Program Pengayaan (≥ 90)</span>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-mono font-bold text-sky-700 tabular-nums">
              {classAnalytics.pengayaanCount}
            </span>
            <span className="text-xs text-slate-600">Peserta Didik</span>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: INPUT PENILAIAN PER BUTIR SOAL */}
      {subView === 'input' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Masukkan skor perolehan masing-masing butir soal (<strong>S1–S{questions.length}</strong>).
              Total Skor Maksimal: <strong className="font-mono text-slate-900">{totalMaxScore}</strong>.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePopulateSampleClassScores}
                className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-300 cursor-pointer whitespace-nowrap"
              >
                Isi Data Simulasi Kelas
              </button>
              <button
                type="button"
                onClick={handleResetClassScores}
                className="flex items-center gap-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Nilai</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 w-10 text-center">No</th>
                  <th className="p-2.5 min-w-[200px]">Nama Peserta Didik</th>
                  {questions.map((q) => (
                    <th key={q.nomor} className="p-2 text-center min-w-[58px]">
                      <div className="font-mono font-bold">S{q.nomor}</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        {q.bloom} · /{q.skor}
                      </div>
                    </th>
                  ))}
                  <th className="p-2.5 text-center w-20">Skor</th>
                  <th className="p-2.5 text-center w-20">Nilai</th>
                  <th className="p-2.5 min-w-[130px]">Status KKTP</th>
                  <th className="p-2.5 min-w-[160px]">Catatan Guru</th>
                  <th className="p-2.5 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {gradedRows.map((row, idx) => {
                  const rec = gradeRecords[row.recordKey];
                  return (
                    <tr key={row.student.nipd} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="p-2.5">
                        <div className="font-semibold text-slate-900">{row.student.nama}</div>
                        <div className="text-[11px] font-mono text-slate-500">
                          NIPD {row.student.nipd} · {row.student.agama}
                        </div>
                      </td>
                      {questions.map((q) => {
                        const val = rec?.scores?.[q.nomor];
                        return (
                          <td key={q.nomor} className="p-1.5 text-center">
                            <input
                              type="number"
                              min={0}
                              max={Number(q.skor) || 1}
                              value={val === undefined ? '' : val}
                              placeholder="0"
                              onChange={(e) =>
                                handleScoreChange(
                                  row.student,
                                  q.nomor,
                                  Number(q.skor) || 1,
                                  e.target.value
                                )
                              }
                              className="w-12 text-center font-mono font-semibold border border-slate-300 rounded px-1 py-1 bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                            />
                          </td>
                        );
                      })}
                      <td className="p-2.5 text-center font-mono font-semibold text-slate-700 tabular-nums">
                        {row.hasAnyInput ? `${row.totalSkor}/${totalMaxScore}` : '-'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-sm tabular-nums text-slate-900">
                        {row.hasAnyInput ? row.nilaiAkhir : '-'}
                      </td>
                      <td className="p-2.5">
                        {row.statusKKTP === 'Tuntas' && (
                          <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Tuntas</span>
                          </span>
                        )}
                        {row.statusKKTP === 'Perlu Remedial' && (
                          <span className="inline-flex items-center gap-1 text-rose-800 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                            <span>Remedial</span>
                          </span>
                        )}
                        {row.statusKKTP === 'Belum Dinilai' && (
                          <span className="text-slate-400">Belum Dinilai</span>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.catatan}
                          onChange={(e) => handleCatatanChange(row.student, e.target.value)}
                          placeholder="Catatan guru..."
                          className="w-full border border-slate-200 rounded px-2 py-1 text-xs"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleFillFullStudent(row.student)}
                          className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer whitespace-nowrap"
                          title="Isi skor maksimal semua soal"
                        >
                          Skor Penuh
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: ANALISIS HASIL BELAJAR, BLOOM & REMEDIAL/PENGAYAAN */}
      {subView === 'analisis' && (
        <div className="no-print space-y-6">
          {classAnalytics.evaluatedCount === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
              <p className="font-bold text-slate-800">
                Belum Ada Nilai Siswa yang Diinput untuk {selectedKelas} ({config.mapel})
              </p>
              <p className="text-xs text-slate-500 max-w-lg mx-auto">
                Silakan isi skor pada tab <strong>1. Input Skor Per Soal</strong>, sinkronkan dari{' '}
                <strong>Portal Ujian CBT</strong>, atau muat data simulasi untuk melihat grafik
                ketuntasan Taksonomi Bloom dan daftar remedial otomatis.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubView('input')}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-4 py-2 rounded-lg cursor-pointer"
                >
                  Ke Input Nilai
                </button>
                <button
                  type="button"
                  onClick={handlePopulateSampleClassScores}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300 cursor-pointer"
                >
                  Isi Simulasi Cepat
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Ketuntasan Taksonomi Bloom & 8 Dimensi Lulusan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Ketuntasan Kognitif Per Level Taksonomi Bloom
                    </h3>
                    <p className="text-xs text-slate-500">
                      Persentase rata-rata pencapaian skor siswa pada setiap level kognitif soal.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {classAnalytics.bloomMastery.map((b) => (
                      <div key={b.code} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-slate-800">
                            Level {b.code} ({b.questionCount} Soal)
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {b.percent}% · {b.percent >= kktp ? 'Tuntas' : 'Perlu Penguatan'}
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              b.percent >= kktp ? 'bg-emerald-700' : 'bg-amber-600'
                            }`}
                            style={{ width: `${b.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm">
                      Pencapaian 8 Dimensi Profil Lulusan
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pemetaan capaian berdasarkan dimensi lulusan yang diujikan.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {classAnalytics.dimensionMastery.map((d) => (
                      <div key={d.dimensi} className="space-y-1">
                        <div className="flex justify-between text-xs gap-2">
                          <span className="font-semibold text-slate-800 truncate">
                            {d.dimensi} ({d.questionCount} Soal)
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                            {d.percent}%
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-700 rounded-full"
                            style={{ width: `${d.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Daftar Remedial & Pengayaan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-rose-900 text-sm">
                        Daftar Peserta Program Remedial (&lt; {kktp})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Siswa yang memerlukan pendampingan ulang sesuai materi terlemah.
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-rose-700">
                      {evaluatedRows.filter((r) => r.nilaiAkhir < kktp).length} Siswa
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5 text-center w-16">Nilai</th>
                          <th className="p-2.5">Materi Perlu Diulang</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {evaluatedRows.filter((r) => r.nilaiAkhir < kktp).length === 0 ? (
                          <tr>
                            <td colSpan={3} className="p-4 text-center text-slate-500">
                              Seluruh siswa yang dinilai sudah mencapai KKTP {kktp}.
                            </td>
                          </tr>
                        ) : (
                          evaluatedRows
                            .filter((r) => r.nilaiAkhir < kktp)
                            .map((r) => (
                              <tr key={r.student.nipd}>
                                <td className="p-2.5 font-semibold text-slate-900">
                                  {r.student.nama}
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                                  {r.nilaiAkhir}
                                </td>
                                <td className="p-2.5 text-slate-600">
                                  {r.weakTopics.join(', ') || 'Pendampingan menyeluruh'}
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-emerald-900 text-sm">
                        Daftar Peserta Tuntas &amp; Pengayaan (≥ {kktp})
                      </h3>
                      <p className="text-xs text-slate-500">
                        Siswa tuntas KKTP dan rekomendasi pengayaan (≥ 90).
                      </p>
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-700">
                      {evaluatedRows.filter((r) => r.nilaiAkhir >= kktp).length} Siswa
                    </span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700">
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5 text-center w-16">Nilai</th>
                          <th className="p-2.5">Tindak Lanjut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {evaluatedRows
                          .filter((r) => r.nilaiAkhir >= kktp)
                          .map((r) => (
                            <tr key={r.student.nipd}>
                              <td className="p-2.5 font-semibold text-slate-900">
                                {r.student.nama}
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                                {r.nilaiAkhir}
                              </td>
                              <td className="p-2.5 text-slate-700">{r.tindakLanjut}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: ANALISIS BUTIR SOAL (TINGKAT KESUKARAN & DAYA PEMBEDA) */}
      {subView === 'butir' && (
        <div className="no-print bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">
              Analisis Kualitas Butir Soal (Indeks Kesukaran P &amp; Daya Pembeda D)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dihitung otomatis dari {classAnalytics.evaluatedCount} peserta didik yang sudah
              dinilai. Indeks Kesukaran P = Rata-rata Skor / Skor Maks; Daya Pembeda D = Kelompok
              Atas (27%) − Kelompok Bawah (27%).
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 w-14 text-center">No Soal</th>
                  <th className="p-2.5 w-20">Bentuk</th>
                  <th className="p-2.5 w-16 text-center">Bloom</th>
                  <th className="p-2.5">Materi Pokok</th>
                  <th className="p-2.5 w-24 text-center">Rata-rata</th>
                  <th className="p-2.5 w-32 text-center">Kesukaran (P)</th>
                  <th className="p-2.5 w-32 text-center">Daya Pembeda (D)</th>
                  <th className="p-2.5 min-w-[180px]">Rekomendasi Soal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemAnalysis.map((item) => (
                  <tr key={item.question.nomor} className="hover:bg-slate-50">
                    <td className="p-2.5 text-center font-mono font-bold">
                      {item.question.nomor}
                    </td>
                    <td className="p-2.5">{item.question.bentuk}</td>
                    <td className="p-2.5 text-center font-mono font-semibold text-emerald-800">
                      {item.question.bloom}
                    </td>
                    <td className="p-2.5 font-medium text-slate-900">{item.question.materi}</td>
                    <td className="p-2.5 text-center font-mono">
                      {item.avgScore} / {item.question.skor}
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      <span className="font-bold">{item.difficultyIndex.toFixed(2)}</span>{' '}
                      <span className="text-slate-600">({item.difficultyLabel})</span>
                    </td>
                    <td className="p-2.5 text-center font-mono">
                      <span className="font-bold">{item.discriminationIndex.toFixed(2)}</span>{' '}
                      <span className="text-slate-600">({item.discriminationLabel})</span>
                    </td>
                    <td className="p-2.5 font-semibold">
                      <span
                        className={
                          item.recommendation.includes('Diterima')
                            ? 'text-emerald-800'
                            : item.recommendation.includes('Revisi Sebagian')
                              ? 'text-amber-800'
                              : 'text-rose-800'
                        }
                      >
                        {item.recommendation}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4 (DAN TARGET CETAK / WORD): LAPORAN RESMI ANALISIS HASIL */}
      <div
        id="printable-analisis-hasil"
        className={`${
          subView === 'laporan' ? 'block' : 'hidden print:block'
        } print-area bg-white p-8 rounded-xl border border-slate-200 font-serif-exam text-black space-y-6`}
      >
        <KopNaskah schoolProfile={schoolProfile} />

        <div className="text-center">
          <h3 className="text-base font-bold uppercase underline">
            LAPORAN PENILAIAN DAN ANALISIS HASIL ASESMEN
          </h3>
          <p className="text-xs font-bold uppercase mt-0.5">
            {config.jenisAsesmen} · TAHUN PELAJARAN {config.tahunPelajaran}
          </p>
        </div>

        {/* Identitas & Ringkasan */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p>
              <strong>Mata Pelajaran:</strong> {config.mapel}
            </p>
            <p>
              <strong>Kelas / Fase:</strong> {selectedKelas} ({config.fase})
            </p>
            <p>
              <strong>Guru Pengampu:</strong> {config.guruNama}
            </p>
          </div>
          <div>
            <p>
              <strong>KKTP / KKM:</strong> {kktp} | <strong>Skor Maksimal:</strong>{' '}
              {totalMaxScore}
            </p>
            <p>
              <strong>Rata-Rata Kelas:</strong> {classAnalytics.average} (Min{' '}
              {classAnalytics.lowest} / Maks {classAnalytics.highest})
            </p>
            <p>
              <strong>Ketuntasan Klasikal:</strong> {classAnalytics.tuntasPercent}% (
              {classAnalytics.tuntasCount} Tuntas, {classAnalytics.remedialCount} Remedial)
            </p>
          </div>
        </div>

        {/* Tabel 1: Daftar Nilai & Ketuntasan Siswa */}
        <div>
          <h4 className="font-bold text-xs uppercase mb-2">
            A. Rekapitulasi Nilai Peserta Didik &amp; Tindak Lanjut
          </h4>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-1.5 w-8">No</th>
                <th className="border border-black p-1.5 w-14">NIPD</th>
                <th className="border border-black p-1.5">Nama Peserta Didik</th>
                <th className="border border-black p-1.5 w-16">Skor</th>
                <th className="border border-black p-1.5 w-16">Nilai</th>
                <th className="border border-black p-1.5 w-28">Status KKTP</th>
                <th className="border border-black p-1.5">Tindak Lanjut (Remedial / Pengayaan)</th>
              </tr>
            </thead>
            <tbody>
              {gradedRows.map((row, idx) => (
                <tr key={row.student.nipd} className="avoid-break">
                  <td className="border border-black p-1.5 text-center font-mono">{idx + 1}</td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {row.student.nipd}
                  </td>
                  <td className="border border-black p-1.5 font-semibold">{row.student.nama}</td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {row.hasAnyInput ? `${row.totalSkor}/${totalMaxScore}` : '-'}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {row.hasAnyInput ? row.nilaiAkhir : '-'}
                  </td>
                  <td className="border border-black p-1.5 text-center font-semibold">
                    {row.statusKKTP}
                  </td>
                  <td className="border border-black p-1.5">{row.tindakLanjut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tabel 2: Analisis Kualitas Butir Soal */}
        <div>
          <h4 className="font-bold text-xs uppercase mb-2">
            B. Ringkasan Analisis Kualitas Butir Soal
          </h4>
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-1.5 w-12">No Soal</th>
                <th className="border border-black p-1.5 w-16">Bloom</th>
                <th className="border border-black p-1.5">Materi Pokok</th>
                <th className="border border-black p-1.5 w-24">Kesukaran (P)</th>
                <th className="border border-black p-1.5 w-24">Daya Beda (D)</th>
                <th className="border border-black p-1.5">Rekomendasi</th>
              </tr>
            </thead>
            <tbody>
              {itemAnalysis.map((item) => (
                <tr key={item.question.nomor} className="avoid-break">
                  <td className="border border-black p-1.5 text-center font-mono font-bold">
                    {item.question.nomor}
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {item.question.bloom}
                  </td>
                  <td className="border border-black p-1.5">{item.question.materi}</td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {item.difficultyIndex.toFixed(2)} ({item.difficultyLabel})
                  </td>
                  <td className="border border-black p-1.5 text-center font-mono">
                    {item.discriminationIndex.toFixed(2)} ({item.discriminationLabel})
                  </td>
                  <td className="border border-black p-1.5">{item.recommendation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pengesahan */}
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
                  Guru Pengampu
                  <div className="h-16" />
                  <p className="font-bold underline">{config.guruNama}</p>
                  <p>NIP. {config.guruNip}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
