import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in React Leaflet when bundled
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom SVG Icons styled for cyber dark-mode aesthetic
const createCustomIcon = (color) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32" style="filter: drop-shadow(0 0 6px ${color});">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svg,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

const vesselIcon = createCustomIcon('#00f0ff');  // Neon Cyan
const trainIcon = createCustomIcon('#ff0055');   // Cyber Pink/Red
const truckIcon = createCustomIcon('#39ff14');   // Neon Green

const getIconForType = (type) => {
  if (!type) return vesselIcon;
  const lower = type.toLowerCase();
  if (lower.includes('train') || lower.includes('dfc')) return trainIcon;
  if (lower.includes('truck') || lower.includes('haulage')) return truckIcon;
  return vesselIcon;
};

export default function CommandMap() {
  // Center: JNPT Port Coordinates
  const jnptCoords = [18.9500, 72.9500];

  // State to hold live assets, connection/fallback status, and simulation crisis toggle
  const [assets, setAssets] = useState([]);
  const [isLive, setIsLive] = useState(false);
  const [crisisBottleneck, setCrisisBottleneck] = useState(false);

  // Fallback mock telemetry data in case backend is offline
  const fallbackAssets = [
    {
      id: 'vessel-01',
      name: 'MV EverGlory (Offline Fallback)',
      type: 'Container Vessel',
      latitude: 18.9580,
      longitude: 72.9350,
      status: 'Anchored (Cached)',
      speed: 0.0,
      cargo: '4200 TEU',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'train-01',
      name: 'Intermodal DFC Freight Train (Offline Fallback)',
      type: 'Freight Train',
      latitude: 18.9650,
      longitude: 72.9700,
      status: 'In Transit (Cached)',
      speed: 65.0,
      cargo: '90 FEU High-Cube',
      timestamp: new Date().toISOString(),
    },
    {
      id: 'truck-01',
      name: 'Logistics Haulage Truck (Offline Fallback)',
      type: 'Haulage Truck',
      latitude: 18.9380,
      longitude: 72.9620,
      status: 'Gate Queue (Cached)',
      speed: 5.0,
      cargo: '1 x 40ft ISO Tank',
      timestamp: new Date().toISOString(),
    },
  ];

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/live-assets');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (Array.isArray(data)) {
          setAssets(data);
          setIsLive(true);
        } else {
          throw new Error('Invalid telemetry payload format');
        }
      } catch (error) {
        setAssets(fallbackAssets);
        setIsLive(false);
      }
    };

    fetchTelemetry();
    const intervalId = setInterval(fetchTelemetry, 4000);
    return () => clearInterval(intervalId);
  }, []);

  // Spatial Overlay Coordinates
  // 1. Terminal Berth Zone Polygon (Coastal Edge near JNPT)
  const berthZoneCoords = [
    [18.9620, 72.9280],
    [18.9600, 72.9330],
    [18.9480, 72.9300],
    [18.9500, 72.9250]
  ];

  // 2. Yard Storage Hotspots (Sectors A, B, C)
  const yardSectorACoords = [
    [18.9540, 72.9360],
    [18.9540, 72.9420],
    [18.9500, 72.9420],
    [18.9500, 72.9360]
  ];

  const yardSectorBCoords = [
    [18.9490, 72.9360],
    [18.9490, 72.9420],
    [18.9450, 72.9420],
    [18.9450, 72.9360]
  ];

  const yardSectorCCoords = [
    [18.9440, 72.9360],
    [18.9440, 72.9420],
    [18.9400, 72.9420],
    [18.9400, 72.9360]
  ];

  // 3. Intermodal Evacuation Route (Dedicated Freight Corridor rail route extending inland)
  const dfcRailRouteCoords = [
    [18.9420, 72.9380],
    [18.9500, 72.9550],
    [18.9600, 72.9800],
    [18.9800, 73.0200]
  ];

  return (
    <div style={styles.container}>
      {/* Simulation Controls & Telemetry Status Bar */}
      <div style={styles.statusBar}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            backgroundColor: isLive ? '#22c55e' : '#ef4444',
            display: 'inline-block',
            boxShadow: isLive ? '0 0 8px #22c55e' : '0 0 8px #ef4444'
          }}></span>
          {isLive ? 'FastAPI Telemetry Stream: Connected (Live)' : 'FastAPI Stream Offline - Running Safe Fallback State'}
        </span>
        
        {/* Stage 2 Simulation Crisis Toggle Button */}
        <button 
          onClick={() => setCrisisBottleneck(!crisisBottleneck)}
          style={{
            backgroundColor: crisisBottleneck ? 'rgba(239, 68, 68, 0.2)' : 'rgba(0, 240, 255, 0.15)',
            color: crisisBottleneck ? '#ef4444' : '#00f0ff',
            border: `1px solid ${crisisBottleneck ? '#ef4444' : '#00f0ff'}`,
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: crisisBottleneck ? '0 0 10px rgba(239, 68, 68, 0.4)' : 'none'
          }}
        >
          {crisisBottleneck ? '⚠️ CRISIS BOTTLENECK: ACTIVE' : '⚡ SIMULATION: NORMAL'}
        </button>
      </div>

      {/* Dark mode Leaflet Map Container */}
      <MapContainer
        center={jnptCoords}
        zoom={13}
        style={{ height: 'calc(100% - 32px)', width: '100%', backgroundColor: '#0b0f19' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* --- SPATIAL OVERLAYS --- */}

        {/* 1. Terminal Berth Zone Overlay */}
        <Polygon 
          positions={berthZoneCoords}
          pathOptions={{
            color: '#38bdf8',
            weight: 2,
            fillColor: '#00f0ff',
            fillOpacity: 0.25,
            dashArray: '4, 4'
          }}
        >
          <Popup className="cyber-popup">
            <div style={styles.popupContent}>
              <h4 style={styles.title}>Terminal Berth Zone Alpha</h4>
              <p style={{ margin: '4px 0', fontSize: '11px', color: '#94a3b8' }}>Physical deep-water shipping berths (Berth 01 - 04).</p>
              <div style={styles.row}>
                <span style={styles.label}>Status:</span>
                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>Active / Discharging</span>
              </div>
            </div>
          </Popup>
        </Polygon>

        {/* 2. Yard Storage Hotspot Zone Overlays */}
        <Polygon 
          positions={yardSectorACoords}
          pathOptions={{ color: '#10b981', weight: 1, fillColor: '#10b981', fillOpacity: 0.2 }}
        >
          <Popup className="cyber-popup">
            <div style={styles.popupContent}>
              <h4 style={styles.title}>Yard Sector A</h4>
              <div style={styles.row}><span style={styles.label}>Occupancy:</span> <span style={styles.value}>64% Occupied</span></div>
              <div style={styles.row}><span style={styles.label}>Throughput:</span> <span style={styles.value}>Normal</span></div>
            </div>
          </Popup>
        </Polygon>

        <Polygon 
          positions={yardSectorBCoords}
          pathOptions={{ color: '#3b82f6', weight: 1, fillColor: '#3b82f6', fillOpacity: 0.2 }}
        >
          <Popup className="cyber-popup">
            <div style={styles.popupContent}>
              <h4 style={styles.title}>Yard Sector B</h4>
              <div style={styles.row}><span style={styles.label}>Occupancy:</span> <span style={styles.value}>72% Occupied</span></div>
              <div style={styles.row}><span style={styles.label}>Throughput:</span> <span style={styles.value}>Optimal</span></div>
            </div>
          </Popup>
        </Polygon>

        {/* Yard Sector C with Dynamic Crisis Bottleneck Toggle */}
        <Polygon 
          positions={yardSectorCCoords}
          pathOptions={{ 
            color: crisisBottleneck ? '#ef4444' : '#10b981', 
            weight: crisisBottleneck ? 2 : 1, 
            fillColor: crisisBottleneck ? '#ef4444' : '#10b981', 
            fillOpacity: crisisBottleneck ? 0.45 : 0.2 
          }}
        >
          <Popup className="cyber-popup">
            <div style={styles.popupContent}>
              <h4 style={{ ...styles.title, color: crisisBottleneck ? '#ef4444' : '#00f0ff' }}>Yard Sector C</h4>
              <div style={styles.row}>
                <span style={styles.label}>Operational Status:</span> 
                <span style={{ color: crisisBottleneck ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                  {crisisBottleneck ? 'CONGESTION SPIKE' : 'Standard Operations'}
                </span>
              </div>
              <div style={styles.row}>
                <span style={styles.label}>Capacity:</span> 
                <span style={styles.value}>{crisisBottleneck ? '98% Occupied (Critical)' : '88% Occupied'}</span>
              </div>
            </div>
          </Popup>
        </Polygon>

        {/* 3. Intermodal Evacuation Route (DFC Rail Corridor) */}
        <Polyline 
          positions={dfcRailRouteCoords}
          pathOptions={{
            color: '#f97316',
            weight: 4,
            opacity: 0.8,
            dashArray: '8, 8'
          }}
        >
          <Popup className="cyber-popup">
            <div style={styles.popupContent}>
              <h4 style={{ ...styles.title, color: '#f97316' }}>Dedicated Freight Corridor (DFC)</h4>
              <p style={{ margin: '4px 0', fontSize: '11px', color: '#94a3b8' }}>Mainline intermodal rail evacuation artery.</p>
              <div style={styles.row}><span style={styles.label}>Flow Rate:</span> <span style={styles.value}>12 Trains/day</span></div>
              <div style={styles.row}><span style={styles.label}>Evacuation Status:</span> <span style={{ color: '#39ff14', fontWeight: 'bold' }}>Clear</span></div>
            </div>
          </Popup>
        </Polyline>

        {/* --- LIVE ASSET MARKERS --- */}
        {assets.map((asset) => {
          const lat = asset.latitude ?? (asset.coordinates ? asset.coordinates[0] : jnptCoords[0]);
          const lng = asset.longitude ?? (asset.coordinates ? asset.coordinates[1] : jnptCoords[1]);
          const position = [lat, lng];
          const markerIcon = getIconForType(asset.type);

          return (
            <Marker key={asset.id || asset.name} position={position} icon={markerIcon}>
              <Popup className="cyber-popup">
                <div style={styles.popupContent}>
                  <div style={styles.popupHeader}>
                    <h4 style={styles.title}>{asset.name || 'Unnamed Asset'}</h4>
                    <span style={styles.badge}>{asset.status || 'Active'}</span>
                  </div>
                  <div style={styles.grid}>
                    <div style={styles.row}>
                      <span style={styles.label}>Asset Type:</span>
                      <span style={styles.value}>{asset.type || 'Standard Unit'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>Cargo Load:</span>
                      <span style={styles.value}>{asset.cargo || 'Standard TEU'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>Speed:</span>
                      <span style={styles.value}>{asset.speed !== undefined ? `${asset.speed} km/h` : '0.0 km/h'}</span>
                    </div>
                    <div style={styles.row}>
                      <span style={styles.label}>Coordinates:</span>
                      <span style={styles.highlight}>{Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}</span>
                    </div>
                    <hr style={styles.divider} />
                    <div style={styles.row}>
                      <span style={styles.label}>Server Timestamp:</span>
                      <span style={{ ...styles.value, color: '#39ff14', fontSize: '10px' }}>
                        {asset.timestamp ? new Date(asset.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Embedded CSS styling for Popup Dark-Mode Overrides */}
      <style>{`
        .leaflet-popup-content-wrapper {
          background: #0d1321 !important;
          color: #e2e8f0 !important;
          border: 1px solid #1e293b;
          box-shadow: 0 8px 32px 0 rgba(0, 240, 255, 0.2);
          border-radius: 8px;
        }
        .leaflet-popup-tip {
          background: #0d1321 !important;
        }
        .leaflet-container {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }
        .custom-leaflet-marker {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    overflow: 'hidden',
  },
  statusBar: {
    height: '32px',
    backgroundColor: '#090d16',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    fontSize: '0.75rem',
    color: '#94a3b8',
    flexShrink: 0,
    justifyContent: 'space-between',
  },
  popupContent: {
    minWidth: '240px',
    padding: '4px',
  },
  popupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '6px',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: '700',
    color: '#00f0ff',
  },
  badge: {
    fontSize: '10px',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    color: '#00f0ff',
    border: '1px solid #00f0ff',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '12px',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#64748b',
    fontWeight: '500',
  },
  value: {
    color: '#cbd5e1',
    fontWeight: '600',
  },
  highlight: {
    color: '#38bdf8',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: '11px',
  },
  divider: {
    borderColor: '#1e293b',
    margin: '6px 0',
    borderStyle: 'solid',
    borderWidth: '0.5px',
  },
};