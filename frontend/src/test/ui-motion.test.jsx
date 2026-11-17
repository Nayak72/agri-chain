import React, { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import RouteTransition from '../components/layout/RouteTransition'
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '../components/ui/dialog'
import { MobileNav } from '../components/layout/MobileNav'
import AuthContext from '../context/AuthContext'

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
