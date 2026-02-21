import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, X, FileText, Clock, Globe, Fingerprint, Trash2 } from 'lucide-react';
import { db } from '../../firebase'; // Adjust path if needed
import { collection, query, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import jsPDF from 'jspdf';
import Swal from 'sweetalert2';

export function LegalVaultModal({ terminal, onClose }) {
    const [auditTrail, setAuditTrail] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!terminal) return;

        const fetchHistory = async () => {
            try {
                const q = query(
                    collection(db, 'terminales', terminal.id, 'legal_audit_trail'),
                    orderBy('timestamp', 'desc')
                );
                const snapshot = await getDocs(q);
                const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setAuditTrail(logs);
            } catch (error) {
                console.error("Error fetching audit trail:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [terminal]);

    const handleDeleteLog = async (logId) => {
        // 1. Advertencia Inicial
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción eliminará el registro forense permanentemente. Es irreversible.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, continuar',
            cancelButtonText: 'Cancelar',
            background: '#0f172a',
            color: '#fff'
        });

        if (result.isConfirmed) {
            // 2. Doble Verificación (Escribir BORRAR)
            const { value: verification } = await Swal.fire({
                title: 'Verificación de Seguridad',
                text: "Escribe 'BORRAR' para confirmar la destrucción del registro.",
                input: 'text',
                inputPlaceholder: 'BORRAR',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                background: '#0f172a',
                color: '#fff',
                inputValidator: (value) => {
                    if (value !== 'BORRAR') {
                        return 'Debes escribir BORRAR en mayúsculas.';
                    }
                }
            });

            if (verification === 'BORRAR') {
                try {
                    setLoading(true);
                    await deleteDoc(doc(db, 'terminales', terminal.id, 'legal_audit_trail', logId));

                    // Actualizar UI localmente
                    setAuditTrail(prev => prev.filter(l => l.id !== logId));

                    Swal.fire({
                        title: 'Eliminado',
                        text: 'El registro ha sido destruido.',
                        icon: 'success',
                        background: '#0f172a',
                        color: '#fff',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } catch (error) {
                    console.error("Error deleting log:", error);
                    Swal.fire({
                        title: 'Error',
                        text: 'No se pudo eliminar el registro.',
                        icon: 'error',
                        background: '#0f172a',
                        color: '#fff'
                    });
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const generateCertificate = (log) => {
        const pdf = new jsPDF();
        const dateStr = log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString('es-VE') : new Date().toLocaleString();

        // --- 1. CONFIGURACIÓN DE PÁGINA (LIGHT THEME) ---
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, 210, 297, 'F'); // Fondo Blanco Puro

        // Marco elegante sutil
        pdf.setDrawColor(226, 232, 240); // Slate 200
        pdf.setLineWidth(0.5);
        pdf.rect(10, 10, 190, 277);

        // Franja de Encabezado Superior
        pdf.setFillColor(15, 23, 42); // Slate 900
        pdf.rect(10, 10, 190, 20, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text("CERTIFICADO DE ACEPTACIÓN DIGITAL - LISTO POS", 105, 23, { align: "center" });

        // --- 2. DATOS DEL SUSCRIPTOR ---
        pdf.setTextColor(30, 41, 59); // Slate 800
        pdf.setFontSize(16);
        pdf.text("ACTA DE REGISTRO FORENSE", 20, 50);

        pdf.setDrawColor(16, 185, 129); // Emerald 500
        pdf.setLineWidth(1);
        pdf.line(20, 55, 60, 55);

        pdf.setFontSize(10);
        pdf.setTextColor(148, 163, 184); // Slate 400
        pdf.setFont("helvetica", "bold");
        pdf.text("LICENCIATARIO:", 20, 70);
        pdf.text("HARDWARE ID:", 20, 80);
        pdf.text("REGISTRO IP:", 20, 90);
        pdf.text("FECHA/HORA:", 20, 100);
        pdf.text("CONTRATO:", 20, 110);

        pdf.setTextColor(15, 23, 42); // Slate 900
        pdf.setFont("courier", "bold");
        pdf.text(terminal.nombreNegocio.toUpperCase(), 60, 70);
        pdf.text(log.machine_id || "IDENTIFICADOR NO DISPONIBLE", 60, 80);
        pdf.text(log.ip_address || "NO REGISTRADA", 60, 90);
        pdf.text(dateStr, 60, 100);
        pdf.text(log.contract_version || "v1.0-2026", 60, 110);

        // --- 3. CONTENIDO LEGAL (SNAPSHOT) ---
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(16, 185, 129);
        pdf.text("CONTENIDO LEGAL PROTEGIDO E INMUTABLE:", 20, 125);

        pdf.setFont("courier", "normal");
        pdf.setTextColor(51, 65, 85); // Slate 700
        pdf.setFontSize(7.5);

        // Rectángulo para el texto (Área de Lectura)
        pdf.setDrawColor(241, 245, 249);
        pdf.setFillColor(248, 250, 252);
        pdf.rect(20, 130, 170, 100, 'F');

        // SANITIZACIÓN DE TEXTO: (Permitir caracteres latinos)
        const cleanText = (log.contract_text_snapshot || "CONTENIDO NO DISPONIBLE")
            // .replace(/[^\x00-\x7F]/g, "-") // REMOVED: Allow UTF-8 chars
            .replace(/={50,}/g, "=================================================="); // Normaliza barras

        const contentSnapshot = pdf.splitTextToSize(cleanText, 160);

        pdf.text(contentSnapshot.slice(0, 42), 25, 138); // Reducimos a 42 líneas para evitar solapamiento con el sello

        // --- 4. EL SELLO FORENSE DIGITAL ---
        const sealX = 165;
        const sealY = 245;

        pdf.setDrawColor(16, 185, 129);
        pdf.setLineWidth(1.5);
        pdf.circle(sealX, sealY, 22); // Círculo exterior
        pdf.setLineWidth(0.5);
        pdf.circle(sealX, sealY, 19); // Círculo interior

        // Simulación de texto circular
        pdf.setFontSize(5);
        pdf.setTextColor(16, 185, 129);
        pdf.setFont("helvetica", "bold");
        pdf.text("VALIDACIÓN DIGITAL * LISTO POS * LUIGI BERALDI", sealX, sealY - 24, { align: "center" });

        // Centro del Sello (Inclinado)
        pdf.setFontSize(12);
        pdf.text("FIRMADO", sealX, sealY + 2, { align: "center", angle: -15 });

        // ID Corto en el Sello
        pdf.setFontSize(6);
        const shortId = log.id ? log.id.substring(0, 12).toUpperCase() : "VERIFIED";
        pdf.text(`ID: ${shortId}`, sealX, sealY + 8, { align: "center", angle: -15 });

        // --- 5. FOOTER ---
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(148, 163, 184); // Slate 400
        pdf.text(`Certificado de integridad electrónica generado el ${new Date().toLocaleString()}`, 20, 285);
        pdf.text(`Doc Ref: ${log.id || 'N/A'}`, 190, 285, { align: "right" });

        pdf.save(`Certificado_Legal_${terminal.nombreNegocio.replace(/\s+/g, '_')}.pdf`);
    };

    if (!terminal) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">

                {/* HEAD */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/50 rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <ShieldCheck size={24} className="text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-wide">Bóveda Legal & Forense</h2>
                            <p className="text-xs text-slate-500 font-mono uppercase">Expediente: {terminal.nombreNegocio}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                    {loading ? (
                        <div className="flex justify-center p-10"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" /></div>
                    ) : auditTrail.length === 0 ? (
                        <div className="text-center p-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                            <ShieldCheck size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Sin registros forenses</p>
                            <p className="text-xs mt-2">Este terminal no ha firmado digitalmente ningún contrato aún.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {auditTrail.map((log) => (
                                <div key={log.id} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-emerald-500/10 p-3 rounded-lg text-emerald-500">
                                            <Fingerprint size={20} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-white font-bold text-sm">Contrato Aceptado ({log.contract_version})</h3>
                                                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold rounded-full tracking-wider">Verificado</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-slate-400 font-mono">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={12} />
                                                    {log.timestamp?.toDate ? log.timestamp.toDate().toLocaleString() : '---'}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Globe size={12} />
                                                    IP: {log.ip_address}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDeleteLog(log.id)}
                                            className="p-2 border border-red-900/40 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all"
                                            title="Eliminar Registro Forense"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => generateCertificate(log)}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                                        >
                                            <Download size={14} />
                                            Certificado
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
