# NEAR Contract Deployment Script for Windows PowerShell
# Run this after creating the accounts

$ErrorActionPreference = "Stop"

$NETWORK = "testnet"
$PUBLISHER = "anilyagiz-publisher.testnet"
$AGENT = "anilyagiz-agent.testnet"

Write-Host "=== Deploying NEAR Contracts ===" -ForegroundColor Green
Write-Host ""

Write-Host "1. Deploying Publisher contract..." -ForegroundColor Cyan
near deploy $PUBLISHER `
  --wasmFile contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm `
  --networkId $NETWORK

Write-Host ""
Write-Host "2. Initializing Publisher..." -ForegroundColor Cyan
near call $PUBLISHER new `
  '{"verifier_contract": null}' `
  --accountId $PUBLISHER `
  --networkId $NETWORK

Write-Host ""
Write-Host "3. Deploying Agent contract..." -ForegroundColor Cyan
near deploy $AGENT `
  --wasmFile contracts/agent/target/wasm32-unknown-unknown/release/apollon_agent.wasm `
  --networkId $NETWORK

Write-Host ""
Write-Host "4. Initializing Agent..." -ForegroundColor Cyan
near call $AGENT new `
  '{"publisher_contract": "'$PUBLISHER'"}' `
  --accountId $AGENT `
  --networkId $NETWORK

Write-Host ""
Write-Host "5. Setting up contracts..." -ForegroundColor Cyan
near call $PUBLISHER add_trusted_solver `
  '{"solver": "'$AGENT'"}' `
  --accountId $PUBLISHER `
  --networkId $NETWORK

Write-Host ""
Write-Host "=== Deployment Complete! ===" -ForegroundColor Green
Write-Host ""
Write-Host "Contracts:" -ForegroundColor Yellow
Write-Host "  Publisher: $PUBLISHER"
Write-Host "  Agent:     $AGENT"
