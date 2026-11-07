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

// Helper to wrap SVG into a high-performance Leaflet DivIcon with cyber glow
const createCyberIcon = (svgContent, color) => {
  return L.divIcon({
    className: 'custom-cyber-marker',
    html: `<div style="display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: rgba(11, 15, 25, 0.95); border: 2px solid ${color}; border-radius: 50%; box-shadow: 0 0 12px ${color};">
      ${svgContent}
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Distinct, professional vector SVG silhouettes for Vessels, Trains, and Trucks
const vesselSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#00f0ff" width="20" height="20"><path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.64 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.16-.54.16-.82C22 9.5 20.5 8 18.5 8H17V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H5.5C3.5 8 2 9.5 2 11.5c0 .28.08.56.16.82L3.95 19zM9 6h6v2H9V6z"/></svg>`;

const trainSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ff0055" width="20" height="20"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-4-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V7h5v3zm2 0V7h5v3h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5zM18 11H6V6h12v5z"/></svg>`;

const truckSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#39ff14" width="20" height="20"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.62H17V9.5h2.5zM17 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>`;

const vesselIcon = createCyberIcon(vesselSvg, '#00f0ff');  // Neon Cyan
const trainIcon = createCyberIcon(trainSvg, '#ff0055');    // Cyber Pink/Red
const truckIcon = createCyberIcon(truckSvg, '#39ff14');    // Neon Green

// Robust helper function inspecting ID, status, and type for accurate asset mapping
const getIconForAsset = (asset) => {
  const idStr = (asset.id || asset.asset_id || '').toLowerCase();
  const statusStr = (asset.status || '').toLowerCase();
  const typeStr = (asset.type || '').toLowerCase();

  if (
    idStr.includes('train') || idStr.includes('rail') ||
    statusStr.includes('train') || statusStr.includes('rail') || statusStr.includes('dfc') ||
    typeStr.includes('train') || typeStr.includes('rail') || typeStr.includes('dfc')
  ) {
    return trainIcon;
  }
  if (
    idStr.includes('truck') || idStr.includes('haulage') ||
    statusStr.includes('truck') || statusStr.includes('haulage') || statusStr.includes('gate') || statusStr.includes('trailer') ||
    typeStr.includes('truck') || typeStr.includes('haulage')
  ) {
    return truckIcon;
  }
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
  const berthZoneCoords = [
    [18.9620, 72.9280],
    [18.9600, 72.9330],
    [18.9480, 72.9300],
    [18.9500, 72.9250]
  ];

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

        {/* --- LIVE ASSET MARKERS WITH CUSTOM SVG ICONS --- */}
        {assets.map((asset) => {
          const lat = asset.latitude ?? (asset.coordinates ? asset.coordinates[0] : jnptCoords[0]);
          const lng = asset.longitude ?? (asset.coordinates ? asset.coordinates[1] : jnptCoords[1]);
          const position = [lat, lng];
          const markerIcon = getIconForAsset(asset);

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
        .custom-cyber-marker {
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