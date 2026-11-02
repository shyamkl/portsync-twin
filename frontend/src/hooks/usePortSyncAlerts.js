import { useEffect, useState } from "react";

export default function usePortSyncAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/alerts");

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const alert = JSON.parse(event.data);

        if (alert.type === "TRIAGE_ALERT") {
          setAlerts((previous) => [alert, ...previous]);
        }
      } catch (error) {
        console.error("Invalid alert message", error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error", error);
    };

    return () => {
      ws.close();
    };
  }, []);

  return { alerts, connected };
}