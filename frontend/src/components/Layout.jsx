import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { dowOf, todayNY } from '../lib/dates.js';
import { useData } from '../state/DataContext.jsx';
import { usePrefs } from '../state/PrefsContext.jsx';
import AccountMenu from './AccountMenu.jsx';
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

/** One compact sticky bar: brand + status, section links, language/theme. On phones the links move to a bottom tab bar. */
function Navbar() {
  const { t, lang, setLang, DOWF, MON } = useI18n();
  const { isDark, setTheme } = usePrefs();
  const { status } = useData();
  const today = todayNY();
  const other = lang === 'en' ? 'uz' : 'en';
  const themeLabel = t(isDark ? "Yorug' rejim" : 'Tungi rejim');
  const statusText = t(status === 'ready' ? 'Serverga saqlanadi' : status === 'error' ? "Bazadan o'qib bo'lmadi" : 'Ulanmoqda');
  return (
    <header className="topbar">
      <div className="topbar-in">
        <NavLink to="/" className="brand" onClick={() => window.scrollTo(0, 0)}>
          <span className="mark" aria-hidden="true"><BrandMark /></span>
          <span className="brand-txt">
            <b>MBM Trucking</b>
            <small title={statusText}>
              <i className={'dot ' + status} aria-hidden="true" />
              {DOWF[dowOf(today)].slice(0, 3)}, {+today.slice(8, 10)} {MON[+today.slice(5, 7) - 1]} · NY
              <span className="sr-only"> · {statusText}</span>
            </small>
          </span>
        </NavLink>
        <nav className="nav" aria-label={t("Bo'limlar")}>
          {TABS.map(([to, key, label]) => {
            const Icon = TabIcons[key];
            return (
              <NavLink key={key} to={to} end={to === '/'} onClick={() => window.scrollTo(0, 0)}>
                <Icon />
                <span>{t(label)}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="tools">
          <button className="tool" type="button" onClick={() => setLang(other)}
            aria-label={other === 'en' ? 'English' : "O'zbekcha"} title={other === 'en' ? 'English' : "O'zbekcha"}>
            <span>{other.toUpperCase()}</span>
          </button>
          <button className="tool" type="button" onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={themeLabel} title={themeLabel}>
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const { t } = useI18n();
  const { status, refresh } = useData();
  return (
    <>
      <Navbar />
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
