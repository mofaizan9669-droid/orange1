import CricketDemoTable from '../../components/CricketDemoTable.jsx'
import {
  DEMO_CRICKET_LEDGER,
  DEMO_CRICKET_MARKETS,
  DEMO_CRICKET_REPORT_ROWS,
  DEMO_CRICKET_SETTLEMENT,
  DEMO_LIVE_CRICKET_BETS,
  DEMO_LIVE_CRICKET_MATCHES,
} from '../../lib/cricketDemoData.js'
import MasterStub from './MasterStub.jsx'

export function LiveBetsPage() {
  return (
    <MasterStub label="Cricket · Live" title="Live bets (open slips)">
      <p className="crown-page-note">Current cricket positions — session, fancy, match & toss. Backend se live stream yahan bind hoga.</p>
      <CricketDemoTable
        columns={[
          { key: 'id', label: 'Bet ID' },
          { key: 'client', label: 'Client' },
          { key: 'match', label: 'Match' },
          { key: 'market', label: 'Market' },
          { key: 'stake', label: 'Stake' },
          { key: 'odds', label: 'Odds' },
          { key: 'status', label: 'Status' },
        ]}
        rows={DEMO_LIVE_CRICKET_BETS}
        empty="Koi open cricket bet nahi."
      />
    </MasterStub>
  )
}

export function LiveMatchesPage() {
  return (
    <MasterStub label="Cricket · Fixtures" title="Live & upcoming matches">
      <p className="crown-page-note">Score feed + odds panels per fixture. Feed connect hone par rows auto-update.</p>
      <CricketDemoTable
        columns={[
          { key: 'id', label: 'ID' },
          { key: 'series', label: 'Series' },
          { key: 'teams', label: 'Teams' },
          { key: 'venue', label: 'Venue' },
          { key: 'phase', label: 'Status' },
          { key: 'overs', label: 'Overs' },
        ]}
        rows={DEMO_LIVE_CRICKET_MATCHES}
        empty="Abhi schedule empty."
      />
    </MasterStub>
  )
}

export function SettlementPage() {
  return (
    <MasterStub label="Cricket · Finance" title="Settlement & exposure">
      <p className="crown-page-note">Aaj ka cricket book P&L, open exposure, aur pending settlements.</p>
      <ul className="crown-cricket-kv">
        {DEMO_CRICKET_SETTLEMENT.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value}</strong>
          </li>
        ))}
      </ul>
    </MasterStub>
  )
}

export function SportsPage() {
  return (
    <MasterStub label="Cricket · Book" title="Cricket markets">
      <p className="crown-page-note">Master book — kaun se cricket market types downline ko dikh rahe hain (config + limits).</p>
      <CricketDemoTable
        columns={[
          { key: 'code', label: 'Code' },
          { key: 'name', label: 'Market' },
          { key: 'scope', label: 'Scope' },
        ]}
        rows={DEMO_CRICKET_MARKETS}
        empty="Markets configure karein."
      />
    </MasterStub>
  )
}

export function LedgerPage() {
  return (
    <MasterStub label="Cricket · Ledger" title="Coin ledger">
      <p className="crown-page-note">Cricket se linked deposits, bet place, settle — sab transaction lines.</p>
      <CricketDemoTable
        columns={[
          { key: 'at', label: 'Time' },
          { key: 'client', label: 'Client' },
          { key: 'type', label: 'Type' },
          { key: 'amount', label: 'Amount' },
          { key: 'ref', label: 'Ref' },
        ]}
        rows={DEMO_CRICKET_LEDGER}
        empty="Koi entry nahi."
      />
    </MasterStub>
  )
}

export function ReportsPage() {
  return (
    <MasterStub label="Cricket · Reports" title="Client cricket report">
      <p className="crown-page-note">Per-client cricket turnover & P&L; export filters baad me add.</p>
      <CricketDemoTable
        columns={[
          { key: 'client', label: 'Client' },
          { key: 'period', label: 'Period' },
          { key: 'bets', label: 'Bets' },
          { key: 'turnover', label: 'Turnover' },
          { key: 'pnl', label: 'P&L' },
        ]}
        rows={DEMO_CRICKET_REPORT_ROWS}
        empty="Report data nahi."
      />
    </MasterStub>
  )
}

export function LeaderboardPage() {
  return (
    <MasterStub label="Cricket" title="Leaderboard">
      <p className="crown-page-note">
        Leaderboard screen — aage ka flow yahan add hoga. Abhi placeholder; Master dashboard se is tile par aate ho.
      </p>
    </MasterStub>
  )
}

export function OldDataPage() {
  return (
    <MasterStub label="Cricket · Archive" title="Old data">
      <p className="crown-page-note">Purane season / settled slips — read-only archive tables.</p>
    </MasterStub>
  )
}
