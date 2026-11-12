const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
const tint = { fill: 'currentColor', fillOpacity: 0.16 };

export const IconEdit = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" strokeWidth="1.8" {...base}>
    <path {...tint} d="M4.2 19.8l.9-4.3L16 4.6a2.2 2.2 0 013.1 3.1L8.2 18.9z" />
    <path d="M14 6.6l3.4 3.4" />
  </svg>
);

export const IconDelete = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" strokeWidth="1.8" {...base}>
    <path {...tint} d="M6.5 7.5l.8 11.7a1.7 1.7 0 001.7 1.6h6a1.7 1.7 0 001.7-1.6l.8-11.7z" />
    <path d="M4.5 7.5h15M9.5 7.5V5a1 1 0 011-1h3a1 1 0 011 1v2.5M10.2 11.5v5.2M13.8 11.5v5.2" />
  </svg>
);

export const IconChevron = ({ dir = 'right', size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} strokeWidth="2.4" {...base}>
    <path d={dir === 'left' ? 'M14.5 6l-6 6 6 6' : 'M9.5 6l6 6-6 6'} />
  </svg>
);

export const IconClose = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" strokeWidth="2.2" {...base}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

export const IconPlus = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" strokeWidth="2.6" {...base}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" strokeWidth="3" {...base}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const IconTruckMini = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" strokeWidth="2" {...base}>
    <path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3.2v2.8h-7z" />
    <circle cx="6.5" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </svg>
);

export const IconMoon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" strokeWidth="1.9" {...base}>
    <path {...tint} d="M20 14.2A8.2 8.2 0 019.8 4 8.2 8.2 0 1020 14.2z" />
  </svg>
);

export const IconSun = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" strokeWidth="1.9" {...base}>
    <circle {...tint} cx="12" cy="12" r="4" />
    <path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" />
  </svg>
);

// The MBM logo (brand/mbm-logo-*.svg): trailer lettered "MBM", amber cab, speed lines, road.
// The lettering is Montserrat SemiBold converted to a path, so it needs no font.
const LOGO_WORD = 'M75.65 63.50L73.17 63.50L73.17 49.50L75.31 49.50L81.43 59.72L80.31 59.72L86.33 49.50L88.47 49.50L88.49 63.50L86.03 63.50L86.01 53.36L86.53 53.36L81.41 61.90L80.25 61.90L75.05 53.36L75.65 53.36L75.65 63.50ZM111.23 63.50L104.27 63.50L104.27 49.50L110.83 49.50Q113.35 49.50 114.67 50.49Q115.99 51.48 115.99 53.14L115.99 53.14Q115.99 54.26 115.47 55.05Q114.95 55.84 114.08 56.27Q113.21 56.70 112.19 56.70L112.19 56.70L112.55 55.98Q113.73 55.98 114.67 56.41Q115.61 56.84 116.16 57.66Q116.71 58.48 116.71 59.70L116.71 59.70Q116.71 61.50 115.33 62.50Q113.95 63.50 111.23 63.50L111.23 63.50ZM106.87 51.54L106.87 61.46L111.07 61.46Q112.53 61.46 113.31 60.98Q114.09 60.50 114.09 59.44L114.09 59.44Q114.09 58.40 113.31 57.91Q112.53 57.42 111.07 57.42L111.07 57.42L106.67 57.42L106.67 55.40L110.55 55.40Q111.91 55.40 112.64 54.92Q113.37 54.44 113.37 53.48L113.37 53.48Q113.37 52.50 112.64 52.02Q111.91 51.54 110.55 51.54L110.55 51.54L106.87 51.54ZM133.97 63.50L131.49 63.50L131.49 49.50L133.63 49.50L139.75 59.72L138.63 59.72L144.65 49.50L146.79 49.50L146.81 63.50L144.35 63.50L144.33 53.36L144.85 53.36L139.73 61.90L138.57 61.90L133.37 53.36L133.97 53.36L133.97 63.50Z';

export const BrandLogo = ({ title = 'MBM Trucking' }) => (
  <svg className="brand-logo" viewBox="4 32 276 56" role="img" aria-label={title}>
    <path d="M24 84 H276" stroke="var(--on-band)" strokeOpacity=".25" strokeWidth="2" />
    <rect x="40" y="36" width="140" height="40" fill="var(--on-band)" />
    <path d="M184 46 H214 L236 66 V76 H184 Z" fill="#FCA311" />
    <path d={LOGO_WORD} fill="var(--band)" />
    <path d="M14 50 H32 M8 60 H32" stroke="#FCA311" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const EmptyTruck = () => (
  <svg viewBox="0 0 64 42" width="72" height="47" strokeWidth="1.8" {...base}>
    <rect {...tint} x="4" y="5" width="30" height="22" rx="3.5" />
    <path {...tint} d="M34 11.5h10.5c1 0 1.9.4 2.5 1.1l5.6 6.4c.5.5.9 1.3.9 2V27H34z" />
    <path d="M39 14.5v6h8.5" />
    <circle cx="14" cy="30.5" r="4.4" fill="var(--surface)" />
    <circle cx="14" cy="30.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="43.5" cy="30.5" r="4.4" fill="var(--surface)" />
    <circle cx="43.5" cy="30.5" r="1.2" fill="currentColor" stroke="none" />
    <path d="M3 40h58" strokeDasharray="6 6" opacity=".5" />
  </svg>
);

export const TabIcons = {
  home: () => (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
      <path {...tint} d="M4 10.4L12 4l8 6.4V19a1.6 1.6 0 01-1.6 1.6H14.8v-5.4H9.2v5.4H5.6A1.6 1.6 0 014 19z" />
    </svg>
  ),
  loads: () => (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
      <path {...tint} d="M12 3l8 4.2v9.6L12 21l-8-4.2V7.2z" />
      <path d="M4 7.2l8 4.2 8-4.2M12 11.4V21" />
    </svg>
  ),
  expenses: () => (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
      <path {...tint} d="M6 3.5h12V21l-2.4-1.6L13.2 21 12 20.2 10.8 21l-2.4-1.6L6 21z" />
      <path d="M9.2 8h5.6M9.2 11.8h5.6M9.2 15.6h3" />
    </svg>
  ),
  report: () => (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
      <rect {...tint} x="3.8" y="12" width="4.4" height="8" rx="1.3" />
      <rect {...tint} x="9.8" y="5" width="4.4" height="15" rx="1.3" />
      <rect {...tint} x="15.8" y="9" width="4.4" height="11" rx="1.3" />
    </svg>
  ),
  settings: () => (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" {...base}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle {...tint} cx="15" cy="7" r="2.4" />
      <circle {...tint} cx="9" cy="17" r="2.4" />
    </svg>
  ),
};
