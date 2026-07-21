import json
import os
import re
import httpx
import asyncio
from typing import List, Dict
from services.database import SessionLocal
from services.models import User, UserFilm, Film
from services.enrichment.enrich_job import enrich_and_save_film

def _build_poster_url(film: Film) -> str | None:
    if film.poster_path:
        return f'https://image.tmdb.org/t/p/w342{film.poster_path}'
    return None

# Wrappers de segurança: abrem conexões isoladas para permitir processamento simultâneo
async def _safe_enrich_single(item: dict) -> dict | None:
    local_db = SessionLocal()
    try:
        film_obj = await enrich_and_save_film(local_db, item['title'], suggested_year=item.get('year'))
        if not film_obj:
            return None
        return {
            'film_id': film_obj.id,
            'tmdb_id': film_obj.tmdb_id,
            'title': film_obj.title,
            'year': film_obj.year,
            'genres': list(film_obj.genres) if film_obj.genres else [],
            'language': film_obj.original_language,
            'poster_url': _build_poster_url(film_obj),
            'match_score': item.get('match_score', 90),
            'explanation': item.get('explanation', '')
        }
    except Exception as e:
        print(f"Erro no processamento paralelo: {e}")
        return None
    finally:
        local_db.close()

async def _safe_enrich_couple(item: dict) -> dict | None:
    local_db = SessionLocal()
    try:
        film_obj = await enrich_and_save_film(local_db, item['title'], suggested_year=item.get('year'))
        if not film_obj:
            return None
        return {
            'id': film_obj.id,
            'tmdb_id': film_obj.tmdb_id,
            'title': film_obj.title,
            'year': film_obj.year,
            'director': '',
            'genres': list(film_obj.genres) if film_obj.genres else [],
            'posterUrl': _build_poster_url(film_obj),
            'posterColor': '#111113',
            'matchScore': item.get('match_score', 90),
            'reason': item.get('explanation', '')
        }
    except Exception as e:
        print(f"Erro no processamento paralelo de casal: {e}")
        return None
    finally:
        local_db.close()

async def _safe_enrich_nenoca(titulo: str, u1_ratings: dict, u2_ratings: dict) -> dict | None:
    local_db = SessionLocal()
    try:
        f_obj = await enrich_and_save_film(local_db, titulo)
        if not f_obj:
            return None
        fid = f_obj.id
        r1 = u1_ratings.get(fid, 0)
        r2 = u2_ratings.get(fid, 0)
        return {
            "id": fid,
            "tmdb_id": f_obj.tmdb_id,
            "title": f_obj.title,
            "year": f_obj.year,
            "director": "",
            "posterUrl": _build_poster_url(f_obj),
            "posterColor": "#1a1228",
            "rating": {"you": r1, "partner": r2}
        }
    except Exception:
        return None
    finally:
        local_db.close()

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
            filtros += f"Não recomende os seguintes filmes, o usuário marcou que não gostou deles: {', '.join(disliked[:10])}. "
            
        if reference_movie:
            filtros += f"Atenção máxima: O usuário pediu filmes especificamente parecidos com '{reference_movie}'. Use esse filme como âncora principal da curadoria. "

        if page > 1:
            filtros += f"Esta é a página {page} de busca. Pule os resultados comerciais. Traga joias escondidas que se encaixem perfeitamente no perfil. "
            
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
        
        temperatura_calculada = 0.7 if page == 1 else min(0.95, 0.7 + (page * 0.05))
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [{"role": "user", "content": prompt}],
            "response_format": {"type": "json_object"},
            "temperature": temperatura_calculada
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
            except Exception as e:
                data = {"recommendations": []}
        
        rec_list = data.get('recommendations', [])
        
        # Disparo assíncrono massivo
        tarefas = [_safe_enrich_single(item) for item in rec_list]
        resultados = await asyncio.gather(*tarefas)
        
        # Filtra os resultados que retornaram com sucesso
        results = [r for r in resultados if r is not None]
        return results
    finally:
        db.close()


async def recommend_for_couple(user1_username: str, user2_username: str, limit: int = 6) -> Dict:
    db = SessionLocal()
    try:
        u1 = db.query(User).filter(User.username == user1_username).one_or_none()
        u2 = db.query(User).filter(User.username == user2_username).one_or_none()
        
        if not u1 or not u2:
            return {"watched_together": [], "recommendations": []}
            
        u1_films = db.query(UserFilm).filter(UserFilm.user_id == u1.id).all()
        u2_films = db.query(UserFilm).filter(UserFilm.user_id == u2.id).all()
        
        film_lookup = {film.id: film for film in db.query(Film).all()}
        
        FILMES_NENOCA = [
            "The Drama",
            "The Ugly Stepsister",
            "Evil Dead Burn",
            "The Tale of The Princess Kaguya",
            "The Sadness",
            "The Farm",
            "The Flesh Itself"
        ]
        
        u1_ratings = {uf.film_id: uf.rating for uf in u1_films if uf.rating}
        u2_ratings = {uf.film_id: uf.rating for uf in u2_films if uf.rating}
        
        tarefas_nenoca = [_safe_enrich_nenoca(titulo, u1_ratings, u2_ratings) for titulo in FILMES_NENOCA]
        resultados_nenoca = await asyncio.gather(*tarefas_nenoca)
        watched_together = [r for r in resultados_nenoca if r is not None]
            
        fav1 = [film_lookup[uf.film_id].title for uf in u1_films if getattr(uf, 'favorite', False) and uf.film_id in film_lookup]
        if not fav1:
            fav1 = [film_lookup[uf.film_id].title for uf in u1_films if uf.film_id in film_lookup][:5]
            
        fav2 = [film_lookup[uf.film_id].title for uf in u2_films if getattr(uf, 'favorite', False) and uf.film_id in film_lookup]
        if not fav2:
            fav2 = [film_lookup[uf.film_id].title for uf in u2_films if uf.film_id in film_lookup][:5]
            
        disliked = [film_lookup[uf.film_id].title for uf in u1_films + u2_films if getattr(uf, 'disliked', False) and uf.film_id in film_lookup]
        
        perfil = ""
        if FILMES_NENOCA:
            perfil += f"FOCO PRINCIPAL - Filmes que eles amam assistir juntos: {', '.join(FILMES_NENOCA)}. "
            
        perfil += f"Contexto Secundário - Parceiro 1 gosta de: {', '.join(fav1[:5])}. Parceiro 2 gosta de: {', '.join(fav2[:5])}. "
        
        filtros = ""
        if disliked:
            filtros += f"Jamais indique os seguintes títulos: {', '.join(disliked[:10])}. "
            
        prompt = (
            f"Você atua como um curador cinematográfico focado em casais. Analise os perfis: {perfil} "
            f"{filtros}"
            "Atenção máxima: Suas recomendações devem ser DIRETAMENTE baseadas e inspiradas na lista de 'Filmes que eles amam assistir juntos'. Use os gostos individuais apenas para refinar a busca, garantindo que nenhum dos dois vai odiar a sugestão. "
            f"Gere {limit} indicações excelentes para o próximo encontro do casal. Evite resultados muito óbvios. "
            "Responda estritamente com um JSON nesta estrutura: "
            "{\"recommendations\": [{\"title\": \"Nome Original em Inglês\", \"year\": 2000, \"match_score\": 95, \"explanation\": \"Explique como a estética e a narrativa deste filme dialogam com a lista de obras conjuntas deles.\"}]}"
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
            "temperature": 0.70
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
        
        rec_list = data.get('recommendations', [])
        
        # Disparo assíncrono massivo
        tarefas_recs = [_safe_enrich_couple(item) for item in rec_list]
        resultados_recs = await asyncio.gather(*tarefas_recs)
        
        results = [r for r in resultados_recs if r is not None]
            
        return {"watched_together": watched_together, "recommendations": results}
    finally:
        db.close()