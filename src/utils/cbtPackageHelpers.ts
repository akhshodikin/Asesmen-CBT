import type { BankQuestionItem, QuestionItem } from '../types';

export function generateRandomToken(prefix = 'CBT'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) || 'CBT';
  return `${cleanPrefix}${suffix}`;
}

export function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Shuffles PG options (A, B, C, D) while accurately remapping the answer letter (`kunci`).
 */
export function shufflePGOptionQuestion(q: QuestionItem): QuestionItem {
  if (q.bentuk !== 'PG' || !Array.isArray(q.opsi) || q.opsi.length < 2) {
    return { ...q };
  }

  const cleanKeyChar = (q.kunci || 'A').trim().toUpperCase().charAt(0);
  const originalKeyIdx = cleanKeyChar.charCodeAt(0) - 65;

  const taggedOptions = q.opsi.map((raw, idx) => ({
    text: raw.replace(/^[A-Da-d][.)]\s*/, '').trim(),
    isCorrect: idx === originalKeyIdx,
  }));

  const shuffled = shuffleArray(taggedOptions);
  let newKey = cleanKeyChar;

  const rebuiltOpsi = shuffled.map((item, idx) => {
    const letter = String.fromCharCode(65 + idx);
    if (item.isCorrect) {
      newKey = letter;
    }
    return `${letter}. ${item.text}`;
  });

  return {
    ...q,
    opsi: rebuiltOpsi,
    kunci: newKey,
  };
}

export function prepareQuestionsForPackage(
  source: QuestionItem[],
  acakSoal: boolean,
  acakOpsi: boolean
): QuestionItem[] {
  const cloned = source.map((q) => (acakOpsi ? shufflePGOptionQuestion(q) : { ...q, opsi: [...(q.opsi || [])] }));
  const ordered = acakSoal ? shuffleArray(cloned) : cloned;
  return ordered.map((q, idx) => ({
    ...q,
    nomor: idx + 1,
  }));
}

export interface MatchingPair {
  left: string;
  right: string;
}

/**
 * Parses Mencocokkan pairs from `opsi` entries like:
 * "1. Fotosintesis => Tumbuhan membuat makanan" or "Fotosintesis | Tumbuhan..."
 */
export function parseMatchingPairs(opsi: string[] = []): MatchingPair[] {
  return opsi
    .map((raw) => {
      const cleaned = raw.replace(/^\d+[.)]\s*/, '').trim();
      const sepMatch = cleaned.split(/\s*(?:=>|->|::|\|=|=|\|)\s*/);
      if (sepMatch.length >= 2) {
        return {
          left: sepMatch[0].trim(),
          right: sepMatch.slice(1).join(' - ').trim(),
        };
      }
      return {
        left: cleaned,
        right: '-',
      };
    })
    .filter((p) => p.left.length > 0);
}

/**
 * Deterministically rotates/shuffles right-column options for display so printed/CBT tables
 * don't trivially align 1->A, 2->B, 3->C while preserving stable ordering during an exam.
 */
export function getShuffledRightOptions(pairs: MatchingPair[], seed = 1): { letter: string; text: string }[] {
  if (pairs.length <= 1) {
    return pairs.map((p, idx) => ({ letter: String.fromCharCode(65 + idx), text: p.right }));
  }
  const indices = pairs.map((_, idx) => idx);
  // Deterministic permutation using seed so printable Naskah & Kunci/CBT are consistent
  const shift = ((seed % (indices.length - 1)) + 1) || 1;
  const rotated = indices.map((_, i) => pairs[(i + shift) % pairs.length].right);
  // Reverse odd pairs if >= 4 for less predictable alignment
  if (rotated.length >= 4) {
    [rotated[1], rotated[rotated.length - 1]] = [rotated[rotated.length - 1], rotated[1]];
  }
  return rotated.map((text, idx) => ({
    letter: String.fromCharCode(65 + idx),
    text,
  }));
}

export function pickBankQuestionsForTest({
  bankQuestions,
  mapel,
  kelas,
  kesulitanFilter,
  bloomFilter,
  jmlPG,
  jmlPGK,
  jmlIsian,
  jmlUraian,
  jmlMencocokkan = 0,
  acakSoal,
  acakOpsi,
}: {
  bankQuestions: BankQuestionItem[];
  mapel: string;
  kelas: string;
  kesulitanFilter: string;
  bloomFilter: string[];
  jmlPG: number;
  jmlPGK: number;
  jmlIsian: number;
  jmlUraian: number;
  jmlMencocokkan?: number;
  acakSoal: boolean;
  acakOpsi: boolean;
}): { selected: QuestionItem[]; shortfalls: string[] } {
  const pool = bankQuestions.filter((q) => {
    const matchMapel = mapel === 'SEMUA' || q.mapel === mapel;
    const matchKelas = kelas === 'SEMUA' || q.kelas === kelas;
    const matchDiff =
      kesulitanFilter === 'SEIMBANG' ||
      q.kesulitan?.toLowerCase() === kesulitanFilter.toLowerCase();
    const bCode = (q.bloom || 'C3').toUpperCase().slice(0, 2);
    const matchBloom = bloomFilter.length === 0 || bloomFilter.includes(bCode);
    return matchMapel && matchKelas && matchDiff && matchBloom;
  });

  const pickByShape = (shape: string, count: number): { items: QuestionItem[]; shortfall?: string } => {
    if (count <= 0) return { items: [] };
    const candidates = pool.filter((q) => q.bentuk === shape);
    const orderedCandidates = acakSoal ? shuffleArray(candidates) : candidates;
    const taken = orderedCandidates.slice(0, count).map((b) => ({
      nomor: b.nomor,
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

    if (taken.length < count) {
      return {
        items: taken,
        shortfall: `${shape}: hanya tersedia ${taken.length} dari ${count} yang diminta`,
      };
    }
    return { items: taken };
  };

  const pg = pickByShape('PG', jmlPG);
  const pgk = pickByShape('PGK', jmlPGK);
  const isian = pickByShape('Isian', jmlIsian);
  const uraian = pickByShape('Uraian', jmlUraian);
  const mencocokkan = pickByShape('Mencocokkan', jmlMencocokkan);

  const combined = [
    ...pg.items,
    ...pgk.items,
    ...isian.items,
    ...mencocokkan.items,
    ...uraian.items,
  ];
  const prepared = prepareQuestionsForPackage(combined, acakSoal, acakOpsi);
  const shortfalls = [
    pg.shortfall,
    pgk.shortfall,
    isian.shortfall,
    mencocokkan.shortfall,
    uraian.shortfall,
  ].filter((s): s is string => Boolean(s));

  return { selected: prepared, shortfalls };
}
