# SMART ASESMEN & CBT — SDN KANDANGAN I TOSARI

Portal Manajemen Asesmen Kurikulum Merdeka, Generator Soal Berbasis Multi-AI (Google Gemini, OpenAI GPT, Anthropic Claude), Portal Ujian CBT Online Siswa, serta Ekspor Otomatis Google Forms & Berita Acara untuk **SDN Kandangan I Tosari**, Kecamatan Tosari, Kabupaten Pasuruan.

---

## 🌟 Fitur Utama

- **Generator Soal Multi-AI**:
  - Dukungan Google Gemini (`gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`) dengan fallback otomatis
  - Dukungan OpenAI GPT (`gpt-4o-mini`, `gpt-4o`)
  - Dukungan Anthropic Claude (`claude-3-5-haiku`, `claude-3-5-sonnet`)
  - Generator stimulus visual & diagram SVG edukatif untuk soal matematika dan IPA
  - Pembuatan soal instan berbasis Template Cerdas Lokal tanpa kuota AI
- **Penyusunan Berdasarkan Kurikulum Merdeka**:
  - Matriks Taksonomi Bloom (C1–C6) & sebaran tingkat kesulitan (Mudah, Sedang, Sulit/HOTS)
  - Integrasi 8 Dimensi Lulusan & Kearifan Lokal dataran tinggi Tengger/Bromo
  - 5 Bentuk Soal: Pilihan Ganda (PG), PG Kompleks (PGK), Isian Singkat, Mencocokkan / Menjodohkan, dan Uraian / Esai
- **Portal Simulasi & Ujian CBT Online**:
  - Autentikasi peran multi-user: Siswa, Guru, Kepala Sekolah, dan Administrator
  - Navigasi butir soal interaktif, penghitung waktu mundur (*countdown timer*), dan ragu-ragu
  - Token ujian acak untuk keamanan pelaksanaan tes
- **Ekspor & Integrasi Lengkap**:
  - Ekspor otomatis ke **Google Forms & Spreadsheet Nilai** via Google Apps Script (termasuk stimulus gambar)
  - Ekspor ke naskah **Microsoft Word (.docx / .doc)** ber-kop resmi
  - Cetak Naskah Soal, Kunci Jawaban, Kisi-Kisi Matriks, Kartu Peserta Ujian, dan Berita Acara ke format **PDF**

---

## 🚀 Panduan Menjalankan Aplikasi

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 18+) atau [Bun](https://bun.sh/)
- Peramban web modern (Google Chrome, Microsoft Edge, Mozilla Firefox)

### 2. Instalasi Dependensi
```bash
bun install
# atau
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi konfigurasi API key (opsional, dapat diatur langsung lewat menu **Setting Multi-AI** di aplikasi):
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash-lite
PORT=3002
```

### 4. Menjalankan Aplikasi
```bash
bun run dev
# atau
npm run dev
```
Buka peramban pada alamat: **http://localhost:3002**

---

## 📂 Struktur Proyek

```
├── public/                 # Aset statis & logo sekolah resmi
│   └── assets/             # logo-sekolah.png, logo-pasuruan.png
├── src/
│   ├── components/         # Komponen UI tiap modul & tab aplikasi
│   ├── data/               # Data sekolah, guru, siswa, dan bank soal bawaan
│   ├── types.ts            # Definisi antarmuka TypeScript
│   └── utils/              # Helper ekspor Google Form, Word, CBT
├── server.ts               # Express server & integrasi Multi-AI API
├── vite.config.ts          # Konfigurasi Vite & Tailwind CSS
└── package.json
```

---

## 🏫 Identitas Sekolah
- **Satuan Pendidikan**: SDN Kandangan I Tosari
- **Kecamatan / Kabupaten**: Tosari, Kabupaten Pasuruan, Jawa Timur
- **Kurikulum**: Kurikulum Merdeka
