import type { BankQuestionItem, QuestionItem, QuestionShape } from '../types';
import { downloadTextFile } from './exportHelpers';

export interface ParseResult {
  questions: QuestionItem[];
  detectedFormat: 'JSON' | 'Teks / Aiken' | 'CSV / Tabel' | 'Tidak Dikenal';
  totalDetected: number;
  warnings: string[];
  error?: string;
}

/**
 * Normalisasi bentuk soal ke tipe QuestionShape yang valid
 */
export function normalizeQuestionShape(raw?: string): QuestionShape {
  if (!raw) return 'PG';
  const clean = raw.trim().toUpperCase();
  if (clean.includes('KOMPLEKS') || clean === 'PGK') return 'PGK';
  if (clean.includes('ISIAN') || clean.includes('SINGKAT')) return 'Isian';
  if (clean.includes('MENCOCOKKAN') || clean.includes('JODOH') || clean.includes('MATCHING')) return 'Mencocokkan';
  if (clean.includes('URAIAN') || clean.includes('ESAI') || clean.includes('ESSAY')) return 'Uraian';
  return 'PG';
}

/**
 * 1. PARSER FILE JSON
 */
export function parseQuestionsFromJSON(rawContent: string): ParseResult {
  const warnings: string[] = [];
  try {
    const parsed = JSON.parse(rawContent.trim());
    let list: any[] = [];

    if (Array.isArray(parsed)) {
      list = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.questions)) {
        list = parsed.questions;
      } else if (Array.isArray(parsed.bankQuestions)) {
        list = parsed.bankQuestions;
      } else if (Array.isArray(parsed.soal)) {
        list = parsed.soal;
      } else if (parsed.paket && Array.isArray(parsed.paket.questions)) {
        list = parsed.paket.questions;
      } else {
        // Cari properti array pertama di dalam object
        const firstArrayProp = Object.values(parsed).find((v) => Array.isArray(v));
        if (firstArrayProp && Array.isArray(firstArrayProp)) {
          list = firstArrayProp;
        }
      }
    }

    if (!list || list.length === 0) {
      return {
        questions: [],
        detectedFormat: 'JSON',
        totalDetected: 0,
        warnings: ['File JSON tidak berisi daftar butir soal yang dapat dibaca.'],
        error: 'Tidak ditemukan butir soal di dalam file JSON ini.',
      };
    }

    const questions: QuestionItem[] = list.map((item, idx) => {
      const nomor = typeof item.nomor === 'number' ? item.nomor : idx + 1;
      const pertanyaan = String(item.pertanyaan || item.soal || item.question || '').trim();
      const stimulus = String(item.stimulus || item.bacaan || item.wacana || '').trim();
      
      let opsi: string[] = [];
      if (Array.isArray(item.opsi)) {
        opsi = item.opsi.map((o: any) => String(o).trim()).filter(Boolean);
      } else if (Array.isArray(item.options)) {
        opsi = item.options.map((o: any) => String(o).trim()).filter(Boolean);
      } else if (Array.isArray(item.pilihan)) {
        opsi = item.pilihan.map((o: any) => String(o).trim()).filter(Boolean);
      }

      const kunci = String(item.kunci || item.jawaban || item.answer || item.key || '').trim();
      const pembahasan = String(item.pembahasan || item.penjelasan || item.explanation || '').trim();
      const skor = typeof item.skor === 'number' && item.skor > 0 ? item.skor : 10;
      const materi = String(item.materi || item.topik || 'Umum').trim();
      const indikator = String(item.indikator || '').trim();
      const bloom = String(item.bloom || 'C2').trim().toUpperCase();
      const kesulitan = String(item.kesulitan || 'Sedang').trim();
      const dimensi = String(item.dimensi || 'Penalaran Kritis').trim();
      const bentuk = normalizeQuestionShape(item.bentuk || (opsi.length >= 2 ? 'PG' : 'Isian'));

      if (!pertanyaan) {
        warnings.push(`Baris #${idx + 1}: Pertanyaan kosong, disarankan mengisi redaksi soal.`);
      }

      return {
        nomor,
        bentuk,
        stimulus,
        pertanyaan: pertanyaan || `Butir Soal #${nomor}`,
        opsi,
        kunci: kunci || (opsi.length > 0 ? 'A' : ''),
        pembahasan,
        skor,
        materi,
        indikator,
        bloom,
        kesulitan,
        dimensi,
        gambarUrl: item.gambarUrl || undefined,
        gambarDeskripsi: item.gambarDeskripsi || undefined,
      };
    });

    return {
      questions,
      detectedFormat: 'JSON',
      totalDetected: questions.length,
      warnings,
    };
  } catch (err: any) {
    return {
      questions: [],
      detectedFormat: 'JSON',
      totalDetected: 0,
      warnings: [],
      error: `Format JSON tidak valid: ${err.message || 'Kesalahan sintaks JSON.'}`,
    };
  }
}

/**
 * 2. PARSER TEKS STANDAR / FORMAT AIKEN / SOAL GURU
 * Mendukung format:
 * 1. Pertanyaan...
 * A. Opsi 1
 * B. Opsi 2
 * KUNCI: A
 * PEMBAHASAN: ...
 */
export function parseQuestionsFromText(rawText: string): ParseResult {
  const warnings: string[] = [];
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n');

  const questions: QuestionItem[] = [];
  let currentNomor = 1;
  let currentStimulus = '';
  let currentPertanyaan = '';
  let currentOpsi: string[] = [];
  let currentKunci = '';
  let currentPembahasan = '';
  let currentSkor = 10;
  let currentMateri = 'Umum';
  let currentBloom = 'C2';
  let currentBentuk: QuestionShape = 'PG';

  const flushQuestion = () => {
    if (currentPertanyaan.trim() || currentOpsi.length > 0) {
      let finalBentuk: QuestionShape = currentBentuk;
      if (currentOpsi.length === 0 && !finalBentuk) {
        finalBentuk = currentKunci.length > 5 ? 'Uraian' : 'Isian';
      } else if (currentOpsi.length > 0 && finalBentuk === 'Isian') {
        finalBentuk = 'PG';
      }

      questions.push({
        nomor: currentNomor,
        bentuk: finalBentuk,
        stimulus: currentStimulus.trim(),
        pertanyaan: currentPertanyaan.trim() || `Butir Soal #${currentNomor}`,
        opsi: currentOpsi,
        kunci: currentKunci.trim() || (currentOpsi.length > 0 ? 'A' : ''),
        pembahasan: currentPembahasan.trim(),
        skor: currentSkor > 0 ? currentSkor : 10,
        materi: currentMateri,
        indikator: '',
        bloom: currentBloom,
        kesulitan: 'Sedang',
        dimensi: 'Penalaran Kritis',
      });
      currentNomor++;
    }

    // Reset buffer
    currentStimulus = '';
    currentPertanyaan = '';
    currentOpsi = [];
    currentKunci = '';
    currentPembahasan = '';
    currentSkor = 10;
    currentMateri = 'Umum';
    currentBloom = 'C2';
    currentBentuk = 'PG';
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) continue;

    // Deteksi Kunci Jawaban
    const keyMatch = line.match(/^(?:KUNCI(?:\s+JAWABAN)?|ANSWER|JAWABAN|Kunci|KUNCI\s*:)\s*[:=]?\s*(.+)$/i);
    if (keyMatch) {
      currentKunci = keyMatch[1].trim();
      continue;
    }

    // Deteksi Pembahasan
    const expMatch = line.match(/^(?:PEMBAHASAN|PENJELASAN|EXPLANATION|Pembahasan)\s*[:=]?\s*(.+)$/i);
    if (expMatch) {
      currentPembahasan = expMatch[1].trim();
      continue;
    }

    // Deteksi Skor / Poin
    const scoreMatch = line.match(/^(?:SKOR|POIN|BOBOT|Skor)\s*[:=]?\s*(\d+)/i);
    if (scoreMatch) {
      currentSkor = parseInt(scoreMatch[1], 10) || 10;
      continue;
    }

    // Deteksi Bentuk Soal
    const bentukMatch = line.match(/^(?:BENTUK(?:\s+SOAL)?|TIPE)\s*[:=]?\s*(.+)$/i);
    if (bentukMatch) {
      currentBentuk = normalizeQuestionShape(bentukMatch[1]);
      continue;
    }

    // Deteksi Stimulus
    const stimMatch = line.match(/^(?:STIMULUS|WACANA|BACAAN|TEKS)\s*[:=]?\s*(.+)$/i);
    if (stimMatch) {
      currentStimulus = (currentStimulus ? currentStimulus + '\n' : '') + stimMatch[1].trim();
      continue;
    }

    // Deteksi Materi / Topik
    const materiMatch = line.match(/^(?:MATERI|TOPIK)\s*[:=]?\s*(.+)$/i);
    if (materiMatch) {
      currentMateri = materiMatch[1].trim();
      continue;
    }

    // Deteksi Opsi Pilihan (A., B., C., D. atau A), B), C), D) atau 1), 2), dst)
    const optMatch = line.match(/^([A-Ea-e])[\.\)]\s*(.+)$/);
    if (optMatch) {
      const optLetter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      currentOpsi.push(`${optLetter}. ${optText}`);
      continue;
    }

    // Deteksi Awal Nomor Soal Baru (misal: "1. ", "1) ", "Soal 1:", "[1] ")
    const numMatch = line.match(/^(?:(?:SOAL|NO|NOMOR)\s*)?\[?(\d+)\]?[\.\:\)]\s*(.+)$/i);
    if (numMatch && (currentPertanyaan || currentOpsi.length > 0)) {
      // Ada nomor baru dan sudah ada soal sebelumnya yang terkumpul -> simpan soal sebelumnya
      flushQuestion();
      currentPertanyaan = numMatch[2].trim();
      continue;
    } else if (numMatch && !currentPertanyaan && currentOpsi.length === 0) {
      // Ini adalah nomor soal pertama
      currentPertanyaan = numMatch[2].trim();
      continue;
    }

    // Jika belum masuk opsi atau kunci, append ke pertanyaan atau pembahasan
    if (currentPembahasan) {
      currentPembahasan += ' ' + line;
    } else if (currentOpsi.length > 0) {
      // Melanjutkan opsi terakhir
      currentOpsi[currentOpsi.length - 1] += ' ' + line;
    } else if (currentPertanyaan) {
      currentPertanyaan += '\n' + line;
    } else {
      // Mungkin stimulus awal
      currentStimulus = (currentStimulus ? currentStimulus + '\n' : '') + line;
    }
  }

  // Simpan butir terakhir
  flushQuestion();

  if (questions.length === 0) {
    return {
      questions: [],
      detectedFormat: 'Teks / Aiken',
      totalDetected: 0,
      warnings: ['Teks tidak mengandung struktur soal yang dapat dikenali.'],
      error: 'Tidak dapat mendeteksi nomor atau opsi soal dalam teks.',
    };
  }

  return {
    questions,
    detectedFormat: 'Teks / Aiken',
    totalDetected: questions.length,
    warnings,
  };
}

/**
 * 3. PARSER CSV / EXCEL TSV
 */
export function parseQuestionsFromCSV(csvContent: string): ParseResult {
  const warnings: string[] = [];
  const lines = csvContent
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return {
      questions: [],
      detectedFormat: 'CSV / Tabel',
      totalDetected: 0,
      warnings: ['File CSV minimal harus memiliki 1 baris judul dan 1 baris soal.'],
      error: 'Data CSV kosong atau tidak lengkap.',
    };
  }

  // Deteksi delimiter: koma, titik koma, atau tab
  const firstLine = lines[0];
  let delimiter = ',';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if ((firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length) {
    delimiter = ';';
  }

  // Helper split CSV row with quote handling
  const parseCSVLine = (text: string, delim: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delim && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0], delimiter).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Cari index kolom
  const getColIndex = (candidates: string[]): number => {
    return headers.findIndex((h) => candidates.some((cand) => h.includes(cand)));
  };

  const idxSoal = getColIndex(['soal', 'pertanyaan', 'question']);
  const idxStimulus = getColIndex(['stimulus', 'wacana', 'bacaan']);
  const idxBentuk = getColIndex(['bentuk', 'tipe', 'type']);
  const idxOpsiA = getColIndex(['opsia', 'pilihana', 'a']);
  const idxOpsiB = getColIndex(['opsib', 'pilihanb', 'b']);
  const idxOpsiC = getColIndex(['opsic', 'pilihanc', 'c']);
  const idxOpsiD = getColIndex(['opsid', 'pilihand', 'd']);
  const idxKunci = getColIndex(['kunci', 'jawaban', 'answer', 'key']);
  const idxPembahasan = getColIndex(['pembahasan', 'penjelasan', 'explanation']);
  const idxSkor = getColIndex(['skor', 'score', 'poin']);
  const idxMateri = getColIndex(['materi', 'topik', 'topic']);

  if (idxSoal === -1) {
    return {
      questions: [],
      detectedFormat: 'CSV / Tabel',
      totalDetected: 0,
      warnings: ['Header CSV harus memuat kolom "Soal" atau "Pertanyaan".'],
      error: 'Kolom "Soal" tidak ditemukan pada header CSV.',
    };
  }

  const questions: QuestionItem[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i], delimiter);
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const pertanyaan = cols[idxSoal] || '';
    if (!pertanyaan) continue;

    const stimulus = idxStimulus !== -1 ? cols[idxStimulus] || '' : '';
    const rawBentuk = idxBentuk !== -1 ? cols[idxBentuk] : '';

    const opsi: string[] = [];
    if (idxOpsiA !== -1 && cols[idxOpsiA]) opsi.push(`A. ${cols[idxOpsiA].replace(/^[A-Da-d][\.\)]\s*/, '')}`);
    if (idxOpsiB !== -1 && cols[idxOpsiB]) opsi.push(`B. ${cols[idxOpsiB].replace(/^[A-Da-d][\.\)]\s*/, '')}`);
    if (idxOpsiC !== -1 && cols[idxOpsiC]) opsi.push(`C. ${cols[idxOpsiC].replace(/^[A-Da-d][\.\)]\s*/, '')}`);
    if (idxOpsiD !== -1 && cols[idxOpsiD]) opsi.push(`D. ${cols[idxOpsiD].replace(/^[A-Da-d][\.\)]\s*/, '')}`);

    const kunci = idxKunci !== -1 ? cols[idxKunci] || '' : (opsi.length > 0 ? 'A' : '');
    const pembahasan = idxPembahasan !== -1 ? cols[idxPembahasan] || '' : '';
    const skorRaw = idxSkor !== -1 ? parseInt(cols[idxSkor], 10) : 10;
    const skor = Number.isFinite(skorRaw) && skorRaw > 0 ? skorRaw : 10;
    const materi = idxMateri !== -1 && cols[idxMateri] ? cols[idxMateri] : 'Umum';
    const bentuk = normalizeQuestionShape(rawBentuk || (opsi.length >= 2 ? 'PG' : 'Isian'));

    questions.push({
      nomor: questions.length + 1,
      bentuk,
      stimulus,
      pertanyaan,
      opsi,
      kunci,
      pembahasan,
      skor,
      materi,
      indikator: '',
      bloom: 'C2',
      kesulitan: 'Sedang',
      dimensi: 'Penalaran Kritis',
    });
  }

  return {
    questions,
    detectedFormat: 'CSV / Tabel',
    totalDetected: questions.length,
    warnings,
  };
}

/**
 * Universal Auto Parser:
 * Otomatis mendeteksi apakah JSON, CSV, atau Teks Aiken
 */
export function autoParseQuestions(rawText: string): ParseResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      questions: [],
      detectedFormat: 'Tidak Dikenal',
      totalDetected: 0,
      warnings: [],
      error: 'Teks atau file yang diberikan kosong.',
    };
  }

  // 1. Cek apakah JSON
  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'))
  ) {
    const jsonRes = parseQuestionsFromJSON(trimmed);
    if (!jsonRes.error && jsonRes.questions.length > 0) {
      return jsonRes;
    }
  }

  // 2. Cek apakah CSV (memiliki header khas soal dan pembatas koma/titik-koma/tab)
  const firstLine = trimmed.split('\n')[0].toLowerCase();
  if (
    firstLine.includes('soal') ||
    firstLine.includes('pertanyaan') ||
    firstLine.includes('question') ||
    (firstLine.includes('kunci') && firstLine.includes(','))
  ) {
    const csvRes = parseQuestionsFromCSV(trimmed);
    if (!csvRes.error && csvRes.questions.length > 0) {
      return csvRes;
    }
  }

  // 3. Fallback ke Parser Teks Standar / Aiken
  return parseQuestionsFromText(trimmed);
}

/**
 * DOWNLOAD TEMPLATE SOAL (JSON, TXT, CSV)
 */
export function downloadQuestionTemplateJSON(): void {
  const sample = [
    {
      nomor: 1,
      bentuk: 'PG',
      stimulus: 'Masyarakat suku Tengger di wilayah Tosari hidup berdampingan secara harmonis.',
      pertanyaan: 'Sila Pancasila yang paling mencerminkan nilai toleransi dan kerukunan antarumat beragama adalah...',
      opsi: [
        'A. Sila Pertama: Ketuhanan Yang Maha Esa',
        'B. Sila Kedua: Kemanusiaan yang Adil dan Beradab',
        'C. Sila Ketiga: Persatuan Indonesia',
        'D. Sila Kelima: Keadilan Sosial bagi Seluruh Rakyat Indonesia'
      ],
      kunci: 'A',
      pembahasan: 'Nilai toleransi dan saling menghormati antarumat beragama bersumber dari Sila Pertama Pancasila.',
      skor: 10,
      materi: 'Nilai-Nilai Pancasila',
      bloom: 'C2',
      kesulitan: 'Mudah'
    },
    {
      nomor: 2,
      bentuk: 'PGK',
      stimulus: 'Perhatikan sumber energi di lereng Gunung Bromo berikut!',
      pertanyaan: 'Manakah yang termasuk sumber energi terbarukan ramah lingkungan? (Pilih semua yang benar)',
      opsi: [
        'A. Tenaga Surya (Matahari)',
        'B. Tenaga Angin Pegunungan',
        'C. Batu Bara',
        'D. Bahan Bakar Minyak Bumi'
      ],
      kunci: 'A, B',
      pembahasan: 'Tenaga surya dan angin merupakan energi terbarukan yang tidak habis dipakai.',
      skor: 15,
      materi: 'Energi Terbarukan',
      bloom: 'C3',
      kesulitan: 'Sedang'
    },
    {
      nomor: 3,
      bentuk: 'Isian',
      stimulus: '',
      pertanyaan: 'Nama tarian adat tradisional khas suku Tengger di wilayah Bromo Pasuruan adalah Tari...',
      opsi: [],
      kunci: 'Sodoran',
      pembahasan: 'Tari Sodoran adalah tarian sakral adat suku Tengger yang dipentaskan pada perayaan Yadnya Karo.',
      skor: 15,
      materi: 'Kearifan Lokal Tengger',
      bloom: 'C1',
      kesulitan: 'Sedang'
    },
    {
      nomor: 4,
      bentuk: 'Uraian',
      stimulus: 'Kawasan Tosari Pasuruan memiliki keanekaragaman flora dan pertanian sayuran pegunungan yang subur.',
      pertanyaan: 'Jelaskan dua upaya yang dapat dilakukan siswa untuk menjaga kelestarian lingkungan dan mencegah erosi di lereng perbukitan!',
      opsi: [],
      kunci: 'Menanam pohon perindang (reboisasi) dan membuat terasering/sengkedan pada lahan miring.',
      pembahasan: 'Terasering menahan aliran air hujan dan reboisasi memperkuat daya ikat tanah.',
      skor: 20,
      materi: 'Pelestarian Lingkungan',
      bloom: 'C4',
      kesulitan: 'Sukar'
    }
  ];

  downloadTextFile(
    JSON.stringify(sample, null, 2),
    'Template_Bank_Soal_SDN_Kandangan_I.json',
    'application/json;charset=utf-8'
  );
}

export function downloadQuestionTemplateTXT(): void {
  const sample = `1. Sila Pancasila yang paling mencerminkan nilai toleransi dan kerukunan antarumat beragama adalah...
A. Sila Pertama: Ketuhanan Yang Maha Esa
B. Sila Kedua: Kemanusiaan yang Adil dan Beradab
C. Sila Ketiga: Persatuan Indonesia
D. Sila Kelima: Keadilan Sosial bagi Seluruh Rakyat Indonesia
KUNCI: A
PEMBAHASAN: Nilai toleransi dan saling menghormati antarumat beragama bersumber dari Sila Pertama Pancasila.
SKOR: 10
MATERI: Nilai-Nilai Pancasila

2. Perhatikan sumber daya alam berikut:
Manakah yang termasuk sumber energi terbarukan ramah lingkungan?
A. Tenaga Surya
B. Tenaga Angin
C. Batu Bara
D. Minyak Bumi
KUNCI: A
PEMBAHASAN: Tenaga surya dan angin merupakan energi yang terbarukan dan ramah lingkungan.
SKOR: 10
MATERI: Energi Terbarukan

3. Nama tarian adat tradisional khas suku Tengger di lereng Gunung Bromo adalah Tari...
KUNCI: Sodoran
PEMBAHASAN: Tari Sodoran dipentaskan pada upacara Yadnya Karo suku Tengger.
SKOR: 15
BENTUK: Isian
MATERI: Kearifan Lokal Tengger

4. Jelaskan 2 upaya nyata yang dapat dilakukan siswa untuk menjaga kelestarian tanah di lereng perbukitan Tosari!
KUNCI: Menanam pohon (reboisasi) dan membuat terasering/sengkedan pada lahan pertanian miring.
PEMBAHASAN: Reboisasi memperkuat struktur tanah dan terasering mencegah erosi air hujan.
SKOR: 20
BENTUK: Uraian
MATERI: Pelestarian Lingkungan
`;

  downloadTextFile(sample, 'Template_Bank_Soal_Format_Aiken.txt', 'text/plain;charset=utf-8');
}

export function downloadQuestionTemplateCSV(): void {
  const headers = ['No', 'Bentuk', 'Stimulus', 'Pertanyaan', 'Opsi A', 'Opsi B', 'Opsi C', 'Opsi D', 'Kunci', 'Pembahasan', 'Skor', 'Materi'];
  const sampleRows = [
    ['1', 'PG', 'Masyarakat suku Tengger hidup rukun.', 'Sila yang mencerminkan kerukunan antarumat beragama adalah...', 'Ketuhanan Yang Maha Esa', 'Kemanusiaan yang Adil', 'Persatuan Indonesia', 'Keadilan Sosial', 'A', 'Sila Pertama menekankan toleransi beragama.', '10', 'Pancasila'],
    ['2', 'PG', '', 'Ibukota Provinsi Jawa Timur adalah...', 'Malang', 'Surabaya', 'Pasuruan', 'Probolinggo', 'B', 'Surabaya adalah pusat pemerintahan Jawa Timur.', '10', 'Geografi'],
    ['3', 'Isian', '', 'Tarian adat sakral suku Tengger dinamakan Tari...', '', '', '', '', 'Sodoran', 'Tari Sodoran ditampilkan saat hari raya Karo.', '15', 'Budaya Lokal'],
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...sampleRows.map((r) =>
        r.map((col) => (col.includes(' ') || col.includes(',') || col.includes('"') ? `"${col.replace(/"/g, '""')}"` : col)).join(',')
      ),
    ].join('\r\n');

  downloadTextFile(csvContent, 'Template_Bank_Soal_Excel.csv', 'text/csv;charset=utf-8');
}

/**
 * Konversi BankQuestionItem / QuestionItem ke format BankQuestionItem untuk disimpan
 */
export function convertToBankQuestions(
  items: QuestionItem[],
  mapel: string,
  kelas: string,
  sumber = 'Upload File'
): BankQuestionItem[] {
  const now = new Date().toISOString();
  return items.map((q, idx) => ({
    ...q,
    id: `BANK-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    nomor: idx + 1,
    mapel: mapel || 'Pendidikan Pancasila',
    kelas: kelas || 'Kelas 5',
    sumber: sumber as any,
    createdAt: now,
  }));
}
