import Dexie from 'dexie';

// ─── LOCAL GHOST ARCHIVE DB ───
// Firebase acts as a temporary mailbox (24h).
// This IndexedDB stores all ghost data permanently on-device.
const ghostDb = new Dexie('ListoMasterGhostArchive');

ghostDb.version(1).stores({
    // Ghost Auditor daily reports (AI digests)
    ghost_reports: 'id, date, systemId, generatedAt',
    // Ghost compact sessions (conversation logs)
    ghost_sessions: 'id, systemId, lastUpdate'
});

export default ghostDb;
