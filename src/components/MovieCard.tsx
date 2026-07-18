import { useState } from 'react'
import MovieDetailModal from './MovieDetailModal'

interface Movie {
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

interface MovieCardProps {
  username: string
  movie: Movie
}

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' ? window.location.origin : '')
).replace(/\/$/, '')

export default function MovieCard({ movie, username }: MovieCardProps) {
  const [imgError, setImgError] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [feedbackSent, setFeedbackSent] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const handleFeedback = async (e: React.MouseEvent, action: string) => {
    e.stopPropagation()
    if (isSending || feedbackSent) return
    setIsSending(true)
    try {
      await fetch(`${API_BASE}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, tmdb_id: movie.tmdb_id, title: movie.title, action }),
      })
      setFeedbackSent(action)
      if (action === 'seen' || action === 'disliked') {
        setTimeout(() => setIsVisible(false), 600)
      }
    } catch {
      setIsSending(false)
    }
  }

  if (!isVisible) return null

  const score = movie.matchScore
  const scoreColor = score >= 95 ? '#d4a647' : score >= 88 ? '#a89060' : '#6e6b66'
  const subtitleParts = [movie.year, movie.runtime ? `${movie.runtime}m` : null].filter(Boolean)

  return (
    <>
      <article
        className="group border border-border rounded-sm overflow-hidden
                   transition-all duration-300 hover:border-border/60 hover:-translate-y-0.5
                   cursor-pointer flex flex-col"
        style={{
          backgroundColor: 'var(--color-card)',
          opacity: feedbackSent && feedbackSent !== 'liked' ? 0.5 : 1,
          transition: 'opacity 0.4s ease, transform 0.2s ease, border-color 0.2s ease',
        }}
        onClick={() => setModalOpen(true)}
      >
        {/* Poster */}
        <div
          className="relative overflow-hidden"
          style={{ aspectRatio: '2/3', backgroundColor: movie.posterColor }}
        >
          {!imgError && movie.posterUrl ? (
            <img
              src={movie.posterUrl}
              alt={`${movie.title}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${movie.posterColor}, #1a1a1e)` }}
            />
          )}

          {/* Score badge */}
          <div
            className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-sm backdrop-blur-sm"
            style={{
              fontFamily: 'var(--font-mono)',
              backgroundColor: 'rgba(9,9,11,0.8)',
              color: scoreColor,
              border: `1px solid ${scoreColor}40`,
            }}
          >
            {score}%
          </div>

          {/* "Ver detalhes" hint on hover */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: 'rgba(9,9,11,0.45)' }}
          >
            <span
              className="text-foreground text-xs px-3 py-1.5 border border-foreground/30 rounded-sm backdrop-blur-sm"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              ver detalhes
            </span>
          </div>

          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
            style={{ background: 'linear-gradient(to top, var(--color-card), transparent)' }}
          />
        </div>

        {/* Info */}
        <div className="p-4 flex flex-col gap-3 flex-1">
          <div>
            <h3
              className="text-foreground leading-tight mb-1"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}
            >
              {movie.title}
            </h3>
            <div
              className="text-muted-foreground text-xs flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {subtitleParts.map((part, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-border">·</span>}
                  {part}
                </span>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {movie.genres.map((g) => (
              <span
                key={g}
                className="text-xs px-2 py-0.5 rounded-sm border border-border text-muted-foreground"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                {g}
              </span>
            ))}
            {movie.moods.map((m) => (
              <span
                key={m}
                className="text-xs px-2 py-0.5 rounded-sm text-muted-foreground"
                style={{ fontFamily: 'var(--font-sans)', backgroundColor: 'var(--color-muted)' }}
              >
                {m}
              </span>
            ))}
          </div>

          {/* Match reason preview */}
          <div className="border-t border-border pt-3 flex-grow">
            <p
              className="text-xs uppercase tracking-widest mb-1.5"
              style={{ fontFamily: 'var(--font-mono)', color: scoreColor, fontSize: '0.6rem' }}
            >
              Por que você vai gostar
            </p>
            <p
              className="text-secondary-foreground text-xs leading-relaxed line-clamp-3"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {movie.matchReason}
            </p>
          </div>

          {/* Feedback buttons */}
          <div
            className="pt-3 border-t border-border mt-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              {/* Já vi */}
              <FeedbackButton
                action="seen"
                label="Já vi"
                active={feedbackSent === 'seen'}
                disabled={isSending || feedbackSent !== null}
                onClick={(e) => handleFeedback(e, 'seen')}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
                colorClass="text-secondary-foreground hover:text-foreground hover:bg-secondary"
                activeClass="text-foreground bg-secondary"
              />
              {/* Gostei */}
              <FeedbackButton
                action="liked"
                label="Gostei"
                active={feedbackSent === 'liked'}
                disabled={isSending || feedbackSent !== null}
                onClick={(e) => handleFeedback(e, 'liked')}
                icon={
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill={feedbackSent === 'liked' ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                }
                colorClass="text-green-600/70 hover:text-green-500 hover:bg-green-950/30"
                activeClass="text-green-500 bg-green-950/30"
              />
              {/* Ocultar */}
              <FeedbackButton
                action="disliked"
                label="Ocultar"
                active={feedbackSent === 'disliked'}
                disabled={isSending || feedbackSent !== null}
                onClick={(e) => handleFeedback(e, 'disliked')}
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                }
                colorClass="text-red-700/60 hover:text-red-500 hover:bg-red-950/30"
                activeClass="text-red-500 bg-red-950/30"
              />
            </div>
          </div>
        </div>
      </article>

      {modalOpen && (
        <MovieDetailModal movie={movie} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}

// ─── Feedback button atom ────────────────────────────────────────────────────

interface FeedbackButtonProps {
  action: string
  label: string
  icon: React.ReactNode
  active: boolean
  disabled: boolean
  onClick: (e: React.MouseEvent) => void
  colorClass: string
  activeClass: string
}

function FeedbackButton({
  label,
  icon,
  active,
  disabled,
  onClick,
  colorClass,
  activeClass,
}: FeedbackButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`group/btn relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs
                  transition-all duration-150 border border-transparent
                  disabled:cursor-not-allowed
                  ${active ? activeClass : colorClass}
                  ${!active && !disabled ? 'hover:border-border/50' : ''}
                  ${disabled && !active ? 'opacity-30' : ''}`}
      style={{ fontFamily: 'var(--font-sans)' }}
    >
      {icon}
      <span className={`transition-all duration-150 ${active ? 'max-w-20 opacity-100' : 'max-w-0 opacity-0 overflow-hidden group-hover/btn:max-w-20 group-hover/btn:opacity-100'}`}>
        {label}
      </span>
    </button>
  )
}
