import type { BankQuestionItem, QuestionItem, QuestionShape } from '../types';
import { downloadTextFile } from './exportHelpers';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Konfigurasi worker PDF.js untuk browser
if (typeof window !== 'undefined' && pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  } catch {
    // ignore
  }
}

/**
 * Ekstraksi teks dari file Word (.docx)
 */
export async function extractTextFromDocx(input: File | ArrayBuffer): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (input instanceof File) {
    arrayBuffer = await input.arrayBuffer();
  } else {
    arrayBuffer = input;
  }
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || '';
}

/**
 * Ekstraksi teks dari file PDF (.pdf)
 */
export async function extractTextFromPDF(input: File | ArrayBuffer): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  if (input instanceof File) {
    arrayBuffer = await input.arrayBuffer();
  } else {
    arrayBuffer = input;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
    });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pagesText: string[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter(Boolean);
      pagesText.push(pageStrings.join(' '));
    }

    return pagesText.join('\n\n');
  } catch (err: any) {
    // Fallback: jika PDF.js gagal atau terblokir worker, gunakan stream text matcher sederhana
    try {
      const uint8 = new Uint8Array(arrayBuffer);
      const textDecoder = new TextDecoder('latin1');
      const raw = textDecoder.decode(uint8);
      const matches = raw.match(/\(([^()]+)\)\s*Tj/g);
      if (matches && matches.length > 0) {
        return matches.map((m) => m.replace(/^\(/, '').replace(/\)\s*Tj$/, '')).join(' ');
      }
    } catch {
      // ignore
    }
    throw new Error(`Gagal membaca file PDF: ${err?.message || 'Format PDF tidak didukung.'}`);
  }
}

/**
 * Ekstraksi teks universal dari berbagai format file:
 * - .docx / .doc
 * - .pdf
 * - .json
 * - .txt / .csv / .tsv
 */
export async function extractTextFromFile(file: File): Promise<{ text: string; detectedFormat: string }> {
  const fileName = file.name.toLowerCase();

  // 1. File Word .docx
  if (fileName.endsWith('.docx')) {
    const text = await extractTextFromDocx(file);
    return { text, detectedFormat: 'Microsoft Word (.docx)' };
  }

  // 2. File PDF .pdf
  if (fileName.endsWith('.pdf')) {
    const text = await extractTextFromPDF(file);
    return { text, detectedFormat: 'Dokumen PDF (.pdf)' };
  }

  // 3. File Word lama .doc
  if (fileName.endsWith('.doc')) {
    try {
      const text = await extractTextFromDocx(file);
      if (text.trim().length > 20) {
        return { text, detectedFormat: 'Microsoft Word (.doc)' };
      }
    } catch {
      // lanjut ke pembaca teks
    }
  }

  // 4. File Teks biasa, JSON, CSV
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result || '');
      let fmt = 'Teks / Aiken';
      if (fileName.endsWith('.json')) fmt = 'JSON';
      else if (fileName.endsWith('.csv')) fmt = 'CSV Excel';
      resolve({ text, detectedFormat: fmt });
    };
    reader.onerror = () => reject(new Error('Gagal membaca file teks.'));
    reader.readAsText(file);
  });
}

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
 * 2. PARSER TEKS STANDAR / FORMAT AIKEN / SOAL DARI WORD & PDF
 * Mendukung berbagai format penulisan soal guru:
 * - Nomor: 1., 1), (1), No. 1, Soal 1:, [1], atau nomor pada baris terpisah (tabel Word)
 * - Opsi: A., a., (A), (a), A), a), A -, atau beberapa opsi dalam 1 baris
 * - Kunci: Kunci: A, Jawaban: A, Answer: A, KUNCI = A, atau di akhir baris (Kunci: A)
 * - Pembahasan & Skor opsional
 */
export function parseQuestionsFromText(rawText: string): ParseResult {
  const warnings: string[] = [];
  if (!rawText || rawText.trim().length === 0) {
    return {
      questions: [],
      detectedFormat: 'Teks / Aiken',
      totalDetected: 0,
      warnings: ['Teks naskah soal kosong.'],
      error: 'Teks kosong.',
    };
  }

  // Tahap 1: Normalisasi karakter khusus dan non-breaking spaces
  const cleanText = rawText
    .replace(/\u00A0/g, ' ')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const rawLines = cleanText.split('\n');

  // Tahap 2: Pra-pemrosesan baris (Pre-processing)
  // Menghubungkan nomor/opsi yang terpisah baris akibat tabel Word/PDF
  const normalizedLines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    let line = rawLines[i].trim();
    if (!line) continue;

    // Abaikan kop surat atau petunjuk umum jika berada di awal dokumen
    if (
      line.match(/^(?:PEMERINTAH|DINAS PENDIDIKAN|KOORDINATOR WILAYAH|SEKOLAH DASAR|SDN KANDANGAN)/i) ||
      line.match(/^(?:PENILAIAN|ASESMEN|SUMATIF|UJIAN|ULANGAN|PTS|PAS|PAT|SAS|SAT)\s+/i) ||
      line.match(/^(?:MATA PELAJARAN|KELAS|HARI|TANGGAL|WAKTU|NAMA|NO\.?\s*ABSEN)\s*[:=]/i) ||
      line.match(/^(?:PETUNJUK UMUM|BERILAH TANDA SILANG|PILIHLAH SALAH SATU JAWABAN YANG PALING BENAR)/i)
    ) {
      continue;
    }

    // Jika baris hanya berisi nomor tunggal (misal: "1.", "1", "(1)", "1)") akibat sel tabel Word
    const standaloneNum = line.match(/^(?:(?:SOAL|NO|NOMOR)\s*)?\[?(\d+)\]?[\.\:\)]?$/i);
    if (standaloneNum && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1].trim();
      if (nextLine && !nextLine.match(/^(?:(?:SOAL|NO|NOMOR)\s*)?\[?(\d+)\]?[\.\:\)]?$/i)) {
        line = `${standaloneNum[1]}. ${nextLine}`;
        i++; // lewati baris berikutnya karena sudah digabung
      }
    }

    // Jika baris hanya berisi huruf opsi tunggal (misal: "A.", "A", "a.") akibat sel tabel Word
    const standaloneOpt = line.match(/^([A-Ea-e])[\.\)]?$/);
    if (standaloneOpt && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1].trim();
      if (nextLine && !nextLine.match(/^([A-Ea-e])[\.\)]?$/)) {
        line = `${standaloneOpt[1].toUpperCase()}. ${nextLine}`;
        i++;
      }
    }

    // Ekstrak jika ada kunci jawaban di ujung baris (misal: "... (Kunci: A)" atau "... [Jawaban: B]")
    const inlineKeyAtEnd = line.match(/[\(\[]\s*(?:KUNCI|JAWABAN|ANSWER)\s*[:=]?\s*([A-Ea-e])\s*[\)\]]$/i);
    if (inlineKeyAtEnd) {
      const extractedKey = inlineKeyAtEnd[1].toUpperCase();
      line = line.replace(inlineKeyAtEnd[0], '').trim();
      normalizedLines.push(line);
      normalizedLines.push(`KUNCI: ${extractedKey}`);
      continue;
    }

    // Jika 1 baris memuat beberapa opsi sekaligus (A. Bintang  B. Rantai  C. Pohon  D. Banteng)
    if (line.match(/[A-Ea-e][\.\)]\s+.+\s+[B-Eb-e][\.\)]\s+/)) {
      const parts = line.split(/\s+(?=[A-Ea-e][\.\)]\s+)/);
      if (parts.length >= 2) {
        for (const p of parts) {
          if (p.trim()) normalizedLines.push(p.trim());
        }
        continue;
      }
    }

    normalizedLines.push(line);
  }

  // Tahap 3: Parsing Butir Soal
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
        finalBentuk = currentKunci.length > 10 ? 'Uraian' : 'Isian';
      } else if (currentOpsi.length > 0) {
        finalBentuk = currentKunci.includes(',') ? 'PGK' : 'PG';
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

  for (let i = 0; i < normalizedLines.length; i++) {
    const line = normalizedLines[i];

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

    // Deteksi Awal Nomor Soal Baru (misal: "1. ", "1) ", "(1) ", "No. 1. ", "1 . ")
    const numMatch = line.match(/^(?:(?:SOAL|NO|NOMOR)\s*)?\[?\(?(\d+)\)?\]?\s*[\.\:\)]\s*(.*)$/i);
    if (numMatch) {
      const rest = numMatch[2].trim();
      if (currentPertanyaan || currentOpsi.length > 0) {
        flushQuestion();
      }
      currentPertanyaan = rest;
      continue;
    }

    // Deteksi Opsi Pilihan (A., B., C., D. atau A), B), C), D) atau (A), (B) atau a., b., c.)
    const optMatch = line.match(/^(?:\[|\()?([A-Ea-e])(?:\.|\)|\:|\-|\s*\.)\s*(.+)$/);
    if (optMatch && currentPertanyaan) {
      const optLetter = optMatch[1].toUpperCase();
      const optText = optMatch[2].trim();
      currentOpsi.push(`${optLetter}. ${optText}`);
      continue;
    }

    // Jika belum masuk opsi atau kunci, append ke pertanyaan atau pembahasan
    if (currentPembahasan) {
      currentPembahasan += ' ' + line;
    } else if (currentOpsi.length > 0) {
      // Baris kelanjutan dari opsi terakhir
      currentOpsi[currentOpsi.length - 1] += ' ' + line;
    } else if (currentPertanyaan) {
      currentPertanyaan += '\n' + line;
    } else {
      // Sebelum nomor soal pertama muncul, kemungkinan stimulus umum
      currentStimulus = (currentStimulus ? currentStimulus + '\n' : '') + line;
    }
  }

  // Simpan butir terakhir
  flushQuestion();

  // Tahap 4: Fallback Strategi Jika Parser Nomor Belum Menemukan Soal
  // (Misal teks tidak memiliki nomor 1, 2, tapi memiliki pertanyaan dan opsi A, B, C)
  if (questions.length === 0) {
    const blocks = cleanText.split(/\n\s*\n+/);
    for (const block of blocks) {
      const blockLines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (blockLines.length === 0) continue;

      let qText = '';
      const opts: string[] = [];
      let qKey = '';

      for (const bl of blockLines) {
        const kMatch = bl.match(/^(?:KUNCI|JAWABAN|ANSWER)\s*[:=]?\s*(.+)$/i);
        if (kMatch) {
          qKey = kMatch[1].trim();
          continue;
        }
        const oMatch = bl.match(/^(?:\[|\()?([A-Ea-e])(?:\.|\)|\:|\-|\s*\.)\s*(.+)$/);
        if (oMatch) {
          opts.push(`${oMatch[1].toUpperCase()}. ${oMatch[2].trim()}`);
          continue;
        }
        if (opts.length === 0) {
          qText += (qText ? ' ' : '') + bl;
        }
      }

      if (qText && opts.length >= 2) {
        questions.push({
          nomor: questions.length + 1,
          bentuk: 'PG',
          stimulus: '',
          pertanyaan: qText.replace(/^(?:(?:SOAL|NO|NOMOR)\s*)?\[?\(?\d+\)?\]?\s*[\.\:\)]\s*/i, ''),
          opsi: opts,
          kunci: qKey || 'A',
          pembahasan: '',
          skor: 10,
          materi: 'Umum',
          indikator: '',
          bloom: 'C2',
          kesulitan: 'Sedang',
          dimensi: 'Penalaran Kritis',
        });
      }
    }
  }

  if (questions.length === 0) {
    return {
      questions: [],
      detectedFormat: 'Teks / Aiken',
      totalDetected: 0,
      warnings: [
        'Teks belum dapat dikenali secara otomatis dengan pola standar.',
        'Saran: Pastikan soal diawali nomor (1., 2., dst) dan opsi (A., B., C., D.), atau gunakan tombol "🤖 Bantu Susun dengan AI" di bawah.',
      ],
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

/**
 * AI-Assisted Question Structuring:
 * Membantu merapikan dan mengekstrak butir soal dari teks mentah dokumen
 * jika format teks sangat tidak beraturan, tabel acak, atau hasil OCR
 */
export async function parseQuestionsWithAI(
  rawText: string,
  mapel: string,
  kelas: string
): Promise<ParseResult> {
  const geminiKey =
    (typeof window !== 'undefined' ? window.localStorage.getItem('gemini_api_key') : '') || '';

  // 1. Coba lewat backend server
  try {
    const res = await fetch('/api/parse-raw-questions-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawText, mapel, kelas, apiKey: geminiKey }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.questions) && data.questions.length > 0) {
        return {
          questions: data.questions,
          detectedFormat: 'Teks / Disusun AI' as any,
          totalDetected: data.questions.length,
          warnings: ['Butir soal berhasil dirapikan dan disusun secara cerdas oleh AI Gemini.'],
        };
      }
    }
  } catch {
    // jika server tidak ada atau deployed statis di Firebase
  }

  // 2. Direct client-side fetch ke Google Gemini jika API Key tersedia
  if (geminiKey) {
    try {
      const prompt = `Anda adalah asisten kurikulum SDN Kandangan I Tosari. Tugas Anda:
Baca teks naskah ujian berikut dan susun seluruh butir soal ke dalam JSON array object valid:
[
  {
    "nomor": 1,
    "bentuk": "PG",
    "stimulus": "",
    "pertanyaan": "Soal...",
    "opsi": ["A. ...", "B. ...", "C. ...", "D. ..."],
    "kunci": "A",
    "pembahasan": "Penjelasan...",
    "skor": 10,
    "materi": "${mapel || 'Umum'}",
    "bloom": "C2",
    "kesulitan": "Sedang",
    "dimensi": "Penalaran Kritis"
  }
]

Mata Pelajaran: ${mapel || 'Umum'} | Kelas: ${kelas || 'Kelas 5'}
Teks Naskah Soal:
"""
${rawText.slice(0, 10000)}
"""`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const contentText = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (contentText) {
          const parsed = parseQuestionsFromJSON(contentText);
          if (parsed.questions.length > 0) {
            return {
              ...parsed,
              detectedFormat: 'Teks / Disusun AI' as any,
              warnings: ['Butir soal berhasil dirapikan dan distrukturkan oleh AI Gemini.'],
            };
          }
        }
      }
    } catch {
      // ignore
    }
  }

  throw new Error('Gagal merapikan teks dengan AI. Pastikan file berisi naskah soal atau atur GEMINI_API_KEY di menu Setting API.');
}
