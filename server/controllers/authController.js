const { readDB, DEFAULT_USERS } = require('../dataStore');
const crypto = require('crypto');
const { saveSession, destroySession } = require('../middleware/auth');
const { writeDB } = require('../dataStore');

const PASSWORD_HASH_PREFIX = 'scrypt$';

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${PASSWORD_HASH_PREFIX}${salt}$${derivedKey}`;
}

function verifyPassword(password, storedPassword) {
    if (typeof storedPassword !== 'string') return false;
    if (!storedPassword.startsWith(PASSWORD_HASH_PREFIX)) {
        return storedPassword.trim() === password;
    }

    const [, salt, storedHash] = storedPassword.split('$');
    if (!salt || !storedHash) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(derivedKey, 'hex'));
    } catch {
        return false;
    }
}

exports.login = (req, res) => {
    try {
        const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
        const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
        const email = rawEmail.trim().toLowerCase();
        const password = rawPassword.trim();

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = readDB();
        const users = Array.isArray(db.users) && db.users.length ? db.users : DEFAULT_USERS;
        const user = users.find(u =>
            typeof u.email === 'string' &&
            typeof u.password === 'string' &&
            u.email.trim().toLowerCase() === email
        );

        if (!user || !verifyPassword(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // One-time migration for legacy plaintext passwords
        if (typeof user.password === 'string' && !user.password.startsWith(PASSWORD_HASH_PREFIX)) {
            const dbUser = (db.users || []).find(u => u.id === user.id);
            if (dbUser) {
                dbUser.password = hashPassword(password);
                writeDB(db);
            }
        }

        // Generate a secure random token
        const token = crypto.randomBytes(32).toString('hex');
        const sessionData = { id: user.id, role: user.role, name: user.name, email: user.email };

        // Save to db.json so it survives server restarts
        saveSession(token, sessionData);

        res.json({
            token,
            user: sessionData
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed', details: error.message });
    }
};

exports.register = (req, res) => {
    try {
        const rawName = typeof req.body?.name === 'string' ? req.body.name : '';
        const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';
        const rawPassword = typeof req.body?.password === 'string' ? req.body.password : '';
        const name = rawName.trim();
        const email = rawEmail.trim().toLowerCase();
        const password = rawPassword.trim();

        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email and password are required' });
        }

        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long' });
        }

        const db = readDB();
        db.users = Array.isArray(db.users) ? db.users : [];
        const exists = db.users.some(u => typeof u.email === 'string' && u.email.trim().toLowerCase() === email);
        if (exists) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const nextId = db.users.reduce((maxId, u) => Math.max(maxId, Number(u.id) || 0), 100) + 1;
        const newUser = {
            id: nextId,
            name,
            email,
            role: 'user',
            password: hashPassword(password)
        };

        db.users.push(newUser);
        writeDB(db);

        return res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed', details: error.message });
    }
};

exports.logout = (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            destroySession(token);
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed', details: error.message });
    }
};
