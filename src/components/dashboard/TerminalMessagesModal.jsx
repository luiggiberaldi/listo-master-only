import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot, doc, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { MessageSquare, X, CheckCircle, Clock, Trash2, Inbox } from 'lucide-react';


export default function TerminalMessagesModal({ isOpen, onClose, terminal }) {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen || !terminal?.id) return;

        setLoading(true);
        // Using client-side filtering again for robustness, matching the Bubble logic
        const unsubscribe = onSnapshot(collection(db, "sugerencias"), (snapshot) => {
            const rawData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // Filter for THIS terminal and NOT archived
            const filtered = rawData.filter(m =>
                m.hardwareId === terminal.id && !m.archivado
            );

            // Sort by date desc
            const sorted = filtered.sort((a, b) => {
                if (!a.fecha) return 1;
                if (!b.fecha) return -1;
                return b.fecha?.seconds - a.fecha?.seconds;
            });

            setMessages(sorted);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isOpen, terminal]);

    const handleAction = async (msg, action) => {
        try {
            if (action === 'read') {
                await updateDoc(doc(db, "sugerencias", msg.id), { leido: true });
            } else if (action === 'archive') {
                await updateDoc(doc(db, "sugerencias", msg.id), { archivado: true });
            }
        } catch (e) {
            console.error("Error updating message:", e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <div
                className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative z-10 animate-in fade-in zoom-in duration-200"
            >
                {/* HEADER */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <MessageSquare className="text-amber-500" size={24} />
                            Mensajes de {terminal.nombreNegocio}
                        </h3>
                        <p className="text-xs text-slate-400 font-mono mt-1">ID: {terminal.id}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTENT */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Inbox size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No hay mensajes pendientes para este cliente.</p>
                        </div>
                    ) : (
                        messages.map(m => (
                            <div
                                key={m.id}
                                className={`bg-slate-800/50 border rounded-xl p-4 transition-all ${m.leido ? 'border-slate-800 opacity-60' : 'border-amber-500/30 bg-amber-500/5'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold ${m.leido ? 'text-slate-400' : 'text-white'}`}>
                                        {m.title || "Sin Asunto"}
                                    </h4>
                                    <span className="text-[10px] bg-slate-900 px-2 py-1 rounded text-slate-500 font-mono flex items-center gap-1">
                                        <Clock size={10} />
                                        {m.fecha?.toDate?.().toLocaleDateString()}
                                    </span>
                                </div>

                                <p className="text-slate-300 text-sm mb-4 leading-relaxed bg-slate-900/50 p-3 rounded-lg">
                                    {m.message}
                                </p>

                                <div className="flex justify-end gap-2">
                                    {!m.leido ? (
                                        <button
                                            onClick={() => handleAction(m, 'read')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-colors border border-emerald-500/20"
                                        >
                                            <CheckCircle size={14} /> Marcar Leído
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleAction(m, 'archive')}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs font-bold transition-colors border border-slate-700"
                                        >
                                            <Trash2 size={14} /> Archivar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
