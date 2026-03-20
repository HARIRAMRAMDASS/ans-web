// --- Configuration ---
// Chennai Coordinates as default center
const CHENNAI_COORDS = [13.0827, 80.2707];
const RPI_SERVER_URL = "http://raspberrypi.local:5000";

// --- State Variables ---
let map;
let startMarker = null;
let destMarker = null;
let routeLine = null;
let robotMarker = null;

let startCoords = null;
let destCoords = null;

let isNavigating = false;
let pollingInterval = null;

// --- DOM Elements ---
const startCoordsUI = document.getElementById('start-coords');
const destCoordsUI = document.getElementById('dest-coords');
const btnClearStart = document.getElementById('clear-start');
const btnClearDest = document.getElementById('clear-dest');
const btnStartNav = document.getElementById('start-nav-btn');

const connStatusUI = document.getElementById('conn-status');
const robotStatusUI = document.getElementById('robot-status');
const navStatusUI = document.getElementById('nav-status');
const currentCoordsUI = document.getElementById('current-coords');

// --- Map Initialization ---
function initMap() {
    // Initialize map centered at Chennai
    map = L.map('map', {
        zoomControl: false // Add zoom manually below to adjust position
    }).setView(CHENNAI_COORDS, 13);

    // Zoom control on bottom right avoids overlapping main panels
    L.control.zoom({
        position: 'bottomright'
    }).addTo(map);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);

    // Register click block
    map.on('click', onMapClick);
}

// Custom Leaflet Icons using divIcon
const createIcon = (color) => {
    return L.divIcon({
        className: 'custom-map-icon',
        html: `<div style="background-color:${color}; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    });
};

const iconStart = createIcon('#10b981'); // Green
const iconDest = createIcon('#ef4444');  // Red
const iconRobot = L.divIcon({
    className: 'robot-map-icon',
    html: `<div style="background-color:#3b82f6; width: 18px; height: 18px; border-radius: 3px; border: 3px solid white; box-shadow: 0 0 12px rgba(59, 130, 246, 0.9);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});

// --- Map Click Handlers ---
function onMapClick(e) {
    const { lat, lng } = e.latlng;

    if (!startCoords) {
        setStartLocation(lat, lng);
    } else if (!destCoords) {
        setDestLocation(lat, lng);
        drawRoute();
    } else {
        // If both already set, clear and start over
        clearMapSelection();
        setStartLocation(lat, lng);
    }
    
    updateNavButtonState();
}

function setStartLocation(lat, lng) {
    startCoords = { lat, lng };
    startCoordsUI.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    if (startMarker) map.removeLayer(startMarker);
    startMarker = L.marker([lat, lng], { icon: iconStart, title: "Start" }).addTo(map)
        .bindTooltip("Start", { permanent: true, direction: 'top', offset: [0, -12] });
    
    btnClearStart.disabled = false;
}

function setDestLocation(lat, lng) {
    destCoords = { lat, lng };
    destCoordsUI.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    if (destMarker) map.removeLayer(destMarker);
    destMarker = L.marker([lat, lng], { icon: iconDest, title: "Destination" }).addTo(map)
        .bindTooltip("Destination", { permanent: true, direction: 'top', offset: [0, -12] });
    
    btnClearDest.disabled = false;
}

function drawRoute() {
    if (routeLine) map.removeLayer(routeLine);
    if (startCoords && destCoords) {
        routeLine = L.polyline([
            [startCoords.lat, startCoords.lng],
            [destCoords.lat, destCoords.lng]
        ], { color: '#3b82f6', weight: 4, dashArray: '10, 10' }).addTo(map);
        
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
}

function clearStart() {
    startCoords = null;
    startCoordsUI.textContent = "Not selected";
    if (startMarker) {
        map.removeLayer(startMarker);
        startMarker = null;
    }
    btnClearStart.disabled = true;
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    updateNavButtonState();
}

function clearDest() {
    destCoords = null;
    destCoordsUI.textContent = "Not selected";
    if (destMarker) {
        map.removeLayer(destMarker);
        destMarker = null;
    }
    btnClearDest.disabled = true;
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }
    updateNavButtonState();
}

function clearMapSelection() {
    clearStart();
    clearDest();
}

function updateNavButtonState() {
    btnStartNav.disabled = !(startCoords && destCoords);
}

// --- API Methods ---

async function startNavigation() {
    if (!startCoords || !destCoords) return;

    btnStartNav.disabled = true;
    btnStartNav.textContent = "Sending Data...";

    const payload = {
        start: startCoords,
        end: destCoords
    };

    try {
        const response = await fetch(`${RPI_SERVER_URL}/navigate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            navStatusUI.textContent = "In Progress";
            navStatusUI.className = "status-value active";
            btnStartNav.textContent = "Navigation Active";
            isNavigating = true;
            
            // Start polling if it wasn't already active
            startRobotPolling();
        } else {
            throw new Error(`Server returned ${response.status}`);
        }
    } catch (error) {
        console.error("Navigation Error:", error);
        alert("Failed to communicate with Raspberry Pi server at " + RPI_SERVER_URL + ". Ensure it is online and CORS is configured.");
        btnStartNav.textContent = "Start Navigation";
        btnStartNav.disabled = false;
        setConnectionStatus(false);
    }
}

function setConnectionStatus(isConnected) {
    if (isConnected) {
        connStatusUI.textContent = "Connected";
        connStatusUI.className = "status-value connected";
    } else {
        connStatusUI.textContent = "Disconnected";
        connStatusUI.className = "status-value disconnected";
        robotStatusUI.textContent = "Unknown";
    }
}

async function fetchRobotPosition() {
    try {
        const response = await fetch(`${RPI_SERVER_URL}/robot_position`);
        if (!response.ok) throw new Error("Network error");
        
        const data = await response.json();
        setConnectionStatus(true);
        
        // Update marker based on response data (expecting lat, lng in response)
        if (data.lat !== undefined && data.lng !== undefined) {
            updateRobotPosition(data.lat, data.lng);
        }
        
        // Example check if status string is returned
        if (data.status) {
            robotStatusUI.textContent = data.status;
        }
        
    } catch (error) {
        // Suppressing errors in console to avoid spam when offline, but update UI
        setConnectionStatus(false);
    }
}

function updateRobotPosition(lat, lng) {
    currentCoordsUI.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    
    if (!robotMarker) {
        robotMarker = L.marker([lat, lng], { icon: iconRobot, title: "Robot" }).addTo(map)
            .bindTooltip("Robot", { direction: 'right' });
    } else {
        robotMarker.setLatLng([lat, lng]);
    }
}

function startRobotPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    fetchRobotPosition(); // fetch immediately
    pollingInterval = setInterval(fetchRobotPosition, 2000); // 2 second polling interval
}

// --- Bootstrapping ---
document.addEventListener('DOMContentLoaded', () => {
    initMap();

    btnClearStart.addEventListener('click', clearStart);
    btnClearDest.addEventListener('click', clearDest);
    btnStartNav.addEventListener('click', startNavigation);

    // Initial attempt to poll position
    startRobotPolling();
});
