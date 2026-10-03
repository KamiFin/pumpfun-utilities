import { expect, test } from 'claude-code/testing'

import { money, parsePositions, percent, tag, totals } from './parse'

// Shape of a --open-json run (values rounded, mints left out).
const OUT = JSON.stringify({
  rows: [
    { symbol: 'ALPHA', chain: 'Solana', wallet: 'main', value: 104.4, cost: 174.5, upnl: -70.1 },
    { symbol: 'BETA', chain: 'Solana', wallet: 'main', value: 75.3, cost: 145, upnl: -69.7 },
    { symbol: 'GAMMA', chain: 'chain 777', wallet: 'second', value: 20, cost: 10, upnl: 10 },
  ],
  failed: ['third'],
})

test('reads the rows, the order and the wallets that failed', () => {
  const got = parsePositions(OUT)

  expect(got?.rows.map(row => row.symbol)).toEqual(['ALPHA', 'BETA', 'GAMMA'])
  expect(got?.rows[0].upnl).toBe(-70.1)
  expect(got?.failed).toEqual(['third'])
})

test('an empty list is a list, bad text is a failure', () => {
  expect(parsePositions('{"rows":[],"failed":[]}')).toEqual({ rows: [], failed: [] })
  expect(parsePositions('Traceback (most recent call last)')).toBeNull()
  expect(parsePositions('[]')).toBeNull()
})

test('rows without a symbol or value are dropped', () => {
  expect(parsePositions('{"rows":[{"symbol":"X"},{"value":3},{"symbol":"Y","value":2,"cost":1}]}')?.rows).toEqual([
    { symbol: 'Y', chain: '', wallet: '', value: 2, cost: 1, upnl: 1 },
  ])
})

test('the tag names chain and wallet only when they are not main on Solana', () => {
  const rows = parsePositions(OUT)?.rows ?? []

  expect(tag(rows[0])).toBe('')
  expect(tag(rows[2])).toBe(' chain 777 · second')
})

test('money and percent', () => {
  expect(money(104.4)).toBe('$104')
  expect(money(7.456)).toBe('$7.46')
  expect(money(-70.1)).toBe('-$70.10')
  expect(money(12345.6)).toBe('$12,346')
  expect(percent(-70.1, 174.5)).toBe('-40.2%')
  expect(percent(24, 100)).toBe('+24.0%')
  expect(percent(5, 0)).toBe('n/a')
})

test('totals add up value, cost and the difference', () => {
  const sum = totals((parsePositions(OUT)?.rows ?? []).slice(0, 2))

  expect(Math.round(sum.value * 10) / 10).toBe(179.7)
  expect(Math.round(sum.upnl * 10) / 10).toBe(-139.8)
})
