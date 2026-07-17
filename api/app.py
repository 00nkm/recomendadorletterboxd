import os
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from services.ingest.job import create_sync_job, get_latest_sync_job
from services.ingest.poller import fetch_rss_entries, scrape_user_pages
from services.recommendation.engine import recommend_for_user
from services.recommendation.rerank import rerank_with_llm
from typing import Optional
from services.enrichment.enrich_job import enrich_and_save_film
from services.database import SessionLocal
from services.models import User, UserFilm, FilmEmbeddingJson


class EnrichRequest(BaseModel):
    title: str
    source_link: Optional[str] = None

app = FastAPI(title="Recomendador Letterboxd - MVP")
app.mount('/static', StaticFiles(directory=os.path.join(os.path.dirname(__file__), '..', 'web')), name='static')

frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'dist')
if os.path.isdir(frontend_dir):
    app.mount('/app', StaticFiles(directory=frontend_dir, html=True), name='frontend')

@app.get('/')
async def root():
    return RedirectResponse(url='/app/', status_code=307)


class SyncRequest(BaseModel):
    username: str

@app.post('/sync-start')
async def sync_start(req: SyncRequest):
    job = create_sync_job(req.username)
    # O await garante que o Vercel não corte o processo
    await fetch_rss_entries(req.username, job_id=job.id)
    return {"status": "sync_completed", "username": req.username, "job_id": job.id}


@app.get('/sync-status/{username}')
async def sync_status(username: str):
    db = SessionLocal()
    try:
        job = get_latest_sync_job(username)
        user = db.query(User).filter(User.username == username).one_or_none()
        film_count = 0
        created_at = None
        if user:
            film_count = db.query(UserFilm).filter(UserFilm.user_id == user.id).count()
            if hasattr(user, 'created_at') and user.created_at is not None:
                created_at = user.created_at.isoformat()

        if not job:
            return {"username": username, "status": "not_started", "film_count": film_count, "job_id": None, "created_at": created_at}

        return {
            "username": username,
            "status": job.status,
            "job_id": job.id,
            "job_message": job.message,
            "film_count": film_count,
            "created_at": created_at,
        }
    finally:
        db.close()


@app.get('/recommendations/{username}')
async def recommendations(
    username: str,
    limit: int = 10,
    rerank: bool = False,
    genre: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    only_unseen: bool = True,
):
    recs = await recommend_for_user(username, limit=limit, genre=genre, min_year=min_year, max_year=max_year, only_unseen=only_unseen)
    if rerank:
        user_summary = f"Usuário {username} — histórico recente de {len(recs)} recomendações geradas."
        try:
            recs = rerank_with_llm(recs, user_summary=user_summary)
        except Exception:
            pass
    return {"username": username, "recommendations": recs}


@app.post('/enrich')
async def enrich(req: EnrichRequest):
    db = SessionLocal()
    try:
        film = await enrich_and_save_film(db, req.title, req.source_link)
        return {"status": "ok", "film": {"id": film.id, "title": film.title, "tmdb_id": film.tmdb_id}}
    finally:
        db.close()
