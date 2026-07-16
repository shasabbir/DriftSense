export function normalizeDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase()
  if (!trimmed) return null

  try {
    const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`
    const hostname = new URL(candidate).hostname.replace(/^www\./, '').replace(/\.$/, '')
    if (!hostname || hostname.includes(' ') || !hostname.includes('.')) return null
    return hostname
  } catch {
    return null
  }
}

export function hostnameFromUrl(url?: string): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return null
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

export function domainMatches(hostname: string, configuredDomain: string): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '')
  const configured = configuredDomain.toLowerCase().replace(/^www\./, '')
  return host === configured || host.endsWith(`.${configured}`)
}
