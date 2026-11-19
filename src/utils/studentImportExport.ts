import type { Student } from '../types';
import { downloadTextFile } from './exportHelpers';

/**
 * Format CSV dengan UTF-8 BOM agar langsung rapi dibuka di Microsoft Excel
 */
export function exportStudentsCSV(students: Student[], filename = 'Data_Siswa_SDN_Kandangan_I.csv'): void {
  const headers = ['No', 'NIPD', 'NISN', 'Nama Lengkap', 'L/P', 'Agama', 'Kelas'];
  const rows = students.map((s, idx) => [
    idx + 1,
    `"${s.nipd}"`,
    `"${s.nisn}"`,
    `"${s.nama.replace(/"/g, '""')}"`,
    `"${s.jk}"`,
    `"${s.agama}"`,
    `"${s.kelas}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadTextFile(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Unduh format template CSV kosong siap isi untuk guru
 */
export function downloadStudentTemplateCSV(): void {
  const headers = ['NIPD', 'NISN', 'Nama Lengkap', 'L/P', 'Agama', 'Kelas'];
  const sampleRows = [
    ['901', '3198591866', 'AGISTA GABRILIA LAFISYA', 'P', 'HINDU', 'Kelas 1'],
    ['902', '3200069651', 'AKHMAD FAIREL ATHARIZ CALIEF', 'L', 'ISLAM', 'Kelas 1'],
    ['903', '3191161982', 'APRILIA VIKANIA PUTRI', 'P', 'KRISTEN', 'Kelas 2'],
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...sampleRows.map((r) =>
        r.map((col) => (col.includes(' ') || col.includes(',') ? `"${col}"` : col)).join(',')
      ),
    ].join('\r\n');

  downloadTextFile(csvContent, 'Template_Import_Data_Siswa.csv', 'text/csv;charset=utf-8');
}

/**
 * Unduh cadangan (backup) dalam format JSON
 */
export function exportStudentsJSON(students: Student[], filename = 'Backup_Data_Siswa.json'): void {
  const content = JSON.stringify(students, null, 2);
  downloadTextFile(content, filename, 'application/json;charset=utf-8');
}

/**
 * Helper untuk memecah baris CSV dengan memperhitungkan tanda kutip ganda (RFC 4180)
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // lewati escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parser file CSV siswa: Mendeteksi pemisah koma (,) atau titik-koma (;)
 */
export function parseStudentsCSV(
  csvText: string,
  defaultKelas = 'Kelas 1'
): { students: Student[]; errors: string[] } {
  const errors: string[] = [];
  const students: Student[] = [];

  // Hilangkan BOM jika ada
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { students: [], errors: ['File CSV kosong.'] };
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { students: [], errors: ['File CSV harus memiliki baris judul kolom dan minimal satu data siswa.'] };
  }

  // Deteksi delimiter berdasarkan baris header
  const headerLine = lines[0];
  const semicolonCount = (headerLine.match(/;/g) || []).length;
  const commaCount = (headerLine.match(/,/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semicolonCount > commaCount && semicolonCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = '\t';
  }

  const rawHeaders = parseCSVLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9]/g, '')
  );

  // Cari index masing-masing kolom
  const idxNipd = rawHeaders.findIndex((h) => h.includes('nipd') || h.includes('induk') || h === 'nis');
  const idxNisn = rawHeaders.findIndex((h) => h.includes('nisn'));
  const idxNama = rawHeaders.findIndex((h) => h.includes('nama') || h.includes('siswa') || h.includes('peserta'));
  const idxJk = rawHeaders.findIndex((h) => h.includes('jk') || h.includes('lp') || h.includes('kelamin') || h.includes('gender'));
  const idxAgama = rawHeaders.findIndex((h) => h.includes('agama') || h.includes('religion'));
  const idxKelas = rawHeaders.findIndex((h) => h.includes('kelas') || h.includes('class'));

  if (idxNama === -1) {
    return {
      students: [],
      errors: ['Kolom "Nama Lengkap" tidak ditemukan pada header CSV. Pastikan ada judul kolom Nama.'],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line, delimiter);
    if (cols.length === 0 || cols.every((c) => !c.trim())) continue;

    const rawNama = cols[idxNama] ? cols[idxNama].trim() : '';
    if (!rawNama) continue;

    const rawNipd = idxNipd !== -1 && cols[idxNipd] ? cols[idxNipd].trim() : String(i);
    const rawNisn = idxNisn !== -1 && cols[idxNisn] ? cols[idxNisn].trim() : '-';

    // Normalisasi JK
    let jk: 'L' | 'P' = 'L';
    if (idxJk !== -1 && cols[idxJk]) {
      const val = cols[idxJk].trim().toUpperCase();
      if (val.startsWith('P') || val === 'WANITA' || val === 'PEREMPUAN') {
        jk = 'P';
      } else {
        jk = 'L';
      }
    }

    // Normalisasi Agama
    let agama = 'ISLAM';
    if (idxAgama !== -1 && cols[idxAgama]) {
      const val = cols[idxAgama].trim().toUpperCase();
      if (val.includes('HINDU')) agama = 'HINDU';
      else if (val.includes('KRISTEN') || val.includes('PROTESTAN')) agama = 'KRISTEN';
      else if (val.includes('KATOLIK')) agama = 'KATOLIK';
      else if (val.includes('BUDDHA') || val.includes('BUDHA')) agama = 'BUDDHA';
      else if (val.includes('KONGHUCU')) agama = 'KONGHUCU';
      else agama = val || 'ISLAM';
    }

    // Normalisasi Kelas
    let kelas = defaultKelas;
    if (idxKelas !== -1 && cols[idxKelas]) {
      const val = cols[idxKelas].trim();
      const match = val.match(/[1-6]/);
      if (match) {
        kelas = `Kelas ${match[0]}`;
      } else if (val) {
        kelas = val;
      }
    }

    students.push({
      no: students.length + 1,
      nama: rawNama.toUpperCase(),
      nipd: rawNipd,
      nisn: rawNisn || '-',
      jk,
      agama,
      kelas,
    });
  }

  if (students.length === 0) {
    errors.push('Tidak ada baris data siswa yang valid dalam file CSV.');
  }

  return { students, errors };
}

/**
 * Parser file JSON siswa
 */
export function parseStudentsJSON(jsonText: string): { students: Student[]; errors: string[] } {
  try {
    const raw = JSON.parse(jsonText);
    const list = Array.isArray(raw) ? raw : raw.students || [];

    if (!Array.isArray(list) || list.length === 0) {
      return { students: [], errors: ['Format JSON tidak berisi daftar array siswa.'] };
    }

    const students: Student[] = list.map((item: any, idx: number) => ({
      no: item.no || idx + 1,
      nama: String(item.nama || item.name || '').trim().toUpperCase(),
      nipd: String(item.nipd || item.nis || idx + 1).trim(),
      nisn: String(item.nisn || '-').trim(),
      jk: (String(item.jk || '').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P',
      agama: String(item.agama || 'ISLAM').trim().toUpperCase(),
      kelas: String(item.kelas || 'Kelas 1').trim(),
    })).filter((s) => s.nama.length > 0);

    return { students, errors: [] };
  } catch (err: any) {
    return { students: [], errors: [`File JSON tidak valid: ${err.message}`] };
  }
}
