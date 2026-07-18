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
    page: int = 1,
    reference_movie: str | None = None,
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
        
        # O sistema agora isola os filmes rejeitados para alimentar o filtro negativo da IA
        disliked = [film_lookup[uf.film_id].title for uf in user_films if getattr(uf, 'disliked', False) and uf.film_id in film_lookup]
        assistidos = [film_lookup[uf.film_id].title for uf in user_films if uf.film_id in film_lookup and not getattr(uf, 'disliked', False)][:30]
        
        perfil = (
            f"O perfil {username} tem preferência pelas obras: {', '.join(favoritos[:10])}. "
            f"Histórico recente: {', '.join(assistidos)}. "
        )
        
        filtros = ""
        if genre:
            filtros += f"Traga apenas o gênero {genre}. "
        if min_year and max_year:
            filtros += f"Somente títulos lançados entre {min_year} e {max_year}. "
        if disliked:
            filtros += f"NÃO RECOMENDE os seguintes filmes, o usuário marcou que não gostou deles: {', '.join(disliked[:10])}. "
            
        if reference_movie:
            filtros += f"ATENÇÃO MÁXIMA: O usuário pediu filmes especificamente parecidos com '{reference_movie}'. Use esse filme como âncora principal da curadoria. "

        if page > 1:
            filtros += f"Esta é a página {page} de busca. Pule os resultados mais óbvios e comerciais. Traga joias escondidas (hidden gems) que se encaixem perfeitamente no perfil. "
            
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
        
        # A matemática da temperatura evita repetições em consultas sucessivas
        temperatura_calculada = 0.7 if page == 1 else min(0.95, 0.7 + (page * 0.05))
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": temperatura_calculada
        }

        async def recommend_for_couple(user1_username: str, user2_username: str, limit: int = 6) -> Dict:
    db = SessionLocal()
    try:
        # Busca os dois perfis no banco de dados
        u1 = db.query(User).filter(User.username == user1_username).one_or_none()
        u2 = db.query(User).filter(User.username == user2_username).one_or_none()
        
        if not u1 or not u2:
            return {"watched_together": [], "recommendations": []}
            
        u1_films = db.query(UserFilm).filter(UserFilm.user_id == u1.id).all()
        u2_films = db.query(UserFilm).filter(UserFilm.user_id == u2.id).all()
        
        film_lookup = {film.id: film for film in db.query(Film).all()}
        
        # Encontra a interseção dos filmes assistidos
        u1_film_ids = {uf.film_id for uf in u1_films}
        u2_film_ids = {uf.film_id for uf in u2_films}
        
        # Isola os filmes que possuem a tag específica nos diários
        nenoca_ids_1 = {uf.film_id for uf in u1_films if uf.tags and any('nenoca' in t.lower() for t in uf.tags)}
        nenoca_ids_2 = {uf.film_id for uf in u2_films if uf.tags and any('nenoca' in t.lower() for t in uf.tags)}
        
        # Une as interseções: Filmes marcados com a tag OU presentes nos dois diários
        common_film_ids = u1_film_ids.intersection(u2_film_ids).union(nenoca_ids_1).union(nenoca_ids_2)
        
        watched_together = []
        for fid in list(common_film_ids)[:12]:
            if fid in film_lookup:
                f = film_lookup[fid]
                r1 = next((uf.rating for uf in u1_films if uf.film_id == fid), 0) or 0
                r2 = next((uf.rating for uf in u2_films if uf.film_id == fid), 0) or 0
                watched_together.append({
                    "id": f.id,
                    "tmdb_id": f.tmdb_id,
                    "title": f.title,
                    "year": f.year,
                    "director": "",
                    "posterUrl": _build_poster_url(f),
                    "posterColor": "#1a1228",
                    "rating": {"you": r1, "partner": r2}
                })
                
        # Monta o perfil de gostos individuais
        fav1 = [film_lookup[uf.film_id].title for uf in u1_films if getattr(uf, 'favorite', False) and uf.film_id in film_lookup]
        fav2 = [film_lookup[uf.film_id].title for uf in u2_films if getattr(uf, 'favorite', False) and uf.film_id in film_lookup]
        disliked = [film_lookup[uf.film_id].title for uf in u1_films + u2_films if getattr(uf, 'disliked', False) and uf.film_id in film_lookup]
        
        perfil = f"O parceiro 1 ({user1_username}) ama: {', '.join(fav1[:10])}. O parceiro 2 ({user2_username}) ama: {', '.join(fav2[:10])}. "
        
        filtros = ""
        if disliked:
            filtros += f"NÃO RECOMENDE os seguintes filmes (eles odeiam): {', '.join(disliked[:10])}. "
            
        prompt = (
            f"Você atua como um curador cinematográfico focado em casais. Analise os perfis: {perfil} "
            f"{filtros}"
            "Identifique padrões subjacentes e cruze os gostos. "
            f"Gere {limit} indicações para um encontro perfeito. É crucial que você fuja do óbvio. "
            "Responda estritamente com um JSON nesta estrutura: "
            "{\"recommendations\": [{\"title\": \"Nome Original em Inglês\", \"year\": 2000, \"match_score\": 95, \"explanation\": \"Justifique como a estética e a narrativa do filme atende aos dois gostos.\"}]}"
        )
        
        api_key = os.getenv('GROQ_API_KEY', '').strip()
        url = "https://api.groq.com/openai/v1/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": 0.75
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resposta = await client.post(url, headers=headers, json=payload)
            resposta.raise_for_status()
            dados_groq = resposta.json()
            
            try:
                texto_json = dados_groq["choices"][0]["message"]["content"]
                match = re.search(r'\{.*\}', texto_json, re.DOTALL)
                texto_limpo = match.group(0) if match else texto_json
                data = json.loads(texto_limpo)
            except Exception:
                data = {"recommendations": []}
        
        results = []
        for item in data.get('recommendations', []):
            film_obj = await enrich_and_save_film(db, item['title'])
            results.append({
                'id': film_obj.id,
                'tmdb_id': film_obj.tmdb_id,
                'title': film_obj.title,
                'year': film_obj.year,
                'director': '',
                'genres': film_obj.genres if film_obj.genres else [],
                'posterUrl': _build_poster_url(film_obj),
                'posterColor': '#111113',
                'matchScore': item.get('match_score', 90),
                'reason': item.get('explanation', '')
            })
            
        return {"watched_together": watched_together, "recommendations": results}


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
