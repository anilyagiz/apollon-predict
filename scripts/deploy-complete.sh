#!/bin/bash

# =============================================================================
# Apollon Oracle - Contract Deployment Guide
# =============================================================================

set -e

echo "=== Apollon Oracle Contract Deployment ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# Configuration
# =============================================================================
NETWORK="testnet"
PUBLISHER_CONTRACT="apollon-publisher.testnet"
VERIFIER_CONTRACT="apollon-verifier.testnet"
AGENT_CONTRACT="apollon-agent.testnet"

# =============================================================================
# Check Prerequisites
# =============================================================================

echo -e "${YELLOW}Checking prerequisites...${NC}"

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}Rust not found. Installing...${NC}"
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    source $HOME/.cargo/env
fi

# Check wasm target
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo -e "${YELLOW}Installing wasm32-unknown-unknown target...${NC}"
    rustup target add wasm32-unknown-unknown
fi

# Check NEAR CLI
if ! command -v near &> /dev/null; then
    echo -e "${RED}NEAR CLI not found. Installing...${NC}"
    npm install -g near-cli
fi

echo -e "${GREEN}✓ Prerequisites check complete${NC}"
echo ""

# =============================================================================
# NEAR Account Setup
# =============================================================================

echo -e "${YELLOW}NEAR Account Setup${NC}"
echo ""
echo "You need 3 NEAR testnet accounts:"
echo "  1. Publisher Contract: $PUBLISHER_CONTRACT"
echo "  2. Verifier Contract:  $VERIFIER_CONTRACT"
echo "  3. Agent Contract:     $AGENT_CONTRACT"
echo ""
echo "Create accounts at: https://testnet.mynearwallet.com/create"
echo ""
read -p "Have you created all accounts? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Please create the accounts first, then run this script again.${NC}"
    exit 1
fi

# Login to NEAR
echo -e "${YELLOW}Logging in to NEAR...${NC}"
near login

# =============================================================================
# Build Contracts
# =============================================================================

echo ""
echo -e "${YELLOW}Building contracts...${NC}"

# Build Verifier
echo "Building verifier contract..."
cd contracts/verifier
cargo build --release --target wasm32-unknown-unknown
cd ../..

# Build Publisher
echo "Building publisher contract..."
cd contracts/publisher
cargo build --release --target wasm32-unknown-unknown
cd ../..

# Build Agent
echo "Building agent contract..."
cd contracts/agent
cargo build --release --target wasm32-unknown-unknown
cd ../..

echo -e "${GREEN}✓ Contracts built successfully${NC}"

# =============================================================================
# Deploy Contracts
# =============================================================================

echo ""
echo -e "${YELLOW}Deploying contracts...${NC}"

# Deploy Verifier
echo ""
echo "1. Deploying Verifier contract..."
near deploy $VERIFIER_CONTRACT \
  --wasmFile contracts/verifier/target/wasm32-unknown-unknown/release/verifier.wasm \
  --networkId $NETWORK

# Initialize Verifier
echo "2. Initializing Verifier contract..."
near call $VERIFIER_CONTRACT new \
  --accountId $VERIFIER_CONTRACT \
  --networkId $NETWORK

# Deploy Publisher
echo ""
echo "3. Deploying Publisher contract..."
near deploy $PUBLISHER_CONTRACT \
  --wasmFile contracts/publisher/target/wasm32-unknown-unknown/release/apollon_publisher.wasm \
  --networkId $NETWORK

# Initialize Publisher
echo "4. Initializing Publisher contract..."
near call $PUBLISHER_CONTRACT new \
  '{"verifier_contract": "'$VERIFIER_CONTRACT'"}' \
  --accountId $PUBLISHER_CONTRACT \
  --networkId $NETWORK

# Deploy Agent
echo ""
echo "5. Deploying Agent contract..."
near deploy $AGENT_CONTRACT \
  --wasmFile contracts/agent/target/wasm32-unknown-unknown/release/apollon_agent.wasm \
  --networkId $NETWORK

# Initialize Agent
echo "6. Initializing Agent contract..."
near call $AGENT_CONTRACT new \
  '{"publisher_contract": "'$PUBLISHER_CONTRACT'"}' \
  --accountId $AGENT_CONTRACT \
  --networkId $NETWORK

# =============================================================================
# Configure Contracts
# =============================================================================

echo ""
echo -e "${YELLOW}Configuring contracts...${NC}"

# Set verifier in publisher
echo "Setting verifier contract in publisher..."
near call $PUBLISHER_CONTRACT set_verifier_contract \
  '{"verifier": "'$VERIFIER_CONTRACT'"}' \
  --accountId $PUBLISHER_CONTRACT \
  --networkId $NETWORK

# Add agent as trusted solver
echo "Adding agent as trusted solver..."
near call $PUBLISHER_CONTRACT add_trusted_solver \
  '{"solver": "'$AGENT_CONTRACT'"}' \
  --accountId $PUBLISHER_CONTRACT \
  --networkId $NETWORK

echo ""
echo -e "${GREEN}✓ Deployment complete!${NC}"
echo ""
echo "Contract Addresses:"
echo "  Publisher: $PUBLISHER_CONTRACT"
echo "  Verifier:  $VERIFIER_CONTRACT"
echo "  Agent:     $AGENT_CONTRACT"
echo ""
echo "Next steps:"
echo "  1. Update .env file with these contract addresses"
echo "  2. Restart Docker containers: docker compose up -d --build"
echo "  3. Test prediction request flow"

# =============================================================================
# Update .env file
# =============================================================================

echo ""
echo -e "${YELLOW}Updating .env file...${NC}"

# Update contract addresses in .env
sed -i "s/NEAR_PUBLISHER_CONTRACT=.*/NEAR_PUBLISHER_CONTRACT=$PUBLISHER_CONTRACT/" .env
sed -i "s/NEAR_VERIFIER_CONTRACT=.*/NEAR_VERIFIER_CONTRACT=$VERIFIER_CONTRACT/" .env
sed -i "s/NEXT_PUBLIC_PUBLISHER_CONTRACT=.*/NEXT_PUBLIC_PUBLISHER_CONTRACT=$PUBLISHER_CONTRACT/" .env
sed -i "s/NEXT_PUBLIC_VERIFIER_CONTRACT=.*/NEXT_PUBLIC_VERIFIER_CONTRACT=$VERIFIER_CONTRACT/" .env

echo -e "${GREEN}✓ .env file updated${NC}"
