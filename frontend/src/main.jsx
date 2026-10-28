import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { AuthProvider } from './state/AuthContext.jsx';
import { PrefsProvider } from './state/PrefsContext.jsx';
import { ToastProvider } from './state/ToastContext.jsx';
import './styles/app.css';
import './styles/extra.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <PrefsProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </PrefsProvider>
    </I18nProvider>
  </StrictMode>,
);
