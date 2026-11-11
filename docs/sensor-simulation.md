# On-demand sensor simulation

Sensor values are simulated, not physical telemetry. During `IN_TRANSIT`, an authorized driver, transporter, or admin can request one reading with `NORMAL` or `TEMP_EXCURSION`. The generator uses the shipment ID, scenario, and persisted reading count as a deterministic seed. Each reading stores its temperature, humidity, configured handling range, status, timestamp, and simulated source label.

For tomatoes, the configured temperature range is 7–13 °C. A `TEMP_EXCURSION` produces out-of-range temperatures after several readings. An active temperature or humidity alert is created when a reading breaches its range, with at most one active alert per shipment and type. Resolving an alert requires a nonblank corrective action and records `SENSOR_ALERT_RESOLVED` in the ledger. There are no background sensor sessions, timers, pause/resume endpoints, or hardware integrations.
