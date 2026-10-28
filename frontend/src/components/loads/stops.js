// Human text for a load's pickup / delivery stop.

/** Short form for cards: {date: "12 okt", sub: "08:00" | "FCFS 07:00–15:00" | "ASAP"} */
export function stopParts(l, p, { t, fmtDM }) {
  const type = l[p + '_type'], date = fmtDM(l[p + '_date']);
  if (type === 'asap') return { date, sub: 'ASAP' };
  if (type === 'fcfs') {
    const a = l[p + '_from'], b = l[p + '_to'];
    return { date, sub: 'FCFS' + (a || b ? ' ' + (a || '?') + '–' + (b || '?') : '') };
  }
  return { date, sub: l[p + '_time'] || t('Vaqt yozilmagan') };
}

/** Long form for the detail sheet. */
export function stopFull(l, p, { t, DOWF, monl }, dowOf) {
  const type = l[p + '_type'], d = l[p + '_date'];
  let what;
  if (type === 'asap') what = t('ASAP: iloji boricha tez');
  else if (type === 'fcfs') {
    const x = l[p + '_from'], y = l[p + '_to'];
    what = 'FCFS: ' + (x || y ? (x || '?') + ' – ' + (y || '?') : t("vaqt oralig'i yozilmagan"));
  } else what = l[p + '_time'] ? t('Aniq vaqt') + ': ' + l[p + '_time'] : t('Aniq vaqt (soati yozilmagan)');
  return { big: DOWF[dowOf(d)] + ', ' + +d.slice(8, 10) + ' ' + monl(+d.slice(5, 7) - 1) + ' ' + d.slice(0, 4), what };
}
