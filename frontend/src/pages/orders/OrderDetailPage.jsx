import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Truck, Check, X, Ban, AlertCircle } from 'lucide-react'
import { ordersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { StatusBadge } from '../../components/common/StatusBadge'

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
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Retrieving purchase order contract...</span>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Order Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve purchase order record for ID: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/purchase-orders')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Orders Registry
        </Button>
      </div>
    )
  }

  const orderKey = order.id || order._id || order.order_id
  const isSeller = user?.id === order.seller_id || user?.email === order.seller_id || user?.role === 'farmer' || user?.role === 'admin'
  const isBuyer = user?.id === order.buyer_id || user?.email === order.buyer_id || user?.role === 'buyer' || user?.role === 'admin'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/purchase-orders')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ORDERS_REGISTRY
      </Button>

      {/* Header Deck */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="sage" size="sm" className="font-mono uppercase tracking-widest text-[10px]">
                  PRODUCE: {order.produce_type}
                </Badge>
                <StatusBadge status={order.status} />
              </div>
              <h1 className="text-3xl font-mono font-bold text-[#1B2A20] tracking-tight">{order.order_id || orderKey}</h1>
              <p className="text-[#526357] text-sm mt-1.5">
                Required Delivery: <span className="text-[#B36B21] font-mono font-semibold">{formatDate(order.preferred_delivery_date)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {/* Action buttons based on status & role */}
              {order.status === 'PLACED' && isSeller && (
                <>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => acceptMutation.mutate()}
                    disabled={acceptMutation.isPending}
                    className="gap-1.5 bg-[#244634] hover:bg-[#1A3326] text-white"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {acceptMutation.isPending ? 'Accepting...' : 'Accept Contract'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rejectMutation.mutate()}
                    disabled={rejectMutation.isPending}
                    className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    {rejectMutation.isPending ? 'Rejecting...' : 'Reject Contract'}
                  </Button>
                </>
              )}

              {order.status === 'ACCEPTED' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/freight-bookings/new', {
                    state: {
                      purchaseOrderId: orderKey,
                      cargoWeightKg: order.requested_quantity_kg,
                      produceType: order.produce_type,
                      batchId: order.batch_id,
                    }
                  })}
                  className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
                >
                  <Truck className="w-4 h-4" />
                  <span>Book Freight Transport</span>
                </Button>
              )}

              {['PLACED', 'ACCEPTED'].includes(order.status) && isBuyer && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => cancelMutation.mutate()}
                  disabled={cancelMutation.isPending}
                  className="gap-1.5 border-[#E1DDD0] text-[#526357] hover:bg-[#F2EFE7]"
                >
                  <Ban className="w-3.5 h-3.5" />
                  {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              )}
            </div>
          </div>

          {actionError && (
            <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono">
              {actionError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Commercial & Financial Terms
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Requested Volume</dt>
                <dd className="text-[#1B2A20] font-bold">{formatWeight(order.requested_quantity_kg)}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Agreed Unit Price</dt>
                <dd className="text-[#244634] font-bold">{formatCurrency(order.unit_price_paise)} / kg</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Total Contract Value</dt>
                <dd className="text-[#244634] text-sm font-bold">
                  {formatCurrency(order.total_amount_paise || (order.unit_price_paise * order.requested_quantity_kg))}
                </dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Accepted Quantity</dt>
                <dd className="text-[#26312A]">{formatWeight(order.accepted_quantity_kg || 0)}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#7A887E]">Fulfilled Quantity</dt>
                <dd className="text-[#2F6586] font-semibold">{formatWeight(order.fulfilled_quantity_kg || 0)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Routing & Origin Provenance
              </h3>
              <div className="space-y-3.5 text-xs font-mono">
                <div>
                  <span className="text-[#7A887E] block text-[10px] uppercase font-semibold">Provenance Batch ID</span>
                  <span className="text-[#244634] font-bold">{order.batch_id || 'Not linked to single harvest lot'}</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE7DA] mt-6 text-[11px] font-mono text-[#526357] flex justify-between items-center">
              <span>Buyer: {order.buyer_id}</span>
              <span>Created: {formatDateTime(order.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
