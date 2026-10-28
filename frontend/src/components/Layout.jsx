import { useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { dowOf, todayNY } from '../lib/dates.js';
import { useData } from '../state/DataContext.jsx';
import { usePrefs } from '../state/PrefsContext.jsx';
import { EmptyBox } from './common.jsx';
import { BrandMark, IconMoon, IconSun, TabIcons } from './Icons.jsx';
import LoadForm from './loads/LoadForm.jsx';
import LoadSheet from './loads/LoadSheet.jsx';

const TABS = [
  ['/', 'home', 'Bosh'],
  ['/loads', 'loads', 'Yuklar'],
  ['/expenses', 'expenses', 'Rasxod'],
  ['/report', 'report', 'Hisobot'],
  ['/settings', 'settings', 'Sozlama'],
];

function Header() {
  const { t, lang, setLang, DOWF, monl } = useI18n();
  const { isDark, setTheme } = usePrefs();
  const { status } = useData();
  const today = todayNY();
  const other = lang === 'en' ? 'uz' : 'en';
  const themeLabel = t(isDark ? "Yorug' rejim" : 'Tungi rejim');
  const ok = status === 'ready';
  return (
    <div className="band">
      <div className="wrap">
        <header className="hdr">
          <span className="mark" aria-hidden="true"><BrandMark /></span>
          <div className="htxt">
            <h1>MBM Trucking</h1>
            <p id="todayLine">
              {DOWF[dowOf(today)]}, {+today.slice(8, 10)} {monl(+today.slice(5, 7) - 1)} {today.slice(0, 4)} ·{' '}
              <span className="nw">{t('New York vaqti')}</span>
            </p>
            <span className={'pill' + (ok ? '' : ' off')}>
              <i aria-hidden="true" />
              <span>{t(ok ? 'Serverga saqlanadi' : status === 'error' ? "Bazadan o'qib bo'lmadi" : 'Ulanmoqda')}</span>
            </span>
          </div>
          <div className="hdr-tools">
            <button className="tool" type="button" onClick={() => setLang(other)}
              aria-label={other === 'en' ? 'English' : "O'zbekcha"} title={other === 'en' ? 'English' : "O'zbekcha"}>
              <span>{other.toUpperCase()}</span>
            </button>
            <button className="tool" type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')}
              aria-label={themeLabel} title={themeLabel}>
              {isDark ? <IconSun /> : <IconMoon />}
            </button>
          </div>
        </header>
      </div>
    </div>
  );
}

export default function Layout() {
  const { t } = useI18n();
  const { status, refresh } = useData();
  const { pathname } = useLocation();
  useEffect(() => { document.body.classList.toggle('inner', pathname !== '/'); }, [pathname]);
  return (
    <>
      <Header />
      <div className="tabbar">
        <nav className="tabs" role="tablist" aria-label={t("Bo'limlar")}>
          {TABS.map(([to, key, label]) => {
            const Icon = TabIcons[key];
            return (
              <NavLink key={key} to={to} end={to === '/'} role="tab" className="tab"
                aria-selected={to === '/' ? pathname === '/' : pathname.startsWith(to)}
                onClick={() => window.scrollTo(0, 0)}>
                <Icon />
                <span>{t(label)}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <main className="wrap">
        {status === 'error' ? (
          <section className="panel">
            <EmptyBox>
              <p>{t("Ma'lumotni yuklab bo'lmadi")}</p>
              <button className="btn primary" type="button" onClick={refresh}>{t('Qayta urinish')}</button>
            </EmptyBox>
          </section>
        ) : (
          <Outlet />
        )}
      </main>
      <LoadForm />
      <LoadSheet />
    </>
  );
}
