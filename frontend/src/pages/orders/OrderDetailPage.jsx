import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [actionError, setActionError] = useState('')

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['purchase-order', id],
    queryFn: () => ordersApi.get(id).then(res => res.data),
  })

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: () => ordersApi.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Accept failed.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: () => ordersApi.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Reject failed.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: () => ordersApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', id] })
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Cancel failed.'
      setActionError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <span className="text-slate-500 font-mono text-sm animate-pulse">Retrieving purchase order contract...</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Order Not Found</h2>
        <p className="text-slate-400 mb-6">Could not retrieve purchase order record for ID: {id}</p>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
        >
          Return to Orders Registry
        </button>
      </div>
    )
  }

  const orderKey = order.id || order._id || order.order_id
  const statusColor = getStatusColor(order.status)
  const isSeller = user?.id === order.seller_id || user?.email === order.seller_id || user?.role === 'farmer' || user?.role === 'admin'
  const isBuyer = user?.id === order.buyer_id || user?.email === order.buyer_id || user?.role === 'buyer' || user?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      <button
        onClick={() => navigate('/purchase-orders')}
        className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-6 flex items-center gap-2 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        ORDERS_REGISTRY
      </button>

      {/* Header Deck */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-8 mb-6 relative overflow-hidden shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                PRODUCE: {order.produce_type}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${statusColor}`}>
                {formatStatus(order.status)}
              </span>
            </div>
            <h1 className="text-3xl font-bold font-mono text-white tracking-tight">{order.order_id || orderKey}</h1>
            <p className="text-slate-400 text-sm mt-1">
              Required Delivery: <span className="text-amber-400 font-mono font-semibold">{formatDate(order.preferred_delivery_date)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* Action buttons based on status & role */}
            {order.status === 'SUBMITTED' && isSeller && (
              <>
                <button
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all"
                >
                  {acceptMutation.isPending ? 'Accepting...' : 'Accept Contract'}
                </button>
                <button
                  onClick={() => rejectMutation.mutate()}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2.5 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600 text-red-300 hover:text-white font-mono text-xs font-bold transition-all"
                >
                  {rejectMutation.isPending ? 'Rejecting...' : 'Reject Contract'}
                </button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <button
                onClick={() => navigate('/freight-bookings/new', {
                  state: {
                    purchaseOrderId: orderKey,
                    cargoWeightKg: order.requested_quantity_kg,
                    pickupAddress: order.pickup_address,
                    deliveryAddress: order.delivery_address,
                    produceType: order.produce_type,
                    batchId: order.batch_id,
                  }
                })}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-mono text-xs font-bold shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Book Freight Transport
              </button>
            )}

            {['SUBMITTED', 'ACCEPTED'].includes(order.status) && isBuyer && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-mono text-xs transition-all"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
            {actionError}
          </div>
        )}
      </div>

      {/* Contract Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6">
          <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
            Commercial & Financial Terms
          </h3>
          <dl className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Requested Volume</dt>
              <dd className="text-white font-bold">{formatWeight(order.requested_quantity_kg)}</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Agreed Unit Price</dt>
              <dd className="text-emerald-400 font-bold">{formatCurrency(order.unit_price_paise)} / kg</dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Total Contract Value</dt>
              <dd className="text-emerald-400 text-base font-bold">
                {formatCurrency(order.total_amount_paise || (order.unit_price_paise * order.requested_quantity_kg))}
              </dd>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-800/80">
              <dt className="text-slate-500">Accepted Quantity</dt>
              <dd className="text-slate-300">{formatWeight(order.accepted_quantity_kg || 0)}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-slate-500">Fulfilled Quantity</dt>
              <dd className="text-cyan-400">{formatWeight(order.fulfilled_quantity_kg || 0)}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">
              Routing & Origin Provenance
            </h3>
            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Provenance Batch ID</span>
                <span className="text-cyan-400 font-bold">{order.batch_id || 'Not linked to single harvest lot'}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Pickup Origin Location</span>
                <span className="text-slate-300">{order.pickup_address}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Destination Delivery Address</span>
                <span className="text-slate-300">{order.delivery_address}</span>
              </div>
              <div>
                <span className="text-slate-600 block text-[10px] uppercase">Handling Requirements</span>
                <span className="text-slate-400">{order.handling_requirements || 'Standard agricultural handling'}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-6 text-[10px] font-mono text-slate-600 flex justify-between">
            <span>Buyer: {order.buyer_id}</span>
            <span>Created: {formatDateTime(order.created_at)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

