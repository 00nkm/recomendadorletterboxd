import json
from typing import Optional
from services.enrichment.tmdb_cache import TMDBCache
from services.models import Film, FilmEmbeddingJson
from services.enrichment.embeddings import generate_embedding
from sqlalchemy.orm import Session


async def enrich_and_save_film(db: Session, title: str, source_link: Optional[str] = None) -> Film:
    """Busca metadados no TMDB por título, salva Film e embedding no DB."""
    tmdb = TMDBCache()
    # Busca TMDB por título usando cache
    try:
        results = await tmdb.search_movie(title)
    except Exception:
        results = {'results': []}

    data = None
    if results.get('results'):
        data = results['results'][0]

    if data:
        tmdb_id = data.get('id')
        detail = None
        try:
            detail = await tmdb.get_movie(tmdb_id)
        except Exception:
            detail = None

        overview = data.get('overview')
        year = None
        language = None
        genres = None
        poster_path = data.get('poster_path')
        if detail:
            overview = detail.get('overview') or overview
            poster_path = detail.get('poster_path') or poster_path
            language = detail.get('original_language')
            try:
                year = int(detail.get('release_date', '').split('-')[0]) if detail.get('release_date') else None
            except Exception:
                year = None
            genres = [g.get('name') for g in detail.get('genres', []) if g.get('name')]
        else:
            if data.get('release_date'):
                try:
                    year = int(data['release_date'].split('-')[0])
                except Exception:
                    year = None
            genres = []

        film = db.query(Film).filter(Film.tmdb_id == tmdb_id).one_or_none()
        if not film:
            film = Film(
                tmdb_id=tmdb_id,
                title=data.get('title') or title,
                year=year,
                original_language=language,
                genres=genres,
                overview=overview,
                poster_path=poster_path,
            )
            db.add(film)
            db.commit()
            db.refresh(film)
        else:
            film.title = data.get('title') or title
            film.year = year
            film.original_language = language
            film.genres = genres
            film.overview = overview
            film.poster_path = poster_path
            db.commit()
    else:
        # fallback: criar filme mínimo
        film = Film(title=title)
        db.add(film)
        db.commit()
        db.refresh(film)

    # Gerar embedding para o filme (sinopse + title)
    text_for_embedding = (film.overview or '') + ' ' + (film.title or '')
    try:
        emb = generate_embedding(text_for_embedding)
        existing = db.query(FilmEmbeddingJson).filter(FilmEmbeddingJson.film_id == film.id).one_or_none()
        if existing:
            existing.embedding = emb
        else:
            obj = FilmEmbeddingJson(film_id=film.id, embedding=emb)
            db.add(obj)
        db.commit()
    except Exception:
        db.rollback()
        # Logging omitido — se embedding falhar, seguimos sem ele
        pass

    return film
