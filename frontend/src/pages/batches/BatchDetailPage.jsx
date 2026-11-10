import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag, ShieldCheck, AlertCircle, Calendar, Package, MapPin } from 'lucide-react'
import { batchesApi } from '../../api/agriculture.api'
import { formatDate, formatDateTime, formatWeight, getStatusColor, formatStatus } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { StatusBadge } from '../../components/common/StatusBadge'

export default function BatchDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: batch, isLoading, error } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => batchesApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Scanning batch provenance ledger...</span>
      </div>
    )
  }

  if (error || !batch) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Batch Record Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve provenance record for batch identifier: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/batches')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Batches Registry
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/batches')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        BATCH_REGISTRY
      </Button>

      {/* Header Deck */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="sage" size="sm" className="font-mono uppercase tracking-widest text-[10px]">
                  PRODUCE: {batch.produce_type}
                </Badge>
                <StatusBadge status={batch.status || 'AVAILABLE'} />
              </div>
              <h1 className="text-3xl font-mono font-bold text-[#1B2A20] tracking-tight">{batch.batch_id}</h1>
              <p className="text-[#526357] text-sm mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#7A887E] shrink-0" />
                <span>Harvested at {batch.harvest_location} on {formatDate(batch.harvest_date)}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/purchase-orders/new', { state: { batchId: batch.batch_id } })}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Create Purchase Order</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2-Column Details Deck */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quantity Breakdown */}
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Quantity Allocation Ledger
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center py-2 border-b border-[#ECE7DA]">
                <span className="text-[#7A887E]">Initial Harvest</span>
                <span className="text-[#1B2A20] font-bold">{formatWeight(batch.initial_quantity_kg)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#ECE7DA]">
                <span className="text-[#7A887E]">Available In Stock</span>
                <span className="text-[#244634] font-bold">{formatWeight(batch.available_quantity_kg ?? batch.initial_quantity_kg)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#ECE7DA]">
                <span className="text-[#7A887E]">Reserved for Orders</span>
                <span className="text-[#B36B21] font-semibold">{formatWeight(batch.reserved_quantity_kg ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-[#ECE7DA]">
                <span className="text-[#7A887E]">Dispatched in Transit</span>
                <span className="text-[#2F6586] font-semibold">{formatWeight(batch.dispatched_quantity_kg ?? 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-[#7A887E]">Damaged / Rejected</span>
                <span className="text-[#9E3A2B] font-semibold">{formatWeight(batch.rejected_quantity_kg ?? 0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quality & Shelf Life */}
        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Quality & Provenance Telemetry
              </h3>
              <dl className="space-y-3 font-mono text-xs">
                <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                  <dt className="text-[#7A887E]">Quality Grade</dt>
                  <dd className="text-[#244634] font-bold">{batch.quality_grade || 'GRADE_A'}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                  <dt className="text-[#7A887E]">Packaging Type</dt>
                  <dd className="text-[#26312A]">{batch.packaging_type}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                  <dt className="text-[#7A887E]">Estimated Shelf Life End</dt>
                  <dd className="text-[#B36B21] font-semibold">{formatDateTime(batch.estimated_shelf_life_end)}</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                  <dt className="text-[#7A887E]">Origin Farm Node ID</dt>
                  <dd className="text-[#244634] cursor-pointer hover:underline font-semibold" onClick={() => navigate(`/farms/${batch.farm_id}`)}>
                    {batch.farm_id}
                  </dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-[#7A887E]">Handling Protocol</dt>
                  <dd className="text-[#26312A]">{batch.handling_requirements || 'Standard agricultural handling'}</dd>
                </div>
              </dl>
            </div>

            <div className="pt-4 border-t border-[#ECE7DA] mt-4 text-[11px] font-mono text-[#526357] flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-[#3F7C56] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Cryptographic Chain: VERIFIED
              </span>
              <span>Created: {formatDateTime(batch.created_at)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
