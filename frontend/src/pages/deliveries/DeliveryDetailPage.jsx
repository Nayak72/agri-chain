import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { deliveryApi } from '../../api/monitoring.api'
import { formatWeight, formatDateTime } from '../../utils'
import PageHeader from '../../components/common/PageHeader'

export default function DeliveryDetailPage() {
  const { id } = useParams()
  const { data: report, isLoading, isError } = useQuery({ queryKey: ['delivery-report', id], queryFn: async () => {
    try { return (await deliveryApi.getReportById(id)).data } catch { return (await deliveryApi.getReport(id)).data }
  } })
  if (isLoading) return <p className="p-6">Loading delivery report…</p>
  if (isError || !report) return <p className="p-6">Delivery report unavailable.</p>
  return <div className="space-y-5 p-6"><PageHeader title={report.report_id} description="Buyer proof of delivery" /><Link to="/deliveries" className="text-green-800 underline">Back to deliveries</Link><div className="rounded-xl border bg-white p-5 space-y-2"><p>Status: {report.status}</p><p>Shipment: {report.shipment_public_id || report.shipment_id}</p><p>Delivered: {formatWeight(report.delivered_quantity_kg)}</p><p>Damaged: {formatWeight(report.damaged_quantity_kg)}</p><p>Missing: {formatWeight(report.missing_quantity_kg)}</p><p>Received by: {report.received_by}</p><p>Received at: {formatDateTime(report.received_at)}</p>{report.reason && <p>Rejection reason: {report.reason}</p>}</div></div>
}
