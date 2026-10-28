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

export const BrandMark = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" strokeWidth="1.8" {...base}>
    <rect {...tint} x="2.5" y="8" width="17" height="13" rx="2.4" />
    <path {...tint} d="M19.5 12.4h4.7c.6 0 1.1.3 1.5.7l3.2 3.9c.3.3.4.7.4 1.1V21h-9.8z" />
    <path d="M22 14.4v3.2h4.2" />
    <circle cx="8.6" cy="23" r="3" fill="currentColor" stroke="none" />
    <circle cx="23.6" cy="23" r="3" fill="currentColor" stroke="none" />
    <circle cx="8.6" cy="23" r="1" fill="var(--band)" stroke="none" />
    <circle cx="23.6" cy="23" r="1" fill="var(--band)" stroke="none" />
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
