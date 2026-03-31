const { readDB } = require('../dataStore');
const crypto = require('crypto');
const { saveSession, destroySession } = require('../middleware/auth');

exports.login = (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const db = readDB();
        const user = db.users.find(u => u.email === email && u.password === password);

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
