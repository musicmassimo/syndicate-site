import { Outlet } from 'react-router-dom'
import NavBar from './NavBar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-canvas text-white">
      <NavBar />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <Outlet />
      </main>
    </div>
  )
}
