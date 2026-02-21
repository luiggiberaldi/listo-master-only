
// 🛡️ LISTO SECURITY CORE - OFF-GRID PROTOCOLS
// Archivo: src/utils/securityUtils.js

// SALTS (FROM ENVIRONMENT — never hardcode)
export const SALT_OWNER = import.meta.env.VITE_SALT_OWNER;
export const SALT_MASTER = import.meta.env.VITE_SALT_MASTER;

// 1. Calcular Respuesta (SHA-256 Truncado a 6 dígitos numéricos)
export const calculateResponse = async (challenge, systemId, salt) => {
    if (!challenge || !systemId || !salt) return null;

    const data = challenge.toUpperCase() + systemId + salt;
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);

    const view = new DataView(hashBuffer);
    const numericValue = view.getUint32(hashBuffer.byteLength - 4); // Últimos 4 bytes

    const pin = (numericValue % 1000000).toString().padStart(6, '0');
    return pin;
};

// 2. Generar PIN Maestro
export const generateMasterPin = async (challenge, systemId) => {
    return await calculateResponse(challenge, systemId, SALT_MASTER);
}
