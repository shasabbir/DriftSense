import { describe, expect, it } from 'vitest'
import { domainMatches, hostnameFromUrl, normalizeDomain } from './domainUtils'

describe('domain privacy utilities', () => {
  it('normalizes user input to a hostname only', () => {
    expect(normalizeDomain('https://www.Reddit.com/r/research?q=private')).toBe('reddit.com')
  })

  it('removes paths and query strings from observed URLs', () => {
    expect(hostnameFromUrl('https://www.youtube.com/watch?v=secret')).toBe('youtube.com')
  })

  it('matches configured domains and their subdomains without matching suffix attacks', () => {
    expect(domainMatches('m.youtube.com', 'youtube.com')).toBe(true)
    expect(domainMatches('notyoutube.com', 'youtube.com')).toBe(false)
  })
})
