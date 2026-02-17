#!/bin/bash
set -e

NETWORK="testnet"
PUBLISHER="anilyagiz-publisher.testnet"
AGENT="anilyagiz-agent.testnet"

echo "=== Deploying NEAR Contracts ==="
echo ""

echo "1. Deploying Publisher contract..."
near deploy $PUBLISHER \
  --wasmFile contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm \
  --networkId $NETWORK

echo ""
echo "2. Initializing Publisher..."
near call $PUBLISHER new \
  '{"verifier_contract": null}' \
  --accountId $PUBLISHER \
  --networkId $NETWORK

echo ""
echo "3. Deploying Agent contract..."
near deploy $AGENT \
  --wasmFile contracts/agent/target/wasm32-unknown-unknown/release/apollon_agent.wasm \
  --networkId $NETWORK

echo ""
echo "4. Initializing Agent..."
near call $AGENT new \
  '{"publisher_contract": "'$PUBLISHER'"}' \
  --accountId $AGENT \
  --networkId $NETWORK

echo ""
echo "5. Setting up contracts..."
near call $PUBLISHER add_trusted_solver \
  '{"solver": "'$AGENT'"}' \
  --accountId $PUBLISHER \
  --networkId $NETWORK

echo ""
echo "=== Deployment Complete! ==="
echo ""
echo "Contracts:"
echo "  Publisher: $PUBLISHER"
echo "  Agent:     $AGENT"
