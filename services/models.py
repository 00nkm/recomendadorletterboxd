from sqlalchemy import Column, Integer, String, Text, Boolean, TIMESTAMP, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from services.database import Base


from sqlalchemy import text

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))


class SyncJob(Base):
    __tablename__ = 'sync_jobs'
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, index=True)
    status = Column(String, nullable=False, default='pending')
    message = Column(Text)
    film_count = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
    updated_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'), onupdate=text('now()'))


class Film(Base):
    __tablename__ = 'films'
    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, index=True)
    title = Column(String, nullable=False)
    year = Column(Integer)
    original_language = Column(String)
    genres = Column(ARRAY(String))
    overview = Column(Text)
    poster_path = Column(String)


class UserFilm(Base):
    __tablename__ = 'user_films'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'))
    film_id = Column(Integer, ForeignKey('films.id'))
    letterboxd_url = Column(String)
    watched_at = Column(TIMESTAMP)
    rating = Column(Integer)
    in_watchlist = Column(Boolean, default=False)
    favorite = Column(Boolean, default=False)
    review = Column(Text)

    user = relationship('User')
    film = relationship('Film')


class FilmEmbedding(Base):
    __tablename__ = 'film_embeddings'
    film_id = Column(Integer, ForeignKey('films.id'), primary_key=True)
    # Note: actual vector type handled by raw SQL in schema (pgvector)
    updated_at = Column(TIMESTAMP)


from sqlalchemy import JSON

class FilmEmbeddingJson(Base):
    __tablename__ = 'film_embeddings_json'
    film_id = Column(Integer, ForeignKey('films.id'), primary_key=True)
    embedding = Column(JSON)  # stored as JSON array
    updated_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP(timezone=True), server_default=text('now()'))
