-- ============================================================
-- Project : PortSync Twin
-- Purpose : Real-Time Port Congestion Digital Twin
-- Database: MySQL 8.0.16+
-- Engine  : InnoDB
-- ============================================================

CREATE DATABASE IF NOT EXISTS portsync_twin
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE portsync_twin;

-- ============================================================
-- 1. ASSETS TELEMETRY
-- Stores real-time location and operational telemetry
-- for vessels, trains, and trucks.
-- ============================================================

CREATE TABLE IF NOT EXISTS assets_telemetry (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    asset_id VARCHAR(64) NOT NULL,
    asset_type ENUM('Vessel', 'Train', 'Truck') NOT NULL,
    latitude DECIMAL(9, 6) NOT NULL,
    longitude DECIMAL(9, 6) NOT NULL,
    speed DECIMAL(8, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'Active',
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (id),

    -- Fast lookup by asset and chronological telemetry history.
    INDEX idx_telemetry_asset_time (asset_id, `timestamp`),
    INDEX idx_telemetry_timestamp (`timestamp`),
    INDEX idx_telemetry_type_status (asset_type, status),

    -- Data validation.
    CONSTRAINT chk_telemetry_latitude
        CHECK (latitude BETWEEN -90 AND 90),

    CONSTRAINT chk_telemetry_longitude
        CHECK (longitude BETWEEN -180 AND 180),

    CONSTRAINT chk_telemetry_speed
        CHECK (speed >= 0)

) ENGINE = InnoDB;


-- ============================================================
-- 2. CONTAINER INVENTORY
-- Stores container specifications, yard position,
-- temperature readings, and dwell duration.
-- ============================================================

CREATE TABLE IF NOT EXISTS container_inventory (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    container_no VARCHAR(20) NOT NULL,
    size ENUM('20ft', '40ft') NOT NULL,
    container_type ENUM('Standard', 'Reefer') NOT NULL,
    commodity VARCHAR(100) NULL,
    current_yard_block VARCHAR(32) NULL,
    temperature_celsius DECIMAL(5, 2) NULL,
    stay_duration_hours DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(32) NOT NULL DEFAULT 'In Yard',

    PRIMARY KEY (id),

    -- Container numbers identify individual containers.
    UNIQUE KEY uq_container_no (container_no),

    -- Fast inventory filtering.
    INDEX idx_container_yard_status (current_yard_block, status),
    INDEX idx_container_status (status),
    INDEX idx_container_type_size (container_type, size),

    -- Data validation.
    CONSTRAINT chk_container_stay_duration
        CHECK (stay_duration_hours >= 0),

    -- Standard containers do not use reefer temperature readings.
    CONSTRAINT chk_container_temperature
        CHECK (
            container_type = 'Reefer'
            OR temperature_celsius IS NULL
        )

) ENGINE = InnoDB;


-- ============================================================
-- 3. PORT GATE LOGS
-- Records vehicle arrivals, departures, and gate processing.
-- ============================================================

CREATE TABLE IF NOT EXISTS port_gate_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    vehicle_no VARCHAR(32) NOT NULL,
    gate_id VARCHAR(32) NOT NULL,
    entry_time DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    exit_time DATETIME(3) NULL,
    status ENUM('Processing', 'Cleared', 'Delayed')
        NOT NULL DEFAULT 'Processing',

    PRIMARY KEY (id),

    -- Supports vehicle history and chronological lookup.
    INDEX idx_gate_vehicle_entry (vehicle_no, entry_time),
    INDEX idx_gate_id_entry (gate_id, entry_time),
    INDEX idx_gate_status_entry (status, entry_time),

    -- An exit cannot occur before entry.
    CONSTRAINT chk_gate_exit_time
        CHECK (
            exit_time IS NULL
            OR exit_time >= entry_time
        )

) ENGINE = InnoDB;

-- ============================================================
-- END OF PORTSYNC TWIN DATABASE SCHEMA
-- ============================================================