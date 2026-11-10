import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, Truck, ThermometerSnowflake, CheckCircle2 } from 'lucide-react'
import { fleetApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight, formatDate } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

export default function FleetListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: vehicles, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fleet-vehicles'],
    queryFn: () => fleetApi.listVehicles().then(res => res.data),
    staleTime: 30_000,
  })

  const vehicleList = Array.isArray(vehicles) ? vehicles : vehicles?.items || []
  const filtered = vehicleList.filter(v =>
    v.registration_number?.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase()) ||
    v.vehicle_type?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'transporter'

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        eyebrow="Rolling Stock"
        title="Fleet Inventory"
        description="Commercial haulage vehicles, active reefers, fitness certifications, and payload capacities."
        actions={
          <div className="flex items-center gap-2.5">
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
                onClick={() => navigate('/fleet/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register Vehicle</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and stats */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search registration number, category, type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <div className="text-xs font-mono text-[#526357] flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
          <span>{filtered.length} vehicle{filtered.length === 1 ? '' : 's'} registered</span>
        </div>
      </div>

      {/* Vehicles Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Reading fleet telematics...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No Fleet Vehicles Found"
          description={search ? 'No vehicles match your filter.' : 'No transport vehicles have been registered yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/fleet/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register First Vehicle
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((v) => {
            const vId = v.id || v._id || v.vehicle_id
            return (
              <Card
                key={vId}
                className="bg-white/90 border-[#E1DDD0] hover:border-[#244634]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between"
              >
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#7A887E] uppercase tracking-widest block">
                          {v.category || 'COMMERCIAL'}
                        </span>
                        <h3 className="text-base font-mono font-bold text-[#244634] mt-0.5">
                          {v.registration_number}
                        </h3>
                      </div>
                      {v.refrigeration_available ? (
                        <Badge variant="sage" size="sm" className="font-mono text-[10px] gap-1">
                          <ThermometerSnowflake className="w-3 h-3 text-[#3F7C56]" />
                          Cold Reefer
                        </Badge>
                      ) : (
                        <Badge variant="neutral" size="sm" className="font-mono text-[10px]">
                          Ambient
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#ECE7DA] mb-4 text-xs font-mono">
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Max Payload</span>
                        <span className="text-[#1B2A20] font-bold">{formatWeight(v.max_payload_kg)}</span>
                      </div>
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Available Cap</span>
                        <span className="text-[#244634] font-bold">{formatWeight(v.available_capacity_kg ?? v.max_payload_kg)}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono text-[#526357]">
                      <div>Type: <span className="text-[#26312A] font-medium">{v.vehicle_type}</span></div>
                      <div>Fitness Expiry: <span className="text-[#B36B21]">{formatDate(v.fitness_expiry)}</span></div>
                      <div>Insurance: <span className="text-[#526357]">{formatDate(v.insurance_expiry)}</span></div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#ECE7DA] flex items-center justify-between text-xs font-mono text-[#7A887E] mt-4">
                    <span className="flex items-center gap-1.5 text-[#3F7C56] font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
                      {v.status || 'AVAILABLE'}
                    </span>
                    <span className="text-[10px]">Carrier: {v.transporter_id}</span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
