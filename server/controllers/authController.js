const { readDB, DEFAULT_USERS } = require('../dataStore');
const crypto = require('crypto');
const { saveSession, destroySession } = require('../middleware/auth');

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
            u.email.trim().toLowerCase() === email &&
            u.password.trim() === password
        );

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
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
