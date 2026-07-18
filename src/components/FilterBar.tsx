import { GENRES, MOODS, DECADES } from '../data/mockMovies'

export interface Filters {
  genre: string | null
  mood: string | null
  decade: string | null
}

interface FilterBarProps {
  filters: Filters
  onChange: (filters: Filters) => void
  count: number
}

function FilterGroup({
  label,
  options,
  active,
  onSelect,
}: {
  label: string
  options: string[]
  active: string | null
  onSelect: (val: string | null) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className="text-muted-foreground text-xs tracking-widest uppercase shrink-0"
        style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}
      >
        {label}
      </span>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((opt) => {
          const isActive = active === opt
          return (
            <button
              key={opt}
              onClick={() => onSelect(isActive ? null : opt)}
              className={`text-xs px-3 py-1 rounded-sm border transition-all duration-150
                ${isActive
                  ? 'border-primary text-primary bg-transparent'
                  : 'border-border text-muted-foreground hover:border-secondary-foreground hover:text-secondary-foreground'
                }`}
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function FilterBar({ filters, onChange, count }: FilterBarProps) {
  const hasActiveFilters = filters.genre || filters.mood || filters.decade

  return (
    <div className="border-b border-border px-6 py-5">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span
              className="text-foreground font-medium text-sm"
              style={{ fontFamily: 'var(--font-sans)' }}
            >
              {count} {count === 1 ? 'recomendação' : 'recomendações'}
            </span>
            {hasActiveFilters && (
              <button
                onClick={() => onChange({ genre: null, mood: null, decade: null })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                limpar filtros
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
          <FilterGroup
            label="Gênero"
            options={GENRES}
            active={filters.genre}
            onSelect={(val) => onChange({ ...filters, genre: val })}
          />
          <div className="hidden md:block w-px h-4 bg-border shrink-0" />
          <FilterGroup
            label="Clima"
            options={MOODS}
            active={filters.mood}
            onSelect={(val) => onChange({ ...filters, mood: val })}
          />
          <div className="hidden md:block w-px h-4 bg-border shrink-0" />
          <FilterGroup
            label="Década"
            options={DECADES}
            active={filters.decade}
            onSelect={(val) => onChange({ ...filters, decade: val })}
          />
        </div>
      </div>
    </div>
  )
}
