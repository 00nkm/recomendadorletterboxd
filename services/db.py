import os
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/postgres')


def init_db(schema_path: str = 'db/schema.sql') -> None:
    """Aplica o arquivo de schema SQL no banco configurado por DATABASE_URL."""
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        with open(schema_path, 'r') as f:
            sql = f.read()
        conn.execute(text(sql))
        conn.commit()
