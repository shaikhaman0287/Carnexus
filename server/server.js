require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Auth middleware to inject session info
const { requireAuth, requireAdmin } = require('./middleware/auth');

// API routing modular hooks
app.use('/api/auth',      require('./routes/authRoutes'));
app.use('/api/cars',      require('./routes/carRoutes'));
app.use('/api/customers', requireAuth, requireAdmin, require('./routes/customerRoutes'));
app.use('/api/bookings',  require('./routes/bookingRoutes'));

// Error handler middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Serve frontend static assets
const clientRoot = path.join(__dirname, '../client/src');
const pagesRoot = path.join(clientRoot, 'pages');

app.use(express.static(clientRoot));

// Keep local routes consistent with Vercel rewrites:
//   /                -> /client/src/pages/index.html
//   /something.html  -> /client/src/pages/something.html
app.get('/', (req, res) => {
    res.sendFile(path.join(pagesRoot, 'index.html'));
});

app.get('/:page([a-zA-Z0-9-]+\.html)', (req, res, next) => {
    const filePath = path.join(pagesRoot, req.params.page);
    res.sendFile(filePath, (err) => {
        if (err) next();
    });
});

// Fallback for static asset deep-links
app.get('*', (req, res) => {
    res.sendFile(path.join(pagesRoot, 'index.html'));
});


if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server executing gracefully on port ${PORT}`);
    });
}

module.exports = app;
