import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AuthContext from '../context/AuthContext'
import FarmsListPage from '../pages/farms/FarmsListPage'
import FarmCreatePage from '../pages/farms/FarmCreatePage'
import OrderCreatePage from '../pages/orders/OrderCreatePage'
import FreightQuotesPage from '../pages/freight/FreightQuotesPage'
import { farmsApi, batchesApi } from '../api/agriculture.api'
import { usersApi } from '../api/users.api'
import { ordersApi, freightQuotesApi, freightBookingsApi } from '../api/commerce.api'

function mount(component, role = 'FARMER') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><AuthContext.Provider value={{ user: { id: 'farmer-id', role }, can: () => false }}><MemoryRouter>{component}</MemoryRouter></AuthContext.Provider></QueryClientProvider>)
}
beforeEach(() => {
  vi.spyOn(farmsApi, 'list').mockResolvedValue({ data: [] })
  vi.spyOn(usersApi, 'list').mockResolvedValue({ data: { users: [{ id: 'farmer-id', full_name: 'Farmer', email: 'farmer@test', is_active: true, is_approved: true }], total: 1 } })
  vi.spyOn(farmsApi, 'create').mockResolvedValue({ data: { id: 'new-farm' } })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })

it.each(['FARMER', 'ADMIN', 'farmer'])('shows Register Farm for %s', async role => {
  mount(<FarmsListPage />, role)
  expect(await screen.findByRole('button', { name: 'Register Farm' })).toBeInTheDocument()
})
it('does not show farm creation to a buyer', () => {
  mount(<FarmsListPage />, 'BUYER')
  expect(screen.queryByRole('button', { name: 'Register Farm' })).not.toBeInTheDocument()
})
it.each(['FARMER', 'ADMIN'])('submits farm with correct ownership for %s', async role => {
  mount(<FarmCreatePage />, role)
  for (const [label, value] of [['Farm name', 'Mentor farm'], ['City', 'Nashik'], ['State', 'Maharashtra'], ['Pincode', '422001']]) fireEvent.change(screen.getByLabelText(label), { target: { value } })
  if (role === 'ADMIN') {
    await screen.findByRole('option', { name: 'Farmer (farmer@test)' })
    fireEvent.change(screen.getByLabelText('Farmer'), { target: { value: 'farmer-id' } })
  }
  fireEvent.click(screen.getByRole('button', { name: 'Save farm' }))
  await waitFor(() => expect(farmsApi.create).toHaveBeenCalled())
  expect(farmsApi.create.mock.calls[0][0].farmer_id).toBe(role === 'ADMIN' ? 'farmer-id' : undefined)
  expect(usersApi.list).toHaveBeenCalledTimes(role === 'ADMIN' ? 1 : 0)
})
it('buyer order derives seller and commodity from available batch without directory calls', async () => {
  vi.spyOn(batchesApi, 'list').mockResolvedValue({ data: [
    { id: 'batch-1', batch_id: 'TOM-1', farmer_id: 'seller-1', produce_type: 'TOMATO', status: 'AT_WAREHOUSE', available_kg: 1950 },
    { id: 'unreceived', batch_id: 'TOM-2', status: 'CREATED', available_kg: 2000 },
  ] })
  vi.spyOn(ordersApi, 'create').mockResolvedValue({ data: { id: 'order-1' } })
  const { container } = mount(<OrderCreatePage />, 'BUYER')
  await screen.findByRole('option', { name: /TOM-1/ })
  expect(screen.queryByRole('option', { name: /TOM-2/ })).not.toBeInTheDocument()
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'batch-1' } })
  for (const [name, value] of [['requested_quantity_kg', '500'], ['unit_price_inr', '30.29'], ['preferred_delivery_date', '2026-12-01']]) fireEvent.change(container.querySelector(`[name="${name}"]`), { target: { value } })
  fireEvent.submit(container.querySelector('form'))
  await waitFor(() => expect(ordersApi.create).toHaveBeenCalledWith(expect.objectContaining({ seller_id: 'seller-1', produce_type: 'TOMATO', unit_price_paise: 3029, requested_quantity_kg: 500 })))
  expect(usersApi.list).not.toHaveBeenCalled()
})
it.each(['BUYER', 'FARMER', 'ADMIN', 'TRANSPORTER'])('quotation form respects %s role', async role => {
  vi.spyOn(freightQuotesApi, 'list').mockResolvedValue({ data: [] })
  vi.spyOn(freightBookingsApi, 'list').mockResolvedValue({ data: [] })
  mount(<FreightQuotesPage />, role)
  await waitFor(() => expect(freightQuotesApi.list).toHaveBeenCalled())
  expect(!!screen.queryByRole('button', { name: 'Transmit Quotation Bid' })).toBe(role === 'TRANSPORTER')
})
