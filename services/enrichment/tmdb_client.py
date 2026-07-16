import os
import httpx
from typing import Optional, Dict

TMDB_API_KEY = os.getenv('TMDB_API_KEY')
TMDB_BASE = 'https://api.themoviedb.org/3'


class TMDBClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or TMDB_API_KEY

    async def search_movie(self, query: str) -> Dict:
        url = f"{TMDB_BASE}/search/movie"
        params = {"api_key": self.api_key, "query": query}
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json()
            return data

    async def get_movie(self, tmdb_id: int) -> Dict:
        url = f"{TMDB_BASE}/movie/{tmdb_id}"
        params = {"api_key": self.api_key}
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            return r.json()
