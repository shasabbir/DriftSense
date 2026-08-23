import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const baseUrl = process.argv[2] ?? process.env.DRIFTSENSE_VISUAL_URL ?? 'http://127.0.0.1:5173'
const artifacts = new URL('../artifacts/', import.meta.url)
await mkdir(artifacts, { recursive: true })
const artifactPath = (name) => fileURLToPath(new URL(name, artifacts))

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
const page = await context.newPage()
const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(error.message))

await page.goto(`${baseUrl}/src/options/index.html`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('onboarding-desktop.png'), fullPage: true })
await page.locator('.consent-check').click()
await page.getByRole('button', { name: 'Continue' }).click()
await page.locator('.domain-choice').filter({ hasText: 'wikipedia.org' }).click()
await page.locator('.domain-choice').filter({ hasText: 'youtube.com' }).click()
await page.screenshot({ path: artifactPath('domain-coverage-desktop.png'), fullPage: true })
await page.setViewportSize({ width: 390, height: 844 })
await page.screenshot({ path: artifactPath('domain-coverage-mobile.png'), fullPage: true })
await page.setViewportSize({ width: 1440, height: 1000 })
await page.getByRole('button', { name: 'Continue' }).click()
await page.getByRole('button', { name: 'Start collecting' }).click()
await page.getByText('Study configuration').waitFor()
await page.screenshot({ path: artifactPath('settings-desktop.png'), fullPage: true })

await page.goto(`${baseUrl}/src/dashboard/index.html`, { waitUntil: 'networkidle' })
await page.getByText('No sessions collected yet').waitFor()
await page.screenshot({ path: artifactPath('dashboard-desktop.png'), fullPage: true })

await page.getByRole('button', { name: 'Data & privacy' }).click()
await page.getByText('Your records have not been uploaded.').waitFor()
await page.screenshot({ path: artifactPath('data-privacy-desktop.png'), fullPage: true })

await page.getByRole('button', { name: 'Session history' }).click()
await page.getByText('0 records').waitFor()
await page.screenshot({ path: artifactPath('sessions-desktop.png'), fullPage: true })

await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${baseUrl}/src/dashboard/index.html`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('dashboard-mobile.png'), fullPage: true })
await page.getByRole('button', { name: 'Open navigation' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: artifactPath('dashboard-mobile-menu.png'), fullPage: false })

await page.setViewportSize({ width: 380, height: 620 })
await page.goto(`${baseUrl}/src/popup/index.html`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('popup.png'), fullPage: true })

await page.setViewportSize({ width: 1440, height: 900 })
await page.goto(`${baseUrl}/src/content/preview.html`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('intention-prompt.png'), fullPage: false })
await page.goto(`${baseUrl}/src/content/preview.html?mode=reflection`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('reflection-prompt.png'), fullPage: false })
await page.setViewportSize({ width: 390, height: 844 })
await page.goto(`${baseUrl}/src/content/preview.html`, { waitUntil: 'networkidle' })
await page.screenshot({ path: artifactPath('intention-prompt-mobile.png'), fullPage: false })

const overflowChecks = await page.evaluate(() => ({
  viewport: document.documentElement.clientWidth,
  content: document.documentElement.scrollWidth,
}))

await browser.close()

if (consoleErrors.length) {
  throw new Error(`Console errors:\n${consoleErrors.join('\n')}`)
}
if (overflowChecks.content > overflowChecks.viewport + 1) {
  throw new Error(`Horizontal overflow: ${overflowChecks.content}px content in ${overflowChecks.viewport}px viewport`)
}

console.log('Visual checks passed: onboarding, settings, dashboard, data/privacy, sessions, mobile navigation, popup, intention prompt, and reflection prompt.')
