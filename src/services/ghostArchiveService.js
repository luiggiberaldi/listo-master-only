import { db as fireDb } from '../firebase';
import { collection, getDocs, query, orderBy, limit, doc, deleteDoc } from 'firebase/firestore';
import ghostDb from './localGhostDb';

// ─── GHOST ARCHIVE SERVICE ───
// Syncs Firebase → local IndexedDB → auto-purges Firebase after archiving.
// Firebase = temporary mailbox. IndexedDB = permanent archive.

/**
 * Sync ghost_daily_reports: download from Firebase, save locally, purge Firebase.
 * Returns the merged list (local + any new from Firebase).
 */
export async function syncGhostReports() {
    // 1. Fetch from Firebase
    let firebaseDocs = [];
    try {
        const ref = collection(fireDb, 'ghost_daily_reports');
        const q = query(ref, orderBy('generatedAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        firebaseDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.warn('👻 [Archive] Firebase fetch failed:', e.message);
    }

    // 2. Archive new docs to local IndexedDB
    if (firebaseDocs.length > 0) {
        await ghostDb.ghost_reports.bulkPut(firebaseDocs);
        console.log(`👻 [Archive] Archived ${firebaseDocs.length} reports locally`);

        // 3. Delete archived docs from Firebase (they're safe locally now)
        for (const d of firebaseDocs) {
            try {
                await deleteDoc(doc(fireDb, 'ghost_daily_reports', d.id));
            } catch (e) {
                console.warn(`👻 [Archive] Firebase delete failed for ${d.id}:`, e.message);
            }
        }
        console.log(`👻 [Archive] Purged ${firebaseDocs.length} reports from Firebase`);
    }

    // 4. Return ALL from local (the single source of truth)
    const allLocal = await ghostDb.ghost_reports
        .orderBy('generatedAt')
        .reverse()
        .toArray();
    return allLocal;
}

/**
 * Sync ghost_compact_sessions: download from Firebase, save locally, purge Firebase.
 */
export async function syncGhostSessions() {
    // 1. Fetch from Firebase
    let firebaseDocs = [];
    try {
        const ref = collection(fireDb, 'ghost_compact_sessions');
        const q = query(ref, orderBy('lastUpdate', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        firebaseDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
        console.warn('👻 [Archive] Firebase sessions fetch failed:', e.message);
    }

    // 2. Archive to local
    if (firebaseDocs.length > 0) {
        await ghostDb.ghost_sessions.bulkPut(firebaseDocs);
        console.log(`👻 [Archive] Archived ${firebaseDocs.length} sessions locally`);

        // 3. Purge from Firebase
        for (const d of firebaseDocs) {
            try {
                await deleteDoc(doc(fireDb, 'ghost_compact_sessions', d.id));
            } catch (e) {
                console.warn(`👻 [Archive] Firebase session delete failed for ${d.id}:`, e.message);
            }
        }
        console.log(`👻 [Archive] Purged ${firebaseDocs.length} sessions from Firebase`);
    }

    // 4. Return all from local
    const allLocal = await ghostDb.ghost_sessions
        .orderBy('lastUpdate')
        .reverse()
        .toArray();
    return allLocal;
}

/**
 * Delete a single report from local archive.
 */
export async function deleteLocalReport(id) {
    await ghostDb.ghost_reports.delete(id);
}

/**
 * Delete ALL reports from local archive.
 */
export async function deleteAllLocalReports() {
    await ghostDb.ghost_reports.clear();
}

/**
 * Delete a single session from local archive.
 */
export async function deleteLocalSession(id) {
    await ghostDb.ghost_sessions.delete(id);
}

/**
 * Delete ALL sessions from local archive.
 */
export async function deleteAllLocalSessions() {
    await ghostDb.ghost_sessions.clear();
}
