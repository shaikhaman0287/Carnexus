const { readDB, writeDB } = require('../dataStore');

exports.getCars = (req, res) => {
    try {
        const db = readDB();
        res.json(db.cars);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve cars' });
    }
};

exports.getCar = (req, res) => {
    try {
        const db = readDB();
        const { id } = req.params;
        const car = db.cars.find(c => c.id == id);
        if (!car) return res.status(404).json({ error: 'Car not found' });
        res.json(car);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve car details' });
    }
};

exports.addCar = (req, res) => {
    try {
        const db = readDB();
        const newCar = { ...req.body, id: Date.now() };
        db.cars.push(newCar);
        writeDB(db);
        res.status(201).json(newCar);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add car' });
    }
};

exports.updateCarStatus = (req, res) => {
    try {
        const db = readDB();
        const { id } = req.params;
        const { status } = req.body;
        
        const carIndex = db.cars.findIndex(c => c.id == id);
        if (carIndex === -1) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        db.cars[carIndex].status = status;
        writeDB(db);
        res.json(db.cars[carIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update car status' });
    }
};

exports.deleteCar = (req, res) => {
    try {
        const db = readDB();
        const { id } = req.params;
        
        const filteredCars = db.cars.filter(c => c.id != id);
        if (filteredCars.length === db.cars.length) {
            return res.status(404).json({ error: 'Car not found' });
        }
        
        db.cars = filteredCars;
        writeDB(db);
        res.json({ message: 'Car deleted securely' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete car' });
    }
};
