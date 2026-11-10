import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react'
import { driversApi } from '../../api/commerce.api'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

export default function DriversListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: drivers, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['drivers'],
    queryFn: () => driversApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const driverList = Array.isArray(drivers) ? drivers : drivers?.items || []
  const filtered = driverList.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.toLowerCase().includes(search.toLowerCase()) ||
    d.license_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.city?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'transporter'

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        eyebrow="Personnel Registry"
        title="Commercial Drivers"
        description="Certified heavy vehicle operators, active shipment assignments, and commercial license validity."
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
                onClick={() => navigate('/drivers/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Enroll Driver</span>
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
            placeholder="Search driver name, phone, license..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <div className="text-xs font-mono text-[#526357] flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
          <span>{filtered.length} driver{filtered.length === 1 ? '' : 's'} registered</span>
        </div>
      </div>

      {/* Grid of Drivers */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Reading driver records...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserCheck}
          title="No Drivers Registered"
          description={search ? 'No drivers match your search query.' : 'No commercial drivers enrolled yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/drivers/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Enroll First Driver
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((d) => {
            const dId = d.id || d._id || d.driver_id
            const isAvailable = d.status === 'AVAILABLE'
            return (
              <Card
                key={dId}
                onClick={() => navigate(`/drivers/${dId}`)}
                className="group cursor-pointer hover:border-[#244634]/40 hover:shadow-md transition-all duration-300 bg-white/90 border-[#E1DDD0] flex flex-col justify-between"
              >
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono text-[#7A887E] uppercase tracking-widest block">
                          LICENSE: {d.license_number}
                        </span>
                        <h3 className="text-base font-serif font-bold text-[#1B2A20] group-hover:text-[#244634] transition-colors truncate max-w-[200px] mt-0.5">
                          {d.name}
                        </h3>
                      </div>
                      <Badge variant={isAvailable ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                        {d.status || 'AVAILABLE'}
                      </Badge>
                    </div>

                    <div className="space-y-1.5 text-xs font-mono text-[#526357] py-2 border-y border-[#ECE7DA] mb-3">
                      <div>Phone: <span className="text-[#26312A] font-medium">{d.phone}</span></div>
                      <div>Location: <span className="text-[#26312A]">{d.city}, {d.state}</span></div>
                      <div>Experience: <span className="text-[#244634] font-semibold">{d.experience_years} years</span></div>
                      <div>License Valid: <span className="text-[#B36B21]">{formatDate(d.license_expiry)}</span></div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-[#526357] group-hover:text-[#244634] transition-colors border-t border-[#F2EFE7]">
                    <span className="font-medium">View Driver Dossier</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
