'use client'

import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { label: 'demo', href: '/demo' },
  { label: 'dashboard', href: '/dashboard' },
  { label: 'intake form', href: '/intake?demo=true' },
  { label: 'hazel companion', href: '/passport' },
]

interface NavHeaderProps {
  subtitle?: string
  right?: React.ReactNode
}

function LeafIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-hazel-cream/50">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

export function NavHeader({ subtitle, right }: NavHeaderProps) {
  const pathname = usePathname()

  return (
    <header className="bg-hazel-green px-6 md:px-8 py-4 flex items-center justify-between gap-4">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2 shrink-0 group">
        <LeafIcon />
        <div>
          <span className="hazel-wordmark text-hazel-cream text-xl group-hover:text-hazel-cream/80 transition-colors">
            hazel
          </span>
          {subtitle && (
            <span className="hidden sm:inline text-hazel-cream/50 text-sm ml-2">· {subtitle}</span>
          )}
        </div>
      </a>

      {/* Nav links */}
      <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 justify-center">
        {NAV_LINKS.map(({ label, href }) => {
          const basePath = href.split('?')[0]
          const isActive = pathname === basePath
          return (
            <a
              key={label}
              href={href}
              className={`whitespace-nowrap text-sm px-3 py-1.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-white/20 text-hazel-cream font-medium'
                  : 'text-hazel-cream/65 hover:text-hazel-cream hover:bg-white/10'
              }`}
            >
              {label}
            </a>
          )
        })}
      </nav>

      {/* Optional right slot */}
      {right ? (
        <div className="shrink-0 flex items-center gap-3">{right}</div>
      ) : (
        <div className="shrink-0 w-[72px]" /> // spacer to keep logo centered
      )}
    </header>
  )
}
