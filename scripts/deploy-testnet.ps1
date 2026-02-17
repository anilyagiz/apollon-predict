# NEAR Testnet Contract Deployment Script for Windows PowerShell
# NOTE: Use anil31.testnet account (already logged in)

$ErrorActionPreference = "Stop"

$env:NEAR_ENV = "testnet"
$env:NEAR_RPC_URL = "https://rpc.testnet.fastnear.com"

$NETWORK = "testnet"
$MASTER_ACCOUNT = "anil31.testnet"
$PUBLISHER = "anil31-publisher.testnet"
$AGENT = "anil31-agent.testnet"

Write-Host "=== Apollon NEAR Contract Deployment ===" -ForegroundColor Green
Write-Host ""
Write-Host "Using master account: $MASTER_ACCOUNT" -ForegroundColor Yellow
Write-Host "Publisher: $PUBLISHER" -ForegroundColor Gray
Write-Host "Agent: $AGENT" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 0: Creating sub-accounts..." -ForegroundColor Cyan
Write-Host "Creating $PUBLISHER with 5 NEAR..." -ForegroundColor Gray
near create-account $PUBLISHER --masterAccount $MASTER_ACCOUNT --initialBalance 5 --networkId $NETWORK

Write-Host "Creating $AGENT with 5 NEAR..." -ForegroundColor Gray
near create-account $AGENT --masterAccount $MASTER_ACCOUNT --initialBalance 5 --networkId $NETWORK

Write-Host ""
Write-Host "Step 1/5: Deploying Publisher contract..." -ForegroundColor Cyan
near deploy $PUBLISHER --wasmFile contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm --networkId $NETWORK

Write-Host ""
Write-Host "Step 2/5: Initializing Publisher..." -ForegroundColor Cyan
near call $PUBLISHER new '{"verifier_contract": null}' --accountId $PUBLISHER --networkId $NETWORK

Write-Host ""
Write-Host "Step 3/5: Deploying Agent contract..." -ForegroundColor Cyan
near deploy $AGENT --wasmFile contracts/agent/target/wasm32-unknown-unknown/release/apollon_agent.wasm --networkId $NETWORK

Write-Host ""
Write-Host "Step 4/5: Initializing Agent..." -ForegroundColor Cyan
$agentInit = '{"publisher_contract": "' + $PUBLISHER + '"}'
near call $AGENT new $agentInit --accountId $AGENT --networkId $NETWORK

Write-Host ""
Write-Host "Step 5/5: Adding Agent as trusted solver..." -ForegroundColor Cyan
$solverArg = '{"solver": "' + $AGENT + '"}'
near call $PUBLISHER add_trusted_solver $solverArg --accountId $PUBLISHER --networkId $NETWORK

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Contract Addresses:" -ForegroundColor Yellow
Write-Host "  Publisher: $PUBLISHER" -ForegroundColor White
Write-Host "  Agent:     $AGENT" -ForegroundColor White
