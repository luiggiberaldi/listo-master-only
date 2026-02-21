import React, { useState } from 'react';
import { Power, Edit3, Trash2, Key, Zap, MapPin, ShieldCheck, User, Hash, Phone, ExternalLink, ChevronDown, ChevronUp, Copy, MessageSquare, ArrowRightLeft, Bell } from 'lucide-react';
import { getPlan, getAllPlans } from '../../config/planTiers';
import Swal from 'sweetalert2';

export const TerminalCard = ({ terminal, actions, onGenerateKey, onOpenLegal, unreadCount, onOpenMessages, onQuickActivate }) => {
    const {
        handleToggleStatus,
        handleEditName,
        handleDeleteTerminal,
        handleResetPIN,
        handleChangePlan,
        handleEditDemoQuota
    } = actions;

    const planInfo = getPlan(terminal.plan);

    const [isCardExpanded, setIsCardExpanded] = useState(false);
    const [isKycOpen, setIsKycOpen] = useState(false);

    const isSuspended = terminal.status === 'SUSPENDED';
    const needsActivation = !!terminal._needsActivation;
    const statusText = isSuspended ? 'SUSPENDIDO' : 'ACTIVO';
    const statusColor = isSuspended
        ? 'bg-red-500/10 text-red-400 border-red-500/30'
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';

    // Card border class based on state priority
    const cardBorderClass = needsActivation
        ? 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
        : isSuspended
            ? 'border-red-900/30 grayscale-[0.5] opacity-80'
            : 'border-slate-800/50';

    return (
        <div className={`glass-panel glass-panel-hover rounded-2xl p-6 transition-all duration-300 relative overflow-hidden ${cardBorderClass}`}>

            {/* NOTIFICATION BUBBLE */}
            {unreadCount > 0 && (
                <div
                    onClick={(e) => { e.stopPropagation(); onOpenMessages(); }}
                    className="absolute top-0 right-0 z-20 cursor-pointer hover:scale-110 transition-transform"
                >
                    <div className="bg-amber-500 text-slate-900 text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-[0_4px_12px_rgba(245,158,11,0.4)] flex items-center gap-1.5 animate-pulse border-l border-b border-amber-400">
                        <MessageSquare size={10} className="fill-current" />
                        <span>{unreadCount} MENSAJES</span>
                    </div>
                </div>
            )}

            {/* Header: Name + Edit + Map + Delete */}
            <div className="flex items-start justify-between mb-4 relative z-10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h3 className="text-xl font-black text-white truncate tracking-tight">{terminal.nombreNegocio}</h3>

                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handleEditName(terminal)}
                            className="text-slate-600 hover:text-cyan-400 transition-colors p-1"
                            title="Editar Detalles"
                        >
                            <Edit3 size={16} />
                        </button>

                        {terminal.locationUrl && (
                            <a
                                href={terminal.locationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-slate-600 hover:text-emerald-400 transition-colors p-1"
                                title="Ver Ubicación en Maps"
                            >
                                <MapPin size={16} />
                            </a>
                        )}

                        <button
                            onClick={() => onOpenLegal(terminal)}
                            className="text-slate-600 hover:text-indigo-400 transition-colors p-1"
                            title="Bóveda Legal & Audit Trail"
                        >
                            <ShieldCheck size={16} />
                        </button>
                    </div>
                </div>
                <button
                    onClick={() => handleDeleteTerminal(terminal)}
                    className="text-slate-700 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                    title="Eliminar Permanente"
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* 🔔 ACTIVATION REQUEST ALERT — URGENT DESIGN */}
            {needsActivation && (
                <div className="mb-4 p-4 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(245,158,11,0.2) 100%)', border: '1px solid rgba(245,158,11,0.4)', boxShadow: '0 0 30px rgba(245,158,11,0.1), inset 0 1px 0 rgba(255,255,255,0.05)' }}>
                    {/* Animated glow pulse behind */}
                    <div className="absolute inset-0 rounded-xl animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.05) 0%, rgba(245,158,11,0.08) 100%)' }} />

                    <div className="relative z-10 flex items-center gap-3">
                        {/* Icon with ring animation */}
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-amber-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-red-500/30 to-amber-500/30 border border-amber-500/30">
                                <Bell size={18} className="text-amber-400" />
                            </div>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-black text-amber-400 uppercase tracking-[0.15em]">⚠ Solicita Activación</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                <span className="text-white font-bold">{terminal._lastUsageCount || '—'}</span> ventas
                                {terminal._requestedPlan && (
                                    <span className="ml-1.5 text-emerald-400 font-bold">
                                        • Plan {terminal._requestedPlan === 'minimarket' ? '🏢 Minimarket' : terminal._requestedPlan === 'abasto' ? '🏬 Abasto' : '🏪 Bodega'}
                                    </span>
                                )}
                                {terminal._activationRequestedAt?.toDate && (
                                    <span className="ml-1 text-slate-500">
                                        • {terminal._activationRequestedAt.toDate().toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Quick Activate Button */}
                        <button
                            onClick={(e) => { e.stopPropagation(); onQuickActivate && onQuickActivate(terminal); }}
                            className="flex-shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20 active:scale-[0.95] transition-all whitespace-nowrap"
                        >
                            <Zap size={12} className="inline mr-1.5 -mt-0.5" />
                            Activar
                        </button>
                    </div>
                </div>
            )}

            {/* Plan + Demo Badge */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                <button
                    onClick={() => handleChangePlan(terminal)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-80 ${planInfo.color}`}
                    title="Cambiar Plan"
                >
                    <span>{planInfo.icon}</span>
                    <span>{planInfo.label}</span>
                    <ArrowRightLeft size={10} className="ml-1 opacity-50" />
                </button>
                {terminal.isDemo ? (
                    <button
                        onClick={() => handleEditDemoQuota && handleEditDemoQuota(terminal)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all outline-none cursor-pointer flex-row"
                        title="Editar Límite de Ventas Demo"
                    >
                        <Edit3 size={10} className="opacity-70" />
                        <span>Demo • {Math.max(0, (terminal.quotaLimit || 0) - (terminal.usage_count || 0))} disponibles</span>
                    </button>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9px] font-bold bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                        ✅ Full
                    </span>
                )}
            </div>

            {/* Hardware ID */}
            <div
                className="mb-4 p-3 bg-black/40 rounded-xl border border-slate-800/50 group/hwid cursor-pointer hover:bg-slate-800/50 transition-colors relative"
                onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(terminal.id);
                    Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'ID Copiado', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' });
                }}
                title="Click para copiar ID"
            >
                <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Digital Fingerprint (HWID)</p>
                    <Copy size={10} className="text-slate-600 group-hover/hwid:text-blue-400 transition-colors opacity-0 group-hover/hwid:opacity-100" />
                </div>
                <p className="text-[11px] font-mono text-slate-400 truncate group-hover/hwid:text-blue-400 transition-colors">{terminal.id}</p>
            </div>

            {/* TOGGLE BUTTON (ACORDEÓN) */}
            <button
                onClick={() => setIsCardExpanded(!isCardExpanded)}
                className="w-full py-2 mb-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all"
            >
                {isCardExpanded ? 'Colapsar' : 'Gestionar Terminal'}
                {isCardExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {/* CONTENIDO EXPANDIBLE */}
            {isCardExpanded && (
                <div className="animate-in fade-in slide-in-from-top-4 duration-300">

                    {/* Status Badge */}
                    <div className="mb-6 flex justify-center">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] border ${statusColor}`}>
                            {statusText}
                        </span>
                    </div>

                    {/* 🔥 DATOS DEL CLIENTE (KYC) - ACORDEÓN */}
                    {(terminal.rif || terminal.propietario) && (
                        <div className="mb-6 bg-black/20 rounded-xl border border-slate-800/50 overflow-hidden transition-all duration-300">
                            <button
                                onClick={() => setIsKycOpen(!isKycOpen)}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors group outline-none"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/80 flex items-center gap-2 group-hover:text-emerald-400 transition-colors">
                                    <ShieldCheck size={12} />
                                    Suscriptor Validado
                                </span>
                                {isKycOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                            </button>

                            {isKycOpen && (
                                <div className="px-4 pt-4 pb-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                    {/* Propietario */}
                                    {terminal.propietario && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400">
                                                <User size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Representante</p>
                                                <p className="text-xs text-slate-300 font-medium truncate">{terminal.propietario}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* RIF */}
                                    {terminal.rif && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400">
                                                <Hash size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">RIF / Cédula</p>
                                                <p className="text-xs text-slate-300 font-mono tracking-wide">{terminal.rif}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Contacto + WhatsApp */}
                                    {(terminal.telefono || terminal.email_contacto) && (
                                        <div className="flex items-center gap-3">
                                            <div className="p-1.5 rounded-lg bg-slate-800/50 text-slate-400">
                                                <Phone size={14} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] uppercase text-slate-500 font-bold tracking-wider">Contacto Directo</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-xs text-slate-300 font-medium">{terminal.telefono || 'Sin tfno'}</p>

                                                    {/* Botón WhatsApp */}
                                                    {terminal.telefono && (
                                                        <a
                                                            href={`https://wa.me/${terminal.telefono.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider transition-colors border border-emerald-500/20 cursor-pointer"
                                                            title="Abrir Chat WhatsApp"
                                                        >
                                                            <span>WhatsApp</span>
                                                            <ExternalLink size={10} />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Financial Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/30">
                            <p className="text-[9px] font-black text-cyan-500/70 mb-1 uppercase tracking-[0.2em]">Facturado</p>
                            <p className="text-xl font-black text-white font-mono">${(terminal.ventasHoyUSD || 0).toFixed(2)}</p>
                        </div>
                        <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/30">
                            <p className="text-[9px] font-black text-violet-500/70 mb-1 uppercase tracking-[0.2em]">Tickets</p>
                            <p className="text-xl font-black text-white font-mono">{terminal.conteoVentasHoy || 0}</p>
                        </div>
                    </div>

                    {/* Disk Health Monitor */}
                    {terminal.storage && (
                        <div className="mb-4 px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-800 flex items-center justify-between group/disk">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${terminal.storage.percentUsed > 90 ? 'bg-red-500 animate-pulse' :
                                    terminal.storage.percentUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} />
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Salud de Disco</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${terminal.storage.percentUsed > 90 ? 'bg-red-500' :
                                            terminal.storage.percentUsed > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`}
                                        style={{ width: `${terminal.storage.percentUsed}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-mono text-slate-300">
                                    {terminal.storage.free}GB Libre
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Metadata */}
                    <div className="space-y-2 text-[11px] text-slate-500 mb-8 border-t border-slate-800/50 pt-6">
                        <div className="flex justify-between items-center">
                            <span className="uppercase tracking-widest text-[9px] font-bold">Build:</span>
                            <span className="text-white font-mono">{terminal.version || 'v1.0-LEGACY'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="uppercase tracking-widest text-[9px] font-bold">Último Vínculo:</span>
                            <span className="text-white">
                                {terminal.lastSeen?.toDate?.()?.toLocaleString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '--/--/--'}
                            </span>
                        </div>

                        {/* PIN Reset Status */}
                        {terminal.request_pin_reset && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg text-amber-400 font-bold text-center animate-pulse">
                                ⌛ RESET PENDIENTE...
                            </div>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => handleToggleStatus(terminal)}
                            className={`py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 border ${isSuspended
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white'
                                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white'
                                }`}
                        >
                            <Power size={14} />
                            {isSuspended ? 'Reactivar' : 'Suspender'}
                        </button>

                        <button
                            onClick={() => handleResetPIN(terminal)}
                            className="py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50"
                            title="Restablecer PIN de Acceso"
                        >
                            <Key size={14} />
                            Reset PIN
                        </button>

                        <button
                            onClick={() => onGenerateKey(terminal.id)}
                            className="col-span-2 py-4 rounded-xl font-black text-[11px] uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                        >
                            <Zap size={15} />
                            Generar Licencia
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
