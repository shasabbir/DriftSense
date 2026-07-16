import type { MonitoredDomain } from './types'

export function originsForDomains(domains: MonitoredDomain[]): string[] {
  return domains
    .filter((item) => item.enabled)
    .flatMap((item) => originsForDomain(item.domain))
}

export function originsForDomain(domain: string): string[] {
  return [`http://${domain}/*`, `https://${domain}/*`, `http://*.${domain}/*`, `https://*.${domain}/*`]
}

export async function requestDomainPermissions(domains: MonitoredDomain[]): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions) return true
  const origins = originsForDomains(domains)
  if (origins.length === 0) return true
  return chrome.permissions.request({ origins })
}

export async function removeUnusedDomainPermissions(previous: MonitoredDomain[], next: MonitoredDomain[]): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.permissions) return
  const retained = new Set(originsForDomains(next))
  const origins = originsForDomains(previous).filter((origin) => !retained.has(origin))
  if (origins.length) await chrome.permissions.remove({ origins })
}

export async function permittedOrigins(domains: MonitoredDomain[]): Promise<string[]> {
  const requested = originsForDomains(domains)
  if (typeof chrome === 'undefined' || !chrome.permissions) return requested
  const checks = await Promise.all(requested.map(async (origin) => ({ origin, allowed: await chrome.permissions.contains({ origins: [origin] }) })))
  return checks.filter((item) => item.allowed).map((item) => item.origin)
}

export async function missingPermissionDomains(domains: MonitoredDomain[]): Promise<string[]> {
  const enabled = domains.filter((item) => item.enabled)
  if (typeof chrome === 'undefined' || !chrome.permissions) return []
  const checks = await Promise.all(enabled.map(async (item) => ({
    domain: item.domain,
    allowed: await chrome.permissions.contains({ origins: originsForDomain(item.domain) }),
  })))
  return checks.filter((item) => !item.allowed).map((item) => item.domain)
}
