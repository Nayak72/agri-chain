# AgriChain Sensor Simulation & Cold-Chain Monitoring

AgriChain includes a deterministic synthetic sensor simulation engine designed for testing, training, and operational monitoring without requiring physical IoT hardware integration.

---

## 1. Stateless Simulation Generator

Readings are generated deterministically using `generate_stateless_reading(shipment_id, produce_type, scenario, step)` (`backend/app/services/sensor_simulator.py`). The random seed is pinned to:

$$\text{seed} = \text{shipment\_id} : \text{scenario} : \text{step}$$

Given identical arguments, the simulator produces the exact same sequence of readings across retries and client sessions.

### 1.1 Supported Simulation Scenarios
| Scenario Code | Environmental Pattern | Biological Impact |
|---|---|---|
| `NORMAL` | In-range Gaussian fluctuations centered on optimal produce profile. | Optimal shelf-life preservation. |
| `TEMP_EXCURSION` | Progressive thermal breach beginning at step 3 ($+1^\circ\text{C}$ to $+4.2^\circ\text{C}$). | Spoilage, accelerated ripening. |
| `HUMIDITY_EXCURSION` | Humidity breach beginning at step 3 ($+2\%$ to $+8\%$). | Mold growth, condensation damage. |
| `DOOR_OPEN_EVENT` | Sudden temperature ($+0.7^\circ\text{C}$ to $+2^\circ\text{C}$) and humidity jump between steps 2–4. | Transient warm air ingress during inspection. |
| `REFRIGERATION_FAILURE` | Continuous, severe thermal rise from step 3 onward. | Complete cooling loss; severe spoilage risk. |
| `RECOVERY_AFTER_EXCURSION` | Severe initial excursion recovering to normal range by step 5. | Re-cooling following corrective action. |
| `TRANSIT_DELAY` | Normal, in-range temperature and humidity readings flagged with `simulated_delay: true`. | Models schedule delays without corrupting business timestamps or shipment state. |

---

## 2. Severity Classification & Hysteresis

Sensor readings are evaluated against the produce handling profile using `classify_reading(reading, previous_reading)`:

### 2.1 Severity Levels
- **NORMAL**: Temperature and humidity are strictly within the configured produce threshold.
- **WARNING**: Minor breach (deviation $< 2^\circ\text{C}$ and $< 10\%$ humidity), OR recovery phase inside the hysteresis margin.
- **CRITICAL**: Significant breach ($\ge 2^\circ\text{C}$ or $\ge 10\%$ humidity), OR two consecutive out-of-range readings.

### 2.2 In-Range Hysteresis Margin
To prevent alert flapping when readings hover near boundary thresholds, the simulator enforces a **hysteresis buffer**:
- Following an excursion, readings remain in **WARNING** status until:
  $$\text{temperature} \ge \text{min\_temp} + 0.2^\circ\text{C} \quad \text{and} \quad \text{temperature} \le \text{max\_temp} - 0.2^\circ\text{C}$$
  $$\text{humidity} \ge \text{min\_humidity} + 1\% \quad \text{and} \quad \text{humidity} \le \text{max\_humidity} - 1\%$$
- Only when telemetry penetrates safely inside this buffer is the status downgraded to **NORMAL**.

---

## 3. Sensor Alert Lifecycle

Alerts are tracked independently in `sensor_alerts` and represent open operational anomalies.

```
       Excursion Detected
              │
              ▼
       ┌──────────────┐
       │    ACTIVE    │
       └──────┬───────┘
              │ Operator Acknowledgment
              ▼
       ┌──────────────┐
       │ ACKNOWLEDGED │ (Operator notes recorded; alert remains open)
       └──────┬───────┘
              │ Corrective Action & Resolution
              ▼
       ┌──────────────┐
       │   RESOLVED   │ (Corrective action logged; ledger block appended)
       └──────────────┘
```

1. **Active Excursion**: Created when a reading crosses configured thresholds. At most one active alert of a given type exists per shipment.
2. **Distinct Acknowledgment (`POST /api/v1/sensors/sensor-alerts/{id}/acknowledge`)**:
   - Allowed roles: Driver, Transporter, Warehouse Manager, Admin.
   - Enforces action capability `alerts:acknowledge`.
   - Records operator notes; transitions status to `ACKNOWLEDGED`.
   - **Does NOT resolve or close the alert**.
3. **Distinct Resolution (`POST /api/v1/sensors/sensor-alerts/{id}/resolve`)**:
   - Allowed roles: Transporter, Admin.
   - Enforces action capability `alerts:resolve`.
   - Requires non-blank corrective action description.
   - Sets status to `RESOLVED`, records resolution timestamp, and logs `SENSOR_ALERT_RESOLVED` to the audit ledger.
4. **Excursion Duration**:
   - Calculated as $\Delta t = t_\text{resolved} - t_\text{created}$ (or $t_\text{now} - t_\text{created}$ if still active). Exposed across quality and cold-chain analytics.

---

## 4. Simulation Execution Modes

### 4.1 On-Demand Manual Stepping
- `POST /api/v1/sensors/shipments/{id}/simulation/next-reading`
- Generates the next discrete step index on demand for active shipments.

### 4.2 Automated Lease-Coordinated Background Playback
- Sessions can be initiated via `POST /api/v1/sensors/shipments/{id}/simulation/sessions`.
- Supports `pause`, `resume`, and `stop` controls.
- Background worker processes poll due sessions using expiring MongoDB leases (`claimed_by`, `lease_expires_at`), preventing duplicate ticks across multiple application instances.
