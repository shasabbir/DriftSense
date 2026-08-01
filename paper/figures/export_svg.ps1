$ErrorActionPreference = 'Stop'

$browserCandidates = @(
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
)

$browser = $browserCandidates |
  Where-Object { Test-Path -LiteralPath $_ } |
  Select-Object -First 1

if (-not $browser) {
  throw 'Chrome or Edge is required to export the SVG figures to vector PDF.'
}

$figureDirectory = $PSScriptRoot
$figureNames = @(
  'driftsense-architecture',
  'driftsense-labeling',
  'driftsense-study-design'
)

foreach ($figureName in $figureNames) {
  $svgPath = Join-Path $figureDirectory "$figureName.svg"
  $pdfPath = Join-Path $figureDirectory "$figureName.pdf"

  if (-not (Test-Path -LiteralPath $svgPath)) {
    throw "Missing SVG source: $svgPath"
  }

  $svgUri = [System.Uri]::new($svgPath).AbsoluteUri
  & $browser `
    --headless=new `
    --disable-gpu `
    --no-pdf-header-footer `
    --print-to-pdf="$pdfPath" `
    $svgUri | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Figure export failed: $figureName"
  }

  Write-Host "Exported $figureName.pdf"
}
