/** Demo rows for master cricket gaming screens (replace with API later). */
import { DEMO_ROLE_IDS } from './masterIdGen.js'

const c0 = DEMO_ROLE_IDS.cl[0]
const c1 = DEMO_ROLE_IDS.cl[1]
const c2 = DEMO_ROLE_IDS.cl[2]

export const DEMO_LIVE_CRICKET_BETS = [
  { id: 'B-10421', client: c0, match: 'IND vs AUS · T20', market: 'Match Winner · IND', stake: 5000, odds: 1.85, status: 'Live' },
  { id: 'B-10422', client: c1, match: 'IPL · CSK vs MI', market: 'Over 12.6 · Runs', stake: 2000, odds: 1.9, status: 'Open' },
  { id: 'B-10423', client: c2, match: 'IND vs AUS · T20', market: 'Fancy · 1st 6 ov runs', stake: 10000, odds: 2.1, status: 'Live' },
]

export const DEMO_LIVE_CRICKET_MATCHES = [
  { id: 'M-501', series: 'Bilateral T20', teams: 'IND vs AUS', venue: 'Mumbai', phase: 'Live · Inn 2', overs: '14.3' },
  { id: 'M-502', series: 'IPL 2026', teams: 'CSK vs MI', venue: 'Chennai', phase: 'Today 19:30', overs: '—' },
  { id: 'M-503', series: 'Domestic List-A', teams: 'KAR vs TN', venue: 'Bengaluru', phase: 'Tomorrow 09:30', overs: '—' },
]

export const DEMO_CRICKET_MARKETS = [
  { code: 'MW', name: 'Match winner', scope: 'Per match' },
  { code: 'TO', name: 'Toss', scope: 'Per match' },
  { code: 'SS', name: 'Session / fancy', scope: 'Over-wise' },
  { code: 'LM', name: 'Lambi / boundaries', scope: 'Innings' },
  { code: 'PO', name: 'Player performance', scope: 'Player props' },
]

export const DEMO_CRICKET_LEDGER = [
  { at: 'Today 14:02', client: c0, type: 'Bet place', amount: '-₹5,000', ref: 'B-10421' },
  { at: 'Today 13:18', client: c1, type: 'Win settle', amount: '+₹3,800', ref: 'S-8821' },
  { at: 'Yesterday 22:40', client: DEMO_ROLE_IDS.cl[4], type: 'Deposit', amount: '+₹10,000', ref: 'D-441' },
]

export const DEMO_CRICKET_SETTLEMENT = [
  { label: 'Today cricket P&L (book)', value: '₹ +42,180' },
  { label: 'Open exposure (all clients)', value: '₹ 1,24,500' },
  { label: 'Pending settlements', value: '3 slips' },
]

export const DEMO_CRICKET_REPORT_ROWS = [
  { client: c0, period: 'Today', bets: 12, turnover: '₹ 2,10,000', pnl: '₹ +8,200' },
  { client: c1, period: 'Today', bets: 7, turnover: '₹ 94,000', pnl: '₹ -1,400' },
  { client: c2, period: 'Today', bets: 5, turnover: '₹ 61,500', pnl: '₹ +3,050' },
]
