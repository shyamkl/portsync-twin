// frontend/src/PortConfigPanel.jsx
import React, { useState, createContext, useContext } from 'react';
import { Sliders, Lock } from 'lucide-react';

// --- Shared Configuration Context ---
export const PortConfigContext = createContext();

export const PortConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    maxTeuCapacity: 35000,
    criticalDwellHours: 48,
    reeferTempVariance: 1.5,
  });

  const updateConfig = (key, value) => {
    setConfig((prev) => ({ ...prev, [key]: Number(value) }));
  };

  return (
    <PortConfigContext.Provider value={{ config, updateConfig }}>
      {children}
    </PortConfigContext.Provider>
  );
};

export const usePortConfig = () => useContext(PortConfigContext);

// --- Main PortConfigPanel Component ---
export default function PortConfigPanel({ currentTeuCount = 28450, userRole = 'Field Operator', onSecurityRestriction }) {
  const { config, updateConfig } = usePortConfig();

  const isFieldOperator = userRole === 'Field Operator';

  const handleSliderChange = (key, value) => {
    if (isFieldOperator) {
      if (onSecurityRestriction) onSecurityRestriction();
      return;
    }
    updateConfig(key, value);
  };

  // Dynamic calculations for the capacity meter
  const occupancyPercentage = Math.min(
    100,
    Math.max(0, Math.round((currentTeuCount / config.maxTeuCapacity) * 100))
  );

  // Dynamic Status Color Logic (Green -> Amber -> Red)
  const getStatusColor = (pct) => {
    if (pct < 70) return '#10b981'; // Cyber Emerald (Green)
    if (pct < 88) return '#f59e0b'; // Cyber Amber (Warning)
    return '#ef4444'; // Cyber Red (Critical Alert)
  };

  const currentColor = getStatusColor(occupancyPercentage);

  // High-End Cyber Logistics Styling Definitions
  const styles = {
    panel: {
      backgroundColor: '#0c1017',
      border: '1px solid #1f293d',
      borderRadius: '8px',
      padding: '20px',
      color: '#e2e8f0',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      maxWidth: '480px',
      margin: '0 auto',
      opacity: isFieldOperator ? 0.75 : 1,
      transition: 'opacity 0.2s ease',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '18px',
    },
    title: {
      fontSize: '14px',
      fontWeight: '700',
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      color: '#38bdf8',
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    statusContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    lockBadge: {
      fontSize: '10px',
      fontWeight: '700',
      padding: '2px 6px',
      borderRadius: '4px',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      color: '#f87171',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      textTransform: 'uppercase',
    },
    statusBadge: {
      fontSize: '11px',
      fontWeight: '600',
      padding: '2px 8px',
      borderRadius: '4px',
      backgroundColor: `${currentColor}20`,
      color: currentColor,
      border: `1px solid ${currentColor}60`,
      textTransform: 'uppercase',
    },
    gaugeContainer: {
      backgroundColor: '#06090e',
      border: '1px solid #161f30',
      borderRadius: '6px',
      padding: '14px',
      marginBottom: '20px',
    },
    gaugeHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#94a3b8',
      marginBottom: '8px',
    },
    gaugeValue: {
      fontWeight: '700',
      color: currentColor,
    },
    track: {
      width: '100%',
      height: '10px',
      backgroundColor: '#161f30',
      borderRadius: '5px',
      overflow: 'hidden',
      position: 'relative',
    },
    fill: {
      height: '100%',
      width: `${occupancyPercentage}%`,
      backgroundColor: currentColor,
      boxShadow: `0 0 12px ${currentColor}80`,
      transition: 'width 0.3s ease, background-color 0.3s ease',
    },
    sliderGroup: {
      marginBottom: '16px',
      backgroundColor: '#111726',
      padding: '12px',
      borderRadius: '6px',
      border: isFieldOperator ? '1px dashed #334155' : '1px solid #1e293b',
    },
    labelRow: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      fontWeight: '600',
      color: '#cbd5e1',
      marginBottom: '6px',
    },
    valueBadge: {
      color: '#00f2fe',
      fontFamily: 'monospace',
    },
    slider: {
      width: '100%',
      accentColor: '#38bdf8',
      cursor: isFieldOperator ? 'not-allowed' : 'pointer',
      margin: '4px 0 0 0',
    },
    subText: {
      fontSize: '10px',
      color: '#64748b',
      marginTop: '4px',
      display: 'flex',
      justifyContent: 'space-between',
    },
  };

  return (
    <div style={styles.panel}>
      {/* Panel Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>
          <span style={{ fontSize: '8px', color: currentColor }}>●</span> Dynamic Threshold Manager
        </h3>
        <div style={styles.statusContainer}>
          {isFieldOperator && (
            <span style={styles.lockBadge}>
              <Lock size={10} /> Locked
            </span>
          )}
          <span style={styles.statusBadge}>
            {occupancyPercentage >= 88 ? 'CRITICAL' : occupancyPercentage >= 70 ? 'WARNING' : 'OPTIMAL'}
          </span>
        </div>
      </div>

      {/* Dynamic Visual Capacity Progress Meter */}
      <div style={styles.gaugeContainer}>
        <div style={styles.gaugeHeader}>
          <span>Live Operational Capacity</span>
          <span style={styles.gaugeValue}>
            {currentTeuCount.toLocaleString()} / {config.maxTeuCapacity.toLocaleString()} TEU ({occupancyPercentage}%)
          </span>
        </div>
        <div style={styles.track}>
          <div style={styles.fill} />
        </div>
      </div>

      {/* Threshold Controls */}
      <div>
        {/* Slider 1: Maximum Operational TEU Capacity Limit */}
        <div style={styles.sliderGroup}>
          <div style={styles.labelRow}>
            <span>Max Operational TEU Capacity</span>
            <span style={styles.valueBadge}>{config.maxTeuCapacity.toLocaleString()} TEUs</span>
          </div>
          <input
            type="range"
            min="10000"
            max="50000"
            step="500"
            disabled={isFieldOperator}
            value={config.maxTeuCapacity}
            onChange={(e) => handleSliderChange('maxTeuCapacity', e.target.value)}
            style={styles.slider}
          />
          <div style={styles.subText}>
            <span>10,000 TEUs</span>
            <span>50,000 TEUs</span>
          </div>
        </div>

        {/* Slider 2: Critical Dwell Time Exception Boundary */}
        <div style={styles.sliderGroup}>
          <div style={styles.labelRow}>
            <span>Critical Dwell Exception Boundary</span>
            <span style={styles.valueBadge}>{config.criticalDwellHours} Hours</span>
          </div>
          <input
            type="range"
            min="12"
            max="72"
            step="1"
            disabled={isFieldOperator}
            value={config.criticalDwellHours}
            onChange={(e) => handleSliderChange('criticalDwellHours', e.target.value)}
            style={styles.slider}
          />
          <div style={styles.subText}>
            <span>12h Exception</span>
            <span>72h Exception</span>
          </div>
        </div>

        {/* Slider 3: Reefer Temperature Variance Buffer */}
        <div style={styles.sliderGroup}>
          <div style={styles.labelRow}>
            <span>Reefer Temp Variance Buffer</span>
            <span style={styles.valueBadge}>±{config.reeferTempVariance.toFixed(1)}°C</span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            disabled={isFieldOperator}
            value={config.reeferTempVariance}
            onChange={(e) => handleSliderChange('reeferTempVariance', e.target.value)}
            style={styles.slider}
          />
          <div style={styles.subText}>
            <span>±0.5°C Tight</span>
            <span>±3.0°C Wide</span>
          </div>
        </div>
      </div>
    </div>
  );
}