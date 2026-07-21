import os
import httpx
from datetime import datetime
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from services.ingest.job import create_sync_job, get_latest_sync_job
from services.ingest.poller import fetch_rss_entries, scrape_user_pages
from services.recommendation.engine import recommend_for_user, recommend_for_couple
from services.recommendation.rerank import rerank_with_llm
from typing import Optional
from services.enrichment.enrich_job import enrich_and_save_film
from services.database import SessionLocal
from services.models import User, UserFilm, FilmEmbeddingJson

class FeedbackRequest(BaseModel):
    username: str
    tmdb_id: int
    title: str
    action: str

class EnrichRequest(BaseModel):
    title: str
    source_link: Optional[str] = None

class SyncRequest(BaseModel):
    username: str

app = FastAPI(title="Recomendador Letterboxd - MVP")

app.mount('/static', StaticFiles(directory=os.path.join(os.path.dirname(__file__), '..', 'web')), name='static')

frontend_dir = os.path.join(os.path.dirname(__file__), '..', 'dist')
if os.path.isdir(frontend_dir):
    app.mount('/app', StaticFiles(directory=frontend_dir, html=True), name='frontend')

@app.get('/')
async def root():
    return RedirectResponse(url='/app/', status_code=307)

@app.post('/sync-start')
async def sync_start(req: SyncRequest):
    job = create_sync_job(req.username)
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

@app.get('/recommendations/couple')
async def couple_recommendations(user1: str, user2: str, limit: int = 6, exclude: str | None = None, page: int = 1):
    data = await recommend_for_couple(user1, user2, limit, exclude, page)
    return data

@app.get('/recommendations/{username}')
async def recommendations(
    username: str,
    limit: int = 10,
    page: int = 1,
    reference_movie: str | None = None,
    rerank: bool = False,
    genre: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    only_unseen: bool = True,
    exclude: str | None = None,
):
    recs = await recommend_for_user(
        username=username, 
        limit=limit, 
        page=page,
        reference_movie=reference_movie,
        genre=genre, 
        min_year=min_year, 
        max_year=max_year, 
        only_unseen=only_unseen,
        exclude=exclude
    )
    return {"username": username, "page": page, "recommendations": recs}

# --- NOVA ROTA DE GALERIA DE IMAGENS ---
@app.get('/movie-images/{tmdb_id}')
async def movie_images(tmdb_id: int):
    api_key = os.getenv('TMDB_API_KEY')
    if not api_key:
        return {"images": []}
    
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/images"
    # include_image_language=null,en força o TMDB a devolver fotos limpas (sem logos/títulos na imagem)
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            r = await client.get(url, params={"api_key": api_key, "include_image_language": "null,en"})
            if r.status_code == 200:
                data = r.json()
                backdrops = data.get("backdrops", [])[:6]
                urls = [f"https://image.tmdb.org/t/p/w780{b['file_path']}" for b in backdrops]
                return {"images": urls}
        except Exception:
            pass
    return {"images": []}

@app.post('/enrich')
async def enrich(req: EnrichRequest):
    db = SessionLocal()
    try:
        film = await enrich_and_save_film(db, req.title, req.source_link)
        return {"status": "ok", "film": {"id": film.id, "title": film.title, "tmdb_id": film.tmdb_id}}
    finally:
        db.close()

@app.post('/feedback')
async def submit_feedback(req: FeedbackRequest):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == req.username).one_or_none()
        if not user:
            return {"status": "error", "message": "Usuário não encontrado"}
            
        film = await enrich_and_save_film(db, req.title)
        
        uf = db.query(UserFilm).filter(UserFilm.user_id == user.id, UserFilm.film_id == film.id).one_or_none()
        if not uf:
            uf = UserFilm(user_id=user.id, film_id=film.id)
            db.add(uf)
            
        now = datetime.now()
        if req.action == 'seen':
            uf.watched_at = now
        elif req.action == 'liked':
            uf.favorite = True
            uf.watched_at = now
        elif req.action == 'disliked':
            uf.disliked = True
            uf.watched_at = now
            
        db.commit()
        return {"status": "success"}
    finally:
        db.close()