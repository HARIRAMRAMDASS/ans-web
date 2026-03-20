const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Global state
let robotCommand = {
  move: false,
  path: []
};

let robotLocation = {
  lat: 0,
  lng: 0
};

let robotStatus = "Idle";

// POST /start-navigation
app.post('/start-navigation', async (req, res) => {
  const { start, destination } = req.body;
  
  if (!start || !destination) {
    return res.status(400).json({ error: "Start and destination required" });
  }

  try {
    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    const response = await axios.get(osrmUrl);
    
    if (response.data.routes && response.data.routes.length > 0) {
      const coordinates = response.data.routes[0].geometry.coordinates;
      const path = coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));
      
      robotCommand.move = true;
      robotCommand.path = path;
      robotStatus = 'Moving';
      
      console.log(`[Backend] Navigation started from ${start.lat},${start.lng} to ${destination.lat},${destination.lng}`);
      res.json({ message: 'Navigation started', move: robotCommand.move, path: robotCommand.path });
    } else {
      res.status(400).json({ error: "No route found" });
    }
  } catch (error) {
    console.error("OSRM Error:", error.message);
    res.status(500).json({ error: "Failed to fetch route" });
  }
});

// GET /robot-command
app.get('/robot-command', (req, res) => {
  res.json({
    move: robotCommand.move,
    path: robotCommand.path
  });
});

// POST /robot-location
app.post('/robot-location', (req, res) => {
  const { lat, lng } = req.body;
  if (lat !== undefined && lng !== undefined) {
    robotLocation = { lat, lng };
  }
  console.log(`[Backend] Robot location updated:`, robotLocation);
  res.json({ message: 'Location updated', location: robotLocation });
});

// GET /robot-location
app.get('/robot-location', (req, res) => {
  res.json(robotLocation);
});

// GET /robot-status
app.get('/robot-status', (req, res) => {
  res.json({ status: robotStatus });
});

// POST /robot-status
app.post('/robot-status', (req, res) => {
  const { status, move } = req.body;
  if (status !== undefined) robotStatus = status;
  if (move !== undefined) robotCommand.move = move;
  console.log(`[Backend] Status updated: ${robotStatus}, move: ${robotCommand.move}`);
  res.json({ message: 'Status updated', status: robotStatus });
});

// Reset functionality for frontend
app.post('/reset', (req, res) => {
  robotCommand = {
    move: false,
    path: []
  };
  robotStatus = 'Idle';
  console.log('[Backend] System reset');
  res.json({ message: 'Reset successfully' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
