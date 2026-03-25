const express = require('express');
const router = express.Router();

// Simulated bus locations (in a real app, drivers send live GPS)
let busLocations = {
  'BUS-01': { lat: 12.9716, lng: 80.2209, route: 'Campus Loop A', nextStop: 'Main Gate', eta: '3 min' },
  'BUS-02': { lat: 12.9720, lng: 80.2220, route: 'Campus Loop B', nextStop: 'Library', eta: '7 min' },
  'BUS-03': { lat: 12.9710, lng: 80.2200, route: 'Off-Campus Express', nextStop: 'Bus Stand', eta: '12 min' }
};

// Simulate bus movement every 10 seconds
setInterval(() => {
  Object.keys(busLocations).forEach(busId => {
    busLocations[busId].lat += (Math.random() - 0.5) * 0.001;
    busLocations[busId].lng += (Math.random() - 0.5) * 0.001;
    // Decrease ETA
    const etaMin = parseInt(busLocations[busId].eta);
    busLocations[busId].eta = Math.max(1, etaMin - 1) + ' min';
  });
}, 10000);

// GET /api/bus/location — all buses
router.get('/location', (req, res) => {
  res.json({ success: true, buses: busLocations, timestamp: new Date() });
});

// GET /api/bus/location/:busId — specific bus
router.get('/location/:busId', (req, res) => {
  const bus = busLocations[req.params.busId];
  if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });
  res.json({ success: true, bus, timestamp: new Date() });
});

// POST /api/bus/update — driver sends location (real use)
router.post('/update', (req, res) => {
  const { busId, lat, lng, nextStop, eta } = req.body;
  if (!busId) return res.status(400).json({ success: false, message: 'busId required' });
  busLocations[busId] = { lat, lng, nextStop, eta };
  res.json({ success: true, message: 'Location updated' });
});

module.exports = router;
