const links = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#music', label: 'Music' },
  { href: '#booking', label: 'Booking' },
]

export default function NavBar() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <a
          href="#home"
          className="text-sm font-bold uppercase tracking-[0.35em] text-white"
        >
          Syndicate
        </a>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.2em]">
          {links.map(({ href, label }) => (
            <li key={href}>
              <a
                href={href}
                className="text-white/50 transition-opacity hover:opacity-70"
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
