import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Polyline, CircleMarker, Circle, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const ClickHandler = ({ setDestNode }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setDestNode({ lat, lng });
    }
  });
  return null;
};

export default function MapComponent({ startNode, destNode, setDestNode, path, robotLocation }) {
  const defaultCenter = [9.9252, 78.1198];
  const mapRef = useRef(null);
  
  // Track if we have initially centered to the user's location
  const centeredOnce = useRef(false);

  useEffect(() => {
    if (mapRef.current && startNode && !centeredOnce.current) {
      mapRef.current.setView([startNode.lat, startNode.lng], 16);
      centeredOnce.current = true;
    }
  }, [startNode]);

  return (
    <MapContainer 
      center={defaultCenter}
      zoom={16}
      style={{ height: '100%', width: '100%', borderRadius: '16px' }}
      ref={mapRef}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
      />

      <ClickHandler setDestNode={setDestNode} />

      {/* Start Marker (Auto Detected Google Maps Style) */}
      {startNode && (
        <>
          {startNode.accuracy && (
            <Circle 
              center={[startNode.lat, startNode.lng]} 
              radius={startNode.accuracy} 
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 1 }} 
            />
          )}
          <CircleMarker 
            center={[startNode.lat, startNode.lng]} 
            radius={7} 
            pathOptions={{ color: '#ffffff', fillColor: '#2563eb', fillOpacity: 1, weight: 3 }}
          >
            <Popup>
              Current Location (Start)<br/>
              Accuracy: {startNode.accuracy ? Math.round(startNode.accuracy) + 'm' : 'Unknown'}
            </Popup>
          </CircleMarker>
        </>
      )}

      {/* Dest Marker (User Selected) */}
      {destNode && (
        <CircleMarker 
          center={[destNode.lat, destNode.lng]} 
          radius={8} 
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 1 }}
        >
          <Popup>Destination</Popup>
        </CircleMarker>
      )}

      {/* Computed Path */}
      {path && path.length > 0 && (
        <Polyline 
          positions={path.map(p => [p.lat, p.lng])} 
          color="#3b82f6" 
          weight={5}
          opacity={0.8}
        />
      )}

      {/* Live Robot Position Marker */}
      {robotLocation && robotLocation.lat !== 0 && (
        <CircleMarker 
          center={[robotLocation.lat, robotLocation.lng]} 
          radius={10} 
          pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 1, weight: 3 }}
        >
          <Tooltip permanent direction="top" className="robot-label" offset={[0,-10]}>
            🤖 Robot
          </Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
