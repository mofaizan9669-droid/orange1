import {
  Activity,
  BarChart3,
  ClipboardList,
  FileText,
  Leaf,
  PlayCircle,
  Shield,
  Trophy,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'

/** Relative paths under `/master/` (no login userId in URL). */
const MASTER_CRICKET_TILE_DEFS = [
  {
    path: 'green',
    label: 'Green',
    hint: 'Green announcement',
    Icon: Leaf,
    tone: 'green',
  },
  {
    path: 'live-bets',
    label: 'Live Bets',
    hint: 'Open cricket slips',
    Icon: Activity,
    tone: 'green',
  },
  {
    path: 'live-matches',
    label: 'Live Matches',
    hint: 'Fixtures & status',
    Icon: PlayCircle,
    tone: 'cyan',
  },
  {
    path: 'settlement',
    label: 'Settlement',
    hint: 'Cricket P&L & exposure',
    Icon: Wallet,
    tone: 'blue',
  },
  {
    path: 'master/super-admins',
    label: 'Super Admin',
    hint: 'Line owners',
    Icon: Shield,
    tone: 'violet',
  },
  {
    path: 'master/admins',
    label: 'Admin',
    hint: 'Downline admins',
    Icon: UserCog,
    tone: 'teal',
  },
  {
    path: 'master/clients',
    label: 'Client',
    hint: 'Player IDs & map',
    Icon: Users,
    tone: 'amber',
  },
  {
    path: 'sports',
    label: 'Sports betting',
    hint: 'Odds & book config',
    Icon: BarChart3,
    tone: 'emerald',
  },
  {
    path: 'ledger',
    label: 'Ledger',
    hint: 'Coins & cricket txns',
    Icon: ClipboardList,
    tone: 'indigo',
  },
  {
    path: 'reports',
    label: 'Reports',
    hint: 'Client cricket summary',
    Icon: FileText,
    tone: 'red',
  },
  {
    path: 'leaderboard',
    label: 'Leaderboard',
    hint: 'Rankings — details coming soon',
    Icon: Trophy,
    tone: 'amber',
  },
]

/**
 * @param {string} panelBase e.g. `/master` (no trailing slash)
 */
export function buildMasterCricketTiles(panelBase) {
  const b = String(panelBase || '').replace(/\/$/, '')
  return MASTER_CRICKET_TILE_DEFS.map((d) => ({
    ...d,
    to: `${b}/${d.path}`,
  }))
}
