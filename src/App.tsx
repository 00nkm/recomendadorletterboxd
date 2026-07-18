import { useState } from 'react'
import Header from './components/Header'
import SearchSection from './components/SearchSection'
import RecommendationsSection from './components/RecommendationsSection'
import type { Filters } from './components/FilterBar'
import { mockMovies } from './data/mockMovies'

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
  if (genres.some((genre) => genre.toLowerCase() === 'horror')) return 'Dark'
  if (genres.some((genre) => genre.toLowerCase() === 'comedy')) return 'Uplifting'
  if (genres.some((genre) => genre.toLowerCase() === 'sci-fi')) return 'Mind-bending'
  if (genres.some((genre) => genre.toLowerCase() === 'romance')) return 'Emotional'
  if (genres.some((genre) => genre.toLowerCase() === 'drama')) return 'Melancholic'
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
  const mood = deriveMood(genres)
  return {
    id: `${item.title}-${index}-${Date.now()}`,
    tmdb_id: item.tmdb_id || 0,
    title: item.title,
    year: item.year,
    genres,
    moods: [mood],
    decade: deriveDecade(item.year),
    matchScore: score,
    matchReason: item.explanation || 'Análise formulada a partir do seu histórico cinematográfico e perfil de curadoria.',
    runtime: null,
    posterUrl: item.poster_url ?? null,
    posterColor: '#111113',
  }
}

const toMockRecommendationCard = (item: (typeof mockMovies)[number], index: number): RecommendationCard => ({
  id: `${item.title}-${index}-${Date.now()}`,
  tmdb_id: item.id,
  title: item.title,
  year: item.year,
  genres: item.genres?.length ? item.genres : ['Drama'],
  moods: item.moods?.length ? item.moods : [deriveMood(item.genres)],
  decade: item.decade || deriveDecade(item.year),
  matchScore: item.matchScore,
  matchReason: item.matchReason || 'Item demonstrativo fornecido devido à indisponibilidade temporária do servidor de processamento.',
  runtime: item.runtime,
  posterUrl: item.posterUrl || null,
  posterColor: item.posterColor,
})

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')

export default function App() {
  const [username, setUsername] = useState<string | null>(null)
  const [referenceMovie, setReferenceMovie] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [recommendations, setRecommendations] = useState<RecommendationCard[]>([])
  const [statusMessage, setStatusMessage] = useState('Insira um usuário do Letterboxd para iniciar a pesquisa.')
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<Filters>({ genre: null, mood: null, decade: null })

  const handleSearch = async (user: string, refMovie: string) => {
    setIsLoading(true)
    setError(null)
    setUsername(user)
    setReferenceMovie(refMovie)
    setPage(1)
    setFilters({ genre: null, mood: null, decade: null })
    setRecommendations([])
    setStatusMessage(`Iniciando a conexão para @${user}...`)

    try {
      const syncResponse = await fetch(`${API_BASE}/sync-start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: user }),
        cache: 'no-store',
      })
      if (!syncResponse.ok) {
        throw new Error('A solicitação de sincronização falhou ao ser iniciada.')
      }

      const pollStatus = async () => {
        const statusResponse = await fetch(`${API_BASE}/sync-status/${encodeURIComponent(user)}`, { cache: 'no-store' })
        if (!statusResponse.ok) {
          throw new Error('O monitoramento de status não retornou os dados de forma correta.')
        }
        const statusData = await statusResponse.json()
        const nextMessage = statusData.job_message || statusData.status || 'processando'
        setStatusMessage(nextMessage)

        if (statusData.status === 'processing' || statusData.status === 'pending') {
          await new Promise((resolve) => window.setTimeout(resolve, 1800))
          return pollStatus()
        }

        if (statusData.status === 'failed') {
          setRecommendations([])
          setStatusMessage(statusData.job_message || 'A sincronização encontrou problemas técnicos. O sistema tentará mostrar os filmes disponíveis na base.')
          return
        }

        const queryParams = new URLSearchParams({ limit: '8', only_unseen: 'true', page: '1' })
        if (refMovie) queryParams.append('reference_movie', refMovie)

        const recommendationsResponse = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(user)}?${queryParams.toString()}`, { cache: 'no-store' })
        if (!recommendationsResponse.ok) {
          throw new Error('A inteligência artificial não obteve um retorno completo para essas indicações.')
        }

        const recommendationsData = await recommendationsResponse.json()
        const items = Array.isArray(recommendationsData.recommendations) ? recommendationsData.recommendations : []

        if (items.length === 0) {
          setRecommendations([])
          setStatusMessage('Nenhum catálogo de recomendação gerado para este formato.')
          return
        }

        setRecommendations(items.map((item: RecommendationItem, index: number) => toRecommendationCard(item, index)))
        setStatusMessage(`Entrega de ${items.length} obras para @${user}.`)
      }

      await pollStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Dificuldades na comunicação da nuvem.'
      setError(message)
      const demoItems = mockMovies.slice(0, 8)
      setRecommendations(demoItems.map((movie, index) => toMockRecommendationCard(movie, index)))
      setStatusMessage('O servidor de busca caiu para o modo estático provisoriamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLoadMore = async () => {
    if (!username) return
    setIsLoadingMore(true)
    const nextPage = page + 1

    try {
      const queryParams = new URLSearchParams({ limit: '8', only_unseen: 'true', page: nextPage.toString() })
      if (referenceMovie) queryParams.append('reference_movie', referenceMovie)

      const recommendationsResponse = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(username)}?${queryParams.toString()}`, { cache: 'no-store' })
      if (!recommendationsResponse.ok) throw new Error('Falha ao processar os itens subsequentes da lista.')

      const recommendationsData = await recommendationsResponse.json()
      const items = Array.isArray(recommendationsData.recommendations) ? recommendationsData.recommendations : []

      setRecommendations((prev) => [
        ...prev,
        ...items.map((item: RecommendationItem, index: number) => toRecommendationCard(item, prev.length + index))
      ])
      setPage(nextPage)
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-foreground)' }}>
      <Header />
      <main>
        <SearchSection
          onSearch={handleSearch}
          isLoading={isLoading}
          hasResults={!!username}
        />
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
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-px bg-primary rounded-full animate-pulse"
                  style={{
                    height: '2rem',
                    animationDelay: `${i * 150}ms`,
                    opacity: 0.6 + i * 0.1,
                  }}
                />
              ))}
            </div>
            <p
              className="text-muted-foreground text-xs"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              vasculhando o seu arquivo
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
