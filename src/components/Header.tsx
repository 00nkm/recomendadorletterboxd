export default function Header() {
  return (
    <header className="border-b border-border px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 flex flex-col justify-center gap-[3px]">
          <span className="block h-[2px] bg-primary w-full" />
          <span className="block h-[2px] bg-primary w-4/5" />
          <span className="block h-[2px] bg-primary w-3/5" />
        </div>
        <span
          className="text-foreground tracking-tight leading-none"
          style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}
        >
          reelmate
        </span>
        <span
          className="text-muted-foreground text-xs tracking-widest uppercase"
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.12em' }}
        >
          / curadoria de ia
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span
          className="text-muted-foreground text-xs"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          dados via letterboxd
        </span>
      </div>
    </header>
  )
}
