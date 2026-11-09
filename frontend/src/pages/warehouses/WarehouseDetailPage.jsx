import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { warehousesApi, inventoryApi } from '../../api/agriculture.api'
import { formatWeight, formatDate, formatDateTime, getStatusColor, formatStatus } from '../../utils'

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
    if (pct > 90) return 'from-red-500 to-orange-500'
    if (pct > 75) return 'from-amber-400 to-orange-400'
    return 'from-cyan-500 to-emerald-500'
  }

  if (whLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
        <div className="text-slate-400 font-mono text-sm animate-pulse">Synchronizing Node Telemetry...</div>
      </div>
    )
  }

  if (whError || !warehouse) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 text-red-500 mb-6">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Storage Node Connection Lost</h2>
        <p className="text-slate-400 mb-8">Could not retrieve telemetry for node ID: {id}</p>
        <button
          onClick={() => navigate('/warehouses')}
          className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all"
        >
          Return to Warehouse Network
        </button>
      </div>
    )
  }

  const nodeId = warehouse.id || warehouse._id || id

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 space-y-8 animate-fade-in-up">
      {/* 2/3 + 1/3 Header Deck (Faithfully matching WarehouseOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Identity Card */}
        <div className="lg:col-span-2 bg-[#0b1121] border border-slate-800 rounded-2xl p-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-20">
            <svg className="w-24 h-24 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>

          <div className="relative z-10">
            <button
              onClick={() => navigate('/warehouses')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 mb-4 flex items-center gap-2 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              NODE_LIST
            </button>

            <h1 className="text-3xl font-bold text-white mb-2">{warehouse.name || 'Designated Node'}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-slate-600 font-mono">ID:</span>
                <span className="font-mono bg-slate-800/50 px-2 py-0.5 rounded text-slate-300">{nodeId}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {warehouse.address}, {warehouse.city}, {warehouse.state}
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Capacity Control Card */}
        <div className="bg-[#0b1121] border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-4">Capacity Status</h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold text-white">{currentLoad.toLocaleString()}</span>
              <span className="text-sm text-slate-400 mb-1.5">/ {maxCapacity > 0 ? maxCapacity.toLocaleString() : '—'} kg</span>
            </div>

            {/* Dynamic Progress Bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(utilizationPercent)} opacity-90 transition-all duration-1000 ease-out`}
                style={{ width: `${utilizationPercent}%` }}
              ></div>
            </div>

            {/* Percentage Label */}
            <div className="mt-2 text-right text-xs font-mono text-slate-500">
              {utilizationPercent.toFixed(1)}% Full
            </div>
          </div>

          <div className="mt-4 pt-6 border-t border-slate-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Active Stock Items</span>
              <span className="font-mono text-emerald-400">{inventoryItems.length} Payload(s)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Deck (Matching WarehouseOS Operational Actions) */}
      <div className="p-1 rounded-2xl bg-slate-900/50 border border-slate-800 backdrop-blur-sm flex flex-col md:flex-row gap-2">
        <button
          onClick={() => navigate('/produce/new')}
          className="flex-1 px-6 py-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-3 border border-transparent hover:border-slate-700 group"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="font-medium text-sm">Define Produce</span>
        </button>

        <button
          onClick={() => navigate('/batches/new')}
          className="flex-1 px-6 py-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-3 border border-transparent hover:border-slate-700 group"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="font-medium text-sm">Add Harvest Batch</span>
        </button>

        <button
          onClick={() => navigate('/cold-chain')}
          className="flex-1 px-6 py-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-3 border border-transparent hover:border-slate-700 group"
        >
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:bg-cyan-500 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="font-medium text-sm">Cold-Chain Monitor</span>
        </button>

        <button
          onClick={() => navigate('/inventory')}
          className="flex-1 px-6 py-4 rounded-xl bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-3 border border-transparent hover:border-slate-700 group"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-medium text-sm">FEFO Inventory</span>
        </button>
      </div>

      {/* Payloads / Stored Stock Table */}
      <div className="bg-[#0b1121] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
              Stored Payloads & Batches
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Active commodity inventory positioned at this node</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {inventoryItems.length} active lots
          </span>
        </div>

        {invLoading ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs animate-pulse">
            Querying node inventory...
          </div>
        ) : inventoryItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-base font-medium text-white mb-1">No Active Payloads in Storage</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto mb-4">
              This node has not received any produce batch shipments or inventory intake yet.
            </p>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              Open Inventory Transfer Module →
            </button>
          </div>
        ) : (
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-500 bg-slate-950/40">
                <th className="px-6 py-3.5">Batch ID</th>
                <th className="px-6 py-3.5">Commodity</th>
                <th className="px-6 py-3.5">Location In Warehouse</th>
                <th className="px-6 py-3.5">Quantity</th>
                <th className="px-6 py-3.5">Shelf Life End</th>
                <th className="px-6 py-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {inventoryItems.map((item) => (
                <tr key={item.id || item._id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-cyan-400">{item.batch_id}</td>
                  <td className="px-6 py-4 text-slate-200">{item.produce_type}</td>
                  <td className="px-6 py-4 text-slate-400">{item.storage_location || 'Aisle A-01'}</td>
                  <td className="px-6 py-4 text-emerald-400 font-semibold">{formatWeight(item.quantity_kg)}</td>
                  <td className="px-6 py-4 text-amber-400">{formatDate(item.estimated_shelf_life_end)}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] uppercase">
                      {item.status || 'AVAILABLE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

