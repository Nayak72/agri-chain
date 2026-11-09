import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import AmbientBackground from './AmbientBackground'

export default function AppShell() {
  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-200 font-sans">
      <AmbientBackground />
      <Navbar />
      <main className="relative z-10">
        <Outlet />
      </main>
    </div>
  )
}

