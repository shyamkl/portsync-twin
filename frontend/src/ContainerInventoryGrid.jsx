// frontend/src/ContainerInventoryGrid.jsx
import React, { useState, useMemo } from 'react';
import { Search, Filter, AlertTriangle, ShieldAlert, CheckCircle, Clock, Thermometer, Box } from 'lucide-react';

const MOCK_CONTAINERS = [
  { id: 'MSCU892104-2', isoType: '45R1 (45ft Reefer)', cargoClass: 'Perishable / Reefer', block: 'BLK-A04-Z1', temp: '-22.4°C', dwellHours: 42, status: 'CRITICAL_SPIKE' },
  { id: 'CMAU302914-8', isoType: '22G1 (20ft Dry)', cargoClass: 'General Cargo', block: 'BLK-B12-Z3', temp: 'N/A', dwellHours: 18, status: 'NOMINAL' },
  { id: 'HAPG774109-0', isoType: '42T1 (40ft Tank)', cargoClass: 'Hazardous Material', block: 'BLK-HAZ-Z0', temp: '+14.1°C', dwellHours: 86, status: 'CUSTOMS_HOLD_DELAYED' },
  { id: 'MAEU901238-4', isoType: '45R1 (45ft Reefer)', cargoClass: 'Perishable / Reefer', block: 'BLK-A02-Z4', temp: '-18.0°C', dwellHours: 12, status: 'NOMINAL' },
  { id: 'COSU554901-3', isoType: '45G1 (40ft High Cube)', cargoClass: 'General Cargo', block: 'BLK-C08-Z2', temp: 'N/A', dwellHours: 54, status: 'NOMINAL' },
  { id: 'EVER449102-7', isoType: '42T1 (40ft Tank)', cargoClass: 'Hazardous Material', block: 'BLK-HAZ-Z2', temp: '+21.5°C', dwellHours: 110, status: 'CRITICAL_SPIKE' },
  { id: 'ONEU109823-1', isoType: '22R1 (20ft Reefer)', cargoClass: 'Perishable / Reefer', block: 'BLK-A01-Z2', temp: '-20.1°C', dwellHours: 29, status: 'NOMINAL' },
  { id: 'YMLU882341-9', isoType: '22G1 (20ft Dry)', cargoClass: 'General Cargo', block: 'BLK-B04-Z1', temp: 'N/A', dwellHours: 96, status: 'CUSTOMS_HOLD_DELAYED' },
  { id: 'ZIMU334109-5', isoType: '45R1 (45ft Reefer)', cargoClass: 'Perishable / Reefer', block: 'BLK-A05-Z3', temp: '-15.2°C', dwellHours: 64, status: 'CRITICAL_SPIKE' },
  { id: 'OOLU662910-2', isoType: '45G1 (40ft High Cube)', cargoClass: 'General Cargo', block: 'BLK-C01-Z4', temp: 'N/A', dwellHours: 8, status: 'NOMINAL' }
];

export default function ContainerInventoryGrid() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Cargo');

  const filteredContainers = useMemo(() => {
    return MOCK_CONTAINERS.filter((container) => {
      const matchesSearch =
        container.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        container.block.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'All Cargo' || container.cargoClass === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: '#090d16',
      border: '1px solid #1e293b',
      borderRadius: '10px',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
            TERMINAL DATA SEARCH CENTER
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
            Real-time telemetry and container tracking index
          </span>
        </div>
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '6px',
          padding: '6px 12px',
          fontSize: '0.75rem',
          color: '#38bdf8',
          fontWeight: 700
        }}>
          Assets Indexed: {filteredContainers.length} / {MOCK_CONTAINERS.length}
        </div>
      </div>

      {/* Filter and Search Bar Row */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '16px' }}>
        {/* Search Input Box */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '8px 14px'
        }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search Container ID or Block Number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Category Dropdown */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#0f172a',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '8px 14px'
        }}>
          <Filter size={18} color="#38bdf8" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <option value="All Cargo" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>All Cargo</option>
            <option value="Perishable / Reefer" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Perishable / Reefer</option>
            <option value="General Cargo" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>General Cargo</option>
            <option value="Hazardous Material" style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}>Hazardous Material</option>
          </select>
        </div>
      </div>

      {/* Grid Data Table */}
      <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', color: '#94a3b8', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
              <th style={{ padding: '12px 16px' }}>Container ID</th>
              <th style={{ padding: '12px 16px' }}>ISO Type</th>
              <th style={{ padding: '12px 16px' }}>Cargo Class</th>
              <th style={{ padding: '12px 16px' }}>Current Block</th>
              <th style={{ padding: '12px 16px' }}>Temp</th>
              <th style={{ padding: '12px 16px' }}>Dwell Hours</th>
              <th style={{ padding: '12px 16px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredContainers.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
                  No container records found matching search filters.
                </td>
              </tr>
            ) : (
              filteredContainers.map((item) => {
                const isAlertState = item.status === 'CUSTOMS_HOLD_DELAYED' || item.status === 'CRITICAL_SPIKE';

                return (
                  <tr
                    key={item.id}
                    style={{
                      backgroundColor: isAlertState ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                      borderBottom: '1px solid #1e293b',
                      transition: 'background-color 0.15s ease',
                      color: isAlertState ? '#fecdd3' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: isAlertState ? '#f87171' : '#38bdf8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box size={14} color={isAlertState ? '#f87171' : '#38bdf8'} />
                        {item.id}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{item.isoType}</td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{item.cargoClass}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#e2e8f0' }}>{item.block}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: item.temp.includes('-') ? '#38bdf8' : item.temp === 'N/A' ? '#64748b' : '#f59e0b' }}>
                        {item.temp !== 'N/A' && <Thermometer size={13} />}
                        {item.temp}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#cbd5e1' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} color="#64748b" />
                        {item.dwellHours}h
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.675rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        backgroundColor: item.status === 'CRITICAL_SPIKE' ? 'rgba(239, 68, 68, 0.25)' : item.status === 'CUSTOMS_HOLD_DELAYED' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(34, 197, 94, 0.15)',
                        color: item.status === 'CRITICAL_SPIKE' ? '#f87171' : item.status === 'CUSTOMS_HOLD_DELAYED' ? '#fbbf24' : '#4ade80',
                        border: item.status === 'CRITICAL_SPIKE' ? '1px solid rgba(239, 68, 68, 0.4)' : item.status === 'CUSTOMS_HOLD_DELAYED' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(34, 197, 94, 0.3)'
                      }}>
                        {item.status === 'CRITICAL_SPIKE' && <ShieldAlert size={12} />}
                        {item.status === 'CUSTOMS_HOLD_DELAYED' && <AlertTriangle size={12} />}
                        {item.status === 'NOMINAL' && <CheckCircle size={12} />}
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}