import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, MapPin, Award, CheckCircle, ShieldCheck, AlertCircle, FileText } from 'lucide-react'
import { farmsApi } from '../../api/agriculture.api'
import { formatDate, formatDateTime } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'

export default function FarmDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: farm, isLoading, error } = useQuery({
    queryKey: ['farm', id],
    queryFn: () => farmsApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Reading farm node telemetry...</span>
      </div>
    )
  }

  if (error || !farm) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Farm Node Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve node records for identifier: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/farms')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Farm Network
        </Button>
      </div>
    )
  }

  const isActive = farm.is_active !== false

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/farms')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        FARM_NETWORK
      </Button>

      {/* Top Identity Card */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[11px] font-mono text-[#3F7C56] uppercase tracking-widest font-semibold">
                  Cultivation Node
                </span>
                <Badge variant={isActive ? 'success' : 'neutral'} size="sm">
                  {isActive ? 'Operational' : 'Inactive'}
                </Badge>
              </div>
              <h1 className="text-3xl font-serif font-bold text-[#1B2A20] tracking-tight">{farm.name}</h1>
              <p className="text-[#526357] text-sm mt-1.5 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#7A887E] shrink-0" />
                <span>{farm.city}, {farm.state}</span>
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={() => navigate('/batches/new', { state: { farmId: farm.id || farm._id } })}
                className="gap-2 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Harvest Batch
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Specifications */}
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Node Specifications
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Node ID</dt>
                <dd className="text-[#26312A] font-semibold">{farm.id || farm._id}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Farmer Owner ID</dt>
                <dd className="text-[#26312A]">{farm.farmer_id}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#7A887E]">Registered At</dt>
                <dd className="text-[#26312A]">{formatDateTime(farm.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Farm details */}
        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Farm details
              </h3>

              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-2">
                Node Description
              </h3>
              <p className="text-[#26312A] text-xs leading-relaxed">
                {farm.description || 'No descriptive telemetry provided for this cultivation node.'}
              </p>
            </div>

            <div className="pt-4 border-t border-[#ECE7DA] mt-6 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3F7C56]" />
              <span className="text-[11px] font-mono text-[#526357]">
                Hash Protocol Status: Cryptographically Linked
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
