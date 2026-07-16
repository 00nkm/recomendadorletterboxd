from services.database import SessionLocal
from services.models import SyncJob


def create_sync_job(username: str) -> SyncJob:
    db = SessionLocal()
    try:
        job = SyncJob(username=username, status='pending')
        db.add(job)
        db.commit()
        db.refresh(job)
        return job
    finally:
        db.close()


def update_sync_job(job_id: int, status: str, message: str | None = None, film_count: int | None = None) -> None:
    db = SessionLocal()
    try:
        job = db.get(SyncJob, job_id)
        if not job:
            return
        job.status = status
        if message is not None:
            job.message = message
        if film_count is not None:
            job.film_count = film_count
        db.commit()
    finally:
        db.close()


def get_latest_sync_job(username: str) -> SyncJob | None:
    db = SessionLocal()
    try:
        return db.query(SyncJob).filter(SyncJob.username == username).order_by(SyncJob.id.desc()).first()
    finally:
        db.close()
