import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, Warehouse, ThermometerSnowflake, MapPin } from 'lucide-react'
import { warehousesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { formatWeight } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

export default function WarehousesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: warehouses, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const warehouseList = Array.isArray(warehouses) ? warehouses : warehouses?.items || []
  const filtered = warehouseList.filter(wh =>
    wh.name?.toLowerCase().includes(search.toLowerCase()) ||
    wh.city?.toLowerCase().includes(search.toLowerCase()) ||
    wh.state?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'warehouse_manager'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Storage Infrastructure"
        title="Warehouse Network"
        description="Controlled-atmosphere storage nodes, cold-chain hubs, and capacity utilization telemetry."
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
                onClick={() => navigate('/warehouses/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Deploy Storage Node</span>
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
            placeholder="Search warehouse name, city, state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <div className="text-xs font-mono text-[#526357] flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
          <span>{filtered.length} storage node{filtered.length === 1 ? '' : 's'} active</span>
        </div>
      </div>

      {/* Grid of Warehouses */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Reading warehouse telemetry...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Warehouse}
          title="No Storage Nodes"
          description={search ? 'No warehouses match your filter.' : 'No storage warehouses have been deployed yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/warehouses/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Deploy First Storage Node
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((wh) => {
            const whId = wh.id || wh._id
            return (
              <Card
                key={whId}
                onClick={() => navigate(`/warehouses/${whId}`)}
                className="group cursor-pointer hover:border-[#244634]/50 hover:shadow-md transition-all duration-300 bg-white/90 border-[#E1DDD0] flex flex-col justify-between"
              >
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A887E] block mb-1">
                          PIN: {wh.pincode}
                        </span>
                        <h3 className="text-lg font-serif font-bold text-[#1B2A20] group-hover:text-[#244634] transition-colors truncate max-w-[220px]">
                          {wh.name}
                        </h3>
                      </div>
                      {wh.has_refrigeration && (
                        <Badge variant="sage" size="sm" className="font-mono text-[10px] gap-1">
                          <ThermometerSnowflake className="w-3 h-3 text-[#3F7C56]" />
                          Cold-Chain
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-[#526357] line-clamp-2 mb-4 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#7A887E] mt-0.5" />
                      <span>{wh.address}, {wh.city}, {wh.state}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#ECE7DA] mb-4 text-xs font-mono">
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Total Capacity</span>
                        <span className="text-[#1B2A20] font-bold">{formatWeight(wh.capacity_kg)}</span>
                      </div>
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Cold Storage</span>
                        <span className="text-[#244634] font-semibold">{wh.cold_storage_capacity_kg ? formatWeight(wh.cold_storage_capacity_kg) : 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-[#526357] group-hover:text-[#244634] transition-colors border-t border-[#F2EFE7]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
                      Terminal Online
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      Access Terminal <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
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
