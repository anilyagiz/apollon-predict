#!/bin/bash
set -e

echo "=== Apollon Contract Build & Deploy ==="
echo ""

# Configuration
NETWORK="testnet"
PUBLISHER="anilyagiz-publisher.testnet"
VERIFIER="anilyagiz-verifier.testnet"
AGENT="anilyagiz-agent.testnet"

echo "Building contracts..."

# Build Publisher
echo "1. Building publisher..."
cd /contracts/publisher
cargo build --release --target wasm32-unknown-unknown 2>&1 || {
    echo "Error: Failed to build publisher contract"
    exit 1
}

# Build Verifier
echo "2. Building verifier..."
cd /contracts/verifier
cargo build --release --target wasm32-unknown-unknown 2>&1 || {
    echo "Error: Failed to build verifier contract"
    exit 1
}

# Build Agent
echo "3. Building agent..."
cd /contracts/agent
cargo build --release --target wasm32-unknown-unknown 2>&1 || {
    echo "Error: Failed to build agent contract"
    exit 1
}

echo ""
echo "✓ All contracts built successfully!"
echo ""
echo "Contract WASM files:"
echo "  Publisher: /contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm"
echo "  Verifier:  /contracts/verifier/target/wasm32-unknown-unknown/release/verifier.wasm"
echo "  Agent:     /contracts/agent/target/wasm32-unknown-unknown/release/apollon_agent.wasm"
echo ""
echo "Next: Deploy to NEAR testnet"
echo "  near deploy $PUBLISHER --wasmFile /contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm --networkId $NETWORK"
