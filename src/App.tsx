import NavBar from './components/NavBar'
import Home from './pages/Home'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <NavBar />
      <main className="flex-1">
        <Home />
      </main>
      <footer className="flex flex-col items-center gap-4 px-6 py-10 text-center text-[10px] uppercase tracking-[0.2em] text-white/30">
        <a
          href="https://instagram.com/syndicatequintet"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="SYNDICATE on Instagram"
          className="text-white/40 transition-opacity hover:opacity-70"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
          </svg>
        </a>
        © 2026 Massimo Paparello. All rights reserved.
      </footer>
    </div>
  )
}
