#!/usr/bin/env python3
"""
PortSync Twin — Mock National API Engine
----------------------------------------
Standalone synthetic event generator for local demos and Digital Twin testing.

Emits newline-delimited JSON (NDJSON) events for three *mock* source families:
  - LDB-like container lifecycle events
  - FOIS-like freight/rail movement events
  - Vahan-like commercial vehicle registry/telemetry events

IMPORTANT:
  This generator does not connect to, scrape, or reproduce official government
  systems, credentials, private records, or exact proprietary wire schemas.
  All identifiers and values are synthetic. Each record is marked `mock: true`.

Examples:
  python mock_national_api_engine.py
  python mock_national_api_engine.py --interval 0.5
  python mock_national_api_engine.py --source ldb --count 25
  python mock_national_api_engine.py --source all --count 100 --seed 42 > demo.ndjson
  python mock_national_api_engine.py --interval 1 --pretty

Python 3.10+; standard library only.
"""
from __future__ import annotations

import argparse
import json
import random
import signal
import sys
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Callable

PORTS = [
    {"code": "INNSA1", "name": "Nhava Sheva", "state": "Maharashtra"},
    {"code": "INMUN1", "name": "Mundra", "state": "Gujarat"},
    {"code": "INMAA1", "name": "Chennai", "state": "Tamil Nadu"},
]
TERMINALS = ["T1", "T2", "T3", "YARD-A", "YARD-B"]
RAIL_NODES = ["JNPT", "VAPI", "SURAT", "VADODARA", "NAGPUR", "DADRI", "TUGHLAKABAD"]
ROAD_NODES = ["PORT_GATE", "PARKING_A", "NH48_CHECKPOINT", "ICD_GATE"]
CONTAINER_TYPES = ["20GP", "40GP", "40HC", "40RF"]
CARGO_TYPES = ["GENERAL", "PHARMA", "PERISHABLE", "ELECTRONICS", "TEXTILES"]
TRAIN_STATUSES = ["SCHEDULED", "DEPARTED", "IN_TRANSIT", "ARRIVED", "HELD"]
VEHICLE_CLASSES = ["N2", "N3"]
EMISSION_CLASSES = ["BS6", "CNG", "EV"]


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def container_event(rng: random.Random) -> dict[str, Any]:
    port = rng.choice(PORTS)
    cargo = rng.choice(CARGO_TYPES)
    refrigerated = cargo in {"PHARMA", "PERISHABLE"}
    state = rng.choice([
        ("GATE_IN", "GATE_IN"),
        ("YARD_PLACED", "YARD_PLACED"),
        ("CUSTOMS_HOLD", "CUSTOMS_HOLD"),
        ("CUSTOMS_RELEASED", "CUSTOMS_RELEASED"),
        ("RAIL_LOADED", "RAIL_LOADED"),
        ("GATE_OUT", "GATE_OUT"),
    ])
    event_type = state[0]
    temp = round(rng.uniform(2.0, 8.0), 1) if refrigerated else None
    dwell = round(rng.uniform(0.2, 78.0), 2)
    return {
        "schema_family": "mock_ldb_container_cycle",
        "event_id": str(uuid.UUID(int=rng.getrandbits(128))),
        "event_time": iso_now(),
        "source": "LDB_MOCK",
        "mock": True,
        "port": port,
        "container": {
            "container_id": f"MOCK{rng.randrange(10**10):010d}",
            "iso_size_type": rng.choice(CONTAINER_TYPES),
            "cargo_class": cargo,
            "cycle_status": event_type,
            "terminal": rng.choice(TERMINALS),
            "dwell_hours": dwell,
            "reefer": {
                "enabled": refrigerated,
                "temperature_c": temp,
                "target_min_c": 2.0 if refrigerated else None,
                "target_max_c": 8.0 if refrigerated else None,
                "power_status": rng.choice(["ON", "ON", "ON", "INTERRUPTED"]) if refrigerated else None,
            },
        },
        "movement": {
            "from_node": rng.choice(ROAD_NODES + RAIL_NODES),
            "to_node": rng.choice(ROAD_NODES + RAIL_NODES),
            "planned_mode": rng.choice(["ROAD", "RAIL"]),
        },
    }


def rail_event(rng: random.Random) -> dict[str, Any]:
    origin, destination = rng.sample(RAIL_NODES, 2)
    status = rng.choice(TRAIN_STATUSES)
    delay = rng.choice([0, 0, 0, 12, 35, 90, 180])
    return {
        "schema_family": "mock_fois_freight_movement",
        "event_id": str(uuid.UUID(int=rng.getrandbits(128))),
        "event_time": iso_now(),
        "source": "FOIS_MOCK",
        "mock": True,
        "freight_movement": {
            "train_id": f"MT{rng.randrange(10000, 99999)}",
            "service_class": rng.choice(["CONTAINER", "FREIGHT"]),
            "status": status,
            "origin_station": origin,
            "destination_station": destination,
            "current_node": origin if status in {"SCHEDULED", "DEPARTED"} else rng.choice(RAIL_NODES),
            "scheduled_departure": iso_now(),
            "estimated_arrival": iso_now(),
            "delay_minutes": delay,
            "track_condition": rng.choice(["NORMAL", "MAINTENANCE_WINDOW", "RESTRICTED"]),
            "consist": {
                "wagon_count": rng.randint(35, 60),
                "container_count": rng.randint(40, 120),
            },
        },
    }


def vehicle_event(rng: random.Random) -> dict[str, Any]:
    port = rng.choice(PORTS)
    registered = rng.choice([True, True, True, False])
    return {
        "schema_family": "mock_vahan_commercial_vehicle",
        "event_id": str(uuid.UUID(int=rng.getrandbits(128))),
        "event_time": iso_now(),
        "source": "VAHAN_MOCK",
        "mock": True,
        "vehicle": {
            "registration_id": f"MOCK-REG-{rng.randrange(10**8):08d}",
            "registration_state": rng.choice(["MH", "GJ", "TN", "DL", "RJ"]),
            "vehicle_class": rng.choice(VEHICLE_CLASSES),
            "emission_class": rng.choice(EMISSION_CLASSES),
            "registered": registered,
            "fitness_valid": rng.choice([True, True, True, False]),
            "permit_status": rng.choice(["VALID", "VALID", "PENDING", "EXPIRED"]),
            "payload_capacity_tonnes": rng.choice([16, 25, 32, 40]),
        },
        "trip": {
            "port_code": port["code"],
            "checkpoint": rng.choice(ROAD_NODES),
            "movement_status": rng.choice(["APPROACHING", "QUEUED", "AT_GATE", "CLEARED", "DEPARTED"]),
            "queue_minutes": rng.randint(0, 240),
            "speed_kph": round(rng.uniform(0, 55), 1),
            "gps": {
                # Deliberately fictional demo coordinates, not live vehicle positions.
                "lat": round(rng.uniform(18.0, 23.0), 5),
                "lon": round(rng.uniform(68.0, 74.0), 5),
            },
        },
    }


GENERATORS: dict[str, Callable[[random.Random], dict[str, Any]]] = {
    "ldb": container_event,
    "fois": rail_event,
    "vahan": vehicle_event,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate continuous PortSync synthetic national-logistics events.")
    parser.add_argument("--source", choices=["all", *GENERATORS.keys()], default="all",
                        help="Event family to generate (default: all).")
    parser.add_argument("--interval", type=float, default=1.0,
                        help="Seconds between emitted events; 0 emits as fast as possible.")
    parser.add_argument("--count", type=int, default=0,
                        help="Number of events to emit; 0 means continuous until Ctrl+C.")
    parser.add_argument("--seed", type=int, default=None, help="Seed for repeatable pseudo-random values.")
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON (one object per event).")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.interval < 0:
        print("--interval must be >= 0", file=sys.stderr)
        return 2
    if args.count < 0:
        print("--count must be >= 0", file=sys.stderr)
        return 2

    rng = random.Random(args.seed)
    sources = list(GENERATORS) if args.source == "all" else [args.source]
    emitted = 0
    running = True

    def stop(_signum: int, _frame: Any) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, stop)

    try:
        while running and (args.count == 0 or emitted < args.count):
            family = rng.choice(sources)
            event = GENERATORS[family](rng)
            line = json.dumps(event, indent=2 if args.pretty else None, ensure_ascii=False)
            print(line, flush=True)
            emitted += 1
            if args.interval and (args.count == 0 or emitted < args.count):
                time.sleep(args.interval)
    except BrokenPipeError:
        return 0
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
