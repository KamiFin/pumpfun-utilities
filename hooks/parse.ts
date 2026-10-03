import type { Position } from '../types'

// Reads the JSON `python3 scripts/pumpfun-trades.py --open-json` prints:
// {rows: [{symbol, mint, chain, wallet, value, cost, upnl, mc}], failed: [wallet labels]}.
// Anything else is a failed run, not an empty list.
export function parsePositions(text: string): { rows: Position[]; failed: string[] } | null {
  let data: any

  try {
    data = JSON.parse(text)
  } catch {
    return null
  }

  if (!data || !Array.isArray(data.rows)) {
    return null
  }

  const rows = data.rows
    .filter((row: any) => row && typeof row.symbol === 'string' && typeof row.value === 'number')
    .map((row: any) => ({
      symbol: row.symbol,
      chain: typeof row.chain === 'string' ? row.chain : '',
      wallet: typeof row.wallet === 'string' ? row.wallet : '',
      value: row.value,
      cost: typeof row.cost === 'number' ? row.cost : 0,
      upnl: typeof row.upnl === 'number' ? row.upnl : row.value - (row.cost ?? 0),
    }))
  const failed = Array.isArray(data.failed) ? data.failed.map(String) : []

  return { rows, failed }
}

// Where a position lives, shown only when it is not the main wallet on Solana.
export function tag(row: Position): string {
  const parts = [row.chain !== 'Solana' ? row.chain : '', row.wallet !== 'main' ? row.wallet : ''].filter(Boolean)

  return parts.length ? ` ${parts.join(' · ')}` : ''
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)

  return `${sign}$${abs >= 1000 ? Math.round(abs).toLocaleString('en-US') : abs.toFixed(abs >= 100 ? 0 : 2)}`
}

// Profit or loss against what was paid; a position with no cost basis has no percent.
export function percent(upnl: number, cost: number): string {
  if (cost <= 0) return 'n/a'

  const value = (upnl / cost) * 100

  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
}

export function totals(rows: Position[]) {
  const value = rows.reduce((sum, row) => sum + row.value, 0)
  const cost = rows.reduce((sum, row) => sum + row.cost, 0)

  return { value, cost, upnl: value - cost }
}
