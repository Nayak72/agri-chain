import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, ShieldCheck, AlertCircle, Phone, Mail, MapPin, Truck } from 'lucide-react'
import { driversApi } from '../../api/commerce.api'
import { formatDate, formatDateTime } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'

export default function DriverDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: driver, isLoading, error } = useQuery({
    queryKey: ['driver', id],
    queryFn: () => driversApi.get(id).then(res => res.data),
  })

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <span className="text-xs font-mono text-[#526357] animate-pulse">Retrieving driver profile...</span>
      </div>
    )
  }

  if (error || !driver) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Driver Dossier Not Found</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve personnel record for driver ID: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/drivers')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Drivers Directory
        </Button>
      </div>
    )
  }

  const isAvailable = driver.status === 'AVAILABLE'

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/drivers')}
        className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] -ml-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        DRIVERS_DIRECTORY
      </Button>

      {/* Identity Card */}
      <Card className="bg-white/95 border-[#E1DDD0] shadow-sm">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge variant="sage" size="sm" className="font-mono uppercase tracking-widest text-[10px]">
                  COMMERCIAL OPERATOR
                </Badge>
                <Badge variant={isAvailable ? 'success' : 'warning'} size="sm" className="font-mono text-[10px]">
                  {driver.status || 'AVAILABLE'}
                </Badge>
              </div>
              <h1 className="text-3xl font-serif font-bold text-[#1B2A20] tracking-tight">{driver.name}</h1>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/shipments')}
                className="gap-2 border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7] font-mono text-xs"
              >
                <Truck className="w-4 h-4 text-[#244634]" />
                <span>View Active Shipments</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white/90 border-[#E1DDD0]">
          <CardContent className="p-6">
            <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
              Professional Credentials
            </h3>
            <dl className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Driver Identifier</dt>
                <dd className="text-[#26312A] font-semibold">{driver.driver_id || driver.id || driver._id}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Carrier Transporter ID</dt>
                <dd className="text-[#26312A]">{driver.transporter_id}</dd>
              </div>
              <div className="flex justify-between py-2 border-b border-[#ECE7DA]">
                <dt className="text-[#7A887E]">Current Assignment</dt>
                <dd className="text-[#26312A] font-semibold">{driver.current_assignment || 'None (Standby)'}</dd>
              </div>
              <div className="flex justify-between py-2">
                <dt className="text-[#7A887E]">Enrolled In Network</dt>
                <dd className="text-[#526357]">{formatDateTime(driver.created_at)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="bg-white/90 border-[#E1DDD0] flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-4">
                Contact & location
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-start gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#7A887E] mt-0.5" />
                  <div>
                    <span className="text-[#7A887E] block text-[10px] uppercase font-semibold">Mobile Phone</span>
                    <span className="text-[#1B2A20] font-bold">{driver.phone}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#7A887E] mt-0.5" />
                  <div>
                    <span className="text-[#7A887E] block text-[10px] uppercase font-semibold">Location</span>
                    <span className="text-[#26312A] font-sans">{driver.city}, {driver.state}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#ECE7DA] mt-6 text-[11px] font-mono text-[#526357] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3F7C56]" />
              <span>Carrier Verified Driver Dossier</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
