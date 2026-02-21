import React from 'react';
import { DollarSign, Receipt, Power } from 'lucide-react';
const COLOR_MAP = {
    cyan: { bg: 'bg-cyan-500/5', hover: 'group-hover:bg-cyan-500/10', text: 'text-cyan-400', glow: 'glow-text-cyan' },
    violet: { bg: 'bg-violet-500/5', hover: 'group-hover:bg-violet-500/10', text: 'text-violet-400', glow: 'glow-text-violet' },
    emerald: { bg: 'bg-emerald-500/5', hover: 'group-hover:bg-emerald-500/10', text: 'text-emerald-400', glow: 'glow-text-emerald' },
};

const StatCard = ({ icon: Icon, color, label, value, isCurrency }) => {
    const c = COLOR_MAP[color] || COLOR_MAP.cyan;
    return (
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden group min-w-[220px] flex-1">
            <div className={`absolute inset-0 ${c.bg} ${c.hover} transition-colors`} />
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Icon className={`${c.text} ${c.glow}`} size={24} />
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate">{label}</h3>
                </div>
                <p className="text-3xl font-black text-white font-mono">
                    {isCurrency ? `$${value.toFixed(2)}` : value}
                </p>
            </div>
        </div>
    );
};

export const StatsBar = ({ stats, totalTerminals }) => {
    return (
        <div className="flex flex-wrap gap-6 w-full">
            <StatCard
                icon={DollarSign}
                color="cyan"
                label="Ingresos Totales Hoy"
                value={stats.totalIncome}
                isCurrency
            />
            <StatCard
                icon={Receipt}
                color="violet"
                label="Transacciones"
                value={stats.totalTransactions}
            />
            <StatCard
                icon={Power}
                color="emerald"
                label="Terminales On-Line"
                value={`${stats.activeTerminals} / ${totalTerminals}`}
            />
        </div>
    );
};
