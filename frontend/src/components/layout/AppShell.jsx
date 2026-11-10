import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'

export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen w-full bg-[#F6F4EC] text-[#26312A] font-sans antialiased flex">
      {/* Desktop Persistent Sidebar in Deep Forest Green */}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={setCollapsed}
      />

      {/* Mobile Slide-in Drawer */}
      <MobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-200 ${
          collapsed ? 'lg:pl-[72px]' : 'lg:pl-[252px]'
        }`}
      >
        <Topbar onOpenMobile={() => setMobileOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
