import os
import asyncio
from sqlalchemy import text
from services.db import init_db
from services.database import SessionLocal
from services.enrichment.enrich_job import enrich_and_save_film
from services.recommendation.engine import recommend_for_user

os.environ['PYTHONPATH'] = '/workspaces/codespaces-blank'

async def run():
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'db', 'schema.sql')
    print('Resetando e aplicando schema...')
    db = SessionLocal()
    try:
        db.execute(text('DROP TABLE IF EXISTS film_embeddings_json, user_films, films, users CASCADE'))
        db.commit()
    finally:
        db.close()

    init_db(schema_path)
    db = SessionLocal()
    try:
        # Limpar dados antigos
        db.execute(text('DELETE FROM film_embeddings_json'))
        db.execute(text('DELETE FROM user_films'))
        db.execute(text('DELETE FROM films'))
        db.execute(text('DELETE FROM users'))
        db.commit()

        # Criar usuário e enriquecer filmes assistidos
        watched_titles = ['Arrival', 'The Matrix', 'Inception']
        from services.models import User, UserFilm
        user = User(username='sampleuser')
        db.add(user)
        db.commit()
        db.refresh(user)

        for title in watched_titles:
            film = await enrich_and_save_film(db, title)
            user_film = UserFilm(
                user_id=user.id,
                film_id=film.id,
                letterboxd_url=f'https://letterboxd.com/film/{film.id}/',
            )
            db.add(user_film)
        db.commit()

        # Enriquecer filmes candidatos para recomendação, sem marcá-los como vistos
        candidate_titles = ['Blade Runner', 'Her']
        for title in candidate_titles:
            await enrich_and_save_film(db, title)

        recs = await recommend_for_user('sampleuser', limit=5)
        print('Recomendações geradas:')
        if not recs:
            print('Nenhuma recomendação encontrada. Verifique os dados do usuário e os embeddings.')
        for r in recs:
            print(r)
    finally:
        db.close()

if __name__ == '__main__':
    asyncio.run(run())
