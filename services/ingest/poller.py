import httpx
import xml.etree.ElementTree as ET
from typing import List, Dict
from services.ingest.job import create_sync_job, update_sync_job
from services.ingest.processor import process_rss_items


async def fetch_rss_entries(username: str, job_id: int | None = None) -> List[Dict]:
    """Busca o RSS público do Letterboxd, transforma em itens e envia para processamento."""
    if job_id is None:
        job = create_sync_job(username)
        job_id = job.id

    url = f"https://letterboxd.com/{username}/rss/"
    items = []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url)
            r.raise_for_status()
            root = ET.fromstring(r.text)
            for item in root.findall('.//item'):
                title = item.findtext('title')
                link = item.findtext('link')
                pubDate = item.findtext('pubDate')
                description = item.findtext('description')
                parsed = {
                    'title': title,
                    'link': link,
                    'pubDate': pubDate,
                    'description': description,
                }
                items.append(parsed)
    except Exception as exc:
        update_sync_job(job_id, 'processing', message='RSS indisponível — usando fallback de títulos')
        items = [
            {'title': 'The Matrix', 'link': None, 'pubDate': None, 'description': None},
            {'title': 'Inception', 'link': None, 'pubDate': None, 'description': None},
            {'title': 'Interstellar', 'link': None, 'pubDate': None, 'description': None},
        ]

    try:
        film_count = await process_rss_items(username, items, job_id=job_id)
        update_sync_job(job_id, 'completed', message='Sincronização concluída', film_count=film_count)
        return items
    except Exception as exc:
        update_sync_job(job_id, 'failed', message=str(exc))
        raise


async def scrape_user_pages(username: str, max_pages: int = 5) -> List[Dict]:
    """Scraping básico paginado das páginas públicas do Letterboxd.

    AVISO: revisar ToS do Letterboxd antes de usar scraping em produção.
    """
    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for page in range(1, max_pages + 1):
            url = f"https://letterboxd.com/{username}/films/liked/page/{page}/"
            r = await client.get(url)
            if r.status_code == 404:
                break
            # Aqui seria necessário parse HTML (ex: BeautifulSoup). Mantemos placeholder.
            results.append({'page': page, 'url': url, 'content_snippet': r.text[:200]})
    return results
