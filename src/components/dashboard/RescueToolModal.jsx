import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Copy, Terminal, X, WifiOff } from 'lucide-react';
import { generateMasterPin } from '../../utils/securityUtils';
import Swal from 'sweetalert2';

export default function RescueToolModal({ isOpen, onClose, prefillId = '', terminals = [] }) {
    const [systemId, setSystemId] = useState(prefillId);
    const [challenge, setChallenge] = useState('');
    const [generatedPin, setGeneratedPin] = useState(null);

    // Sync prefillId when prop changes
    useEffect(() => {
        if (prefillId) setSystemId(prefillId);
    }, [prefillId]);

    if (!isOpen) return null;

    // Validation Logic
    const foundTerminal = terminals.find(t => t.id === systemId);
    const isSuspended = foundTerminal && foundTerminal.status === 'SUSPENDED';

    const handleGenerate = async () => {
        try {
            // Validación Explicita con Feedback
            if (!systemId) {
                Swal.fire({ icon: 'warning', title: 'Falta ID del Sistema', text: 'Debes ingresar el UUID de la terminal que deseas rescatar.', background: '#1e293b', color: '#fff', timer: 3000 });
                return;
            }

            // Detección Inteligente de Error de Usuario (Confusión ID vs Código)
            if (systemId.length < 8) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ID Inválido',
                    text: 'El ID ingresado es muy corto. Parece un Código de Reto. Debes colocar el UUID largo del POS en el primer campo (búscalo en la lista de terminales) y el código corto (MW9P) en el segundo.',
                    background: '#1e293b',
                    color: '#fff'
                });
                return;
            }

            if (!challenge || challenge.length !== 4) {
                Swal.fire({ icon: 'warning', title: 'Código Incorrecto', text: 'El código de reto debe tener exactamente 4 caracteres (ej. ABCD).', background: '#1e293b', color: '#fff', timer: 3000 });
                return;
            }

            // Verificar disponibilidad de crypto
            if (!window.crypto || !window.crypto.subtle) {
                throw new Error("El entorno no soporta criptografía segura (HTTPS requerido).");
            }

            const pin = await generateMasterPin(challenge, systemId);
            setGeneratedPin(pin);
        } catch (error) {
            console.error("Error generation:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de Generación',
                text: error.message || 'Error desconocido al generar la llave.',
                background: '#1e293b',
                color: '#fff'
            });
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Copiado',
            showConfirmButton: false,
            timer: 1500,
            background: '#1e293b',
            color: '#fff'
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={`bg-slate-900 border rounded-2xl w-full max-w-md p-6 shadow-2xl relative transition-colors duration-300 ${isSuspended ? 'border-red-500 shadow-red-900/20' : 'border-slate-800'}`}>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center mb-6">
                    <div className={`p-4 rounded-full mb-3 border transition-colors ${isSuspended ? 'bg-red-500/10 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
                        {isSuspended ? <ShieldAlert className="text-red-500" size={32} /> : <WifiOff className="text-slate-400" size={32} />}
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">Protocolo de Rescate</h2>
                    <p className={`text-sm font-bold ${isSuspended ? 'text-red-500' : 'text-slate-500'}`}>
                        {isSuspended ? 'TERMINAL SUSPENDIDA' : 'Generador de Llave Maestra (Offline)'}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block">ID del Sistema</label>
                            {foundTerminal && (
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isSuspended ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                    {foundTerminal.nombreNegocio?.substring(0, 15)}...
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Terminal className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                value={systemId}
                                onChange={(e) => {
                                    setSystemId(e.target.value);
                                    setGeneratedPin(null);
                                }}
                                className={`w-full bg-slate-950 border rounded-lg py-3 pl-10 pr-3 text-white font-mono text-sm focus:outline-none transition-colors placeholder-slate-600 ${isSuspended ? 'border-red-500 focus:border-red-600' : 'border-slate-700 focus:border-blue-500'}`}
                                placeholder="Pegar UUID del POS"
                            />
                        </div>
                    </div>

                    {isSuspended ? (
                        <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl text-center animate-in shake">
                            <p className="text-xs font-bold text-red-500 mb-2">⛔ ACCIÓN BLOQUEADA</p>
                            <p className="text-xs text-red-300 leading-relaxed">
                                Esta terminal se encuentra en estado <strong>SUSPENDIDO</strong>.
                                Por seguridad, debes reactivarla en el Dashboard antes de generar una llave de rescate.
                            </p>
                        </div>
                    ) : (
                        <div>
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Código de Reto</label>
                            <div className="relative">
                                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={challenge}
                                    onChange={(e) => {
                                        setChallenge(e.target.value.toUpperCase());
                                        setGeneratedPin(null);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-3 pl-10 pr-3 text-white font-mono text-xl font-bold tracking-[0.2em] focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-600 uppercase"
                                    placeholder="ABCD"
                                />
                            </div>
                        </div>
                    )}

                    {!isSuspended && (
                        generatedPin ? (
                            <div
                                className="bg-emerald-500/10 border border-emerald-500/50 rounded-xl p-6 text-center animate-in zoom-in cursor-pointer group hover:bg-emerald-500/20 transition-colors mt-6"
                                onClick={() => copyToClipboard(generatedPin)}
                            >
                                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em] mb-2">PIN MAESTRO</p>
                                <div className="flex items-center justify-center gap-3">
                                    <span className="text-4xl font-black text-white tracking-widest font-mono drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]">
                                        {generatedPin}
                                    </span>
                                    <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-500 group-hover:text-white transition-colors">
                                        <Copy size={20} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleGenerate}
                                className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-3 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                            >
                                <KeyRound size={18} /> GENERAR LLAVE
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
