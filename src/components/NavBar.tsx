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
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="text-lg font-bold tracking-widest">
          SYNDICATE
        </NavLink>
        <ul className="flex gap-6 text-sm uppercase tracking-wide">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  isActive ? 'text-white' : 'text-white/50 hover:text-white'
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
