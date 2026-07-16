import os
from typing import List, Dict

CHAT_MODEL = os.getenv('OPENAI_CHAT_MODEL', 'gpt-4o-mini')


def _get_openai_client():
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        return None
    try:
        from openai import OpenAI
        return OpenAI(api_key=api_key)
    except Exception:
        return None


def explain_candidates_with_llm(candidates: List[Dict], user_summary: str = '') -> List[Dict]:
    """Gera explicações mais ricas via OpenAI quando disponível."""
    client = _get_openai_client()
    if not client:
        for candidate in candidates:
            candidate.setdefault('explanation', 'Explicação genérica baseada no perfil do usuário.')
        return candidates

    items_text = '\n'.join([f"- {item['title']} (score {item.get('match_score', '')})" for item in candidates])
    prompt = (
        "Você é um assistente de recomendações de filmes. "
        "Explique em até 30 palavras por filme por que ele combina com o perfil do usuário. "
        f"Usuário: {user_summary}\n\nCandidatos:\n{items_text}\n\nRetorne um JSON array com campos title e explanation."
    )

    try:
        try:
            response = client.responses.create(model=CHAT_MODEL, input=[{"role": "user", "content": prompt}])
            text = getattr(response, 'output_text', None) or ''
        except Exception:
            response = client.chat.completions.create(
                model=CHAT_MODEL,
                messages=[{"role": "user", "content": prompt}],
            )
            text = response.choices[0].message.content or ''

        import json
        import re
        match = re.search(r'\[\s*\{', text)
        json_text = text[match.start():] if match else text
        parsed = json.loads(json_text)
        for item, parsed_item in zip(candidates, parsed):
            item['explanation'] = parsed_item.get('explanation', item.get('explanation', ''))
        return candidates
    except Exception:
        for candidate in candidates:
            candidate.setdefault('explanation', 'Explicação gerada com base no histórico do usuário.')
        return candidates


def rerank_with_llm(candidates: List[Dict], user_summary: str = '') -> List[Dict]:
    """Compat wrapper para o nome antigo da função de rerank."""
    return explain_candidates_with_llm(candidates, user_summary=user_summary)
