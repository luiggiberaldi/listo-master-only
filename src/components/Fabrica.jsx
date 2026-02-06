import React, { useState, useEffect } from 'react';
import { Key, Copy, Check, Zap, ShieldCheck } from 'lucide-react';

const SALT = "LISTO_POS_V1_SECURE_SALT_998877";

export default function Fabrica({ prefilledId = "" }) {
    const [hwId, setHwId] = useState(prefilledId);
    const [license, setLicense] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (prefilledId) setHwId(prefilledId);
    }, [prefilledId]);

    const generateLicense = async () => {
        if (!hwId.trim()) return;
        setIsGenerating(true);
        setCopied(false);

        try {
            // Lógica SHA-256 con Web Crypto API
            const msgBuffer = new TextEncoder().encode(hwId.trim() + SALT);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Retornamos los primeros 32 caracteres para mantenerla manejable pero segura
            setLicense(hashHex.toUpperCase());
        } catch (error) {
            console.error("Error generando licencia:", error);
        } finally {
            setTimeout(() => setIsGenerating(false), 600);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(license);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header Area */}
            <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-5 glass-panel rounded-3xl border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                    <Key className="w-12 h-12 text-emerald-400 glow-text-emerald" />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Fábrica de Licencias</h1>
                <p className="text-slate-500 max-w-lg text-sm leading-relaxed">
                    Sincronización criptográfica para la activación de terminales autorizadas.
                </p>
            </div>

            {/* Main Form */}
            <div className="glass-panel rounded-3xl p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                    <ShieldCheck size={180} />
                </div>

                <div className="space-y-8 relative z-10">
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
                        <div className="flex items-center gap-2 text-emerald-500/60 text-[9px] font-black uppercase tracking-widest">
                            <ShieldCheck size={14} />
                            SHA-256 Validado
                        </div>
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
