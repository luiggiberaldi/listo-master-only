import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import FeedbackInbox from './components/FeedbackInbox';
import Fabrica from './components/Fabrica';
import GhostLogsView from './components/GhostLogsView';
import { LayoutGrid, MessageSquare, LogOut, Shield, Archive, Key, Mail, Lock, Eye, EyeOff, BrainCircuit } from 'lucide-react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const [activeTab, setActiveTab] = useState('dashboard');
  const [prefilledHwId, setPrefilledHwId] = useState("");

  // --- LOGO CONFIGURATION (FACTORY CALIBRATED) ---
  const LOGO_CONFIG = { size: 122, containerSize: 42, x: 51, y: 0 };

  // 1. Session Persistence Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleGoToFabrica = (id) => {
    setPrefilledHwId(id);
    setActiveTab('fabrica');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged handles state update
    } catch (err) {
      console.error("Login Error:", err);
      setError("Credenciales inválidas. Acceso denegado.");
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
        {/* Background Effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] animate-pulse delay-1000"></div>

        <div className="glass-panel w-full max-w-sm p-8 rounded-3xl relative z-10 backdrop-blur-2xl border border-slate-800/50">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <img src="icon.png" alt="Logo" className="w-12 h-12 object-contain drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            </div>
            <h1 className="text-2xl font-black text-white mb-2 tracking-widest uppercase glow-text-emerald">Listo Master</h1>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">Centro de Control Protegido</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Mail size={18} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="CORREO AUTORIZADO"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 font-mono"
                required
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="CONTRASEÑA"
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl pl-12 pr-12 py-4 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 font-mono tracking-widest"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-emerald-400 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <div className="text-red-400 text-xs text-center font-bold bg-red-500/10 p-2 rounded-lg border border-red-500/20 animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/40 active:scale-[0.98] uppercase tracking-widest text-xs mt-4"
            >
              Acceder al Sistema
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200 font-sans selection:bg-emerald-500/30 pb-20">

      {/* FLOATING GLASS NAVBAR */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4 pointer-events-none">
        <nav className="glass-panel rounded-full px-2 py-2 flex items-center justify-between shadow-2xl pointer-events-auto overflow-visible relative">

          {/* LOGO AREA - Separated Controls */}
          <div className="flex items-center gap-4 pl-4 relative">
            {/* WRAPPER: Determines Header Height/Spacing (containerSize) */}
            <div
              className="relative flex items-center justify-center"
              style={{
                width: `${LOGO_CONFIG.containerSize}px`,
                height: `${LOGO_CONFIG.containerSize}px`
              }}
            >
              {/* INNER LOGO: Determines Visual Size (size) - Can Overflow */}
              <div
                className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  width: `${LOGO_CONFIG.size}px`,
                  height: `${LOGO_CONFIG.size}px`,
                  transform: `translate(${LOGO_CONFIG.x}px, ${LOGO_CONFIG.y}px)`
                }}
              >
                <img
                  src="icon.png"
                  alt="Logo"
                  className="w-full h-full object-contain drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                />
              </div>
            </div>
          </div>

          <div className="flex bg-slate-950/50 rounded-full p-1 border border-slate-800/50">
            {[
              { id: 'dashboard', icon: LayoutGrid, label: 'Consola' },
              { id: 'feedback', icon: MessageSquare, label: 'Mensajes' },
              { id: 'fabrica', icon: Key, label: 'Fábrica' },
              { id: 'ghost', icon: BrainCircuit, label: 'Ghost AI' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                  ? 'bg-slate-800 text-emerald-400 shadow-lg shadow-black/20 border border-slate-700'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline uppercase tracking-wide">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="pr-2">
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-full text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-all"
              title="Cerrar Sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </nav>
      </div>

      {/* CONTENT AREA (Padded for floating nav) */}
      <main className="max-w-7xl mx-auto pt-32 px-6">
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
          {activeTab === 'dashboard' && <Dashboard onGenerateKey={handleGoToFabrica} />}
          {activeTab === 'feedback' && <FeedbackInbox />}
          {activeTab === 'fabrica' && <Fabrica prefilledId={prefilledHwId} />}
          {activeTab === 'ghost' && <GhostLogsView />}
        </div>
      </main>

    </div>
  );
}

export default App;
