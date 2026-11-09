import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ordersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate, getStatusColor, formatStatus } from '../../utils'

export default function OrdersListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => ordersApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const orderList = Array.isArray(orders) ? orders : orders?.items || []
  const filtered = orderList.filter(o => {
    const matchesSearch = o.order_id?.toLowerCase().includes(search.toLowerCase()) ||
      o.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
      o.pickup_address?.toLowerCase().includes(search.toLowerCase()) ||
      o.delivery_address?.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const canCreate = user?.role === 'admin' || user?.role === 'buyer'

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              Commercial Trade
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Purchase <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Orders</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            Agricultural commodity procurement contracts, buyer commitments, and settlement amounts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
          {canCreate && (
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-semibold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Purchase Order
            </button>
          )}
        </div>
      </div>

      {/* Filter and Status */}
      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search order ID, commodity, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2.5 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2">
          {['ALL', 'CREATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FULFILLED', 'CANCELLED'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all ${
                statusFilter === st
                  ? 'bg-cyan-500/10 border border-cyan-500 text-cyan-400'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <span className="text-slate-500 font-mono text-sm animate-pulse">Querying trade orders...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 bg-[#0b1121]/40 p-16 text-center">
          <div className="text-4xl mb-4">🧾</div>
          <h3 className="text-xl font-medium text-white mb-2">No Purchase Orders</h3>
          <p className="text-slate-500 mb-6 max-w-sm mx-auto">
            {search ? 'No orders match your filter criteria.' : 'No agricultural purchase orders recorded yet.'}
          </p>
          {canCreate && !search && (
            <button
              onClick={() => navigate('/purchase-orders/new')}
              className="text-cyan-400 hover:text-cyan-300 font-medium text-sm"
            >
              + Place First Order
            </button>
          )}
        </div>
      ) : (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Commodity</th>
                <th className="px-6 py-4">Quantity</th>
                <th className="px-6 py-4">Price / Total</th>
                <th className="px-6 py-4">Delivery Due</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map((order) => {
                const orderKey = order.id || order._id || order.order_id
                const statusColor = getStatusColor(order.status)
                return (
                  <tr
                    key={orderKey}
                    onClick={() => navigate(`/purchase-orders/${orderKey}`)}
                    className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-bold text-cyan-400">{order.order_id || orderKey}</td>
                    <td className="px-6 py-4 text-slate-200">{order.produce_type}</td>
                    <td className="px-6 py-4 text-slate-300 font-semibold">{formatWeight(order.requested_quantity_kg)}</td>
                    <td className="px-6 py-4">
                      <div className="text-emerald-400 font-bold">{formatCurrency(order.total_amount_paise || (order.unit_price_paise * order.requested_quantity_kg))}</div>
                      <div className="text-[10px] text-slate-500">@{formatCurrency(order.unit_price_paise)}/kg</div>
                    </td>
                    <td className="px-6 py-4 text-amber-400">{formatDate(order.preferred_delivery_date)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] uppercase tracking-wider ${statusColor}`}>
                        {formatStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-cyan-400 hover:text-cyan-300">
                      View Order →
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

