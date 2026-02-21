import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, LifeBuoy } from 'lucide-react';
import Swal from 'sweetalert2';
import { useTerminalData } from '../hooks/useTerminalData';
import { StatsBar } from './dashboard/StatsBar';
import { TerminalCard } from './dashboard/TerminalCard';
import { LegalVaultModal } from './dashboard/LegalVaultModal';
import RescueToolModal from './dashboard/RescueToolModal';
import { MasterClock } from './dashboard/MasterClock';
import { Pagination } from './dashboard/Pagination';

import TerminalMessagesModal from './dashboard/TerminalMessagesModal'; // Importar el nuevo modal

export default function Dashboard({ onGenerateKey }) {
    const {
        terminales,
        loading,
        globalStats,
        unreadMap,
        actions
    } = useTerminalData();

    // Estado para la Bóveda Legal y Mensajes
    const [legalTerminal, setLegalTerminal] = useState(null);
    const [messagesTerminal, setMessagesTerminal] = useState(null); // Nuevo estado para mensajes
    const [showRescueTool, setShowRescueTool] = useState(false);
    const [rescuePrefill, setRescuePrefill] = useState(""); // Nuevo state para ID
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Grid de 3x3

    const handleOpenRescue = (id = "") => {
        setRescuePrefill(id);
        setShowRescueTool(true);
    };

    // Filtrado Inteligente + Priority Sort (_needsActivation primero)
    const filteredTerminals = (terminales || [])
        .filter(t =>
            (t.nombreNegocio?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
            (t.id?.toLowerCase() || "").includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            // _needsActivation terminals always first
            const aNeeds = a._needsActivation ? 1 : 0;
            const bNeeds = b._needsActivation ? 1 : 0;
            return bNeeds - aNeeds;
        });

    // Lógica de Paginación
    const totalItems = filteredTerminals.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedTerminals = filteredTerminals.slice(startIndex, startIndex + itemsPerPage);

    // Reset de página al buscar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // 🔔 TOAST: Real-time notification when new activation requests arrive
    const prevActivationIdsRef = useRef(new Set());
    useEffect(() => {
        const currentIds = new Set(
            (terminales || []).filter(t => t._needsActivation).map(t => t.id)
        );

        // Skip first render (don't toast for existing requests)
        if (prevActivationIdsRef.current.size > 0 || currentIds.size === 0) {
            // Find new activation requests
            currentIds.forEach(id => {
                if (!prevActivationIdsRef.current.has(id)) {
                    const terminal = terminales.find(t => t.id === id);
                    if (terminal) {
                        Swal.fire({
                            toast: true,
                            position: 'top-end',
                            icon: 'warning',
                            title: `⚠️ ${terminal.nombreNegocio}`,
                            text: 'Solicita Activación de Licencia',
                            timer: 6000,
                            showConfirmButton: false,
                            background: '#1a1520',
                            color: '#fbbf24',
                            iconColor: '#f59e0b',
                            customClass: {
                                popup: 'border border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
                            }
                        });
                    }
                }
            });
        }
        prevActivationIdsRef.current = currentIds;
    }, [terminales]);

    // Quick activate handler - direct activation with confirmation
    const handleQuickActivate = (terminal) => {
        actions.handleQuickActivate(terminal);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                <div className="text-slate-500 font-black text-xs uppercase tracking-widest">Sincronizando Consola...</div>
            </div>
        );
    }

    return (
        <div className="px-4 pb-8 space-y-10">
            {/* Header: Stats + Manual Activation Button */}
            {/* Header: Stats + Actions */}
            {/* Header: Clock + Stats + Actions */}
            {/* Header Rediseñado: Espacioso y Jerárquico */}
            <div className="space-y-6">
                {/* Upper Deck: Clock + Search + Global Actions */}
                <div className="flex flex-col xl:flex-row items-center justify-between gap-6">
                    {/* Clock Widget */}
                    <div className="w-full xl:w-auto">
                        <MasterClock />
                    </div>

                    {/* Actions Area */}
                    <div className="flex items-center gap-4 w-full xl:w-auto bg-slate-900/50 p-2 rounded-3xl border border-slate-800/50 backdrop-blur-sm">
                        <div className="relative group flex-1 md:w-80">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-emerald-400 transition-colors">
                                <Search size={18} />
                            </div>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar Terminal por ID, Nombre o RIF..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-sm text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 font-mono"
                            />
                        </div>

                        <div className="h-8 w-px bg-slate-800 mx-2" />

                        {/* Rescue Tool Button */}
                        <button
                            onClick={() => handleOpenRescue("")}
                            className="bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white p-3 rounded-2xl transition-all border border-red-500/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] active:scale-[0.95]"
                            title="Protocolo de Rescate (Manual)"
                        >
                            <LifeBuoy size={20} />
                        </button>

                        {/* Manual Activation Button */}
                        <button
                            onClick={actions.handleManualActivation}
                            className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white p-3 rounded-2xl transition-all border border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-[0.95]"
                            title="Activar Nueva Terminal"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>
                </div>

                {/* Lower Deck: Stats Bar (Full Width & Spacious) */}
                <div className="w-full overflow-x-auto pb-2">
                    <StatsBar
                        stats={globalStats}
                        totalTerminals={terminales.length}
                    />
                </div>
            </div>

            {/* Terminals Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedTerminals.map(terminal => (
                    <TerminalCard
                        key={terminal.id}
                        terminal={terminal}
                        actions={actions}
                        unreadCount={unreadMap?.[terminal.id] || 0}
                        onGenerateKey={() => handleOpenRescue(terminal.id)}
                        onOpenLegal={() => setLegalTerminal(terminal)}
                        onOpenMessages={() => setMessagesTerminal(terminal)}
                        onQuickActivate={handleQuickActivate}
                    />
                ))}
            </div>

            {/* Paginación */}
            <Pagination
                currentPage={currentPage}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
            />

            {filteredTerminals.length === 0 && (
                <div className="glass-panel rounded-3xl p-20 text-center border border-slate-800/50">
                    <Search size={48} className="mx-auto mb-4 text-slate-800" />
                    <p className="text-slate-600 font-bold uppercase tracking-widest">
                        {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : "No hay terminales vinculadas al Control Maestro"}
                    </p>
                </div>
            )}

            {/* Legal Vault Modal */}
            {legalTerminal && (
                <LegalVaultModal
                    terminal={legalTerminal}
                    onClose={() => setLegalTerminal(null)}
                />
            )}

            {/* Terminal Messages Modal */}
            <TerminalMessagesModal
                isOpen={!!messagesTerminal}
                terminal={messagesTerminal}
                onClose={() => setMessagesTerminal(null)}
            />

            {/* Offline Rescue Tool Modal */}
            <RescueToolModal
                isOpen={showRescueTool}
                onClose={() => { setShowRescueTool(false); setRescuePrefill(""); }}
                prefillId={rescuePrefill}
                terminals={terminales}
            />
        </div>
    );
}

