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
import PageHeader from '../../components/common/PageHeader'

// Web Crypto helper for client-side SHA-256 demo
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LedgerPage() {
  const [blocks, setBlocks] = useState([])
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
      const blocksRes = await ledgerApi.blocks({ page_size: 50 })
      setBlocks(blocksRes.data || [])
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <PageHeader
        breadcrumbs={[
          { label: 'Security', href: '/ledger' },
          { label: 'Audit Ledger' }
        ]}
        title="Cryptographic Audit Ledger Explorer"
        description="Simulated hash-chained audit journal with verifiable event history."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            SHA-256 HASH CHAIN
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleVerifyLedger}
              disabled={verifying}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-mono font-semibold uppercase rounded-lg bg-[#244634] hover:bg-[#1b3527] disabled:opacity-50 text-white shadow-xs transition-all"
            >
              <ShieldCheck className={`h-4 w-4 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Verifying Integrity...' : 'Verify Ledger Integrity'}</span>
            </button>
            <button
              onClick={fetchLedgerData}
              disabled={loading}
              className="p-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 shadow-xs transition-colors"
              title="Refresh ledger"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      {/* Verification Results Banner */}
      {verifyResult && (() => {
        const isChainValid = Boolean(verifyResult.valid ?? verifyResult.is_valid ?? false)
        return (
          <div
            className={`rounded-xl border p-4 text-sm font-mono flex items-start gap-3 transition-all ${
              isChainValid
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-rose-200 bg-rose-50 text-rose-800'
            }`}
          >
            {isChainValid ? (
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold flex items-center gap-2">
                {isChainValid
                  ? 'LEDGER INTEGRITY VERIFIED (PASS)'
                  : 'INTEGRITY BREACH DETECTED (FAIL)'}
                <span className="text-xs text-stone-500 font-normal">
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

      {/* Ledger summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span>Total Blocks</span>
            <Layers className="h-4 w-4 text-[#244634]" />
          </div>
          <div className="text-2xl font-bold font-mono text-stone-900">
            {blocks.length > 0 ? blocks[0].index : 0}
          </div>
          <div className="text-xs text-stone-500 mt-1 font-mono">
            Height Index #{blocks.length > 0 ? blocks[0].index : 0}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span>Algorithm</span>
            <Lock className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700">
            SHA-256
          </div>
          <div className="text-xs text-stone-500 mt-1 font-sans">NIST FIPS 180-4 Standard</div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs col-span-2">
          <div className="flex items-center justify-between text-stone-500 text-xs font-mono uppercase mb-2">
            <span>Head Block Hash</span>
            <Hash className="h-4 w-4 text-purple-700" />
          </div>
          <div className="text-xs font-mono text-stone-700 truncate bg-stone-50 px-2.5 py-1.5 rounded-lg border border-stone-200 flex items-center justify-between">
            <span className="truncate">{blocks.length > 0 ? blocks[0].hash : 'GENESIS'}</span>
            <button
              onClick={() => copyToClipboard(blocks.length > 0 ? blocks[0].hash : '', 'head')}
              className="text-[#244634] hover:text-emerald-700 ml-2 shrink-0"
              title="Copy hash"
            >
              {copiedHash === 'head' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <div className="text-xs text-stone-500 mt-1 font-mono">Latest listed block</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-xs flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Event Summary, Hash, Entity ID, or Actor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-stone-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#244634]/20 focus:border-[#244634]"
            >
              <option value="">All Event Types</option>
              {eventTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>
        </div>

        <span className="text-xs font-mono text-stone-500 shrink-0">
          Showing {filteredBlocks.length} of {blocks.length} blocks
        </span>
      </div>

      {/* Tampering Simulation Panel */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-900 font-mono">
              Client-Side Cryptographic Tampering Sandbox
            </h2>
          </div>
          <span className="text-xs font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-medium">
            NON-DESTRUCTIVE SIMULATION
          </span>
        </div>
        <p className="text-xs text-stone-600 mb-4 font-sans leading-relaxed">
          Change a block payload in this local demonstration to see its SHA-256 hash change and break the next stored hash link.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[11px] font-mono uppercase text-stone-600 font-semibold mb-1">
              Select Target Block
            </label>
            <select
              value={tamperBlockIdx ?? ''}
              onChange={(e) => setTamperBlockIdx(e.target.value === '' ? null : Number(e.target.value))}
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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
            <label className="block text-[11px] font-mono uppercase text-stone-600 font-semibold mb-1">
              Injected Tampered Payload (JSON/String)
            </label>
            <input
              type="text"
              value={tamperedPayload}
              onChange={(e) => setTamperedPayload(e.target.value)}
              placeholder="e.g. { temperature: 35.0, cargo_weight: 9999 }"
              className="w-full bg-white border border-stone-200 rounded-lg px-3 py-1.5 text-xs font-mono text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button
              onClick={() => {
                const target = blocks.find(b => b.index === tamperBlockIdx)
                if (target) runTamperSimulation(target)
              }}
              disabled={tamperBlockIdx === null}
              className="flex-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors shadow-xs"
            >
              Simulate Attack
            </button>
            {tamperSimResult && (
              <button
                onClick={() => setTamperSimResult(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-200 text-stone-700 hover:bg-stone-300 text-xs font-mono"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Simulation Output Card */}
        {tamperSimResult && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 font-mono text-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700 font-bold">
              <ShieldAlert className="h-4 w-4 text-rose-600" />
              BLOCK #{tamperSimResult.blockIndex} INTEGRITY COLLAPSED
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-stone-500">Original Hash: </span>
                <span className="text-emerald-700 font-bold truncate block">{tamperSimResult.originalHash}</span>
              </div>
              <div>
                <span className="text-stone-500">Altered Hash (Avalanche Result): </span>
                <span className="text-rose-700 font-bold truncate block">{tamperSimResult.tamperedHash}</span>
              </div>
            </div>
            <p className="text-stone-600 text-[11px] pt-1 font-sans">
              Result: The payload modification alters the SHA-256 digest completely. Block #{tamperSimResult.blockIndex + 1}&apos;s stored `previous_hash` no longer matches, invalidating the next {tamperSimResult.subsequentBlocksCount} block(s) downstream. The server verifier detects changes to persisted blocks.
            </p>
          </div>
        )}
      </div>

      {/* Connected Block Sequence */}
      <div className="space-y-4">
        {filteredBlocks.length === 0 ? (
          <div className="py-12 text-center text-stone-500 text-sm font-mono border border-dashed border-stone-200 rounded-xl bg-white">
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
                  <div className="absolute left-6 top-full h-4 w-0.5 bg-stone-200 z-0" />
                )}

                <div className="rounded-xl border border-stone-200 bg-white hover:border-stone-300 transition-all p-5 shadow-xs relative z-10">
                  {/* Top Bar: Index, Event Type, Timestamp */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center font-mono font-bold text-[#244634] text-xs">
                        #{block.index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-stone-900">
                            {block.event_type}
                          </span>
                          {isGenesis && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-mono font-bold">
                              GENESIS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 font-sans">
                          {block.event_summary || 'Ledger event recorded'}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs font-mono text-stone-500">
                      {formatDate(block.timestamp)}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono mb-4">
                    <div>
                      <span className="text-stone-400 uppercase block text-[10px] font-sans">Actor / Role</span>
                      <span className="text-stone-700 truncate block">
                        {block.actor_role || 'SYSTEM'} ({block.actor_id ? block.actor_id.slice(-6) : 'N/A'})
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 uppercase block text-[10px] font-sans">Entity Reference</span>
                      <span className="text-stone-700 truncate block">
                        {block.entity_type}: {block.entity_id ? block.entity_id.slice(-8) : 'N/A'}
                      </span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="text-stone-400 uppercase block text-[10px] font-sans">Payload Hash</span>
                      <span className="text-stone-500 truncate block">
                        {block.payload_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                      </span>
                    </div>
                  </div>

                  {/* Cryptographic Linkage Box */}
                  <div className="rounded-lg bg-stone-50 border border-stone-200 p-3 space-y-2 text-xs font-mono">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                      <span className="text-stone-500 text-[10px] uppercase flex items-center gap-1 font-semibold">
                        <LinkIcon className="h-3 w-3 text-stone-400" />
                        Previous Block Pointer:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-600 truncate max-w-xs md:max-w-md">
                          {block.previous_hash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(block.previous_hash, `prev-${blockId}`)}
                          className="text-stone-400 hover:text-stone-700"
                          title="Copy previous hash"
                        >
                          {copiedHash === `prev-${blockId}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 pt-1 border-t border-stone-200">
                      <span className="text-[#244634] text-[10px] uppercase flex items-center gap-1 font-bold">
                        <Hash className="h-3 w-3 text-[#244634]" />
                        Current Block Digest:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-stone-900 font-bold truncate max-w-xs md:max-w-md">
                          {block.hash}
                        </span>
                        <button
                          onClick={() => copyToClipboard(block.hash, `curr-${blockId}`)}
                          className="text-stone-400 hover:text-stone-700"
                          title="Copy current hash"
                        >
                          {copiedHash === `curr-${blockId}` ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expand Raw Block Details */}
                  <div className="mt-3 pt-2 flex items-center justify-between">
                    <button
                      onClick={() => toggleExpand(blockId)}
                      className="text-xs font-mono text-[#244634] hover:underline flex items-center gap-1 font-semibold"
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
                      className="text-[11px] font-mono text-stone-500 hover:text-amber-700 flex items-center gap-1 transition-colors"
                    >
                      Test in Sandbox &rarr;
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 p-3 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono text-stone-200 overflow-x-auto">
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
