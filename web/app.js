const syncForm = document.getElementById('syncForm');
const statusEl = document.getElementById('status');
const recsEl = document.getElementById('recs');
const filtersForm = document.getElementById('filtersForm');
const syncButton = document.querySelector('#syncForm button');
const filterButton = document.querySelector('#filtersForm button');

async function renderRecommendations(username, rerank, genre, minYear, maxYear, onlyUnseen) {
  const params = new URLSearchParams({rerank, genre: genre || '', min_year: minYear || '', max_year: maxYear || '', only_unseen: onlyUnseen});
  const r = await fetch(`/recommendations/${username}?${params.toString()}`);
  const data = await r.json();
  recsEl.innerHTML = '';
  if (!data.recommendations || data.recommendations.length === 0) {
    recsEl.innerHTML = '<p>Nenhuma recomendação encontrada. Aguarde a sincronização ou tente outro usuário.</p>';
    return;
  }
  const count = document.createElement('div');
  count.className = 'message';
  count.innerText = `Foram encontradas ${data.recommendations.length} recomendações.`;
  recsEl.appendChild(count);
  data.recommendations.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div style="display:flex; gap:14px; align-items:flex-start;">
        ${rec.poster_url ? `<img src="${rec.poster_url}" alt="Poster ${rec.title}" style="width:110px; border-radius: 12px; object-fit: cover;">` : ''}
        <div>
          <h3>${rec.title} ${rec.year ? `(${rec.year})` : ''}</h3>
          <div class="meta">Match: ${rec.match_score} | Gêneros: ${rec.genres ? rec.genres.join(', ') : 'n/d'}</div>
          <p>${rec.explanation}</p>
        </div>
      </div>
    `;
    recsEl.appendChild(card);
  });
}

async function updateStatus(username) {
  const r = await fetch(`/sync-status/${username}`);
  const data = await r.json();
  const statusText = data.job_message ? `${data.status} - ${data.job_message}` : data.status;
  const lines = [`<strong>${statusText}</strong>`, `Filmes sincronizados: ${data.film_count || 0}`];
  if (data.created_at) {
    lines.push(`Última sincronização: ${new Date(data.created_at).toLocaleString()}`);
  }
  statusEl.innerHTML = `<div class="status-pill">${lines.join(' | ')}</div>`;
  return data;
}

async function pollStatus(username, rerank) {
  const data = await updateStatus(username);
  const existingMessage = document.querySelector('.status-panel .message');
  if (existingMessage) existingMessage.remove();

  filterButton.disabled = true;
  syncButton.disabled = true;

  if (data.status === 'processing' || data.status === 'pending') {
    const spinner = document.createElement('div');
    spinner.className = 'message';
    spinner.innerText = 'Sincronizando, aguarde...';
    statusEl.appendChild(spinner);
    setTimeout(() => pollStatus(username, rerank), 2000);
    return;
  }
  if (data.status === 'failed') {
    const errorMessage = document.createElement('div');
    errorMessage.className = 'message';
    errorMessage.innerText = 'Falha ao sincronizar. Veja o log do servidor.';
    statusEl.appendChild(errorMessage);
    syncButton.disabled = false;
    filterButton.disabled = false;
    return;
  }
  await renderRecommendations(username, rerank, document.getElementById('genre').value, document.getElementById('minYear').value, document.getElementById('maxYear').value, document.getElementById('onlyUnseen').checked);
  syncButton.disabled = false;
  filterButton.disabled = false;
}

syncForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const username = document.getElementById('username').value.trim();
  const rerank = document.getElementById('rerank').checked;
  if (!username) return alert('Informe um username');
  statusEl.innerText = 'Sincronizando...';
  await fetch('/sync-start', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username})});
  pollStatus(username, rerank);
});

filtersForm.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const username = document.getElementById('username').value.trim();
  const rerank = document.getElementById('rerank').checked;
  if (!username) return alert('Informe um username antes de filtrar');
  await renderRecommendations(username, rerank, document.getElementById('genre').value, document.getElementById('minYear').value, document.getElementById('maxYear').value, document.getElementById('onlyUnseen').checked);
});
