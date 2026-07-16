import type { MonitoredDomain } from './types'

export function originsForDomains(domains: MonitoredDomain[]): string[] {
  return domains
    .filter((item) => item.enabled)
    .flatMap((item) => [`http://${item.domain}/*`, `https://${item.domain}/*`, `http://*.${item.domain}/*`, `https://*.${item.domain}/*`])
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
