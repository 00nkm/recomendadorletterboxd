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
    matchReason: item.explanation || 'This recommendation was generated from your taste profile and diary history.',
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
  matchReason: item.matchReason || 'This demo recommendation is shown because the live backend is unavailable.',
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
  const [statusMessage, setStatusMessage] = useState('Enter a Letterboxd username to start the sync.')
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
    setStatusMessage(`Starting sync for @${user}...`)

    try {
      const syncResponse = await fetch(`${API_BASE}/sync-start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: user }),
        cache: 'no-store',
      })
      if (!syncResponse.ok) {
        throw new Error('The sync request could not be started.')
      }

      const pollStatus = async () => {
        const statusResponse = await fetch(`${API_BASE}/sync-status/${encodeURIComponent(user)}`, { cache: 'no-store' })
        if (!statusResponse.ok) {
          throw new Error('The status endpoint did not respond correctly.')
        }
        const statusData = await statusResponse.json()
        const nextMessage = statusData.job_message || statusData.status || 'processing'
        setStatusMessage(nextMessage)

        if (statusData.status === 'processing' || statusData.status === 'pending') {
          await new Promise((resolve) => window.setTimeout(resolve, 1800))
          return pollStatus()
        }

        if (statusData.status === 'failed') {
          setRecommendations([])
          setStatusMessage(statusData.job_message || 'The sync could not be completed, but the app will keep trying to show the best available results.')
          return
        }

        const queryParams = new URLSearchParams({ limit: '8', only_unseen: 'true', page: '1' })
        if (refMovie) queryParams.append('reference_movie', refMovie)

        const recommendationsResponse = await fetch(`${API_BASE}/recommendations/${encodeURIComponent(user)}?${queryParams.toString()}`, { cache: 'no-store' })
        if (!recommendationsResponse.ok) {
          throw new Error('The recommendations endpoint failed to return results.')
        }

        const recommendationsData = await recommendationsResponse.json()
        const items = Array.isArray(recommendationsData.recommendations) ? recommendationsData.recommendations : []

        if (items.length === 0) {
          setRecommendations([])
          setStatusMessage('No recommendations were generated yet for this profile.')
          return
        }

        setRecommendations(items.map((item: RecommendationItem, index: number) => toRecommendationCard(item, index)))
        setStatusMessage(`Loaded ${items.length} recommendations for @${user}.`)
      }

      await pollStatus()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load recommendations right now.'
      setError(message)
      const demoItems = mockMovies.slice(0, 8)
      setRecommendations(demoItems.map((movie, index) => toMockRecommendationCard(movie, index)))
      setStatusMessage('The live recommendation backend is unavailable right now, so the app is showing demo recommendations instead.')
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
      if (!recommendationsResponse.ok) throw new Error('Failed to load more recommendations.')

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
              reading your taste profile
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
