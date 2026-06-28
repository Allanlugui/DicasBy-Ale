import React, { useState } from "react";
import { useAppContext } from "../context";
import { Shield } from "lucide-react";
import { Navigate } from "react-router-dom";

export function Login() {
  const { user, loginWithGoogle, isAdmin } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
      alert("Erro ao fazer login com Google");
    }
    setLoading(false);
  };

  if (user) {
    if (isAdmin) return <Navigate to="/admin" />;
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-md mx-auto mt-16 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 p-8 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Shield className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-display font-bold text-stone-900 mb-2">
          Acesso Exclusivo
        </h1>
        <p className="text-stone-500 mb-8 text-sm">
          Acesse para realizar compras e rastrear seus pedidos. Admin master
          logue para gerenciar.
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-rose-600 text-white font-bold py-3 px-4 rounded-xl hover:bg-rose-700 transition flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>
      </div>
    </div>
  );
}
