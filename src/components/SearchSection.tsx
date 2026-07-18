import { useState, type FormEvent } from 'react'

interface SearchSectionProps {
  onSearch: (username: string, referenceMovie: string) => void
  isLoading: boolean
  hasResults: boolean
}

export default function SearchSection({ onSearch, isLoading, hasResults }: SearchSectionProps) {
  const [username, setUsername] = useState('')
  const [referenceMovie, setReferenceMovie] = useState('')

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (username.trim()) onSearch(username.trim(), referenceMovie.trim())
  }

  return (
    <section
      className={`transition-all duration-700 ${
        hasResults ? 'py-10 border-b border-border' : 'py-24 md:py-36'
      }`}
    >
      <div className="max-w-2xl mx-auto px-6">
        {!hasResults && (
          <>
            <p
              className="text-muted-foreground text-xs tracking-widest uppercase mb-6"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              recomendações de filmes
            </p>
            <h1
              className="text-foreground mb-3 leading-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.25rem)',
                fontWeight: 700,
              }}
            >
              O seu próximo filme favorito
              <br />
              <span style={{ fontStyle: 'italic', color: 'var(--color-primary)' }}>
                já está no seu diário.
              </span>
            </h1>
            <p className="text-secondary-foreground text-base mb-10 max-w-lg leading-relaxed">
              Analisamos o seu perfil de gosto no Letterboxd — o que você amou, descartou e se obcecou — para encontrar filmes alinhados à sua curadoria pessoal.
            </p>
          </>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Username input */}
          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none pointer-events-none"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                letterboxd.com/
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seunomedeusuario"
                className="w-full bg-card border border-border text-foreground placeholder-muted-foreground
                           rounded-sm outline-none transition-all duration-200 text-sm
                           focus:border-primary focus:ring-1 focus:ring-ring"
                style={{
                  paddingLeft: '8.75rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem',
                  fontFamily: 'var(--font-sans)',
                }}
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="bg-primary text-primary-foreground text-sm font-medium px-6 py-3 rounded-sm
                         transition-all duration-200 hover:opacity-90 active:scale-[0.98]
                         disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Analisando
                </span>
              ) : (
                'Gerar Recomendações'
              )}
            </button>
          </div>

          {/* Reference movie input — styled as a special "inspiration" field */}
          <div
            className="flex items-center gap-0 rounded-sm border overflow-hidden transition-all duration-200 focus-within:border-primary/60"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-card)',
            }}
          >
            {/* Icon prefix tab */}
            <div
              className="flex items-center gap-2 px-3 py-3 border-r shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                style={{ color: 'var(--color-primary)', opacity: 0.8 }}
              >
                {/* Clapperboard icon */}
                <path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8H4z" />
                <path d="M4 11V7l2-2h12l2 2v4H4z" />
                <line x1="4" y1="11" x2="20" y2="11" />
                <line x1="9" y1="7" x2="7" y2="11" />
                <line x1="14" y1="7" x2="12" y2="11" />
                <line x1="19" y1="7" x2="17" y2="11" />
              </svg>
              <span
                className="text-xs whitespace-nowrap"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-primary)', opacity: 0.8 }}
              >
                inspirado em
              </span>
            </div>
            <input
              type="text"
              value={referenceMovie}
              onChange={(e) => setReferenceMovie(e.target.value)}
              placeholder="Título de um filme como referência (opcional)"
              className="flex-1 bg-transparent text-foreground placeholder-muted-foreground
                         outline-none text-sm"
              style={{
                padding: '0.75rem 1rem',
                fontFamily: 'var(--font-sans)',
              }}
              disabled={isLoading}
            />
          </div>
        </form>

        {!hasResults && (
          <p className="text-muted-foreground text-xs mt-4 leading-relaxed">
            Lemos apenas os seus dados públicos do Letterboxd. Nenhum login é necessário.
          </p>
        )}
      </div>
    </section>
  )
}
