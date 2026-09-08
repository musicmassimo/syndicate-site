import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/music', label: 'Music' },
  { to: '/shows', label: 'Shows' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/contact', label: 'Contact' },
]

export default function NavBar() {
  return (
    <header className="border-b border-white/10">
      <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 py-5">
        <NavLink
          to="/"
          className="text-sm font-bold uppercase tracking-[0.35em] text-white"
        >
          Syndicate
        </NavLink>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.2em]">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `transition-opacity hover:opacity-70 ${
                    isActive ? 'text-[#ff9d4d]' : 'text-white/50'
                  }`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
