import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { MessageSquare, Trash2, CheckCircle, Clock, Inbox, Archive, RotateCcw, ChevronDown, ChevronUp, User } from 'lucide-react';
import Swal from 'sweetalert2';

export default function FeedbackInbox() {
    const [groupedMessages, setGroupedMessages] = useState({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('inbox'); // 'inbox' | 'archived'
    const [expandedGroups, setExpandedGroups] = useState({}); // { hardwareId: boolean }

    useEffect(() => {
        // 📡 LEER SUGERENCIAS
        const unsubscribe = onSnapshot(collection(db, "sugerencias"),
            (snapshot) => {
                const rawData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                // 🟢 FILTRADO DINÁMICO BASADO EN VIEWMODE
                const isArchiveView = viewMode === 'archived';
                const filteredData = rawData.filter(m =>
                    isArchiveView ? m.archivado === true : m.archivado !== true
                );

                // 🟢 GROUPING BY HARDWARE ID
                const groups = {};
                filteredData.forEach(msg => {
                    const hwId = msg.hardwareId || 'unknown';
                    if (!groups[hwId]) {
                        groups[hwId] = {
                            hardwareId: hwId,
                            nombreNegocio: msg.nombreNegocio || 'Desconocido',
                            version: msg.version || 'v?',
                            messages: []
                        };
                    }
                    groups[hwId].messages.push(msg);
                });

                // 🟢 SORT MESSAGES INSIDE GROUPS (NEWEST FIRST)
                Object.values(groups).forEach(group => {
                    group.messages.sort((a, b) => {
                        if (!a.fecha) return 1;
                        if (!b.fecha) return -1;
                        return b.fecha?.seconds - a.fecha?.seconds;
                    });
                });

                setGroupedMessages(groups);
                setLoading(false);
            },
            (error) => {
                console.error("Error leyendo buzón:", error);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [viewMode]);

    const toggleGroup = (hwId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [hwId]: !prev[hwId]
        }));
    };

    const handleAction = async (msg, action) => {
        try {
            if (action === 'read') {
                await updateDoc(doc(db, "sugerencias", msg.id), { leido: true });
            } else if (action === 'archive') {
                await updateDoc(doc(db, "sugerencias", msg.id), { archivado: true });
            } else if (action === 'restore') {
                await updateDoc(doc(db, "sugerencias", msg.id), { archivado: false });
            } else if (action === 'delete') {
                const result = await Swal.fire({
                    title: '¿ELIMINAR PERMANENTE?',
                    text: "Esta acción no se puede deshacer.",
                    icon: 'warning',
                    background: '#1e293b',
                    color: '#fff',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    confirmButtonText: 'SÍ, BORRAR',
                    cancelButtonText: 'CANCELAR'
                });

                if (result.isConfirmed) {
                    await deleteDoc(doc(db, "sugerencias", msg.id));
                }
            }
        } catch (e) {
            console.error("Error en acción:", e);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-500 animate-pulse gap-4">
            <Inbox size={48} className="opacity-50" />
            <p className="font-mono text-sm tracking-widest">CARGANDO MENSAJES...</p>
        </div>
    );

    const groupKeys = Object.keys(groupedMessages);
    const totalMessages = Object.values(groupedMessages).reduce((acc, g) => acc + g.messages.length, 0);

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* HEADER & TOGGLE */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b border-slate-700 pb-4">
                <div className="flex items-center gap-3">
                    <MessageSquare className={viewMode === 'inbox' ? "text-amber-400" : "text-slate-500"} size={28} />
                    <div>
                        <h2 className="text-2xl font-bold text-white tracking-tighter">
                            {viewMode === 'inbox' ? 'BUZÓN DE USUARIOS' : 'ARCHIVO HISTÓRICO'}
                        </h2>
                        <span className="text-xs text-slate-400 font-mono">
                            {groupKeys.length} USUARIOS • {totalMessages} {viewMode === 'inbox' ? 'MENSAJES ACTIVOS' : 'MENSAJES GUARDADOS'}
                        </span>
                    </div>
                </div>

                <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700">
                    <button
                        onClick={() => setViewMode('inbox')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'inbox'
                                ? 'bg-slate-700 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Inbox size={14} /> BUZÓN
                    </button>
                    <button
                        onClick={() => setViewMode('archived')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${viewMode === 'archived'
                                ? 'bg-slate-700 text-white shadow-lg'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Archive size={14} /> ARCHIVO
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                {groupKeys.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-4">
                        {viewMode === 'inbox' ? <Inbox size={48} /> : <Archive size={48} />}
                        <p className="italic">
                            {viewMode === 'inbox' ? 'El buzón está vacío. Todo al día. 🍃' : 'No hay mensajes archivados.'}
                        </p>
                    </div>
                )}

                {/* USER GROUPS LIST */}
                {groupKeys.map(hwId => {
                    const group = groupedMessages[hwId];
                    const isExpanded = expandedGroups[hwId];

                    return (
                        <div key={hwId} className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                            {/* GROUP HEADER (USER CARD) */}
                            <div
                                onClick={() => toggleGroup(hwId)}
                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 border border-slate-600">
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                                            {group.nombreNegocio}
                                            <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-slate-500 font-mono tracking-wide border border-slate-700">
                                                {group.messages.length} MSGS
                                            </span>
                                        </h3>
                                        <p className="text-xs text-slate-500 font-mono flex items-center gap-2">
                                            ID: {hwId} <span className="w-1 h-1 bg-slate-600 rounded-full" /> v{group.version}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-slate-500">
                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </div>
                            </div>

                            {/* MESSAGES LIST (ACCORDION BODY) */}
                            {isExpanded && (
                                <div className="bg-slate-900/30 border-t border-slate-700/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                    {group.messages.map(m => (
                                        <div
                                            key={m.id}
                                            className={`
                                            bg-slate-800 rounded-xl p-4 border transition-all relative overflow-hidden group
                                             ${m.leido ? 'border-slate-700 opacity-70' : 'border-amber-500/30 bg-amber-500/5'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    {!m.leido && viewMode === 'inbox' && (
                                                        <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                                    )}
                                                    <h4 className={`font-bold ${m.leido ? 'text-slate-400' : 'text-slate-200'}`}>
                                                        {m.title || 'Sin Asunto'}
                                                    </h4>
                                                </div>
                                                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                                    <Clock size={10} />
                                                    {m.fecha?.toDate ? m.fecha.toDate().toLocaleString('es-VE') : 'Reciente'}
                                                </span>
                                            </div>

                                            <p className="text-slate-300 text-sm leading-relaxed mb-3 pl-4 border-l-2 border-slate-700">
                                                {m.message}
                                            </p>

                                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700/30">
                                                {viewMode === 'inbox' ? (
                                                    <button
                                                        onClick={() => handleAction(m, m.leido ? 'archive' : 'read')}
                                                        className={`
                                                            flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wide transition-all uppercase
                                                            ${m.leido
                                                                ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                                                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/20'}
                                                        `}
                                                    >
                                                        {m.leido ? (
                                                            <> <Archive size={12} /> Archivar </>
                                                        ) : (
                                                            <> <CheckCircle size={12} /> Marcar Leído </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleAction(m, 'restore')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-emerald-400 hover:bg-slate-700 uppercase"
                                                        >
                                                            <RotateCcw size={12} /> Recuperar
                                                        </button>
                                                        <button
                                                            onClick={() => handleAction(m, 'delete')}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold text-red-400 hover:bg-slate-700 uppercase"
                                                        >
                                                            <Trash2 size={12} /> Borrar
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
