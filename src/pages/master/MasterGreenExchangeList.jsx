import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { masterSessionPath } from '../../lib/masterPaths.js'
import {
  ChevronDown,
  Copy,
  Eye,
  FileText,
  List,
  Lock,
  LockOpen,
  Minus,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  UserMinus,
  UserPlus,
  Wrench,
} from 'lucide-react'
import {
  adjustSuperAdminBalanceDelta,
  appendAgent,
  appendClient,
  appendSuperAdmin,
  buildOwnerTree,
  collectAllUserIds,
  ensureHierarchySeeded,
  formatHierarchyError,
  patchAgentBetLock,
  patchAgentFields,
  patchClientBetLock,
  patchClientFields,
  patchSuperAdminBetLock,
  patchSuperAdminFields,
  readAgentsSnapshot,
  readSuperAdminsSnapshot,
  transferCoinsAgentToClient,
  transferCoinsAgentToSa,
  transferCoinsClientToAgent,
  transferCoinsSaToAgent,
} from '../../lib/hierarchySnapshot.js'
import { allocateNewIds } from '../../lib/masterIdGen.js'
import { filterAgentsForClientCreate, getMasterCreateCaps } from '../../lib/masterCapabilities.js'
import { sanitizeDecimalInput, parseDecimalAmount } from '../../lib/numericInput.js'
import { clearRoleSessionIfUserId } from '../../lib/roleSessions.js'

function waDigits(mobile) {
  return String(mobile || '').replace(/\D/g, '')
}

function fmtNum(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0'
  return x.toLocaleString('en-IN')
}

function buildRows(variant) {
  ensureHierarchySeeded()
  const tree = buildOwnerTree()
  if (variant === 'super-admin') {
    return tree.map(({ sa }) => ({
      variant,
      userId: sa.userId,
      name: sa.name,
      parentId: '—',
      mobile: sa.mobile ?? '—',
      password: sa.password ?? '—',
      balanceCurrent: sa.balanceCurrent ?? 0,
      balanceEngaged: sa.balanceEngaged ?? 0,
      commissionSession: sa.commissionSession ?? 0,
      commissionMatch: sa.commissionMatch ?? 0,
      active: sa.active !== false,
      betLocked: !!sa.betLocked,
      extra: {},
    }))
  }
  if (variant === 'admin') {
    const rows = []
    for (const { sa, agents } of tree) {
      for (const { agent } of agents) {
        rows.push({
          variant,
          userId: agent.userId,
          name: agent.name,
          parentId: sa.userId,
          mobile: agent.mobile ?? '—',
          password: agent.password ?? '—',
          balanceCurrent: agent.balanceCurrent ?? 0,
          balanceEngaged: agent.balanceEngaged ?? 0,
          commissionSession: agent.commissionSession ?? 0,
          commissionMatch: agent.commissionMatch ?? 0,
          active: agent.active !== false,
          betLocked: !!agent.betLocked,
          extra: {
            displayLine: `${agent.name} — ${agent.userId} — ${sa.userId}`,
          },
        })
      }
    }
    return rows
  }
  const rows = []
  for (const { sa, agents } of tree) {
    for (const { agent, clients } of agents) {
      for (const c of clients) {
        rows.push({
          variant,
          userId: c.userId,
          name: c.name,
          parentId: c.created_by_agent ?? agent.userId,
          mobile: c.mobile ?? '—',
          password: c.password ?? '—',
          balanceCurrent: c.balanceCurrent ?? c.creditLimit ?? 0,
          balanceEngaged: c.balanceEngaged ?? 0,
          commissionSession: c.commissionSession ?? 0,
          commissionMatch: c.commissionMatch ?? 0,
          active: c.active !== false,
          betLocked: !!c.betLocked,
          extra: {
            map: c.mapLabel ?? `${agent.userId} → ${sa.userId}`,
            creditLimit: c.creditLimit,
            saUserId: sa.userId,
            agentUserId: agent.userId,
            displayLine: `${c.name} — ${agent.userId} — ${sa.userId}`,
          },
        })
      }
    }
  }
  return rows
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text))
  } catch {
    /* ignore */
  }
}

function buildLoginCopyPacket(row) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const loginPath = '/login'
  return [
    'CROWN EX · login details',
    `Website: ${origin}${loginPath}`,
    `User ID: ${row.userId}`,
    `Name: ${row.name}`,
    `Password: ${row.password}`,
  ].join('\n')
}

function rowSearchBlob(r) {
  const mobDigits = waDigits(r.mobile)
  const bal = Number(r.balanceCurrent)
  const cred = r.extra?.creditLimit != null ? Number(r.extra.creditLimit) : NaN
  const engaged = Number(r.balanceEngaged)
  const parts = [
    r.userId,
    r.name,
    r.parentId,
    r.mobile,
    mobDigits,
    r.password,
    r.extra?.map,
    r.extra?.displayLine,
    String(r.balanceCurrent ?? ''),
    Number.isFinite(bal) ? String(bal) : '',
    Number.isFinite(engaged) ? String(engaged) : '',
    Number.isFinite(cred) ? String(cred) : '',
    Number.isFinite(bal) ? fmtNum(bal).replace(/,/g, '') : '',
    Number.isFinite(bal) ? fmtNum(bal) : '',
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}

function clampPct(n) {
  const x = Math.round(Number(n))
  if (!Number.isFinite(x)) return 0
  return Math.min(100, Math.max(0, x))
}

const LIMIT_AMOUNT_STEP = 1000

function createModalTitle(kind) {
  if (kind === 'super-admin') return 'Create Super Admin'
  if (kind === 'admin') return 'Create Admin'
  return 'Create Client'
}

export default function MasterGreenExchangeList({ variant }) {
  const location = useLocation()
  const [tick, setTick] = useState(0)
  const [statusTab, setStatusTab] = useState('active')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(7)
  const [expanded, setExpanded] = useState(null)
  const [menuOpen, setMenuOpen] = useState(null)
  const [pctModal, setPctModal] = useState(null)
  const [pctSess, setPctSess] = useState('0')
  const [pctMat, setPctMat] = useState('0')
  const [limitModal, setLimitModal] = useState(null)
  const [limitSaveError, setLimitSaveError] = useState('')
  const [createKind, setCreateKind] = useState(null)
  const [createForm, setCreateForm] = useState({
    draftUserId: '',
    name: '',
    password: '',
    mobile: '',
    balance: '0',
    sess: '0',
    mat: '0',
    created_by_sa: '',
    created_by_agent: '',
    creditLimit: '0',
  })

  void tick
  const rows = buildRows(variant)
  const caps = getMasterCreateCaps()
  const agentsForClient = filterAgentsForClientCreate(caps)

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const isActive = r.active !== false
      if (statusTab === 'active' && !isActive) return false
      if (statusTab === 'inactive' && isActive) return false
      if (search.trim()) {
        const blob = rowSearchBlob(r)
        const tokens = search
          .toLowerCase()
          .trim()
          .split(/\s+/)
          .filter(Boolean)
        if (!tokens.every((t) => blob.includes(t))) return false
      }
      return true
    })
  }, [rows, statusTab, search])

  const pageRows = useMemo(() => filtered.slice(0, pageSize), [filtered, pageSize])

  const title =
    variant === 'client'
      ? 'Client list'
      : variant === 'admin'
        ? 'Admin list'
        : 'Super Admin list'
  const parentLabel =
    variant === 'client' ? 'Agent' : variant === 'admin' ? 'Super Admin' : 'Parent'

  const limitMenuLabel =
    variant === 'client'
      ? 'Client limit update'
      : variant === 'admin'
        ? 'Admin limit update'
        : 'Super Admin limit update'

  const closeMenu = useCallback(() => setMenuOpen(null), [])

  useEffect(() => {
    if (!menuOpen) return
    const fn = (e) => {
      if (!e.target.closest?.('.crown-ex-menu-wrap')) setMenuOpen(null)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [menuOpen])

  const bump = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const keys = ['crown-clients-v1', 'crown-demo-superadmins', 'crown-demo-agents']
    const onStorage = (e) => {
      if (e.key && keys.includes(e.key)) bump()
    }
    const onVis = () => {
      if (document.visibilityState === 'visible') bump()
    }
    const onDemo = () => bump()
    window.addEventListener('storage', onStorage)
    window.addEventListener('crown-hierarchy-demo-changed', onDemo)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('crown-hierarchy-demo-changed', onDemo)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [bump])

  useEffect(() => {
    if (variant !== 'client') return
    const id = location.hash?.replace(/^#/, '') ?? ''
    if (!id.startsWith('mx-client-')) return
    const t = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(t)
  }, [location.hash, variant, pageRows])

  const toggleBetLock = useCallback(
    (row) => {
      const next = !row.betLocked
      if (row.variant === 'client') patchClientBetLock(row.userId, next)
      else if (row.variant === 'admin') patchAgentBetLock(row.userId, next)
      else patchSuperAdminBetLock(row.userId, next)
      bump()
    },
    [bump],
  )

  const patchRow = useCallback((row, partial) => {
    if (row.variant === 'client') patchClientFields(row.userId, partial)
    else if (row.variant === 'admin') patchAgentFields(row.userId, partial)
    else patchSuperAdminFields(row.userId, partial)
  }, [])

  const onLimitUpdate = useCallback((row) => {
    closeMenu()
    const def =
      row.variant === 'client'
        ? String(row.extra?.creditLimit ?? row.balanceCurrent ?? 0)
        : String(row.balanceCurrent ?? 0)
    setLimitSaveError('')
    setLimitModal({ userId: row.userId, amount: def })
  }, [closeMenu])

  const openLimitHeader = useCallback(() => {
    if (!rows.length) {
      window.alert('Pehle koi record hona chahiye.')
      return
    }
    const r0 = rows[0]
    const def =
      r0.variant === 'client'
        ? String(r0.extra?.creditLimit ?? r0.balanceCurrent ?? 0)
        : String(r0.balanceCurrent ?? 0)
    setLimitSaveError('')
    setLimitModal({ userId: r0.userId, amount: def })
  }, [rows])

  const adjustHeaderLimit = useCallback(
    (delta) => {
      if (!rows.length) {
        window.alert('Pehle koi record hona chahiye.')
        return
      }
      setLimitSaveError('')
      setLimitModal((m) => {
        if (m) {
          const cur = Number(String(m.amount).replace(/,/g, '')) || 0
          return { ...m, amount: String(Math.max(0, cur + delta)) }
        }
        const r0 = rows[0]
        const base =
          r0.variant === 'client'
            ? Number(String(r0.extra?.creditLimit ?? r0.balanceCurrent ?? 0).replace(/,/g, '')) || 0
            : Number(String(r0.balanceCurrent ?? 0).replace(/,/g, '')) || 0
        return { userId: r0.userId, amount: String(Math.max(0, base + delta)) }
      })
    },
    [rows],
  )

  const bumpLimitModalAmount = useCallback((delta) => {
    setLimitSaveError('')
    setLimitModal((m) => {
      if (!m) return m
      const cur = Number(String(m.amount).replace(/,/g, '')) || 0
      return { ...m, amount: String(Math.max(0, cur + delta)) }
    })
  }, [])

  const saveLimitModal = useCallback(() => {
    if (!limitModal) return
    const row = rows.find((r) => r.userId === limitModal.userId)
    if (!row) return
    const raw = parseDecimalAmount(limitModal.amount)
    if (!Number.isFinite(raw) || raw < 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setLimitSaveError(msg)
      window.alert(msg)
      return
    }
    const n = Math.max(0, Math.round(raw))
    if (row.variant === 'client') {
      const agentUserId = row.parentId
      const oldVal = Math.round(Number(row.extra?.creditLimit ?? row.balanceCurrent ?? 0)) || 0
      const diff = n - oldVal
      if (diff > 0) {
        const tr = transferCoinsAgentToClient(agentUserId, row.userId, diff)
        if (!tr.ok) {
          const msg = formatHierarchyError(tr)
          setLimitSaveError(msg)
          window.alert(msg)
          return
        }
      } else if (diff < 0) {
        const tr = transferCoinsClientToAgent(agentUserId, row.userId, -diff)
        if (!tr.ok) {
          const msg = formatHierarchyError(tr)
          setLimitSaveError(msg)
          window.alert(msg)
          return
        }
      }
      patchClientFields(row.userId, { creditLimit: n, balanceCurrent: n })
    } else if (row.variant === 'admin') {
      const saUserId = row.parentId
      const oldAg = Math.round(Number(row.balanceCurrent ?? 0)) || 0
      const diff = n - oldAg
      if (diff > 0) {
        const tr = transferCoinsSaToAgent(saUserId, row.userId, diff)
        if (!tr.ok) {
          const msg = formatHierarchyError(tr)
          setLimitSaveError(msg)
          window.alert(msg)
          return
        }
      } else if (diff < 0) {
        const tr = transferCoinsAgentToSa(saUserId, row.userId, -diff)
        if (!tr.ok) {
          const msg = formatHierarchyError(tr)
          setLimitSaveError(msg)
          window.alert(msg)
          return
        }
      }
      patchAgentFields(row.userId, { balanceCurrent: n })
    } else {
      const oldSa = Math.round(Number(row.balanceCurrent ?? 0)) || 0
      const diff = n - oldSa
      if (diff !== 0) {
        const tr = adjustSuperAdminBalanceDelta(row.userId, diff)
        if (!tr.ok) {
          const msg = formatHierarchyError(tr)
          setLimitSaveError(msg)
          window.alert(msg)
          return
        }
      }
    }
    setLimitSaveError('')
    setLimitModal(null)
    bump()
  }, [bump, limitModal, rows])

  const resetCreateForm = useCallback((kind) => {
    ensureHierarchySeeded()
    const c = getMasterCreateCaps()
    const ids = collectAllUserIds()
    const alloc = allocateNewIds(ids)
    const draftUserId =
      kind === 'super-admin' ? alloc.nextSuperAdminId() : kind === 'admin' ? alloc.nextAgentId() : alloc.nextClientId()
    const sas = readSuperAdminsSnapshot()
    const ags = readAgentsSnapshot()
    let created_by_sa = sas[0]?.userId || ''
    let created_by_agent = ags[0]?.userId || ''
    if (!c.isOwner && c.sessionUserId) {
      if (sas.some((s) => s.userId === c.sessionUserId)) {
        created_by_sa = c.sessionUserId
        const lineAgents = ags.filter((a) => a.created_by_sa === created_by_sa)
        created_by_agent = lineAgents[0]?.userId || ''
      } else if (ags.some((a) => a.userId === c.sessionUserId)) {
        const ag = ags.find((a) => a.userId === c.sessionUserId)
        created_by_sa = ag?.created_by_sa || created_by_sa
        created_by_agent = c.sessionUserId
      }
    }
    setCreateForm({
      draftUserId,
      name: '',
      password: '',
      mobile: '',
      balance: '0',
      sess: kind === 'super-admin' ? '0' : kind === 'admin' ? '1' : '2',
      mat: kind === 'super-admin' ? '0' : kind === 'admin' ? '1' : '2',
      created_by_sa,
      created_by_agent,
      creditLimit: '0',
    })
  }, [])

  const openCreate = useCallback(
    (kind) => {
      if (kind === 'client') {
        const c = getMasterCreateCaps()
        if (!filterAgentsForClientCreate(c).length) {
          window.alert('Pehle apni line me kam se kam ek Admin add karein (Admin page se).')
          return
        }
      }
      resetCreateForm(kind)
      setCreateKind(kind)
    },
    [resetCreateForm],
  )

  const saveCreate = useCallback(() => {
    if (!createKind) return
    if (!createForm.name.trim()) {
      window.alert('Naam daalein.')
      return
    }
    const c = getMasterCreateCaps()
    if (createKind === 'admin' && !c.isOwner) {
      if (createForm.created_by_sa !== c.sessionUserId) {
        window.alert('Sirf apni Super Admin line ke andar admin bana sakte hain.')
        return
      }
    }
    if (createKind === 'client' && !c.isOwner) {
      const ok = filterAgentsForClientCreate(c).some((a) => a.userId === createForm.created_by_agent)
      if (!ok) {
        window.alert('Sirf apni line ke Admin ke neeche client bana sakte hain.')
        return
      }
    }
    let res
    if (createKind === 'super-admin') {
      res = appendSuperAdmin({
        userId: createForm.draftUserId,
        name: createForm.name,
        password: createForm.password,
        mobile: createForm.mobile,
        balanceCurrent: parseDecimalAmount(createForm.balance) || 0,
        commissionSession: createForm.sess,
        commissionMatch: createForm.mat,
      })
    } else if (createKind === 'admin') {
      res = appendAgent({
        userId: createForm.draftUserId,
        name: createForm.name,
        password: createForm.password,
        mobile: createForm.mobile,
        created_by_sa: createForm.created_by_sa,
        balanceCurrent: parseDecimalAmount(createForm.balance) || 0,
        commissionSession: createForm.sess,
        commissionMatch: createForm.mat,
      })
    } else {
      res = appendClient({
        userId: createForm.draftUserId,
        name: createForm.name,
        password: createForm.password,
        mobile: createForm.mobile,
        created_by_agent: createForm.created_by_agent,
        creditLimit: parseDecimalAmount(createForm.creditLimit) || 0,
        commissionSession: createForm.sess,
        commissionMatch: createForm.mat,
      })
    }
    if (!res.ok) {
      window.alert(formatHierarchyError(res))
      return
    }
    setCreateKind(null)
    bump()
  }, [bump, createForm, createKind])

  const onEditName = useCallback(
    (row) => {
      closeMenu()
      const name = window.prompt('Naya naam', row.name)
      if (name == null || !String(name).trim()) return
      patchRow(row, { name: String(name).trim() })
      bump()
    },
    [bump, closeMenu, patchRow],
  )

  const onDeactivate = useCallback(
    (row) => {
      closeMenu()
      if (
        !window.confirm(
          `Deactivate ${row.userId}? Is ID ka role portal session clear ho jayega; list Inactive tab me dikhegi.`,
        )
      ) {
        return
      }
      patchRow(row, { active: false })
      clearRoleSessionIfUserId(row.userId)
      setStatusTab('inactive')
      bump()
    },
    [bump, closeMenu, patchRow],
  )

  const onActivate = useCallback(
    (row) => {
      closeMenu()
      patchRow(row, { active: true })
      setStatusTab('active')
      bump()
    },
    [bump, closeMenu, patchRow],
  )

  const openPctModal = useCallback(
    (row) => {
      closeMenu()
      setPctModal(row)
      setPctSess(String(row.commissionSession ?? 0))
      setPctMat(String(row.commissionMatch ?? 0))
    },
    [closeMenu],
  )

  const savePctModal = useCallback(() => {
    if (!pctModal) return
    const cs = clampPct(pctSess)
    const cm = clampPct(pctMat)
    patchRow(pctModal, { commissionSession: cs, commissionMatch: cm })
    setPctModal(null)
    bump()
  }, [bump, patchRow, pctMat, pctModal, pctSess])

  const stubSoon = useCallback(() => {
    closeMenu()
    window.alert('Ye module jald wire hoga.')
  }, [closeMenu])

  return (
    <div className="crown-ex-page">
      <div className="crown-ex-welcome">Welcome to CROWN EX</div>

      <div className="crown-ex-head">
        <h1 className="crown-ex-title">{title}</h1>
        <div className="crown-ex-head-actions">
          <div className="crown-ex-head-limit-group">
            <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={openLimitHeader}>
              <RefreshCw size={16} strokeWidth={2} aria-hidden />
              Update Limit
            </button>
            <div className="crown-ex-head-step" role="group" aria-label="Limit ±1000">
              <button
                type="button"
                className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--step"
                onClick={() => adjustHeaderLimit(-LIMIT_AMOUNT_STEP)}
                aria-label={`Limit ${LIMIT_AMOUNT_STEP} kam`}
              >
                <Minus size={16} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--step"
                onClick={() => adjustHeaderLimit(LIMIT_AMOUNT_STEP)}
                aria-label={`Limit ${LIMIT_AMOUNT_STEP} zyada`}
              >
                <Plus size={16} strokeWidth={2} aria-hidden />
              </button>
            </div>
          </div>
          {caps.canCreateSuperAdmin && variant === 'super-admin' ? (
            <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => openCreate('super-admin')}>
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Create Super Admin
            </button>
          ) : null}
          {caps.canCreateAdmin && (variant === 'admin' || variant === 'super-admin') ? (
            <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => openCreate('admin')}>
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Create Admin
            </button>
          ) : null}
          {caps.canCreateClient && (variant === 'client' || variant === 'super-admin') ? (
            <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => openCreate('client')}>
              <UserPlus size={16} strokeWidth={2} aria-hidden />
              Create Client
            </button>
          ) : null}
        </div>
      </div>

      <div className="crown-ex-toolbar">
        <div className="crown-ex-tabs" role="tablist" aria-label="Account status">
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === 'active'}
            className={`crown-ex-tab${statusTab === 'active' ? ' is-active' : ''}`}
            onClick={() => setStatusTab('active')}
          >
            Active
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusTab === 'inactive'}
            className={`crown-ex-tab${statusTab === 'inactive' ? ' is-active' : ''}`}
            onClick={() => setStatusTab('inactive')}
          >
            Inactive
          </button>
        </div>
        <div className="crown-ex-toolbar-right">
          <label className="crown-ex-show">
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="crown-ex-select"
            >
              <option value={5}>5</option>
              <option value={7}>7</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>Entries</span>
          </label>
          <label className="crown-ex-search">
            <span className="crown-ex-search-label">Search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="crown-ex-input"
              placeholder="ID, naam, mobile, balance… (alag alag shabd)"
            />
          </label>
        </div>
      </div>

      <div className="crown-ex-table-scroll">
        <table className="crown-ex-table">
          <thead>
            <tr>
              <th rowSpan={2} className="crown-ex-th-icon">
                <span className="crown-ex-th-hint">Lock</span>
              </th>
              <th rowSpan={2} className="crown-ex-th-icon">
                <span className="crown-ex-th-hint">Menu</span>
              </th>
              <th rowSpan={2}>User</th>
              <th rowSpan={2}>{parentLabel}</th>
              <th rowSpan={2}>Name</th>
              <th rowSpan={2}>Mobile</th>
              <th rowSpan={2}>Password</th>
              <th colSpan={2} className="crown-ex-th-group">
                Balance
              </th>
              <th colSpan={2} className="crown-ex-th-group">
                Commission
              </th>
              <th rowSpan={2} className="crown-ex-th-match">
                Match setting
              </th>
            </tr>
            <tr>
              <th>Current</th>
              <th>Engaged</th>
              <th>Sess.</th>
              <th>Mat.</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={12} className="crown-ex-empty">
                  Is filter ke liye koi row nahi.
                </td>
              </tr>
            ) : (
              pageRows.map((row, i) => {
                const open = expanded === row.userId
                const wa = waDigits(row.mobile)
                const isActive = row.active !== false
                return (
                  <Fragment key={row.userId}>
                    <tr
                      id={variant === 'client' ? `mx-client-${row.userId}` : undefined}
                      className={`crown-ex-data-row${i % 2 === 1 ? ' is-alt' : ''}${row.betLocked ? ' is-locked' : ''}${!isActive ? ' is-inactive-row' : ''}`}
                    >
                      <td className="crown-ex-td-icon">
                        <button
                          type="button"
                          className={`crown-ex-lockico${row.betLocked ? ' is-red' : ' is-green'}`}
                          title={row.betLocked ? 'Bets locked — click to unlock' : 'Bets open — click to lock'}
                          aria-label={row.betLocked ? 'Bet lock on, click to unlock' : 'Bet lock off, click to lock'}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleBetLock(row)
                          }}
                        >
                          {row.betLocked ? <Lock size={18} /> : <LockOpen size={18} />}
                        </button>
                      </td>
                      <td className="crown-ex-td-icon crown-ex-td-menu">
                        <div className="crown-ex-menu-wrap">
                          <button
                            type="button"
                            className="crown-ex-row-menu-btn"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen === row.userId}
                            aria-label="Row actions"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpen(menuOpen === row.userId ? null : row.userId)
                            }}
                          >
                            <ChevronDown size={18} strokeWidth={2} aria-hidden />
                          </button>
                          {menuOpen === row.userId ? (
                            <ul className="crown-ex-dropdown" role="menu">
                              <li role="none">
                                <button type="button" role="menuitem" onClick={() => onLimitUpdate(row)}>
                                  <List size={14} strokeWidth={2} aria-hidden />
                                  {limitMenuLabel}
                                </button>
                              </li>
                              <li role="none">
                                <button type="button" role="menuitem" onClick={() => onEditName(row)}>
                                  <Pencil size={14} strokeWidth={2} aria-hidden />
                                  Edit ({row.userId})
                                </button>
                              </li>
                              {isActive ? (
                                <li role="none">
                                  <button type="button" role="menuitem" onClick={() => onDeactivate(row)}>
                                    <UserMinus size={14} strokeWidth={2} aria-hidden />
                                    Deactivate {row.userId}
                                  </button>
                                </li>
                              ) : (
                                <li role="none">
                                  <button type="button" role="menuitem" onClick={() => onActivate(row)}>
                                    <UserPlus size={14} strokeWidth={2} aria-hidden />
                                    Activate {row.userId}
                                  </button>
                                </li>
                              )}
                              <li role="none">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    closeMenu()
                                    setExpanded(open ? null : row.userId)
                                  }}
                                >
                                  <Eye size={14} strokeWidth={2} aria-hidden />
                                  Limit update details
                                </button>
                              </li>
                              <li role="none">
                                <button type="button" role="menuitem" onClick={() => openPctModal(row)}>
                                  <PieChart size={14} strokeWidth={2} aria-hidden />
                                  Percentage share (Master)
                                </button>
                              </li>
                              <li role="none">
                                <button type="button" role="menuitem" onClick={stubSoon}>
                                  <Wrench size={14} strokeWidth={2} aria-hidden />
                                  Sports setting
                                </button>
                              </li>
                              <li role="none">
                                <button type="button" role="menuitem" onClick={stubSoon}>
                                  <FileText size={14} strokeWidth={2} aria-hidden />
                                  Login reports
                                </button>
                              </li>
                            </ul>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        {variant === 'super-admin' ? (
                          <Link
                            className={`crown-ex-userlink crown-ex-userlink--profile${!isActive ? ' crown-ex-userlink--inactive' : ''}`}
                            to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(row.userId)}`}
                            title={!isActive ? 'Inactive · profile' : 'Profile · admins & line'}
                          >
                            {row.userId}
                          </Link>
                        ) : (
                          <span
                            className={`crown-ex-userlink${!isActive ? ' crown-ex-userlink--inactive' : ''}`}
                            title={!isActive ? 'Inactive' : undefined}
                          >
                            {row.userId}
                          </span>
                        )}
                      </td>
                      <td>{row.parentId}</td>
                      <td>
                        <span className="crown-ex-name-line" title={row.extra?.displayLine ?? row.name}>
                          {row.extra?.displayLine ?? row.name}
                        </span>
                      </td>
                      <td>
                        <span className="crown-ex-mobile-cell">
                          {row.mobile}
                          {wa.length >= 10 ? (
                            <a
                              className="crown-ex-wa"
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noreferrer"
                              aria-label="WhatsApp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
                                <path
                                  fill="currentColor"
                                  d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
                                />
                              </svg>
                            </a>
                          ) : null}
                        </span>
                      </td>
                      <td>
                        <span className="crown-ex-pw">
                          {row.password}
                          <button
                            type="button"
                            className="crown-ex-copy"
                            title="Website + User ID + naam + password — ek saath copy"
                            aria-label="Login details copy: website, user ID, name, password"
                            onClick={() => copyText(buildLoginCopyPacket(row))}
                          >
                            <Copy size={14} />
                          </button>
                        </span>
                      </td>
                      <td className="crown-ex-num">{fmtNum(row.balanceCurrent)}</td>
                      <td className="crown-ex-num">{fmtNum(row.balanceEngaged)}</td>
                      <td className="crown-ex-num">{row.commissionSession}%</td>
                      <td className="crown-ex-num">{row.commissionMatch}%</td>
                      <td>
                        <button
                          type="button"
                          className={`crown-ex-betlock${row.betLocked ? ' is-on' : ''}`}
                          onClick={() => toggleBetLock(row)}
                        >
                          {row.betLocked ? 'Unlock bets' : 'Bet Lock'}
                        </button>
                      </td>
                    </tr>
                    {open ? (
                      <tr className="crown-ex-detail-row">
                        <td colSpan={12}>
                          <div className="crown-ex-detail">
                            {variant === 'client' && row.extra?.map ? (
                              <p>
                                <strong>Line:</strong> {row.extra.map}
                                {row.extra.creditLimit != null ? (
                                  <>
                                    {' '}
                                    · <strong>Credit limit:</strong> {fmtNum(row.extra.creditLimit)}
                                  </>
                                ) : null}
                              </p>
                            ) : (
                              <p>
                                <strong>ID:</strong> {row.userId} · <strong>Status:</strong>{' '}
                                {isActive ? 'Active' : 'Inactive'} · <strong>Bet lock:</strong>{' '}
                                {row.betLocked ? 'Yes' : 'No'}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {limitModal ? (
        <div
          className="crown-ex-modal-overlay crown-ex-modal-overlay--orange crown-ex-modal-overlay--limit"
          role="presentation"
          onClick={() => {
            setLimitSaveError('')
            setLimitModal(null)
          }}
        >
          <div
            className="crown-ex-modal crown-ex-modal--orange crown-ex-modal--limit-responsive"
            role="dialog"
            aria-labelledby="crown-ex-limit-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="crown-ex-limit-title" className="crown-ex-modal-title">
              {limitMenuLabel}
            </h2>
            <label className="crown-ex-modal-field">
              <span>User</span>
              <select
                className="crown-ex-select crown-ex-select--full"
                value={limitModal.userId}
                onChange={(e) => {
                  const userId = e.target.value
                  const row = rows.find((r) => r.userId === userId)
                  const def = row
                    ? row.variant === 'client'
                      ? String(row.extra?.creditLimit ?? row.balanceCurrent ?? 0)
                      : String(row.balanceCurrent ?? 0)
                    : limitModal.amount
                  setLimitSaveError('')
                  setLimitModal({ userId, amount: def })
                }}
              >
                {rows.map((r) => (
                  <option key={r.userId} value={r.userId}>
                    {r.extra?.displayLine ? `${r.userId} · ${r.extra.displayLine}` : `${r.userId} — ${r.name}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="crown-ex-modal-field crown-ex-modal-field--amount">
              <span>{variant === 'client' ? 'Naya credit limit (₹)' : 'Naya balance (₹)'}</span>
              <div className="crown-ex-amount-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={limitModal.amount}
                  onChange={(e) => {
                    setLimitSaveError('')
                    setLimitModal((m) =>
                      m ? { ...m, amount: sanitizeDecimalInput(e.target.value) } : null,
                    )
                  }}
                  className="crown-ex-input crown-ex-input--amount-grow"
                />
                <div className="crown-ex-step-btns" role="group" aria-label="Step amount">
                  <button
                    type="button"
                    className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--step"
                    onClick={() => bumpLimitModalAmount(-LIMIT_AMOUNT_STEP)}
                    aria-label={`${LIMIT_AMOUNT_STEP} kam`}
                  >
                    <Minus size={16} strokeWidth={2} aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--step"
                    onClick={() => bumpLimitModalAmount(LIMIT_AMOUNT_STEP)}
                    aria-label={`${LIMIT_AMOUNT_STEP} zyada`}
                  >
                    <Plus size={16} strokeWidth={2} aria-hidden />
                  </button>
                </div>
              </div>
            </label>
            {limitSaveError ? (
              <p className="crown-ex-limit-error" role="alert">
                {limitSaveError}
              </p>
            ) : null}
            <div className="crown-ex-modal-actions">
              <button
                type="button"
                className="crown-ex-btn crown-ex-btn--forest"
                onClick={() => {
                  setLimitSaveError('')
                  setLimitModal(null)
                }}
              >
                Cancel
              </button>
              <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={saveLimitModal}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createKind ? (
        <div
          className="crown-ex-modal-overlay crown-ex-modal-overlay--orange crown-ex-modal-overlay--top"
          role="presentation"
          onClick={() => setCreateKind(null)}
        >
          <div
            className="crown-ex-modal crown-ex-modal--orange crown-ex-modal--create-compact"
            role="dialog"
            aria-labelledby="crown-ex-create-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="crown-ex-create-title" className="crown-ex-modal-title">
              {createModalTitle(createKind)}
            </h2>
            <label className="crown-ex-modal-field">
              <span>User ID</span>
              <input type="text" readOnly value={createForm.draftUserId} className="crown-ex-input" />
            </label>
            <div className="crown-ex-modal-pair">
              <label className="crown-ex-modal-field">
                <span>Name</span>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  className="crown-ex-input"
                />
              </label>
              <label className="crown-ex-modal-field">
                <span>Password</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={createForm.password}
                  placeholder="Min 5 characters"
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  className="crown-ex-input"
                />
              </label>
            </div>
            {createKind === 'admin' ? (
              caps.isOwner ? (
                <label className="crown-ex-modal-field">
                  <span>Super Admin line</span>
                  <select
                    className="crown-ex-select crown-ex-select--full"
                    value={createForm.created_by_sa}
                    onChange={(e) => setCreateForm((f) => ({ ...f, created_by_sa: e.target.value }))}
                  >
                    {readSuperAdminsSnapshot().map((s) => (
                      <option key={s.userId} value={s.userId}>
                        {s.userId} — {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="crown-ex-modal-ro">
                  SA line: <strong>{createForm.created_by_sa}</strong>
                </p>
              )
            ) : null}
            {createKind === 'client' ? (
              <label className="crown-ex-modal-field">
                <span>Admin</span>
                <select
                  className="crown-ex-select crown-ex-select--full"
                  value={createForm.created_by_agent}
                  onChange={(e) => setCreateForm((f) => ({ ...f, created_by_agent: e.target.value }))}
                >
                  {agentsForClient.map((a) => (
                    <option key={a.userId} value={a.userId}>
                      {a.userId} — {a.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="crown-ex-modal-pair">
              <label className="crown-ex-modal-field">
                <span>WhatsApp</span>
                <input
                  type="tel"
                  value={createForm.mobile}
                  onChange={(e) => setCreateForm((f) => ({ ...f, mobile: e.target.value }))}
                  className="crown-ex-input"
                  placeholder="9198…"
                />
              </label>
              {createKind === 'client' ? (
                <label className="crown-ex-modal-field">
                  <span>Credit ₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.creditLimit}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, creditLimit: sanitizeDecimalInput(e.target.value) }))
                    }
                    className="crown-ex-input"
                  />
                </label>
              ) : (
                <label className="crown-ex-modal-field">
                  <span>Open. bal. ₹</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={createForm.balance}
                    onChange={(e) =>
                      setCreateForm((f) => ({ ...f, balance: sanitizeDecimalInput(e.target.value) }))
                    }
                    className="crown-ex-input"
                  />
                </label>
              )}
            </div>
            <div className="crown-ex-modal-pair crown-ex-modal-pair--pct">
              <label className="crown-ex-modal-field">
                <span>Sess. %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={createForm.sess}
                  onChange={(e) => setCreateForm((f) => ({ ...f, sess: e.target.value }))}
                  className="crown-ex-input"
                />
              </label>
              <label className="crown-ex-modal-field">
                <span>Mat. %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={createForm.mat}
                  onChange={(e) => setCreateForm((f) => ({ ...f, mat: e.target.value }))}
                  className="crown-ex-input"
                />
              </label>
            </div>
            <div className="crown-ex-modal-actions">
              <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => setCreateKind(null)}>
                Cancel
              </button>
              <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={saveCreate}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pctModal ? (
        <div
          className="crown-ex-modal-overlay crown-ex-modal-overlay--orange"
          role="presentation"
          onClick={() => setPctModal(null)}
        >
          <div
            className="crown-ex-modal crown-ex-modal--orange"
            role="dialog"
            aria-labelledby="crown-ex-pct-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="crown-ex-pct-title" className="crown-ex-modal-title">
              Commission % (Master) · {pctModal.userId}
            </h2>
            <p className="crown-ex-modal-note">
              Session / Match share jo master set karega — 0–100%.
            </p>
            <label className="crown-ex-modal-field">
              <span>Sess.</span>
              <input
                type="number"
                min={0}
                max={100}
                value={pctSess}
                onChange={(e) => setPctSess(e.target.value)}
                className="crown-ex-input"
              />
            </label>
            <label className="crown-ex-modal-field">
              <span>Mat.</span>
              <input
                type="number"
                min={0}
                max={100}
                value={pctMat}
                onChange={(e) => setPctMat(e.target.value)}
                className="crown-ex-input"
              />
            </label>
            <div className="crown-ex-modal-actions">
              <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => setPctModal(null)}>
                Cancel
              </button>
              <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={savePctModal}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
