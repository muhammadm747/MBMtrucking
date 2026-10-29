import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Skeleton } from './components/common.jsx';
import Layout from './components/Layout.jsx';
import AccountPage from './pages/AccountPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import HomePage from './pages/HomePage.jsx';
import LoadsPage from './pages/LoadsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ReportPage from './pages/ReportPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { useAuth } from './state/AuthContext.jsx';
import { DataProvider } from './state/DataContext.jsx';
import { LoadUiProvider } from './state/LoadUiContext.jsx';

export default function App() {
  const { status } = useAuth();
  if (status === 'checking') return <main className="wrap"><section className="panel"><Skeleton n={3} /></section></main>;
  if (status !== 'authed') return <LoginPage />;
  return (
    <DataProvider>
      <LoadUiProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="loads" element={<LoadsPage />} />
              <Route path="expenses" element={<ExpensesPage />} />
              <Route path="report" element={<ReportPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </LoadUiProvider>
    </DataProvider>
  );
}
