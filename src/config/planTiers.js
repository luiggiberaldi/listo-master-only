/**
 * 🏪 PLAN TIERS — Listo Master (Display Config)
 * Defines plan constants, features, colors, and icons for display in the Master dashboard.
 */

export const PLAN_IDS = {
    BODEGA: 'bodega',
    ABASTO: 'abasto',
    MINIMARKET: 'minimarket',
};

export const PLANES = {
    bodega: {
        id: 'bodega',
        label: 'Bodega',
        icon: '🏪',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        colorSolid: '#f59e0b',
        maxCajas: 1,
        description: 'Plan básico — 1 caja, POS + Inventario',
    },
    abasto: {
        id: 'abasto',
        label: 'Abasto',
        icon: '🏬',
        color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
        colorSolid: '#06b6d4',
        maxCajas: 2,
        description: 'Plan intermedio — 2 cajas, Clientes, Reportes',
    },
    minimarket: {
        id: 'minimarket',
        label: 'Minimarket',
        icon: '🏢',
        color: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
        colorSolid: '#8b5cf6',
        maxCajas: 4,
        description: 'Plan full — 4 cajas, Dashboard, Analytics',
    },
};

export const DEFAULT_PLAN = 'bodega';

/**
 * Get plan config by ID. Falls back to DEFAULT_PLAN.
 */
export const getPlan = (planId) => PLANES[planId] || PLANES[DEFAULT_PLAN];

/**
 * Get all plan entries as array (for selectors/dropdowns).
 */
export const getAllPlans = () => Object.values(PLANES);

/**
 * Default demo quota limits per plan.
 */
export const DEFAULT_QUOTAS = {
    bodega: 50,
    abasto: 100,
    minimarket: 200,
};
