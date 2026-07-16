import json
import os
import re
from collections import Counter
from typing import List, Dict
from urllib.parse import quote

import numpy as np
from services.database import SessionLocal
from services.enrichment.embeddings import generate_embedding
from services.models import User, UserFilm, Film, FilmEmbeddingJson
from services.recommendation.rerank import explain_candidates_with_llm


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    if a.size == 0 or b.size == 0:
        return 0.0
    num = float(np.dot(a, b))
    den = float(np.linalg.norm(a) * np.linalg.norm(b))
    if den == 0:
        return 0.0
    return num / den


def _weight_for_user_film(uf: UserFilm) -> float:
    if getattr(uf, 'favorite', False):
        return 1.8
    if getattr(uf, 'in_watchlist', False):
        return 0.8
    rating = getattr(uf, 'rating', None)
    if rating is not None:
        try:
            val = float(rating)
            return max(0.6, min(1.8, val / 5.0))
        except Exception:
            pass
    return 1.0


def _normalize_genres(genres: List[str] | None) -> List[str]:
    if not genres:
        return []
    return [g.strip() for g in genres if g and g.strip()]


def _ensure_embedding(db, film: Film) -> np.ndarray:
    emb_row = db.query(FilmEmbeddingJson).filter(FilmEmbeddingJson.film_id == film.id).one_or_none()
    if emb_row and emb_row.embedding:
        try:
            if isinstance(emb_row.embedding, str):
                emb_data = json.loads(emb_row.embedding)
            else:
                emb_data = emb_row.embedding
            return np.array(emb_data, dtype=float)
        except Exception:
            pass

    text = ' '.join(filter(None, [film.title, film.overview or '', ' '.join(_normalize_genres(film.genres))]))
    vector = generate_embedding(text)
    if emb_row:
        emb_row.embedding = vector
    else:
        db.add(FilmEmbeddingJson(film_id=film.id, embedding=vector))
    db.commit()
    return np.array(vector, dtype=float)


def _build_poster_url(film: Film) -> str | None:
    if film.poster_path:
        return f'https://image.tmdb.org/t/p/w342{film.poster_path}'

    title = re.sub(r'[^a-zA-Z0-9]+', ' ', film.title or 'movie').strip() or 'movie'
    genres = ','.join(_normalize_genres(film.genres)[:2]) or 'film'
    svg = f"""
    <svg xmlns='http://www.w3.org/2000/svg' width='342' height='513' viewBox='0 0 342 513'>
      <rect width='342' height='513' fill='#111113'/>
      <rect x='24' y='24' width='294' height='465' rx='18' fill='#1b1b20' stroke='#d4a647' stroke-width='2'/>
      <text x='171' y='215' text-anchor='middle' font-family='Arial, sans-serif' font-size='28' fill='#ede9e3'>{title}</text>
      <text x='171' y='260' text-anchor='middle' font-family='Arial, sans-serif' font-size='18' fill='#d4a647'>{genres}</text>
      <text x='171' y='430' text-anchor='middle' font-family='Arial, sans-serif' font-size='14' fill='#9e9a94'>Recommended for you</text>
    </svg>
    """
    return 'data:image/svg+xml;charset=UTF-8,' + quote(svg)


def _build_profile_summary(user_films: List[UserFilm], film_lookup: Dict[int, Film]) -> Dict[str, object]:
    genre_counter = Counter()
    year_counter = Counter()
    title_counter = Counter()
    for uf in user_films:
        film = film_lookup.get(uf.film_id)
        if not film:
            continue
        for genre in _normalize_genres(film.genres):
            genre_counter[genre.lower()] += 1
        if film.year:
            year_counter[film.year] += 1
        title_counter[film.title or 'Untitled'] += 1

    top_genres = [genre for genre, _ in genre_counter.most_common(4)]
    top_years = [year for year, _ in year_counter.most_common(3)]
    favorite_titles = [title for title, _ in title_counter.most_common(3)]
    return {'genres': top_genres, 'years': top_years, 'titles': favorite_titles}


def _build_explanation(candidate: Film, profile_summary: Dict[str, object]) -> str:
    genres = profile_summary.get('genres', []) or []
    years = profile_summary.get('years', []) or []
    titles = profile_summary.get('titles', []) or []
    genre_text = ', '.join(genres[:3]) if genres else 'drama'
    year_text = ', '.join(map(str, years[:2])) if years else 'recent years'
    title_text = titles[0] if titles else 'your recent watches'
    return (
        f"It aligns with your taste for {genre_text} and your recent interest in {year_text}. "
        f"It also fits the same mood and storytelling patterns you seem to enjoy from {title_text}."
    )


async def recommend_for_user(
    username: str,
    limit: int = 10,
    genre: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    only_unseen: bool = True,
) -> List[Dict]:
    """Gera recomendações com base em perfil do usuário, avaliações e similaridade semântica."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).one_or_none()
        if not user:
            return []

        user_films = db.query(UserFilm).filter(UserFilm.user_id == user.id).all()
        if not user_films:
            films = db.query(Film).all()
            return [
                {
                    'film_id': film.id,
                    'tmdb_id': film.tmdb_id,
                    'title': film.title,
                    'year': film.year,
                    'genres': _normalize_genres(film.genres),
                    'language': film.original_language,
                    'poster_url': _build_poster_url(film),
                    'match_score': 0.75,
                    'explanation': 'A starter recommendation based on the catalog while your profile is still being built.',
                }
                for film in films[:limit]
            ]

        film_lookup = {film.id: film for film in db.query(Film).all()}
        profile_summary = _build_profile_summary(user_films, film_lookup)
        profile_vecs = []
        weights = []
        seen_film_ids = set()

        for uf in user_films:
            seen_film_ids.add(uf.film_id)
            film = film_lookup.get(uf.film_id)
            if not film:
                continue
            vec = _ensure_embedding(db, film)
            weight = _weight_for_user_film(uf)
            profile_vecs.append(vec * weight)
            weights.append(weight)

        if not profile_vecs:
            return []

        profile = np.sum(profile_vecs, axis=0) / (sum(weights) or 1.0)

        candidates: List[Dict] = []
        for film in film_lookup.values():
            if film.id in seen_film_ids and only_unseen:
                continue
            if genre:
                if not film.genres or genre.lower() not in [g.lower() for g in _normalize_genres(film.genres)]:
                    continue
            if min_year and (not film.year or film.year < min_year):
                continue
            if max_year and (not film.year or film.year > max_year):
                continue

            vec = _ensure_embedding(db, film)
            sem_score = cosine_similarity(profile, vec)
            film_genres = _normalize_genres(film.genres)
            profile_genres = [g.lower() for g in profile_summary.get('genres', []) or []]
            genre_overlap = len(set(film_genres).intersection(set(profile_genres))) / max(1, len(profile_genres)) if profile_genres else 0.0
            decade_match = 1.0 if film.year and profile_summary.get('years') and film.year in profile_summary.get('years', []) else 0.0
            score = (0.7 * sem_score) + (0.2 * genre_overlap) + (0.1 * decade_match)
            candidates.append({
                'film': film,
                'score': float(score),
                'sem_score': float(sem_score),
            })

        candidates.sort(key=lambda item: item['score'], reverse=True)
        ranked_candidates = candidates[:limit]

        results = []
        for item in ranked_candidates:
            film = item['film']
            explanation = _build_explanation(film, profile_summary)
            results.append({
                'film_id': film.id,
                'tmdb_id': film.tmdb_id,
                'title': film.title,
                'year': film.year,
                'genres': _normalize_genres(film.genres),
                'language': film.original_language,
                'poster_url': _build_poster_url(film),
                'match_score': round(float(item['score']), 4),
                'explanation': explanation,
            })

        if results:
            explanations = explain_candidates_with_llm(
                results,
                user_summary=f"Usuario {username} com interesse em {', '.join(profile_summary.get('genres', [])[:3]) or 'filmes variados'}",
            )
            for result, explained in zip(results, explanations):
                result['explanation'] = explained.get('explanation', result['explanation'])
        return results
    finally:
        db.close()
