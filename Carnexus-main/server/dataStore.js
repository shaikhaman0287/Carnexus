const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

// Initial Data Seed
const initialData = {
    cars: [
        { id: 1, name: "Maruti Suzuki Alto", brand: "Maruti Suzuki", price: "₹3.99 - 5.12 Lakh", status: "available", image: "../assets/images/maruti_generic.png", specs: { year: 2024, fuel: "Petrol", trans: "Manual", mileage: "22 kmpl" } },
        { id: 2, name: "Maruti Suzuki Alto K10", brand: "Maruti Suzuki", price: "₹3.99 - 5.96 Lakh", status: "available", image: "../assets/images/maruti_generic.png", specs: { year: 2024, fuel: "Petrol/CNG", trans: "Manual/AMT", mileage: "24.9 kmpl" } },
        { id: 9, name: "Tata Tiago", brand: "Tata Motors", price: "₹5.65 - 8.90 Lakh", status: "available", image: "../assets/images/car2.png", specs: { year: 2024, fuel: "Petrol/CNG", trans: "Manual/AMT", mileage: "19.0 kmpl" } },
        { id: 16, name: "Mahindra Thar", brand: "Mahindra", price: "₹11.25 - 17.60 Lakh", status: "available", image: "../assets/images/car3.png", specs: { year: 2024, fuel: "Pet/Dsl", trans: "Manual/Auto", mileage: "15.2 kmpl" } },
        { id: 21, name: "Hyundai Grand i10 Nios", brand: "Hyundai", price: "₹5.92 - 8.56 Lakh", status: "available", image: "../assets/images/car2.png", specs: { year: 2024, fuel: "Petrol/CNG", trans: "Manual/AMT", mileage: "20.1 kmpl" } },
        { id: 27, name: "Kia Sonet", brand: "Kia", price: "₹7.99 - 15.69 Lakh", status: "available", image: "../assets/images/car1.png", specs: { year: 2024, fuel: "Pet/Dsl", trans: "Man/iMT/AT/DCT", mileage: "18.4 kmpl" } }
    ],
    customers: [
        { id: 1, name: "John Doe", email: "john@example.com", phone: "+91 9876543210", bookings: 1 },
        { id: 2, name: "Jane Smith", email: "jane@example.com", phone: "+91 9988776655", bookings: 0 }
    ],
    users: [
        { id: 101, email: "admin@carnexus.com", password: "admin", role: "admin", name: "System Admin" },
        { id: 102, email: "user@example.com", password: "user", role: "user", name: "Test User" }
    ],
    bookings: [
        { id: 1001, carId: 1, carName: "Maruti Suzuki Alto", customerName: "John Doe", customerEmail: "john@example.com", customerPhone: "+91 9876543210", date: "2024-03-20", status: "pending", createdAt: "2024-03-19T10:00:00Z" }
    ],
    sessions: {} // token -> session info
};

const DEFAULT_USERS = initialData.users;

// Ensure db.json exists
if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
} else {
    // Auto-migrate: add missing keys to existing db.json
    try {
        const existing = JSON.parse(fs.readFileSync(dbPath));
        let changed = false;
        if (!existing.cars) { existing.cars = initialData.cars; changed = true; }
        if (!existing.customers) { existing.customers = initialData.customers; changed = true; }
        if (!existing.users) { existing.users = initialData.users; changed = true; }
        if (!existing.bookings) { existing.bookings = initialData.bookings; changed = true; }
        if (!existing.sessions) { existing.sessions = {}; changed = true; }
        if (changed) fs.writeFileSync(dbPath, JSON.stringify(existing, null, 2));
    } catch { /* ignore migration errors */ }
}

// In-memory cache for environments where file-writing is forbidden (e.g. Vercel serverless)
let memoryCache = null;

function readDB() {
    if (memoryCache) return memoryCache;
    try {
        if (!fs.existsSync(dbPath)) {
            memoryCache = JSON.parse(JSON.stringify(initialData));
            return memoryCache;
        }
        const raw = fs.readFileSync(dbPath);
        const db = JSON.parse(raw);
        if (!db.cars) db.cars = [];
        if (!db.customers) db.customers = [];
        if (!db.users) db.users = [];
        if (!db.bookings) db.bookings = [];
        if (!db.sessions) db.sessions = {};
        memoryCache = db;
        return db;
    } catch (err) {
        console.warn('Read error, using initial data:', err.message);
        memoryCache = JSON.parse(JSON.stringify(initialData));
        return memoryCache;
    }
}

function writeDB(data) {
    memoryCache = data;
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (err) {
        // Silently fallback to memory on Vercel/Read-only filesystems
        console.warn('Data not persisted to disk (Read-only environment):', err.message);
    }
}

module.exports = { readDB, writeDB, DEFAULT_USERS };
