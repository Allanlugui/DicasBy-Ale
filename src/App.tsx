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

function ProtectedAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = useAppContext();
  if (!user || !isAdmin) return <Navigate to="/login" />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-rose-50/30 font-sans text-stone-900 selection:bg-rose-100 selection:text-rose-900">
          <Navigation />
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
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}
