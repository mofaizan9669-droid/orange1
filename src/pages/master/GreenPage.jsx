import { Link } from 'react-router-dom'
import { getMasterPanelHome } from '../../lib/masterPaths.js'
import MasterStub from './MasterStub.jsx'

const LINES = [
  'green ki maa ka bhosda',
  'green ki bau chud jyegi',
]

export default function GreenPage() {
  return (
    <MasterStub label="Green" title="Announcement">
      <div className="crown-green-stage" aria-live="polite">
        <div className="crown-green-ticker" aria-hidden>
          <span className="crown-green-ticker-dot" />
          <span className="crown-green-ticker-inner">
            📢 ANNOUNCEMENT — GREEN EX — 📢 ANNOUNCEMENT — GREEN EX — 📢 ANNOUNCEMENT — GREEN EX — 📢
          </span>
        </div>

        <div className="crown-green-desi-scene">
          <img
            className="crown-green-donkey-img"
            src="/green-donkey.svg"
            alt="Gadha — Green Ex crown"
            width={320}
            height={280}
          />
        </div>

        <div className="crown-green-lines">
          {LINES.map((line, i) => (
            <p
              key={line}
              className="crown-green-announce-line"
              style={{ animationDelay: `${i * 0.18}s` }}
            >
              {line}
            </p>
          ))}
        </div>
      </div>

      <p className="crown-page-note crown-green-back">
        <Link className="crown-link" to={getMasterPanelHome()}>
          ← Dashboard
        </Link>
      </p>
    </MasterStub>
  )
}
