import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react'
import ChangePasswordModal from './ChangePasswordModal.jsx'

/**
 * @param {'mx' | 'role'} variant
 * @param {'master-owner' | 'super-admin' | 'admin' | null} [accountKind]
 */
export default function UserAccountMenu({
  variant = 'mx',
  userId,
  onLogout,
  onProfileClick,
  accountKind = null,
}) {
  const [open, setOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      const t = e.target
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const t = window.setTimeout(() => document.addEventListener('click', onDoc), 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('click', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const base = variant === 'mx' ? 'crown-user-menu crown-user-menu--mx' : 'crown-user-menu crown-user-menu--role'
  const canChangePassword = Boolean(accountKind && userId)

  const closeMenu = () => setOpen(false)

  const panel =
    open && typeof document !== 'undefined'
      ? createPortal(
          <MenuPanel
            menuId={menuId}
            panelRef={panelRef}
            wrapRef={wrapRef}
            canChangePassword={canChangePassword}
            onProfile={() => {
              closeMenu()
              onProfileClick?.()
            }}
            onChangePassword={() => {
              closeMenu()
              setPwOpen(true)
            }}
            onLogout={() => {
              closeMenu()
              onLogout?.()
            }}
          />,
          document.body,
        )
      : null

  return (
    <>
      <div className={base} ref={wrapRef}>
        <button
          type="button"
          className={`crown-user-menu__trigger${open ? ' is-open' : ''}`}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={menuId}
          onClick={(e) => {
            e.stopPropagation()
            setOpen((v) => !v)
          }}
        >
          <span className="crown-user-menu__id crown-mono">{userId}</span>
          <ChevronDown size={16} className="crown-user-menu__chev" aria-hidden />
        </button>
      </div>
      {panel}
      {canChangePassword ? (
        <ChangePasswordModal
          open={pwOpen}
          onClose={() => setPwOpen(false)}
          accountKind={accountKind}
          userId={userId}
        />
      ) : null}
    </>
  )
}

function MenuPanel({
  menuId,
  panelRef,
  wrapRef,
  canChangePassword,
  onProfile,
  onChangePassword,
  onLogout,
}) {
  const el = wrapRef.current
  const style = el
    ? (() => {
        const r = el.getBoundingClientRect()
        return {
          position: 'fixed',
          top: r.bottom + 6,
          right: Math.max(8, window.innerWidth - r.right),
          zIndex: 200,
          minWidth: '11.5rem',
        }
      })()
    : { position: 'fixed', top: 56, right: 12, zIndex: 200, minWidth: '11.5rem' }

  return (
    <div
      ref={panelRef}
      id={menuId}
      className="crown-user-menu__panel crown-user-menu__panel--fixed"
      role="menu"
      style={style}
    >
      <button type="button" className="crown-user-menu__item crown-user-menu__item--profile" role="menuitem" onClick={onProfile}>
        <User size={16} strokeWidth={2} aria-hidden />
        Profile
      </button>
      {canChangePassword ? (
        <button
          type="button"
          className="crown-user-menu__item crown-user-menu__item--password"
          role="menuitem"
          onClick={onChangePassword}
        >
          <KeyRound size={16} strokeWidth={2} aria-hidden />
          Change password
        </button>
      ) : null}
      <button type="button" className="crown-user-menu__item crown-user-menu__item--logout" role="menuitem" onClick={onLogout}>
        <LogOut size={16} strokeWidth={2} aria-hidden />
        Logout
      </button>
    </div>
  )
}
