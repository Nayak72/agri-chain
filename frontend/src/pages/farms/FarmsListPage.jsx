import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, MapPin, Award, ArrowRight, Sprout } from 'lucide-react'
import { farmsApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { formatDate } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

export default function FarmsListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: farms, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['farms'],
    queryFn: () => farmsApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const farmList = Array.isArray(farms) ? farms : farms?.items || []
  const filtered = farmList.filter(f =>
    f.name?.toLowerCase().includes(search.toLowerCase()) ||
    f.city?.toLowerCase().includes(search.toLowerCase()) ||
    f.state?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'farmer'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Agricultural Registry"
        title="Farm Network"
        description="Registered agricultural cultivation nodes, geo-locations, and compliance certificates."
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
                onClick={() => navigate('/farms/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register Farm</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and stats bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by farm name, city, or state..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <div className="text-xs font-mono text-[#526357] flex items-center gap-1.5 self-end sm:self-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3F7C56]" />
          <span>{filtered.length} node{filtered.length === 1 ? '' : 's'} registered</span>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Scanning farm registries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No Farms Found"
          description={search ? 'No registered farm matches your search filter.' : 'No agricultural farm nodes have been registered yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/farms/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register First Farm
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((farm) => {
            const farmId = farm.id || farm._id
            const isActive = farm.is_active !== false

            return (
              <Card
                key={farmId}
                onClick={() => navigate(`/farms/${farmId}`)}
                className="group cursor-pointer hover:border-[#244634]/50 hover:shadow-md transition-all duration-300 bg-white/90 border-[#E1DDD0] overflow-hidden"
              >
                <CardContent className="p-6 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A887E] block mb-1">
                          PIN: {farm.pincode}
                        </span>
                        <h3 className="text-lg font-serif font-bold text-[#1B2A20] group-hover:text-[#244634] transition-colors truncate max-w-[220px]">
                          {farm.name}
                        </h3>
                      </div>
                      <Badge
                        variant={isActive ? 'success' : 'neutral'}
                        size="sm"
                      >
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    <p className="text-xs text-[#526357] line-clamp-2 mb-4 flex items-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-[#7A887E] mt-0.5" />
                      <span>{farm.address}, {farm.city}, {farm.state}</span>
                    </p>

                    <div className="grid grid-cols-2 gap-3 py-3 border-y border-[#ECE7DA] mb-4 text-xs font-mono">
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Area</span>
                        <span className="text-[#26312A] font-semibold">{farm.area_hectares ? `${farm.area_hectares} ha` : '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#7A887E] block text-[10px] uppercase">Registered</span>
                        <span className="text-[#26312A]">{formatDate(farm.created_at)}</span>
                      </div>
                    </div>

                    {farm.certifications && farm.certifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {farm.certifications.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-mono px-2 py-0.5 bg-[#E8EFE9] text-[#244634] rounded-md border border-[#C3D4C7] flex items-center gap-1"
                          >
                            <Award className="w-2.5 h-2.5 text-[#3F7C56]" />
                            {c}
                          </span>
                        ))}
                        {farm.certifications.length > 3 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#F2EFE7] text-[#526357] rounded-md">
                            +{farm.certifications.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#526357] group-hover:text-[#244634] transition-colors pt-2 border-t border-[#F2EFE7]">
                    <span className="font-medium">Inspect Node</span>
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
