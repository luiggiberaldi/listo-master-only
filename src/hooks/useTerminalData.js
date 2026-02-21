import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { supabase } from '../supabase'; // 🟢 Supabase Client
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    query, where, getDocs, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import Swal from 'sweetalert2';
import { getAllPlans, DEFAULT_PLAN } from '../config/planTiers';
import { KJUR } from 'jsrsasign'; // 🛡️ Fénix V2 Crypto

const swalDark = {
    background: '#0f172a',
    color: '#f8fafc',
    customClass: {
        popup: 'glass-panel rounded-3xl border-slate-800',
        title: 'text-white font-black tracking-[0.2em]',
        confirmButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase',
        cancelButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase bg-slate-800 text-white hover:bg-slate-700'
    }
};

export const useTerminalData = () => {
    const [terminales, setTerminales] = useState([]);
    const [loading, setLoading] = useState(true);

    const [unreadMap, setUnreadMap] = useState({});

    // Listener en tiempo real (Terminales)
    useEffect(() => {
        console.log("📡 [MASTER] Iniciando listener de terminales...");
        const unsubscribe = onSnapshot(collection(db, 'terminales'), (snapshot) => {
            console.log(`📡 [MASTER] Snapshot recibido. Docs: ${snapshot.docs.length}`);
            const data = snapshot.docs.map(doc => {
                return { id: doc.id, ...doc.data() };
            });
            setTerminales(data);
            setLoading(false);
        }, (error) => {
            console.error("🔥 [MASTER] Error crítico al leer terminales:", error);
            console.error("   - Code:", error.code);
            console.error("   - Message:", error.message);
            Swal.fire({
                title: 'Error de Conexión',
                text: `No se pudo conectar con la base de datos central: ${error.message}`,
                icon: 'error',
                toast: true, position: 'bottom-end',
                background: '#0f172a', color: '#f8fafc'
            });
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Listener en tiempo real (Mensajes no leídos)
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'sugerencias'), (snapshot) => {
            const counts = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const isArchived = data.archivado === true;
                const isRead = data.leido === true;
                const hasId = !!data.hardwareId;
                if (!isArchived && !isRead && hasId) {
                    counts[data.hardwareId] = (counts[data.hardwareId] || 0) + 1;
                }
            });
            setUnreadMap(counts);
        }, (error) => {
            console.error("Error fetching unread messages:", error);
        });
        return () => unsubscribe();
    }, []);

    // Cálculos de estadísticas globales
    const globalStats = terminales.reduce((acc, t) => {
        const isActive = t.status !== 'SUSPENDED';
        return {
            totalIncome: acc.totalIncome + (t.ventasHoyUSD || 0),
            totalTransactions: acc.totalTransactions + (t.conteoVentasHoy || 0),
            activeTerminals: acc.activeTerminals + (isActive ? 1 : 0)
        };
    }, { totalIncome: 0, totalTransactions: 0, activeTerminals: 0 });

    // --- ACCIONES (CRUD & SEGURIDAD) ---

    // 🛡️ FÉNIX V2: Signing Engine
    const signLicense = (payload) => {
        try {
            const privateKey = import.meta.env.VITE_FENIX_PRIVATE_KEY;
            if (!privateKey) {
                console.error("❌ FÉNIX KEY MISSING: Agrega VITE_FENIX_PRIVATE_KEY al .env");
                throw new Error("Clave Privada Fénix no configurada.");
            }
            const header = { alg: "RS256", typ: "JWT" };
            const sHeader = JSON.stringify(header);
            const sPayload = JSON.stringify(payload);
            const sJWT = KJUR.jws.JWS.sign("RS256", sHeader, sPayload, privateKey);
            return sJWT;
        } catch (error) {
            console.error("Signing Error:", error);
            throw error;
        }
    };

    const handleToggleStatus = async (terminal) => {
        const newStatus = terminal.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        const action = newStatus === 'SUSPENDED' ? 'SUSPENDER' : 'REACTIVAR';

        const result = await Swal.fire({
            ...swalDark,
            title: `¿${action} Terminal?`,
            text: `${terminal.nombreNegocio} (${terminal.id})`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'SUSPENDED' ? '#dc2626' : '#10b981',
            cancelButtonColor: '#1e293b',
            confirmButtonText: `Sí, ${action.toLowerCase()}`,
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await updateDoc(doc(db, 'terminales', terminal.id), { status: newStatus });
                Swal.fire({
                    ...swalDark,
                    title: 'Actualizado',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo actualizar el estado', icon: 'error' });
            }
        }
    };

    const handleEditName = async (terminal) => {
        const { value: formValues } = await Swal.fire({
            title: '✏️ EDITAR DETALLES',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 8px; letter-spacing: 0.2em;">NOMBRE DEL NEGOCIO</label>
                    <input id="edit-name" class="swal2-input" value="${terminal.nombreNegocio}" style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #f8fafc; border-radius: 12px; height: 50px;">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">UBICACIÓN (GOOGLE MAPS)</label>
                    <input id="edit-location" class="swal2-input" value="${terminal.locationUrl || ''}" placeholder="Pegar enlace de Maps..." style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #38bdf8; border-radius: 12px; height: 50px;">
                </div>
            `,
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: '#3b82f6',
            cancelButtonColor: '#1e293b',
            confirmButtonText: 'GUARDAR CAMBIOS',
            cancelButtonText: 'CANCELAR',
            customClass: {
                popup: 'glass-panel rounded-3xl border-slate-800',
                title: 'text-white font-black tracking-[0.2em] text-xl pt-8',
                confirmButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase',
                cancelButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase'
            },
            preConfirm: () => {
                return {
                    newName: document.getElementById('edit-name').value,
                    newLocation: document.getElementById('edit-location').value
                };
            }
        });

        if (formValues) {
            try {
                await updateDoc(doc(db, 'terminales', terminal.id), {
                    nombreNegocio: formValues.newName,
                    locationUrl: formValues.newLocation
                });
                Swal.fire({ ...swalDark, title: 'Actualizado', icon: 'success', timer: 1500, showConfirmButton: false });
            } catch (error) {
                Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo actualizar', icon: 'error' });
            }
        }
    };

    const handleResetPIN = async (terminal) => {
        const { value: masterPin } = await Swal.fire({
            ...swalDark,
            title: '🔐 Verificación de Seguridad',
            text: 'Ingresa el PIN Maestro para autorizar el reset:',
            input: 'password',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
        });

        const expectedHash = import.meta.env.VITE_MASTER_PIN_HASH;
        if (!expectedHash || !masterPin) {
            if (masterPin) Swal.fire({ ...swalDark, title: 'Acceso Denegado', text: 'PIN Maestro no configurado', icon: 'error' });
            return;
        }

        const encoder = new TextEncoder();
        const data = encoder.encode(masterPin);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (inputHash !== expectedHash) {
            Swal.fire({ ...swalDark, title: 'Acceso Denegado', text: 'PIN Maestro incorrecto', icon: 'error' });
            return;
        }

        const confirm = await Swal.fire({
            ...swalDark,
            title: '⚠️ Resetear PIN',
            html: `Confirmar reset para <b>${terminal.nombreNegocio}</b>. El nuevo PIN será: <code>123456</code>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
        });

        if (!confirm.isConfirmed) return;

        try {
            await updateDoc(doc(db, 'terminales', terminal.id), {
                request_pin_reset: true,
                _reset_requested_at: serverTimestamp()
            });
            Swal.fire({ ...swalDark, title: '✅ Solicitud Enviada', text: 'El comando será procesado por el terminal.', icon: 'success' });
        } catch (error) {
            Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo enviar la solicitud', icon: 'error' });
        }
    };

    const handleManualActivation = async (prefillId = '') => {
        const hasPrefill = !!prefillId;
        const { value: formValues } = await Swal.fire({
            title: '➕ ACTIVACIÓN MANUAL',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 8px; letter-spacing: 0.2em;">IDENTIFICADOR ÚNICO (HWID)</label>
                    <input id="swal-hwid" class="swal2-input" placeholder="ABC-123-XYZ..." value="${prefillId}" ${hasPrefill ? 'readonly' : ''} style="width: 100%; margin: 0; background: ${hasPrefill ? '#0a1628' : '#020617'}; border: 1px solid ${hasPrefill ? '#10b981' : '#1e293b'}; color: #10b981; font-family: monospace; border-radius: 12px; height: 50px; ${hasPrefill ? 'opacity: 0.8; cursor: not-allowed;' : ''}">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">NOMBRE DEL ESTABLECIMIENTO</label>
                    <input id="swal-name" class="swal2-input" placeholder="Ej: Supermercado El Éxito" style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #f8fafc; border-radius: 12px; height: 50px;">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">UBICACIÓN (GOOGLE MAPS)</label>
                    <input id="swal-location" class="swal2-input" placeholder="https://maps.app.goo.gl/..." style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #38bdf8; border-radius: 12px; height: 50px;">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">PLAN</label>
                    <select id="swal-plan" class="swal2-input" style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #f8fafc; border-radius: 12px; height: 50px;">
                        <option value="bodega" style="background: #0f172a; color: #f8fafc;">🏪 Bodega (1 caja)</option>
                        <option value="abasto" style="background: #0f172a; color: #f8fafc;">🏬 Abasto (2 cajas)</option>
                        <option value="minimarket" style="background: #0f172a; color: #f8fafc;">🏢 Minimarket (Ilimitado)</option>
                    </select>
                </div>
            `,
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1e293b',
            confirmButtonText: 'GENERAR LICENCIA',
            cancelButtonText: 'CANCELAR',
            customClass: {
                popup: 'glass-panel rounded-3xl border-slate-800',
                title: 'text-white font-black tracking-[0.2em] text-xl pt-8',
                confirmButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase',
                cancelButton: 'rounded-xl px-8 py-3 font-black text-[10px] tracking-widest uppercase'
            },
            preConfirm: () => {
                const hardwareId = document.getElementById('swal-hwid').value;
                const businessName = document.getElementById('swal-name').value || 'NUEVO CLIENTE';
                const locationUrl = document.getElementById('swal-location').value || '';
                const plan = document.getElementById('swal-plan').value || DEFAULT_PLAN;

                if (!hardwareId) {
                    Swal.showValidationMessage('El Hardware ID es obligatorio');
                    return false;
                }
                return { hardwareId, businessName, locationUrl, plan };
            }
        });

        if (!formValues) return;
        const { hardwareId, businessName, locationUrl, plan } = formValues;

        try {
            // 🛡️ Fénix v2: Generar Licencia Firmada
            let licenseJWT = null;
            try {
                const licensePayload = {
                    id: hardwareId,
                    plan: plan,
                    exp: 'NEVER',
                    iat: Math.floor(Date.now() / 1000)
                };
                licenseJWT = signLicense(licensePayload);
            } catch (sigError) {
                console.warn("⚠️ No se pudo firmar localmente (Falta Key).", sigError);
                Swal.fire({
                    ...swalDark,
                    title: 'Falta Private Key',
                    text: 'Agrega VITE_FENIX_PRIVATE_KEY al .env para generar licencias firmadas.',
                    icon: 'warning'
                });
                return;
            }

            // 1. Guardar en Firebase
            const docRef = doc(db, 'terminales', hardwareId);
            await setDoc(docRef, {
                id: hardwareId,
                nombreNegocio: businessName,
                locationUrl: locationUrl,
                plan: plan,
                isDemo: false,
                status: 'ACTIVE',
                version: 'v4.2-fenix-signed',
                _licenseToken: licenseJWT,
                _needsActivation: false,
                ventasHoyUSD: 0,
                conteoVentasHoy: 0,
                lastSeen: serverTimestamp(),
                _activatedAt: serverTimestamp()
            }, { merge: true });

            // 2. MOSTRAR LICENCIA AL ADMIN
            await Swal.fire({
                title: '🎉 LICENCIA GENERADA',
                html: `
                    <div class="text-left space-y-4">
                        <p class="text-sm text-slate-400">Entrega este código al cliente para activar su POS offline:</p>
                        <div class="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 break-all font-mono text-xs text-emerald-400 select-all cursor-pointer" onclick="navigator.clipboard.writeText(this.innerText)">
                            ${licenseJWT}
                        </div>
                        <p class="text-[10px] text-slate-500 text-center uppercase tracking-widest">Click para copiar</p>
                    </div>
                `,
                icon: 'success',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonText: 'LISTO',
                confirmButtonColor: '#10b981'
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                title: 'ERROR',
                text: 'Fallo en la activación remota: ' + error.message,
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc'
            });
        }
    };

    const handleDeleteTerminal = async (terminal) => {
        const firstConfirm = await Swal.fire({
            ...swalDark,
            title: '⚠️ ADVERTENCIA CRÍTICA',
            text: `¿Eliminar permanentemente ${terminal.nombreNegocio}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
        });

        if (!firstConfirm.isConfirmed) return;

        const { value: keyword } = await Swal.fire({
            ...swalDark,
            title: 'Confirmación Final',
            text: 'Escribe BORRAR para confirmar:',
            input: 'text',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            inputValidator: (v) => v !== 'BORRAR' && 'Debe escribir BORRAR'
        });

        if (keyword === 'BORRAR') {
            try {
                const q = query(collection(db, 'sugerencias'), where('hardwareId', '==', terminal.id));
                const snap = await getDocs(q);
                await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                await deleteDoc(doc(db, 'terminales', terminal.id));

                // 🟢 Borrar en Supabase (Cascade Trigger)
                if (supabase) {
                    const { error } = await supabase
                        .from('listo_clients')
                        .delete()
                        .eq('system_id', terminal.id);

                    if (error) console.error("⚠️ Error borrando en Supabase:", error);
                    else console.log("✅ Borrado en Supabase (Cascade Triggered)");
                }

                Swal.fire({ ...swalDark, title: 'Eliminado', text: 'Datos borrados permanentemente', icon: 'success' });
            } catch (error) {
                Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo completar la eliminación', icon: 'error' });
            }
        }
    };

    const handleChangePlan = async (terminal) => {
        const plans = getAllPlans();
        let optionsHtml = '';
        plans.forEach(p => {
            const currentPlan = terminal.plan || DEFAULT_PLAN;
            const isSelected = p.id === currentPlan ? 'selected' : '';
            const cajasText = p.maxCajas >= 99 ? 'Ilimitado' : `${p.maxCajas} caja${p.maxCajas > 1 ? 's' : ''}`;
            optionsHtml += `<option value="${p.id}" ${isSelected} style="background: #0f172a; color: #f8fafc;">${p.icon} ${p.label} (${cajasText})</option>`;
        });

        const { value: newPlan } = await Swal.fire({
            ...swalDark,
            title: '🔄 Cambiar Plan',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <p style="text-align: center; color: #94a3b8; font-size: 13px; margin-bottom: 20px;">Terminal: <b>${terminal.nombreNegocio}</b></p>
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 8px; letter-spacing: 0.2em;">SELECCIONA EL NUEVO PLAN</label>
                    <select id="swal-change-plan" class="swal2-input" style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #f8fafc; border-radius: 12px; height: 50px; outline: none;">
                        ${optionsHtml}
                    </select>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#06b6d4',
            confirmButtonText: 'APLICAR',
            cancelButtonText: 'CANCELAR',
            preConfirm: () => {
                return document.getElementById('swal-change-plan').value;
            }
        });

        if (!newPlan) return;

        try {
            await updateDoc(doc(db, 'terminales', terminal.id), {
                plan: newPlan,
                _planChangedAt: serverTimestamp()
            });

            const selectedPlan = plans.find(p => p.id === newPlan);
            Swal.fire({
                toast: true, position: 'top', icon: 'success',
                title: `Plan cambiado a ${selectedPlan?.label}`,
                timer: 2000, showConfirmButton: false,
                background: '#1e293b', color: '#fff'
            });
        } catch (error) {
            Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo cambiar el plan', icon: 'error' });
        }
    };

    const handleEditDemoQuota = async (terminal) => {
        if (!terminal.isDemo) return;
        const cL = terminal.quotaLimit || 0;
        const cU = terminal.usage_count || 0;
        const av = Math.max(0, cL - cU);
        // Base for additions: use max of limit or usage (handles cases where usage exceeded limit)
        const base = Math.max(cL, cU);
        const pct = cL > 0 ? Math.min(100, Math.round((cU / cL) * 100)) : (cU > 0 ? 100 : 0);
        const bc = pct > 85 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#10b981';

        const mkBtn = (val, r, g, b, label) => {
            const c = `${r},${g},${b}`;
            return `<button type="button" onclick="document.getElementById('swal-demo-quota').value=Number(document.getElementById('swal-demo-quota').value)+(${val});document.getElementById('swal-demo-quota').dispatchEvent(new Event('input'))" style="flex:1;padding:8px 2px;background:rgba(${c},0.1);border:1px solid rgba(${c},0.3);color:rgb(${c});border-radius:8px;font-weight:900;font-size:12px;cursor:pointer;transition:all 0.15s;" onmouseover="this.style.background='rgba(${c},0.25)'" onmouseout="this.style.background='rgba(${c},0.1)'">${label}</button>`;
        };

        const { value: newLimit } = await Swal.fire({
            ...swalDark,
            title: '🧪 Gestión Demo',
            width: 420,
            html: `
                <div style="padding:2px 0;">
                    <p style="text-align:center;color:#64748b;font-size:11px;margin-bottom:14px;letter-spacing:0.15em;font-weight:700;text-transform:uppercase;">${terminal.nombreNegocio}</p>

                    <div style="display:flex;align-items:center;gap:14px;background:rgba(2,6,23,0.7);border:1px solid #1e293b;border-radius:16px;padding:14px;margin-bottom:14px;">
                        <div style="position:relative;width:72px;height:72px;flex-shrink:0;">
                            <svg viewBox="0 0 36 36" style="width:72px;height:72px;transform:rotate(-90deg);"><circle cx="18" cy="18" r="15.5" fill="none" stroke="#1e293b" stroke-width="3"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="${bc}" stroke-width="3" stroke-dasharray="${pct} ${100 - pct}" stroke-linecap="round"/></svg>
                            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                                <span style="font-size:16px;font-weight:900;color:#f8fafc;line-height:1;">${pct}%</span>
                                <span style="font-size:8px;color:#64748b;font-weight:700;">USO</span>
                            </div>
                        </div>
                        <div style="flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:8px;text-align:center;">
                                <span style="display:block;font-size:8px;font-weight:900;color:#64748b;letter-spacing:0.15em;margin-bottom:2px;">VENDIDAS</span>
                                <span style="font-size:20px;font-weight:900;color:#f8fafc;">${cU}</span>
                            </div>
                            <div style="background:#0f172a;border:1px solid #334155;border-radius:10px;padding:8px;text-align:center;">
                                <span style="display:block;font-size:8px;font-weight:900;color:#64748b;letter-spacing:0.15em;margin-bottom:2px;">DISPONIBLES</span>
                                <span id="dq-avail" style="font-size:20px;font-weight:900;color:${av <= 5 ? '#ef4444' : av <= 15 ? '#f59e0b' : '#10b981'};">${av}</span>
                            </div>
                            <div style="grid-column:span 2;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:5px 8px;text-align:center;">
                                <span style="font-size:8px;font-weight:900;color:#64748b;letter-spacing:0.15em;">LÍMITE TOTAL: </span>
                                <span id="dq-total" style="font-size:14px;font-weight:900;color:#f59e0b;">${cL}</span>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom:10px;">
                        <span style="display:block;font-size:9px;font-weight:900;color:#64748b;letter-spacing:0.2em;margin-bottom:6px;">AJUSTE RÁPIDO</span>
                        <div style="display:flex;gap:5px;flex-wrap:wrap;">
                            ${mkBtn(-25, 239, 68, 68, '−25')}${mkBtn(-10, 239, 68, 68, '−10')}${mkBtn(10, 16, 185, 129, '+10')}${mkBtn(25, 16, 185, 129, '+25')}${mkBtn(50, 16, 185, 129, '+50')}${mkBtn(100, 16, 185, 129, '+100')}
                        </div>
                    </div>

                    <div style="background:rgba(2,6,23,0.5);border:1px solid #1e293b;border-radius:12px;padding:10px;">
                        <label style="display:block;font-size:9px;font-weight:900;color:#64748b;letter-spacing:0.2em;margin-bottom:5px;">AJUSTE MANUAL (+ añadir / − restar)</label>
                        <input id="swal-demo-quota" type="number" class="swal2-input" value="0"
                            oninput="(function(){var v=parseInt(document.getElementById('swal-demo-quota').value)||0;var nt=${base}+v;var na=Math.max(0,nt-${cU});document.getElementById('dq-total').textContent=nt;document.getElementById('dq-avail').textContent=na;document.getElementById('dq-avail').style.color=na<=5?'#ef4444':na<=15?'#f59e0b':'#10b981';})()"
                            style="width:100%;margin:0;background:#020617;border:1px solid #334155;color:#f59e0b;border-radius:10px;height:54px;text-align:center;font-size:28px;font-weight:900;outline:none;transition:border-color 0.2s;"
                            onfocus="this.style.borderColor='#f59e0b'" onblur="this.style.borderColor='#334155'">
                        <p style="text-align:center;color:#475569;font-size:10px;margin-top:5px;">Positivo = añadir • Negativo = restar</p>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
            confirmButtonText: '💾 GUARDAR',
            cancelButtonText: 'CANCELAR',
            preConfirm: () => {
                const adj = parseInt(document.getElementById('swal-demo-quota').value, 10);
                if (isNaN(adj) || adj === 0) { Swal.showValidationMessage('Ingresa un valor distinto a 0'); return false; }
                const nt = base + adj;
                if (nt < 0) { Swal.showValidationMessage('El límite no puede ser negativo'); return false; }
                return nt;
            }
        });

        if (newLimit === undefined) return;

        try {
            await updateDoc(doc(db, 'terminales', terminal.id), { quotaLimit: newLimit, _quotaChangedAt: serverTimestamp() });
            const na = Math.max(0, newLimit - cU);
            Swal.fire({ toast: true, position: 'top', icon: 'success', title: `Límite: ${newLimit} (${na} disponibles)`, timer: 2500, showConfirmButton: false, background: '#1e293b', color: '#fff' });
        } catch (error) {
            Swal.fire({ ...swalDark, title: 'Error', text: 'No se pudo actualizar', icon: 'error' });
        }
    };

    // ⚡ QUICK ACTIVATE: One-click activation from the alert banner
    const handleQuickActivate = async (terminal) => {
        const planId = terminal._requestedPlan || 'bodega';
        const planMap = {
            bodega: { icon: '🏪', name: 'Bodega', price: 50 },
            abasto: { icon: '🏬', name: 'Abasto', price: 100 },
            minimarket: { icon: '🏢', name: 'Minimarket', price: 200 }
        };
        const plan = planMap[planId] || planMap.bodega;

        const result = await Swal.fire({
            ...swalDark,
            title: '⚡ ACTIVAR TERMINAL',
            html: `
                <div style="text-align: center; padding: 10px 0;">
                    <p style="color: #94a3b8; font-size: 14px; margin-bottom: 16px;">
                        ¿Activar <b style="color: #f8fafc;">${terminal.nombreNegocio}</b> con licencia <b style="color: #10b981;">Full</b>?
                    </p>
                    <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 12px;">
                        <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 20px; text-align: center;">
                            <span style="display: block; font-size: 9px; font-weight: 900; color: #64748b; letter-spacing: 0.2em; margin-bottom: 4px;">PLAN SOLICITADO</span>
                            <span style="font-size: 16px; font-weight: 900; color: #f59e0b;">${plan.icon} ${plan.name}</span>
                        </div>
                        <div style="background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 12px 20px; text-align: center;">
                            <span style="display: block; font-size: 9px; font-weight: 900; color: #64748b; letter-spacing: 0.2em; margin-bottom: 4px;">PRECIO</span>
                            <span style="font-size: 16px; font-weight: 900; color: #10b981;">$${plan.price}</span>
                        </div>
                    </div>
                    <p style="color: #475569; font-size: 11px; font-family: monospace;">${terminal.id.substring(0, 24)}...</p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1e293b',
            confirmButtonText: `⚡ ACTIVAR — ${plan.name}`,
            cancelButtonText: 'CANCELAR'
        });

        if (!result.isConfirmed) return;

        try {
            // 🛡️ Sign License
            let licenseJWT = null;
            try {
                const licensePayload = {
                    id: terminal.id,
                    plan: planId,
                    exp: 'NEVER',
                    iat: Math.floor(Date.now() / 1000)
                };
                licenseJWT = signLicense(licensePayload);
            } catch (sigError) {
                console.warn("⚠️ No se pudo firmar (Falta Key).", sigError);
                Swal.fire({
                    ...swalDark,
                    title: 'Falta Private Key',
                    text: 'Agrega VITE_FENIX_PRIVATE_KEY al .env para generar licencias firmadas.',
                    icon: 'warning'
                });
                return;
            }

            // Update Firebase
            const docRef = doc(db, 'terminales', terminal.id);
            await setDoc(docRef, {
                plan: planId,
                isDemo: false,
                status: 'ACTIVE',
                _licenseToken: licenseJWT,
                _needsActivation: false,
                _requestedPlan: null,
                _activatedAt: serverTimestamp(),
                version: 'v4.2-fenix-signed'
            }, { merge: true });

            // Show license to admin
            await Swal.fire({
                title: '🎉 TERMINAL ACTIVADA',
                html: `
                    <div class="text-left space-y-4">
                        <p class="text-sm text-slate-400">Licencia generada para <b class="text-white">${terminal.nombreNegocio}</b>:</p>
                        <div class="bg-slate-950 p-4 rounded-xl border border-emerald-500/30 break-all font-mono text-xs text-emerald-400 select-all cursor-pointer" onclick="navigator.clipboard.writeText(this.innerText)">
                            ${licenseJWT}
                        </div>
                        <p class="text-[10px] text-slate-500 text-center uppercase tracking-widest">Click para copiar</p>
                    </div>
                `,
                icon: 'success',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonText: 'LISTO',
                confirmButtonColor: '#10b981'
            });

        } catch (error) {
            console.error(error);
            Swal.fire({
                ...swalDark,
                title: 'ERROR',
                text: 'Fallo en la activación: ' + error.message,
                icon: 'error'
            });
        }
    };

    return {
        terminales,
        loading,
        globalStats,
        unreadMap,
        actions: {
            handleToggleStatus,
            handleEditName,
            handleResetPIN,
            handleManualActivation,
            handleDeleteTerminal,
            handleChangePlan,
            handleEditDemoQuota,
            handleQuickActivate
        }
    };
};
