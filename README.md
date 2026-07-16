# Recomendador Letterboxd - MVP

Esqueleto inicial do projeto de recomendação baseado em Letterboxd.

Pré-requisitos (cu)
- Python 3.10+
- Postgres com extensão `pgvector` (opcional para MVP)

Variáveis de ambiente (exemplos):
- `TMDB_API_KEY`
- `OPENAI_API_KEY`
- `DATABASE_URL` (ex: postgres://user:pass@localhost:5432/dbname)

Rodar localmente (exemplo):
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.app:app --reload
```

Iniciar Postgres com Docker (recomendado para testes locais):
```bash
docker run -d --name lbxdb -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=postgres -p 5432:5432 postgres:15
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
export PYTHONPATH=$(pwd)
. .venv/bin/activate
python scripts/test_init_sync.py
```

Observação: para produção, use um serviço de Postgres gerenciado e instale a extensão `pgvector` se quiser usar vetores nativos.
