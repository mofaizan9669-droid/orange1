import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { changeAccountPassword, MIN_PASSWORD_LEN } from '../lib/changePassword.js'

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   accountKind: 'master-owner' | 'super-admin' | 'admin',
 *   userId: string,
 *   onSuccess?: () => void,
 * }} props
 */
export default function ChangePasswordModal({ open, onClose, accountKind, userId, onSuccess }) {
  const titleId = useId()
  const [current, setCurrent] = useState('')
  const [nextPw, setNextPw] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')

  useEffect(() => {
    if (!open) return
    setCurrent('')
    setNextPw('')
    setConfirm('')
    setErr('')
    setOkMsg('')
  }, [open, userId])

  if (!open) return null

  const submit = (e) => {
    e.preventDefault()
    setErr('')
    setOkMsg('')
    const result = changeAccountPassword(accountKind, userId, current, nextPw, confirm)
    if (!result.ok) {
      setErr(result.error)
      return
    }
    setOkMsg('Password updated. Master panel lists will show the new password.')
    onSuccess?.()
    setTimeout(() => {
      onClose()
    }, 900)
  }

  return createPortal(
    <div
      className="crown-ex-modal-overlay crown-ex-modal-overlay--orange crown-ex-modal-overlay--top"
      role="presentation"
      onClick={onClose}
    >
      <form
        className="crown-ex-modal crown-ex-modal--orange crown-ex-modal--create-compact"
        role="dialog"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
      >
        <h2 id={titleId} className="crown-ex-modal-title">
          Change password
        </h2>
        <p className="crown-ex-modal-note crown-ex-modal-note--tight">
          Account: <strong className="crown-mono">{userId}</strong> · minimum {MIN_PASSWORD_LEN} characters
        </p>
        <label className="crown-ex-modal-field">
          <span>Current password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>
        <label className="crown-ex-modal-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={nextPw}
            onChange={(e) => setNextPw(e.target.value)}
            minLength={MIN_PASSWORD_LEN}
            required
          />
        </label>
        <label className="crown-ex-modal-field">
          <span>Re-enter new password</span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={MIN_PASSWORD_LEN}
            required
          />
        </label>
        {err ? (
          <p className="crown-ex-modal-error" role="alert">
            {err}
          </p>
        ) : null}
        {okMsg ? (
          <p className="crown-ex-modal-note crown-ex-modal-note--ok" role="status">
            {okMsg}
          </p>
        ) : null}
        <div className="crown-ex-modal-actions">
          <button type="button" className="crown-ex-btn crown-ex-btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="crown-ex-btn crown-ex-btn--forest">
            Update password
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}



