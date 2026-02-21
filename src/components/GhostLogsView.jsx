import React, { useState, useEffect } from 'react';
import { syncGhostSessions, deleteAllLocalSessions } from '../services/ghostArchiveService';
import { Download, RefreshCw, BrainCircuit, Search, Terminal, FileText, Database, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function GhostLogsView() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSession, setSelectedSession] = useState(null);

    const fetchSessions = async () => {
        setLoading(true);
        try {
            // Sync: Firebase → local IndexedDB → purge Firebase
            const data = await syncGhostSessions();
            setSessions(data);
            if (data.length > 0 && !selectedSession) setSelectedSession(data[0]);
        } catch (error) {
            console.warn("Ghost Sessions sync error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearData = async () => {
        if (sessions.length === 0) return;

        // 1. First Verification
        const firstCheck = await Swal.fire({
            title: '⚠️ ADVERTENCIA DE SEGURIDAD',
            html: `Estás a punto de <strong>ELIMINAR PERMANENTEMENTE</strong> ${sessions.length} sesiones de entrenamiento.<br/><br/>¿Ya descargaste el Dataset?`,
            icon: 'warning',
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'SÍ, CONTINUAR',
            cancelButtonText: 'CANCELAR'
        });
        if (!firstCheck.isConfirmed) return;

        // 2. Second Verification — Keyword
        const { value: keyword } = await Swal.fire({
            title: '🛑 CONFIRMACIÓN FINAL',
            text: 'Escribe PURGAR para eliminar todos los datos:',
            input: 'text',
            inputPlaceholder: 'PURGAR',
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'EJECUTAR PURGA',
            cancelButtonText: 'CANCELAR',
            inputValidator: (value) => {
                if (value !== 'PURGAR') return 'Debes escribir PURGAR exactamente.';
            }
        });
        if (!keyword) return;

        setLoading(true);
        try {
            await deleteAllLocalSessions();

            Swal.fire({
                title: '🗑️ Purgado Completado',
                text: 'El sistema está limpio.',
                icon: 'success',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#10b981'
            });
            setSessions([]);
            setSelectedSession(null);
        } catch (error) {
            console.error("Delete failed:", error);
            Swal.fire({
                title: 'Error',
                text: 'Error al borrar: ' + error.message,
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSessions();
    }, []);

    const handleDownloadJSON = (session) => {
        if (!session || !session.logs) return;
        const jsonString = JSON.stringify(session.logs, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ghost_session_${session.id}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center gap-4">
                    <div className="p-3 bg-fuchsia-500/20 text-fuchsia-400 rounded-xl">
                        <BrainCircuit size={24} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white">{sessions.length}</h3>
                        <p className="text-xs text-slate-400 uppercase tracking-widest">Sesiones Grabadas</p>
                    </div>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-300">Modo Compacto (Base de Datos)</h3>
                        <p className="text-xs text-slate-500">1 Escritura por Sesión. Super eficiente.</p>
                    </div>
                    <button
                        onClick={fetchSessions}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* HEADER ACTIONS */}
            <div className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div>
                    <h3 className="text-white font-bold">Herramientas de Entrenamiento</h3>
                    <p className="text-xs text-slate-500">Mejora a Ghost con datos reales</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            const allLogs = sessions.flatMap(s => s.logs || []);
                            const jsonString = JSON.stringify(allLogs, null, 2);
                            const blob = new Blob([jsonString], { type: 'application/json' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = `ghost_full_dataset_${new Date().toISOString().slice(0, 10)}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                    >
                        <Database size={14} /> COMPILAR DATASET ({sessions.length})
                    </button>

                    {sessions.length > 0 && (
                        <button
                            onClick={handleClearData}
                            className="flex items-center gap-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-900/50 px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                        >
                            <Trash2 size={14} /> PURGAR DATA
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* SESSION LIST */}
                <div className="col-span-1 space-y-3 max-h-[600px] overflow-y-auto custom-scrollbar">
                    {sessions.map((session) => (
                        <div
                            key={session.id}
                            onClick={() => setSelectedSession(session)}
                            className={`cursor-pointer group p-4 rounded-xl border transition-all ${selectedSession?.id === session.id
                                ? 'bg-slate-800 border-fuchsia-500/50 shadow-lg shadow-fuchsia-900/10'
                                : 'bg-slate-950/50 border-slate-800 hover:bg-slate-900'
                                }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <Database size={18} className={selectedSession?.id === session.id ? "text-fuchsia-400" : "text-slate-500"} />
                                <span className="text-sm font-bold text-slate-300 truncate w-full">
                                    Sesión {new Date(session.startTime).toLocaleTimeString()}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                                <span>{session.logCount || 0} mensajes</span>
                                <span>ID: {session.systemId?.slice(0, 6)}...</span>
                            </div>
                        </div>
                    ))}
                    {sessions.length === 0 && !loading && (
                        <div className="text-center p-8 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                            Sin sesiones registradas
                        </div>
                    )}
                </div>

                {/* PREVIEW */}
                <div className="col-span-2 glass-panel rounded-2xl border border-slate-800 overflow-hidden flex flex-col h-[600px]">
                    <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal size={14} className="text-slate-500" />
                            <span className="text-xs font-mono text-slate-400">session_viewer</span>
                        </div>
                        {selectedSession && (
                            <button
                                onClick={() => handleDownloadJSON(selectedSession)}
                                className="flex items-center gap-2 text-xs font-bold text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                            >
                                <Download size={14} /> DOWNLOAD
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-950 p-4 space-y-2">
                        {selectedSession && selectedSession.logs ? (
                            selectedSession.logs.map((log, i) => (
                                <div key={i} className="mb-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${log.role === 'user' ? 'bg-indigo-900/30 text-indigo-400' : 'bg-fuchsia-900/30 text-fuchsia-400'
                                            }`}>{log.role}</span>
                                        <span className="text-[10px] text-slate-600 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="text-sm text-slate-300 font-mono whitespace-pre-wrap leading-relaxed pl-2 border-l-2 border-slate-800">
                                        {log.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
                                Selecciona una sesión para ver sus logs
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
