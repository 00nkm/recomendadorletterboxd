import { useState } from 'react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoupleMovie {
  id: number
  title: string
  year: number
  director: string
  posterUrl: string
  posterColor: string
  rating?: { you: number; partner: number }
  note?: string
}

interface CoupleRec {
  id: number
  title: string
  year: number
  director: string
  posterUrl: string
  posterColor: string
  matchScore: number
  reason: string
  genres: string[]
}

// ─── Mock data ────────────────────────────────────────────────────────────────
// Replace with your backend API calls

const watchedTogether: CoupleMovie[] = [
  {
    id: 1,
    title: 'La La Land',
    year: 2016,
    director: 'Damien Chazelle',
    posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=600&fit=crop&auto=format',
    posterColor: '#1a1228',
    rating: { you: 4, partner: 5 },
    note: 'Nossa primeira sessão juntos ♥',
  },
  {
    id: 2,
    title: 'Before Sunrise',
    year: 1995,
    director: 'Richard Linklater',
    posterUrl: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&h=600&fit=crop&auto=format',
    posterColor: '#1a1510',
    rating: { you: 5, partner: 5 },
  },
  {
    id: 3,
    title: 'In the Mood for Love',
    year: 2000,
    director: 'Wong Kar-wai',
    posterUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&h=600&fit=crop&auto=format',
    posterColor: '#1a0e10',
    rating: { you: 5, partner: 4 },
  },
  {
    id: 4,
    title: 'Eternal Sunshine of the Spotless Mind',
    year: 2004,
    director: 'Michel Gondry',
    posterUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=600&fit=crop&auto=format',
    posterColor: '#0e1520',
    rating: { you: 5, partner: 5 },
  },
]

const coupleRecs: CoupleRec[] = [
  {
    id: 101,
    title: 'Past Lives',
    year: 2023,
    director: 'Celine Song',
    posterUrl: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&h=600&fit=crop&auto=format',
    posterColor: '#0a1520',
    matchScore: 96,
    reason: 'Vocês dois amam narrativas de amor silencioso e inevitável. Song captura a melancolia de encontros tardios com uma precisão que vai ressoar nos dois.',
    genres: ['Romance', 'Drama'],
  },
  {
    id: 102,
    title: 'Amour',
    year: 2012,
    director: 'Michael Haneke',
    posterUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&h=600&fit=crop&auto=format',
    posterColor: '#151210',
    matchScore: 91,
    reason: 'Ambos os perfis têm alta tolerância para filmes emocionalmente densos. Haneke filma o amor com a coragem de não suavizar nada.',
    genres: ['Drama'],
  },
  {
    id: 103,
    title: 'Carol',
    year: 2015,
    director: 'Todd Haynes',
    posterUrl: 'https://images.unsplash.com/photo-1440688807730-73e4e2169fb8?w=400&h=600&fit=crop&auto=format',
    posterColor: '#1a1408',
    matchScore: 93,
    reason: 'O perfil combinado de vocês aponta forte afinidade com romance de época e fotografia contemplativa. Haynes constrói tensão apenas com olhares.',
    genres: ['Romance', 'Drama'],
  },
  {
    id: 104,
    title: 'Her',
    year: 2013,
    director: 'Spike Jonze',
    posterUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=600&fit=crop&auto=format',
    posterColor: '#1a100a',
    matchScore: 88,
    reason: 'Vocês têm gostos complementares em sci-fi filosófico. Jonze usa futuro como pretexto para falar do presente — e do que é amar alguém que você não consegue alcançar.',
    genres: ['Romance', 'Sci-Fi'],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <svg
          key={i}
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill={i < value ? '#c97d8a' : 'none'}
          stroke={i < value ? '#c97d8a' : '#3a3a3e'}
          strokeWidth="2"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function WatchedCard({ film }: { film: CoupleMovie }) {
  return (
    <div
      className="border border-border rounded-sm overflow-hidden flex flex-col transition-all duration-200 hover:border-[#c97d8a]/30"
      style={{ backgroundColor: 'var(--color-card)' }}
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '2/3', backgroundColor: film.posterColor }}
      >
        <img
          src={film.posterUrl}
          alt={film.title}
          className="w-full h-full object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--color-card), transparent)' }}
        />
      </div>
      <div className="p-3 flex flex-col gap-2">
        <h3
          className="text-foreground leading-tight text-sm"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {film.title}
        </h3>
        <p
          className="text-muted-foreground text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {film.year} · {film.director}
        </p>
        {film.rating && (
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>você</span>
              <StarRating value={film.rating.you} />
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex flex-col gap-0.5">
              <span className="text-muted-foreground" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem' }}>parceira</span>
              <StarRating value={film.rating.partner} />
            </div>
          </div>
        )}
        {film.note && (
          <p
            className="text-xs italic"
            style={{ fontFamily: 'var(--font-display)', color: '#c97d8a' }}
          >
            {film.note}
          </p>
        )}
      </div>
    </div>
  )
}

function RecCard({ film }: { film: CoupleRec }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      className="border border-border rounded-sm overflow-hidden flex flex-col transition-all duration-200 hover:border-[#c97d8a]/30 cursor-pointer"
      style={{ backgroundColor: 'var(--color-card)' }}
      onClick={() => setExpanded((v) => !v)}
    >
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: '2/3', backgroundColor: film.posterColor }}
      >
        <img
          src={film.posterUrl}
          alt={film.title}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.04]"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
        {/* Score badge in rose */}
        <div
          className="absolute top-3 right-3 text-xs font-medium px-2 py-1 rounded-sm backdrop-blur-sm"
          style={{
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'rgba(9,9,11,0.8)',
            color: '#c97d8a',
            border: '1px solid rgba(201,125,138,0.35)',
          }}
        >
          {film.matchScore}%
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-16 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--color-card), transparent)' }}
        />
      </div>
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3
          className="text-foreground leading-tight text-sm"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}
        >
          {film.title}
        </h3>
        <p className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
          {film.year} · {film.director}
        </p>
        <div className="flex gap-1.5 flex-wrap">
          {film.genres.map((g) => (
            <span key={g} className="text-xs px-2 py-0.5 border border-border text-muted-foreground rounded-sm">{g}</span>
          ))}
        </div>
        <div className="border-t border-border pt-2">
          <p
            className={`text-secondary-foreground text-xs leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
            style={{ fontFamily: 'var(--font-sans)' }}
          >
            {film.reason}
          </p>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

interface CouplePageProps {
  defaultUser1?: string
  defaultUser2?: string
}

export default function CouplePage({ defaultUser1 = '', defaultUser2 = '' }: CouplePageProps) {
  const [user1, setUser1] = useState(defaultUser1)
  const [user2, setUser2] = useState(defaultUser2)
  const [isLoading, setIsLoading] = useState(false)
  const [hasResults, setHasResults] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!user1.trim() || !user2.trim()) return
    setIsLoading(true)
    // Replace with your backend API call
    setTimeout(() => {
      setIsLoading(false)
      setHasResults(true)
    }, 1800)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Hero / search */}
      <section className={`transition-all duration-700 ${hasResults ? 'py-10 border-b border-border' : 'py-24 md:py-36'}`}>
        <div className="max-w-2xl mx-auto px-6">
          {!hasResults && (
            <>
              {/* Decorative heart */}
              <div className="flex items-center gap-2 mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#c97d8a" stroke="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <p
                  className="text-xs tracking-widest uppercase"
                  style={{ fontFamily: 'var(--font-mono)', color: '#c97d8a' }}
                >
                  para vocês dois
                </p>
              </div>
              <h1
                className="text-foreground mb-3 leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
                  fontWeight: 700,
                }}
              >
                Filmes que vocês vão
                <br />
                <span style={{ fontStyle: 'italic', color: '#c97d8a' }}>adorar assistir juntos.</span>
              </h1>
              <p className="text-secondary-foreground text-base mb-10 max-w-lg leading-relaxed">
                Combinamos os dois perfis do Letterboxd para encontrar filmes que encaixam no gosto de vocês — e registrar o que já assistiram juntos.
              </p>
            </>
          )}

          <form onSubmit={handleSearch} className="flex flex-col gap-3">
            <div className="flex gap-3 flex-col sm:flex-row">
              {/* User 1 */}
              <div className="flex-1 relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}
                >
                  letterboxd.com/
                </span>
                <input
                  type="text"
                  value={user1}
                  onChange={(e) => setUser1(e.target.value)}
                  placeholder="você"
                  className="w-full bg-card border border-border text-foreground placeholder-muted-foreground
                             rounded-sm outline-none transition-all duration-200 text-sm focus:border-[#c97d8a]/60"
                  style={{
                    paddingLeft: '8.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    fontFamily: 'var(--font-sans)',
                  }}
                  disabled={isLoading}
                />
              </div>

              {/* Heart divider */}
              <div className="flex items-center justify-center sm:w-8 shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#c97d8a" stroke="none" className="opacity-60">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </div>

              {/* User 2 */}
              <div className="flex-1 relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs select-none pointer-events-none"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-muted-foreground)' }}
                >
                  letterboxd.com/
                </span>
                <input
                  type="text"
                  value={user2}
                  onChange={(e) => setUser2(e.target.value)}
                  placeholder="ela"
                  className="w-full bg-card border border-border text-foreground placeholder-muted-foreground
                             rounded-sm outline-none transition-all duration-200 text-sm focus:border-[#c97d8a]/60"
                  style={{
                    paddingLeft: '8.5rem',
                    paddingRight: '1rem',
                    paddingTop: '0.75rem',
                    paddingBottom: '0.75rem',
                    fontFamily: 'var(--font-sans)',
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !user1.trim() || !user2.trim()}
              className="w-full sm:w-auto self-start text-sm font-medium px-6 py-3 rounded-sm
                         transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-sans)',
                backgroundColor: '#c97d8a',
                color: '#09090b',
              }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Combinando perfis…
                </span>
              ) : (
                'Encontrar filmes para nós'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-px rounded-full animate-pulse"
                style={{
                  height: '2rem',
                  backgroundColor: '#c97d8a',
                  animationDelay: `${i * 150}ms`,
                  opacity: 0.5 + i * 0.15,
                }}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            cruzando os gostos de vocês…
          </p>
        </div>
      )}

      {/* Results */}
      {hasResults && !isLoading && (
        <>
          {/* Profile bar */}
          <div className="px-6 py-4 border-b border-border">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
              <span className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                perfis
              </span>
              <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)' }}>
                @{user1}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#c97d8a" stroke="none">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span className="text-sm font-medium" style={{ fontFamily: 'var(--font-mono)', color: '#c97d8a' }}>
                @{user2}
              </span>
            </div>
          </div>

          {/* Watched together */}
          <div className="px-6 py-8 border-b border-border">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c97d8a" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <h2
                  className="text-foreground"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem' }}
                >
                  Assistidos juntos
                </h2>
                <span className="text-muted-foreground text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                  {watchedTogether.length} filmes
                </span>
              </div>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
              >
                {watchedTogether.map((f) => <WatchedCard key={f.id} film={f} />)}
              </div>
            </div>
          </div>

          {/* Recommendations for the couple */}
          <div className="px-6 py-8">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c97d8a" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <h2
                  className="text-foreground"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem' }}
                >
                  Para assistir juntos
                </h2>
              </div>
              <p className="text-muted-foreground text-xs mb-6" style={{ fontFamily: 'var(--font-sans)' }}>
                Curados a partir dos gostos combinados de vocês dois. Clique em um card para mais detalhes.
              </p>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
              >
                {coupleRecs.map((f) => <RecCard key={f.id} film={f} />)}
              </div>
            </div>
          </div>

          <div className="px-6 pb-10 max-w-7xl mx-auto">
            <p
              className="text-muted-foreground text-xs border-t border-border pt-6"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              Recomendações geradas cruzando o perfil de avaliações dos dois usuários. Os dados evolem junto com a atividade de vocês no Letterboxd.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
