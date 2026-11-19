import type { AssessmentConfig, CBTSubmission, QuestionItem, Student } from '../types';

export function exportWordDocument(elementId: string, filename: string): void {
  const el = document.getElementById(elementId);
  if (!el) return;

  const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>${filename}</title>
  <style>
    body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.4; color: #000; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 12pt; }
    th, td { border: 1px solid #000; padding: 6px 8px; font-size: 11pt; vertical-align: top; }
    .no-border td, .no-border th { border: none !important; }
    h1, h2, h3, h4 { margin: 4pt 0; text-align: center; }
    .kop-header { border-bottom: 3px double #000; padding-bottom: 8px; margin-bottom: 14px; text-align: center; }
  </style>
  </head><body>`;
  const footer = '</body></html>';
  const sourceHTML = header + el.innerHTML + footer;

  const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = 'text/plain;charset=utf-8'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportKisiKisiCSV(questions: QuestionItem[], config: AssessmentConfig): void {
  const headers = [
    'No',
    'Bentuk Soal',
    'Materi Pokok',
    'Indikator Soal',
    '8 Dimensi Lulusan',
    'Level Taksonomi Bloom',
    'Tingkat Kesulitan',
    'Kunci Jawaban',
    'Skor',
  ];
  const rows = questions.map((q) => [
    q.nomor,
    `"${q.bentuk}"`,
    `"${(q.materi || '').replace(/"/g, '""')}"`,
    `"${(q.indikator || '').replace(/"/g, '""')}"`,
    `"${(q.dimensi || '').replace(/"/g, '""')}"`,
    `"${q.bloom}"`,
    `"${q.kesulitan}"`,
    `"${(q.kunci || '').replace(/"/g, '""')}"`,
    q.skor,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadTextFile(
    csvContent,
    `Kisi_Kisi_${config.mapel}_${config.kelas}_SDN_Kandangan_I.csv`,
    'text/csv;charset=utf-8'
  );
}

export function exportRekapCBTCSV(submissions: CBTSubmission[], config: AssessmentConfig): void {
  const headers = [
    'No',
    'Waktu Selesai',
    'NIPD',
    'NISN',
    'Nama Siswa',
    'Kelas',
    'Agama',
    'Mata Pelajaran',
    'Skor Perolehan',
    'Skor Maksimal',
    'Nilai Akhir',
    'Ketuntasan Taksonomi Bloom',
  ];
  const rows = submissions.map((s, idx) => [
    idx + 1,
    `"${s.waktuSelesai}"`,
    `"${s.nipd}"`,
    `"${s.nisn}"`,
    `"${s.nama}"`,
    `"${s.kelas}"`,
    `"${s.agama}"`,
    `"${s.mapel}"`,
    s.skorPerolehan,
    s.skorMaksimal,
    s.nilaiAkhir,
    `"${s.detailBloom}"`,
  ]);
  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadTextFile(
    csvContent,
    `Rekap_Nilai_CBT_${config.mapel}_${config.kelas}_SDN_Kandangan_I.csv`,
    'text/csv;charset=utf-8'
  );
}

export function exportQuizizzCSV(questions: QuestionItem[], config: AssessmentConfig): void {
  const headers = [
    'Question Text',
    'Question Type',
    'Option 1',
    'Option 2',
    'Option 3',
    'Option 4',
    'Correct Answer',
    'Time in seconds',
  ];
  const rows = questions.map((q) => {
    const fullQ = `${q.stimulus ? q.stimulus + ' - ' : ''}${q.pertanyaan}`.replace(/"/g, '""');
    if (q.bentuk === 'PG') {
      const opts = [0, 1, 2, 3].map((i) =>
        (q.opsi?.[i] || '').replace(/^[A-D]\.\s*/, '').replace(/"/g, '""')
      );
      const keyChar = (q.kunci || 'A').trim().toUpperCase().charAt(0);
      const keyIndex = Math.max(1, keyChar.charCodeAt(0) - 64);
      return [`"${fullQ}"`, 'Multiple Choice', `"${opts[0]}"`, `"${opts[1]}"`, `"${opts[2]}"`, `"${opts[3]}"`, keyIndex, 60].join(',');
    }
    return [`"${fullQ}"`, 'Open-Ended', `"${(q.kunci || '').replace(/"/g, '""')}"`, '""', '""', '""', 1, 120].join(',');
  });
  const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r)].join('\n');
  downloadTextFile(csv, `Import_Quizizz_CBT_${config.mapel}_${config.kelas}.csv`, 'text/csv;charset=utf-8');
}

export function buildAikenFormat(questions: QuestionItem[]): string {
  const pgOnly = questions.filter((q) => q.bentuk === 'PG');
  return pgOnly
    .map((q) => {
      const stim = q.stimulus ? `${q.stimulus.replace(/\r?\n/g, ' ')} ` : '';
      const lines = [`${stim}${q.pertanyaan.replace(/\r?\n/g, ' ')}`];
      (q.opsi || []).forEach((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const cleanOpt = opt.replace(/^[A-Da-d][.)]\s*/, '');
        lines.push(`${letter}. ${cleanOpt}`);
      });
      const cleanKey = (q.kunci || 'A').trim().toUpperCase().charAt(0);
      lines.push(`ANSWER: ${cleanKey}`);
      return lines.join('\n');
    })
    .join('\n\n');
}

export function buildGoogleAppsScript(
  questions: QuestionItem[],
  students: Student[],
  config: AssessmentConfig,
  includeStudentDropdown: boolean,
  shuffleQuestions: boolean,
  autoCreateSheet = true,
  organizeInDriveFolder = true,
  customFormTitle?: string
): string {
  const classStudents = students.filter((s) => s.kelas === config.kelas);
  const studentListStrings = classStudents.map(
    (s) => `${s.no}. ${s.nama} (NIPD: ${s.nipd} | NISN: ${s.nisn})`
  );

  const serializedQuestions = JSON.stringify(questions, null, 2);
  const serializedStudents = JSON.stringify(studentListStrings, null, 2);

  const defaultTitle = `${config.jenisAsesmen} - ${config.mapel} (${config.kelas})`;
  const resolvedFormTitle = customFormTitle ? `${customFormTitle} - SDN KANDANGAN I TOSARI` : `${defaultTitle} - SDN KANDANGAN I TOSARI`;
  const resolvedSheetTitle = `REKAP NILAI — ${customFormTitle || defaultTitle}`;

  return `/**
 * ============================================================================
 * SMART ASESMEN — GENERATOR GOOGLE FORM & REKAP GOOGLE SHEETS OTOMATIS
 * SDN KANDANGAN I TOSARI (KECAMATAN TOSARI, KABUPATEN PASURUAN)
 * ============================================================================
 * Mata Pelajaran : ${config.mapel}
 * Kelas / Fase   : ${config.kelas} (${config.fase})
 * Jenis Asesmen  : ${config.jenisAsesmen} — TP ${config.tahunPelajaran}
 * Judul Paket    : ${customFormTitle || defaultTitle}
 * Guru Pengampu  : ${config.guruNama} (NIP. ${config.guruNip})
 * Kepala Sekolah : ${config.kepsekNama} (NIP. ${config.kepsekNip})
 *
 * FITUR OTOMATIS:
 * 1. Membuat Google Form Kuis lengkap (Kunci, Pembahasan, Skor, & Dropdown Siswa).
 * 2. Membuat Google Spreadsheet Rekap Nilai secara otomatis di Google Drive.
 * 3. Menghubungkan Google Form ke Google Sheet (Respons ujian siswa otomatis masuk).
 * 4. Menyimpan file ke dalam folder Google Drive "SMART ASESMEN - SDN KANDANGAN I TOSARI".
 *
 * CARA PENGGUNAAN:
 * 1. Buka https://script.google.com lalu klik "Project Baru" (New Project).
 * 2. Hapus kode yang ada, lalu Paste (Tempel) seluruh kode ini.
 * 3. Klik tombol "Simpan" (ikon disket) lalu klik tombol "Jalankan" (Run).
 * 4. Berikan izin akses Google (Review Permissions -> Pilih Akun Google -> Advanced -> Allow).
 * 5. Buka link Form & Google Sheet pada bagian "Execution Log" di bawah layar!
 * ============================================================================
 */

function buatGoogleFormDanRekapSheetOtomatis() {
  var mapel = "${config.mapel}";
  var kelas = "${config.kelas}";
  var tahun = "${config.tahunPelajaran}";
  var jenis = "${config.jenisAsesmen}";
  var tokenUjian = "${config.tokenCBT}";

  var formTitle = ${JSON.stringify(resolvedFormTitle)};
  var sheetTitle = ${JSON.stringify(resolvedSheetTitle)};
  var folderName = "SMART ASESMEN - SDN KANDANGAN I TOSARI";

  var formDesc = "SDN KANDANGAN I TOSARI\\n" +
                 "Dinas Pendidikan dan Kebudayaan Kabupaten Pasuruan\\n" +
                 "Mata Pelajaran: " + mapel + " | Kelas: " + kelas + " (" + "${config.fase}" + ")\\n" +
                 "Guru Pengampu: ${config.guruNama}\\n" +
                 "Waktu Pengerjaan: ${config.waktu}\\n" +
                 "Petunjuk: Berdoalah sebelum mengerjakan dan pilihlah jawaban yang paling tepat!";

  // 1. BUAT GOOGLE FORM KUIS
  var form = FormApp.create(formTitle);
  form.setDescription(formDesc);
  form.setIsQuiz(true);
  form.setShuffleQuestions(${shuffleQuestions ? 'true' : 'false'});
  form.setCollectEmail(false);
  form.setConfirmationMessage("Terima kasih! Jawaban Asesmen ananda di SDN Kandangan I Tosari telah berhasil direkam ke Google Sheets guru.");

  // --- BAGIAN 1: IDENTITAS PESERTA DIDIK ---
  form.addSectionHeaderItem()
      .setTitle("IDENTITAS PESERTA DIDIK (" + kelas.toUpperCase() + ")")
      .setHelpText("Pilih Nama Lengkap sesuai daftar siswa SDN Kandangan I Tosari.");

  ${
    includeStudentDropdown
      ? `var daftarSiswa = ${serializedStudents};
  var itemNama = form.addListItem();
  itemNama.setTitle("Nama Lengkap Peserta Didik (" + kelas + ")")
          .setChoiceValues(daftarSiswa)
          .setRequired(true);`
      : `var itemNama = form.addTextItem();
  itemNama.setTitle("Nama Lengkap Peserta Didik")
          .setRequired(true);`
  }

  var itemToken = form.addTextItem();
  itemToken.setTitle("Token Ujian CBT")
           .setHelpText("Masukkan Token Ujian dari Bapak/Ibu Guru (Token: " + tokenUjian + ")")
           .setRequired(true);

  // --- BAGIAN 2: BUTIR SOAL ASESMEN ---
  form.addPageBreakItem()
      .setTitle("SOAL ASESMEN " + mapel.toUpperCase() + " (" + kelas.toUpperCase() + ")")
      .setHelpText("Kerjakan seluruh soal di bawah ini dengan teliti, mandiri, dan jujur!");

  var bankSoal = ${serializedQuestions};

  for (var i = 0; i < bankSoal.length; i++) {
    var q = bankSoal[i];

    // Sisipkan Gambar / Stimulus Visual ke Google Form jika tersedia
    if (q.gambarUrl && q.gambarUrl.indexOf("http") === 0) {
      try {
        var imgResp = UrlFetchApp.fetch(q.gambarUrl);
        var imgItem = form.addImageItem();
        imgItem.setImage(imgResp.getBlob())
               .setTitle(q.gambarDeskripsi || ("Ilustrasi Stimulus Soal Nomor " + q.nomor));
      } catch (imgErr) {
        Logger.log("Info Gambar Soal Nomor " + q.nomor + ": " + imgErr.message);
      }
    }

    var teksSoal = "Soal Nomor " + q.nomor + " [" + q.bloom + " - " + q.kesulitan + "]\\n";
    if (q.stimulus && q.stimulus.trim() !== "") {
      teksSoal += q.stimulus + "\\n\\n";
    }
    teksSoal += q.pertanyaan;

    if (q.bentuk === "PG" && q.opsi && q.opsi.length > 0) {
      var mcItem = form.addMultipleChoiceItem();
      mcItem.setTitle(teksSoal)
            .setPoints(Number(q.skor) || 1)
            .setRequired(true);

      var choices = [];
      var kunciHuruf = (q.kunci || "A").trim().toUpperCase().charAt(0);

      for (var j = 0; j < q.opsi.length; j++) {
        var optText = q.opsi[j];
        var optLetter = String.fromCharCode(65 + j);
        var isCorrect = (optLetter === kunciHuruf);
        choices.push(mcItem.createChoice(optText, isCorrect));
      }
      mcItem.setChoices(choices);

      if (q.pembahasan) {
        var feedback = FormApp.createFeedback().setText(q.pembahasan).build();
        mcItem.setFeedbackForCorrect(feedback);
        mcItem.setFeedbackForIncorrect(feedback);
      }
    } else if (q.bentuk === "PGK" && q.opsi && q.opsi.length > 0) {
      var cbItem = form.addCheckboxItem();
      cbItem.setTitle(teksSoal + " (Pilihan Ganda Kompleks - Centang jawaban yang benar)")
            .setPoints(Number(q.skor) || 2)
            .setRequired(true);

      var cbChoices = [];
      var kunciStr = (q.kunci || "").toLowerCase();
      for (var k = 0; k < q.opsi.length; k++) {
        var cleanOpt = q.opsi[k].replace(/^\\[\\s*\\]\\s*/, "");
        var nomorPernyataan = (k + 1).toString();
        var benar = kunciStr.indexOf(nomorPernyataan) !== -1;
        cbChoices.push(cbItem.createChoice(cleanOpt, benar));
      }
      cbItem.setChoices(cbChoices);
    } else if (q.bentuk === "Isian") {
      var textItem = form.addTextItem();
      textItem.setTitle(teksSoal + " (Isian Singkat - Pedoman Kunci: " + q.kunci + ")")
              .setPoints(Number(q.skor) || 2)
              .setRequired(true);
    } else if (q.bentuk === "Mencocokkan" && q.opsi && q.opsi.length > 0) {
      var gridItem = form.addGridItem();
      var rows = [];
      var cols = [];
      for (var m = 0; m < q.opsi.length; m++) {
        var cleanPair = q.opsi[m].replace(/^\\d+[.)]\\s*/, "");
        var seg = cleanPair.split(/\\s*(?:=>|->|\\|)\\s*/);
        rows.push(seg[0] || ("Pernyataan " + (m + 1)));
        cols.push(seg[1] || ("Pasangan " + (m + 1)));
      }
      gridItem.setTitle(teksSoal + " (Mencocokkan / Menjodohkan)")
              .setRows(rows)
              .setColumns(cols)
              .setRequired(true);
    } else {
      var paraItem = form.addParagraphTextItem();
      paraItem.setTitle(teksSoal + " (Uraian / Esai)")
              .setHelpText("Kunci / Rubrik Guru: " + q.kunci)
              .setPoints(Number(q.skor) || 4)
              .setRequired(true);
    }
  }

  ${
    autoCreateSheet
      ? `// 2. OTOMATIS BUAT GOOGLE SPREADSHEET REKAP NILAI & TAUTKAN KE FORM
  var ss = SpreadsheetApp.create(sheetTitle);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  var sheetUrl = ss.getUrl();`
      : `var sheetUrl = "Tidak dibuat (opsi nonaktif)";`
  }

  ${
    organizeInDriveFolder
      ? `// 3. ORGANISASI FILE KE FOLDER GOOGLE DRIVE
  var driveFolderUrl = "Root Google Drive";
  try {
    var folders = DriveApp.getFoldersByName(folderName);
    var targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    var formFile = DriveApp.getFileById(form.getId());
    formFile.moveTo(targetFolder);
    ${autoCreateSheet ? `var ssFile = DriveApp.getFileById(ss.getId()); ssFile.moveTo(targetFolder);` : ''}
    driveFolderUrl = targetFolder.getUrl();
  } catch (err) {
    Logger.log("Info Folder Drive: " + err.message);
  }`
      : `var driveFolderUrl = "Root Google Drive";`
  }

  // 4. OUTPUT HASIL & TAUTAN RESMI
  Logger.log("==================================================================");
  Logger.log("🎉 SUKSES! GOOGLE FORM & GOOGLE SHEETS REKAP TELAH BERHASIL DIBUAT");
  Logger.log("------------------------------------------------------------------");
  Logger.log("1. 📋 LINK EDIT GOOGLE FORM (GURU)    : " + form.getEditUrl());
  Logger.log("2. 📝 LINK UJIAN SISWA (FORMULIR)     : " + form.getPublishedUrl());
  ${autoCreateSheet ? `Logger.log("3. 📊 LINK REKAP GOOGLE SHEETS (REALTIME): " + sheetUrl);` : ''}
  ${organizeInDriveFolder ? `Logger.log("4. 📁 LINK FOLDER GOOGLE DRIVE        : " + driveFolderUrl);` : ''}
  Logger.log("==================================================================");
}
`;
}

export interface AnalisisStudentRowExport {
  no: number;
  nipd: string;
  nisn: string;
  nama: string;
  agama: string;
  perQuestion: number[];
  totalSkor: number;
  nilaiAkhir: number;
  statusKKTP: string;
  tindakLanjut: string;
}

export function exportAnalisisHasilCSV(
  rows: AnalisisStudentRowExport[],
  questions: QuestionItem[],
  config: AssessmentConfig,
  kelasFilter: string,
  kktp: number
): void {
  const questionHeaders = questions.map((q) => `S${q.nomor} (Maks ${q.skor})`);
  const headers = [
    'No',
    'NIPD',
    'NISN',
    'Nama Peserta Didik',
    'Agama',
    ...questionHeaders,
    'Total Skor',
    'Nilai Akhir',
    `Status KKTP (${kktp})`,
    'Tindak Lanjut',
  ];

  const csvRows = rows.map((r) => [
    r.no,
    `"${r.nipd}"`,
    `"${r.nisn}"`,
    `"${r.nama.replace(/"/g, '""')}"`,
    `"${r.agama}"`,
    ...r.perQuestion,
    r.totalSkor,
    r.nilaiAkhir,
    `"${r.statusKKTP}"`,
    `"${r.tindakLanjut}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
  downloadTextFile(
    csvContent,
    `Analisis_Hasil_${config.mapel}_${kelasFilter}_SDN_Kandangan_I.csv`,
    'text/csv;charset=utf-8'
  );
}
