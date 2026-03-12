import { cn } from '@/lib/utils'

describe('cn() utility', () => {
  it('birden fazla class ismini birleştirir', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('koşullu class\'ları doğru işler', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('tailwind çakışan class\'ları merge eder', () => {
    // tailwind-merge: son gelen kazanır
    expect(cn('p-4', 'p-8')).toBe('p-8')
  })

  it('undefined ve null değerlerini yoksayar', () => {
    expect(cn('foo', undefined, null as unknown as string, 'bar')).toBe('foo bar')
  })
})
