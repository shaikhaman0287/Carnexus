const { readDB } = require('../dataStore');

exports.getCustomers = (req, res) => {
    try {
        const db = readDB();
        res.json(db.customers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve customers' });
    }
};
