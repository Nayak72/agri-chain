import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, AlertCircle, ShieldAlert, Package, ThermometerSnowflake } from 'lucide-react'
import { produceApi } from '../../api/agriculture.api'
import { formatDateTime } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'

export default function ProduceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: item, isLoading, error } = useQuery({
    queryKey: ['produce', id],
    queryFn: () => produceApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Loading produce specifications...</span>
      </div>
    )
  }

  if (error || !item) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Produce Item Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve produce catalog record for identifier: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/produce')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Produce Catalogue
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/produce')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        PRODUCE_CATALOG
      </Button>

      {/* Identity Card */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="sage" size="sm" className="font-mono uppercase tracking-widest text-[10px]">
                  {item.category}
                </Badge>
                <span className="text-xs font-mono text-[#7A887E]">
                  CODE: {item.produce_type}
                </span>
              </div>
              <h1 className="text-3xl font-serif font-bold text-[#1B2A20] tracking-tight">{item.name}</h1>
              <p className="text-sm text-[#526357] mt-1.5">
                Standard Packaging Unit: <span className="text-[#244634] font-mono font-bold">{item.unit}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/batches/new', { state: { produceType: item.produce_type } })}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Create Batch for this Produce
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Specifications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Catalog Specifications
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Produce Type Key</dt>
                <dd className="text-[#26312A] font-semibold">{item.produce_type}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Category</dt>
                <dd className="text-[#244634] font-semibold">{item.category}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Measurement Unit</dt>
                <dd className="text-[#26312A]">{item.unit}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#7A887E]">Record Created</dt>
                <dd className="text-[#26312A]">{formatDateTime(item.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Handling & Cold-Chain Parameters
              </h3>
              <p className="text-xs text-[#26312A] leading-relaxed mb-6 font-sans">
                {item.description || 'Standard agricultural crop profile. Follow standard ambient or cold-chain procedures based on harvest batch specifications.'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#E8EFE9]/60 border border-[#C3D4C7] text-xs text-[#244634] space-y-1">
              <div className="font-semibold flex items-center gap-1.5 text-[#1B2A20]">
                <ThermometerSnowflake className="w-3.5 h-3.5 text-[#3F7C56]" />
                Cold-Chain Compliance Rule
              </div>
              <div className="text-[11px] text-[#526357] leading-relaxed">
                All batches of this commodity moving via refrigerated transit are continuously monitored via simulated sensor telemetry.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
