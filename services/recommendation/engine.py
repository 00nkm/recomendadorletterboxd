import json
import os
from typing import List, Dict
from services.database import SessionLocal
from services.models import User, UserFilm, Film
from services.enrichment.enrich_job import enrich_and_save_film
import openai

def _build_poster_url(film: Film) -> str | None:
    if film.poster_path:
        return f'https://image.tmdb.org/t/p/w342{film.poster_path}'
    return None

async def recommend_for_user(
    username: str,
    limit: int = 10,
    genre: str | None = None,
    min_year: int | None = None,
    max_year: int | None = None,
    only_unseen: bool = True,
) -> List[Dict]:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == username).one_or_none()
        if not user:
            return []
            
        user_films = db.query(UserFilm).filter(UserFilm.user_id == user.id).all()
        film_lookup = {film.id: film for film in db.query(Film).all()}
        
        favoritos = [film_lookup[uf.film_id].title for uf in user_films if uf.favorite and uf.film_id in film_lookup]
        assistidos = [film_lookup[uf.film_id].title for uf in user_films if uf.film_id in film_lookup][:25]
        
        client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        
        perfil = (
            f"O perfil {username} tem preferência pelas obras: {', '.join(favoritos[:10])}. "
            f"Histórico recente: {', '.join(assistidos)}. "
        )
        
        filtros = ""
        if genre:
            filtros += f"Traga apenas o gênero {genre}. "
        if min_year and max_year:
            filtros += f"Somente títulos lançados entre {min_year} e {max_year}. "
            
        prompt = (
            f"Você atua como um curador cinematográfico de alto nível. Analise as informações: {perfil} "
            f"{filtros}"
            "Encontre paralelos do gosto do usuário em tópicos do r/TrueFilm, r/movies do Reddit e listas aclamadas do Letterboxd. "
            f"Gere {limit} indicações excelentes que o usuário não tenha visto. "
            "Responda estritamente com um JSON: "
            "{\"recommendations\": [{\"title\": \"Nome Original em Inglês\", \"year\": 2000, \"match_score\": 95, \"explanation\": \"Justificativa técnica da escolha.\"}]}"
        )
        
        response = client.chat.completions.create(
            model=os.getenv('OPENAI_CHAT_MODEL', 'gpt-4o-mini'),
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        
        data = json.loads(response.choices[0].message.content)
        rec_list = data.get('recommendations', [])
        
        results = []
        for item in rec_list:
            # O backend localiza o poster real no TMDB antes de enviar ao frontend
            film_obj = await enrich_and_save_film(db, item['title'])
            
            results.append({
                'film_id': film_obj.id,
                'tmdb_id': film_obj.tmdb_id,
                'title': film_obj.title,
                'year': film_obj.year,
                'genres': film_obj.genres if film_obj.genres else [],
                'language': film_obj.original_language,
                'poster_url': _build_poster_url(film_obj),
                'match_score': item.get('match_score', 90),
                'explanation': item.get('explanation', '')
            })
            
        return results
    finally:
        db.close()
