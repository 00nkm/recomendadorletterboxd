import os
import openai
from typing import List, Dict

openai.api_key = os.getenv('OPENAI_API_KEY')
CHAT_MODEL = os.getenv('OPENAI_CHAT_MODEL', 'gpt-3.5-turbo')


def rerank_with_llm(candidates: List[Dict], user_summary: str = '') -> List[Dict]:
    """Reordena candidatos usando um LLM e adiciona explicações.

    Se `OPENAI_API_KEY` não estiver configurada, retorna candidates sem alteração,
    adicionando uma explicação genérica.
    """
    if not openai.api_key:
        for c in candidates:
            c.setdefault('explanation', 'LLM indisponível — explicação genérica.')
        return candidates

    # Construir prompt simples para re-rank
    items_text = '\n'.join([f"- {i['title']} (score {i.get('match_score', '')})" for i in candidates])
    system = "Você é um assistente que reordena e explica recomendações de filmes para um usuário com o histórico fornecido. Seja conciso (máx 30 palavras por explicação)."
    user_prompt = f"Usuário: {user_summary}\n\nCandidatos:\n{items_text}\n\nRetorne os candidatos reordenados do melhor ao pior em JSON array com campos: title, new_score (0-1), explanation."

    try:
        resp = openai.ChatCompletion.create(
            model=CHAT_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user_prompt}],
            max_tokens=800,
            temperature=0.7,
        )
        text = resp['choices'][0]['message']['content']
        # Tentativa simples de extrair JSON do texto
        import re, json
        m = re.search(r"\[\s*\{", text)
        json_text = text[m.start():] if m else text
        parsed = json.loads(json_text)
        # Map parsed entries back to candidate structure
        out = []
        for p in parsed:
            out.append({
                'title': p.get('title'),
                'new_score': p.get('new_score', 0),
                'explanation': p.get('explanation', '')
            })
        return out
    except Exception:
        # Fallback: não reordenar, apenas adicionar explicações simples
        for c in candidates:
            c.setdefault('explanation', 'Não foi possível gerar explicação via LLM.')
        return candidates
