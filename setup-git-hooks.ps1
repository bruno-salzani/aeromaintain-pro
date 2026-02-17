Write-Host "Configuring Git hooks path to .githooks..."
git config core.hooksPath .githooks
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to configure Git hooks. Ensure this directory is a Git repository."
  exit $LASTEXITCODE
}
Write-Host "Git hooks configured. Pre-push hook will run local CI."
