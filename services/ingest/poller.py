import httpx
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from typing import List, Dict
from services.ingest.job import create_sync_job, update_sync_job
from services.ingest.processor import process_rss_items

async def fetch_top_4(username: str) -> List[str]:
    url = f"https://letterboxd.com/{username}/"
    filmes_top = []
    async with httpx.AsyncClient(timeout=15.0) as client:
        requisicao = await client.get(url)
        if requisicao.status_code == 200:
            soup = BeautifulSoup(requisicao.text, 'html.parser')
            secao = soup.find('section', id='favourites')
            if secao:
                posters = secao.find_all('div', class_='film-poster')
                for poster in posters:
                    slug = poster.get('data-film-slug', '')
                    if slug:
                        titulo = slug.replace('-', ' ').title()
                        filmes_top.append(titulo)
    return filmes_top

async def fetch_rss_entries(username: str, job_id: int | None = None) -> List[Dict]:
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
                categories = [cat.text for cat in item.findall('category') if cat.text]
                items.append({
                    'title': item.findtext('title'),
                    'link': item.findtext('link'),
                    'pubDate': item.findtext('pubDate'),
                    'description': item.findtext('description'),
                    'tags': categories,
                })
    except Exception as exc:
        update_sync_job(job_id, 'processing', message='RSS indisponível. Usando fallback.')

    try:
        top_4_titulos = await fetch_top_4(username)
        for titulo in top_4_titulos:
            items.append({
                'title': titulo,
                'link': None,
                'pubDate': None,
                'description': 'favorite',
                'tags': []
            })
    except Exception:
        pass

    try:
        film_count = await process_rss_items(username, items, job_id=job_id)
        update_sync_job(job_id, 'completed', message='Sincronização concluída', film_count=film_count)
        return items
    except Exception as exc:
        update_sync_job(job_id, 'completed', message=f'Falha parcial: {exc}', film_count=0)
        return items

async def scrape_user_pages(username: str, max_pages: int = 5) -> List[Dict]:
    results = []
    async with httpx.AsyncClient(timeout=20.0) as client:
        for page in range(1, max_pages + 1):
            url = f"https://letterboxd.com/{username}/films/liked/page/{page}/"
            r = await client.get(url)
            if r.status_code == 404:
                break
            results.append({'page': page, 'url': url, 'content_snippet': r.text[:200]})
    return results
