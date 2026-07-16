import math
from typing import List, Dict
from services.database import SessionLocal
from services.models import User, UserFilm, Film, FilmEmbeddingJson
import json
import numpy as np


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    num = float(np.dot(a, b))
    den = float(np.linalg.norm(a) * np.linalg.norm(b))
    if den == 0:
        return 0.0
    return num / den


async def recommend_for_user(
    username: str,
    limit: int = 10,
    genre: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    only_unseen: bool = True,
) -> List[Dict]:
    """Gera recomendações simples por similaridade de embedding.

    - Constrói embedding de perfil do usuário como média ponderada
    - Calcula similaridade com todas as embeddings de filmes
    - Exclui filmes já vistos pelo usuário
    - Aplica filtros de gênero e ano
    - Retorna top-N com explicação textual simples
    """
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).one_or_none()
        if not user:
            return []

        # buscar filmes do usuário
        user_films = db.query(UserFilm).filter(UserFilm.user_id == user.id).all()
        if not user_films:
            return []

        # coletar embeddings dos filmes do usuário
        profile_vecs = []
        weights = []
        seen_film_ids = set()
        for uf in user_films:
            seen_film_ids.add(uf.film_id)
            emb_row = db.query(FilmEmbeddingJson).filter(FilmEmbeddingJson.film_id == uf.film_id).one_or_none()
            if not emb_row or not emb_row.embedding:
                continue
            try:
                emb_data = emb_row.embedding
                if isinstance(emb_data, str):
                    emb_data = json.loads(emb_data)
                vec = np.array(emb_data, dtype=float)
            except Exception:
                continue
            w = float(uf.rating) if getattr(uf, 'rating', None) else 1.0
            profile_vecs.append(vec * w)
            weights.append(w)

        if not profile_vecs:
            return []

        # média ponderada
        profile = np.sum(profile_vecs, axis=0) / (sum(weights) or 1.0)

        # buscar todos embeddings e calcular similaridade
        candidates = []
        all_embs = db.query(FilmEmbeddingJson).all()
        for row in all_embs:
            if row.film_id in seen_film_ids and only_unseen:
                continue
            try:
                emb_data = row.embedding
                if isinstance(emb_data, str):
                    emb_data = json.loads(emb_data)
                vec = np.array(emb_data, dtype=float)
            except Exception:
                continue
            film = db.query(Film).filter(Film.id == row.film_id).one_or_none()
            if not film:
                continue
            if genre:
                if not film.genres or genre.lower() not in [g.lower() for g in film.genres]:
                    continue
            if min_year and (not film.year or film.year < min_year):
                continue
            if max_year and (not film.year or film.year > max_year):
                continue
            sim = cosine_similarity(profile, vec)
            candidates.append((row.film_id, float(sim)))

        # ordenar por similaridade desc
        candidates.sort(key=lambda x: x[1], reverse=True)
        results = []
        for film_id, score in candidates[:limit]:
            film = db.query(Film).filter(Film.id == film_id).one_or_none()
            if not film:
                continue
            poster_url = None
            if film.poster_path:
                poster_url = f'https://image.tmdb.org/t/p/w342{film.poster_path}'
            results.append({
                'film_id': film_id,
                'tmdb_id': film.tmdb_id,
                'title': film.title,
                'year': film.year,
                'genres': film.genres,
                'language': film.original_language,
                'poster_url': poster_url,
                'match_score': round(float(score), 4),
                'explanation': f"Recomendado pois combina com seus filmes preferidos por tema/descrição (match {round(float(score),3)})"
            })
        return results
    finally:
        db.close()
