import re
from email.utils import parsedate_to_datetime
from typing import List, Dict, Optional
from services.database import SessionLocal
from services.ingest.job import update_sync_job
from services.models import User, Film, UserFilm
from services.enrichment.enrich_job import enrich_and_save_film
from sqlalchemy.exc import NoResultFound
from datetime import datetime


def _extract_rating(description: Optional[str]) -> int | None:
    if not description:
        return None
    match = re.search(r'rated it\s*(\d(?:\.\d)?)\s*/\s*5', description, re.IGNORECASE)
    if match:
        try:
            value = float(match.group(1))
            return int(round(value))
        except Exception:
            return None
    return None


async def process_rss_items(username: str, items: List[Dict], job_id: int | None = None) -> int:
    """Persiste entradas do RSS no banco e dispara enriquecimento.

    Nota: função async para compatibilidade com callers async, mas usa DB sync.
    """
    db = SessionLocal()
    try:
        if job_id is not None:
            update_sync_job(job_id, 'processing', message=f'Processando {len(items)} itens')

        user = db.query(User).filter(User.username == username).one_or_none()
        if not user:
            user = User(username=username)
            db.add(user)
            db.commit()
            db.refresh(user)

        for it in items:
            title = it.get('title') or 'Untitled'
            link = it.get('link')
            pubDate = it.get('pubDate')
            try:
                film = db.query(Film).filter(Film.title == title).one_or_none()
                if not film:
                    film = await enrich_and_save_film(db, title, link)

                rating = _extract_rating(it.get('description'))
                existing = db.query(UserFilm).filter(UserFilm.user_id == user.id, UserFilm.film_id == film.id).one_or_none()
                if not existing:
                    watched_at = None
                    try:
                        if pubDate:
                            watched_at = parsedate_to_datetime(pubDate)
                    except Exception:
                        watched_at = None
                    uf = UserFilm(
                        user_id=user.id,
                        film_id=film.id,
                        letterboxd_url=link,
                        watched_at=watched_at,
                        rating=rating,
                        favorite='favorite' in (it.get('description') or '').lower() or 'favourite' in (it.get('description') or '').lower(),
                        in_watchlist='watchlist' in (it.get('description') or '').lower(),
                        tags=it.get('tags', []) # <-- Novo campo
                    )
                    db.add(uf)
            except Exception:
                continue
        db.commit()
        film_count = db.query(UserFilm).filter(UserFilm.user_id == user.id).count()
        if job_id is not None:
            update_sync_job(job_id, 'completed', film_count=film_count)
        return film_count
    finally:
        db.close()
