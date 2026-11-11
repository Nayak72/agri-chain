import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Search, ArrowRight, Layers } from 'lucide-react'
import { batchesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { formatDate, formatWeight, getStatusColor, formatStatus } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { StatusBadge } from '../../components/common/StatusBadge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { EmptyState } from '../../components/common/EmptyState'

export default function BatchesListPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [search, setSearch] = useState('')

  const { data: batches, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['batches'],
    queryFn: () => batchesApi.list().then(res => res.data),
    staleTime: 30_000,
  })

  const batchList = Array.isArray(batches) ? batches : batches?.items || []
  const filtered = batchList.filter(b =>
    b.batch_id?.toLowerCase().includes(search.toLowerCase()) ||
    b.produce_type?.toLowerCase().includes(search.toLowerCase()) ||
    b.harvest_location?.toLowerCase().includes(search.toLowerCase())
  )

  const canCreate = user?.role === 'admin' || user?.role === 'farmer'

  return (
    <div className="space-y-6 animate-fade-in-up">
      <PageHeader
        eyebrow="Traceability Ledger"
        title="Produce Batches"
        description="Harvest lots, verifiable provenance identifiers, quality grades, and inventory availability."
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
                onClick={() => navigate('/batches/new')}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Register Harvest Batch</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#7A887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by Batch ID, Produce Type, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/90 border-[#E1DDD0] text-sm text-[#26312A] placeholder:text-[#7A887E] focus-visible:ring-[#244634]"
          />
        </div>
        <span className="text-xs font-mono text-[#526357] self-end sm:self-center">
          {filtered.length} batch{filtered.length === 1 ? '' : 'es'} tracked
        </span>
      </div>

      {/* Batches Table */}
      {isLoading ? (
        <div className="h-64 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
          <span className="text-xs font-mono text-[#526357] animate-pulse">Reading batch registries...</span>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Harvest Batches"
          description={search ? 'No batches match your search filter.' : 'No harvest batches have been created in the network yet.'}
          action={
            canCreate && !search ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/batches/new')}
                className="bg-[#244634] hover:bg-[#1A3326] text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Register First Batch
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="bg-white/95 border border-[#E1DDD0] rounded-2xl overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-[#F2EFE7]/60">
              <TableRow className="border-[#ECE7DA] hover:bg-transparent">
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Batch ID</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Commodity</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Registered</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Grade</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Initial / Available</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
              {filtered.map((b) => {
                const batchKey = b.batch_id || b.id || b._id
                return (
                  <TableRow
                    key={batchKey}
                    onClick={() => navigate(`/batches/${batchKey}`)}
                    className="hover:bg-[#F2EFE7]/40 cursor-pointer transition-colors border-[#ECE7DA]"
                  >
                    <TableCell className="font-bold text-[#244634] py-4">{b.batch_id}</TableCell>
                    <TableCell className="text-[#26312A] font-sans font-medium">{b.produce_type}</TableCell>
                    <TableCell className="text-[#526357]">{formatDate(b.created_at)}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-[#E8EFE9] text-[#244634] font-semibold text-[10px] border border-[#C3D4C7]">
                        {b.quality_grade || 'GRADE_A'}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#26312A]">
                      <span>{formatWeight(b.initial_quantity_kg)}</span>
                      <span className="text-[#7A887E] mx-1">/</span>
                      <span className="text-[#244634] font-bold">{formatWeight(b.available_kg ?? 0)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status || 'AVAILABLE'} />
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
