import React from 'react';
import { Download, Printer } from 'lucide-react';
import type { AssessmentConfig, QuestionItem, SchoolProfile } from '../types';
import { exportWordDocument } from '../utils/exportHelpers';
import { KopNaskah } from './KopNaskah';

interface TabKunciRubrikProps {
  config: AssessmentConfig;
  schoolProfile: SchoolProfile;
  questions: QuestionItem[];
  totalScore: number;
}

export const TabKunciRubrik: React.FC<TabKunciRubrikProps> = ({
  config,
  schoolProfile,
  questions,
  totalScore,
}) => {
  return (
    <div className="space-y-4">
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-slate-600">
          Total Skor Maksimal:{' '}
          <strong className="text-emerald-800 font-mono text-sm">{totalScore} Poin</strong>{' '}
          <span aria-hidden="true">·</span> Rumus Nilai Akhir = (Skor Perolehan / {totalScore}) ×
          100
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() =>
              exportWordDocument(
                'printable-kunci',
                `Kunci_Jawaban_${config.mapel}_${config.kelas}_SDN_Kandangan_I`
              )
            }
            className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Word (.doc)</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Kunci Jawaban</span>
          </button>
        </div>
      </div>

      <div
        id="printable-kunci"
        className="print-area bg-white p-8 rounded-xl border border-slate-200 font-serif-exam text-black"
      >
        <KopNaskah schoolProfile={schoolProfile} />
        <div className="mb-5 text-center">
          <h2 className="text-base md:text-lg font-bold uppercase underline">
            KUNCI JAWABAN, PEMBAHASAN, DAN PEDOMAN PENSKORAN
          </h2>
          <p className="text-sm font-bold uppercase mt-0.5">
            {config.jenisAsesmen} — TP {config.tahunPelajaran}
          </p>
          <p className="text-xs mt-1">
            Mata Pelajaran: <strong>{config.mapel}</strong> | Kelas:{' '}
            <strong>
              {config.kelas} ({config.fase})
            </strong>{' '}
            | Guru Pengampu: <strong>{config.guruNama}</strong>
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs md:text-sm">
          <thead>
            <tr className="bg-slate-100 text-center font-bold">
              <th className="border border-black p-2 w-12">No</th>
              <th className="border border-black p-2 w-24">Bentuk</th>
              <th className="border border-black p-2 w-48">Kunci Jawaban</th>
              <th className="border border-black p-2">Pembahasan / Kriteria Rubrik Penilaian</th>
              <th className="border border-black p-2 w-20">Bloom</th>
              <th className="border border-black p-2 w-16">Skor</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q, idx) => (
              <tr key={idx} className="avoid-break">
                <td className="border border-black p-2 text-center font-mono font-bold">
                  {q.nomor}
                </td>
                <td className="border border-black p-2 text-center">{q.bentuk}</td>
                <td className="border border-black p-2 font-bold text-emerald-950">{q.kunci}</td>
                <td className="border border-black p-2">{q.pembahasan}</td>
                <td className="border border-black p-2 text-center font-mono font-semibold">
                  {q.bloom}
                </td>
                <td className="border border-black p-2 text-center font-mono font-bold">
                  {q.skor}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold">
              <td colSpan={5} className="border border-black p-2 text-right">
                TOTAL SKOR MAKSIMAL
              </td>
              <td className="border border-black p-2 text-center font-mono">{totalScore}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 p-3 border border-black text-xs">
          <strong>Pedoman Penilaian Akhir:</strong> Nilai Akhir = (Jumlah Skor Perolehan Siswa ÷{' '}
          {totalScore}) × 100
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
                  Guru Pengampu
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
