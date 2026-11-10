import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, AlertCircle, Warehouse, Sprout, ThermometerSnowflake, Layers, MapPin, Package } from 'lucide-react'
import { warehousesApi, inventoryApi } from '../../api/agriculture.api'
import { formatWeight, formatDate, formatDateTime } from '../../utils'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { StatusBadge } from '../../components/common/StatusBadge'

export default function WarehouseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  // Fetch warehouse data
  const { data: warehouse, isLoading: whLoading, error: whError } = useQuery({
    queryKey: ['warehouse', id],
    queryFn: () => warehousesApi.get(id).then(res => res.data),
  })

  // Fetch inventory stored in this warehouse
  const { data: inventoryData, isLoading: invLoading } = useQuery({
    queryKey: ['warehouse-inventory', id],
    queryFn: () => inventoryApi.list({ warehouse_id: id }).then(res => res.data),
    enabled: !!id,
  })

  const inventoryItems = Array.isArray(inventoryData) ? inventoryData : inventoryData?.items || []

  // Capacity calculations
  const maxCapacity = Number(warehouse?.capacity_kg || 0)
  const currentLoad = inventoryItems.reduce((acc, item) => acc + (Number(item.quantity_kg || 0)), 0)
  const utilizationPercent = maxCapacity > 0 ? Math.min((currentLoad / maxCapacity) * 100, 100) : 0

  const getProgressColor = (pct) => {
    if (pct > 90) return 'bg-[#9E3A2B]'
    if (pct > 75) return 'bg-[#B36B21]'
    return 'bg-[#244634]'
  }

  if (whLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <div className="w-10 h-10 border-3 border-[#244634]/20 border-t-[#244634] rounded-full animate-spin" />
        <div className="text-[#526357] font-mono text-xs animate-pulse">Synchronizing Node Telemetry...</div>
      </div>
    )
  }

  if (whError || !warehouse) {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif font-bold text-[#1B2A20] mb-2">Storage Node Connection Lost</h2>
        <p className="text-sm text-[#526357] mb-6">Could not retrieve telemetry for node ID: {id}</p>
        <Button
          variant="primary"
          onClick={() => navigate('/warehouses')}
          className="bg-[#244634] hover:bg-[#1A3326] text-white"
        >
          Return to Warehouse Network
        </Button>
      </div>
    )
  }

  const nodeId = warehouse.id || warehouse._id || id

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      {/* 2/3 + 1/3 Header Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity Card */}
        <Card className="lg:col-span-2 bg-white/95 border-[#E1DDD0] shadow-sm relative overflow-hidden">
          <CardContent className="p-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/warehouses')}
              className="gap-2 text-xs font-mono text-[#526357] hover:text-[#26312A] mb-4 -ml-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              NODE_LIST
            </Button>

            <h1 className="text-3xl font-serif font-bold text-[#1B2A20] mb-2">{warehouse.name || 'Designated Node'}</h1>
            <div className="flex flex-wrap gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-[#526357]">
                <span className="text-[#7A887E]">ID:</span>
                <span className="bg-[#F2EFE7] px-2 py-0.5 rounded text-[#26312A] font-semibold">{nodeId}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[#526357]">
                <MapPin className="w-3.5 h-3.5 text-[#7A887E]" />
                <span className="font-sans">{warehouse.address}, {warehouse.city}, {warehouse.state}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Capacity Control Card */}
        <Card className="bg-white/95 border-[#E1DDD0] shadow-sm flex flex-col justify-between">
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div>
              <h3 className="text-xs font-mono text-[#526357] uppercase tracking-widest font-semibold mb-3">Capacity Status</h3>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-mono font-bold text-[#1B2A20]">{currentLoad.toLocaleString()}</span>
                <span className="text-xs font-mono text-[#7A887E] mb-1">/ {maxCapacity > 0 ? maxCapacity.toLocaleString() : '—'} kg</span>
              </div>

              {/* Dynamic Progress Bar */}
              <div className="w-full h-2 bg-[#ECE7DA] rounded-full overflow-hidden">
                <div
                  className={`h-full ${getProgressColor(utilizationPercent)} transition-all duration-700 ease-out`}
                  style={{ width: `${utilizationPercent}%` }}
                />
              </div>

              {/* Percentage Label */}
              <div className="mt-2 text-right text-xs font-mono text-[#526357]">
                {utilizationPercent.toFixed(1)}% Full
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#ECE7DA] flex items-center justify-between text-xs font-mono">
              <span className="text-[#7A887E]">Active Stock Items</span>
              <span className="text-[#244634] font-bold">{inventoryItems.length} Payload(s)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Actions Deck */}
      <div className="p-2 rounded-2xl bg-white/80 border border-[#E1DDD0] grid grid-cols-2 md:grid-cols-4 gap-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/produce/new')}
          className="h-16 flex-col gap-1 text-[#26312A] hover:bg-[#F2EFE7]"
        >
          <Package className="w-5 h-5 text-[#244634]" />
          <span className="text-xs font-semibold">Define Produce</span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate('/batches/new')}
          className="h-16 flex-col gap-1 text-[#26312A] hover:bg-[#F2EFE7]"
        >
          <Sprout className="w-5 h-5 text-[#3F7C56]" />
          <span className="text-xs font-semibold">Add Harvest Batch</span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate('/cold-chain')}
          className="h-16 flex-col gap-1 text-[#26312A] hover:bg-[#F2EFE7]"
        >
          <ThermometerSnowflake className="w-5 h-5 text-[#2F6586]" />
          <span className="text-xs font-semibold">Cold-Chain Monitor</span>
        </Button>

        <Button
          variant="ghost"
          onClick={() => navigate('/inventory')}
          className="h-16 flex-col gap-1 text-[#26312A] hover:bg-[#F2EFE7]"
        >
          <Layers className="w-5 h-5 text-[#B36B21]" />
          <span className="text-xs font-semibold">FEFO Inventory</span>
        </Button>
      </div>

      {/* Payloads / Stored Stock Table */}
      <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden shadow-xs">
        <div className="p-6 border-b border-[#ECE7DA] flex justify-between items-center bg-[#F2EFE7]/40">
          <div>
            <h2 className="text-base font-serif font-bold text-[#1B2A20] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#244634]" />
              Stored Payloads & Batches
            </h2>
            <p className="text-xs text-[#526357] mt-0.5">Active commodity inventory positioned at this node</p>
          </div>
          <span className="text-xs font-mono text-[#526357]">
            {inventoryItems.length} active lots
          </span>
        </div>

        {invLoading ? (
          <div className="p-12 text-center text-[#526357] font-mono text-xs animate-pulse">
            Querying node inventory...
          </div>
        ) : inventoryItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-[#F2EFE7] text-[#7A887E] flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-[#1B2A20] mb-1">No Active Payloads in Storage</h3>
            <p className="text-xs text-[#526357] max-w-sm mx-auto mb-4">
              This node has not received any produce batch shipments or inventory intake yet.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/inventory')}
              className="text-xs font-mono text-[#244634] border-[#C3D4C7] hover:bg-[#E8EFE9]"
            >
              Open Inventory Transfer Module →
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-[#F2EFE7]/60">
              <TableRow className="border-[#ECE7DA]">
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Batch ID</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Commodity</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Location In Warehouse</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Quantity</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Shelf Life End</TableHead>
                <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
              {inventoryItems.map((item) => (
                <TableRow key={item.id || item._id} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                  <TableCell className="font-bold text-[#244634] py-4">{item.batch_id}</TableCell>
                  <TableCell className="text-[#26312A] font-sans font-medium">{item.produce_type}</TableCell>
                  <TableCell className="text-[#526357]">{item.storage_location || 'Aisle A-01'}</TableCell>
                  <TableCell className="text-[#244634] font-bold">{formatWeight(item.quantity_kg)}</TableCell>
                  <TableCell className="text-[#B36B21]">{formatDate(item.estimated_shelf_life_end)}</TableCell>
                  <TableCell>
                    <StatusBadge status={item.status || 'AVAILABLE'} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
