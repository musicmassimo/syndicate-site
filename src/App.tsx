import NavBar from './components/NavBar'
import Home from './pages/Home'

export default function App() {
  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <NavBar />
      <main className="flex-1">
        <Home />
      </main>
      <footer className="px-6 py-10 text-center text-[10px] uppercase tracking-[0.2em] text-white/30">
        © 2026 Massimo Paparello. All rights reserved.
      </footer>
    </div>
  )
}
