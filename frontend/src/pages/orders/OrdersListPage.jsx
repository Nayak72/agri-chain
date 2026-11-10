import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, ShoppingBag } from 'lucide-react'
import { ordersApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatWeight, formatDate } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { EmptyState } from '../../components/common/EmptyState'

const STATUSES = ['ALL', 'CREATED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'FULFILLED', 'CANCELLED']

export default function OrdersListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const { data: orders, isLoading, refetch, isFetching } = useQuery({
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
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Commercial Trade"
        title="Purchase Orders"
        description="Agricultural commodity procurement contracts, buyer commitments, and settlement amounts."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2 bg-white/80 border-[#E1DDD0] hover:bg-[#F2EFE7] text-[#26312A]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </Button>
            {canCreate && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/purchase-orders/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Purchase Order</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Status Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search order ID, commodity, address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                statusFilter === st
                  ? 'bg-[#244634] text-white font-semibold shadow-xs'
                  : 'bg-white/80 border border-[#E1DDD0] text-[#526357] hover:bg-[#F2EFE7] hover:text-[#26312A]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Querying trade orders...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No Purchase Orders"
          description={search ? 'No orders match your filter criteria.' : 'No agricultural purchase orders recorded yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/purchase-orders/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Place First Order
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white/95 border border-[#E1DDD0] rounded-2xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-[#F2EFE7]/60">
              <TableRow className="border-[#ECE7DA] hover:bg-transparent">
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Order ID</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Commodity</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Quantity</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Price / Total</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Delivery Due</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
              {filtered.map((order) => {
                const orderKey = order.id || order._id || order.order_id
                return (
                  <TableRow
                    key={orderKey}
                    onClick={() => navigate(`/purchase-orders/${orderKey}`)}
                    className="hover:bg-[#F2EFE7]/40 cursor-pointer transition-colors border-[#ECE7DA]"
                  >
                    <TableCell className="font-bold text-[#244634] py-4">{order.order_id || orderKey}</TableCell>
                    <TableCell className="text-[#26312A] font-sans font-medium">{order.produce_type}</TableCell>
                    <TableCell className="text-[#26312A] font-semibold">{formatWeight(order.requested_quantity_kg)}</TableCell>
                    <TableCell>
                      <div className="text-[#244634] font-bold">{formatCurrency(order.total_amount_paise || (order.unit_price_paise * order.requested_quantity_kg))}</div>
                      <div className="text-[10px] text-[#7A887E]">@{formatCurrency(order.unit_price_paise)}/kg</div>
                    </TableCell>
                    <TableCell className="text-[#B36B21]">{formatDate(order.preferred_delivery_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[#244634] hover:underline font-semibold flex items-center justify-end gap-1">
                        View Order <ArrowRight className="w-3 h-3" />
                      </span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
