import type {
  AssessmentConfig,
  BankQuestionItem,
  CBTSubmission,
  ExamPackage,
  KisiKisiItem,
  QuestionItem,
  SchoolProfile,
  Student,
  Teacher,
} from '../types';
import { generateRandomToken } from '../utils/cbtPackageHelpers';

export const INITIAL_TEACHERS: Teacher[] = [
  {
    id: 'g1',
    nama: 'Nevilía Yunitasari, S.Pd.',
    namaAsli: 'Nevilia Yunitasari',
    nip: '199006042024212051',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 1',
    fase: 'Fase A',
    status: 'Aktif',
    wa: '085755739160',
    email: 'safanita00@gmail.com',
  },
  {
    id: 'g2',
    nama: 'Guru Kelas 2 (Belum Ditentukan)',
    namaAsli: 'Guru Kelas 2',
    nip: '-',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 2',
    fase: 'Fase A',
    status: 'Aktif',
    wa: '-',
    email: '-',
  },
  {
    id: 'g3',
    nama: 'Nurul Afifah, S.Pd.',
    namaAsli: 'Nurul Afifah',
    nip: '198903122020122013',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 3',
    fase: 'Fase B',
    status: 'Aktif',
    wa: '082131403050',
    email: 'fifadaipa@gmail.com',
  },
  {
    id: 'g4',
    nama: 'Lestari Handayani, S.Pd.',
    namaAsli: 'Lestari Handayani',
    nip: '198412212022212013',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 4',
    fase: 'Fase B',
    status: 'Aktif',
    wa: '082257180688',
    email: 'handayanilestari842@gmail.com',
  },
  {
    id: 'g5',
    nama: 'Martha Dimas Lely Okta Widhana, S.Pd.',
    namaAsli: 'MARTHA DIMAS LELY OKTA WIDHANA',
    nip: '199603052020121011',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 5',
    fase: 'Fase C',
    status: 'Aktif',
    wa: '082336467927',
    email: 'marthadimas778@gmail.com',
  },
  {
    id: 'g6',
    nama: 'Ireliya Austina Prahesti, S.Pd.',
    namaAsli: 'Ireliya Austina Prahesti',
    nip: '199906092024212038',
    jabatan: 'Guru Kelas',
    ugk: 'Kelas 6',
    fase: 'Fase C',
    status: 'Aktif',
    wa: '088989540295',
    email: 'pireliya9@gmail.com',
  },
  {
    id: 'g7',
    nama: 'Luluk Munziyah, S.Pd.I.',
    namaAsli: 'LULUK MUNZIYAH',
    nip: '199511242020122009',
    jabatan: 'Guru Mata Pelajaran',
    ugk: 'Pendidikan Agama Islam & Budi Pekerti',
    fase: 'Semua Fase',
    status: 'Aktif',
    wa: '085895739248',
    email: 'munziyah7@gmail.com',
  },
];

export const STUDENTS_DATA: Student[] = [
  // KELAS 1 (15 Siswa)
  { no: 1, nama: 'AGISTA GABRILIA LAFISYA', nipd: '967', jk: 'P', nisn: '3198591866', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 2, nama: 'AKHMAD FAIREL ATHARIZ CALIEF', nipd: '968', jk: 'L', nisn: '3200069651', agama: 'ISLAM', kelas: 'Kelas 1' },
  { no: 3, nama: 'APRILIA VIKANIA PUTRI', nipd: '969', jk: 'P', nisn: '3191161982', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 4, nama: 'ASMIRADAH MEIDITA PRIANJANI', nipd: '970', jk: 'P', nisn: '3196263998', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 5, nama: 'DEYA LESTARI', nipd: '971', jk: 'P', nisn: '3190747051', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 6, nama: 'KAESAR RENATAN JULIO FERNANDO', nipd: '972', jk: 'L', nisn: '3196190155', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 7, nama: 'NATALIA FIRA FIRNANDA', nipd: '973', jk: 'P', nisn: '-', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 8, nama: 'KYSA CAESAR SYAHKIRA', nipd: '974', jk: 'P', nisn: '3209377284', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 9, nama: 'MEYRISKA PRILLYNIA ANJANI', nipd: '975', jk: 'P', nisn: '3195803452', agama: 'ISLAM', kelas: 'Kelas 1' },
  { no: 10, nama: "NINING HABIBATUS SA'ADAH", nipd: '976', jk: 'P', nisn: '3207432460', agama: 'ISLAM', kelas: 'Kelas 1' },
  { no: 11, nama: 'RAHEL DWI AGUSTIN', nipd: '977', jk: 'P', nisn: '3196063411', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 12, nama: 'SADAM MOHAMMAD IRFAN', nipd: '978', jk: 'L', nisn: '3193443835', agama: 'ISLAM', kelas: 'Kelas 1' },
  { no: 13, nama: 'SANZHA INDIRA', nipd: '979', jk: 'P', nisn: '3198159284', agama: 'ISLAM', kelas: 'Kelas 1' },
  { no: 14, nama: 'STEVANY ANGELIA', nipd: '980', jk: 'P', nisn: '3199626286', agama: 'HINDU', kelas: 'Kelas 1' },
  { no: 15, nama: 'SYAHNAZ SYAQILA NADIRA', nipd: '981', jk: 'P', nisn: '3198032121', agama: 'HINDU', kelas: 'Kelas 1' },

  // KELAS 2 (15 Siswa)
  { no: 1, nama: 'AFIFA ARORA SALSABILLA', nipd: '951', jk: 'P', nisn: '3186275296', agama: 'ISLAM', kelas: 'Kelas 2' },
  { no: 2, nama: 'ALVINO ADI JAYA', nipd: '952', jk: 'L', nisn: '3184066029', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 3, nama: 'BUNGA MAULIYA AYUDINATA', nipd: '953', jk: 'P', nisn: '3187344941', agama: 'ISLAM', kelas: 'Kelas 2' },
  { no: 4, nama: 'CAHYA FELIA ADINDA KIRANA', nipd: '954', jk: 'P', nisn: '3188050684', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 5, nama: 'EZEKIEL GABRIEL RODRIKO ZICO', nipd: '955', jk: 'L', nisn: '3182492622', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 6, nama: 'FELICYA BILQIS VINDI OLIVIA', nipd: '956', jk: 'P', nisn: '3181176471', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 7, nama: 'FIREN FINEZA FILANIKA', nipd: '557', jk: 'P', nisn: '3188409182', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 8, nama: 'HAFIZUL LUTHFI ALWI AL KHAFI', nipd: '958', jk: 'L', nisn: '3184938675', agama: 'ISLAM', kelas: 'Kelas 2' },
  { no: 9, nama: 'MILKA OKTAVIA ANGGRAENI', nipd: '959', jk: 'P', nisn: '3189508032', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 10, nama: 'OKTAVIANA DWI BAYU LESTARI', nipd: '960', jk: 'P', nisn: '3185348331', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 11, nama: 'RIFKI ALVINO DIONATA', nipd: '961', jk: 'L', nisn: '3181419179', agama: 'ISLAM', kelas: 'Kelas 2' },
  { no: 12, nama: 'SHENDI REJA RAMADANI', nipd: '962', jk: 'L', nisn: '3189389197', agama: 'ISLAM', kelas: 'Kelas 2' },
  { no: 13, nama: 'VINESSA AYU ANDIRA', nipd: '963', jk: 'P', nisn: '3185249055', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 14, nama: 'VIRGO MAHENDRA YUDISTIRA', nipd: '964', jk: 'L', nisn: '3186691995', agama: 'HINDU', kelas: 'Kelas 2' },
  { no: 15, nama: "WILI'AM DIRGA AL FARIZI", nipd: '965', jk: 'L', nisn: '3182419460', agama: 'ISLAM', kelas: 'Kelas 2' },

  // KELAS 3 (16 Siswa)
  { no: 1, nama: 'AISYAH GHEFANIA AULIA AGUSTINA', nipd: '936', jk: 'P', nisn: '3179120811', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 2, nama: 'ALDO MAULANA SADEWA', nipd: '937', jk: 'L', nisn: '3170302750', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 3, nama: 'BAGAS WANADA ADITYA DEWATA', nipd: '938', jk: 'L', nisn: '3176468161', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 4, nama: 'CAKRA SETIA DARMANENG PUJA', nipd: '939', jk: 'L', nisn: '3176359111', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 5, nama: 'DAVISTA ANANTASYA', nipd: '940', jk: 'P', nisn: '3170253559', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 6, nama: 'DISKI PUTRA MAULANA', nipd: '941', jk: 'L', nisn: '3165623862', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 7, nama: 'EGISYA RENANTA SEVILONA', nipd: '942', jk: 'P', nisn: '3175741650', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 8, nama: 'ELVI MAULIDIYA', nipd: '943', jk: 'P', nisn: '3167997631', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 9, nama: 'GEA VANESSA NATALIA ELISABHET', nipd: '944', jk: 'P', nisn: '3160332746', agama: 'KRISTEN', kelas: 'Kelas 3' },
  { no: 10, nama: 'KRISTIAN ANGGARA', nipd: '945', jk: 'L', nisn: '3175975661', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 11, nama: "NAVYSHA QUR'ANA MAULIDITA ANSARI", nipd: '946', jk: 'P', nisn: '3171678356', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 12, nama: 'REFALDO ADI PRADANA', nipd: '947', jk: 'L', nisn: '3177088090', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 13, nama: 'TIRTA DANA DYAKSA SWANDIRA', nipd: '948', jk: 'P', nisn: '3172445327', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 14, nama: 'TEGUH GADA SUTRA', nipd: '966', jk: 'L', nisn: '3173954675', agama: 'HINDU', kelas: 'Kelas 3' },
  { no: 15, nama: 'VANISA PUTRI', nipd: '949', jk: 'P', nisn: '3179373356', agama: 'ISLAM', kelas: 'Kelas 3' },
  { no: 16, nama: 'ZIVANO VIKO DIDAN ALVARO', nipd: '950', jk: 'L', nisn: '3178044230', agama: 'HINDU', kelas: 'Kelas 3' },

  // KELAS 4 (9 Siswa)
  { no: 1, nama: 'ADEL SAFIRA', nipd: '927', jk: 'P', nisn: '0162900892', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 2, nama: 'AL VINO GIOTAMA PUTRA', nipd: '928', jk: 'L', nisn: '0168060947', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 3, nama: 'BILY AGUSTINO', nipd: '929', jk: 'L', nisn: '3168210092', agama: 'ISLAM', kelas: 'Kelas 4' },
  { no: 4, nama: 'CRISTO ALVANY BAYU PRADANA', nipd: '930', jk: 'L', nisn: '0176410079', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 5, nama: 'DAFIANO ALFIN FIRDAN SAPUTRA', nipd: '931', jk: 'L', nisn: '0168957870', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 6, nama: 'DITO SETIAWAN', nipd: '932', jk: 'L', nisn: '3164187862', agama: 'ISLAM', kelas: 'Kelas 4' },
  { no: 7, nama: 'SISKIA AUDIA KIRANA', nipd: '933', jk: 'P', nisn: '0162550415', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 8, nama: 'VIKI JULIANO WISNO WARDANA', nipd: '934', jk: 'L', nisn: '0167520677', agama: 'HINDU', kelas: 'Kelas 4' },
  { no: 9, nama: 'ZILDAN STIFEN GIOGENINO', nipd: '935', jk: 'L', nisn: '3162471314', agama: 'ISLAM', kelas: 'Kelas 4' },

  // KELAS 5 (19 Siswa)
  { no: 1, nama: 'BINTANG RADITYA SEPTIANO PUTRA', nipd: '908', jk: 'L', nisn: '0153191795', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 2, nama: 'CHIKA DWI SEPRILIA', nipd: '909', jk: 'P', nisn: '3158296360', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 3, nama: 'DEFIAN ADI SASTRA', nipd: '910', jk: 'L', nisn: '0144845294', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 4, nama: 'DENA ELISTIA', nipd: '911', jk: 'P', nisn: '0156884573', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 5, nama: 'DENDI ARIYANDO GESTA PRATAMA', nipd: '912', jk: 'L', nisn: '3153984777', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 6, nama: 'DEVINA GISELLIYA PUTRI', nipd: '913', jk: 'P', nisn: '0152423891', agama: 'ISLAM', kelas: 'Kelas 5' },
  { no: 7, nama: 'IRFAN ANDRI SAPUTRA', nipd: '914', jk: 'L', nisn: '0157481919', agama: 'ISLAM', kelas: 'Kelas 5' },
  { no: 8, nama: 'JESIKA MUTIARA CINTA', nipd: '915', jk: 'P', nisn: '0157883555', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 9, nama: 'KLEDI ARJUNA SADEWA PRATAMA', nipd: '916', jk: 'L', nisn: '0152469379', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 10, nama: 'KLLEO VITO DAFASTU', nipd: '917', jk: 'L', nisn: '0154644784', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 11, nama: 'MIEKAYLLA CELISTHA PUTRI', nipd: '918', jk: 'P', nisn: '0159352347', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 12, nama: 'MUHAMMAD ALFIAN', nipd: '919', jk: 'L', nisn: '0152942762', agama: 'ISLAM', kelas: 'Kelas 5' },
  { no: 13, nama: "MUHAMMAD ASKA ASSIFA'UL FADILAH", nipd: '920', jk: 'L', nisn: '3168128200', agama: 'ISLAM', kelas: 'Kelas 5' },
  { no: 14, nama: 'NADIRA SHERYL FIORENSA', nipd: '921', jk: 'P', nisn: '3155672334', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 15, nama: 'NARADA OKTAVIA', nipd: '922', jk: 'P', nisn: '0152703384', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 16, nama: 'VANESSA ARIVIA PUTRI', nipd: '923', jk: 'P', nisn: '3155330169', agama: 'KRISTEN', kelas: 'Kelas 5' },
  { no: 17, nama: 'VANIKA NOVA GIZELDA', nipd: '924', jk: 'P', nisn: '0156556317', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 18, nama: 'VIRJINIA VARENSI REVIYA PUTRI', nipd: '925', jk: 'P', nisn: '0152827414', agama: 'HINDU', kelas: 'Kelas 5' },
  { no: 19, nama: 'YEFVA KRISYA KERTA NUGRAHA', nipd: '926', jk: 'L', nisn: '0153078147', agama: 'HINDU', kelas: 'Kelas 5' },

  // KELAS 6 (9 Siswa)
  { no: 1, nama: 'ADE SEPTYANO PRADITYE', nipd: '899', jk: 'L', nisn: '0143580529', agama: 'HINDU', kelas: 'Kelas 6' },
  { no: 2, nama: 'AZWA AZZAHRA RHAMADHANI', nipd: '900', jk: 'P', nisn: '0145006031', agama: 'ISLAM', kelas: 'Kelas 6' },
  { no: 3, nama: 'DESTA ANDRO ELFA NIKO', nipd: '901', jk: 'L', nisn: '0141818784', agama: 'HINDU', kelas: 'Kelas 6' },
  { no: 4, nama: 'EVAN NUGRAHA', nipd: '902', jk: 'L', nisn: '0149834461', agama: 'HINDU', kelas: 'Kelas 6' },
  { no: 5, nama: 'FACHRIZAL ULUMIDIN', nipd: '903', jk: 'L', nisn: '0148043715', agama: 'ISLAM', kelas: 'Kelas 6' },
  { no: 6, nama: 'GITA OKTAVIA', nipd: '904', jk: 'P', nisn: '3149846717', agama: 'HINDU', kelas: 'Kelas 6' },
  { no: 7, nama: "MUHAMMAD FAIZ AL'FARIZI", nipd: '905', jk: 'L', nisn: '0147671134', agama: 'ISLAM', kelas: 'Kelas 6' },
  { no: 8, nama: 'RADHEA DECA PUJA NOSTAGA', nipd: '906', jk: 'L', nisn: '0149652457', agama: 'HINDU', kelas: 'Kelas 6' },
  { no: 9, nama: 'REVA DARMA DUWI SANTOSO', nipd: '907', jk: 'L', nisn: '0142385025', agama: 'HINDU', kelas: 'Kelas 6' },
];

export const SUBJECTS: string[] = [
  'Pendidikan Pancasila',
  'Bahasa Indonesia',
  'Matematika',
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
  'Pendidikan Agama Islam & Budi Pekerti',
  'Pendidikan Agama Hindu & Budi Pekerti',
  'Pendidikan Agama Kristen & Budi Pekerti',
  'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)',
  'Seni dan Budaya (Seni Rupa/Musik/Tari)',
  'Bahasa Inggris',
  'Muatan Lokal Bahasa Jawa',
];

export const EIGHT_DIMENSIONS: string[] = [
  'Keimanan dan Ketakwaan terhadap Tuhan YME',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
];

export const BLOOM_LEVELS = [
  { code: 'C1', label: 'C1 - Mengingat (Remembering)', category: 'LOTS (L1)' },
  { code: 'C2', label: 'C2 - Memahami (Understanding)', category: 'LOTS (L1)' },
  { code: 'C3', label: 'C3 - Menerapkan (Applying)', category: 'MOTS (L2)' },
  { code: 'C4', label: 'C4 - Menganalisis (Analyzing)', category: 'HOTS (L3)' },
  { code: 'C5', label: 'C5 - Mengevaluasi (Evaluating)', category: 'HOTS (L3)' },
  { code: 'C6', label: 'C6 - Mencipta (Creating)', category: 'HOTS (L3)' },
];

export const PRESET_KISI_KISI: Record<string, KisiKisiItem[]> = {
  'Pendidikan Pancasila': [
    {
      cp: 'Memahami dan menerapkan nilai-nilai sila Pancasila dalam kehidupan sehari-hari di lingkungan keluarga, sekolah, dan masyarakat.',
      materi: 'Nilai-Nilai Pancasila & Gotong Royong di Desa',
      indikator:
        'Disajikan ilustrasi kegiatan warga di desa sekitar lereng Gunung Bromo/Tengger, peserta didik dapat menentukan penerapan sila Pancasila yang tepat.',
      dimensi: 'Kewargaan',
      bloom: 'C3',
      kesulitan: 'Sedang',
      bentuk: 'PG',
    },
    {
      cp: 'Mengidentifikasi aturan dan norma yang berlaku di lingkungan keluarga, sekolah, serta hak dan kewajiban sebagai warga sekolah.',
      materi: 'Hak, Kewajiban, dan Aturan di Sekolah',
      indikator:
        'Peserta didik dapat menganalisis dampak pelaksanaan kewajiban menjaga kebersihan lingkungan sekolah.',
      dimensi: 'Kemandirian',
      bloom: 'C4',
      kesulitan: 'Sulit',
      bentuk: 'PG',
    },
    {
      cp: 'Menghargai keberagaman suku, budaya, dan agama di lingkungan sekitar sebagai kekayaan bangsa Indonesia (Bhinneka Tunggal Ika).',
      materi: 'Keberagaman Budaya dan Toleransi Beragama',
      indikator:
        'Disajikan cerita keberagaman umat beragama di Kecamatan Tosari, siswa dapat mengevaluasi sikap toleransi yang benar.',
      dimensi: 'Keimanan dan Ketakwaan terhadap Tuhan YME',
      bloom: 'C5',
      kesulitan: 'Sulit',
      bentuk: 'Uraian',
    },
  ],
  'Bahasa Indonesia': [
    {
      cp: 'Memahami ide pokok dan ide pendukung pada teks informatif serta teks narasi tentang lingkungan sekitar.',
      materi: 'Ide Pokok dan Informasi Tersurat Teks Bacaan',
      indikator:
        'Disajikan paragraf tentang pertanian kentang dan kubis di dataran tinggi Tosari, peserta didik dapat menentukan kalimat utama dan ide pokok paragraf.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C4',
      kesulitan: 'Sedang',
      bentuk: 'PG',
    },
    {
      cp: 'Menggunakan kaidah kebahasaan (kalimat efektif, huruf kapital, tanda baca, kata tanya, sinonim/antonim) dengan tepat.',
      materi: 'Kalimat Efektif, Kata Tanya, dan Tanda Baca',
      indikator:
        'Peserta didik dapat memperbaiki penggunaan huruf kapital dan tanda baca pada kalimat yang disajikan.',
      dimensi: 'Komunikasi',
      bloom: 'C3',
      kesulitan: 'Mudah',
      bentuk: 'Isian',
    },
    {
      cp: 'Menulis teks deskripsi atau eksposisi sederhana berdasarkan pengamatan lingkungan sekitar.',
      materi: 'Menulis Paragraf Deskripsi Lingkungan',
      indikator:
        'Peserta didik dapat menyusun paragraf deskripsi singkat tentang keindahan alam pegunungan atau kegiatan di sekolah.',
      dimensi: 'Kreativitas',
      bloom: 'C6',
      kesulitan: 'Sulit',
      bentuk: 'Uraian',
    },
  ],
  Matematika: [
    {
      cp: 'Memiliki pemahaman dan intuisi bilangan (number sense) pada bilangan cacah, pecahan, serta operasi hitung aritmatika.',
      materi: 'Operasi Hitung Bilangan Cacah dan Pecahan',
      indikator:
        'Disajikan soal cerita hasil panen sayur petani di Desa Kandangan, peserta didik dapat menghitung hasil operasi hitung dengan tepat.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C3',
      kesulitan: 'Sedang',
      bentuk: 'PG',
    },
    {
      cp: 'Mengukur dan mengestimasi keliling serta luas bangun datar dan volume bangun ruang sederhana.',
      materi: 'Keliling dan Luas Bangun Datar',
      indikator:
        'Disajikan ukuran kebun berbentuk persegi panjang, peserta didik dapat menganalisis keliling dan luas kebun tersebut.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C4',
      kesulitan: 'Sulit',
      bentuk: 'PG',
    },
    {
      cp: 'Membaca, menyajikan, dan menganalisis data dalam bentuk tabel, diagram batang, atau piktogram.',
      materi: 'Penyajian dan Pengolahan Data',
      indikator:
        'Disajikan tabel data siswa SDN Kandangan I Tosari, peserta didik dapat menyelesaikan masalah yang berkaitan dengan selisih dan jumlah data.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C4',
      kesulitan: 'Sulit',
      bentuk: 'Uraian',
    },
  ],
  'Ilmu Pengetahuan Alam dan Sosial (IPAS)': [
    {
      cp: 'Memahami hubungan antarkomponen biotik dan abiotik serta pengaruhnya terhadap ekosistem di lingkungan sekitar.',
      materi: 'Ekosistem, Rantai Makanan, dan Pelestarian Alam',
      indikator:
        'Disajikan skema rantai makanan di ekosistem hutan pegunungan, peserta didik dapat menganalisis peran makhluk hidup jika salah satu populasi berubah.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C4',
      kesulitan: 'Sedang',
      bentuk: 'PG',
    },
    {
      cp: 'Mengenal keragaman kenampakan alam, bentang alam dataran tinggi, dan aktivitas ekonomi masyarakat sekitarnya.',
      materi: 'Kenampakan Alam Dataran Tinggi & Kegiatan Ekonomi',
      indikator:
        'Peserta didik dapat mengidentifikasi hubungan antara kondisi geografis dataran tinggi Tosari dengan mata pencaharian penduduknya.',
      dimensi: 'Kewargaan',
      bloom: 'C2',
      kesulitan: 'Mudah',
      bentuk: 'PG',
    },
    {
      cp: 'Memahami perubahan wujud zat dan pemanfaatan sumber energi dalam kehidupan sehari-hari.',
      materi: 'Perubahan Wujud Benda & Energi Alternatif',
      indikator:
        'Disajikan fenomena embun pagi di daerah bersuhu dingin, peserta didik dapat menjelaskan proses perubahan wujud benda beserta contohnya.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C4',
      kesulitan: 'Sulit',
      bentuk: 'Uraian',
    },
  ],
  DEFAULT: [
    {
      cp: 'Memahami konsep dasar materi pembelajaran semester berjalan sesuai Capaian Pembelajaran Kurikulum Merdeka.',
      materi: 'Konsep Dasar & Pemahaman Materi Utama',
      indikator:
        'Disajikan pernyataan atau stimulus kontekstual, peserta didik dapat mengidentifikasi konsep utama dengan tepat.',
      dimensi: 'Penalaran Kritis',
      bloom: 'C2',
      kesulitan: 'Mudah',
      bentuk: 'PG',
    },
    {
      cp: 'Menerapkan pengetahuan dan keterampilan yang dipelajari dalam situasi kehidupan sehari-hari di sekolah dan rumah.',
      materi: 'Penerapan Materi dalam Kehidupan Sehari-hari',
      indikator:
        'Disajikan ilustrasi kegiatan siswa di SDN Kandangan I Tosari, peserta didik dapat menentukan tindakan atau solusi yang tepat.',
      dimensi: 'Kemandirian',
      bloom: 'C3',
      kesulitan: 'Sedang',
      bentuk: 'PG',
    },
    {
      cp: 'Menganalisis permasalahan kontekstual dan memberikan kesimpulan atau gagasan penyelesaian yang logis.',
      materi: 'Analisis Masalah Kontekstual (HOTS)',
      indikator:
        'Disajikan kasus atau teks bacaan, peserta didik dapat menganalisis alasan dan memberikan solusi secara tertulis.',
      dimensi: 'Kreativitas',
      bloom: 'C4',
      kesulitan: 'Sulit',
      bentuk: 'Uraian',
    },
  ],
};

export const INITIAL_SAMPLE_QUESTIONS: QuestionItem[] = [
  {
    nomor: 1,
    bentuk: 'PG',
    stimulus:
      'Perhatikan rantai makanan di ekosistem ladang pegunungan Desa Kandangan berikut!\nTanaman Kubis -> Ulat Daun -> Burung Prenjak -> Elang Jawa -> Pengurai',
    pertanyaan:
      'Berdasarkan rantai makanan tersebut, apabila populasi Burung Prenjak menurun drastis akibat perburuan, maka dampak langsung yang akan terjadi pada ekosistem ladang adalah ....',
    opsi: [
      'A. Populasi tanaman kubis semakin subur dan meningkat pesat',
      'B. Populasi ulat daun meningkat tajam sehingga petani kubis merugi',
      'C. Populasi elang jawa meningkat karena makanan melimpah',
      'D. Populasi ulat daun ikut punah bersama burung prenjak',
    ],
    kunci: 'B',
    pembahasan:
      'Jika burung prenjak (konsumen II) berkurang, maka ulat daun (konsumen I) tidak memiliki pemangsa alami sehingga populasinya meledak dan merusak tanaman kubis petani.',
    skor: 1,
    materi: 'Ekosistem dan Rantai Makanan',
    indikator:
      'Disajikan rantai makanan ekosistem pegunungan, siswa dapat menganalisis dampak perubahan populasi.',
    bloom: 'C4',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
    gambarDeskripsi: 'Diagram Rantai Makanan Ladang Pegunungan Tengger: Kubis -> Ulat -> Burung Prenjak -> Elang Jawa',
    gambarUrl:
      'https://image.pollinations.ai/prompt/educational%20diagram%20food%20chain%20cabbage%20caterpillar%20bird%20eagle%20for%20elementary%20school%20clean%20white%20background?width=600&height=350&nologo=true',
  },
  {
    nomor: 2,
    bentuk: 'PG',
    stimulus:
      'Kecamatan Tosari di Kabupaten Pasuruan terletak di lereng Pegunungan Tengger dengan ketinggian lebih dari 1.700 meter di atas permukaan laut dan memiliki udara yang sejuk hingga dingin.',
    pertanyaan:
      'Jenis kegiatan ekonomi utama yang paling sesuai dan banyak dilakukan oleh masyarakat di wilayah dataran tinggi tersebut adalah ....',
    opsi: [
      'A. Budidaya tambak bandeng dan pembuatan garam',
      'B. Pertanian hortikultura (kentang, kubis, wortel, daun bawang) dan pariwisata alam',
      'C. Perkebunan kelapa sawit dan karet dataran rendah',
      'D. Perikanan tangkap laut lepas dan pengolahan kerang',
    ],
    kunci: 'B',
    pembahasan:
      'Dataran tinggi seperti Kecamatan Tosari memiliki tanah vulkanik subur dan suhu dingin yang sangat cocok untuk tanaman sayur hortikultura (kentang, kubis, wortel) serta wisata alam Gunung Bromo.',
    skor: 1,
    materi: 'Kenampakan Alam Dataran Tinggi & Kegiatan Ekonomi',
    indikator:
      'Mengidentifikasi hubungan kondisi geografis dataran tinggi Tosari dengan aktivitas ekonomi penduduk.',
    bloom: 'C2',
    kesulitan: 'Mudah',
    dimensi: 'Kewargaan',
    gambarDeskripsi: 'Pemandangan Ladang Terasering Pertanian Sayuran di Lereng Pegunungan Bromo Tosari',
    gambarUrl:
      'https://image.pollinations.ai/prompt/terraced%20vegetable%20farming%20on%20slopes%20of%20mount%20bromo%20tengger%20cabbage%20potato%20fields%20clean%20scenic%20illustration%20for%20school%20book?width=600&height=350&nologo=true',
  },
  {
    nomor: 3,
    bentuk: 'PG',
    stimulus:
      'Pada pagi hari di SDN Kandangan I Tosari, siswa melihat titik-titik air menempel pada permukaan daun tanaman di halaman sekolah, padahal malam harinya tidak turun hujan.',
    pertanyaan:
      'Peristiwa munculnya titik-titik air pada daun di pagi hari tersebut merupakan contoh perubahan wujud benda yang disebut ....',
    opsi: [
      'A. Mencair, karena es berubah menjadi air',
      'B. Menguap, karena air menyerap kalor dari matahari',
      'C. Mengembun, karena uap air di udara dingin melepaskan kalor menjadi titik air',
      'D. Menyublim, karena benda padat berubah menjadi gas',
    ],
    kunci: 'C',
    pembahasan:
      'Udara pagi di Tosari yang dingin menyebabkan uap air (gas) di udara melepaskan kalor dan berubah wujud menjadi titik-titik air (cair), yang disebut mengembun.',
    skor: 1,
    materi: 'Perubahan Wujud Zat',
    indikator: 'Menentukan proses perubahan wujud benda berdasarkan fenomena embun pagi di daerah dingin.',
    bloom: 'C3',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
  },
  {
    nomor: 4,
    bentuk: 'PGK',
    stimulus:
      'Lereng pegunungan memiliki kemiringan tanah yang cukup curam. Jika hujan deras turun terus-menerus, tanah pertanian rentan mengalami erosi dan tanah longsor.',
    pertanyaan:
      'Pilihlah DUA upaya pelestarian lingkungan yang tepat dilakukan oleh masyarakat di lereng pegunungan untuk mencegah erosi dan tanah longsor! (Jawaban benar lebih dari satu)',
    opsi: [
      '[ ] Membuat sistem terasering (sengkedan) pada lahan pertanian miring',
      '[ ] Menebang seluruh pohon berakar kuat untuk dijadikan lahan terbuka',
      '[ ] Menanam pohon pelindung berakar kuat di tepi lereng (reboisasi)',
      '[ ] Membuang sampah plastik ke saluran air di pinggir bukit',
    ],
    kunci: 'Pernyataan 1 dan Pernyataan 3',
    pembahasan:
      'Pembuatan terasering dan penanaman pohon berakar kuat menahan laju air permukaan dan mengikat tanah agar tidak mudah longsor.',
    skor: 2,
    materi: 'Pelestarian Lingkungan & Mitigasi Bencana',
    indikator: 'Menganalisis upaya pencegahan erosi di lahan miring pegunungan.',
    bloom: 'C4',
    kesulitan: 'Sulit',
    dimensi: 'Kewargaan',
  },
  {
    nomor: 5,
    bentuk: 'Isian',
    stimulus: '',
    pertanyaan:
      'Hubungan timbal balik antara makhluk hidup (komponen biotik) dengan lingkungan tak hidup (komponen abiotik) di suatu tempat disebut ....',
    opsi: [],
    kunci: 'Ekosistem',
    pembahasan:
      'Ekosistem adalah suatu sistem ekologi yang terbentuk oleh hubungan timbal balik tak terpisahkan antara makhluk hidup dengan lingkungannya.',
    skor: 2,
    materi: 'Komponen Ekosistem',
    indikator: 'Mengingat istilah hubungan timbal balik antara komponen biotik dan abiotik.',
    bloom: 'C1',
    kesulitan: 'Mudah',
    dimensi: 'Penalaran Kritis',
  },
  {
    nomor: 6,
    bentuk: 'Mencocokkan',
    stimulus:
      'Perhatikan istilah peran makhluk hidup dan proses penting dalam ekosistem ladang di Kecamatan Tosari.',
    pertanyaan:
      'Pasangkan istilah pada Kolom Kiri dengan pengertian atau perannya yang tepat pada Kolom Kanan!',
    opsi: [
      '1. Produsen => Tumbuhan hijau seperti kubis yang membuat makanan sendiri',
      '2. Konsumen I => Ulat daun pemakan tumbuhan secara langsung',
      '3. Pengurai (Dekomposer) => Jamur dan bakteri yang menguraikan sisa makhluk hidup',
    ],
    kunci: '1 -> Produsen: Tumbuhan hijau; 2 -> Konsumen I: Ulat daun; 3 -> Pengurai: Jamur dan bakteri',
    pembahasan:
      'Produsen menghasilkan makanan lewat fotosintesis, konsumen I memakan tumbuhan, dan pengurai mengembalikan zat hara ke tanah.',
    skor: 3,
    materi: 'Peran Komponen Ekosistem',
    indikator: 'Menjodohkan komponen ekosistem dengan perannya masing-masing secara tepat.',
    bloom: 'C2',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
  },
  {
    nomor: 7,
    bentuk: 'Uraian',
    stimulus:
      'Saat musim kemarau panjang atau cuaca dingin ekstrem (fenomena embun upas/frost) di wilayah pegunungan, sebagian tanaman pertanian warga dapat mengalami kerusakan.',
    pertanyaan:
      'Jelaskan mengapa fenomena embun beku dapat merusak daun tanaman kentang, serta tuliskan 2 cara yang dapat dilakukan petani untuk mengurangi kerugian tersebut!',
    opsi: [],
    kunci:
      'Embun beku merusak jaringan sel daun tanaman karena air di permukaan dan dalam sel membeku. Cara mengatasi: 1) Menyiram tanaman dengan air pada pagi hari sebelum matahari terbit untuk mencairkan es, 2) Menggunakan penutup tanaman (mulsa/paranet) atau menanam pohon pelindung.',
    pembahasan:
      'Jawaban dinilai berdasarkan ketepatan analisis penyebab kerusakan daun (skor 2) dan dua solusi logis bagi petani (skor 2).',
    skor: 4,
    materi: 'Pengaruh Cuaca dan Suhu terhadap Makhluk Hidup',
    indikator: 'Mengevaluasi dampak cuaca ekstrem di dataran tinggi terhadap pertanian dan merumuskan solusinya.',
    bloom: 'C5',
    kesulitan: 'Sulit',
    dimensi: 'Kreativitas',
  },
];

export const INITIAL_CBT_SUBMISSIONS: CBTSubmission[] = [
  {
    id: 'sub-demo-1',
    waktuSelesai: '18/11/2026 08:15',
    nama: 'BINTANG RADITYA SEPTIANO PUTRA',
    nipd: '908',
    nisn: '0153191795',
    kelas: 'Kelas 5',
    agama: 'HINDU',
    mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    skorPerolehan: 10,
    skorMaksimal: 11,
    nilaiAkhir: 91,
    benarPG: 3,
    detailBloom: 'C1: 100%, C2: 100%, C3: 100%, C4: 85%',
  },
];

export const DEFAULT_CONFIG: AssessmentConfig = {
  jenisAsesmen: 'SUMATIF AKHIR SEMESTER (SAS) GANJIL',
  tahunPelajaran: '2026/2027',
  kelas: 'Kelas 5',
  fase: 'Fase C',
  mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
  guruNama: 'Martha Dimas Lely Okta Widhana, S.Pd.',
  guruNip: '199603052020121011',
  kepsekNama: 'Akhmad Shodikin, M.Pd.',
  kepsekNip: '198503182009301009',
  hariTanggal: 'Senin, 7 Desember 2026',
  waktu: '90 Menit (07.30 - 09.00 WIB)',
  durasiMenit: 60,
  tokenCBT: generateRandomToken('CBT'),
  tanggalTtd: 'Tosari, 18 November 2026',
  konteksLokal: true,
  sertakanGambar: true,
  dimensiPilihan: ['Penalaran Kritis', 'Kemandirian', 'Kewargaan', 'Kreativitas'],
  jmlPG: 10,
  jmlPGK: 2,
  jmlIsian: 4,
  jmlMencocokkan: 2,
  jmlUraian: 2,
  propMudah: 30,
  propSedang: 50,
  propSulit: 20,
  bloomDistribution: {
    C1: true,
    C2: true,
    C3: true,
    C4: true,
    C5: true,
    C6: false,
  },
};

export const DEFAULT_SCHOOL_PROFILE: SchoolProfile = {
  namaInstansiAtas: 'PEMERINTAH KABUPATEN PASURUAN',
  namaDinas: 'DINAS PENDIDIKAN DAN KEBUDAYAAN',
  namaSekolahHeader: 'SDN KANDANGAN I TOSARI',
  namaSingkat: 'SDN Kandangan I Tosari',
  lokasiSingkat: 'Tosari · Kab. Pasuruan',
  npsn: '20519234',
  akreditasi: 'B',
  alamatLengkap:
    'Desa Kandangan, Kecamatan Tosari, Kabupaten Pasuruan, Provinsi Jawa Timur — Kode Pos 67177',
  kontakInfo: 'Email: sdnkandangan1tosari@gmail.com',
  kepsekNama: 'Akhmad Shodikin, M.Pd.',
  kepsekNip: '198503182009301009',
  kotaTtd: 'Tosari',
  logoKiri: '/assets/logo-pasuruan.png',
  logoKanan: '/assets/logo-sekolah.png',
  tampilkanLogoKiri: true,
  tampilkanLogoKanan: true,
  perataanKop: 'center',
  gayaGarisKop: 'double',
};

export function buildLocalTemplateQuestions(
  config: AssessmentConfig,
  kisiKisiList: KisiKisiItem[]
): QuestionItem[] {
  const list: QuestionItem[] = [];
  let num = 1;
  const blooms = Object.keys(config.bloomDistribution).filter((k) => config.bloomDistribution[k]);
  const activeBloomList = blooms.length > 0 ? blooms : ['C2', 'C3', 'C4'];
  const isLowGrade = (parseInt(config.kelas.replace(/\D/g, ''), 10) || 5) <= 2;

  for (let i = 0; i < config.jmlPG; i++) {
    const kItem = kisiKisiList[i % Math.max(1, kisiKisiList.length)] || {
      materi: `Materi ${config.mapel}`,
      indikator: `Menganalisis konsep ${config.mapel}`,
      dimensi: 'Penalaran Kritis',
    };
    const bLevel = activeBloomList[i % activeBloomList.length];
    const diff = i % 5 === 0 ? 'Sulit' : i % 2 === 0 ? 'Sedang' : 'Mudah';
    const opts = isLowGrade
      ? [
          `A. Penerapan konsep ${kItem.materi} secara tepat dan bertanggung jawab`,
          `B. Mengabaikan aturan dalam ${kItem.materi} di sekolah`,
          `C. Menunda kegiatan yang berkaitan dengan ${kItem.materi}`,
        ]
      : [
          `A. Penerapan konsep ${kItem.materi} secara tepat sesuai prinsip pembelajaran`,
          `B. Mengabaikan langkah-langkah utama pada ${kItem.materi}`,
          `C. Hanya mengamati tanpa memahami konsep ${kItem.materi}`,
          `D. Melakukan tindakan yang bertentangan dengan ${kItem.materi}`,
        ];

    let gambarUrl: string | undefined;
    let gambarDeskripsi: string | undefined;
    if (config.sertakanGambar && i % 2 === 0) {
      gambarDeskripsi = `Diagram stimulus ilustrasi: ${kItem.materi} (${config.mapel} ${config.kelas})`;
      const cleanPrompt = `elementary school textbook illustration or diagram: ${kItem.materi}, ${config.mapel}, clean white background, educational graphic`;
      gambarUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=600&height=400&nologo=true`;
    }

    list.push({
      nomor: num++,
      bentuk: 'PG',
      stimulus: config.konteksLokal
        ? `Perhatikan kegiatan pembelajaran siswa ${config.kelas} di SDN Kandangan I Tosari yang berada di kawasan sejuk lereng Pegunungan Tengger berkaitan dengan topik "${kItem.materi}".`
        : `Perhatikan pernyataan berkaitan dengan topik "${kItem.materi}" berikut!`,
      pertanyaan: `Berdasarkan indikator "${kItem.indikator}", manakah pernyataan atau tindakan yang paling tepat di bawah ini?`,
      opsi: opts,
      kunci: 'A',
      pembahasan: `Opsi A sesuai dengan indikator pencapaian kompetensi pada materi ${kItem.materi}.`,
      skor: 1,
      materi: kItem.materi,
      indikator: kItem.indikator,
      bloom: bLevel,
      kesulitan: diff,
      dimensi: kItem.dimensi || 'Penalaran Kritis',
      gambarUrl,
      gambarDeskripsi,
    });
  }

  for (let i = 0; i < config.jmlPGK; i++) {
    const kItem = kisiKisiList[i % Math.max(1, kisiKisiList.length)] || {
      materi: config.mapel,
      indikator: 'Menganalisis pernyataan benar',
      dimensi: 'Penalaran Kritis',
    };
    list.push({
      nomor: num++,
      bentuk: 'PGK',
      stimulus: `Bacalah informasi tentang ${kItem.materi} di lingkungan masyarakat Desa Kandangan, Kecamatan Tosari berikut!`,
      pertanyaan: `Pilihlah DUA pernyataan yang benar berkaitan dengan ${kItem.materi}! (Jawaban benar lebih dari satu)`,
      opsi: [
        `[ ] Menjaga kelestarian dan menerapkan ${kItem.materi} dengan disiplin`,
        `[ ] Merusak fasilitas umum yang berkaitan dengan ${kItem.materi}`,
        `[ ] Bekerja sama dan bergotong royong dalam kegiatan ${kItem.materi}`,
        `[ ] Bersikap acuh tak acuh terhadap lingkungan sekitar`,
      ],
      kunci: 'Pernyataan 1 dan Pernyataan 3',
      pembahasan: 'Pernyataan 1 dan 3 menunjukkan sikap positif dan konsep yang tepat sesuai materi.',
      skor: 2,
      materi: kItem.materi,
      indikator: kItem.indikator,
      bloom: 'C4',
      kesulitan: 'Sedang',
      dimensi: kItem.dimensi || 'Kewargaan',
    });
  }

  for (let i = 0; i < config.jmlIsian; i++) {
    const kItem = kisiKisiList[i % Math.max(1, kisiKisiList.length)] || {
      materi: config.mapel,
      indikator: 'Menyebutkan istilah utama',
      dimensi: 'Kemandirian',
    };
    list.push({
      nomor: num++,
      bentuk: 'Isian',
      stimulus: '',
      pertanyaan: `Istilah atau konsep utama yang menjelaskan tentang ${kItem.materi.toLowerCase()} sesuai dengan indikator "${kItem.indikator}" disebut ....`,
      opsi: [],
      kunci: kItem.materi,
      pembahasan: `Jawaban yang tepat merujuk pada konsep inti ${kItem.materi}.`,
      skor: 2,
      materi: kItem.materi,
      indikator: kItem.indikator,
      bloom: 'C2',
      kesulitan: 'Mudah',
      dimensi: kItem.dimensi || 'Kemandirian',
    });
  }

  for (let i = 0; i < (Number(config.jmlMencocokkan) || 0); i++) {
    const kItem = kisiKisiList[i % Math.max(1, kisiKisiList.length)] || {
      materi: config.mapel,
      indikator: 'Menjodohkan pasangan konsep yang tepat',
      dimensi: 'Penalaran Kritis',
    };
    const pairs = [
      `1. Konsep inti ${kItem.materi} => Penjelasan utama sesuai indikator`,
      `2. Penerapan ${kItem.materi} di sekolah => Contoh praktik positif siswa`,
      `3. Manfaat mempelajari ${kItem.materi} => Solusi masalah sehari-hari`,
    ];
    list.push({
      nomor: num++,
      bentuk: 'Mencocokkan',
      stimulus: `Perhatikan pasangan pernyataan berikut yang berkaitan dengan materi ${kItem.materi}.`,
      pertanyaan: `Pasangkan pernyataan pada Kolom Kiri dengan jawaban yang paling tepat pada Kolom Kanan!`,
      opsi: pairs,
      kunci: '1 -> Penjelasan utama; 2 -> Contoh praktik positif; 3 -> Solusi masalah',
      pembahasan: `Setiap premis pada kolom kiri dipasangkan dengan pasangan makna yang sesuai pada materi ${kItem.materi}.`,
      skor: 3,
      materi: kItem.materi,
      indikator: kItem.indikator,
      bloom: 'C3',
      kesulitan: 'Sedang',
      dimensi: kItem.dimensi || 'Penalaran Kritis',
    });
  }

  for (let i = 0; i < config.jmlUraian; i++) {
    const kItem = kisiKisiList[i % Math.max(1, kisiKisiList.length)] || {
      materi: config.mapel,
      indikator: 'Menguraikan solusi permasalahan',
      dimensi: 'Kreativitas',
    };
    let uraianGambarUrl: string | undefined;
    let uraianGambarDeskripsi: string | undefined;
    if (config.sertakanGambar && i === 0) {
      uraianGambarDeskripsi = `Bagan studi kasus atau ilustrasi: ${kItem.materi}`;
      const cleanPrompt = `elementary school textbook illustration or diagram: ${kItem.materi}, clean white background`;
      uraianGambarUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=600&height=400&nologo=true`;
    }
    list.push({
      nomor: num++,
      bentuk: 'Uraian',
      stimulus: `Di lingkungan sekitar SDN Kandangan I Tosari, pemahaman mengenai ${kItem.materi} sangat bermanfaat bagi kehidupan sehari-hari.`,
      pertanyaan: `Jelaskan dengan bahasamu sendiri mengapa ${kItem.materi} penting dipelajari, dan sebutkan 2 contoh penerapannya dalam kehidupan sehari-hari!`,
      opsi: [],
      kunci: `Karena membantu memahami ${kItem.materi} secara utuh. Contoh penerapan: 1) Menerapkan di lingkungan sekolah, 2) Menerapkan di rumah bersama keluarga.`,
      pembahasan:
        'Skor penuh (4) diberikan jika siswa menjelaskan alasan dengan logis dan menyebutkan 2 contoh penerapan yang relevan.',
      skor: 4,
      materi: kItem.materi,
      indikator: kItem.indikator,
      bloom: 'C5',
      kesulitan: 'Sulit',
      dimensi: kItem.dimensi || 'Kreativitas',
      gambarUrl: uraianGambarUrl,
      gambarDeskripsi: uraianGambarDeskripsi,
    });
  }

  return list;
}

export const INITIAL_BANK_QUESTIONS: BankQuestionItem[] = [
  ...INITIAL_SAMPLE_QUESTIONS.map((q, idx) => ({
    ...q,
    id: `bank-ipas-5-${idx + 1}`,
    mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan' as const,
    createdAt: '2026-11-10T08:00:00.000Z',
  })),
  {
    id: 'bank-ipas-5-7',
    nomor: 7,
    bentuk: 'PG',
    stimulus:
      'Sinar matahari memanaskan air di permukaan sungai dan laut sehingga menguap ke udara, kemudian membentuk awan dan turun sebagai hujan di pegunungan Tosari.',
    pertanyaan:
      'Perubahan wujud air dari cair menjadi uap air akibat panas matahari dalam siklus air disebut ....',
    opsi: ['A. Kondensasi', 'B. Evaporasi', 'C. Presipitasi', 'D. Infiltrasi'],
    kunci: 'B',
    pembahasan:
      'Evaporasi adalah proses penguapan air dari permukaan bumi ke atmosfer akibat energi panas matahari.',
    skor: 1,
    materi: 'Siklus Air dan Pelestarian Sumber Air',
    indikator: 'Mengidentifikasi tahapan penguapan pada siklus air.',
    bloom: 'C2',
    kesulitan: 'Mudah',
    dimensi: 'Penalaran Kritis',
    mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-10T08:05:00.000Z',
  },
  {
    id: 'bank-mtk-5-1',
    nomor: 1,
    bentuk: 'PG',
    stimulus:
      'Kelompok tani Desa Kandangan memanen 1.250 kg kentang pada pagi hari dan 875 kg kentang pada sore hari. Sebanyak 1.400 kg langsung dikirim ke pasar.',
    pertanyaan: 'Berapa kilogram sisa kentang yang belum dikirim ke pasar?',
    opsi: ['A. 625 kg', 'B. 725 kg', 'C. 775 kg', 'D. 825 kg'],
    kunci: 'B',
    pembahasan: '(1.250 + 875) - 1.400 = 2.125 - 1.400 = 725 kg.',
    skor: 1,
    materi: 'Operasi Hitung Bilangan Cacah',
    indikator: 'Menyelesaikan masalah penjumlahan dan pengurangan bilangan cacah.',
    bloom: 'C3',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:00:00.000Z',
  },
  {
    id: 'bank-mtk-5-2',
    nomor: 2,
    bentuk: 'PG',
    stimulus:
      'Sebuah lahan kebun kubis berbentuk persegi panjang memiliki panjang 24 meter dan lebar 15 meter.',
    pertanyaan: 'Keliling lahan kebun kubis tersebut adalah ....',
    opsi: ['A. 39 meter', 'B. 78 meter', 'C. 180 meter', 'D. 360 meter'],
    kunci: 'B',
    pembahasan: 'Keliling persegi panjang = 2 × (p + l) = 2 × (24 + 15) = 2 × 39 = 78 meter.',
    skor: 1,
    materi: 'Keliling dan Luas Bangun Datar',
    indikator: 'Menghitung keliling persegi panjang dalam soal kontekstual.',
    bloom: 'C3',
    kesulitan: 'Mudah',
    dimensi: 'Penalaran Kritis',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:05:00.000Z',
  },
  {
    id: 'bank-mtk-5-3',
    nomor: 3,
    bentuk: 'PGK',
    stimulus: 'Diketahui data pecahan: 1/2, 2/4, 3/5, dan 4/8.',
    pertanyaan: 'Pilihlah TIGA pecahan yang memiliki nilai senilai di bawah ini!',
    opsi: [
      '[ ] Pecahan 1/2',
      '[ ] Pecahan 2/4',
      '[ ] Pecahan 3/5',
      '[ ] Pecahan 4/8',
    ],
    kunci: 'Pernyataan 1, Pernyataan 2, dan Pernyataan 4',
    pembahasan: '1/2 = 2/4 = 4/8 (semua bernilai 0,5), sedangkan 3/5 bernilai 0,6.',
    skor: 2,
    materi: 'Pecahan Senilai',
    indikator: 'Membandingkan dan menentukan pecahan-pecahan yang senilai.',
    bloom: 'C4',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:10:00.000Z',
  },
  {
    id: 'bank-mtk-5-4',
    nomor: 4,
    bentuk: 'Isian',
    stimulus: '',
    pertanyaan: 'Hasil dari 3/4 + 1/2 dalam bentuk pecahan campuran paling sederhana adalah ....',
    opsi: [],
    kunci: '1 1/4',
    pembahasan: '3/4 + 2/4 = 5/4 = 1 1/4.',
    skor: 2,
    materi: 'Operasi Hitung Pecahan',
    indikator: 'Menghitung penjumlahan pecahan berbeda penyebut.',
    bloom: 'C3',
    kesulitan: 'Sedang',
    dimensi: 'Kemandirian',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:15:00.000Z',
  },
  {
    id: 'bank-mtk-5-5',
    nomor: 5,
    bentuk: 'Uraian',
    stimulus:
      'Kolam penampungan air bersih di sekolah berbentuk balok dengan panjang 2 meter, lebar 1,5 meter, dan tinggi 1 meter.',
    pertanyaan:
      'Hitunglah volume maksimal air yang dapat ditampung kolam tersebut dalam satuan liter (1 m³ = 1.000 liter)!',
    opsi: [],
    kunci: 'Volume = 2 × 1,5 × 1 = 3 m³ = 3 × 1.000 = 3.000 liter.',
    pembahasan:
      'Skor penuh diberikan jika siswa menuliskan rumus volume balok (skor 1), menghitung hasil m³ (skor 1), dan mengonversi ke liter dengan benar (skor 2).',
    skor: 4,
    materi: 'Volume Bangun Ruang Sederhana',
    indikator: 'Memecahkan masalah volume balok dalam kehidupan sehari-hari.',
    bloom: 'C4',
    kesulitan: 'Sulit',
    dimensi: 'Kreativitas',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:20:00.000Z',
  },
  {
    id: 'bank-bin-5-1',
    nomor: 1,
    bentuk: 'PG',
    stimulus:
      'Kabut tipis menyelimuti lereng Pegunungan Tengger setiap pagi. Petani tetap bersemangat merawat tanaman kentang dan kubis agar menghasilkan panen berkualitas.',
    pertanyaan: 'Ide pokok yang tepat untuk paragraf di atas adalah ....',
    opsi: [
      'A. Tanaman kentang hanya tumbuh di malam hari',
      'B. Semangat petani merawat tanaman di tengah kabut pagi Pegunungan Tengger',
      'C. Harga kubis mengalami kenaikan di pasar',
      'D. Pegunungan Tengger selalu hujan setiap sore',
    ],
    kunci: 'B',
    pembahasan: 'Paragraf membahas semangat petani di lereng Tengger merawat tanaman saat kabut pagi.',
    skor: 1,
    materi: 'Ide Pokok Paragraf',
    indikator: 'Menentukan ide pokok paragraf teks informatif.',
    bloom: 'C4',
    kesulitan: 'Sedang',
    dimensi: 'Penalaran Kritis',
    mapel: 'Bahasa Indonesia',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-12T08:00:00.000Z',
  },
  {
    id: 'bank-bin-5-2',
    nomor: 2,
    bentuk: 'Isian',
    stimulus: '',
    pertanyaan:
      'Penulisan huruf kapital yang benar untuk kalimat "lomba cerdas cermat diadakan di kecamatan tosari pada hari senin" pada kata tempat dan hari adalah ....',
    opsi: [],
    kunci: 'Kecamatan Tosari dan Senin',
    pembahasan: 'Nama tempat geografis (Kecamatan Tosari) dan nama hari (Senin) diawali huruf kapital.',
    skor: 2,
    materi: 'Ejaan dan Huruf Kapital',
    indikator: 'Memperbaiki penggunaan huruf kapital pada nama tempat dan hari.',
    bloom: 'C3',
    kesulitan: 'Mudah',
    dimensi: 'Komunikasi',
    mapel: 'Bahasa Indonesia',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-12T08:10:00.000Z',
  },
  {
    id: 'bank-ppkn-5-1',
    nomor: 1,
    bentuk: 'PG',
    stimulus:
      'Di SDN Kandangan I Tosari, siswa yang beragama Hindu, Islam, dan Kristen saling menghormati ketika teman sedang beribadah maupun merayakan hari besar keagamaan.',
    pertanyaan:
      'Sikap kerukunan antarumat beragama tersebut mencerminkan pengamalan Pancasila sila ke- ....',
    opsi: ['A. Pertama', 'B. Kedua', 'C. Keempat', 'D. Kelima'],
    kunci: 'A',
    pembahasan:
      'Toleransi dan saling menghormati kebebasan beribadah merupakan pengamalan Sila ke-1 Ketuhanan Yang Maha Esa.',
    skor: 1,
    materi: 'Nilai-Nilai Pancasila dalam Kehidupan Sehari-hari',
    indikator: 'Mengidentifikasi perilaku toleransi sebagai pengamalan sila pertama Pancasila.',
    bloom: 'C2',
    kesulitan: 'Mudah',
    dimensi: 'Keimanan dan Ketakwaan terhadap Tuhan YME',
    mapel: 'Pendidikan Pancasila',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-13T08:00:00.000Z',
  },
  {
    id: 'bank-mtk-5-6',
    nomor: 6,
    bentuk: 'Mencocokkan',
    stimulus: 'Perhatikan sifat-sifat bangun datar berikut ini.',
    pertanyaan: 'Pasangkan nama bangun datar pada Kolom Kiri dengan rumus luasnya pada Kolom Kanan!',
    opsi: [
      '1. Persegi => sisi × sisi',
      '2. Persegi Panjang => panjang × lebar',
      '3. Segitiga => 1/2 × alas × tinggi',
    ],
    kunci: '1 -> sisi × sisi; 2 -> panjang × lebar; 3 -> 1/2 × alas × tinggi',
    pembahasan: 'Masing-masing rumus luas bangun datar sesuai kaidah geometri dasar.',
    skor: 3,
    materi: 'Keliling dan Luas Bangun Datar',
    indikator: 'Menjodohkan bangun datar dengan rumus luasnya.',
    bloom: 'C2',
    kesulitan: 'Mudah',
    dimensi: 'Penalaran Kritis',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    sumber: 'Bank Bawaan',
    createdAt: '2026-11-11T08:25:00.000Z',
  },
];

export const INITIAL_EXAM_PACKAGES: ExamPackage[] = [
  {
    id: 'pkg-ipas5-a',
    kodePaket: 'PKT-IPAS5-A',
    namaPaket: 'Paket A — SAS Ganjil IPAS Kelas 5',
    deskripsi:
      'Paket utama asesmen sumatif IPAS Kelas 5 berbasis konteks lingkungan Pegunungan Tengger.',
    mapel: 'Ilmu Pengetahuan Alam dan Sosial (IPAS)',
    kelas: 'Kelas 5',
    fase: 'Fase C',
    jenisAsesmen: 'SUMATIF AKHIR SEMESTER (SAS) GANJIL',
    durasiMenit: 60,
    tokenCBT: generateRandomToken('IPA5'),
    kktp: 75,
    acakSoal: false,
    acakOpsi: false,
    status: 'Aktif',
    questions: INITIAL_SAMPLE_QUESTIONS,
    createdAt: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:00:00.000Z',
  },
  {
    id: 'pkg-mtk5-b',
    kodePaket: 'PKT-MTK5-B',
    namaPaket: 'Paket B — Uji Kompetensi Matematika Kelas 5',
    deskripsi:
      'Paket soal CBT Matematika Kelas 5 mencakup bilangan cacah, keliling bangun datar, pecahan, mencocokkan rumus, dan volume.',
    mapel: 'Matematika',
    kelas: 'Kelas 5',
    fase: 'Fase C',
    jenisAsesmen: 'ASESMEN SUMATIF TENGAH SEMESTER (ASTS)',
    durasiMenit: 60,
    tokenCBT: generateRandomToken('MTK5'),
    kktp: 75,
    acakSoal: true,
    acakOpsi: true,
    status: 'Aktif',
    questions: INITIAL_BANK_QUESTIONS.filter((q) => q.mapel === 'Matematika').map((q, i) => ({
      nomor: i + 1,
      bentuk: q.bentuk,
      stimulus: q.stimulus,
      pertanyaan: q.pertanyaan,
      opsi: q.opsi,
      kunci: q.kunci,
      pembahasan: q.pembahasan,
      skor: q.skor,
      materi: q.materi,
      indikator: q.indikator,
      bloom: q.bloom,
      kesulitan: q.kesulitan,
      dimensi: q.dimensi,
    })),
    createdAt: '2026-11-16T09:00:00.000Z',
    updatedAt: '2026-11-16T09:00:00.000Z',
  },
];

