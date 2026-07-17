import hashlib
import random
from typing import List

VECTOR_SIZE = 1536

def _deterministic_embedding(text: str) -> List[float]:
    seed = int(hashlib.md5(text.encode('utf-8')).hexdigest()[:16], 16)
    rnd = random.Random(seed)
    return [rnd.random() for _ in range(VECTOR_SIZE)]

def generate_embedding(text: str) -> List[float]:
    return _deterministic_embedding(text)
