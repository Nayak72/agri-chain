import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, Package, Sparkles } from 'lucide-react'
import { produceApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { EmptyState } from '../../components/common/EmptyState'

const CATEGORIES = ['ALL', 'FRUITS', 'VEGETABLES', 'GRAINS', 'PULSES', 'SPICES', 'DAIRY']

export default function ProduceListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')

  const { data: produce, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['produce'],
    queryFn: () => produceApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const produceList = Array.isArray(produce) ? produce : produce?.items || []
  const filtered = produceList.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.produce_type?.toLowerCase().includes(search.toLowerCase())
    const matchesCat = selectedCategory === 'ALL' || item.category?.toUpperCase() === selectedCategory
    return matchesSearch && matchesCat
  })

  const canCreate = user?.role === 'admin' || user?.role === 'farmer'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Agricultural Catalog"
        title="Produce Catalogue"
        description="Certified crop commodities, handling specifications, and standardized packaging parameters."
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
                onClick={() => navigate('/produce/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Produce Type</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Filter and Category Tabs */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
                selectedCategory === cat
                  ? 'bg-[#244634] text-white shadow-xs font-semibold'
                  : 'bg-white/80 border border-[#E1DDD0] text-[#526357] hover:bg-[#F2EFE7] hover:text-[#26312A]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-[#7A887E] absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search produce..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-white/90 border-[#E1DDD0] text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Loading produce catalog...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Produce Entries"
          description={search ? 'No produce items match current filters.' : 'The produce catalog is currently empty.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/produce/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Define First Produce Type
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filtered.map((item) => {
            const itemId = item.id || item._id
            return (
              <Card
                key={itemId}
                onClick={() => navigate(`/produce/${itemId}`)}
                className="group cursor-pointer hover:border-[#244634]/50 hover:shadow-md transition-all duration-300 bg-white/90 border-[#E1DDD0] flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <Badge
                        variant="sage"
                        size="sm"
                        className="font-mono text-[10px] tracking-wider uppercase"
                      >
                        {item.category || 'COMMODITY'}
                      </Badge>
                      <span className="text-[10px] font-mono text-[#7A887E]">
                        UNIT: {item.unit}
                      </span>
                    </div>

                    <h3 className="text-base font-serif font-bold text-[#1B2A20] group-hover:text-[#244634] transition-colors truncate mb-1">
                      {item.name}
                    </h3>
                    <div className="text-xs font-mono text-[#7A887E] mb-3 truncate">
                      Type: <span className="text-[#526357]">{item.produce_type}</span>
                    </div>

                    <p className="text-xs text-[#526357] line-clamp-2 leading-relaxed mb-4">
                      {item.description || 'Standard agricultural commodity specifications.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#ECE7DA] flex items-center justify-between text-xs text-[#526357] group-hover:text-[#244634] transition-colors">
                    <span className="font-medium">View Specifications</span>
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
