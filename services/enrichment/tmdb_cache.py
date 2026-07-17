import os
from typing import Dict
from services.enrichment.tmdb_client import TMDBClient

class TMDBCache:
    def __init__(self):
        self.client = TMDBClient()
        self._cache = {} 

    async def search_movie(self, query: str) -> Dict:
        key = f"search:{query}"
        if key in self._cache:
            return self._cache[key]
        data = await self.client.search_movie(query)
        self._cache[key] = data
        return data

    async def get_movie(self, tmdb_id: int) -> Dict:
        key = f"movie:{tmdb_id}"
        if key in self._cache:
            return self._cache[key]
        data = await self.client.get_movie(tmdb_id)
        self._cache[key] = data
        return data
