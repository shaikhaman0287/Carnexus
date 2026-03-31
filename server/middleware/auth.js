const { readDB, writeDB } = require('../dataStore');

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];

    // Look up token in persistent db.json sessions
    const db = readDB();
    const userSession = db.sessions && db.sessions[token];
    if (!userSession) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
    }
    req.user = userSession;
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    next();
}

// Helper: save a session token to db
function saveSession(token, userData) {
    const db = readDB();
    if (!db.sessions) db.sessions = {};
    db.sessions[token] = userData;
    writeDB(db);
}

// Helper: remove a session token from db
function destroySession(token) {
    const db = readDB();
    if (db.sessions) {
        delete db.sessions[token];
        writeDB(db);
    }
}

module.exports = { requireAuth, requireAdmin, saveSession, destroySession };
