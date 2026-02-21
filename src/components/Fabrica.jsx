import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Zap, ShieldCheck, Package, ToggleLeft, ToggleRight, Hash } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getPlan, getAllPlans, DEFAULT_QUOTAS, DEFAULT_PLAN } from '../config/planTiers';
import Swal from 'sweetalert2';

const SALT = import.meta.env.VITE_LICENSE_SALT;

export default function Fabrica({ prefilledId = "" }) {
    const [hwId, setHwId] = useState(prefilledId);
    const [license, setLicense] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    // 🆕 DEMO SHIELD CONFIG
    const [selectedPlan, setSelectedPlan] = useState(DEFAULT_PLAN);
    const [isDemo, setIsDemo] = useState(true);
    const [quotaLimit, setQuotaLimit] = useState(DEFAULT_QUOTAS[DEFAULT_PLAN]);
    const [savedToFirebase, setSavedToFirebase] = useState(false);

    useEffect(() => {
        if (prefilledId) setHwId(prefilledId);
    }, [prefilledId]);

    // Update default quota when plan changes
    useEffect(() => {
        setQuotaLimit(DEFAULT_QUOTAS[selectedPlan] || 100);
    }, [selectedPlan]);

    const generateLicense = async () => {
        if (!hwId.trim()) return;
        setIsGenerating(true);
        setCopied(false);
        setSavedToFirebase(false);

        try {
            // Lógica SHA-256 con Web Crypto API
            const msgBuffer = new TextEncoder().encode(hwId.trim() + SALT);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            const licenseKey = hashHex.toUpperCase();

            setLicense(licenseKey);

            // 🔥 WRITE TO FIREBASE — Terminal gets pre-configured
            const terminalRef = doc(db, 'terminales', hwId.trim());
            await setDoc(terminalRef, {
                plan: selectedPlan,
                isDemo: isDemo,
                quotaLimit: isDemo ? quotaLimit : null,
                licenseKey: licenseKey,
                _generatedAt: serverTimestamp(),
                _generatedBy: 'fabrica-master',
            }, { merge: true });

            setSavedToFirebase(true);
        } catch (error) {
            console.error("Error generando licencia:", error);
            Swal.fire({
                title: 'Error',
                text: 'Error al generar: ' + error.message,
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc'
            });
        } finally {
            setTimeout(() => setIsGenerating(false), 600);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(license);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const currentPlan = getPlan(selectedPlan);

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header Area */}
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-5 glass-panel rounded-3xl border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                    <Key className="w-12 h-12 text-emerald-400 glow-text-emerald" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Fábrica de Licencias</h1>
                <p className="text-slate-500 max-w-lg text-sm leading-relaxed">
                    Genera licencias con plan y configuración demo integrada. Todo se sincroniza con Firebase automáticamente.
                </p>
            </div>

            {/* Main Form */}
            <div className="glass-panel rounded-3xl p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                    <ShieldCheck size={180} />
                </div>

                <div className="space-y-8 relative z-10">
                    {/* HWID Input */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Huella Digital del Terminal (Hardware ID)</label>
                        <input
                            type="text"
                            value={hwId}
                            onChange={(e) => setHwId(e.target.value)}
                            placeholder="Ingrese el HWID del cliente..."
                            className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-6 py-5 text-white font-mono focus:border-emerald-500/50 outline-none transition-all placeholder:text-slate-800 shadow-inner text-lg"
                        />
                    </div>

                    {/* 🆕 PLAN + DEMO CONFIG ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                        {/* Plan Selector */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                <Package size={12} /> Plan
                            </label>
                            <div className="space-y-2">
                                {getAllPlans().map(plan => (
                                    <button
                                        key={plan.id}
                                        onClick={() => setSelectedPlan(plan.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-sm font-bold text-left ${selectedPlan === plan.id
                                                ? `${plan.color} border-current shadow-lg`
                                                : 'border-slate-800 text-slate-500 hover:border-slate-600 bg-slate-950/30'
                                            }`}
                                    >
                                        <span className="text-lg">{plan.icon}</span>
                                        <div>
                                            <span className="block">{plan.label}</span>
                                            <span className="text-[10px] font-normal opacity-70">Max {plan.maxCajas} caja{plan.maxCajas > 1 ? 's' : ''}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Demo Toggle */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Tipo de Licencia</label>
                            <button
                                onClick={() => setIsDemo(!isDemo)}
                                className={`w-full flex items-center justify-between px-6 py-4 rounded-xl border transition-all text-sm font-bold ${isDemo
                                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    }`}
                            >
                                <span>{isDemo ? '🧪 DEMO' : '✅ FULL (Sin Límite)'}</span>
                                {isDemo ? <ToggleLeft size={28} /> : <ToggleRight size={28} />}
                            </button>

                            {/* Quota Limit (only for demo) */}
                            {isDemo && (
                                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1 flex items-center gap-2">
                                        <Hash size={12} /> Límite de Ventas Demo
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="10"
                                            max="500"
                                            step="10"
                                            value={quotaLimit}
                                            onChange={(e) => setQuotaLimit(Number(e.target.value))}
                                            className="flex-1 accent-amber-500 h-2"
                                        />
                                        <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 min-w-[80px] text-center">
                                            <span className="text-amber-400 font-mono font-black text-lg">{quotaLimit}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-slate-600 font-mono px-1">
                                        <span>10</span>
                                        <span>250</span>
                                        <span>500</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Summary Card */}
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Resumen</label>
                            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 space-y-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">{currentPlan.icon}</span>
                                    <div>
                                        <p className="font-black text-white">{currentPlan.label}</p>
                                        <p className="text-[10px] text-slate-500">{currentPlan.description}</p>
                                    </div>
                                </div>
                                <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Tipo:</span>
                                        <span className={isDemo ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                                            {isDemo ? '🧪 Demo' : '✅ Full'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Cajas:</span>
                                        <span className="text-white font-mono">{currentPlan.maxCajas}</span>
                                    </div>
                                    {isDemo && (
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Ventas:</span>
                                            <span className="text-amber-400 font-mono font-bold">{quotaLimit}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        onClick={generateLicense}
                        disabled={isGenerating || !hwId.trim()}
                        className="w-full py-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-[0.98] transition-all disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3"
                    >
                        {isGenerating ? (
                            <Zap className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Zap size={18} className="fill-current" />
                                Generar Llave de Activación
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Area */}
            {license && (
                <div className="glass-panel border-emerald-500/30 rounded-3xl p-10 animate-in zoom-in-95 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Certificado Digital Generado</span>
                        <div className="flex items-center gap-4">
                            {savedToFirebase && (
                                <span className="flex items-center gap-1.5 text-[9px] font-black text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
                                    🔥 Firebase Sync ✓
                                </span>
                            )}
                            <div className="flex items-center gap-2 text-emerald-500/60 text-[9px] font-black uppercase tracking-widest">
                                <ShieldCheck size={14} />
                                SHA-256 Validado
                            </div>
                        </div>
                    </div>

                    {/* Plan Badge */}
                    <div className="flex items-center gap-4 mb-6">
                        <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold ${currentPlan.color}`}>
                            {currentPlan.icon} {currentPlan.label}
                        </span>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold ${isDemo ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            }`}>
                            {isDemo ? `🧪 Demo • ${quotaLimit} ventas` : '✅ Full'}
                        </span>
                    </div>

                    <div className="bg-black/60 rounded-2xl p-8 border border-slate-800 flex flex-col items-center gap-8">
                        <span className="text-2xl font-mono text-white break-all text-center leading-relaxed tracking-[0.2em] select-all font-bold">
                            {license}
                        </span>

                        <button
                            onClick={copyToClipboard}
                            className={`flex items-center gap-3 px-10 py-4 rounded-full font-black text-[10px] uppercase tracking-[0.2em] transition-all ${copied
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/40'
                                : 'bg-slate-800/50 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                }`}
                        >
                            {copied ? <Check size={18} /> : <Key size={18} />}
                            {copied ? 'Copiado Exitosamente' : 'Copiar Licencia'}
                        </button>
                    </div>

                    <p className="mt-6 text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                        ⚠️ Esta llave es intransferible y vinculada al Hardware ID.
                    </p>
                </div>
            )}
        </div>
    );
}
