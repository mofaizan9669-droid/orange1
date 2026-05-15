import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { buildOwnerTree } from '../../lib/hierarchySnapshot.js'
import { masterSessionPath } from '../../lib/masterPaths.js'

export default function HierarchyPage() {
  const tree = useMemo(() => buildOwnerTree(), [])

  return (
    <div className="crown-page-view">
      <div className="crown-ticker">
        <span>Full line</span>
      </div>
      <section className="crown-hero crown-hero--page">
        <p className="crown-muted">Owner</p>
        <h1>SA → Admin → Client</h1>
      </section>

      <div className="crown-hier-tree">
        {tree.map(({ sa, agents }) => (
          <section key={sa.userId} className="crown-hier-sa">
            <header className="crown-hier-sa-head">
              <span className="crown-hier-badge crown-hier-badge--sa">SA</span>
              <span className="crown-mono">{sa.userId}</span>
              <span className="crown-hier-name">{sa.name}</span>
            </header>
            {agents.length === 0 ? (
              <p className="crown-muted crown-hier-empty">—</p>
            ) : (
              <ul className="crown-hier-agent-list">
                {agents.map(({ agent, clients }) => (
                  <li key={agent.userId} className="crown-hier-agent">
                    <div className="crown-hier-agent-head">
                      <span className="crown-hier-badge crown-hier-badge--ag">AG</span>
                      <span className="crown-mono">{agent.userId}</span>
                      <span>{agent.name}</span>
                      <span className="crown-hier-meta">{sa.userId}</span>
                    </div>
                    {clients.length === 0 ? (
                      <p className="crown-muted crown-hier-clients-empty">—</p>
                    ) : (
                      <ul className="crown-hier-client-list">
                        {clients.map((c) => (
                          <li key={c.userId}>
                            <span className="crown-hier-badge crown-hier-badge--cl">CL</span>
                            <span className="crown-mono">{c.userId}</span>
                            <span>{c.name}</span>
                            {Number.isFinite(c.creditLimit) ? (
                              <span className="crown-hier-meta">{c.creditLimit}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <p className="crown-hier-back">
        <Link className="crown-link" to={masterSessionPath('')}>
          ← Dashboard
        </Link>
      </p>
    </div>
  )
}
