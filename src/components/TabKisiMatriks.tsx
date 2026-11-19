import React from 'react';
import { Download, FileSpreadsheet, Printer } from 'lucide-react';
import type { AssessmentConfig, QuestionItem, SchoolProfile } from '../types';
import { exportKisiKisiCSV, exportWordDocument } from '../utils/exportHelpers';
import { KopNaskah } from './KopNaskah';

interface TabKisiMatriksProps {
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  questions: QuestionItem[];
  bloomCounts: Record<string, number>;
  diffCounts: { Mudah: number; Sedang: number; Sulit: number };
}

export const TabKisiMatriks: React.FC<TabKisiMatriksProps> = ({
  config,
  schoolProfile,
  questions,
  bloomCounts,
  diffCounts,
}) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="no-print grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500">Sebaran Taksonomi Bloom</span>
          <div className="grid grid-cols-6 gap-1.5 mt-2 text-center">
            {Object.entries(bloomCounts).map(([code, count]) => (
              <div
                key={code}
                className="bg-emerald-50 border border-emerald-200 rounded-lg py-1.5"
              >
                <span className="text-xs font-mono font-bold text-emerald-900 block">{code}</span>
                <span className="text-sm font-mono font-bold text-emerald-700">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <span className="text-xs font-bold text-slate-500">Sebaran Tingkat Kesulitan</span>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg py-1.5">
              <span className="text-xs font-semibold text-emerald-800 block">Mudah</span>
              <span className="text-base font-mono font-bold text-emerald-900">
                {diffCounts.Mudah} Soal
              </span>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg py-1.5">
              <span className="text-xs font-semibold text-amber-800 block">Sedang</span>
              <span className="text-base font-mono font-bold text-amber-900">
                {diffCounts.Sedang} Soal
              </span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-lg py-1.5">
              <span className="text-xs font-semibold text-rose-800 block">Sulit</span>
              <span className="text-base font-mono font-bold text-rose-900">
                {diffCounts.Sulit} Soal
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500">Ekspor Dokumen Kisi-Kisi</span>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={() => exportKisiKisiCSV(questions, config)}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>CSV</span>
            </button>
            <button
              type="button"
              onClick={() =>
                exportWordDocument(
                  'printable-kisikisi',
                  `Kisi_Kisi_${config.mapel}_${config.kelas}_SDN_Kandangan_I`
                )
              }
              className="flex-1 flex items-center justify-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>Word</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Matriks */}
      <div
        id="printable-kisikisi"
        className="print-area bg-white p-8 rounded-xl border border-slate-200 font-serif-exam text-black"
      >
        <KopNaskah schoolProfile={schoolProfile} />
        <div className="mb-4 text-center">
          <h2 className="text-base md:text-lg font-bold uppercase underline">
            KISI-KISI PENULISAN SOAL {config.jenisAsesmen}
          </h2>
          <p className="text-sm font-bold uppercase">
            TAHUN PELAJARAN {config.tahunPelajaran}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-xs md:text-sm">
          <div>
            <p>
              <strong>Mata Pelajaran:</strong> {config.mapel}
            </p>
            <p>
              <strong>Kelas / Fase:</strong> {config.kelas} ({config.fase})
            </p>
          </div>
          <div>
            <p>
              <strong>Kurikulum:</strong> Kurikulum Merdeka (8 Dimensi Lulusan)
            </p>
            <p>
              <strong>Jumlah Soal:</strong> {questions.length} Butir ({config.jmlPG} PG,{' '}
              {config.jmlPGK} PGK, {config.jmlIsian} Isian, {config.jmlUraian} Uraian)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs">
            <thead>
              <tr className="bg-slate-100 text-center font-bold">
                <th className="border border-black p-2 w-10">No</th>
                <th className="border border-black p-2">Materi Pokok</th>
                <th className="border border-black p-2">Indikator Soal</th>
                <th className="border border-black p-2 w-36">8 Dimensi Lulusan</th>
                <th className="border border-black p-2 w-20">Bloom</th>
                <th className="border border-black p-2 w-24">Kesulitan</th>
                <th className="border border-black p-2 w-24">Bentuk</th>
                <th className="border border-black p-2 w-16">No. Soal</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((q, i) => (
                <tr key={i} className="avoid-break">
                  <td className="border border-black p-2 text-center font-mono">{i + 1}</td>
                  <td className="border border-black p-2 font-semibold">{q.materi}</td>
                  <td className="border border-black p-2">{q.indikator}</td>
                  <td className="border border-black p-2 text-center">{q.dimensi}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold">
                    {q.bloom}
                  </td>
                  <td className="border border-black p-2 text-center">{q.kesulitan}</td>
                  <td className="border border-black p-2 text-center">{q.bentuk}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold">
                    {q.nomor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
                  Penyusun / Guru Pengampu
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
