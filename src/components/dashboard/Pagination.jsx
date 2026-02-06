import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-4 mt-12 py-4 border-t border-slate-800/50">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:border-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <ChevronLeft size={20} />
            </button>

            <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Página</span>
                <div className="px-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-sm shadow-inner">
                    {currentPage} <span className="text-slate-600 font-normal mx-1">/</span> {totalPages}
                </div>
            </div>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl border border-slate-700 bg-slate-900/50 text-slate-400 hover:text-white hover:border-emerald-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95"
            >
                <ChevronRight size={20} />
            </button>
        </div>
    );
};
