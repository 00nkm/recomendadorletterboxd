import os
import asyncio

from services.ingest.poller import fetch_rss_entries


async def main():
    username = os.getenv('SAMPLE_USER', 'letterboxd')
    print('Buscando RSS para', username)
    try:
        items = await fetch_rss_entries(username)
        print('Entradas encontradas:', len(items))
    except Exception as e:
        print('Erro ao buscar RSS:', repr(e))


if __name__ == '__main__':
    asyncio.run(main())
