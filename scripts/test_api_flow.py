import asyncio
import os
from fastapi.testclient import TestClient
from api.app import app
from services.db import init_db
from services.database import engine
from sqlalchemy import text

schema_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'schema.sql')
init_db(schema_path)

client = TestClient(app)

username = 'apitestuser'

print('Starting sync...')
resp = client.post('/sync-start', json={'username': username})
print('sync-start:', resp.status_code, resp.json())
job_id = resp.json().get('job_id')

for _ in range(6):
    resp = client.get(f'/sync-status/{username}')
    print('sync-status:', resp.status_code, resp.json())
    if resp.json().get('status') in ('completed', 'failed'):
        break
    asyncio.sleep(1)

resp = client.get(f'/recommendations/{username}')
print('recommendations:', resp.status_code, resp.json())
