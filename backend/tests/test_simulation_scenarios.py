import pytest
from app.services.sensor_simulator import generate_stateless_reading

@pytest.mark.parametrize('scenario,field,step,limit', [
    ('TEMP_EXCURSION', 'temperature', 3, 'configured_temp_max'),
    ('HUMIDITY_EXCURSION', 'humidity', 3, 'configured_humidity_max'),
    ('DOOR_OPEN_EVENT', 'temperature', 2, 'configured_temp_max'),
    ('REFRIGERATION_FAILURE', 'temperature', 3, 'configured_temp_max'),
    ('RECOVERY_AFTER_EXCURSION', 'temperature', 0, 'configured_temp_max'),
])
def test_scenarios_are_reproducible_and_cross_correct_limit(scenario, field, step, limit):
    first = generate_stateless_reading('same-seed', 'TOMATO', scenario, step)
    assert first == generate_stateless_reading('same-seed', 'TOMATO', scenario, step)
    assert first[field] > first[limit]

def test_normal_readings_stay_within_produce_ranges():
    for step in range(100):
        reading = generate_stateless_reading('seed', 'TOMATO', 'NORMAL', step)
        assert reading['configured_temp_min'] <= reading['temperature'] <= reading['configured_temp_max']
        assert reading['configured_humidity_min'] <= reading['humidity'] <= reading['configured_humidity_max']
