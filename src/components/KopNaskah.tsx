import React from 'react';
import type { SchoolProfile } from '../types';

export const DEFAULT_CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <path d="M60 8 L104 22 V60 C104 86 84 104 60 112 C36 104 16 86 16 60 V22 Z" fill="#ecfdf5" stroke="#064e3b" stroke-width="5"/>
  <path d="M60 16 L96 28 V60 C96 81 79 97 60 104 C41 97 24 81 24 60 V28 Z" fill="none" stroke="#065f46" stroke-width="2"/>
  <polygon points="60,24 63.8,33.5 74,33.8 66,40 68.8,49.8 60,44 51.2,49.8 54,40 46,33.8 56.2,33.5" fill="#d97706" stroke="#78350f" stroke-width="1.5"/>
  <path d="M36 58 C46 54 54 56 60 62 C66 56 74 54 84 58 V84 C74 80 66 82 60 88 C54 82 46 80 36 84 Z" fill="#ffffff" stroke="#064e3b" stroke-width="3" stroke-linejoin="round"/>
  <line x1="60" y1="62" x2="60" y2="88" stroke="#064e3b" stroke-width="2.5"/>
</svg>`;

export function getDefaultCrestDataUrl(): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(DEFAULT_CREST_SVG)}`;
}

interface KopNaskahProps {
  schoolProfile: SchoolProfile;
  compact?: boolean;
}

export const KopNaskah: React.FC<KopNaskahProps> = ({ schoolProfile, compact = false }) => {
  const borderClass =
    schoolProfile.gayaGarisKop === 'double'
      ? 'border-b-4 border-double border-black'
      : schoolProfile.gayaGarisKop === 'thick-thin'
        ? 'border-b-[3px] border-black'
        : 'border-b border-black';

  const leftSrc = schoolProfile.logoKiri || getDefaultCrestDataUrl();
  const rightSrc = schoolProfile.logoKanan || getDefaultCrestDataUrl();

  const showLeft = schoolProfile.tampilkanLogoKiri;
  const showRight = schoolProfile.tampilkanLogoKanan && Boolean(schoolProfile.logoKanan);
  const logoSizeClass = compact ? 'w-11 h-11' : 'w-16 h-16 md:w-[70px] md:h-[70px]';

  const alignClass =
    schoolProfile.perataanKop === 'left' ? 'text-left' : 'text-center';

  return (
    <div className={`${borderClass} pb-3 mb-5`}>
      <div className="flex items-center justify-between gap-4">
        {showLeft && (
          <div className={`${logoSizeClass} shrink-0 flex items-center justify-center`}>
            <img
              src={leftSrc}
              alt={`Logo ${schoolProfile.namaSingkat}`}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        <div className={`flex-1 min-w-0 ${alignClass}`}>
          {schoolProfile.namaInstansiAtas && (
            <p
              className={`${
                compact ? 'text-[11px]' : 'text-xs md:text-sm'
              } font-bold uppercase tracking-wide leading-tight`}
            >
              {schoolProfile.namaInstansiAtas}
            </p>
          )}
          {schoolProfile.namaDinas && (
            <p
              className={`${
                compact ? 'text-[11px]' : 'text-xs md:text-sm'
              } font-bold uppercase tracking-wide leading-tight`}
            >
              {schoolProfile.namaDinas}
            </p>
          )}
          <h2
            className={`${
              compact ? 'text-sm md:text-base' : 'text-base md:text-xl'
            } font-extrabold uppercase tracking-wider mt-0.5 leading-snug`}
          >
            {schoolProfile.namaSekolahHeader}
          </h2>
          {schoolProfile.alamatLengkap && (
            <p className={`${compact ? 'text-[10px]' : 'text-xs'} italic mt-0.5 leading-snug`}>
              {schoolProfile.alamatLengkap}
            </p>
          )}
          {(schoolProfile.npsn || schoolProfile.kontakInfo) && (
            <p className={`${compact ? 'text-[10px]' : 'text-[11px]'} mt-0.5`}>
              {schoolProfile.npsn ? `NPSN: ${schoolProfile.npsn}` : ''}
              {schoolProfile.npsn && schoolProfile.akreditasi
                ? ` · Akreditasi ${schoolProfile.akreditasi}`
                : ''}
              {(schoolProfile.npsn || schoolProfile.akreditasi) && schoolProfile.kontakInfo
                ? ' · '
                : ''}
              {schoolProfile.kontakInfo}
            </p>
          )}
        </div>

        {showRight ? (
          <div className={`${logoSizeClass} shrink-0 flex items-center justify-center`}>
            <img
              src={rightSrc}
              alt="Logo Kanan Instansi"
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain"
            />
          </div>
        ) : showLeft && schoolProfile.perataanKop === 'center' ? (
          <div className={`${logoSizeClass} shrink-0 hidden sm:block`} aria-hidden="true" />
        ) : null}
      </div>
    </div>
  );
};
