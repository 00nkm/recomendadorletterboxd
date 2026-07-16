import os
import json
from typing import Optional, Dict
from services.enrichment.tmdb_client import TMDBClient

CACHE_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.cache', 'tmdb.json')


class TMDBCache:
    def __init__(self):
        self.client = TMDBClient()
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        try:
            with open(CACHE_PATH, 'r') as f:
                self._cache = json.load(f)
        except Exception:
            self._cache = {}

    def _save(self):
        with open(CACHE_PATH, 'w') as f:
            json.dump(self._cache, f)

    async def search_movie(self, query: str) -> Dict:
        key = f"search:{query}"
        if key in self._cache:
            return self._cache[key]
        data = await self.client.search_movie(query)
        self._cache[key] = data
        self._save()
        return data

    async def get_movie(self, tmdb_id: int) -> Dict:
        key = f"movie:{tmdb_id}"
        if key in self._cache:
            return self._cache[key]
        data = await self.client.get_movie(tmdb_id)
        self._cache[key] = data
        self._save()
        return data
