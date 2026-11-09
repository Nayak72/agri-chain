import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { inventoryApi, warehousesApi } from '../../api/agriculture.api'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'

export default function InventoryPage() {
  const queryClient = useQueryClient()
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [activeTab, setActiveTab] = useState('stock') // 'stock' | 'movements'
  const [showMovementModal, setShowMovementModal] = useState(false)
  const [selectedItemForMovement, setSelectedItemForMovement] = useState(null)

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

  // Inventory query
  const { data: inventoryData, isLoading, refetch } = useQuery({
    queryKey: ['inventory', selectedWarehouse],
    queryFn: () => inventoryApi.list(selectedWarehouse ? { warehouse_id: selectedWarehouse } : {}).then(res => res.data),
    staleTime: 20_000,
  })

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

  // Create movement mutation
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
      const msg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Movement failed.'
      setMovementError(typeof msg === 'string' ? msg : JSON.stringify(msg))
    },
  })

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
              FEFO Inventory Controller
            </span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Inventory <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400">Ledger</span>
          </h1>
          <p className="text-slate-500 mt-2 max-w-xl">
            First-Expired, First-Out agricultural stock management across all storage nodes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all text-sm font-medium flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
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

        {activeTab === 'stock' && (
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
        )}
      </div>

      {/* Active Stock Table (FEFO) */}
      {activeTab === 'stock' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Querying distributed inventory nodes...
            </div>
          ) : sortedItems.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">📋</div>
              <h3 className="text-base font-medium text-white mb-1">No Inventory Records</h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                No active produce items stored in the selected warehouse scope.
              </p>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                  <th className="px-6 py-4">Batch ID</th>
                  <th className="px-6 py-4">Commodity</th>
                  <th className="px-6 py-4">Storage Location</th>
                  <th className="px-6 py-4">Available / Reserved</th>
                  <th className="px-6 py-4">FEFO Status</th>
                  <th className="px-6 py-4">Quality</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedItems.map((item) => (
                  <tr key={item.id || item._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-cyan-400">{item.batch_id}</td>
                    <td className="px-6 py-4 text-slate-200">{item.produce_type}</td>
                    <td className="px-6 py-4 text-slate-400">{item.storage_location || 'Standard Bay'}</td>
                    <td className="px-6 py-4">
                      <span className="text-emerald-400 font-bold">{formatWeight(item.quantity_kg)}</span>
                      {item.reserved_quantity_kg > 0 && (
                        <span className="text-amber-400 ml-2 text-[10px]">
                          ({formatWeight(item.reserved_quantity_kg)} res)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getFefoBadge(item.estimated_shelf_life_end)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {item.quality_grade || 'GRADE_A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenMovement(item)}
                        className="px-3 py-1 rounded-lg border border-cyan-500/30 hover:border-cyan-500 text-cyan-400 hover:text-cyan-300 transition-colors text-[10px]"
                      >
                        Record Movement
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Movement History Table */}
      {activeTab === 'movements' && (
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {movementsLoading ? (
            <div className="p-16 text-center text-slate-500 font-mono text-sm animate-pulse">
              Loading inventory movement ledger...
            </div>
          ) : movements.length === 0 ? (
            <div className="p-16 text-center">
              <div className="text-4xl mb-3">🔄</div>
              <h3 className="text-base font-medium text-white mb-1">No Movements Logged</h3>
              <p className="text-slate-500 text-xs">No stock transfers or movements recorded yet.</p>
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Batch ID</th>
                  <th className="px-6 py-4">Movement Type</th>
                  <th className="px-6 py-4">Quantity</th>
                  <th className="px-6 py-4">Reference</th>
                  <th className="px-6 py-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {movements.map((m, i) => (
                  <tr key={m.id || m._id || i} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-400">{formatDateTime(m.created_at)}</td>
                    <td className="px-6 py-4 text-cyan-400 font-bold">{m.batch_id}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-emerald-400 text-[10px]">
                        {m.movement_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white font-semibold">{formatWeight(m.quantity_kg)}</td>
                    <td className="px-6 py-4 text-slate-400">{m.reference_id || '—'}</td>
                    <td className="px-6 py-4 text-slate-500 truncate max-w-xs">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Movement Modal */}
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

