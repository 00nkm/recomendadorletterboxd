-- Schema inicial para Postgres
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS films (
  id SERIAL PRIMARY KEY,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  year INTEGER,
  original_language TEXT,
  genres TEXT[],
  overview TEXT,
  poster_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(tmdb_id, title)
);

CREATE TABLE IF NOT EXISTS user_films (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  film_id INTEGER REFERENCES films(id) ON DELETE CASCADE,
  letterboxd_url TEXT,
  watched_at TIMESTAMP WITH TIME ZONE,
  rating INTEGER,
  in_watchlist BOOLEAN DEFAULT FALSE,
  favorite BOOLEAN DEFAULT FALSE,
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Embeddings storage (JSONB portable fallback)
CREATE TABLE IF NOT EXISTS film_embeddings_json (
  film_id INTEGER REFERENCES films(id) PRIMARY KEY,
  embedding JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_jobs (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  film_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
