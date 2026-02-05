#!/bin/bash
set -e

echo "=== Apollon Oracle Testnet Deployment Script ==="
echo ""

# Configuration
NETWORK="testnet"
PUBLISHER_CONTRACT="apollon-publisher.testnet"
VERIFIER_CONTRACT="apollon-verifier.testnet"

echo "Step 1: Building contracts..."
cd contracts/verifier
cargo build --release --target wasm32-unknown-unknown
cd ../publisher
cargo build --release --target wasm32-unknown-unknown
cd ../..

echo ""
echo "Step 2: Deploying Verifier contract..."
near deploy $VERIFIER_CONTRACT \
  --wasmFile contracts/verifier/target/wasm32-unknown-unknown/release/verifier.wasm \
  --networkId $NETWORK

echo ""
echo "Step 3: Initializing Verifier contract..."
near call $VERIFIER_CONTRACT new \
  --accountId $VERIFIER_CONTRACT \
  --networkId $NETWORK

echo ""
echo "Step 4: Deploying Publisher contract..."
near deploy $PUBLISHER_CONTRACT \
  --wasmFile contracts/publisher/target/wasm32-unknown-unknown/release/publisher.wasm \
  --networkId $NETWORK

echo ""
echo "Step 5: Initializing Publisher contract..."
near call $PUBLISHER_CONTRACT new \
  '{"verifier_contract": "'$VERIFIER_CONTRACT'"}' \
  --accountId $PUBLISHER_CONTRACT \
  --networkId $NETWORK

echo ""
echo "Step 6: Setting up Publisher with Verifier..."
near call $PUBLISHER_CONTRACT set_verifier_contract \
  '{"verifier": "'$VERIFIER_CONTRACT'"}' \
  --accountId $PUBLISHER_CONTRACT \
  --networkId $NETWORK

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Contract Addresses:"
echo "  Publisher: $PUBLISHER_CONTRACT"
echo "  Verifier:  $VERIFIER_CONTRACT"
echo ""
echo "Next steps:"
echo "  1. Update SDK config with contract addresses"
echo "  2. Run integration tests"
echo "  3. Test prediction request flow"
