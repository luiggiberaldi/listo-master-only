import { useEffect, useState } from 'react';
import { db } from '../firebase';
import { supabase } from '../supabase'; // 🟢 Supabase Client
import {
    collection, onSnapshot, doc, updateDoc, deleteDoc,
    query, where, getDocs, setDoc, getDoc, serverTimestamp
} from 'firebase/firestore';
import Swal from 'sweetalert2';

export const useTerminalData = () => {
    const [terminales, setTerminales] = useState([]);
    const [loading, setLoading] = useState(true);

    const [unreadMap, setUnreadMap] = useState({});

    // Listener en tiempo real (Terminales)
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'terminales'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTerminales(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Listener en tiempo real (Mensajes no leídos)
    // Listener en tiempo real (Mensajes no leídos) - ESTRATEGIA ROBUSTA (Client-Side Filter)
    useEffect(() => {
        // Escuchamos toda la colección para evitar errores de índices compuestos en Firebase
        const unsubscribe = onSnapshot(collection(db, 'sugerencias'), (snapshot) => {
            const counts = {};
            snapshot.docs.forEach(doc => {
                const data = doc.data();

                // Filtros Manuales (Igual que en FeedbackInbox)
                const isArchived = data.archivado === true;
                const isRead = data.leido === true;
                const hasId = !!data.hardwareId;

                if (!isArchived && !isRead && hasId) {
                    counts[data.hardwareId] = (counts[data.hardwareId] || 0) + 1;
                }
            });
            // console.log("🔥 Unread Counts Updated:", counts); 
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

    const handleToggleStatus = async (terminal) => {
        const newStatus = terminal.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED';
        const action = newStatus === 'SUSPENDED' ? 'SUSPENDER' : 'REACTIVAR';

        const result = await Swal.fire({
            title: `¿${action} Terminal?`,
            text: `${terminal.nombreNegocio} (${terminal.id})`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: newStatus === 'SUSPENDED' ? '#dc2626' : '#10b981',
            cancelButtonColor: '#64748b',
            confirmButtonText: `Sí, ${action.toLowerCase()}`,
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                await updateDoc(doc(db, 'terminales', terminal.id), { status: newStatus });
                Swal.fire({
                    title: 'Actualizado',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar el estado', 'error');
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
                Swal.fire({ title: 'Actualizado', icon: 'success', timer: 1500, showConfirmButton: false, background: '#0f172a', color: '#f8fafc' });
            } catch (error) {
                Swal.fire('Error', 'No se pudo actualizar', 'error');
            }
        }
    };

    const handleResetPIN = async (terminal) => {
        const { value: masterPin } = await Swal.fire({
            title: '🔐 Verificación de Seguridad',
            text: 'Ingresa el PIN Maestro para autorizar el reset:',
            input: 'password',
            showCancelButton: true,
            confirmButtonColor: '#f59e0b',
        });

        if (masterPin !== '794879') {
            if (masterPin) Swal.fire('Acceso Denegado', 'PIN Maestro incorrecto', 'error');
            return;
        }

        const confirm = await Swal.fire({
            title: '⚠️ Resetear PIN de Administrador',
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
            Swal.fire('✅ Solicitud Enviada', 'El comando será procesado por el terminal.', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo enviar la solicitud', 'error');
        }
    };

    const handleManualActivation = async () => {
        const { value: formValues } = await Swal.fire({
            title: '➕ ACTIVACIÓN MANUAL',
            html: `
                <div style="text-align: left; padding: 10px 0;">
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin-bottom: 8px; letter-spacing: 0.2em;">IDENTIFICADOR ÚNICO (HWID)</label>
                    <input id="swal-hwid" class="swal2-input" placeholder="ABC-123-XYZ..." style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #10b981; font-family: monospace; border-radius: 12px; height: 50px;">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">NOMBRE DEL ESTABLECIMIENTO</label>
                    <input id="swal-name" class="swal2-input" placeholder="Ej: Supermercado El Éxito" style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #f8fafc; border-radius: 12px; height: 50px;">
                    
                    <label style="display: block; font-size: 10px; font-weight: 900; color: #64748b; margin: 20px 0 8px 0; letter-spacing: 0.2em;">UBICACIÓN (GOOGLE MAPS)</label>
                    <input id="swal-location" class="swal2-input" placeholder="https://maps.app.goo.gl/..." style="width: 100%; margin: 0; background: #020617; border: 1px solid #1e293b; color: #38bdf8; border-radius: 12px; height: 50px;">
                </div>
            `,
            background: '#0f172a',
            color: '#f8fafc',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#1e293b',
            confirmButtonText: 'ACTIVAR AHORA',
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

                if (!hardwareId) {
                    Swal.showValidationMessage('El Hardware ID es obligatorio');
                    return false;
                }
                return { hardwareId, businessName, locationUrl };
            }
        });

        if (!formValues) return;
        const { hardwareId, businessName, locationUrl } = formValues;

        try {
            const docRef = doc(db, 'terminales', hardwareId);
            await setDoc(docRef, {
                id: hardwareId,
                nombreNegocio: businessName,
                locationUrl: locationUrl, // Nuevo Campo
                status: 'ACTIVE',
                version: 'v4.1-manual',
                ventasHoyUSD: 0,
                conteoVentasHoy: 0,
                lastSeen: serverTimestamp(),
                _activatedAt: serverTimestamp()
            }, { merge: true });

            Swal.fire({
                title: '✅ VÍNCULO EXITOSO',
                text: `${businessName} ha sido vinculado al sistema.`,
                icon: 'success',
                background: '#0f172a',
                color: '#f8fafc',
                confirmButtonColor: '#10b981'
            });
        } catch (error) {
            Swal.fire({
                title: 'ERROR',
                text: 'Fallo en la activación remota',
                icon: 'error',
                background: '#0f172a',
                color: '#f8fafc'
            });
        }
    };

    const handleDeleteTerminal = async (terminal) => {
        const firstConfirm = await Swal.fire({
            title: '⚠️ ADVERTENCIA CRÍTICA',
            text: `¿Eliminar permanentemente ${terminal.nombreNegocio}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
        });

        if (!firstConfirm.isConfirmed) return;

        const { value: keyword } = await Swal.fire({
            title: 'Confirmación Final',
            text: 'Escribe BORRAR para confirmar:',
            input: 'text',
            showCancelButton: true,
            confirmButtonColor: '#dc2626',
            inputValidator: (v) => v !== 'BORRAR' && 'Debe escribir BORRAR'
        });

        if (keyword === 'BORRAR') {
            try {
                // Limpiar sugerencias
                const q = query(collection(db, 'sugerencias'), where('hardwareId', '==', terminal.id));
                const snap = await getDocs(q);
                await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
                // Borrar terminal en Firebase
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

                Swal.fire('Eliminado', 'Datos borrados permanentemente', 'success');
            } catch (error) {
                Swal.fire('Error', 'No se pudo completar la eliminación', 'error');
            }
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
            handleDeleteTerminal
        }
    };
};
