import { useState } from 'react'

interface MovieCardProps {
  username: string
  movie: {
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
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '')

export default function MovieCard({ movie, username }: MovieCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isSending, setIsSending] = useState(false)

  const handleFeedback = async (e: React.MouseEvent, action: string) => {
    e.stopPropagation()
    setIsSending(true)
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: username,
          tmdb_id: movie.tmdb_id,
          title: movie.title,
          action: action
        })
      })
      setIsVisible(false)
    } catch (error) {
      console.error("Falha ao enviar feedback:", error)
      setIsSending(false)
    }
  }

  if (!isVisible) return null

  const scoreColor =
    movie.matchScore >= 95
      ? '#d4a647'
      : movie.matchScore >= 88
        ? '#a89060'
        : '#6e6b66'

  const subtitleParts = [movie.year, movie.runtime ? `${movie.runtime}m` : null].filter(Boolean)

  return (
    <article
      className="group border border-border rounded-sm overflow-hidden transition-all duration-300 hover:border-secondary-foreground/30 cursor-pointer flex flex-col"
      style={{ backgroundColor: 'var(--color-card)', opacity: isSending ? 0.5 : 1 }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: '2/3', backgroundColor: movie.posterColor }}>
        {!imgError && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-end p-4" style={{ background: `linear-gradient(to top, ${movie.posterColor}, transparent)` }} />
        )}
        <div
          className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-sm backdrop-blur-sm"
          style={{
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(9,9,11,0.75)',
            color: scoreColor,
            border: `1px solid ${scoreColor}40`,
          }}
        >
          {movie.matchScore}%
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none" style={{ background: 'linear-gradient(to top, var(--color-card), transparent)' }} />
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3
            className="text-foreground leading-tight mb-1"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '1.05rem',
            }}
          >
            {movie.title}
          </h3>
          <div className="text-muted-foreground text-xs flex items-center gap-2" style={{ fontFamily: 'var(--font-mono)' }}>
            {subtitleParts.map((part, index) => (
              <span key={`${part}-${index}`}>{part}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {movie.genres.map((g) => (
            <span key={g} className="text-xs px-2 py-0.5 rounded-sm border border-border text-muted-foreground" style={{ fontFamily: 'var(--font-sans)' }}>
              {g}
            </span>
          ))}
          {movie.moods.map((m) => (
            <span key={m} className="text-xs px-2 py-0.5 rounded-sm text-muted-foreground" style={{ fontFamily: 'var(--font-sans)', backgroundColor: 'var(--color-muted)' }}>
              {m}
            </span>
          ))}
        </div>

        <div className="border-t border-border pt-3 mb-2 flex-grow" style={{ borderColor: 'var(--color-border)' }}>
          <p
            className="text-xs mb-1.5 uppercase tracking-widest"
            style={{
              fontFamily: 'var(--font-mono)',
              color: scoreColor,
              fontSize: '0.6rem',
              letterSpacing: '0.1em',
            }}
          >
            Por que você vai gostar
          </p>
          <p
            className={`text-secondary-foreground text-xs leading-relaxed overflow-hidden transition-all duration-300 ${expanded ? 'line-clamp-none' : 'line-clamp-3'}`}
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {movie.matchReason}
          </p>
          {movie.matchReason.length > 120 && (
            <button
              className="text-muted-foreground text-xs mt-1 hover:text-foreground transition-colors"
              style={{ fontFamily: 'var(--font-mono)' }}
              onClick={(e) => {
                e.stopPropagation()
                setExpanded((v) => !v)
              }}
            >
              {expanded ? '  menos' : '  mais'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-auto pt-3 border-t border-border" style={{ borderColor: 'var(--color-border)' }}>
          <button
            onClick={(e) => handleFeedback(e, 'seen')}
            disabled={isSending}
            className="text-xs py-1.5 bg-secondary text-secondary-foreground rounded-sm hover:bg-zinc-800 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Já vi
          </button>
          <button
            onClick={(e) => handleFeedback(e, 'liked')}
            disabled={isSending}
            className="text-xs py-1.5 bg-green-950/30 text-green-500 rounded-sm hover:bg-green-900/40 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Gostei
          </button>
          <button
            onClick={(e) => handleFeedback(e, 'disliked')}
            disabled={isSending}
            className="text-xs py-1.5 bg-red-950/30 text-red-500 rounded-sm hover:bg-red-900/40 transition-colors disabled:opacity-50"
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            Ocultar
          </button>
        </div>
      </div>
    </article>
  )
}
