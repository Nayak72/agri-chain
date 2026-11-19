"""Bounded, lease-coordinated simulated telemetry playback worker.

Each application process runs at most one polling loop. MongoDB leases and the
session sequence are checked inside the reading transaction so multiple workers
cannot commit the same scheduled step. Playback stops on authorization changes
or operational errors; no real devices are contacted.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone
from bson import ObjectId
from pymongo import ReturnDocument
from app.core.exceptions import ConflictError

logger = logging.getLogger(__name__)


async def run_simulation_worker(db):
    owner = uuid.uuid4().hex
    try:
        while True:
            now = datetime.now(timezone.utc)
            try:
                claimed = await db.simulation_sessions.find_one_and_update(
                    {'state': 'RUNNING', 'auto_play': True, 'auto_next_at': {'$lte': now},
                     '$or': [{'auto_lease_until': None}, {'auto_lease_until': {'$lte': now}}]},
                    {'$set': {'auto_lease_owner': owner, 'auto_lease_until': now + timedelta(seconds=30)}},
                    sort=[('auto_next_at', 1)], return_document=ReturnDocument.AFTER)
            except Exception:
                logger.exception('Simulation worker could not claim a session')
                await asyncio.sleep(5)
                continue
            if not claimed:
                await asyncio.sleep(2)
                continue
            try:
                actor_id = claimed.get('created_by', '')
                if not ObjectId.is_valid(actor_id):
                    raise ValueError('Simulation creator is unavailable')
                actor = await db.users.find_one({'_id': ObjectId(actor_id)})
                if not actor or not actor.get('is_active', True) or not actor.get('is_approved', True):
                    raise ValueError('Simulation creator is no longer active and approved')
                from app.api.v1.endpoints.sensors import ReadingRequest, _generate_reading
                await _generate_reading(claimed['shipment_id'], ReadingRequest(session_id=claimed['simulation_id']),
                                        {'sub': actor_id, 'role': actor.get('role')}, db, auto_owner=owner)
            except ConflictError:
                # State, lease, or schedule changed while another transaction ran.
                shipment_id = claimed.get('shipment_id', '')
                shipment = await db.shipments.find_one({'_id': ObjectId(shipment_id)}) if ObjectId.is_valid(shipment_id) else None
                retry_at = datetime.now(timezone.utc) + timedelta(seconds=2)
                changes = {'auto_lease_owner': None, 'auto_lease_until': None, 'auto_next_at': retry_at}
                if not shipment or shipment.get('status') != 'IN_TRANSIT':
                    changes.update(auto_play=False, auto_error='Playback stopped because the shipment is no longer in transit')
                await db.simulation_sessions.update_one(
                    {'_id': claimed['_id'], 'auto_lease_owner': owner},
                    {'$set': changes})
            except asyncio.CancelledError:
                raise
            except Exception:
                logger.exception('Automatic simulated reading failed for session %s', claimed.get('simulation_id'))
                await db.simulation_sessions.update_one(
                    {'_id': claimed['_id'], 'auto_lease_owner': owner},
                    {'$set': {'auto_play': False, 'auto_error': 'Playback stopped; check shipment status and authorization',
                              'auto_lease_owner': None, 'auto_lease_until': None, 'updated_at': datetime.now(timezone.utc)}})
            # Yield after every job to keep each worker bounded and responsive.
            await asyncio.sleep(0.1)
    finally:
        try:
            await db.simulation_sessions.update_many({'auto_lease_owner': owner},
                {'$set': {'auto_lease_owner': None, 'auto_lease_until': None}})
        except Exception:
            logger.exception('Could not release simulation worker leases; they will expire')
