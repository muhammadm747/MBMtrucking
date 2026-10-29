import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/index.jsx';
import { useAuth } from '../state/AuthContext.jsx';

/** Navbar button with the signed-in user's initial; opens account links, switch account and sign out. */
export default function AccountMenu() {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const btn = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') { setOpen(false); btn.current?.focus(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!user) return null;
  const initial = (user.username || '?').slice(0, 1).toUpperCase();

  return (
    <div className="acct" ref={box}>
      <button ref={btn} className="tool acct-btn" type="button" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}
        title={t('Akkaunt')} onClick={() => setOpen((v) => !v)}>
        <span aria-hidden="true">{initial}</span>
        <span className="sr-only">{t('Akkaunt')}: {user.username}</span>
      </button>
      {open && (
        <div className="acct-menu" id={menuId} role="menu">
          <div className="acct-head">
            <span className="acct-avatar" aria-hidden="true">{initial}</span>
            <span className="acct-id">
              <b>{user.username}</b>
              <small>{user.email || t('Email kiritilmagan')}</small>
            </span>
          </div>
          <Link role="menuitem" to="/account" onClick={() => setOpen(false)}>{t('Akkaunt sozlamalari')}</Link>
          <button role="menuitem" type="button" onClick={logout}>{t('Boshqa akkauntga kirish')}</button>
          <button role="menuitem" type="button" className="danger" onClick={logout}>{t('Chiqish')}</button>
        </div>
      )}
    </div>
  );
}
