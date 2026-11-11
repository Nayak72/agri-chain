import random
from app.core.constants import PRODUCE_HANDLING_PROFILES


def generate_stateless_reading(shipment_id: str, produce_type: str, scenario: str, step: int) -> dict:
    """Generate reproducible simulated values for a persisted sequence position."""
    if scenario not in ("NORMAL", "TEMP_EXCURSION") or step < 0:
        raise ValueError("Unsupported scenario or reading index")
    profile = PRODUCE_HANDLING_PROFILES.get(produce_type, PRODUCE_HANDLING_PROFILES["TOMATO"])
    rng = random.Random(f"{shipment_id}:{scenario}:{step}")
    low, high = profile["min_temp_c"], profile["max_temp_c"]
    humidity_low, humidity_high = profile["min_humidity_pct"], profile["max_humidity_pct"]
    temperature = (low + high) / 2 + rng.gauss(0, 0.3)
    if scenario == "TEMP_EXCURSION" and 3 <= step < 7:
        temperature = high + 1 + (step - 3) * 0.8
    humidity = (humidity_low + humidity_high) / 2 + rng.gauss(0, 1)
    temperature, humidity = round(temperature, 1), round(humidity, 1)
    return {"temperature": temperature, "humidity": humidity,
            "configured_temp_min": low, "configured_temp_max": high,
            "configured_humidity_min": humidity_low, "configured_humidity_max": humidity_high,
            "status": "CRITICAL" if temperature < low or temperature > high or humidity < humidity_low or humidity > humidity_high else "NORMAL"}
