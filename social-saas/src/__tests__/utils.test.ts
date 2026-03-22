import { cn } from '@/lib/utils'

describe('cn() utility', () => {
  it('joins multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('merges conflicting tailwind classes', () => {
    // tailwind-merge: last wins
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('ignores undefined and null', () => {
    expect(cn('foo', undefined, null as unknown as string, 'bar')).toBe('foo bar')
  })
})
