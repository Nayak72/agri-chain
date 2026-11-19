import random
from app.core.constants import PRODUCE_HANDLING_PROFILES


def classify_reading(reading: dict, previous: dict | None) -> str:
    """Classify excursion severity with a small in-range hysteresis margin.

    Critical means at least 2°C/10 percentage points outside the profile, or
    two consecutive out-of-range samples. A previous warning/critical reading
    stays warning until both measurements are at least 0.2°C/1% inside range.
    Alerts remain open until an operator resolves them.
    """
    temp, humidity = reading["temperature"], reading["humidity"]
    low, high = reading["configured_temp_min"], reading["configured_temp_max"]
    hlow, hhigh = reading["configured_humidity_min"], reading["configured_humidity_max"]
    temp_excess = max(low - temp, temp - high, 0)
    humidity_excess = max(hlow - humidity, humidity - hhigh, 0)
    out = temp_excess > 0 or humidity_excess > 0
    required = ("temperature", "humidity", "configured_temp_min", "configured_temp_max",
                "configured_humidity_min", "configured_humidity_max")
    if previous and not all(isinstance(previous.get(key), (int, float)) for key in required):
        previous = None
    previous_out = bool(previous and (
        previous["temperature"] < previous["configured_temp_min"] or
        previous["temperature"] > previous["configured_temp_max"] or
        previous["humidity"] < previous["configured_humidity_min"] or
        previous["humidity"] > previous["configured_humidity_max"]))
    if out and (temp_excess >= 2 or humidity_excess >= 10 or previous_out):
        return "CRITICAL"
    if out:
        return "WARNING"
    if previous and previous.get("status") in ("WARNING", "CRITICAL"):
        if temp < low + 0.2 or temp > high - 0.2 or humidity < hlow + 1 or humidity > hhigh - 1:
            return "WARNING"
    return "NORMAL"


def generate_stateless_reading(shipment_id: str, produce_type: str, scenario: str, step: int) -> dict:
    """Generate reproducible simulated values for a persisted sequence position."""
    if scenario not in ("NORMAL", "TEMP_EXCURSION", "HUMIDITY_EXCURSION", "DOOR_OPEN_EVENT",
                        "REFRIGERATION_FAILURE", "RECOVERY_AFTER_EXCURSION") or step < 0:
        raise ValueError("Unsupported scenario or reading index")
    profile = PRODUCE_HANDLING_PROFILES.get(produce_type, PRODUCE_HANDLING_PROFILES["TOMATO"])
    rng = random.Random(f"{shipment_id}:{scenario}:{step}")
    low, high = profile["min_temp_c"], profile["max_temp_c"]
    humidity_low, humidity_high = profile["min_humidity_pct"], profile["max_humidity_pct"]
    temperature = (low + high) / 2 + rng.gauss(0, 0.3)
    if scenario == "TEMP_EXCURSION" and 3 <= step < 7:
        temperature = high + 1 + (step - 3) * 0.8
    humidity = (humidity_low + humidity_high) / 2 + rng.gauss(0, 1)
    if scenario == "HUMIDITY_EXCURSION" and 3 <= step < 7:
        humidity = humidity_high + 2 + (step - 3) * 1.5
    if scenario == "DOOR_OPEN_EVENT" and 2 <= step < 5:
        temperature = high + 0.7 + (step - 2) * 0.5
        humidity = humidity_high + 2
    if scenario == "REFRIGERATION_FAILURE" and 3 <= step < 10:
        temperature = high + 0.5 + (step - 3) * 0.8
    if scenario == "RECOVERY_AFTER_EXCURSION" and step < 5:
        temperature = high + max(0, 3 - step * 0.75)
    if scenario == "NORMAL":
        temperature = min(high, max(low, temperature))
        humidity = min(humidity_high, max(humidity_low, humidity))
    temperature, humidity = round(temperature, 1), round(min(100, max(0, humidity)), 1)
    return {"temperature": temperature, "humidity": humidity,
            "configured_temp_min": low, "configured_temp_max": high,
            "configured_humidity_min": humidity_low, "configured_humidity_max": humidity_high,
            "status": "CRITICAL" if temperature < low or temperature > high or humidity < humidity_low or humidity > humidity_high else "NORMAL"}
