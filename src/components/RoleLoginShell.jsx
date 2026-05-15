import '../roleLogin.css'

/**
 * @param {{
 *   panelStrip?: string,
 *   showPanelStrip?: boolean,
 *   username: string,
 *   password: string,
 *   onUsernameChange: (v: string) => void,
 *   onPasswordChange: (v: string) => void,
 *   error: string,
 *   onSubmit: (e: import('react').FormEvent) => void,
 * }} props
 */
export default function RoleLoginShell({
  panelStrip = '',
  showPanelStrip = true,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  error,
  onSubmit,
}) {
  return (
    <div className="rl-root">
      <div className="rl-card">
        <div className="rl-logo-chip" aria-hidden>
          CROWN
          <br />
          EX
        </div>
        <h1 className="rl-login-title">LOGIN</h1>
        {showPanelStrip && panelStrip ? <div className="rl-strip">{panelStrip}</div> : null}
        <form className={`rl-form${showPanelStrip && panelStrip ? '' : ' rl-form--no-strip'}`} onSubmit={onSubmit} autoComplete="on">
          <input
            className="rl-field"
            name="username"
            autoComplete="username"
            placeholder="Username"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
          <input
            className="rl-field"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
          {error ? (
            <p className="rl-err" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="rl-btn">
            Login
          </button>
        </form>
      </div>
      <footer className="rl-foot">
        Powered by <strong>CROWN EX</strong>
      </footer>
    </div>
  )
}
