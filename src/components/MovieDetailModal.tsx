import { useEffect, useRef } from 'react'

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

interface MovieDetailModalProps {
  movie: Movie
  onClose: () => void
}

// Gallery images use picsum with seeds derived from movie title.
// Replace these URLs with your Pinterest/Google Images API calls.
function getGalleryImages(title: string): string[] {
  const base = encodeURIComponent(title.toLowerCase().replace(/\s+/g, '-'))
  return Array.from({ length: 6 }, (_, i) =>
    `https://picsum.photos/seed/${base}-${i + 1}/600/400`
  )
}

const scoreColor = (score: number) =>
  score >= 95 ? '#d4a647' : score >= 88 ? '#a89060' : '#6e6b66'

export default function MovieDetailModal({ movie, onClose }: MovieDetailModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const images = getGalleryImages(movie.title)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8"
      style={{ backgroundColor: 'rgba(9,9,11,0.85)', backdropFilter: 'blur(12px)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-sm border border-border flex flex-col"
        style={{ backgroundColor: 'var(--color-card)' }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <h2
              className="text-foreground leading-none"
              style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}
            >
              {movie.title}
            </h2>
            {movie.year && (
              <span
                className="text-muted-foreground text-xs"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {movie.year}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col md:flex-row overflow-auto flex-1">
          {/* Left: movie info */}
          <div className="md:w-64 shrink-0 p-5 flex flex-col gap-4 border-b md:border-b-0 md:border-r border-border">
            {/* Poster */}
            <div
              className="w-full rounded-sm overflow-hidden"
              style={{ aspectRatio: '2/3', backgroundColor: movie.posterColor }}
            >
              {movie.posterUrl ? (
                <img
                  src={movie.posterUrl}
                  alt={movie.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${movie.posterColor}, #1a1a1e)` }} />
              )}
            </div>

            {/* Score */}
            <div className="flex items-center gap-2">
              <span
                className="text-2xl font-bold"
                style={{ fontFamily: 'var(--font-mono)', color: scoreColor(movie.matchScore) }}
              >
                {movie.matchScore}%
              </span>
              <span
                className="text-muted-foreground text-xs leading-tight"
                style={{ fontFamily: 'var(--font-sans)' }}
              >
                de<br />compatibilidade
              </span>
            </div>

            {/* Genres + moods */}
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <span key={g} className="text-xs px-2 py-0.5 border border-border text-muted-foreground rounded-sm">{g}</span>
              ))}
              {movie.moods.map((m) => (
                <span key={m} className="text-xs px-2 py-0.5 text-muted-foreground rounded-sm" style={{ backgroundColor: 'var(--color-muted)' }}>{m}</span>
              ))}
            </div>

            {/* Match reason */}
            <div>
              <p
                className="text-xs uppercase tracking-widest mb-2"
                style={{ fontFamily: 'var(--font-mono)', color: scoreColor(movie.matchScore), fontSize: '0.6rem' }}
              >
                Por que você vai gostar
              </p>
              <p className="text-secondary-foreground text-xs leading-relaxed" style={{ fontFamily: 'var(--font-sans)' }}>
                {movie.matchReason}
              </p>
            </div>
          </div>

          {/* Right: gallery */}
          <div className="flex-1 p-5 flex flex-col gap-4 overflow-auto">
            <div className="flex items-center justify-between">
              <div>
                <p
                  className="text-xs uppercase tracking-widest text-muted-foreground"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}
                >
                  Galeria
                </p>
                <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: 'var(--font-sans)' }}>
                  Imagens de referência do filme
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(movie.title + ' ' + (movie.year ?? '') + ' film stills')}&tbm=isch`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-secondary-foreground transition-colors rounded-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  Google
                </a>
                <a
                  href={`https://pinterest.com/search/pins/?q=${encodeURIComponent(movie.title + ' film')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground hover:border-secondary-foreground transition-colors rounded-sm"
                  style={{ fontFamily: 'var(--font-sans)' }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                  </svg>
                  Pinterest
                </a>
              </div>
            </div>

            {/* Photo grid — replace src with Pinterest/Google Images API */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {images.map((src, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-sm"
                  style={{ aspectRatio: '3/2', backgroundColor: 'var(--color-muted)' }}
                >
                  <img
                    src={src}
                    alt={`${movie.title} - imagem ${i + 1}`}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>

            <p
              className="text-muted-foreground text-xs"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}
            >
              {/* Replace placeholder images with your Pinterest or Google Images API integration */}
              Imagens ilustrativas · conecte sua API do Pinterest ou Google para exibir fotos reais do filme
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
