import { useState } from 'react'
import Header from './components/Header'
import SearchSection from './components/SearchSection'
import RecommendationsSection from './components/RecommendationsSection'
import CouplePage from './pages/CouplePage'
import type { Filters } from './components/FilterBar'
import { mockMovies } from './data/mockMovies'

type Page = 'home' | 'us'

interface RecommendationItem {
  tmdb_id: number
  title: string
  year: number | null
  genres: string[]
  match_score: number
  explanation: string
  poster_url?: string | null
}

interface RecommendationCard {
  id: string
  tmdb_id: number
  title: string
  year: number | null
  genres: string[]
  moods: string[]
  decade: string
  matchScore: number
  matchReason: string
  runtime: number | null
  posterUrl: string | null
  posterColor: string
}

const deriveMood = (genres: string[]) => {
  if (genres.some((g) => g.toLowerCase() === 'horror')) return 'Dark'
  if (genres.some((g) => g.toLowerCase() === 'comedy')) return 'Uplifting'
  if (genres.some((g) => g.toLowerCase() === 'sci-fi')) return 'Mind-bending'
  if (genres.some((g) => g.toLowerCase() === 'romance')) return 'Emotional'
  if (genres.some((g) => g.toLowerCase() === 'drama')) return 'Melancholic'
  return 'Emotional'
}

const deriveDecade = (year: number | null) => {
  if (!year) return '2020s'
  if (year >= 2020) return '2020s'
  if (year >= 2010) return '2010s'
  if (year >= 2000) return '2000s'
  if (year >= 1990) return '1990s'
  return 'Classic'
}

const toRecommendationCard = (item: RecommendationItem, index: number): RecommendationCard => {
  const score = Math.min(99, Math.max(80, Math.round(item.match_score * 100)))
  const genres = item.genres?.length ? item.genres : ['Drama']
  return {
    id: `${item.title}-${index}-${Date.now()}`,
    tmdb_id: item.tmdb_id || 0,
    title: item.title,
    year: item.year,
    genres,
    moods: [deriveMood(genres)],
    decade: deriveDecade(item.year),
    matchScore: score,
    matchReason: item.explanation || 'Análise formulada a partir do seu histórico cinematográfico.',
    runtime: null,
    posterUrl: item.poster_url ?? null,
    posterColor: '#111113',
  }
}

const toMockCard = (item: (typeof mockMovies)[number], index: number): RecommendationCard => ({
  id: `${item.title}-${index}-${Date.now()}`,
  tmdb_id: item.id,
  title: item.title,
  year: item.year,
  genres: item.genres?.length ? item.genres : ['Drama'],
  moods: item.moods?.length ? item.moods : [deriveMood(item.genres)],
  decade: item.decade || deriveDecade(item.year),
  matchScore: item.matchScore,
  matchReason: item.matchReason || 'Item demonstrativo.',
  runtime: item.runtime,
  posterUrl: item.posterUrl || null,
  posterColor: item.posterColor,
})

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')

export default function App() {
  const [page, setPage] = useState<Page>('home')
  const [username, setUsername] = useState<string | null>(null)
  const [referenceMovie, setReferenceMovie] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([])
  const [statusMessage, setStatusMessage] = useState('Insira um usuário do Letterboxd para iniciar.')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ genre: null, mood: null, decade: null })

  const handleSearch = async (user: string, refMovie: string) => {
    setIsLoading(true)
    setError(null)
    setUsername(user)
    setReferenceMovie(refMovie)
    setCurrentPage(1)
    setFilters({ genre: null, mood: null, decade: null })
    setRecommendations([])
    setStatusMessage(`Iniciando conexão para @${user}...`)

    try {
      const syncRes = await fetch(`${API_BASE}/sync-start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: user }),
        cache: 'no-store',
      })
      if (!syncRes.ok) throw new Error('Sincronização falhou ao iniciar.')

      const pollStatus = async (): Promise<void> => {
        const statusRes = await fetch(`${API_BASE}/sync-status/${encodeURIComponent(user)}`, { cache: 'no-store' })
        if (!statusRes.ok) throw new Error('Monitoramento de status falhou.')
        const statusData = await statusRes.json()
        setStatusMessage(statusData.job_message || statusData.status || 'processando')

        if (statusData.status === 'processing' || statusData.status === 'pending') {
          await new Promise((r) => window.setTimeout(r, 1800))
          return pollStatus()
        }
        if (statusData.status === 'failed') {
          setStatusMessage(statusData.job_message || 'Sincronização com problemas técnicos.')
          return
        }

        const params = new URLSearchParams({ limit: '8', only_unseen: 'true', page: '1' })
        if (refMovie) params.append('reference_movie', refMovie)
        const recRes = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(user)}?${params}`, { cache: 'no-store' })
        if (!recRes.ok) throw new Error('Falha ao obter recomendações.')
        const recData = await recRes.json()
        const items = Array.isArray(recData.recommendations) ? recData.recommendations : []
        if (items.length === 0) {
          setStatusMessage('Nenhuma recomendação gerada para este perfil.')
          return
        }
        setRecommendations(items.map((item: RecommendationItem, i: number) => toRecommendationCard(item, i)))
        setStatusMessage(`${items.length} recomendações para @${user}.`)
      }
      await pollStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de comunicação'
      setError(msg)
      setRecommendations(mockMovies.slice(0, 8).map(toMockCard))
      setStatusMessage('Modo estático: servidor temporariamente indisponível.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!username) return
    setIsLoadingMore(true)
    const nextPage = currentPage + 1
    try {
      const params = new URLSearchParams({ limit: '8', only_unseen: 'true', page: nextPage.toString() })
      if (referenceMovie) params.append('reference_movie', referenceMovie)
      const res = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(username)}?${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Falha ao carregar mais.')
      const data = await res.json()
      const items = Array.isArray(data.recommendations) ? data.recommendations : []
      setRecommendations((prev) => [...prev, ...items.map((item: RecommendationItem, i: number) => toRecommendationCard(item, prev.length + i))])
      setCurrentPage(nextPage)
    } catch {
      // silently fail on load more
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
      <Header currentPage={page} onNavigate={setPage} />
      <main>
        {page === 'home' && (
          <>
            <SearchSection
              onSearch={handleSearch}
              isLoading={isLoading}
              hasResults={!!username}
            />
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="w-px bg-primary rounded-full animate-pulse"
                      style={{ height: '2rem', animationDelay: `${i * 150}ms`, opacity: 0.5 + i * 0.15 }}
                    />
                  ))}
                </div>
                <p className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                  {statusMessage}
                </p>
              </div>
            )}
            {username && !isLoading && (
              <RecommendationsSection
                username={username}
                filters={filters}
                onFiltersChange={setFilters}
                recommendations={recommendations}
                statusMessage={statusMessage}
                error={error}
                onLoadMore={handleLoadMore}
                isLoadingMore={isLoadingMore}
              />
            )}
          </>
        )}
        {page === 'us' && <CouplePage />}
      </main>
    </div>
  )
}
