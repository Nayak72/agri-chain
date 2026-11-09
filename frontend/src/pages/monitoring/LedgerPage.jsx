import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  Copy,
  Check,
  RefreshCw,
  Hash,
  Link as LinkIcon,
  Cpu,
  Layers,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Bug,
  Lock,
  ArrowRight
} from 'lucide-react'
import { ledgerApi } from '../../api/monitoring.api'
import { formatDate } from '../../utils'

// Web Crypto helper for client-side SHA-256 demo
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LedgerPage() {
  const [blocks, setBlocks] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState(null)
  const [error, setError] = useState(null)
  const [copiedHash, setCopiedHash] = useState(null)
  const [expandedBlocks, setExpandedBlocks] = useState({})

  // Filters
  const [filterType, setFilterType] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  // Tampering simulation state
  const [tamperBlockIdx, setTamperBlockIdx] = useState(null)
  const [tamperedPayload, setTamperedPayload] = useState('{"temperature": 28.5, "tampered": true}')
  const [tamperSimResult, setTamperSimResult] = useState(null)

  const fetchLedgerData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [blocksRes, statsRes] = await Promise.all([
        ledgerApi.blocks({ page_size: 50 }),
        ledgerApi.statistics().catch(() => ({ data: null })),
      ])
      setBlocks(blocksRes.data || [])
      setStats(statsRes.data || null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load ledger records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLedgerData()
  }, [])

  const handleVerifyLedger = async () => {
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await ledgerApi.verify()
      setVerifyResult(res.data)
    } catch (err) {
      setVerifyResult({
        is_valid: false,
        error: err.response?.data?.detail || 'Integrity check request failed',
      })
    } finally {
      setVerifying(false)
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedHash(id)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  const toggleExpand = (id) => {
    setExpandedBlocks(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Client-side non-destructive cryptographic tampering demonstration
  const runTamperSimulation = async (block) => {
    const originalHash = block.hash
    // Compute new hash with tampered payload
    const simBlockData = `${block.index}:${block.previous_hash}:${tamperedPayload}:${block.event_type}`
    const fakeHash = await sha256(simBlockData)

    setTamperSimResult({
      blockIndex: block.index,
      originalHash,
      tamperedHash: fakeHash,
      previousHash: block.previous_hash,
      chainBroken: true,
      subsequentBlocksCount: blocks.filter(b => b.index > block.index).length,
    })
  }

  const filteredBlocks = blocks.filter(b => {
    if (filterType && b.event_type !== filterType) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const inSummary = (b.event_summary || '').toLowerCase().includes(q)
      const inEntity = (b.entity_id || '').toLowerCase().includes(q)
      const inActor = (b.actor_id || '').toLowerCase().includes(q)
      const inHash = (b.hash || '').toLowerCase().includes(q)
      return inSummary || inEntity || inActor || inHash
    }
    return true
  })

  // Distinct event types
  const eventTypes = Array.from(new Set(blocks.map(b => b.event_type))).filter(Boolean)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-cyan-400" />
              Cryptographic Audit Ledger Explorer
            </h1>
            <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.2)]">
              <ShieldCheck className="h-3 w-3 text-cyan-400" />
              SHA-256 HASH CHAIN
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Immutable supply-chain event journal with cryptographic forward-linkage and verifiable provenance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleVerifyLedger}
            disabled={verifying}
            className="px-4 py-2 rounded-lg text-xs font-mono font-semibold uppercase bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <ShieldCheck className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
            {verifying ? 'Verifying Integrity...' : 'Verify Ledger Integrity'}
          </button>
          <button
            onClick={fetchLedgerData}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Verification Results Banner */}
      {verifyResult && (() => {
        const isChainValid = Boolean(verifyResult.valid ?? verifyResult.is_valid ?? false)
        return (
          <div
            className={`rounded-xl border p-4 text-sm font-mono flex items-start gap-3 transition-all ${
              isChainValid
                ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300'
                : 'border-red-500/40 bg-red-950/20 text-red-300'
            }`}
          >
            {isChainValid ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                {isChainValid
                  ? 'LEDGER INTEGRITY VERIFIED (PASS)'
                  : 'INTEGRITY BREACH DETECTED (FAIL)'}
                <span className="text-xs text-slate-400 font-normal">
                  Checked at {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs">
                {isChainValid
                  ? `All ${verifyResult.verified_blocks ?? verifyResult.total_blocks ?? verifyResult.blocks_checked ?? blocks.length} block headers, payloads, and hash pointers verified back to genesis.`
                  : verifyResult.error || verifyResult.message || 'Cryptographic pointer mismatch discovered in chain.'}
              </p>
            </div>
          </div>
        )
      })()}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span>Total Blocks</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {stats?.total_blocks ?? blocks.length}
          </div>
          <div className="text-xs text-slate-400 mt-1">Height Index #{stats?.last_index ?? (blocks.length > 0 ? blocks[blocks.length - 1].index : 0)}</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span>Algorithm</span>
            <Lock className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            SHA-256
          </div>
          <div className="text-xs text-slate-400 mt-1">NIST FIPS 180-4 Standard</div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-[#0b1121]/90 p-4 col-span-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-mono uppercase mb-2">
            <span>Head Block Hash</span>
            <Hash className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-xs font-mono text-slate-200 truncate bg-slate-900/80 px-2 py-1.5 rounded border border-slate-800 flex items-center justify-between">
            <span className="truncate">{stats?.last_hash || (blocks.length > 0 ? blocks[blocks.length - 1].hash : 'GENESIS')}</span>
            <button
              onClick={() => copyToClipboard(stats?.last_hash || (blocks.length > 0 ? blocks[blocks.length - 1].hash : ''), 'head')}
              className="text-cyan-400 hover:text-cyan-300 ml-2 shrink-0"
              title="Copy hash"
            >
              {copiedHash === 'head' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="text-xs text-slate-400 mt-1">Chain ID: {stats?.chain_id || 'agrichain-ledger-v1'}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-slate-800 bg-[#0b1121]/80 backdrop-blur-sm p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Event Summary, Hash, Entity ID, or Actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">All Event Types</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-mono text-slate-400 shrink-0">
          Showing {filteredBlocks.length} of {blocks.length} blocks
        </span>
      </div>

      {/* Tampering Simulation Panel (Interactive Sandbox Educational Feature) */}
      <div className="rounded-xl border border-amber-500/20 bg-[#0b1121]/90 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              Client-Side Cryptographic Tampering Sandbox
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            NON-DESTRUCTIVE SIMULATION
          </span>
        </div>
        <p className="text-xs text-slate-400 mb-4">
          Experience mathematical immutability: alter any block payload in this sandbox to witness how the SHA-256 avalanche effect instantly breaks cryptographic pointer continuity across all subsequent blocks down the chain.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Select Target Block
            </label>
            <select
              value={tamperBlockIdx ?? ''}
              onChange={(e) => setTamperBlockIdx(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Choose a block to test...</option>
              {blocks.map(b => (
                <option key={b.index} value={b.index}>
                  Block #{b.index} — {b.event_type}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Injected Tampered Payload (JSON/String)
            </label>
            <input
              type="text"
              value={tamperedPayload}
              onChange={(e) => setTamperedPayload(e.target.value)}
              placeholder="e.g. { temperature: 35.0, cargo_weight: 9999 }"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={() => {
                const target = blocks.find(b => b.index === tamperBlockIdx)
                if (target) runTamperSimulation(target)
              }}
              disabled={tamperBlockIdx === null}
              className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-black font-mono font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Simulate Attack
            </button>
            {tamperSimResult && (
              <button
                onClick={() => setTamperSimResult(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-mono"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Simulation Output Card */}
        {tamperSimResult && (
          <div className="mt-4 p-4 rounded-lg border border-red-500/40 bg-red-950/20 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-red-400 font-bold">
              <ShieldAlert className="h-4 w-4" />
              BLOCK #{tamperSimResult.blockIndex} INTEGRITY COLLAPSED
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400">Original Hash: </span>
                <span className="text-emerald-400 truncate block">{tamperSimResult.originalHash}</span>
              </div>
              <div>
                <span className="text-slate-400">Altered Hash (Avalanche Result): </span>
                <span className="text-red-400 truncate block">{tamperSimResult.tamperedHash}</span>
              </div>
            </div>
            <p className="text-slate-300 text-[11px] pt-1">
              Result: The payload modification alters the SHA-256 digest completely. Block #{tamperSimResult.blockIndex + 1}&apos;s stored `previous_hash` no longer matches, invalidating the next {tamperSimResult.subsequentBlocksCount} block(s) downstream. Any tamper attempt is immediately rejected by the network.
            </p>
          </div>
        )}
      </div>

      {/* Connected Block Sequence */}
      <div className="space-y-4">
        {filteredBlocks.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm font-mono border border-dashed border-slate-800 rounded-xl bg-[#0b1121]/50">
            No ledger blocks found matching your query
          </div>
        ) : (
          filteredBlocks.map((block, idx) => {
            const blockId = block.id || block._id || block.block_id || `block-${block.index}`
            const isGenesis = block.index === 0
            const isExpanded = !!expandedBlocks[blockId]

            return (
              <div key={blockId} className="relative">
                {/* Connecting Line between blocks */}
                {idx < filteredBlocks.length - 1 && (
                  <div className="absolute left-6 top-full h-4 w-0.5 bg-gradient-to-b from-cyan-500/40 to-slate-800 z-0" />
                )}

                <div className="rounded-xl border border-slate-800 bg-[#0b1121] hover:border-slate-700 transition-all p-5 relative z-10">
                  {/* Top Bar: Index, Event Type, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-cyan-400 text-xs">
                        #{block.index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">
                            {block.event_type}
                          </span>
                          {isGenesis && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono">
                              GENESIS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400">
                          {block.event_summary || 'Ledger event recorded'}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-slate-400">
                      {formatDate(block.timestamp)}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mb-4">
                    <div>
                      <span className="text-slate-500 uppercase block text-[10px]">Actor / Role</span>
                      <span className="text-slate-300 truncate block">
                        {block.actor_role || 'SYSTEM'} ({block.actor_id ? block.actor_id.slice(-6) : 'N/A'})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block text-[10px]">Entity Reference</span>
                      <span className="text-slate-300 truncate block">
                        {block.entity_type}: {block.entity_id ? block.entity_id.slice(-8) : 'N/A'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-slate-500 uppercase block text-[10px]">Payload Hash</span>
                      <span className="text-slate-400 truncate block">
                        {block.payload_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Linkage Box */}
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800/80 p-3 space-y-2 text-xs font-mono">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-slate-500 text-[10px] uppercase flex items-center gap-1">
                        <LinkIcon className="h-3 w-3 text-slate-400" />
                        Previous Block Pointer:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 truncate max-w-xs md:max-w-md">
                          {block.previous_hash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(block.previous_hash, `prev-${blockId}`)}
                          className="text-slate-500 hover:text-cyan-400"
                          title="Copy previous hash"
                        >
                          {copiedHash === `prev-${blockId}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 pt-1 border-t border-slate-800/60">
                      <span className="text-cyan-400 text-[10px] uppercase flex items-center gap-1 font-semibold">
                        <Hash className="h-3 w-3 text-cyan-400" />
                        Current Block Digest:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-300 font-bold truncate max-w-xs md:max-w-md">
                          {block.hash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(block.hash, `curr-${blockId}`)}
                          className="text-slate-500 hover:text-cyan-400"
                          title="Copy current hash"
                        >
                          {copiedHash === `curr-${blockId}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expand Raw Block Details */}
                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(blockId)}
                      className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> Hide Raw Block Envelope
                        </>
                      ) : (
                        <>
                          <ChevronRight className="h-3.5 w-3.5" /> Inspect Raw Block Envelope
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setTamperBlockIdx(block.index)
                        window.scrollTo({ top: 400, behavior: 'smooth' })
                      }}
                      className="text-[11px] font-mono text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
                    >
                      Test in Sandbox &rarr;
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
                      <pre>{JSON.stringify(block, null, 2)}</pre>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

