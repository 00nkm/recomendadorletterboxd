import hashlib
import os
import random
import openai
from typing import List

openai.api_key = os.getenv('OPENAI_API_KEY')

EMBEDDING_MODEL = 'text-embedding-3-small'
VECTOR_SIZE = 1536


def _deterministic_embedding(text: str) -> List[float]:
    seed = int(hashlib.md5(text.encode('utf-8')).hexdigest()[:16], 16)
    rnd = random.Random(seed)
    return [rnd.random() for _ in range(VECTOR_SIZE)]


def generate_embedding(text: str) -> List[float]:
    """Gera embedding usando OpenAI quando disponível, ou fallback determinístico para desenvolvimento."""
    if openai.api_key:
        try:
            resp = openai.Embedding.create(model=EMBEDDING_MODEL, input=text)
            return resp['data'][0]['embedding']
        except Exception:
            pass
    return _deterministic_embedding(text)
