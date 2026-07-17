import json
import os
import re
import httpx
from typing import List, Dict
from services.database import SessionLocal
from services.models import User, UserFilm, Film
from services.enrichment.enrich_job import enrich_and_save_film

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
            "Responda estritamente com um JSON nesta estrutura: "
            "{\"recommendations\": [{\"title\": \"Nome Original em Inglês\", \"year\": 2000, \"match_score\": 95, \"explanation\": \"Justificativa técnica da escolha.\"}]}"
        )

        api_key = os.getenv('GROQ_API_KEY', '').strip()
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3-70b-8192",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.7
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resposta = await client.post(url, headers=headers, json=payload)
            
            if resposta.status_code != 200:
                print(f"Erro na API do Groq: {resposta.text}")
                
            resposta.raise_for_status()
            dados_groq = resposta.json()
            
            try:
                texto_json = dados_groq["choices"][0]["message"]["content"]
                match = re.search(r'\{.*\}', texto_json, re.DOTALL)
                texto_limpo = match.group(0) if match else texto_json
                data = json.loads(texto_limpo)
            except Exception as e:
                print(f"Falha ao processar o JSON: {e} | Retorno original: {dados_groq}")
                data = {"recommendations": []}
        
        rec_list = data.get('recommendations', [])
        
        results = []
        for item in rec_list:
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
