const { readDB, writeDB } = require('../dataStore');

// GET all bookings (admin sees all, user sees only their own)
exports.getBookings = (req, res) => {
    try {
        const db = readDB();
        if (req.user.role === 'admin') {
            return res.json(db.bookings);
        }
        // Users see only their own bookings
        const mine = db.bookings.filter(b => b.customerEmail === req.user.email);
        res.json(mine);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve bookings' });
    }
};

// POST create a new booking
exports.createBooking = (req, res) => {
    try {
        const db = readDB();
        const { carId, customerName, customerPhone, date } = req.body;

        if (!carId || !date) {
            return res.status(400).json({ error: 'carId and date are required' });
        }

        // Find the car
        const car = db.cars.find(c => c.id == carId);
        if (!car) {
            return res.status(404).json({ error: 'Car not found' });
        }
        if (car.status === 'sold') {
            return res.status(400).json({ error: 'This vehicle is already sold and cannot be booked' });
        }

        const newBooking = {
            id: Date.now(),
            carId: car.id,
            carName: car.name,
            carImage: car.image,
            customerName: customerName || req.user.name,
            customerEmail: req.user.email,
            customerPhone: customerPhone || '',
            date,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        db.bookings.push(newBooking);
        writeDB(db);
        res.status(201).json(newBooking);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create booking', details: error.message });
    }
};

// PUT update booking status (admin: approve/cancel, user: cancel own)
exports.updateBookingStatus = (req, res) => {
    try {
        const db = readDB();
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['pending', 'confirmed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status. Use: pending, confirmed, cancelled' });
        }

        const idx = db.bookings.findIndex(b => b.id == id);
        if (idx === -1) {
            return res.status(404).json({ error: 'Booking not found' });
        }

        // Users can only cancel their own bookings
        if (req.user.role !== 'admin') {
            if (db.bookings[idx].customerEmail !== req.user.email) {
                return res.status(403).json({ error: 'You can only modify your own bookings' });
            }
            if (status !== 'cancelled') {
                return res.status(403).json({ error: 'Users can only cancel bookings' });
            }
        }

        db.bookings[idx].status = status;
        db.bookings[idx].updatedAt = new Date().toISOString();

        // If confirmed, mark car as sold
        if (status === 'confirmed') {
            const carIdx = db.cars.findIndex(c => c.id == db.bookings[idx].carId);
            if (carIdx !== -1) db.cars[carIdx].status = 'sold';
        }

        writeDB(db);
        res.json(db.bookings[idx]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update booking status' });
    }
};

// DELETE booking (admin only)
exports.deleteBooking = (req, res) => {
    try {
        const db = readDB();
        const { id } = req.params;
        const filtered = db.bookings.filter(b => b.id != id);
        if (filtered.length === db.bookings.length) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        db.bookings = filtered;
        writeDB(db);
        res.json({ message: 'Booking deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete booking' });
    }
};
