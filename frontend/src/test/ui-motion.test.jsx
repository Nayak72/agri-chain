import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import RouteTransition from '../components/layout/RouteTransition'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '../components/ui/dialog'
import { MobileNav } from '../components/layout/MobileNav'
import AuthContext from '../context/AuthContext'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); delete document.startViewTransition })

function NavigationFixture() {
  return <MemoryRouter initialEntries={['/first']}>
    <Link to="/second">Next page</Link>
    <Routes><Route element={<RouteTransition />}>
      <Route path="/first" element={<h1>First page</h1>} />
      <Route path="/second" element={<h1>Second page</h1>} />
    </Route></Routes>
  </MemoryRouter>
}

describe('presentation lifecycle', () => {
  it('still navigates if native snapshot creation throws', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    document.startViewTransition = vi.fn(() => { throw new Error('Snapshot unavailable') })
    render(<NavigationFixture />)
    fireEvent.click(screen.getByText('Next page'))
    expect(await screen.findByRole('heading', { name: 'Second page' })).toBeInTheDocument()
  })

  it('unlocks scrolling when an open drawer is resized to desktop', () => {
    let resize
    const media = { matches: false, addEventListener: (_, handler) => { resize = handler }, removeEventListener: vi.fn() }
    vi.stubGlobal('matchMedia', () => media)
    function Fixture() {
      const [open, setOpen] = useState(false)
      return <MemoryRouter><AuthContext.Provider value={{ user: { role: 'FARMER' } }}>
        <button onClick={() => setOpen(true)}>Open drawer</button>
        <MobileNav open={open} onClose={() => setOpen(false)} />
      </AuthContext.Provider></MemoryRouter>
    }
    render(<Fixture />)
    fireEvent.click(screen.getByText('Open drawer'))
    expect(document.body.style.overflow).toBe('hidden')
    media.matches = true
    // Dispatch through a DOM event so React's test utility flushes the update.
    window.addEventListener('resize', resize)
    fireEvent(window, new Event('resize'))
    window.removeEventListener('resize', resize)
    expect(document.body.style.overflow).toBe('')
    expect(document.querySelector('.mobile-presence')).toHaveAttribute('inert')
  })

  it('supports keyboard tabs, skips disabled options and labels the panel', () => {
    render(<Tabs defaultValue="stock"><TabsList>
      <TabsTrigger value="stock">Stock</TabsTrigger>
      <TabsTrigger value="disabled" disabled>Unavailable</TabsTrigger>
      <TabsTrigger value="receipts">Receipts</TabsTrigger>
    </TabsList><TabsContent value="stock">Stock content</TabsContent>
      <TabsContent value="receipts">Receipt content</TabsContent></Tabs>)
    const stock = screen.getByRole('tab', { name: 'Stock' })
    const receipts = screen.getByRole('tab', { name: 'Receipts' })
    stock.focus()
    fireEvent.keyDown(stock, { key: 'ArrowRight' })
    expect(receipts).toHaveFocus()
    expect(receipts).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Receipts' })).toHaveTextContent('Receipt content')
    fireEvent.keyDown(receipts, { key: 'ArrowRight' })
    expect(stock).toHaveFocus()
    fireEvent.keyDown(stock, { key: 'End' })
    expect(receipts).toHaveFocus()
    fireEvent.keyDown(receipts, { key: 'Home' })
    expect(stock).toHaveFocus()
  })

  it('navigates when native view transitions are unavailable', async () => {
    render(<NavigationFixture />)
    fireEvent.click(screen.getByText('Next page'))
    expect(await screen.findByRole('heading', { name: 'Second page' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'First page' })).not.toBeInTheDocument()
  })

  it('commits incoming content through native view transitions', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    document.startViewTransition = vi.fn((update) => {
      update()
      return { ready: Promise.resolve(), skipTransition: vi.fn() }
    })
    render(<NavigationFixture />)
    fireEvent.click(screen.getByText('Next page'))
    expect(await screen.findByRole('heading', { name: 'Second page' })).toBeInTheDocument()
    expect(document.startViewTransition).toHaveBeenCalledTimes(1)
  })

  it('skips native motion when reduced motion is requested', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    document.startViewTransition = vi.fn()
    render(<NavigationFixture />)
    fireEvent.click(screen.getByText('Next page'))
    expect(await screen.findByRole('heading', { name: 'Second page' })).toBeInTheDocument()
    expect(document.startViewTransition).not.toHaveBeenCalled()
  })

  it('retains the dialog for exit motion, restores focus and unlocks scrolling', async () => {
    function Fixture() {
      const [open, setOpen] = useState(false)
      return <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger><button>Open form</button></DialogTrigger>
        <DialogContent aria-label="Example form"><DialogTitle>Form</DialogTitle><input aria-label="Name" /></DialogContent>
      </Dialog>
    }
    render(<Fixture />)
    const trigger = screen.getByText('Open form')
    trigger.focus()
    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toHaveFocus()
    expect(document.body.style.overflow).toBe('hidden')
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.querySelector('[data-closing="true"]')).toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(document.body.style.overflow).toBe('')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the closed mobile drawer inert while preserving role filtering', () => {
    const { container, rerender } = render(<MemoryRouter><AuthContext.Provider value={{ user: { role: 'FARMER' } }}>
      <MobileNav open={false} onClose={() => {}} />
    </AuthContext.Provider></MemoryRouter>)
    expect(container.querySelector('.mobile-presence')).toHaveAttribute('inert')
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    rerender(<MemoryRouter><AuthContext.Provider value={{ user: { role: 'FARMER' } }}>
      <MobileNav open={true} onClose={() => {}} />
    </AuthContext.Provider></MemoryRouter>)
    expect(container.querySelector('.mobile-presence')).not.toHaveAttribute('inert')
    expect(screen.getByText('Farms')).toBeInTheDocument()
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
  })
})
