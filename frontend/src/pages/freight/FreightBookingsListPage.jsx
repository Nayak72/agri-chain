import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, Truck, ThermometerSnowflake } from 'lucide-react'
import { freightBookingsApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { EmptyState } from '../../components/common/EmptyState'

export default function FreightBookingsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: bookings, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['freight-bookings'],
    queryFn: () => freightBookingsApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const bookingList = Array.isArray(bookings) ? bookings : bookings?.items || []
  const filtered = bookingList.filter(b =>
    b.booking_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.pickup_city?.toLowerCase().includes(search.toLowerCase()) ||
    b.destination_city?.toLowerCase().includes(search.toLowerCase()) ||
    b.preferred_vehicle_category?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'buyer' || user?.role === 'farmer'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Logistics Dispatch"
        title="Freight Bookings"
        description="Transport dispatch requests, multi-transporter quotations, vehicle category matching, and cold-chain compliance."
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
                onClick={() => navigate('/freight-bookings/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>New Freight Booking</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search booking ID, route, vehicle category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <span className="text-xs font-mono text-[#526357] self-end sm:self-center">
          {filtered.length} booking{filtered.length === 1 ? '' : 's'} active
        </span>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Scanning freight booking requests...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Freight Bookings"
          description={search ? 'No bookings match your search query.' : 'No freight transportation requests have been posted yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/freight-bookings/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Freight Booking
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white/95 border border-[#E1DDD0] rounded-2xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-[#F2EFE7]/60">
              <TableRow className="border-[#ECE7DA] hover:bg-transparent">
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Booking ID</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Route</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Cargo Weight</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Vehicle Category</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Cold Chain</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Pickup Date</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] text-right">Quotes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
              {filtered.map((b) => {
                const bookingKey = b.id || b._id || b.booking_id
                return (
                  <TableRow
                    key={bookingKey}
                    onClick={() => navigate(`/freight-bookings/${bookingKey}`)}
                    className="hover:bg-[#F2EFE7]/40 cursor-pointer transition-colors border-[#ECE7DA]"
                  >
                    <TableCell className="font-bold text-[#244634] py-4">{b.booking_id || bookingKey}</TableCell>
                    <TableCell className="text-[#26312A] font-sans">
                      <span className="text-[#526357]">{b.pickup_city}</span>
                      <span className="text-[#244634] font-bold mx-1.5">→</span>
                      <span className="text-[#1B2A20] font-semibold">{b.destination_city}</span>
                    </TableCell>
                    <TableCell className="text-[#26312A] font-semibold">{formatWeight(b.cargo_quantity_kg)}</TableCell>
                    <TableCell className="text-[#526357]">{b.preferred_vehicle_category}</TableCell>
                    <TableCell>
                      {b.refrigeration_required ? (
                        <span className="px-2 py-0.5 rounded bg-[#E8EFE9] border border-[#C3D4C7] text-[#244634] text-[10px] flex items-center gap-1 w-fit">
                          <ThermometerSnowflake className="w-3 h-3 text-[#3F7C56]" />
                          Reefer ({b.temperature_min ?? 2}° to {b.temperature_max ?? 8}°C)
                        </span>
                      ) : (
                        <span className="text-[#7A887E] text-[10px]">Ambient</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#B36B21]">{formatDate(b.requested_pickup_date)}</TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-[#244634] hover:underline font-semibold flex items-center justify-end gap-1">
                        Inspect <ArrowRight className="w-3 h-3" />
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
