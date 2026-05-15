import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ChevronRight, Minus, Plus, RefreshCw, UserCircle, Users } from 'lucide-react'
import {
  adjustSuperAdminBalanceDelta,
  ensureHierarchySeeded,
  formatHierarchyError,
  readAgentsSnapshot,
  readSuperAdminsSnapshot,
  setAgentBalanceFromSa,
  setSuperAdminBalance,
  transferCoinsAgentToClient,
  transferCoinsAgentToSa,
  transferCoinsClientToAgent,
  transferCoinsSaToAgent,
  patchClientFields,
} from '../../lib/hierarchySnapshot.js'
import { readClients } from '../../lib/storage.js'
import { masterSessionPath } from '../../lib/masterPaths.js'
import { sanitizeDecimalInput } from '../../lib/numericInput.js'

function fmtNum(n) {
  const x = Number(n)
  if (!Number.isFinite(x)) return '0'
  return x.toLocaleString('en-IN')
}

function CoinModal({ title, note, open, onClose, amount, setAmount, onConfirm, confirmLabel = 'OK', errorMessage }) {
  if (!open) return null
  return (
    <div
      className="crown-ex-modal-overlay crown-ex-modal-overlay--orange crown-ex-modal-overlay--top"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="crown-ex-modal crown-ex-modal--orange crown-ex-modal--create-compact"
        role="dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="crown-ex-modal-title">{title}</h2>
        {note ? (
          <p className="crown-ex-modal-note crown-ex-modal-note--tight" style={{ marginBottom: '0.45rem' }}>
            {note}
          </p>
        ) : null}
        <label className="crown-ex-modal-field">
          <span>Rakam (₹)</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(sanitizeDecimalInput(e.target.value))
            }}
            className="crown-ex-input"
            autoFocus
          />
        </label>
        {errorMessage ? (
          <p className="crown-ex-limit-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className="crown-ex-modal-actions">
          <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function MasterSaProfile() {
  const { saId } = useParams()
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  void tick
  ensureHierarchySeeded()
  const sasSa = readSuperAdminsSnapshot()
  const agsSa = readAgentsSnapshot()
  const sa = sasSa.find((x) => x.userId === saId)
  const agents = sa ? agsSa.filter((a) => a.created_by_sa === saId) : []
  const agentsTotal = agents.reduce((sum, a) => sum + (Number(a.balanceCurrent) || 0), 0)

  const [modal, setModal] = useState(null)
  const [amt, setAmt] = useState('')
  const [lineOp, setLineOp] = useState(null)
  const [modalSaveErr, setModalSaveErr] = useState('')

  const setAmtTracked = useCallback((v) => {
    setModalSaveErr('')
    setAmt(v)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setAmt('')
    setModalSaveErr('')
  }, [])

  const closeLineModal = useCallback(() => {
    setLineOp(null)
    setAmt('')
    setModalSaveErr('')
  }, [])

  const onLimitSave = useCallback(() => {
    if (!sa) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = setSuperAdminBalance(sa.userId, n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [amt, bump, closeModal, sa])

  const onAddSave = useCallback(() => {
    if (!sa) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = adjustSuperAdminBalanceDelta(sa.userId, n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [amt, bump, closeModal, sa])

  const onMinusSave = useCallback(() => {
    if (!sa) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = adjustSuperAdminBalanceDelta(sa.userId, -n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [amt, bump, closeModal, sa])

  const onLineLimitSave = useCallback(() => {
    if (!sa || !lineOp) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = setAgentBalanceFromSa(sa.userId, lineOp.agentId, n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeLineModal()
  }, [amt, bump, closeLineModal, lineOp, sa])

  const onLineAddSave = useCallback(() => {
    if (!sa || !lineOp) return
    const r = transferCoinsSaToAgent(sa.userId, lineOp.agentId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeLineModal()
  }, [amt, bump, closeLineModal, lineOp, sa])

  const onLineMinusSave = useCallback(() => {
    if (!sa || !lineOp) return
    const r = transferCoinsAgentToSa(sa.userId, lineOp.agentId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeLineModal()
  }, [amt, bump, closeLineModal, lineOp, sa])

  if (!saId) return null

  if (!sa) {
    return (
      <div className="crown-ex-page crown-ex-page--profile">
        <div className="crown-ex-welcome">CROWN EX · hierarchy</div>
        <div className="crown-ex-profile-inner">
          <p className="crown-ex-profile-empty">Super Admin ID <strong>{saId}</strong> nahi mili.</p>
          <Link className="crown-ex-btn crown-ex-btn--forest" to={masterSessionPath('master/super-admins')}>
            List par wapas
          </Link>
        </div>
      </div>
    )
  }

  const isActive = sa.active !== false

  return (
    <div className="crown-ex-page crown-ex-page--profile">
      <div className="crown-ex-welcome">CROWN EX · Super Admin profile</div>

      <nav className="crown-ex-bc" aria-label="Breadcrumb">
        <Link to={masterSessionPath('master/super-admins')}>Super Admin list</Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <span className="crown-ex-bc-current">{sa.userId}</span>
      </nav>

      <header className="crown-ex-profile-hero">
        <div className="crown-ex-profile-hero-icon" aria-hidden>
          <UserCircle size={36} strokeWidth={1.75} />
        </div>
        <div className="crown-ex-profile-hero-main">
          <h1 className="crown-ex-profile-hero-title">{sa.name}</h1>
          <p className="crown-ex-profile-hero-meta">
            <span className="crown-ex-profile-id">{sa.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span>{sa.mobile ?? '—'}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span className={isActive ? 'crown-ex-pill crown-ex-pill--ok' : 'crown-ex-pill crown-ex-pill--off'}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </p>
          <dl className="crown-ex-profile-stats">
            <div>
              <dt>Pool (SA)</dt>
              <dd>₹ {fmtNum(sa.balanceCurrent)}</dd>
            </div>
            <div>
              <dt>Line admins total</dt>
              <dd>₹ {fmtNum(agentsTotal)}</dd>
            </div>
            <div>
              <dt>Commission</dt>
              <dd>
                Sess. {sa.commissionSession ?? 0}% · Mat. {sa.commissionMatch ?? 0}%
              </dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="crown-ex-profile-toolbar">
        <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={() => { setAmtTracked(''); setModal('limit') }}>
          <RefreshCw size={16} strokeWidth={2} aria-hidden />
          Update limit
        </button>
        <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => { setAmtTracked(''); setModal('add') }}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add coin
        </button>
        <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => { setAmtTracked(''); setModal('minus') }}>
          <Minus size={16} strokeWidth={2} aria-hidden />
          Minus coin
        </button>
      </div>

      <section className="crown-ex-profile-section">
        <h2 className="crown-ex-profile-section-title">
          <Users size={18} strokeWidth={2} aria-hidden />
          Is line ke Admin
        </h2>
        {agents.length === 0 ? (
          <p className="crown-ex-profile-empty">Abhi koi Admin record nahi.</p>
        ) : (
          <div className="crown-ex-profile-table-wrap">
            <table className="crown-ex-profile-table">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Balance</th>
                  <th className="crown-ex-profile-th-actions">Pool se coin</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => {
                  const rowActive = a.active !== false
                  return (
                    <tr key={a.userId} className={!rowActive ? 'is-inactive-profile' : ''}>
                      <td>
                        <Link className="crown-ex-profile-link" to={`./admins/${a.userId}`}>
                          {a.userId}
                        </Link>
                      </td>
                      <td>{a.name}</td>
                      <td>{a.mobile ?? '—'}</td>
                      <td className="crown-ex-profile-num">₹ {fmtNum(a.balanceCurrent)}</td>
                      <td>
                        <div className="crown-ex-profile-mini-actions">
                          <button
                            type="button"
                            className="crown-ex-btn crown-ex-btn--green crown-ex-btn--sm"
                            disabled={!rowActive}
                            onClick={() => {
                              setAmtTracked('')
                              setLineOp({ kind: 'limit', agentId: a.userId })
                            }}
                          >
                            Limit
                          </button>
                          <button
                            type="button"
                            className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--sm"
                            disabled={!rowActive}
                            onClick={() => {
                              setAmtTracked('')
                              setLineOp({ kind: 'add', agentId: a.userId })
                            }}
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--sm"
                            disabled={!rowActive}
                            onClick={() => {
                              setAmtTracked('')
                              setLineOp({ kind: 'minus', agentId: a.userId })
                            }}
                          >
                            − Minus
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link className="crown-ex-btn crown-ex-btn--green crown-ex-btn--sm" to={`./admins/${a.userId}`}>
                          Profile
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <CoinModal
        title="Update limit"
        note=""
        open={modal === 'limit'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onLimitSave}
        confirmLabel="Save"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Add coin"
        note=""
        open={modal === 'add'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onAddSave}
        confirmLabel="Add"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Minus coin"
        note=""
        open={modal === 'minus'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onMinusSave}
        confirmLabel="Minus"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title={
          lineOp?.kind === 'limit'
            ? `Limit · ${lineOp?.agentId ?? ''}`
            : lineOp?.kind === 'add'
              ? `Add · ${lineOp?.agentId ?? ''}`
              : `Minus · ${lineOp?.agentId ?? ''}`
        }
        note=""
        open={!!lineOp}
        onClose={closeLineModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={
          lineOp?.kind === 'limit' ? onLineLimitSave : lineOp?.kind === 'add' ? onLineAddSave : onLineMinusSave
        }
        confirmLabel={lineOp?.kind === 'limit' ? 'Save' : lineOp?.kind === 'add' ? 'Transfer' : 'Return'}
        errorMessage={modalSaveErr}
      />
    </div>
  )
}

export function MasterSaAdminProfile() {
  const { saId, adminId } = useParams()
  const [tick, setTick] = useState(0)
  const bump = useCallback(() => setTick((t) => t + 1), [])

  void tick
  ensureHierarchySeeded()
  const sasAd = readSuperAdminsSnapshot()
  const agsAd = readAgentsSnapshot()
  const clsAd = readClients()
  const sa = sasAd.find((x) => x.userId === saId)
  const agent = agsAd.find((x) => x.userId === adminId && x.created_by_sa === saId)
  const clients = agent ? clsAd.filter((c) => c.created_by_agent === adminId) : []

  const [modal, setModal] = useState(null)
  const [amt, setAmt] = useState('')
  const [clientOp, setClientOp] = useState(null)
  const [modalSaveErr, setModalSaveErr] = useState('')

  const setAmtTracked = useCallback((v) => {
    setModalSaveErr('')
    setAmt(v)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setAmt('')
    setModalSaveErr('')
  }, [])

  const closeClientModal = useCallback(() => {
    setClientOp(null)
    setAmt('')
    setModalSaveErr('')
  }, [])

  const onAgentLimitSave = useCallback(() => {
    if (!agent) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n < 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = setAgentBalanceFromSa(sa.userId, agent.userId, n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [agent, amt, bump, closeModal, sa])

  const onAgentAddFromSa = useCallback(() => {
    if (!sa || !agent) return
    const r = transferCoinsSaToAgent(sa.userId, agent.userId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [agent, amt, bump, closeModal, sa])

  const onAgentMinusToSa = useCallback(() => {
    if (!sa || !agent) return
    const r = transferCoinsAgentToSa(sa.userId, agent.userId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [agent, amt, bump, closeModal, sa])

  const onClientTransfer = useCallback(() => {
    if (!agent || !clientOp) return
    const r =
      clientOp.kind === 'add'
        ? transferCoinsAgentToClient(agent.userId, clientOp.clientId, amt)
        : transferCoinsClientToAgent(agent.userId, clientOp.clientId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeClientModal()
  }, [agent, amt, bump, clientOp, closeClientModal])

  if (!saId || !adminId) return null

  if (!sa || !agent) {
    return (
      <div className="crown-ex-page crown-ex-page--profile">
        <div className="crown-ex-welcome">CROWN EX · hierarchy</div>
        <div className="crown-ex-profile-inner">
          <p className="crown-ex-profile-empty">Super Admin ya Admin match nahi hua.</p>
          <Link className="crown-ex-btn crown-ex-btn--forest" to={masterSessionPath('master/super-admins')}>
            List par wapas
          </Link>
        </div>
      </div>
    )
  }

  const agActive = agent.active !== false

  return (
    <div className="crown-ex-page crown-ex-page--profile">
      <div className="crown-ex-welcome">CROWN EX · Admin profile</div>

      <nav className="crown-ex-bc" aria-label="Breadcrumb">
        <Link to={masterSessionPath('master/super-admins')}>Super Admin list</Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <Link to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(saId)}`}>{sa.userId}</Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <span className="crown-ex-bc-current">{agent.userId}</span>
      </nav>

      <header className="crown-ex-profile-hero crown-ex-profile-hero--admin">
        <div className="crown-ex-profile-hero-icon" aria-hidden>
          <Users size={32} strokeWidth={2} />
        </div>
        <div className="crown-ex-profile-hero-main">
          <h1 className="crown-ex-profile-hero-title">{agent.name}</h1>
          <p className="crown-ex-profile-hero-meta">
            <span className="crown-ex-profile-id">{agent.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span>Line: {sa.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span className={agActive ? 'crown-ex-pill crown-ex-pill--ok' : 'crown-ex-pill crown-ex-pill--off'}>
              {agActive ? 'Active' : 'Inactive'}
            </span>
          </p>
          <dl className="crown-ex-profile-stats">
            <div>
              <dt>Parent SA pool</dt>
              <dd>₹ {fmtNum(sa.balanceCurrent)}</dd>
            </div>
            <div>
              <dt>Admin wallet</dt>
              <dd>₹ {fmtNum(agent.balanceCurrent)}</dd>
            </div>
            <div>
              <dt>Mobile</dt>
              <dd>{agent.mobile ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="crown-ex-profile-toolbar">
        <button type="button" className="crown-ex-btn crown-ex-btn--green" onClick={() => { setAmtTracked(''); setModal('limit') }}>
          <RefreshCw size={16} strokeWidth={2} aria-hidden />
          Update limit
        </button>
        <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => { setAmtTracked(''); setModal('add') }}>
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add coin
        </button>
        <button type="button" className="crown-ex-btn crown-ex-btn--forest" onClick={() => { setAmtTracked(''); setModal('minus') }}>
          <Minus size={16} strokeWidth={2} aria-hidden />
          Minus coin
        </button>
      </div>
      <section className="crown-ex-profile-section">
        <h2 className="crown-ex-profile-section-title">
          <UserCircle size={18} strokeWidth={2} aria-hidden />
          Is Admin ke Clients
        </h2>
        {clients.length === 0 ? (
          <p className="crown-ex-profile-empty">Abhi koi Client record nahi.</p>
        ) : (
          <div className="crown-ex-profile-table-wrap">
            <table className="crown-ex-profile-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>Balance</th>
                  <th>Line</th>
                  <th className="crown-ex-profile-th-actions">Coin</th>
                  <th>Profile</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const line = c.mapLabel ?? `${adminId} → ${saId}`
                  const cActive = c.active !== false
                  const clientProfileTo = `clients/${encodeURIComponent(c.userId)}`
                  return (
                    <tr key={c.userId} className={!cActive ? 'is-inactive-profile' : ''}>
                      <td>
                        <Link className="crown-ex-profile-link" to={clientProfileTo}>
                          {c.userId}
                        </Link>
                      </td>
                      <td>{c.name}</td>
                      <td>{c.mobile ?? '—'}</td>
                      <td className="crown-ex-profile-num">₹ {fmtNum(c.balanceCurrent ?? c.creditLimit)}</td>
                      <td>
                        <span className="crown-ex-profile-map">{line}</span>
                      </td>
                      <td>
                        <div className="crown-ex-profile-mini-actions">
                          <button
                            type="button"
                            className="crown-ex-btn crown-ex-btn--green crown-ex-btn--sm"
                            disabled={!cActive}
                            onClick={() => {
                              setAmtTracked('')
                              setClientOp({ kind: 'add', clientId: c.userId })
                            }}
                          >
                            + Add
                          </button>
                          <button
                            type="button"
                            className="crown-ex-btn crown-ex-btn--forest crown-ex-btn--sm"
                            disabled={!cActive}
                            onClick={() => {
                              setAmtTracked('')
                              setClientOp({ kind: 'minus', clientId: c.userId })
                            }}
                          >
                            − Minus
                          </button>
                        </div>
                      </td>
                      <td>
                        <Link className="crown-ex-btn crown-ex-btn--green crown-ex-btn--sm" to={clientProfileTo}>
                          Profile
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="crown-ex-profile-foot">
        <Link className="crown-ex-link-back" to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(saId)}`}>
          ← Super Admin profile
        </Link>
        {' · '}
        <Link className="crown-ex-link-back" to={masterSessionPath('master/super-admins')}>
          Poori list
        </Link>
      </p>

      <CoinModal
        title="Update limit"
        note=""
        open={modal === 'limit'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onAgentLimitSave}
        confirmLabel="Save"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Add coin"
        note=""
        open={modal === 'add'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onAgentAddFromSa}
        confirmLabel="Transfer"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Minus coin"
        note=""
        open={modal === 'minus'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onAgentMinusToSa}
        confirmLabel="Return"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title={clientOp?.kind === 'add' ? 'Add coin' : 'Minus coin'}
        note=""
        open={!!clientOp}
        onClose={closeClientModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onClientTransfer}
        confirmLabel={clientOp?.kind === 'add' ? 'Add' : 'Minus'}
        errorMessage={modalSaveErr}
      />
    </div>
  )
}

/** Master: client under a Super Admin line + Admin (nested URL like SA → Admin). */
export function MasterSaClientProfile() {
  const { saId, adminId, clientId } = useParams()
  const [tick, setTick] = useState(0)
  const [modal, setModal] = useState(null)
  const [amt, setAmt] = useState('')
  const [modalSaveErr, setModalSaveErr] = useState('')

  const bump = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    const fn = () => bump()
    window.addEventListener('crown-hierarchy-demo-changed', fn)
    return () => window.removeEventListener('crown-hierarchy-demo-changed', fn)
  }, [bump])

  void tick
  ensureHierarchySeeded()
  const sas = readSuperAdminsSnapshot()
  const ags = readAgentsSnapshot()
  const cls = readClients()
  const sa = sas.find((x) => x.userId === saId)
  const agent = ags.find((x) => x.userId === adminId && x.created_by_sa === saId)
  const client = cls.find((c) => c.userId === clientId && c.created_by_agent === adminId)

  const setAmtTracked = useCallback((v) => {
    setModalSaveErr('')
    setAmt(v)
  }, [])

  const closeModal = useCallback(() => {
    setModal(null)
    setAmt('')
    setModalSaveErr('')
  }, [])

  const onClientLimitSave = useCallback(() => {
    if (!client || !agent) return
    const n = Math.round(Number(String(amt).replace(/,/g, '')))
    if (!Number.isFinite(n) || n < 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const oldVal = Math.round(Number(client.creditLimit ?? client.balanceCurrent ?? 0)) || 0
    const diff = n - oldVal
    if (diff > 0) {
      const tr = transferCoinsAgentToClient(agent.userId, client.userId, diff)
      if (!tr.ok) {
        const msg = formatHierarchyError(tr)
        setModalSaveErr(msg)
        window.alert(msg)
        return
      }
    } else if (diff < 0) {
      const tr = transferCoinsClientToAgent(agent.userId, client.userId, -diff)
      if (!tr.ok) {
        const msg = formatHierarchyError(tr)
        setModalSaveErr(msg)
        window.alert(msg)
        return
      }
    }
    patchClientFields(client.userId, { creditLimit: n, balanceCurrent: n })
    bump()
    closeModal()
  }, [agent, amt, bump, client, closeModal])

  const onClientAddSave = useCallback(() => {
    if (!agent || !client) return
    const n = Number(String(amt).replace(/,/g, ''))
    if (!Number.isFinite(n) || n <= 0) {
      const msg = formatHierarchyError({ ok: false, error: 'bad-amount' })
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    const r = transferCoinsAgentToClient(agent.userId, client.userId, n)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [agent, amt, bump, client, closeModal])

  const onClientMinusSave = useCallback(() => {
    if (!agent || !client) return
    const r = transferCoinsClientToAgent(agent.userId, client.userId, amt)
    if (!r.ok) {
      const msg = formatHierarchyError(r)
      setModalSaveErr(msg)
      window.alert(msg)
      return
    }
    bump()
    closeModal()
  }, [agent, amt, bump, client, closeModal])

  if (!saId || !adminId || !clientId) return null

  if (!sa || !agent || !client) {
    return (
      <div className="crown-ex-page crown-ex-page--profile">
        <div className="crown-ex-welcome">CROWN EX · hierarchy</div>
        <div className="crown-ex-profile-inner">
          <p className="crown-ex-profile-empty">Client line match nahi hua.</p>
          <Link className="crown-ex-btn crown-ex-btn--forest" to={masterSessionPath('master/super-admins')}>
            List par wapas
          </Link>
        </div>
      </div>
    )
  }

  const cActive = client.active !== false
  const creditShow = Math.round(Number(client.creditLimit ?? client.balanceCurrent ?? 0)) || 0

  return (
    <div className="crown-ex-page crown-ex-page--profile">
      <div className="crown-ex-welcome">CROWN EX · Client profile</div>

      <nav className="crown-ex-bc" aria-label="Breadcrumb">
        <Link to={masterSessionPath('master/super-admins')}>Super Admin list</Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <Link to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(saId)}`}>{sa.userId}</Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <Link
          to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(saId)}/admins/${encodeURIComponent(adminId)}`}
        >
          {agent.userId}
        </Link>
        <ChevronRight size={14} aria-hidden className="crown-ex-bc-sep" />
        <span className="crown-ex-bc-current">{client.userId}</span>
      </nav>

      <header className="crown-ex-profile-hero crown-ex-profile-hero--admin">
        <div className="crown-ex-profile-hero-icon" aria-hidden>
          <UserCircle size={32} strokeWidth={2} />
        </div>
        <div className="crown-ex-profile-hero-main">
          <h1 className="crown-ex-profile-hero-title">{client.name}</h1>
          <p className="crown-ex-profile-hero-meta">
            <span className="crown-ex-profile-id">{client.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span>Admin: {agent.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span>Line: {sa.userId}</span>
            <span className="crown-ex-profile-dot">·</span>
            <span className={cActive ? 'crown-ex-pill crown-ex-pill--ok' : 'crown-ex-pill crown-ex-pill--off'}>
              {cActive ? 'Active' : 'Inactive'}
            </span>
          </p>
          <dl className="crown-ex-profile-stats">
            <div>
              <dt>Balance</dt>
              <dd>₹ {fmtNum(client.balanceCurrent ?? client.creditLimit)}</dd>
            </div>
            <div>
              <dt>Credit limit</dt>
              <dd>₹ {fmtNum(client.creditLimit ?? client.balanceCurrent)}</dd>
            </div>
            <div>
              <dt>Mobile</dt>
              <dd>{client.mobile ?? '—'}</dd>
            </div>
          </dl>
        </div>
      </header>

      <div className="crown-ex-profile-toolbar">
        <button
          type="button"
          className="crown-ex-btn crown-ex-btn--green"
          disabled={!cActive}
          onClick={() => {
            setAmtTracked(String(creditShow))
            setModal('limit')
          }}
        >
          <RefreshCw size={16} strokeWidth={2} aria-hidden />
          Update limit
        </button>
        <button
          type="button"
          className="crown-ex-btn crown-ex-btn--forest"
          disabled={!cActive}
          onClick={() => {
            setAmtTracked('')
            setModal('add')
          }}
        >
          <Plus size={16} strokeWidth={2} aria-hidden />
          Add coin
        </button>
        <button
          type="button"
          className="crown-ex-btn crown-ex-btn--forest"
          disabled={!cActive}
          onClick={() => {
            setAmtTracked('')
            setModal('minus')
          }}
        >
          <Minus size={16} strokeWidth={2} aria-hidden />
          Minus coin
        </button>
      </div>

      <p className="crown-ex-profile-foot">
        <Link
          className="crown-ex-link-back"
          to={`${masterSessionPath('master/super-admins')}/${encodeURIComponent(saId)}/admins/${encodeURIComponent(adminId)}`}
        >
          ← Admin profile
        </Link>
        {' · '}
        <Link className="crown-ex-link-back" to={masterSessionPath('master/super-admins')}>
          Poori list
        </Link>
      </p>

      <CoinModal
        title="Update limit (credit)"
        note=""
        open={modal === 'limit'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onClientLimitSave}
        confirmLabel="Save"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Add coin to client"
        note={`From ${agent.userId} wallet`}
        open={modal === 'add'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onClientAddSave}
        confirmLabel="Add"
        errorMessage={modalSaveErr}
      />
      <CoinModal
        title="Minus coin from client"
        note={`Return to ${agent.userId} wallet`}
        open={modal === 'minus'}
        onClose={closeModal}
        amount={amt}
        setAmount={setAmtTracked}
        onConfirm={onClientMinusSave}
        confirmLabel="Minus"
        errorMessage={modalSaveErr}
      />
    </div>
  )
}
