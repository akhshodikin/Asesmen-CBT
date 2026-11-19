import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDefaultCrestDataUrl } from '../components/KopNaskah';
import type { AssessmentConfig, QuestionItem, SchoolProfile } from '../types';

export interface PdfStudentRow {
  no: number;
  nipd: string;
  nama: string;
  hasAnyInput: boolean;
  totalSkor: number;
  nilaiAkhir: number;
  predikat: string;
  statusKKTP: 'Tuntas' | 'Perlu Remedial' | 'Belum Dinilai';
  tindakLanjut: string;
}

export interface PdfBloomRow {
  code: string;
  questionCount: number;
  percent: number;
}

export interface PdfItemAnalysisRow {
  question: QuestionItem;
  avgScore: number;
  difficultyIndex: number;
  difficultyLabel: string;
  discriminationIndex: number;
  discriminationLabel: string;
  recommendation: string;
}

export interface PdfClassAnalytics {
  evaluatedCount: number;
  totalStudents: number;
  average: number;
  highest: number;
  lowest: number;
  tuntasCount: number;
  remedialCount: number;
  tuntasPercent: number;
}

export interface ExportAnalisisPDFParams {
  schoolProfile: SchoolProfile;
  config: AssessmentConfig;
  selectedKelas: string;
  filterAgama: string;
  kktp: number;
  totalMaxScore: number;
  classAnalytics: PdfClassAnalytics;
  gradedRows: PdfStudentRow[];
  bloomMastery: PdfBloomRow[];
  itemAnalysis: PdfItemAnalysisRow[];
}

function rasterizeToPngDataUrl(src: string, size = 160): Promise<string | null> {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ratio = img.width > 0 && img.height > 0 ? img.width / img.height : 1;
        canvas.width = ratio >= 1 ? size : Math.round(size * ratio);
        canvas.height = ratio >= 1 ? Math.round(size / ratio) : size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function getLastTableFinalY(doc: jsPDF, fallbackY: number): number {
  const internal = doc as unknown as { lastAutoTable?: { finalY?: number } };
  return internal.lastAutoTable?.finalY ?? fallbackY;
}

export async function exportAnalisisHasilPDF({
  schoolProfile,
  config,
  selectedKelas,
  filterAgama,
  kktp,
  totalMaxScore,
  classAnalytics,
  gradedRows,
  bloomMastery,
  itemAnalysis,
}: ExportAnalisisPDFParams): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 12;

  // Rasterize Logos cleanly for jsPDF
  const leftLogoPng = schoolProfile.tampilkanLogoKiri
    ? await rasterizeToPngDataUrl(schoolProfile.logoKiri || getDefaultCrestDataUrl(), 180)
    : null;
  const rightLogoPng =
    schoolProfile.tampilkanLogoKanan && schoolProfile.logoKanan
      ? await rasterizeToPngDataUrl(schoolProfile.logoKanan, 180)
      : null;

  // --- KOP NASKAH RESMI ---
  const logoBoxSize = 18;
  const kopStartY = cursorY;

  if (leftLogoPng) {
    doc.addImage(leftLogoPng, 'PNG', marginX, kopStartY + 1, logoBoxSize, logoBoxSize);
  }
  if (rightLogoPng) {
    doc.addImage(
      rightLogoPng,
      'PNG',
      pageWidth - marginX - logoBoxSize,
      kopStartY + 1,
      logoBoxSize,
      logoBoxSize
    );
  }

  const isLeftAlign = schoolProfile.perataanKop === 'left';
  const textCenterX = pageWidth / 2;
  const textLeftX = leftLogoPng ? marginX + logoBoxSize + 5 : marginX;
  const textAnchorX = isLeftAlign ? textLeftX : textCenterX;
  const textAlignOption: 'left' | 'center' = isLeftAlign ? 'left' : 'center';
  const kopMaxWidth =
    contentWidth -
    (leftLogoPng ? logoBoxSize + 6 : 0) -
    (rightLogoPng ? logoBoxSize + 6 : isLeftAlign ? 0 : leftLogoPng ? logoBoxSize + 6 : 0);

  let kopTextY = kopStartY + 4;
  doc.setTextColor(15, 23, 42);

  if (schoolProfile.namaInstansiAtas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(schoolProfile.namaInstansiAtas.toUpperCase(), textAnchorX, kopTextY, {
      align: textAlignOption,
      maxWidth: kopMaxWidth,
    });
    kopTextY += 4.2;
  }

  if (schoolProfile.namaDinas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(schoolProfile.namaDinas.toUpperCase(), textAnchorX, kopTextY, {
      align: textAlignOption,
      maxWidth: kopMaxWidth,
    });
    kopTextY += 4.6;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(schoolProfile.namaSekolahHeader.toUpperCase(), textAnchorX, kopTextY, {
    align: textAlignOption,
    maxWidth: kopMaxWidth,
  });
  kopTextY += 4.5;

  if (schoolProfile.alamatLengkap) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(schoolProfile.alamatLengkap, textAnchorX, kopTextY, {
      align: textAlignOption,
      maxWidth: kopMaxWidth,
    });
    kopTextY += 3.6;
  }

  const extraMeta = [
    schoolProfile.npsn ? `NPSN: ${schoolProfile.npsn}` : '',
    schoolProfile.akreditasi ? `Akreditasi ${schoolProfile.akreditasi}` : '',
    schoolProfile.kontakInfo || '',
  ]
    .filter(Boolean)
    .join(' · ');

  if (extraMeta) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(extraMeta, textAnchorX, kopTextY, {
      align: textAlignOption,
      maxWidth: kopMaxWidth,
    });
    kopTextY += 3.5;
  }

  const kopBottomY = Math.max(kopStartY + logoBoxSize + 3, kopTextY + 1);
  doc.setDrawColor(15, 23, 42);
  if (schoolProfile.gayaGarisKop === 'double') {
    doc.setLineWidth(0.75);
    doc.line(marginX, kopBottomY, pageWidth - marginX, kopBottomY);
    doc.setLineWidth(0.25);
    doc.line(marginX, kopBottomY + 1.1, pageWidth - marginX, kopBottomY + 1.1);
  } else if (schoolProfile.gayaGarisKop === 'thick-thin') {
    doc.setLineWidth(0.9);
    doc.line(marginX, kopBottomY, pageWidth - marginX, kopBottomY);
  } else {
    doc.setLineWidth(0.35);
    doc.line(marginX, kopBottomY, pageWidth - marginX, kopBottomY);
  }

  cursorY = kopBottomY + 7;

  // --- JUDUL LAPORAN ---
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('LAPORAN PENILAIAN DAN ANALISIS HASIL BELAJAR', pageWidth / 2, cursorY, {
    align: 'center',
  });
  cursorY += 4.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text(
    `${config.jenisAsesmen.toUpperCase()} · TAHUN PELAJARAN ${config.tahunPelajaran}`,
    pageWidth / 2,
    cursorY,
    { align: 'center' }
  );
  cursorY += 7;

  // --- METADATA ASESMEN (2 KOLOM) ---
  doc.setFontSize(8.5);
  const leftColX = marginX;
  const rightColX = pageWidth / 2 + 4;

  const drawMetaLine = (x: number, y: number, label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(label, x, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(`: ${value}`, x + 31, y, { maxWidth: contentWidth / 2 - 34 });
  };

  drawMetaLine(leftColX, cursorY, 'Mata Pelajaran', config.mapel);
  drawMetaLine(
    rightColX,
    cursorY,
    'Kelas / Filter',
    `${selectedKelas} (${config.fase})${filterAgama !== 'SEMUA' ? ` · ${filterAgama}` : ''}`
  );
  cursorY += 4.5;

  drawMetaLine(leftColX, cursorY, 'Guru Pengampu', config.guruNama);
  drawMetaLine(
    rightColX,
    cursorY,
    'KKTP / Skor Maks',
    `${kktp} / ${totalMaxScore} Poin`
  );
  cursorY += 6.5;

  // --- KOTAK RINGKASAN STATISTIK HASIL BELAJAR ---
  const boxGap = 3;
  const boxWidth = (contentWidth - boxGap * 3) / 4;
  const boxHeight = 16;

  const kpiCards = [
    {
      label: 'Rata-Rata Nilai Kelas',
      value: `${classAnalytics.average}`,
      sub: `Min ${classAnalytics.lowest} · Maks ${classAnalytics.highest}`,
      accent: [6, 95, 70] as [number, number, number],
    },
    {
      label: `Ketuntasan KKTP (>= ${kktp})`,
      value: `${classAnalytics.tuntasPercent}%`,
      sub: `${classAnalytics.tuntasCount} dari ${classAnalytics.evaluatedCount} siswa`,
      accent: [6, 95, 70] as [number, number, number],
    },
    {
      label: 'Peserta Perlu Remedial',
      value: `${classAnalytics.remedialCount} Siswa`,
      sub:
        classAnalytics.evaluatedCount > 0
          ? `${Math.round((classAnalytics.remedialCount / classAnalytics.evaluatedCount) * 100)}% butuh pengulangan`
          : 'Belum ada data',
      accent: [190, 18, 60] as [number, number, number],
    },
    {
      label: 'Cakupan Penilaian',
      value: `${classAnalytics.evaluatedCount} / ${classAnalytics.totalStudents}`,
      sub: 'Peserta didik dinilai',
      accent: [30, 64, 175] as [number, number, number],
    },
  ];

  kpiCards.forEach((card, idx) => {
    const bx = marginX + idx * (boxWidth + boxGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(bx, cursorY, boxWidth, boxHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(71, 85, 105);
    doc.text(card.label, bx + 2.5, cursorY + 4.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(card.accent[0], card.accent[1], card.accent[2]);
    doc.text(card.value, bx + 2.5, cursorY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text(card.sub, bx + 2.5, cursorY + 13.8, { maxWidth: boxWidth - 5 });
  });

  cursorY += boxHeight + 7;

  // --- TABEL A: REKAPITULASI NILAI & STATUS KETUNTASAN SISWA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text('A. Rekapitulasi Nilai Peserta Didik & Status Ketuntasan', marginX, cursorY);
  cursorY += 2.5;

  const studentTableBody = gradedRows.map((row) => [
    String(row.no),
    row.nipd,
    row.nama,
    row.hasAnyInput ? `${row.totalSkor}/${totalMaxScore}` : '-',
    row.hasAnyInput ? String(row.nilaiAkhir) : '-',
    row.predikat,
    row.statusKKTP,
    row.tindakLanjut,
  ]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: marginX, right: marginX },
    head: [
      [
        'No',
        'NIPD',
        'Nama Peserta Didik',
        'Skor',
        'Nilai',
        'Predikat',
        `Status (KKTP ${kktp})`,
        'Tindak Lanjut',
      ],
    ],
    body: studentTableBody,
    foot: [
      [
        '',
        '',
        'RATA-RATA & KETUNTASAN KLASIKAL',
        '',
        String(classAnalytics.average),
        `Min ${classAnalytics.lowest} / Maks ${classAnalytics.highest}`,
        `${classAnalytics.tuntasPercent}% Tuntas`,
        `${classAnalytics.tuntasCount} Tuntas, ${classAnalytics.remedialCount} Remedial`,
      ],
    ],
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [15, 23, 42],
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle',
    },
    headStyles: {
      fillColor: [6, 78, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 13 },
      2: { cellWidth: 42 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 26 },
      6: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
      7: { cellWidth: 'auto' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw || '');
        if (val === 'Tuntas') {
          data.cell.styles.textColor = [6, 95, 70];
          data.cell.styles.fillColor = [236, 253, 245];
        } else if (val === 'Perlu Remedial') {
          data.cell.styles.textColor = [190, 18, 60];
          data.cell.styles.fillColor = [255, 241, 242];
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    },
  });

  cursorY = getLastTableFinalY(doc, cursorY + 20) + 7;

  // --- TABEL B: KETUNTASAN TAKSONOMI BLOOM ---
  if (bloomMastery.length > 0 && classAnalytics.evaluatedCount > 0) {
    if (cursorY > pageHeight - 55) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('B. Ketuntasan Kognitif Per Level Taksonomi Bloom', marginX, cursorY);
    cursorY += 2.5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [['Level Kognitif', 'Jumlah Soal', 'Capaian Rata-Rata (%)', 'Keterangan Ketuntasan']],
      body: bloomMastery.map((b) => [
        `Level ${b.code}`,
        `${b.questionCount} Soal`,
        `${b.percent}%`,
        b.percent >= kktp ? 'Tuntas (Sesuai Target)' : 'Perlu Penguatan Materi',
      ]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 2,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 38, fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
      },
    });

    cursorY = getLastTableFinalY(doc, cursorY + 18) + 7;
  }

  // --- TABEL C: RINGKASAN ANALISIS BUTIR SOAL ---
  if (itemAnalysis.length > 0) {
    if (cursorY > pageHeight - 55) {
      doc.addPage();
      cursorY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('C. Ringkasan Analisis Kualitas Butir Soal', marginX, cursorY);
    cursorY += 2.5;

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [
        [
          'No',
          'Bentuk',
          'Bloom',
          'Materi Pokok',
          'Rata Skor',
          'Kesukaran (P)',
          'Daya Beda (D)',
          'Rekomendasi',
        ],
      ],
      body: itemAnalysis.map((item) => [
        String(item.question.nomor),
        item.question.bentuk,
        item.question.bloom,
        item.question.materi,
        `${item.avgScore}/${item.question.skor}`,
        `${item.difficultyIndex.toFixed(2)} (${item.difficultyLabel})`,
        `${item.discriminationIndex.toFixed(2)} (${item.discriminationLabel})`,
        item.recommendation,
      ]),
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 7.2,
        cellPadding: 1.8,
        textColor: [15, 23, 42],
        lineColor: [203, 213, 225],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 9, fontStyle: 'bold' },
        1: { halign: 'center', cellWidth: 15 },
        2: { halign: 'center', cellWidth: 13 },
        3: { cellWidth: 46 },
        4: { halign: 'center', cellWidth: 17 },
        5: { halign: 'center', cellWidth: 26 },
        6: { halign: 'center', cellWidth: 24 },
        7: { cellWidth: 'auto' },
      },
    });

    cursorY = getLastTableFinalY(doc, cursorY + 20) + 10;
  }

  // --- BLOK PENGESAHAN / TANDA TANGAN ---
  if (cursorY > pageHeight - 44) {
    doc.addPage();
    cursorY = 18;
  }

  const sigLeftX = marginX + 35;
  const sigRightX = pageWidth - marginX - 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);

  doc.text('Mengetahui,', sigLeftX, cursorY, { align: 'center' });
  doc.text(config.tanggalTtd || `${schoolProfile.kotaTtd}, ...`, sigRightX, cursorY, {
    align: 'center',
  });
  cursorY += 4.2;

  doc.text(`Kepala ${schoolProfile.namaSingkat}`, sigLeftX, cursorY, { align: 'center' });
  doc.text('Guru Pengampu', sigRightX, cursorY, { align: 'center' });
  cursorY += 18;

  doc.setFont('helvetica', 'bold');
  doc.text(schoolProfile.kepsekNama, sigLeftX, cursorY, { align: 'center' });
  doc.text(config.guruNama, sigRightX, cursorY, { align: 'center' });
  cursorY += 4.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`NIP. ${schoolProfile.kepsekNip}`, sigLeftX, cursorY, { align: 'center' });
  doc.text(`NIP. ${config.guruNip}`, sigRightX, cursorY, { align: 'center' });

  // --- FOOTER NOMOR HALAMAN ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Laporan Analisis Hasil Belajar · ${schoolProfile.namaSingkat} · ${config.mapel} (${selectedKelas})`,
      marginX,
      pageHeight - 8
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pageWidth - marginX, pageHeight - 8, {
      align: 'right',
    });
  }

  const safeMapel = config.mapel.replace(/[^a-zA-Z0-9]+/g, '_');
  const safeKelas = selectedKelas.replace(/[^a-zA-Z0-9]+/g, '_');
  const safeSchool = schoolProfile.namaSingkat.replace(/[^a-zA-Z0-9]+/g, '_');
  doc.save(`Laporan_Analisis_Hasil_${safeMapel}_${safeKelas}_${safeSchool}.pdf`);
}
