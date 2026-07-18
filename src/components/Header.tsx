type Page = 'home' | 'us'

interface HeaderProps {
  currentPage: Page
  onNavigate: (page: Page) => void
}

export default function Header({ currentPage, onNavigate }: HeaderProps) {
  return (
    <header className="border-b border-border px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <button
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        onClick={() => onNavigate('home')}
      >
        <div className="w-6 h-6 flex flex-col justify-center gap-[3px]">
          <span className="block h-[2px] bg-primary w-full" />
          <span className="block h-[2px] bg-primary w-4/5" />
          <span className="block h-[2px] bg-primary w-3/5" />
        </div>
        <span
          className="text-foreground tracking-tight leading-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
        >
          leco
        </span>
      </button>

      {/* Navigation */}
      <nav className="flex items-center gap-1">
        <NavButton
          active={currentPage === 'home'}
          onClick={() => onNavigate('home')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          Descobrir
        </NavButton>

        <NavButton
          active={currentPage === 'us'}
          onClick={() => onNavigate('us')}
          rose
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill={currentPage === 'us' ? '#c97d8a' : 'none'}
            stroke={currentPage === 'us' ? '#c97d8a' : 'currentColor'}
            strokeWidth="2"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
          Para nós
        </NavButton>
      </nav>

      {/* Status badge */}
      <div className="hidden sm:flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span
          className="text-muted-foreground text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          powered by letterboxd
        </span>
      </div>
    </header>
  )
}

function NavButton({
  children,
  active,
  onClick,
  rose = false,
}: {
  children: React.ReactNode
  active: boolean
  onClick: () => void
  rose?: boolean
}) {
  const activeColor = rose ? '#c97d8a' : 'var(--color-primary)'
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs transition-all duration-150"
      style={{
        fontFamily: 'var(--font-sans)',
        color: active ? activeColor : 'var(--color-muted-foreground)',
        backgroundColor: active ? (rose ? 'rgba(201,125,138,0.1)' : 'rgba(212,166,71,0.1)') : 'transparent',
        border: active ? `1px solid ${rose ? 'rgba(201,125,138,0.25)' : 'rgba(212,166,71,0.25)'}` : '1px solid transparent',
      }}
    >
      {children}
    </button>
  )
}
