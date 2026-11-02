# ⚓ PortSync Twin 🚀

### Real-Time Multimodal Port Congestion & Intermodal Evacuation Digital Twin
*An Enterprise Decoupled Core Infrastructure Framework Developed for the NLDSL DigiTwin Grand Challenge (Stage 1 Prototype)*

---

## 🛠️ System Technology Stack & Architecture

PortSync Twin implements a modern, highly responsive decoupled architectural paradigm engineered to ingest, process, and visualize real-time multi-agency logistics datasets.

*   **Frontend Core Canvas:** Built with **React.js** initialized via the high-performance **Vite** compilation engine. Renders optimized responsive structural flex grid matrices for dark-mode operations control rooms.
*   **Geospatial Mapping Layer:** Leverages the open-source **Leaflet API (`react-leaflet`)** with continuous polling triggers centered precisely around the Jawaharlal Nehru Port Trust (JNPT/Nhava Sheva) logistics corridors `[18.9500, 72.9500]`.
*   **API Gateway & Ingestion Router:** Built on **FastAPI (Python)** using fully asynchronous (`async/await`) network connection loops to guarantee low-latency data processing under peak simulation load thresholds.
*   **Real-Time Push Stream Engine:** Features an asynchronous **WebSocket Alert Router** designed to keep a persistent open pipe, immediately broadcasting critical exception anomalies (e.g., Reefer power interruptions or cold-chain breaches) directly to client views.
*   **Persistent Data Store Layer:** Backed by a **MySQL Relational Database Cluster** deploying optimized index arrays across real-time `assets_telemetry`, `container_inventory`, and checkpost gate logs.

---

## 📂 Project Repository Directory Tree Map

```text
portsync-twin/
├── backend/                       # Async Python FastAPI Engine Space
│   ├── routers/                   # Modular WebSocket Alert Communication Routes
│   │   └── alert_router.py        # Real-time event triage broadcaster
│   ├── main.py                    # Gateway router and database transaction manager
│   └── mock_national_api_engine_data.py # Vahan, LDB, and FOIS stream simulator
├── frontend/                      # React.js Client Workspace Web Layouts
│   ├── src/
│   │   ├── hooks/                 # Client-side WebSocket Handshake Listeners
│   │   ├── CommandMap.jsx         # Geospatial Leaflet Map asset tracker
│   │   ├── YardMatrix.jsx         # 2D Interactive Storage Density Grid matrix
│   │   ├── SimulationLab.jsx      # Manual "What-If" crisis disruption injector
│   │   ├── AnalyticsInsights.jsx  # Recharts-driven predictive analytical panel
│   │   └── App.jsx                # Global shell and responsive theme container
└── qa-automation/                 # JavaScript Playwright End-to-End E2E Framework
```

---

## 🚀 Local Staging Execution Protocol

To execute and run the full-stack Digital Twin prototype system locally, initialize these three independent terminal threads sequentially:

### Terminal 1: Initialize the API Ingestion Core
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload
```
*Server initialized on: `http://127.0.0.1:8000`*

### Terminal 2: Start the National Infrastructure Simulator Stream
```bash
cd backend
.\venv\Scripts\Activate.ps1
python mock_national_api_engine_data.py
```
*Injects live simulated Vahan, LDB, and FOIS telemetry data payloads to local database structures every 2 seconds.*

### Terminal 3: Boot the Frontend Dashboard Canvas
```bash
cd frontend
npm install
npm run dev
```
*Client GUI running live on: `http://localhost:5173`*
