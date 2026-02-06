
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Archive, Trash2, RotateCcw, Clock, Inbox } from 'lucide-react';
import { Pagination } from './dashboard/Pagination';
import Swal from 'sweetalert2';

export default function ArchivedInbox() {
    const [mensajes, setMensajes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    // Lógica de Paginación
    const totalItems = mensajes.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedMessages = mensajes.slice(startIndex, startIndex + itemsPerPage);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "sugerencias"), (snapshot) => {
            const rawData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

            // 🟢 FILTRAR SOLO ARCHIVADOS
            const archivedData = rawData.filter(m => m.archivado === true);

            // 🟢 SORTING
            const sortedData = archivedData.sort((a, b) => {
                if (!a.fecha) return 1;
                if (!b.fecha) return -1;
                return b.fecha?.seconds - a.fecha?.seconds;
            });

            setMensajes(sortedData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const recuperar = async (msg) => {
        try {
            await updateDoc(doc(db, "sugerencias", msg.id), { archivado: false });
        } catch (e) {
            console.error(e);
        }
    };

    const borrarPermanente = async (msg) => {
        const result = await Swal.fire({
            title: '¿ELIMINAR PERMANENTE?',
            text: "Esta acción no se puede deshacer.",
            icon: 'warning',
            background: '#1e293b',
            color: '#fff',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'SÍ, BORRAR'
        });

        if (result.isConfirmed) {
            try {
                await deleteDoc(doc(db, "sugerencias", msg.id));
            } catch (e) {
                console.error(e);
            }
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 text-slate-500 animate-pulse gap-4">
            <Archive size={48} className="opacity-50" />
            <p className="font-mono text-sm tracking-widest">ACCEDIENDO AL ARCHIVO...</p>
        </div>
    );

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-8 border-b border-slate-700 pb-4">
                <Archive className="text-slate-400" size={28} />
                <h2 className="text-2xl font-bold text-white tracking-tighter">ARCHIVO HISTÓRICO</h2>
                <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-xs font-mono">{mensajes.length} GUARDADOS</span>
            </div>

            <div className="space-y-4">
                {mensajes.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-4">
                        <Archive size={48} />
                        <p className="italic">El archivo está vacío.</p>
                    </div>
                )}

                {paginatedMessages.map(m => (
                    <div key={m.id} className="bg-slate-900/50 rounded-xl p-5 border border-slate-800 opacity-60 hover:opacity-100 transition-all group">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="font-bold text-slate-300">{m.title || 'Sin Asunto'}</h3>
                            <span className="text-xs text-slate-500 font-mono">
                                {m.fecha?.toDate ? m.fecha.toDate().toLocaleString('es-VE') : 'Antiguo'}
                            </span>
                        </div>

                        <p className="text-slate-400 text-sm mb-4">
                            "{m.message}"
                        </p>

                        <div className="flex justify-between items-center text-xs text-slate-500">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-400 uppercase">{m.nombreNegocio}</span>
                                <span className="font-mono text-[10px] opacity-70">{m.hardwareId}</span>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => recuperar(m)}
                                    className="p-2 bg-slate-700 text-white rounded hover:bg-emerald-600 transition-colors"
                                    title="Recuperar al Buzón"
                                >
                                    <RotateCcw size={16} />
                                </button>
                                <button
                                    onClick={() => borrarPermanente(m)}
                                    className="p-2 bg-slate-700 text-white rounded hover:bg-red-600 transition-colors"
                                    title="Eliminar Permanente"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Paginación */}
                <Pagination
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
        </div>
    );
}
