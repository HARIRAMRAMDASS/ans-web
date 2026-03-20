import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bot, Navigation, Activity, XCircle, RotateCcw, Play } from 'lucide-react';
import MapComponent from './MapComponent';
import './index.css';

const SERVER_URL = "http://localhost:5000";

function App() {
  const [startNode, setStartNode] = useState(null);
  const [destNode, setDestNode] = useState(null);
  const [path, setPath] = useState([]);
  
  const [robotState, setRobotState] = useState({
    move: false,
    currentLocation: { lat: 0, lng: 0 },
    status: 'Idle'
  });

  // GeoLocation auto-detect (Continuous Watch like Google Maps)
  useEffect(() => {
    let watchId;
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          setStartNode({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.error("Error getting location. On desktop, IP locations can be unreliable.", error);
          if (!startNode) {
            // Fallback location for demo purposes if permission denied immediately
            setStartNode({ lat: 9.92520, lng: 78.11980, accuracy: 1000 });
          }
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
      );
    } else {
      setStartNode({ lat: 9.92520, lng: 78.11980, accuracy: 1000 });
    }

    return () => {
      if (watchId && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Poll Backend for Status and Location
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [cmdRes, locRes, statusRes] = await Promise.all([
          axios.get(`${SERVER_URL}/robot-command`),
          axios.get(`${SERVER_URL}/robot-location`),
          axios.get(`${SERVER_URL}/robot-status`)
        ]);

        setRobotState({
          move: cmdRes.data.move,
          currentLocation: locRes.data,
          status: statusRes.data.status
        });
        
        // Let the path be strictly controlled by the local UI (START ROBOT / RESET buttons)
        // This prevents the path from "automatically appearing" if the backend had a leftover state
        if (cmdRes.data.path && cmdRes.data.path.length === 0) {
           setPath([]);
        }

      } catch (err) {
        // Silently handle errors to not spam console if server restarts
      }
    }, 2000); // 2 second poll

    return () => clearInterval(interval);
  }, []);

  const handleStartRobot = async () => {
    if (!startNode || !destNode) {
      alert("Please select a valid destination and ensure start location is detected.");
      return;
    }
    
    try {
      const res = await axios.post(`${SERVER_URL}/start-navigation`, {
        start: startNode,
        destination: destNode
      });
      setPath(res.data.path);
    } catch(err) {
      console.error("Failed to start navigation:", err);
      alert("Failed to connect to backend server or compute route.");
    }
  };

  const handleReset = async () => {
    setDestNode(null);
    setPath([]);
    
    try {
      await axios.post(`${SERVER_URL}/reset`);
      // re-fetch location if we want to snap back to start node
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          setStartNode({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        });
      }
    } catch(err) {
      console.error("Failed to reset backend:", err);
    }
  };

  return (
    <div className="app-container">
      <header>
        <h1 className="logo"><Bot size={32} /> Advanced Navigation System Bot</h1>
        <div><Activity color={robotState.status === 'Moving' ? '#10b981' : '#94a3b8'} /></div>
      </header>

      <main className="main-content">
        <aside className="dashboard">
          
          <div className="glass-panel">
            <h2 className="panel-title"><Navigation size={20} /> Navigation Setup</h2>
            <div className="controls">
              <div>
                <div className="status-label" style={{marginBottom:'0.5rem', color: '#22c55e'}}>Current Location (Auto)</div>
                <div className="coord-box" style={{fontSize: '0.85rem'}}>
                  {startNode ? `Lat: ${startNode.lat.toFixed(5)}, Lng: ${startNode.lng.toFixed(5)}` : 'Detecting...'}
                </div>
              </div>
              
              <div>
                <div className="status-label" style={{marginBottom:'0.5rem', color: '#ef4444'}}>Destination</div>
                <div className="coord-box" style={{fontSize: '0.85rem'}}>
                  {destNode ? `Lat: ${destNode.lat.toFixed(5)}, Lng: ${destNode.lng.toFixed(5)}` : 'Click on map...'}
                  {destNode && <XCircle size={16} color="#ef4444" style={{cursor:'pointer'}} onClick={() => { setDestNode(null); setPath([]); }} />}
                </div>
              </div>
              
              <button 
                className="btn btn-primary" 
                onClick={handleStartRobot}
                disabled={!startNode || !destNode || robotState.move}
              >
                <Play size={20} /> START ROBOT
              </button>
              
              <button className="btn btn-secondary" onClick={handleReset}>
                <RotateCcw size={20} /> RESET All
              </button>
            </div>
          </div>

          <div className="glass-panel">
            <h2 className="panel-title"><Bot size={20} /> Live GPS Tracking</h2>
            <div className="status-grid">
              <div className="status-card">
                <span className="status-label">Status</span>
                <span className={`status-value ${robotState.status.split(' ')[0]}`}>
                  {robotState.status}
                </span>
              </div>
              <div className="status-card">
                <span className="status-label">Movement</span>
                <span className="status-value">
                  {robotState.move ? 'Active' : 'Stopped'}
                </span>
              </div>
              <div className="status-card" style={{gridColumn: '1 / -1'}}>
                <span className="status-label">Current GPS Location</span>
                <span className="status-value" style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>
                  {robotState.currentLocation && robotState.currentLocation.lat !== 0
                    ? `${robotState.currentLocation.lat.toFixed(6)}, ${robotState.currentLocation.lng.toFixed(6)}` 
                    : 'Awaiting Signal...'}
                </span>
              </div>
            </div>
          </div>

        </aside>

        <section className="map-container-wrapper">
          <MapComponent 
            startNode={startNode}
            destNode={destNode}
            setDestNode={setDestNode}
            path={path}
            robotLocation={robotState.currentLocation}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
