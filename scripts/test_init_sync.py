import os
import traceback

from services.db import init_db


def main():
    print('Iniciando teste de inicialização do banco...')
    schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db', 'schema.sql')
    try:
        init_db(schema_path)
        print('Schema aplicado com sucesso.')
    except Exception as e:
        print('Erro ao aplicar schema:')
        traceback.print_exc()
        return

    # Checagem mínima: tentar conectar via SQLAlchemy
    try:
        from services.database import engine
        from sqlalchemy import text
        with engine.connect() as conn:
            res = conn.execute(text('SELECT 1'))
            print('Conexão com DB OK:', [row[0] for row in res])
    except Exception:
        print('Falha ao conectar ao DB após init. Verifique DATABASE_URL e se o Postgres está ativo.')
        traceback.print_exc()


if __name__ == '__main__':
    main()
