import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from services.recommendation.rerank import rerank_with_llm


def test_rerank_function_is_available():
    assert callable(rerank_with_llm)
