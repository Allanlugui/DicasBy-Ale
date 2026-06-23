import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './context';
import { Navigation } from './components/Navigation';
import { InstallPrompt } from './components/InstallPrompt';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Tracking } from './pages/Tracking';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { Support } from './pages/Support';
import { Receipt } from './pages/Receipt';
import { Profile } from './pages/Profile';
import { Footer } from './components/Footer';

import { AlertTriangle } from 'lucide-react';

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAppContext();
  if (!user || !isAdmin) return <Navigate to="/login" />;
  return <>{children}</>;
}

function DatabaseQuotaWarning() {
  const { dbQuotaExceeded } = useAppContext();
  if (!dbQuotaExceeded) return null;

  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 px-4 py-3.5 relative" role="alert">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed">
            <span className="font-bold font-display">Aviso do Sistema (Limite de Cota do Banco de Dados excedido):</span> A cota gratuita do Firebase foi atingida para o dia de hoje. Atualmente o aplicativo está funcionando em <span className="font-bold underline">modo de leitura assistida offline</span>. Os dados continuarão visíveis através do cache local, mas novas criações/alterações poderão não sincronizar até o próximo reinício diário das cotas gratuitas do Google Cloud.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-rose-50/30 font-sans text-stone-900 selection:bg-rose-100 selection:text-rose-900">
          <Navigation />
          <DatabaseQuotaWarning />
          <InstallPrompt />
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/carrinho" element={<Cart />} />
              <Route path="/rastreio" element={<Tracking />} />
              <Route path="/recibo/:id" element={<Receipt />} />
              <Route path="/suporte" element={<Support />} />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/admin" element={<ProtectedAdmin><Admin /></ProtectedAdmin>} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
