import React from 'react'
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuthContext from '../context/AuthContext'
import ColdChainPage from '../pages/monitoring/ColdChainPage'
import AnalyticsPage from '../pages/monitoring/AnalyticsPage'
import LedgerPage from '../pages/monitoring/LedgerPage'

beforeAll(() => {
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const mockAuthValue = {
  user: { id: 'usr-1', email: 'admin@agrichain.com', role: 'ADMIN', full_name: 'Admin User' },
  can: () => true,
}

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue}>
        <MemoryRouter>
          {ui}
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  )
}

describe('Monitoring & Analytics Pages Render Verification', () => {
  it('renders ColdChainPage without ReferenceError or runtime crashes', async () => {
    const { container } = renderWithProviders(<ColdChainPage />)
    expect(container).toBeInTheDocument()
    expect(screen.getByText('Cold-Chain Monitoring & Telemetry')).toBeInTheDocument()
    expect(screen.getByText(/Select Active Shipment/i)).toBeInTheDocument()
  })

  it('renders AnalyticsPage without runtime crashes', async () => {
    const { container } = renderWithProviders(<AnalyticsPage />)
    expect(container).toBeInTheDocument()
    expect(screen.getByText('Supply Chain Analytics & Intelligence')).toBeInTheDocument()
  })

  it('renders LedgerPage without runtime crashes', async () => {
    const { container } = renderWithProviders(<LedgerPage />)
    expect(container).toBeInTheDocument()
    expect(screen.getByText('Cryptographic Audit Ledger Explorer')).toBeInTheDocument()
  })
})
