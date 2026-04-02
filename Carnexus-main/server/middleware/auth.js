const { readDB, writeDB } = require('../dataStore');

const crypto = require('crypto');
const secret = process.env.SESSION_SECRET || 'carnexus_secret_88';

function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split(' ')[1];
    const parts = token.split('.');

    if (parts.length !== 3) {
        return res.status(403).json({ error: 'Invalid token format. Please log in again.' });
    }

    const [header, payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');

    if (signature !== expectedSig) {
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token. Please log in again.' });
    }

    try {
        const decodedPayload = JSON.parse(Buffer.from(payload, 'base64url').toString());
        req.user = decodedPayload;
        next();
    } catch {
        return res.status(403).json({ error: 'Forbidden: Corrupt token payload.' });
    }
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
