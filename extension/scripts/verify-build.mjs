import { readFile } from 'node:fs/promises'

const manifest = JSON.parse(await readFile(new URL('../dist/manifest.json', import.meta.url), 'utf8'))
const contentScript = manifest.content_scripts?.[0]
const loaderPath = contentScript?.js?.[0]

if (!loaderPath) throw new Error('Built manifest does not contain the DriftSense collector loader.')

const loader = await readFile(new URL(`../dist/${loaderPath}`, import.meta.url), 'utf8')
const importedAsset = loader.match(/chrome\.runtime\.getURL\(["']([^"']+)["']\)/)?.[1]

if (!importedAsset) throw new Error('Collector loader does not import a packaged content asset.')

const isExposed = (manifest.web_accessible_resources ?? []).some((entry) => {
  const hasWebMatches = entry.matches?.includes('http://*/*') && entry.matches?.includes('https://*/*')
  const hasAsset = entry.resources?.some((resource) => (
    resource === importedAsset || (resource === 'assets/*' && importedAsset.startsWith('assets/'))
  ))
  return hasWebMatches && hasAsset
})

if (!isExposed) {
  throw new Error(`Collector asset ${importedAsset} is not web-accessible on approved domains.`)
}

console.log(`Verified collector asset access: ${importedAsset}`)
