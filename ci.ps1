Param(
  [switch]$ServerOnly,
  [switch]$ClientOnly
)

function Run-Step($path, $script) {
  Push-Location $path
  try {
    Write-Host "Running $script in $path..."
    npm run $script -s
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }
  } finally {
    Pop-Location
  }
}

if ($ClientOnly -and $ServerOnly) {
  Write-Host "Choose either -ClientOnly or -ServerOnly, not both."
  exit 1
}

if (-not $ClientOnly) {
  Run-Step "server" "ci"
}

if (-not $ServerOnly) {
  Run-Step "client" "ci"
}

Write-Host "Local CI completed successfully."
