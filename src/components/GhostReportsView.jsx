import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, orderBy, limit, where, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { syncGhostReports, deleteLocalReport, deleteAllLocalReports } from '../services/ghostArchiveService';
import Swal from 'sweetalert2';
import {
    Download, RefreshCw, Search, FileBarChart, Activity,
    AlertTriangle, CheckCircle, XCircle, TrendingUp,
    Calendar, ChevronDown, ChevronUp, Database, Clock, Zap,
    Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';

export default function GhostReportsView() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [simulating, setSimulating] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [expandedSections, setExpandedSections] = useState({ anomalias: true, recomendaciones: true });
    const [currentPage, setCurrentPage] = useState(0);
    const REPORTS_PER_PAGE = 10;

    const fetchReports = async () => {
        setLoading(true);
        try {
            // Sync: Firebase → local IndexedDB → purge Firebase
            const data = await syncGhostReports();
            setReports(data);
            if (data.length > 0 && !selectedReport) setSelectedReport(data[0]);
        } catch (error) {
            console.warn("Ghost Reports sync error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReports(); }, []);

    // ─── DAY SIMULATOR ───
    const handleSimulateDay = async () => {
        const confirm = await Swal.fire({
            title: '🧪 Simular Día Completo',
            html: 'Se generará un reporte con datos ficticios realistas para probar la visualización.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Simular',
            cancelButtonText: 'Cancelar',
            background: '#0f172a',
            color: '#f8fafc',
            confirmButtonColor: '#8b5cf6'
        });
        if (!confirm.isConfirmed) return;

        setSimulating(true);
        try {
            const r = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;
            const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
            const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

            const totalSales = ri(8, 35);
            const avgTicket = r(3, 25);
            const totalRevenue = +(totalSales * avgTicket).toFixed(2);
            const totalItems = ri(totalSales * 2, totalSales * 5);
            const peakHour = pick([9, 10, 11, 12, 14, 15, 16, 17, 18]);
            const healthScore = ri(55, 98);
            const dateKey = new Date().toISOString().slice(0, 10);

            const paymentMethods = {};
            const methods = ['Efectivo USD', 'Pago Móvil', 'Efectivo Bs', 'Zelle', 'Punto de Venta'];
            methods.forEach(m => { if (Math.random() > 0.3) paymentMethods[m] = ri(1, totalSales); });

            const productNames = ['Harina PAN', 'Aceite Diana', 'Arroz Mary', 'Azúcar Montalbán', 'Leche Completa', 'Pasta Primor', 'Café Madrid', 'Sardina Margarita', 'Mantequilla Mavesa', 'Jabón Las Llaves'];
            const anomaliaPool = [
                `Se vendió "${pick(productNames)}" ${ri(3, 8)} veces pero el stock estaba en 0 — posible desincronización`,
                `Descuento promedio del ${ri(15, 40)}% detectado — verificar si es intencional`,
                `${ri(2, 5)} ventas a crédito consecutivas registradas entre ${ri(14, 16)}:00 y ${ri(17, 19)}:00`,
                `La tasa BCV cambió ${ri(2, 4)} veces durante el día — inestabilidad cambiaria`,
                `El producto "${pick(productNames)}" tiene ${ri(200, 500)} unidades — posible exceso de inventario`,
                `Hora pico inusual: ${ri(19, 21)}:00 (normalmente es entre 10-12)`,
                `Se detectaron ${ri(2, 4)} errores de cálculo en el método "Pago Móvil"`
            ];
            const recoPool = [
                `Reabastecer "${pick(productNames)}" — stock crítico (${ri(0, 3)} unidades)`,
                `Considerar promoción en "${pick(productNames)}" que lleva ${ri(5, 15)} días sin movimiento`,
                `El ticket promedio ($${avgTicket.toFixed(2)}) está ${avgTicket < 8 ? 'por debajo' : 'por encima'} del benchmark de $8 — ${avgTicket < 8 ? 'crear combos' : 'mantener estrategia'}`,
                `Optimizar inventario de "${pick(productNames)}" — rotación alta, stock bajo`,
                `Evaluar horario extendido: hay demanda después de las 18:00 según datos`,
                `Implementar sistema de fidelización — ${ri(40, 70)}% de ventas son clientes recurrentes`
            ];

            const numAnomalias = ri(0, 3);
            const numRecos = ri(1, 3);
            const anomalias = [];
            const recomendaciones = [];
            for (let i = 0; i < numAnomalias; i++) anomalias.push(pick(anomaliaPool));
            for (let i = 0; i < numRecos; i++) recomendaciones.push(pick(recoPool));

            const resumenPool = [
                `Día ${totalSales > 20 ? 'muy activo' : 'moderado'} con ${totalSales} transacciones y $${totalRevenue.toFixed(2)} de ingreso. Método preferido: ${Object.keys(paymentMethods)[0] || 'Efectivo'}. ${numAnomalias > 0 ? `Se detectaron ${numAnomalias} anomalía(s) que requieren atención.` : 'Operación estable sin anomalías.'}`,
                `Jornada de ${totalSales} ventas totalizando $${totalRevenue.toFixed(2)}. Hora pico: ${peakHour}:00. ${healthScore >= 80 ? 'Operación saludable.' : 'Se recomienda revisar las anomalías detectadas.'}`,
            ];

            const hourDistribution = new Array(24).fill(0);
            for (let i = 8; i <= 20; i++) hourDistribution[i] = ri(0, Math.round(totalSales / 4));
            hourDistribution[peakHour] = ri(Math.round(totalSales / 3), Math.round(totalSales / 2));

            const report = {
                date: dateKey,
                status: 'complete',
                businessName: pick(['Bodega Don Pepe', 'Mini Market La Esquina', 'Abastos El Sol', 'Bodega María', 'Super Express 24h']),
                systemId: `sim_${Date.now().toString(36)}`,
                type: 'daily_report',
                metrics: {
                    totalEvents: ri(80, 400),
                    byCategory: { SALE: totalSales, INVENTORY: ri(2, 15), STATE: ri(30, 200), ERROR: ri(0, 5), CONFIG: ri(0, 3), SESSION: 2 },
                    bySeverity: { INFO: ri(60, 300), WARN: ri(0, 10), CRITICAL: ri(0, 2) },
                    peakHour,
                    hourDistribution,
                    sales: {
                        totalSales,
                        totalRevenue,
                        avgTicket,
                        totalItems,
                        paymentMethods,
                        salesWithDebt: ri(0, Math.ceil(totalSales * 0.2))
                    },
                    errors: { totalErrors: ri(0, 5), criticalErrors: ri(0, 1), errorTypes: ri(0, 1) > 0 ? ['runtime_error'] : [] },
                    inventory: { adjustments: ri(0, 5), productsAdded: ri(0, 3), productsRemoved: ri(0, 1), bulkImports: 0 }
                },
                aiDigest: {
                    resumen: pick(resumenPool),
                    anomalias,
                    recomendaciones,
                    healthScore,
                    alertaMaxima: healthScore < 60 ? `⚠️ Score de salud bajo (${healthScore}) — revisar anomalías` : null
                },
                rawEventCount: ri(80, 400),
                rawEvents: [],
                generatedAt: Date.now(),
                syncedAt: Date.now(),
                _simulated: true
            };

            const docId = `${report.systemId}_${report.date}`;
            const docRef = doc(db, 'ghost_daily_reports', docId);
            await setDoc(docRef, report);

            await Swal.fire({
                title: '✅ Día Simulado',
                html: `<b>${report.businessName}</b><br/>${totalSales} ventas • $${totalRevenue.toFixed(2)} • Score: ${healthScore}`,
                icon: 'success',
                timer: 3000,
                showConfirmButton: false,
                background: '#0f172a',
                color: '#f8fafc'
            });

            await fetchReports();
        } catch (e) {
            console.error('Simulation error:', e);
            Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#0f172a', color: '#f8fafc' });
        } finally {
            setSimulating(false);
        }
    };

    const toggleSection = (key) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // ─── DELETE HANDLERS ───
    const handleDeleteSingle = async (report) => {
        const confirm = await Swal.fire({
            title: '🗑️ Eliminar Reporte',
            html: `¿Eliminar reporte de <b>${report.date}</b> (${report.businessName})?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            background: '#0f172a',
            color: '#f8fafc'
        });
        if (!confirm.isConfirmed) return;
        try {
            await deleteLocalReport(report.id);
            if (selectedReport?.id === report.id) setSelectedReport(null);
            await fetchReports();
            Swal.fire({ title: 'Eliminado', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' });
        } catch (e) {
            Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#0f172a', color: '#f8fafc' });
        }
    };

    const handleDeleteAll = async () => {
        if (reports.length === 0) return;
        const confirm = await Swal.fire({
            title: '🗑️ Eliminar TODOS los Reportes',
            html: `Se eliminarán <b>${reports.length}</b> reportes permanentemente.<br/><span style="color:#ef4444">Esta acción no se puede deshacer.</span>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Sí, eliminar ${reports.length}`,
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            background: '#0f172a',
            color: '#f8fafc'
        });
        if (!confirm.isConfirmed) return;
        try {
            setLoading(true);
            await deleteAllLocalReports();
            setSelectedReport(null);
            setCurrentPage(0);
            await fetchReports();
            Swal.fire({ title: 'Todo Eliminado', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' });
        } catch (e) {
            Swal.fire({ title: 'Error', text: e.message, icon: 'error', background: '#0f172a', color: '#f8fafc' });
        } finally {
            setLoading(false);
        }
    };

    // ─── PAGINATION ───
    const totalPages = Math.max(1, Math.ceil(reports.length / REPORTS_PER_PAGE));
    const paginatedReports = reports.slice(currentPage * REPORTS_PER_PAGE, (currentPage + 1) * REPORTS_PER_PAGE);

    // Health scoring colors
    const getHealthColor = (score) => {
        if (score == null) return 'text-slate-500';
        if (score >= 80) return 'text-emerald-400';
        if (score >= 60) return 'text-amber-400';
        return 'text-red-400';
    };

    const getHealthBg = (score) => {
        if (score == null) return 'bg-slate-800';
        if (score >= 80) return 'bg-emerald-500/10 border-emerald-500/30';
        if (score >= 60) return 'bg-amber-500/10 border-amber-500/30';
        return 'bg-red-500/10 border-red-500/30';
    };

    // Download all reports as a single JSON
    const handleDownloadAll = () => {
        const dataset = reports.map(r => ({
            date: r.date,
            businessName: r.businessName,
            systemId: r.systemId,
            metrics: r.metrics,
            aiDigest: r.aiDigest,
            rawEventCount: r.rawEventCount,
            rawEvents: r.rawEvents
        }));
        const blob = new Blob([JSON.stringify(dataset, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ghost_audit_dataset_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadSingle = (report) => {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `ghost_report_${report.date}_${report.systemId || 'pos'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                            <FileBarChart size={24} />
                        </div>
                        Reportes Ghost
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                        Inteligencia operativa diaria generada por IA
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleSimulateDay}
                        disabled={simulating}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                    >
                        <Zap size={14} className={simulating ? "animate-pulse" : ""} />
                        {simulating ? 'SIMULANDO...' : '🧪 SIMULAR DÍA'}
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        disabled={reports.length === 0}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                    >
                        <Database size={14} /> COMPILAR ({reports.length})
                    </button>
                    <button
                        onClick={handleDeleteAll}
                        disabled={reports.length === 0}
                        className="flex items-center gap-2 bg-red-600/80 hover:bg-red-500 disabled:opacity-30 text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors"
                    >
                        <Trash2 size={14} /> BORRAR TODO
                    </button>
                    <button
                        onClick={fetchReports}
                        className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                    <div className="text-2xl font-black text-white">{reports.length}</div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Reportes</div>
                </div>
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                    <div className="text-2xl font-black text-emerald-400">
                        {reports.filter(r => r.aiDigest?.healthScore >= 80).length}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Sanos (80+)</div>
                </div>
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                    <div className="text-2xl font-black text-amber-400">
                        {reports.filter(r => r.aiDigest?.anomalias?.length > 0).length}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Con Anomalías</div>
                </div>
                <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                    <div className="text-2xl font-black text-purple-400">
                        {reports.reduce((sum, r) => sum + (r.rawEventCount || 0), 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-widest">Eventos Totales</div>
                </div>
            </div>

            {/* Main Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Report List */}
                <div className="col-span-1 space-y-2">
                    <div className="max-h-[620px] overflow-y-auto custom-scrollbar space-y-2">
                        {paginatedReports.map((report) => {
                            const score = report.aiDigest?.healthScore;
                            return (
                                <div
                                    key={report.id}
                                    onClick={() => setSelectedReport(report)}
                                    className={`cursor-pointer group p-4 rounded-xl border transition-all relative ${selectedReport?.id === report.id
                                        ? 'bg-slate-800 border-purple-500/50 shadow-lg shadow-purple-900/10'
                                        : 'bg-slate-950/50 border-slate-800 hover:bg-slate-900'
                                        }`}
                                >
                                    {/* Delete button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteSingle(report); }}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 bg-red-500/10 hover:bg-red-500/30 text-red-400 rounded-lg transition-all"
                                        title="Eliminar reporte"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={14} className="text-slate-500" />
                                            <span className="text-sm font-bold text-slate-300">{report.date}</span>
                                        </div>
                                        {score != null && (
                                            <span className={`text-lg font-black ${getHealthColor(score)}`}>
                                                {score}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-500 space-y-1">
                                        <div className="flex justify-between">
                                            <span>{report.businessName || 'Terminal'}</span>
                                            <span>{report.rawEventCount || 0} eventos</span>
                                        </div>
                                        {report.metrics?.sales && (
                                            <div className="flex justify-between text-emerald-400/60">
                                                <span>{report.metrics.sales.totalSales} ventas</span>
                                                <span>${report.metrics.sales.totalRevenue?.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {reports.length === 0 && !loading && (
                            <div className="text-center p-12 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                                <FileBarChart size={48} className="mx-auto mb-4 opacity-30" />
                                <p className="font-bold">Sin reportes aún</p>
                                <p className="text-xs mt-1">Los reportes se generan a las 10 PM desde cada POS</p>
                            </div>
                        )}
                    </div>
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                                disabled={currentPage === 0}
                                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg transition-all"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs text-slate-500 font-mono">
                                {currentPage + 1} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                                disabled={currentPage >= totalPages - 1}
                                className="p-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg transition-all"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Report Detail */}
                <div className="col-span-2 space-y-4">
                    {selectedReport ? (
                        <>
                            {/* Health Score Card */}
                            <div className={`rounded-2xl p-6 border ${getHealthBg(selectedReport.aiDigest?.healthScore)}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                                            <Activity size={20} />
                                            {selectedReport.businessName || 'Terminal POS'}
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                                            <Clock size={12} />
                                            {selectedReport.date} • {selectedReport.rawEventCount} eventos analizados
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-5xl font-black ${getHealthColor(selectedReport.aiDigest?.healthScore)}`}>
                                            {selectedReport.aiDigest?.healthScore ?? '—'}
                                        </div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-widest">Salud</div>
                                    </div>
                                </div>

                                {/* AI Summary */}
                                {selectedReport.aiDigest?.resumen && (
                                    <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-4">
                                        <p className="text-sm text-slate-300 leading-relaxed">
                                            {selectedReport.aiDigest.resumen}
                                        </p>
                                    </div>
                                )}

                                {/* Alert */}
                                {selectedReport.aiDigest?.alertaMaxima && (
                                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
                                        <AlertTriangle size={20} className="text-red-400 flex-shrink-0" />
                                        <p className="text-sm text-red-300 font-bold">{selectedReport.aiDigest.alertaMaxima}</p>
                                    </div>
                                )}
                            </div>

                            {/* Sales Metrics */}
                            {selectedReport.metrics?.sales && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                                        <div className="text-xl font-black text-white">{selectedReport.metrics.sales.totalSales}</div>
                                        <div className="text-[9px] text-slate-500 uppercase">Ventas</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                                        <div className="text-xl font-black text-emerald-400">${selectedReport.metrics.sales.totalRevenue?.toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 uppercase">Ingresos</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                                        <div className="text-xl font-black text-blue-400">${selectedReport.metrics.sales.avgTicket?.toFixed(2)}</div>
                                        <div className="text-[9px] text-slate-500 uppercase">Ticket Prom.</div>
                                    </div>
                                    <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                                        <div className="text-xl font-black text-purple-400">{selectedReport.metrics.peakHour}:00</div>
                                        <div className="text-[9px] text-slate-500 uppercase">Hora Pico</div>
                                    </div>
                                </div>
                            )}

                            {/* Anomalies */}
                            {selectedReport.aiDigest?.anomalias?.length > 0 && (
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                                    <button onClick={() => toggleSection('anomalias')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                                            <AlertTriangle size={16} />
                                            Anomalías Detectadas ({selectedReport.aiDigest.anomalias.length})
                                        </div>
                                        {expandedSections.anomalias ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                    </button>
                                    {expandedSections.anomalias && (
                                        <div className="px-4 pb-4 space-y-2">
                                            {selectedReport.aiDigest.anomalias.map((a, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                    <XCircle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                                                    {a}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recommendations */}
                            {selectedReport.aiDigest?.recomendaciones?.length > 0 && (
                                <div className="bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
                                    <button onClick={() => toggleSection('recomendaciones')} className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                                            <TrendingUp size={16} />
                                            Recomendaciones ({selectedReport.aiDigest.recomendaciones.length})
                                        </div>
                                        {expandedSections.recomendaciones ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
                                    </button>
                                    {expandedSections.recomendaciones && (
                                        <div className="px-4 pb-4 space-y-2">
                                            {selectedReport.aiDigest.recomendaciones.map((r, i) => (
                                                <div key={i} className="flex items-start gap-2 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                                                    <CheckCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                                                    {r}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => handleDeleteSingle(selectedReport)}
                                    className="flex items-center gap-2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-lg border border-red-500/30 transition-colors"
                                >
                                    <Trash2 size={14} /> Eliminar
                                </button>
                                <button
                                    onClick={() => handleDownloadSingle(selectedReport)}
                                    className="flex items-center gap-2 text-xs font-bold text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 rounded-lg border border-purple-500/30 transition-colors"
                                >
                                    <Download size={14} /> Descargar
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="h-96 flex flex-col items-center justify-center text-slate-600 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                            <FileBarChart size={48} className="mb-4 opacity-30" />
                            <p className="font-bold">Selecciona un reporte</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
