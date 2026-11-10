import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Warehouse,
  ClipboardCheck,
  Scale,
  RefreshCw,
  Plus,
  ArrowRightLeft,
  X,
  AlertCircle,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { inventoryApi, warehousesApi, batchesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus, getApiError } from '../../utils'
import { PageHeader } from '../../components/common/PageHeader'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { Badge } from '../../components/ui/badge'
import { Card, CardContent } from '../../components/ui/card'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../../components/ui/table'
import { StatusBadge } from '../../components/common/StatusBadge'
import { EmptyState } from '../../components/common/EmptyState'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const userRole = normalizeRole(user?.role)
  const isManagerOrAdmin = userRole === ROLES.WAREHOUSE_MANAGER || userRole === ROLES.ADMIN

  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [activeTab, setActiveTab] = useState('stock') // 'stock' | 'receipts' | 'inspections' | 'movements'
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedItemForMovement, setSelectedItemForMovement] = useState(null)

  // Modals
  const [showReceiptModal, setShowReceiptModal] = useState(false)
  const [showInspectionModal, setShowInspectionModal] = useState(false)

  // Receipt form state
  const [receiptForm, setReceiptForm] = useState({
    warehouse_id: '',
    batch_id: '',
    farmer_id: '',
    received_weight_kg: '',
    accepted_weight_kg: '',
    damaged_weight_kg: '0',
    rejected_weight_kg: '0',
    quality_grade: 'GRADE_A',
    packaging_condition: 'GOOD',
    storage_location: 'Bay A-1',
    notes: '',
  })
  const [receiptError, setReceiptError] = useState('')

  // Inspection form state
  const [inspectionForm, setInspectionForm] = useState({
    receipt_id: '',
    batch_id: '',
    visual_quality_score: '95',
    size_uniformity_score: '90',
    ripeness_score: '88',
    defect_percentage: '2.5',
    foreign_matter_present: false,
    result: 'PASSED',
    quality_grade: 'GRADE_A',
    notes: '',
  })
  const [inspectionError, setInspectionError] = useState('')

  // Movements form state
  const [movementForm, setMovementForm] = useState({
    movement_type: 'INTAKE',
    quantity_kg: '',
    reference_id: '',
    notes: '',
  })
  const [movementError, setMovementError] = useState('')

  // Warehouses query
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.list().then(res => res.data),
  })
  const warehouseList = Array.isArray(warehouses) ? warehouses : warehouses?.items || []

  // Batches query (for receiving)
  const { data: batchesData } = useQuery({
    queryKey: ['batches-for-inventory'],
    queryFn: () => batchesApi.list().then(res => res.data),
    enabled: showReceiptModal,
  })
  const batchList = Array.isArray(batchesData) ? batchesData : batchesData?.items || []

  // Inventory query
  const { data: inventoryData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory', selectedWarehouse],
    queryFn: () => inventoryApi.list(selectedWarehouse ? { warehouse_id: selectedWarehouse } : {}).then(res => res.data),
    staleTime: 20_000,
  })

  // Receipts query
  const { data: receiptsData, isLoading: receiptsLoading } = useQuery({
    queryKey: ['warehouse-receipts', selectedWarehouse],
    queryFn: () => inventoryApi.receipts(selectedWarehouse ? { warehouse_id: selectedWarehouse } : {}).then(res => res.data),
    enabled: activeTab === 'receipts' || showInspectionModal,
  })
  const receiptsList = Array.isArray(receiptsData) ? receiptsData : receiptsData?.items || []

  // Inspections query
  const { data: inspectionsData, isLoading: inspectionsLoading } = useQuery({
    queryKey: ['quality-inspections'],
    queryFn: () => inventoryApi.inspections().then(res => res.data),
    enabled: activeTab === 'inspections',
  })
  const inspectionsList = Array.isArray(inspectionsData) ? inspectionsData : inspectionsData?.items || []

  // Movements query
  const { data: movementsData, isLoading: movementsLoading } = useQuery({
    queryKey: ['inventory-movements'],
    queryFn: () => inventoryApi.movements().then(res => res.data),
    enabled: activeTab === 'movements',
  })

  const items = Array.isArray(inventoryData) ? inventoryData : inventoryData?.items || []
  const movements = Array.isArray(movementsData) ? movementsData : movementsData?.items || []

  // FEFO sorting: items closest to expiry first
  const sortedItems = [...items].sort((a, b) => {
    const da = a.estimated_shelf_life_end ? new Date(a.estimated_shelf_life_end).getTime() : Infinity
    const db = b.estimated_shelf_life_end ? new Date(b.estimated_shelf_life_end).getTime() : Infinity
    return da - db
  })

  // Mutations
  const createReceiptMutation = useMutation({
    mutationFn: (data) => inventoryApi.createReceipt(data.warehouse_id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['batches'] })
      setShowReceiptModal(false)
      setReceiptError('')
    },
    onError: (err) => {
      setReceiptError(err.response?.data?.detail || err.message || 'Receipt intake failed.')
    },
  })

  const createInspectionMutation = useMutation({
    mutationFn: (data) => inventoryApi.createInspection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-receipts'] })
      queryClient.invalidateQueries({ queryKey: ['quality-inspections'] })
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      setShowInspectionModal(false)
      setInspectionError('')
    },
    onError: (err) => {
      setInspectionError(err.response?.data?.detail || err.message || 'Quality inspection failed.')
    },
  })

  const createMovementMutation = useMutation({
    mutationFn: (data) => inventoryApi.createMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      queryClient.invalidateQueries({ queryKey: ['inventory-movements'] })
      setShowMovementModal(false)
      setSelectedItemForMovement(null)
      setMovementForm({ movement_type: 'INTAKE', quantity_kg: '', reference_id: '', notes: '' })
    },
    onError: (err) => {
      setMovementError(getApiError(err, 'Movement failed.').message)
    },
  })

  // Safe number parser preserving empty/invalid values
  const parseNumericInput = (val) => {
    if (val === '' || val == null) return null
    const n = Number(val)
    return Number.isFinite(n) ? n : null
  }

  // Exact Weight reconciliation calculations
  const rawReceived = parseNumericInput(receiptForm.received_weight_kg)
  const rawAccepted = parseNumericInput(receiptForm.accepted_weight_kg)
  const rawDamaged = parseNumericInput(receiptForm.damaged_weight_kg)
  const rawRejected = parseNumericInput(receiptForm.rejected_weight_kg)

  const receivedKg = rawReceived ?? 0
  const acceptedKg = rawAccepted ?? 0
  const damagedKg = rawDamaged ?? 0
  const rejectedKg = rawRejected ?? 0
  const totalSum = acceptedKg + damagedKg + rejectedKg
  const weightDifference = Math.abs(receivedKg - totalSum)
  const isWeightBalanced = rawReceived !== null && rawReceived > 0 &&
                           rawAccepted !== null && rawDamaged !== null && rawRejected !== null &&
                           weightDifference <= 0.01

  const handleReceiptSubmit = (e) => {
    e.preventDefault()
    setReceiptError('')

    if (!receiptForm.warehouse_id) {
      setReceiptError('Please select a destination warehouse.')
      return
    }
    if (!receiptForm.batch_id) {
      setReceiptError('Please select a harvest batch to intake.')
      return
    }
    if (rawReceived === null || rawReceived <= 0) {
      setReceiptError('Please enter a valid received weight greater than 0.')
      return
    }
    if (rawAccepted === null || rawAccepted < 0 || rawDamaged === null || rawDamaged < 0 || rawRejected === null || rawRejected < 0) {
      setReceiptError('Accepted, damaged, and rejected weights must be valid numbers (0 or greater).')
      return
    }
    if (!isWeightBalanced) {
      setReceiptError(
        `Received weight (${rawReceived} kg) must exactly equal sum of accepted (${rawAccepted}), damaged (${rawDamaged}), and rejected (${rawRejected}) weights = ${totalSum} kg.`
      )
      return
    }

    createReceiptMutation.mutate({
      warehouse_id: receiptForm.warehouse_id,
      batch_id: receiptForm.batch_id,
      farmer_id: receiptForm.farmer_id || user?.id || 'FARMER-AUTO',
      received_weight_kg: rawReceived,
      accepted_weight_kg: rawAccepted,
      damaged_weight_kg: rawDamaged,
      rejected_weight_kg: rawRejected,
      inspection_result: 'PASSED',
      quality_grade: receiptForm.quality_grade,
      packaging_condition: receiptForm.packaging_condition,
      storage_location: receiptForm.storage_location,
      notes: receiptForm.notes || undefined,
    })
  }

  const handleInspectionSubmit = (e) => {
    e.preventDefault()
    setInspectionError('')

    if (!inspectionForm.receipt_id) {
      setInspectionError('Please select a warehouse receipt to inspect.')
      return
    }

    createInspectionMutation.mutate({
      receipt_id: inspectionForm.receipt_id,
      batch_id: inspectionForm.batch_id,
      inspector_id: user?.id || 'INSPECTOR-SYS',
      visual_quality_score: parseFloat(inspectionForm.visual_quality_score),
      size_uniformity_score: parseFloat(inspectionForm.size_uniformity_score),
      ripeness_score: inspectionForm.ripeness_score ? parseFloat(inspectionForm.ripeness_score) : null,
      defect_percentage: parseFloat(inspectionForm.defect_percentage),
      foreign_matter_present: inspectionForm.foreign_matter_present,
      result: inspectionForm.result,
      quality_grade: inspectionForm.quality_grade,
      notes: inspectionForm.notes || undefined,
    })
  }

  const handleOpenMovement = (item) => {
    setSelectedItemForMovement(item)
    setMovementError('')
    setShowMovementModal(true)
  }

  const handleMovementSubmit = (e) => {
    e.preventDefault()
    if (!selectedItemForMovement) return
    setMovementError('')

    const payload = {
      inventory_id: selectedItemForMovement.id || selectedItemForMovement._id,
      movement_type: movementForm.movement_type,
      quantity_kg: parseFloat(movementForm.quantity_kg),
      reference_id: movementForm.reference_id ? movementForm.reference_id.trim() : null,
      notes: movementForm.notes ? movementForm.notes.trim() : null,
    }

    createMovementMutation.mutate(payload)
  }

  // Calculate FEFO warning (days until expiry)
  const getFefoBadge = (shelfLifeEnd) => {
    if (!shelfLifeEnd) return null
    const diffDays = Math.ceil((new Date(shelfLifeEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono bg-red-50 border border-red-200 text-red-700 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
          EXPIRING ({diffDays}d)
        </span>
      )
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono bg-amber-50 border border-amber-200 text-amber-800 font-medium">
          FEFO PRIORITY ({diffDays}d)
        </span>
      )
    }
    return (
      <span className="text-[11px] font-mono text-[#526357]">
        {diffDays}d shelf life
      </span>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <PageHeader
        eyebrow="FEFO Inventory & Receiving Hub"
        title="Warehouse Inventory"
        description="Intake harvest produce, reconcile weight distributions, log quality grading, and manage FEFO stock allocation."
        actions={
          <div className="flex items-center gap-2.5">
            {isManagerOrAdmin && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setReceiptForm(prev => ({
                      ...prev,
                      warehouse_id: selectedWarehouse || (warehouseList[0]?.id || warehouseList[0]?._id || ''),
                    }))
                    setShowReceiptModal(true)
                  }}
                  className="gap-1.5 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Receive Harvest Batch</span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInspectionModal(true)}
                  className="gap-1.5 bg-white border-[#E1DDD0] hover:bg-[#F2EFE7] text-[#26312A]"
                >
                  <ClipboardCheck className="w-4 h-4 text-[#3F7C56]" />
                  <span>Log Inspection</span>
                </Button>
              </>
            )}

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
          </div>
        }
      />

      {/* Tabs and Warehouse filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-white border border-[#E1DDD0]">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-[#244634] text-white shadow-xs'
                : 'text-[#526357] hover:text-[#26312A] hover:bg-[#F2EFE7]'
            }`}
          >
            ACTIVE STOCK (FEFO)
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'receipts'
                ? 'bg-[#244634] text-white shadow-xs'
                : 'text-[#526357] hover:text-[#26312A] hover:bg-[#F2EFE7]'
            }`}
          >
            WAREHOUSE RECEIPTS
          </button>
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'inspections'
                ? 'bg-[#244634] text-white shadow-xs'
                : 'text-[#526357] hover:text-[#26312A] hover:bg-[#F2EFE7]'
            }`}
          >
            QUALITY INSPECTIONS
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'movements'
                ? 'bg-[#244634] text-white shadow-xs'
                : 'text-[#526357] hover:text-[#26312A] hover:bg-[#F2EFE7]'
            }`}
          >
            MOVEMENT HISTORY
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-[#526357] uppercase font-semibold">Warehouse:</span>
          <Select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-white border-[#E1DDD0] text-xs font-mono w-56 focus-visible:ring-[#244634]"
          >
            <option value="">All Storage Nodes</option>
            {warehouseList.map((wh) => (
              <option key={wh.id || wh._id} value={wh.id || wh._id}>
                {wh.name} ({wh.city})
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* TAB 1: Active Stock Table (FEFO) */}
      {activeTab === 'stock' && (
        <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="p-16 text-center text-[#526357] font-mono text-xs animate-pulse">
              Querying distributed inventory nodes...
            </div>
          ) : sortedItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No Stock Found"
              description={selectedWarehouse ? 'This warehouse has no active inventory.' : 'Receive a harvest batch to establish stock.'}
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#F2EFE7]/60">
                <TableRow className="border-[#ECE7DA]">
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Batch / Produce</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Storage Bay</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Quality Grade</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Available (KG)</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Reserved</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">FEFO Status</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
                {sortedItems.map((item) => (
                  <TableRow key={item.id || item._id} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                    <TableCell className="py-3.5">
                      <div className="font-bold text-[#1B2A20] font-sans">{item.produce_type}</div>
                      <div className="text-[10px] text-[#7A887E]">{item.batch_id}</div>
                    </TableCell>
                    <TableCell className="text-[#244634] font-semibold">{item.storage_location || 'Bay 1'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-[#E8EFE9] text-[#244634] text-[10px] font-semibold border border-[#C3D4C7]">
                        {item.quality_grade || 'GRADE_A'}
                      </span>
                    </TableCell>
                    <TableCell className="font-bold text-[#244634]">{formatWeight(item.quantity_kg)}</TableCell>
                    <TableCell className="text-[#526357]">{formatWeight(item.reserved_quantity_kg || 0)}</TableCell>
                    <TableCell>{getFefoBadge(item.estimated_shelf_life_end)}</TableCell>
                    <TableCell className="text-right">
                      {isManagerOrAdmin && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenMovement(item)}
                          className="text-xs font-mono text-[#244634] border-[#C3D4C7] hover:bg-[#E8EFE9] h-7 px-2.5"
                        >
                          Transfer
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 2: Warehouse Receipts */}
      {activeTab === 'receipts' && (
        <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden shadow-xs">
          {receiptsLoading ? (
            <div className="p-16 text-center text-[#526357] font-mono text-xs animate-pulse">
              Querying warehouse intake records...
            </div>
          ) : receiptsList.length === 0 ? (
            <EmptyState
              icon={Warehouse}
              title="No Warehouse Receipts"
              description="Receive a harvest batch to generate intake receipts with exact weight reconciliation."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#F2EFE7]/60">
                <TableRow className="border-[#ECE7DA]">
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Receipt ID</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Batch Reference</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Received Wt</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Accepted Wt</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Damaged / Rejected</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Grade</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Status</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Received Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
                {receiptsList.map((r) => (
                  <TableRow key={r.id || r._id} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                    <TableCell className="font-bold text-[#244634] py-3.5">{r.receipt_id}</TableCell>
                    <TableCell className="text-[#26312A]">{r.batch_id}</TableCell>
                    <TableCell className="font-bold text-[#1B2A20]">{formatWeight(r.received_weight_kg)}</TableCell>
                    <TableCell className="text-[#244634] font-semibold">{formatWeight(r.accepted_weight_kg)}</TableCell>
                    <TableCell className="text-[#526357]">
                      {formatWeight(r.damaged_weight_kg || 0)} / {formatWeight(r.rejected_weight_kg || 0)}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded bg-[#F2EFE7] text-[#26312A] text-[10px] font-semibold">
                        {r.quality_grade}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-[#7A887E]">
                      {r.receiving_date ? formatDateTime(r.receiving_date) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 3: Quality Inspections */}
      {activeTab === 'inspections' && (
        <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden shadow-xs">
          {inspectionsLoading ? (
            <div className="p-16 text-center text-[#526357] font-mono text-xs animate-pulse">
              Querying quality inspection records...
            </div>
          ) : inspectionsList.length === 0 ? (
            <EmptyState
              icon={ClipboardCheck}
              title="No Quality Inspections Logged"
              description="Conduct quality grading on intake receipts to evaluate visual quality, uniformity, and defect %."
            />
          ) : (
            <Table>
              <TableHeader className="bg-[#F2EFE7]/60">
                <TableRow className="border-[#ECE7DA]">
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Inspection ID</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Receipt Ref</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Visual Score</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Uniformity</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Defect %</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Result</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Assigned Grade</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Inspection Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
                {inspectionsList.map((insp) => (
                  <TableRow key={insp.id || insp._id} className="hover:bg-[#F2EFE7]/40 transition-colors border-[#ECE7DA]">
                    <TableCell className="font-bold text-[#244634] py-3.5">{insp.inspection_id}</TableCell>
                    <TableCell className="text-[#26312A]">{insp.receipt_id}</TableCell>
                    <TableCell className="font-semibold text-[#1B2A20]">{insp.visual_quality_score} / 100</TableCell>
                    <TableCell className="text-[#526357]">{insp.size_uniformity_score} / 100</TableCell>
                    <TableCell className="text-[#B36B21] font-semibold">{insp.defect_percentage}%</TableCell>
                    <TableCell>
                      <Badge variant={insp.result === 'PASSED' ? 'success' : 'danger'} size="sm">
                        {insp.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#244634] font-bold">{insp.quality_grade}</TableCell>
                    <TableCell className="text-[#7A887E]">
                      {insp.inspection_date ? formatDateTime(insp.inspection_date) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* TAB 4: Movement History */}
      {activeTab === 'movements' && (
        <Card className="bg-white/95 border-[#E1DDD0] overflow-hidden shadow-xs">
          {movementsLoading ? (
            <div className="p-16 text-center text-[#526357] font-mono text-xs animate-pulse">
              Querying ledger movements...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-16 text-center text-[#7A887E] font-mono text-xs">
              No stock movements recorded yet.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#F2EFE7]/60">
                <TableRow className="border-[#ECE7DA]">
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E] py-3.5">Movement ID</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Type</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Quantity (KG)</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Reference</TableHead>
                  <TableHead className="text-[11px] font-mono uppercase tracking-wider text-[#7A887E]">Timestamp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ECE7DA] font-mono text-xs">
                {movements.map((m) => (
                  <TableRow key={m.id || m._id} className="hover:bg-[#F2EFE7]/40 border-[#ECE7DA]">
                    <TableCell className="font-bold text-[#1B2A20] py-3.5">{m.movement_id}</TableCell>
                    <TableCell>
                      <Badge variant="sage" size="sm" className="font-mono text-[10px]">
                        {m.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-[#244634]">{formatWeight(m.quantity_kg)}</TableCell>
                    <TableCell className="text-[#526357]">{m.reference_id || '—'}</TableCell>
                    <TableCell className="text-[#7A887E]">{m.created_at ? formatDateTime(m.created_at) : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}

      {/* Modal 1: Receive Harvest Batch */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2A20]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="bg-white border-[#E1DDD0] max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#ECE7DA]">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-[#244634]" />
                <h3 className="text-base font-serif font-bold text-[#1B2A20]">Receive Harvest Batch at Warehouse</h3>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-[#7A887E] hover:text-[#26312A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              {receiptError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{receiptError}</span>
                </div>
              )}

              <form onSubmit={handleReceiptSubmit} className="space-y-4 text-xs font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[#526357] uppercase font-semibold block">Target Warehouse *</label>
                    <Select
                      required
                      value={receiptForm.warehouse_id}
                      onChange={(e) => setReceiptForm({ ...receiptForm, warehouse_id: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="">Select Warehouse</option>
                      {warehouseList.map((wh) => (
                        <option key={wh.id || wh._id} value={wh.id || wh._id}>
                          {wh.name} ({wh.city})
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] uppercase font-semibold block">Harvest Batch *</label>
                    <Select
                      required
                      value={receiptForm.batch_id}
                      onChange={(e) => {
                        const bId = e.target.value
                        const b = batchList.find(item => (item.id || item._id) === bId)
                        setReceiptForm({
                          ...receiptForm,
                          batch_id: bId,
                          farmer_id: b?.farmer_id || receiptForm.farmer_id,
                          received_weight_kg: b?.harvested_quantity_kg ? String(b.harvested_quantity_kg) : receiptForm.received_weight_kg,
                          accepted_weight_kg: b?.harvested_quantity_kg ? String(b.harvested_quantity_kg) : receiptForm.accepted_weight_kg,
                          quality_grade: b?.quality_grade || receiptForm.quality_grade,
                        })
                      }}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="">Select Harvested Batch</option>
                      {batchList.map((b) => (
                        <option key={b.id || b._id} value={b.id || b._id}>
                          {b.batch_id} — {b.produce_type} ({b.harvested_quantity_kg} kg)
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                {/* Exact Weight Reconciliation Section */}
                <div className="p-4 rounded-xl bg-[#F2EFE7]/60 border border-[#ECE7DA] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1B2A20] flex items-center gap-1.5">
                      <Scale className="w-4 h-4 text-[#244634]" /> Exact Weight Reconciliation
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      isWeightBalanced
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {isWeightBalanced ? 'BALANCED (Sum Matches)' : 'UNBALANCED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[#526357] block">Received Wt (kg)*</label>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={receiptForm.received_weight_kg}
                        onChange={(e) => setReceiptForm({ ...receiptForm, received_weight_kg: e.target.value })}
                        placeholder="e.g. 5000"
                        className="bg-white border-[#E1DDD0] font-bold text-[#1B2A20] focus-visible:ring-[#244634]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#526357] block">Accepted (kg)*</label>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={receiptForm.accepted_weight_kg}
                        onChange={(e) => setReceiptForm({ ...receiptForm, accepted_weight_kg: e.target.value })}
                        placeholder="e.g. 4800"
                        className="bg-white border-[#E1DDD0] font-bold text-[#244634] focus-visible:ring-[#244634]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#526357] block">Damaged (kg)*</label>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={receiptForm.damaged_weight_kg}
                        onChange={(e) => setReceiptForm({ ...receiptForm, damaged_weight_kg: e.target.value })}
                        placeholder="0"
                        className="bg-white border-[#E1DDD0] font-bold text-[#B36B21] focus-visible:ring-[#244634]"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[#526357] block">Rejected (kg)*</label>
                      <Input
                        type="number"
                        step="0.1"
                        required
                        value={receiptForm.rejected_weight_kg}
                        onChange={(e) => setReceiptForm({ ...receiptForm, rejected_weight_kg: e.target.value })}
                        placeholder="0"
                        className="bg-white border-[#E1DDD0] font-bold text-[#9E3A2B] focus-visible:ring-[#244634]"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-[#526357] flex justify-between pt-1 border-t border-[#ECE7DA]">
                    <span>Reconciliation Formula:</span>
                    <span className={isWeightBalanced ? 'text-[#244634] font-bold' : 'text-[#B36B21]'}>
                      {receivedKg} kg = {acceptedKg} + {damagedKg} + {rejectedKg} ({totalSum} kg)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#526357] block font-semibold">Storage Location *</label>
                    <Input
                      type="text"
                      required
                      value={receiptForm.storage_location}
                      onChange={(e) => setReceiptForm({ ...receiptForm, storage_location: e.target.value })}
                      placeholder="Bay A-1"
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block font-semibold">Initial Grade *</label>
                    <Select
                      value={receiptForm.quality_grade}
                      onChange={(e) => setReceiptForm({ ...receiptForm, quality_grade: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="GRADE_A">GRADE_A (Premium)</option>
                      <option value="GRADE_B">GRADE_B (Standard)</option>
                      <option value="GRADE_C">GRADE_C (Commercial)</option>
                      <option value="REJECTED">REJECTED</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block font-semibold">Packaging *</label>
                    <Select
                      value={receiptForm.packaging_condition}
                      onChange={(e) => setReceiptForm({ ...receiptForm, packaging_condition: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="GOOD">GOOD</option>
                      <option value="ACCEPTABLE">ACCEPTABLE</option>
                      <option value="DAMAGED">DAMAGED</option>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowReceiptModal(false)}
                    className="flex-1 bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createReceiptMutation.isPending || !isWeightBalanced}
                    className="flex-1 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
                  >
                    {createReceiptMutation.isPending ? 'Intaking...' : 'Confirm Intake Receipt'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 2: Log Quality Inspection */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-[#1B2A20]/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <Card className="bg-white border-[#E1DDD0] max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between p-6 pb-3 border-b border-[#ECE7DA]">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#3F7C56]" />
                <h3 className="text-base font-serif font-bold text-[#1B2A20]">Log Quality Grading Inspection</h3>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-[#7A887E] hover:text-[#26312A]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pb-6">
              {inspectionError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-mono flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{inspectionError}</span>
                </div>
              )}

              <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="text-[#526357] uppercase font-semibold block">Select Warehouse Receipt *</label>
                  <Select
                    required
                    value={inspectionForm.receipt_id}
                    onChange={(e) => {
                      const rId = e.target.value
                      const r = receiptsList.find(item => (item.id || item._id) === rId)
                      setInspectionForm({
                        ...inspectionForm,
                        receipt_id: rId,
                        batch_id: r?.batch_id || inspectionForm.batch_id,
                        quality_grade: r?.quality_grade || inspectionForm.quality_grade,
                      })
                    }}
                    className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                  >
                    <option value="">Select Receipt</option>
                    {receiptsList.map((r) => (
                      <option key={r.id || r._id} value={r.id || r._id}>
                        {r.receipt_id} — Batch: {r.batch_id} ({r.accepted_weight_kg} kg)
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <label className="text-[#526357] block">Visual (0-100)*</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={inspectionForm.visual_quality_score}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, visual_quality_score: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block">Uniformity (0-100)*</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={inspectionForm.size_uniformity_score}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, size_uniformity_score: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block">Ripeness (0-100)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={inspectionForm.ripeness_score}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, ripeness_score: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block">Defect % (0-100)*</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      required
                      value={inspectionForm.defect_percentage}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, defect_percentage: e.target.value })}
                      className="bg-white border-[#E1DDD0] text-[#B36B21] focus-visible:ring-[#244634]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[#526357] block font-semibold">Inspection Result *</label>
                    <Select
                      value={inspectionForm.result}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, result: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="PASSED">PASSED</option>
                      <option value="CONDITIONAL">CONDITIONAL</option>
                      <option value="FAILED">FAILED</option>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[#526357] block font-semibold">Final Quality Grade *</label>
                    <Select
                      value={inspectionForm.quality_grade}
                      onChange={(e) => setInspectionForm({ ...inspectionForm, quality_grade: e.target.value })}
                      className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                    >
                      <option value="GRADE_A">GRADE_A (Export / Premium)</option>
                      <option value="GRADE_B">GRADE_B (Standard Retail)</option>
                      <option value="GRADE_C">GRADE_C (Processing)</option>
                      <option value="REJECTED">REJECTED</option>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="foreign_matter"
                    checked={inspectionForm.foreign_matter_present}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, foreign_matter_present: e.target.checked })}
                    className="rounded border-[#C3D4C7] text-[#244634] focus:ring-0"
                  />
                  <label htmlFor="foreign_matter" className="text-[#26312A] font-sans text-xs">Foreign matter detected in sample</label>
                </div>

                <div className="space-y-1">
                  <label className="text-[#526357] block font-semibold">Inspection Notes</label>
                  <Textarea
                    rows={2}
                    value={inspectionForm.notes}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                    placeholder="Observations regarding sugar brix, color indexing, packaging..."
                    className="bg-white border-[#E1DDD0] focus-visible:ring-[#244634]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInspectionModal(false)}
                    className="flex-1 bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7]"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={createInspectionMutation.isPending}
                    className="flex-1 bg-[#244634] hover:bg-[#1A3326] text-white shadow-sm"
                  >
                    {createInspectionMutation.isPending ? 'Logging...' : 'Save Inspection'}
                  </Button>
                </div>
              </form>
            </div>
          </Card>
        </div>
      )}

      {/* Modal 3: Movement Modal */}
      {showMovementModal && selectedItemForMovement && (
        <div className="fixed inset-0 z-50 bg-[#1B2A20]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="bg-white border-[#E1DDD0] max-w-md w-full shadow-2xl p-6">
            <h3 className="text-lg font-serif font-bold text-[#1B2A20] mb-1">Record Stock Movement</h3>
            <p className="text-xs text-[#526357] font-mono mb-4">
              Batch: <span className="text-[#244634] font-semibold">{selectedItemForMovement.batch_id}</span> ({selectedItemForMovement.produce_type})
            </p>

            {movementError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{movementError}</span>
              </div>
            )}

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Movement Type *</label>
                <Select
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                >
                  <option value="INTAKE">INTAKE (Stock In)</option>
                  <option value="DISPATCH">DISPATCH (Outbound Shipment)</option>
                  <option value="RELOCATION">RELOCATION (Internal Bay Transfer)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Cycle Count)</option>
                  <option value="DAMAGE_WRITE_OFF">DAMAGE WRITE OFF</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Quantity (KG) *</label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={movementForm.quantity_kg}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity_kg: e.target.value })}
                  placeholder="e.g. 500"
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Reference ID</label>
                <Input
                  type="text"
                  value={movementForm.reference_id}
                  onChange={(e) => setMovementForm({ ...movementForm, reference_id: e.target.value })}
                  placeholder="Shipment or PO ID"
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#526357] uppercase font-semibold">Notes</label>
                <Textarea
                  rows={2}
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  placeholder="Operational notes..."
                  className="bg-white border-[#E1DDD0] text-xs font-mono focus-visible:ring-[#244634]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 bg-white border-[#E1DDD0] text-[#26312A] hover:bg-[#F2EFE7] text-xs font-mono"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMovementMutation.isPending}
                  className="flex-1 bg-[#244634] hover:bg-[#1A3326] text-white font-mono text-xs shadow-sm"
                >
                  {createMovementMutation.isPending ? 'Logging...' : 'Confirm Movement'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
