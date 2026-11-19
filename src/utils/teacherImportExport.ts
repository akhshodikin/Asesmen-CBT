import type { Teacher } from '../types';
import { downloadTextFile } from './exportHelpers';

/**
 * Format CSV dengan UTF-8 BOM agar langsung rapi dibuka di Microsoft Excel
 */
export function exportTeachersCSV(
  teachers: Teacher[],
  filename = 'Data_Guru_SDN_Kandangan_I.csv'
): void {
  const headers = ['No', 'Nama Lengkap & Gelar', 'NIP', 'Jabatan', 'Unit / Kelas Diampu', 'Fase', 'WhatsApp', 'Email', 'Status'];
  const rows = teachers.map((t, idx) => [
    idx + 1,
    `"${t.nama.replace(/"/g, '""')}"`,
    `"${t.nip}"`,
    `"${t.jabatan}"`,
    `"${t.ugk}"`,
    `"${t.fase || '-'}"`,
    `"${t.wa || '-'}"`,
    `"${t.email || '-'}"`,
    `"${t.status || 'Aktif'}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  downloadTextFile(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Unduh format template CSV kosong untuk data guru
 */
export function downloadTeacherTemplateCSV(): void {
  const headers = ['Nama Lengkap & Gelar', 'NIP', 'Jabatan', 'Unit / Kelas Diampu', 'WhatsApp', 'Email'];
  const sampleRows = [
    ['Nevilía Yunitasari, S.Pd.', '199006042024212051', 'Guru Kelas', 'Kelas 1', '085755739160', 'safanita00@gmail.com'],
    ['Nurul Afifah, S.Pd.', '198903122020122013', 'Guru Kelas', 'Kelas 3', '082131403050', 'fifadaipa@gmail.com'],
    ['Budi Santoso, S.Pd.SD.', '198501012010011002', 'Guru Mata Pelajaran', 'PJOK', '081234567890', 'budi@gmail.com'],
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...sampleRows.map((r) =>
        r.map((col) => (col.includes(' ') || col.includes(',') ? `"${col}"` : col)).join(',')
      ),
    ].join('\r\n');

  downloadTextFile(csvContent, 'Template_Import_Data_Guru.csv', 'text/csv;charset=utf-8');
}

/**
 * Unduh cadangan JSON guru
 */
export function exportTeachersJSON(teachers: Teacher[], filename = 'Backup_Data_Guru.json'): void {
  const content = JSON.stringify(teachers, null, 2);
  downloadTextFile(content, filename, 'application/json;charset=utf-8');
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
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

export function parseTeachersCSV(csvText: string): { teachers: Teacher[]; errors: string[] } {
  const errors: string[] = [];
  const teachers: Teacher[] = [];

  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) {
    return { teachers: [], errors: ['File CSV kosong.'] };
  }

  const lines = cleanText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { teachers: [], errors: ['File CSV harus memiliki judul kolom dan minimal satu data guru.'] };
  }

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

  const idxNama = rawHeaders.findIndex((h) => h.includes('nama') || h.includes('guru') || h.includes('pendidik'));
  const idxNip = rawHeaders.findIndex((h) => h.includes('nip'));
  const idxJabatan = rawHeaders.findIndex((h) => h.includes('jabatan') || h.includes('tugas'));
  const idxUgk = rawHeaders.findIndex((h) => h.includes('unit') || h.includes('kelas') || h.includes('mapel') || h.includes('diampu'));
  const idxWa = rawHeaders.findIndex((h) => h.includes('wa') || h.includes('whatsapp') || h.includes('telp') || h.includes('kontak') || h.includes('hp'));
  const idxEmail = rawHeaders.findIndex((h) => h.includes('email') || h.includes('surel'));

  if (idxNama === -1) {
    return {
      teachers: [],
      errors: ['Kolom "Nama Guru" tidak ditemukan pada header CSV. Pastikan ada kolom nama.'],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = parseCSVLine(line, delimiter);
    if (cols.length === 0 || cols.every((c) => !c.trim())) continue;

    const rawNama = cols[idxNama] ? cols[idxNama].trim() : '';
    if (!rawNama) continue;

    const rawNip = idxNip !== -1 && cols[idxNip] ? cols[idxNip].trim() : '-';
    const rawJabatan = idxJabatan !== -1 && cols[idxJabatan] ? cols[idxJabatan].trim() : 'Guru Kelas';
    const rawUgk = idxUgk !== -1 && cols[idxUgk] ? cols[idxUgk].trim() : 'Kelas 1';
    const rawWa = idxWa !== -1 && cols[idxWa] ? cols[idxWa].trim() : '-';
    const rawEmail = idxEmail !== -1 && cols[idxEmail] ? cols[idxEmail].trim() : '-';

    const fase =
      rawUgk.includes('1') || rawUgk.includes('2')
        ? 'Fase A'
        : rawUgk.includes('3') || rawUgk.includes('4')
          ? 'Fase B'
          : 'Fase C';

    teachers.push({
      id: 'g' + Date.now() + '_' + i,
      nama: rawNama,
      namaAsli: rawNama.replace(/,\s*.*$/, ''),
      nip: rawNip || '-',
      jabatan: rawJabatan || 'Guru Kelas',
      ugk: rawUgk || 'Kelas 1',
      fase,
      status: 'Aktif',
      wa: rawWa || '-',
      email: rawEmail || '-',
    });
  }

  if (teachers.length === 0) {
    errors.push('Tidak ada baris data guru yang valid dalam file.');
  }

  return { teachers, errors };
}

export function parseTeachersJSON(jsonText: string): { teachers: Teacher[]; errors: string[] } {
  try {
    const raw = JSON.parse(jsonText);
    const list = Array.isArray(raw) ? raw : raw.teachers || [];

    if (!Array.isArray(list) || list.length === 0) {
      return { teachers: [], errors: ['Format JSON tidak berisi daftar array guru.'] };
    }

    const teachers: Teacher[] = list
      .map((item: any, idx: number) => {
        const rawNama = String(item.nama || item.name || '').trim();
        const ugk = String(item.ugk || item.kelas || 'Kelas 1').trim();
        const fase =
          ugk.includes('1') || ugk.includes('2')
            ? 'Fase A'
            : ugk.includes('3') || ugk.includes('4')
              ? 'Fase B'
              : 'Fase C';

        return {
          id: String(item.id || 'g' + Date.now() + '_' + idx),
          nama: rawNama,
          namaAsli: String(item.namaAsli || rawNama.replace(/,\s*.*$/, '')),
          nip: String(item.nip || '-').trim(),
          jabatan: String(item.jabatan || 'Guru Kelas').trim(),
          ugk,
          fase: String(item.fase || fase),
          status: String(item.status || 'Aktif').trim(),
          wa: String(item.wa || '-').trim(),
          email: String(item.email || '-').trim(),
        };
      })
      .filter((t) => t.nama.length > 0);

    return { teachers, errors: [] };
  } catch (err: any) {
    return { teachers: [], errors: [`File JSON tidak valid: ${err.message}`] };
  }
}
