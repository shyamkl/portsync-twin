import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

export default function CommandMap() {
  // Center: JNPT Port Coordinates
  const jnptCoords = [18.9500, 72.9500];

  // Mock telemetry state holding live moving asset data
  const [assets] = useState([
    {
      id: 'vessel-01',
      name: 'MV EverGlory',
      type: 'Container Vessel',
      coordinates: [18.9580, 72.9350],
      icon: vesselIcon,
      status: 'Anchored',
      cargo: '4200 TEU',
      ldbReference: 'LDB-VES-2026-8821',
      vahanApi: 'N/A (Maritime)',
      speed: '0.0 knots',
      heading: '210°',
      lastUpdate: '10s ago',
    },
    {
      id: 'train-01',
      name: 'Intermodal DFC Freight Train',
      type: 'Freight Train (Dedicated Freight Corridor)',
      coordinates: [18.9650, 72.9700],
      icon: trainIcon,
      status: 'In Transit',
      speed: '65 km/h',
      cargo: '90 FEU High-Cube Containers',
      ldbReference: 'LDB-DFC-9904-X',
      vahanApi: 'IR-DFC-882193',
      heading: '280° (Approaching JNPT Yard)',
      lastUpdate: 'Real-Time Telemetry',
    },
    {
      id: 'truck-01',
      name: 'Logistics Haulage Truck',
      type: 'Heavy Transport Vehicle (Tractor-Trailer)',
      coordinates: [18.9380, 72.9620],
      icon: truckIcon,
      status: 'Gate Queue Processing',
      speed: '5 km/h',
      cargo: '1 x 40ft ISO Tank Container',
      ldbReference: 'LDB-TRK-7712-B',
      vahanApi: 'MH-04-FK-9102 (Valid Permit)',
      queuePosition: '#4 in line (Gate 3)',
      lastUpdate: '2s ago',
    },
  ]);

  return (
    <div style={styles.container}>
      {/* Dark mode Leaflet Map Container */}
      <MapContainer
        center={jnptCoords}
        zoom={13}
        style={{ height: '100%', width: '100%', backgroundColor: '#0b0f19' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {assets.map((asset) => (
          <Marker key={asset.id} position={asset.coordinates} icon={asset.icon}>
            <Popup className="cyber-popup">
              <div style={styles.popupContent}>
                <div style={styles.popupHeader}>
                  <h4 style={styles.title}>{asset.name}</h4>
                  <span style={styles.badge}>{asset.status}</span>
                </div>
                <div style={styles.grid}>
                  <div style={styles.row}>
                    <span style={styles.label}>Type:</span>
                    <span style={styles.value}>{asset.type}</span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Cargo Payload:</span>
                    <span style={styles.value}>{asset.cargo}</span>
                  </div>
                  {asset.speed && (
                    <div style={styles.row}>
                      <span style={styles.label}>Current Speed:</span>
                      <span style={styles.value}>{asset.speed}</span>
                    </div>
                  )}
                  {asset.queuePosition && (
                    <div style={styles.row}>
                      <span style={styles.label}>Queue Status:</span>
                      <span style={styles.value}>{asset.queuePosition}</span>
                    </div>
                  )}
                  <hr style={styles.divider} />
                  <div style={styles.row}>
                    <span style={styles.label}>LDB Ref ID:</span>
                    <span style={styles.highlight}>{asset.ldbReference}</span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Vahan / Transit Ref:</span>
                    <span style={styles.highlight}>{asset.vahanApi}</span>
                  </div>
                  <div style={styles.row}>
                    <span style={styles.label}>Telemetry Sync:</span>
                    <span style={{ ...styles.value, color: '#39ff14' }}>{asset.lastUpdate}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
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
  },
  divider: {
    borderColor: '#1e293b',
    margin: '6px 0',
    borderStyle: 'solid',
    borderWidth: '0.5px',
  },
};