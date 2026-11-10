import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Package,
  Warehouse,
  ClipboardCheck,
  TrendingDown,
  ArrowRightLeft,
  Plus,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Clock,
  Layers,
  ShieldCheck
} from 'lucide-react'
import { inventoryApi, warehousesApi, batchesApi } from '../../api/agriculture.api'
import { useAuth } from '../../context/AuthContext'
import { ROLES, normalizeRole } from '../../constants/roles'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus, getApiError } from '../../utils'

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
  const { data: inventoryData, isLoading, refetch } = useQuery({
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/10 border border-red-500/30 text-red-400">
          <span className="w-1 h-1 rounded-full bg-red-400 animate-ping"></span>
          EXPIRING ({diffDays}d)
        </span>
      )
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400">
          FEFO PRIORITY ({diffDays}d)
        </span>
      )
    }
    return (
      <span className="text-[10px] font-mono text-slate-500">
        {diffDays}d shelf life
      </span>
    )
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-10 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-500"></span>
            <span className="text-xs font-mono font-medium text-cyan-500 uppercase tracking-widest">
              FEFO Inventory & Receiving Hub
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Warehouse <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Inventory</span>
          </h1>
          <p className="text-slate-400 mt-2 max-w-xl text-sm">
            Intake harvest produce, reconcile weight distributions, log quality grading, and manage FEFO stock allocation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isManagerOrAdmin && (
            <>
              <button
                onClick={() => {
                  setReceiptForm(prev => ({
                    ...prev,
                    warehouse_id: selectedWarehouse || (warehouseList[0]?.id || warehouseList[0]?._id || ''),
                  }))
                  setShowReceiptModal(true)
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 transition-all"
              >
                <Plus className="w-4 h-4" /> Receive Harvest Batch
              </button>

              <button
                onClick={() => setShowInspectionModal(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-400" /> Log Inspection
              </button>
            </>
          )}

          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-xs font-mono flex items-center gap-2"
          >
            Sync
          </button>
        </div>
      </div>

      {/* Tabs and Warehouse filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'stock'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ACTIVE STOCK (FEFO)
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'receipts'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WAREHOUSE RECEIPTS
          </button>
          <button
            onClick={() => setActiveTab('inspections')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'inspections'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            QUALITY INSPECTIONS
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-semibold transition-all ${
              activeTab === 'movements'
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            MOVEMENT HISTORY
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 uppercase">Warehouse:</span>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="bg-[#0b1121] border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="">All Storage Nodes</option>
            {warehouseList.map((wh) => (
              <option key={wh.id || wh._id} value={wh.id || wh._id}>
                {wh.name} ({wh.city})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TAB 1: Active Stock Table (FEFO) */}
      {activeTab === 'stock' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Querying distributed inventory nodes...
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="p-16 text-center">
              <Package className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-base">No Stock Found</h3>
              <p className="text-slate-400 text-xs mt-1">
                {selectedWarehouse ? 'This warehouse has no active inventory.' : 'Receive a harvest batch to establish stock.'}
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Batch / Produce</th>
                  <th className="py-3 px-4">Storage Bay</th>
                  <th className="py-3 px-4">Quality Grade</th>
                  <th className="py-3 px-4">Available (KG)</th>
                  <th className="py-3 px-4">Reserved</th>
                  <th className="py-3 px-4">FEFO Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {sortedItems.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{item.produce_type}</div>
                      <div className="text-[10px] text-slate-500">{item.batch_id}</div>
                    </td>
                    <td className="py-3 px-4 text-cyan-400 font-semibold">{item.storage_location || 'Bay 1'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        {item.quality_grade || 'GRADE_A'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{formatWeight(item.quantity_kg)}</td>
                    <td className="py-3 px-4 text-slate-400">{formatWeight(item.reserved_quantity_kg || 0)}</td>
                    <td className="py-3 px-4">{getFefoBadge(item.estimated_shelf_life_end)}</td>
                    <td className="py-3 px-4 text-right">
                      {isManagerOrAdmin && (
                        <button
                          onClick={() => handleOpenMovement(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold"
                        >
                          Transfer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 2: Warehouse Receipts */}
      {activeTab === 'receipts' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {receiptsLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Querying warehouse intake records...
            </div>
          ) : receiptsList.length === 0 ? (
            <div className="p-16 text-center">
              <Warehouse className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-base">No Warehouse Receipts</h3>
              <p className="text-slate-400 text-xs mt-1">
                Receive a harvest batch to generate intake receipts with exact weight reconciliation.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Receipt ID</th>
                  <th className="py-3 px-4">Batch Reference</th>
                  <th className="py-3 px-4">Received Wt</th>
                  <th className="py-3 px-4">Accepted Wt</th>
                  <th className="py-3 px-4">Damaged / Rejected</th>
                  <th className="py-3 px-4">Grade</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Received Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {receiptsList.map((r) => (
                  <tr key={r.id || r._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400">{r.receipt_id}</td>
                    <td className="py-3 px-4 text-slate-300">{r.batch_id}</td>
                    <td className="py-3 px-4 font-bold text-white">{formatWeight(r.received_weight_kg)}</td>
                    <td className="py-3 px-4 text-emerald-400 font-semibold">{formatWeight(r.accepted_weight_kg)}</td>
                    <td className="py-3 px-4 text-slate-400">
                      {formatWeight(r.damaged_weight_kg || 0)} / {formatWeight(r.rejected_weight_kg || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.quality_grade}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded ${getStatusColor(r.status)}`}>
                        {formatStatus(r.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {r.receiving_date ? formatDateTime(r.receiving_date) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 3: Quality Inspections */}
      {activeTab === 'inspections' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {inspectionsLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Querying quality inspection records...
            </div>
          ) : inspectionsList.length === 0 ? (
            <div className="p-16 text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold text-base">No Quality Inspections Logged</h3>
              <p className="text-slate-400 text-xs mt-1">
                Conduct quality grading on intake receipts to evaluate visual quality, uniformity, and defect %.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Inspection ID</th>
                  <th className="py-3 px-4">Receipt Ref</th>
                  <th className="py-3 px-4">Visual Score</th>
                  <th className="py-3 px-4">Uniformity</th>
                  <th className="py-3 px-4">Defect %</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Assigned Grade</th>
                  <th className="py-3 px-4">Inspection Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {inspectionsList.map((insp) => (
                  <tr key={insp.id || insp._id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-cyan-400">{insp.inspection_id}</td>
                    <td className="py-3 px-4 text-slate-300">{insp.receipt_id}</td>
                    <td className="py-3 px-4 font-semibold text-white">{insp.visual_quality_score} / 100</td>
                    <td className="py-3 px-4 text-slate-300">{insp.size_uniformity_score} / 100</td>
                    <td className="py-3 px-4 text-amber-400 font-semibold">{insp.defect_percentage}%</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded ${insp.result === 'PASSED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {insp.result}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-cyan-300 font-bold">{insp.quality_grade}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {insp.inspection_date ? formatDateTime(insp.inspection_date) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* TAB 4: Movement History */}
      {activeTab === 'movements' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {movementsLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Querying ledger movements...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm">
              No stock movements recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                <tr>
                  <th className="py-3 px-4">Movement ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Quantity (KG)</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {movements.map((m) => (
                  <tr key={m.id || m._id} className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-white">{m.movement_id}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400">
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-white">{formatWeight(m.quantity_kg)}</td>
                    <td className="py-3 px-4 text-slate-400">{m.reference_id || '—'}</td>
                    <td className="py-3 px-4 text-slate-500">{m.created_at ? formatDateTime(m.created_at) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal 1: Receive Harvest Batch */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Receive Harvest Batch at Warehouse</h3>
              </div>
              <button onClick={() => setShowReceiptModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {receiptError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
                {receiptError}
              </div>
            )}

            <form onSubmit={handleReceiptSubmit} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 uppercase block mb-1">Target Warehouse *</label>
                  <select
                    required
                    value={receiptForm.warehouse_id}
                    onChange={(e) => setReceiptForm({ ...receiptForm, warehouse_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="">Select Warehouse</option>
                    {warehouseList.map((wh) => (
                      <option key={wh.id || wh._id} value={wh.id || wh._id}>
                        {wh.name} ({wh.city})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 uppercase block mb-1">Harvest Batch *</label>
                  <select
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="">Select Harvested Batch</option>
                    {batchList.map((b) => (
                      <option key={b.id || b._id} value={b.id || b._id}>
                        {b.batch_id} — {b.produce_type} ({b.harvested_quantity_kg} kg)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Exact Weight Reconciliation Section */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-cyan-400" /> Exact Weight Reconciliation
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    isWeightBalanced
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  }`}>
                    {isWeightBalanced ? 'BALANCED (Sum Matches)' : 'UNBALANCED'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">Received Wt (kg)*</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={receiptForm.received_weight_kg}
                      onChange={(e) => setReceiptForm({ ...receiptForm, received_weight_kg: e.target.value })}
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Accepted (kg)*</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={receiptForm.accepted_weight_kg}
                      onChange={(e) => setReceiptForm({ ...receiptForm, accepted_weight_kg: e.target.value })}
                      placeholder="e.g. 4800"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Damaged (kg)*</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={receiptForm.damaged_weight_kg}
                      onChange={(e) => setReceiptForm({ ...receiptForm, damaged_weight_kg: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-amber-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Rejected (kg)*</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={receiptForm.rejected_weight_kg}
                      onChange={(e) => setReceiptForm({ ...receiptForm, rejected_weight_kg: e.target.value })}
                      placeholder="0"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-red-400 font-bold"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                  <span>Reconciliation Formula:</span>
                  <span className={isWeightBalanced ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                    {receivedKg} kg = {acceptedKg} + {damagedKg} + {rejectedKg} ({totalSum} kg)
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Storage Location *</label>
                  <input
                    type="text"
                    required
                    value={receiptForm.storage_location}
                    onChange={(e) => setReceiptForm({ ...receiptForm, storage_location: e.target.value })}
                    placeholder="Bay A-1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Initial Grade *</label>
                  <select
                    value={receiptForm.quality_grade}
                    onChange={(e) => setReceiptForm({ ...receiptForm, quality_grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="GRADE_A">GRADE_A (Premium)</option>
                    <option value="GRADE_B">GRADE_B (Standard)</option>
                    <option value="GRADE_C">GRADE_C (Commercial)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Packaging *</label>
                  <select
                    value={receiptForm.packaging_condition}
                    onChange={(e) => setReceiptForm({ ...receiptForm, packaging_condition: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="GOOD">GOOD</option>
                    <option value="ACCEPTABLE">ACCEPTABLE</option>
                    <option value="DAMAGED">DAMAGED</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReceiptModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createReceiptMutation.isPending || !isWeightBalanced}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 text-slate-950 font-bold disabled:opacity-40 transition-all"
                >
                  {createReceiptMutation.isPending ? 'Intaking...' : 'Confirm Intake Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Log Quality Inspection */}
      {showInspectionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Log Quality Grading Inspection</h3>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {inspectionError && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs font-mono">
                {inspectionError}
              </div>
            )}

            <form onSubmit={handleInspectionSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="text-slate-400 uppercase block mb-1">Select Warehouse Receipt *</label>
                <select
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="">Select Receipt</option>
                  {receiptsList.map((r) => (
                    <option key={r.id || r._id} value={r.id || r._id}>
                      {r.receipt_id} — Batch: {r.batch_id} ({r.accepted_weight_kg} kg)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Visual Score (0-100)*</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={inspectionForm.visual_quality_score}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, visual_quality_score: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Uniformity (0-100)*</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={inspectionForm.size_uniformity_score}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, size_uniformity_score: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Ripeness (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={inspectionForm.ripeness_score}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, ripeness_score: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Defect % (0-100)*</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    required
                    value={inspectionForm.defect_percentage}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, defect_percentage: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-400 block mb-1">Inspection Result *</label>
                  <select
                    value={inspectionForm.result}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, result: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="PASSED">PASSED</option>
                    <option value="CONDITIONAL">CONDITIONAL</option>
                    <option value="FAILED">FAILED</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Final Quality Grade *</label>
                  <select
                    value={inspectionForm.quality_grade}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, quality_grade: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="GRADE_A">GRADE_A (Export / Premium)</option>
                    <option value="GRADE_B">GRADE_B (Standard Retail)</option>
                    <option value="GRADE_C">GRADE_C (Processing)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="foreign_matter"
                  checked={inspectionForm.foreign_matter_present}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, foreign_matter_present: e.target.checked })}
                  className="rounded border-slate-800 text-cyan-500 focus:ring-0"
                />
                <label htmlFor="foreign_matter" className="text-slate-300">Foreign matter detected in sample</label>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Inspection Notes</label>
                <textarea
                  rows={2}
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                  placeholder="Observations regarding sugar brix, color indexing, packaging..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createInspectionMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {createInspectionMutation.isPending ? 'Logging...' : 'Save Inspection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Movement Modal */}
      {showMovementModal && selectedItemForMovement && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1121] border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Record Stock Movement</h3>
            <p className="text-xs text-slate-400 font-mono mb-4">
              Batch: <span className="text-cyan-400">{selectedItemForMovement.batch_id}</span> ({selectedItemForMovement.produce_type})
            </p>

            {movementError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                {movementError}
              </div>
            )}

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Movement Type *</label>
                <select
                  value={movementForm.movement_type}
                  onChange={(e) => setMovementForm({ ...movementForm, movement_type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                >
                  <option value="INTAKE">INTAKE (Stock In)</option>
                  <option value="DISPATCH">DISPATCH (Outbound Shipment)</option>
                  <option value="RELOCATION">RELOCATION (Internal Bay Transfer)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Cycle Count)</option>
                  <option value="DAMAGE_WRITE_OFF">DAMAGE WRITE OFF</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Quantity (KG) *</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={movementForm.quantity_kg}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity_kg: e.target.value })}
                  placeholder="e.g. 500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Reference ID</label>
                <input
                  type="text"
                  value={movementForm.reference_id}
                  onChange={(e) => setMovementForm({ ...movementForm, reference_id: e.target.value })}
                  placeholder="Shipment or PO ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-slate-400 uppercase">Notes</label>
                <textarea
                  rows={2}
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  placeholder="Operational notes..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMovementMutation.isPending}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-mono text-xs font-bold disabled:opacity-50"
                >
                  {createMovementMutation.isPending ? 'Logging...' : 'Confirm Movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
