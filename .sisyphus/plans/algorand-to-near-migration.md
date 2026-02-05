# Work Plan: Apollon ZK Oracle Migration - Algorand to NEAR Intents

## TL;DR

> **Quick Summary**: Migrate Apollon ZK Oracle from Algorand to NEAR Protocol using NEAR Intents architecture. Implement on-chain ZK verification (Groth16), update TypeScript and Python SDKs, and integrate NEAR Wallet Selector.
>
> **Deliverables**:
> - NEAR Intents publisher contract (Rust)
> - ZK Verifier contract with Groth16 on-chain verification
> - Updated TypeScript SDK with NEAR Intents support
> - Updated Python SDK with near-api-py integration
> - Frontend with NEAR Wallet Selector
> - Testnet deployment and validation
>
> **Estimated Effort**: Large (3-4 months)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Week 1 Validation → Core Contracts → SDK Migration → Frontend → Testnet

---

## Context

### Original Request
Migrate Apollon ZK Oracle (ML-based price prediction with ZK privacy) from Algorand blockchain to NEAR Protocol using NEAR Intents.

### Interview Summary
**Key Decisions**:
- **Strategy**: NEAR Intents (intent-based architecture)
- **ZK Verification**: On-chain Groth16 verification in NEAR contract
- **Timeline**: 3-4 months, balanced approach
- **SDK Priority**: TypeScript SDK first, then Python
- **Cross-chain**: NEAR-only (not multi-chain)
- **Testing**: Hybrid (local sandbox + NEAR testnet)

**Research Findings**:
- NEAR Intents: Intent-based transaction protocol with solvers, 1.3s finality
- Current project: TEAL contracts, Circom ZK, Python ML ensemble
- Migration requires: Rust contracts, intents-sdk, wallet selector

### Metis Review
**Identified Gaps** (addressed in plan):
- **Week 1 Critical Validation**: ZK gas costs, custom intent support
- **Solver Model**: Single trusted solver for v1 (not decentralized)
- **Scope Lock**: No multi-chain, no new ML models, no DAO
- **Risk Mitigation**: Fallback to traditional contracts if Intents fails

---

## Work Objectives

### Core Objective
Build a NEAR Intents-based oracle system that allows users to request ZK-verified price predictions through intent submission, with on-chain proof verification.

### Concrete Deliverables
1. **Intent Publisher Contract** (`apollon-intents.near`)
   - Accept prediction requests as intents
   - Interface with NEAR Intents Verifier (`intents.near`)
   - Manage deposits and solver payments

2. **ZK Verifier Contract** (`apollon-verifier.near`)
   - Groth16 verification on-chain (Rust/arkworks)
   - Verify snarkjs-generated proofs
   - Gas-optimized verification (< 50 TGas)

3. **TypeScript SDK** (`@apollon/near-sdk`)
   - NEAR Intents integration (@defuse-protocol/intents-sdk)
   - Intent submission and monitoring
   - Wallet connection (NEAR Wallet Selector)

4. **Python SDK** (`apollon-near-sdk`)
   - near-api-py integration
   - Intent formatting for NEAR Intents
   - Async/sync client interfaces

5. **Frontend Updates**
   - NEAR Wallet Selector integration
   - Intent submission UI
   - ZK verification status display

6. **Testing Infrastructure**
   - Local NEAR sandbox setup
   - Testnet deployment scripts
   - End-to-end integration tests

### Definition of Done
- [ ] All contracts deployed to NEAR testnet
- [ ] TypeScript SDK published to npm
- [ ] Python SDK published to PyPI
- [ ] Frontend builds successfully with NEAR integration
- [ ] End-to-end test passes: Intent → Solver → ZK Proof → Verification

### Must Have
- On-chain ZK verification working
- Intent submission via TypeScript SDK
- NEAR Wallet Selector integration
- Testnet deployment

### Must NOT Have (Guardrails)
- Multi-chain support (Ethereum, Solana, etc.)
- New ML models or model modifications
- Mobile SDK (iOS/Android)
- DAO governance
- Mainnet deployment (v1 scope)

---

## Verification Strategy (MANDATORY)

> **UNIVERSAL RULE: ZERO HUMAN INTERVENTION**
>
> ALL tasks in this plan MUST be verifiable WITHOUT any human action.
> Every criterion MUST be verifiable by running a command or using a tool.

### Test Decision
- **Infrastructure exists**: NO (need to set up NEAR testing)
- **Automated tests**: TDD for contracts, Integration tests for SDKs
- **Framework**: near-workspaces-rs (contracts), vitest (TypeScript), pytest (Python)

### Test Setup Tasks
- [ ] 0.1 Setup NEAR Testing Infrastructure
  - Install: `cargo install cargo-near near-cli-rs`
  - Create testnet accounts: `near create-account apollon-test.testnet`
  - Setup local sandbox: `near-sandbox`
  - Verify: `near state apollon-test.testnet` → shows account info

### Agent-Executed QA Scenarios (MANDATORY)

**Contract Verification Pattern:**
```bash
# Deploy contract
near deploy apollon-verifier.testnet --wasmFile target/wasm32-unknown-unknown/release/apollon_verifier.wasm
# Verify: Transaction succeeds, contract code hash returned

# Test contract method
near call apollon-verifier.testnet verify_proof '{"proof": {...}}' --accountId test.testnet --gas 50000000000000
# Verify: Returns true, gas burned < 50 TGas
```

**SDK Verification Pattern:**
```bash
cd sdk/typescript && npm test
# Verify: All tests pass, including NEAR mock tests

cd sdk/python && pytest tests/test_near_integration.py -v
# Verify: All integration tests pass
```

**Frontend Verification Pattern (Playwright):**
```
Scenario: User connects NEAR wallet and submits prediction intent
  Tool: Playwright
  Preconditions: Frontend running on localhost:3000, testnet wallet available
  Steps:
    1. Navigate to http://localhost:3000
    2. Click "Connect Wallet" button
    3. Select "MyNearWallet" from selector
    4. Approve connection in wallet popup
    5. Click "Request Prediction" button
    6. Fill asset: "NEAR", timeframe: "24h"
    7. Click "Submit Intent"
    8. Wait for intent submission confirmation
    9. Assert: Intent hash displayed
    10. Screenshot: .sisyphus/evidence/intent-submission.png
  Expected Result: Intent submitted successfully, hash visible
```

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Week 1 - Critical Validation):
├── Task 1: Validate ZK verification gas costs
├── Task 2: Validate NEAR Intents custom intent support
└── Task 3: Test snarkjs → Rust proof compatibility

Wave 2 (Week 2-6 - Core Contracts):
├── Task 4: Build ZK Verifier contract (depends: 1)
├── Task 5: Build Intent Publisher contract (depends: 2)
└── Task 6: Integrate with intents-sdk (depends: 2, 5)

Wave 3 (Week 7-10 - SDK Migration):
├── Task 7: Update TypeScript SDK (depends: 5, 6)
└── Task 8: Update Python SDK (depends: 5, 6)

Wave 4 (Week 11-14 - Frontend & Testing):
├── Task 9: Frontend wallet integration (depends: 7)
├── Task 10: Testnet deployment (depends: 4, 5, 7, 8)
└── Task 11: End-to-end testing (depends: 9, 10)

Wave 5 (Week 15-16 - Polish):
└── Task 12: Documentation and final polish (depends: 11)

Critical Path: 1 → 2 → 5 → 6 → 7 → 9 → 10 → 11 → 12
Parallel Speedup: ~35% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 4 | 2, 3 |
| 2 | None | 5, 6 | 1, 3 |
| 3 | None | 4, 5 | 1, 2 |
| 4 | 1, 3 | 10 | None |
| 5 | 2 | 6, 7, 8 | None |
| 6 | 2, 5 | 7, 8 | None |
| 7 | 5, 6 | 9, 10 | 8 |
| 8 | 5, 6 | 10 | 7 |
| 9 | 7 | 11 | 10 |
| 10 | 4, 5, 7, 8 | 11 | 9 |
| 11 | 9, 10 | 12 | None |
| 12 | 11 | None | None |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1, 2, 3 | delegate_task(category="ultrabrain", load_skills=["rust-async-patterns"], run_in_background=true) |
| 2 | 4, 5, 6 | delegate_task(category="deep", load_skills=["rust-async-patterns"], run_in_background=false) |
| 3 | 7, 8 | delegate_task(category="quick", load_skills=["typescript", "react-dev"], run_in_background=false) |
| 4 | 9, 10, 11 | delegate_task(category="visual-engineering", load_skills=["frontend-ui-ux", "e2e-testing-patterns"], run_in_background=false) |
| 5 | 12 | delegate_task(category="writing", load_skills=[], run_in_background=false) |

---

## TODOs

### Task 1: Validate ZK Verification Gas Costs

**What to do**:
- [ ] Create minimal Groth16 verifier in Rust using arkworks
- [ ] Compile to WASM for NEAR
- [ ] Deploy to testnet
- [ ] Measure gas costs for proof verification
- [ ] Document findings

**Must NOT do**:
- Implement full verification logic (just prototype)
- Optimize for production (measure first)
- Test with real prediction data (use dummy proofs)

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: [`rust-async-patterns`]
  - ZK cryptography domain overlap
  - Rust async patterns for blockchain
- **Skills Evaluated but Omitted**:
  - `typescript`: Not needed for Rust contract work
  - `react-dev`: Not needed for backend contract

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 4
- **Blocked By**: None

**References**:
- `backend/zk-privacy/circuits/prediction_verification.circom:1-50` - Current circuit structure
- `backend/zk-privacy/proof_generator.js:1-100` - snarkjs proof generation
- https://github.com/arkworks-rs/groth16 - arkworks Groth16 implementation
- https://docs.near.org/sdk/rust/introduction - NEAR Rust SDK docs

**Acceptance Criteria**:

**If TDD:**
- [ ] Test file created: `contracts/verifier/tests/gas_estimation.rs`
- [ ] Test: deploy verifier, call verify with dummy proof
- [ ] `cargo test --package verifier -- gas_estimation` → PASS

**Agent-Executed QA Scenarios:**

```
Scenario: Deploy minimal ZK verifier and measure gas
  Tool: Bash (near CLI)
  Preconditions: NEAR testnet account, Rust toolchain
  Steps:
    1. cd contracts/verifier && cargo near build
    2. near deploy apollon-zk-test.testnet --wasmFile target/wasm32-unknown-unknown/release/verifier.wasm
    3. near call apollon-zk-test.testnet verify_dummy --accountId test.testnet --gas 100000000000000
    4. Capture gas_used from transaction receipt
    5. Assert: gas_used < 50000000000000 (50 TGas)
    6. Save result to .sisyphus/evidence/task1-gas-measurement.txt
  Expected Result: Verification succeeds with gas < 50 TGas
  Evidence: .sisyphus/evidence/task1-gas-measurement.txt

Scenario: Verify snarkjs proof format compatibility
  Tool: Bash (Node.js + Rust)
  Preconditions: snarkjs installed, Rust verifier compiled
  Steps:
    1. cd backend/zk-privacy && node proof_generator.js --dummy
    2. Copy proof.json to contracts/verifier/tests/
    3. cd contracts/verifier && cargo test test_snarkjs_proof_parsing
    4. Assert: Test passes (proof format compatible)
  Expected Result: snarkjs proof can be parsed by Rust verifier
  Evidence: Test output in terminal
```

**Commit**: YES
- Message: `feat(contracts): prototype ZK verifier and measure gas`
- Files: `contracts/verifier/src/lib.rs`, `contracts/verifier/tests/gas_estimation.rs`
- Pre-commit: `cargo test`

---

### Task 2: Validate NEAR Intents Custom Intent Support

**What to do**:
- [ ] Clone near/intents repository
- [ ] Study intent types and verifier contract
- [ ] Prototype custom oracle prediction intent
- [ ] Test intent submission to solver relay
- [ ] Document intent structure

**Must NOT do**:
- Build full publisher contract (just research)
- Submit real intents (use testnet/dev)
- Modify near/intents code

**Recommended Agent Profile**:
- **Category**: `deep`
- **Skills**: [`rust-async-patterns`]
  - NEAR contract patterns
  - Intent architecture understanding
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 5, 6
- **Blocked By**: None

**References**:
- https://github.com/near/intents - Official NEAR Intents contracts
- https://docs.near-intents.org/near-intents/market-makers/verifier/intent-types-and-execution - Intent types
- https://github.com/near-examples/near-intents-examples - Examples

**Acceptance Criteria**:

```
Scenario: Analyze NEAR Intents contract for custom intent support
  Tool: Bash (code analysis)
  Preconditions: near/intents repo cloned
  Steps:
    1. git clone https://github.com/near/intents.git /tmp/near-intents
    2. grep -r "intent" /tmp/near-intents/contracts/ --include="*.rs" | head -50
    3. Analyze intent enum definitions
    4. Document supported intent types in .sisyphus/evidence/task2-intent-types.md
    5. Assert: Custom intent types can be added OR fallback needed
  Expected Result: Clear understanding of intent extensibility
  Evidence: .sisyphus/evidence/task2-intent-types.md

Scenario: Test solver relay connection
  Tool: Bash (curl)
  Preconditions: None
  Steps:
    1. curl -X POST https://solver-relay-v2.chaindefuser.com/rpc \
         -H "Content-Type: application/json" \
         -d '{"jsonrpc":"2.0","id":1,"method":"get_status"}'
    2. Assert: Returns valid JSON response
    3. Save response to .sisyphus/evidence/task2-relay-status.json
  Expected Result: Solver relay accessible
  Evidence: .sisyphus/evidence/task2-relay-status.json
```

**Commit**: NO (research task)

---

### Task 3: Test snarkjs → Rust Proof Compatibility

**What to do**:
- [ ] Generate dummy proof with snarkjs
- [ ] Parse proof JSON in Rust
- [ ] Verify proof components (pi_a, pi_b, pi_c)
- [ ] Document serialization format
- [ ] Test with real prediction circuit

**Must NOT do**:
- Implement full verifier (just compatibility test)
- Modify snarkjs circuits
- Test with invalid proofs

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: [`rust-async-patterns`]
  - ZK cryptography
  - JSON serialization
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 1
- **Blocks**: Task 4, 5
- **Blocked By**: None

**References**:
- `backend/zk-privacy/proof_generator.js` - snarkjs proof generation
- `backend/zk-privacy/circuits/prediction_verification.circom` - Circuit definition
- https://docs.rs/ark-groth16/latest/ark_groth16/ - arkworks Groth16

**Acceptance Criteria**:

```
Scenario: Parse snarkjs proof in Rust
  Tool: Bash (Node.js + Rust)
  Preconditions: snarkjs, Rust installed
  Steps:
    1. cd backend/zk-privacy && node -e "const snarkjs = require('snarkjs'); console.log(JSON.stringify(require('./proof.json')))" > /tmp/proof.json
    2. cd contracts/verifier && cargo test test_proof_parsing -- --nocapture
    3. Assert: Test outputs "Proof parsed successfully"
    4. Save test output to .sisyphus/evidence/task3-proof-parsing.txt
  Expected Result: snarkjs proof JSON parses correctly in Rust
  Evidence: .sisyphus/evidence/task3-proof-parsing.txt

Scenario: Verify proof structure matches
  Tool: Bash
  Preconditions: proof.json exists
  Steps:
    1. jq '.pi_a, .pi_b, .pi_c, .publicSignals' backend/zk-privacy/proof.json
    2. Compare with Rust struct definitions
    3. Assert: Field names and types match
    4. Document any discrepancies
  Expected Result: 1:1 mapping between snarkjs and Rust
  Evidence: Documentation in code comments
```

**Commit**: YES
- Message: `test(contracts): verify snarkjs to Rust proof compatibility`
- Files: `contracts/verifier/src/proof_parser.rs`, `contracts/verifier/tests/compatibility.rs`

---

### Task 4: Build ZK Verifier Contract

**What to do**:
- [ ] Implement Groth16 verifier in Rust (arkworks)
- [ ] Parse snarkjs proof format
- [ ] Verify proof on-chain
- [ ] Optimize for gas (< 50 TGas)
- [ ] Unit tests

**Must NOT do**:
- Implement full ML ensemble on-chain (off-chain only)
- Support multiple ZK systems (Groth16 only)
- Verify training data (out of scope)

**Recommended Agent Profile**:
- **Category**: `ultrabrain`
- **Skills**: [`rust-async-patterns`]
  - Critical ZK implementation
  - Gas optimization
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 10
- **Blocked By**: Task 1, 3

**References**:
- Task 1 and 3 results
- https://github.com/arkworks-rs/groth16
- https://docs.near.org/sdk/rust/introduction

**Acceptance Criteria**:

```
Scenario: Deploy and test ZK verifier contract
  Tool: Bash (near CLI)
  Preconditions: Task 1, 3 completed, testnet account
  Steps:
    1. cd contracts/verifier && cargo near build --release
    2. near deploy apollon-verifier.testnet --wasmFile target/wasm32-unknown-unknown/release/verifier.wasm
    3. near call apollon-verifier.testnet verify_proof \
         '{"proof": {"pi_a": [...], "pi_b": [...], "pi_c": [...]}, "public_signals": ["542000"]}' \
         --accountId test.testnet --gas 50000000000000
    4. Assert: Returns "true"
    5. Assert: Gas used < 50 TGas (from transaction receipt)
    6. Screenshot: .sisyphus/evidence/task4-verifier-deploy.png
  Expected Result: Contract deployed, verification works, gas < 50 TGas
  Evidence: .sisyphus/evidence/task4-verifier-deploy.png

Scenario: Test invalid proof rejection
  Tool: Bash
  Preconditions: Contract deployed
  Steps:
    1. near call apollon-verifier.testnet verify_proof \
         '{"proof": {"pi_a": ["0", "0"], "pi_b": [["0", "0"], ["0", "0"]], "pi_c": ["0", "0"]}, "public_signals": ["0"]}' \
         --accountId test.testnet --gas 50000000000000
    2. Assert: Returns "false"
    3. Save transaction hash
  Expected Result: Invalid proof correctly rejected
  Evidence: Transaction hash in .sisyphus/evidence/task4-invalid-proof.txt
```

**Commit**: YES
- Message: `feat(contracts): implement Groth16 ZK verifier`
- Files: `contracts/verifier/src/lib.rs`, `contracts/verifier/src/verifier.rs`
- Pre-commit: `cargo test --package verifier`

---

### Task 5: Build Intent Publisher Contract

**What to do**:
- [ ] Define oracle prediction intent structure
- [ ] Implement intent submission
- [ ] Integrate with intents.near Verifier contract
- [ ] Handle deposits and payments
- [ ] Unit tests

**Must NOT do**:
- Implement solver logic (separate component)
- Support multiple intent types (oracle only)
- Add DAO governance

**Recommended Agent Profile**:
- **Category**: `deep`
- **Skills**: [`rust-async-patterns`]
  - NEAR contract development
  - Cross-contract calls
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 6, 7, 8
- **Blocked By**: Task 2

**References**:
- Task 2 results
- https://github.com/near/intents - Reference implementation
- https://docs.near.org/sdk/rust/cross-contract/callbacks

**Acceptance Criteria**:

```
Scenario: Deploy intent publisher contract
  Tool: Bash (near CLI)
  Preconditions: Task 2 completed, testnet account
  Steps:
    1. cd contracts/publisher && cargo near build --release
    2. near deploy apollon-publisher.testnet --wasmFile target/wasm32-unknown-unknown/release/publisher.wasm
    3. near call apollon-publisher.testnet new --accountId apollon-publisher.testnet
    4. Assert: Contract initialized successfully
    5. Screenshot: .sisyphus/evidence/task5-publisher-deploy.png
  Expected Result: Publisher contract deployed and initialized
  Evidence: .sisyphus/evidence/task5-publisher-deploy.png

Scenario: Submit prediction intent
  Tool: Bash
  Preconditions: Contract deployed, user has testnet NEAR
  Steps:
    1. near call apollon-publisher.testnet request_prediction \
         '{"asset": "NEAR", "timeframe": "24h", "zk_required": true}' \
         --accountId user.testnet --deposit 0.1
    2. Assert: Transaction succeeds
    3. near view apollon-publisher.testnet get_intents --accountId user.testnet
    4. Assert: Returns intent with status "Pending"
  Expected Result: Intent submitted and stored
  Evidence: Intent ID logged in terminal
```

**Commit**: YES
- Message: `feat(contracts): implement intent publisher for oracle`
- Files: `contracts/publisher/src/lib.rs`
- Pre-commit: `cargo test --package publisher`

---

### Task 6: Integrate with intents-sdk

**What to do**:
- [ ] Install @defuse-protocol/intents-sdk
- [ ] Implement intent formatting
- [ ] Connect to solver relay
- [ ] Handle intent lifecycle
- [ ] Integration tests

**Must NOT do**:
- Implement solver (just client integration)
- Support all intent types (oracle only)
- Handle solver competition logic

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`typescript`, `native-data-fetching`]
  - TypeScript SDK work
  - API integration
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 2
- **Blocks**: Task 7, 8
- **Blocked By**: Task 2, 5

**References**:
- https://github.com/near/intents-sdk
- https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api
- Task 5 results

**Acceptance Criteria**:

```
Scenario: Connect to solver relay
  Tool: Bash (Node.js)
  Preconditions: intents-sdk installed
  Steps:
    1. cd sdk/typescript && npm install @defuse-protocol/intents-sdk
    2. node -e "const { IntentsSDK } = require('@defuse-protocol/intents-sdk'); console.log('SDK loaded')"
    3. Assert: No errors
    4. Test connection to solver-relay-v2.chaindefuser.com
    5. Save connection test to .sisyphus/evidence/task6-sdk-connection.txt
  Expected Result: SDK connects to solver relay
  Evidence: .sisyphus/evidence/task6-sdk-connection.txt

Scenario: Format oracle intent
  Tool: Bash (Node.js)
  Preconditions: SDK installed
  Steps:
    1. node sdk/typescript/test-intent-formatting.js
    2. Assert: Intent JSON matches NEAR Intents schema
    3. Assert: Contains asset, timeframe, zk_required fields
    4. Save formatted intent to .sisyphus/evidence/task6-formatted-intent.json
  Expected Result: Oracle intent correctly formatted
  Evidence: .sisyphus/evidence/task6-formatted-intent.json
```

**Commit**: YES
- Message: `feat(sdk): integrate intents-sdk for oracle`
- Files: `sdk/typescript/src/intents/client.ts`
- Pre-commit: `npm test`

---

### Task 7: Update TypeScript SDK

**What to do**:
- [ ] Update SDK architecture for NEAR
- [ ] Implement NEAR Wallet Selector integration
- [ ] Add intent submission methods
- [ ] Add ZK verification methods
- [ ] Unit and integration tests

**Must NOT do**:
- Support Algorand (remove old code)
- Add new features beyond migration
- Change public API (backward compatible)

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`typescript`, `react-dev`, `native-data-fetching`]
  - TypeScript SDK development
  - React integration patterns
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 9, 10
- **Blocked By**: Task 5, 6

**References**:
- `sdk/typescript/src/` - Existing SDK structure
- https://github.com/near/wallet-selector - Wallet selector
- Task 6 results

**Acceptance Criteria**:

```
Scenario: SDK connects to NEAR wallet
  Tool: Bash (Node.js)
  Preconditions: SDK built, testnet wallet available
  Steps:
    1. cd sdk/typescript && npm run build
    2. node -e "
         const { ApollonClient } = require('./dist/index.js');
         const client = new ApollonClient({ network: 'testnet' });
         console.log('Client created');
       "
    3. Assert: Client initializes without errors
    4. npm test -- --grep "wallet"
    5. Assert: Wallet tests pass
  Expected Result: SDK initializes and wallet tests pass
  Evidence: Test output in terminal

Scenario: Submit prediction via SDK
  Tool: Bash
  Preconditions: SDK built, wallet connected
  Steps:
    1. npm test -- --grep "submitPrediction"
    2. Assert: Test submits intent successfully
    3. Assert: Returns intent hash
    4. Save test result to .sisyphus/evidence/task7-sdk-prediction.txt
  Expected Result: Intent submitted via SDK
  Evidence: .sisyphus/evidence/task7-sdk-prediction.txt
```

**Commit**: YES
- Message: `feat(sdk): migrate TypeScript SDK to NEAR`
- Files: `sdk/typescript/src/`, `sdk/typescript/package.json`
- Pre-commit: `npm test && npm run build`

---

### Task 8: Update Python SDK

**What to do**:
- [ ] Install near-api-py
- [ ] Implement NEAR contract interactions
- [ ] Add intent formatting
- [ ] Add async/sync clients
- [ ] Unit tests

**Must NOT do**:
- Replace TypeScript SDK (complement it)
- Support Python < 3.8
- Add new features

**Recommended Agent Profile**:
- **Category**: `quick`
- **Skills**: [`native-data-fetching`]
  - Python async patterns
  - API integration
- **Skills Evaluated but Omitted**:
  - `typescript`: Not needed for Python SDK

**Parallelization**:
- **Can Run In Parallel**: YES
- **Parallel Group**: Wave 3
- **Blocks**: Task 10
- **Blocked By**: Task 5, 6

**References**:
- `sdk/python/algo_zk_oracle/` - Existing Python SDK
- https://github.com/near/near-api-py
- Task 6 results

**Acceptance Criteria**:

```
Scenario: Python SDK connects to NEAR
  Tool: Bash (Python)
  Preconditions: Python 3.8+, near-api-py installed
  Steps:
    1. cd sdk/python && pip install -e .
    2. python -c "from apollon_near_sdk import ApollonClient; print('SDK loaded')"
    3. Assert: No import errors
    4. pytest tests/test_near_connection.py -v
    5. Assert: Connection test passes
  Expected Result: Python SDK connects to NEAR
  Evidence: Test output in terminal

Scenario: Format intent in Python
  Tool: Bash
  Preconditions: SDK installed
  Steps:
    1. pytest tests/test_intent_formatting.py -v
    2. Assert: Intent formatted correctly
    3. Assert: JSON matches NEAR Intents schema
    4. Save test output to .sisyphus/evidence/task8-python-intent.txt
  Expected Result: Python SDK formats intents correctly
  Evidence: .sisyphus/evidence/task8-python-intent.txt
```

**Commit**: YES
- Message: `feat(sdk): migrate Python SDK to NEAR`
- Files: `sdk/python/apollon_near_sdk/`, `sdk/python/setup.py`
- Pre-commit: `pytest`

---

### Task 9: Frontend Wallet Integration

**What to do**:
- [ ] Install @near-wallet-selector
- [ ] Replace Algorand wallet connections
- [ ] Add intent submission UI
- [ ] Add ZK verification display
- [ ] E2E tests

**Must NOT do**:
- Redesign UI (keep existing design)
- Add new pages (update existing)
- Support mobile wallets (desktop only for v1)

**Recommended Agent Profile**:
- **Category**: `visual-engineering`
- **Skills**: [`frontend-ui-ux`, `react-dev`, `e2e-testing-patterns`]
  - React/Next.js development
  - UI component updates
  - E2E testing
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: Task 11
- **Blocked By**: Task 7

**References**:
- `frontend/algo-zk-dashboard/src/` - Existing frontend
- https://github.com/near/wallet-selector
- Task 7 results

**Acceptance Criteria**:

```
Scenario: Frontend builds with NEAR integration
  Tool: Bash
  Preconditions: Task 7 completed
  Steps:
    1. cd frontend/algo-zk-dashboard
    2. npm install
    3. npm run build
    4. Assert: Build succeeds with no NEAR-related errors
    5. Save build output to .sisyphus/evidence/task9-build.txt
  Expected Result: Production build succeeds
  Evidence: .sisyphus/evidence/task9-build.txt

Scenario: Connect wallet via NEAR Wallet Selector
  Tool: Playwright
  Preconditions: Frontend running on localhost:3000
  Steps:
    1. Navigate to http://localhost:3000
    2. Click "Connect Wallet"
    3. Wait for wallet selector modal
    4. Assert: Modal shows NEAR wallet options
    5. Select test wallet
    6. Assert: Connection succeeds
    7. Screenshot: .sisyphus/evidence/task9-wallet-connect.png
  Expected Result: Wallet connects successfully
  Evidence: .sisyphus/evidence/task9-wallet-connect.png

Scenario: Submit prediction intent from frontend
  Tool: Playwright
  Preconditions: Wallet connected
  Steps:
    1. Fill prediction form: Asset="NEAR", Timeframe="24h"
    2. Click "Request Prediction"
    3. Wait for NEAR wallet approval popup
    4. Approve transaction
    5. Wait for confirmation
    6. Assert: Intent hash displayed
    7. Screenshot: .sisyphus/evidence/task9-intent-submit.png
  Expected Result: Intent submitted from frontend
  Evidence: .sisyphus/evidence/task9-intent-submit.png
```

**Commit**: YES
- Message: `feat(frontend): integrate NEAR Wallet Selector`
- Files: `frontend/algo-zk-dashboard/src/components/WalletConnect.tsx`, `frontend/algo-zk-dashboard/src/app/page.tsx`
- Pre-commit: `npm run build && npm run test:e2e`

---

### Task 10: Testnet Deployment

**What to do**:
- [ ] Deploy all contracts to testnet
- [ ] Configure contract addresses
- [ ] Fund test accounts
- [ ] Integration tests
- [ ] Document deployment

**Must NOT do**:
- Deploy to mainnet (testnet only)
- Use real funds
- Skip testing

**Recommended Agent Profile**:
- **Category**: `deep`
- **Skills**: [`ci-cd-pipeline-builder`]
  - Deployment automation
  - Infrastructure
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: Task 11
- **Blocked By**: Task 4, 5, 7, 8

**References**:
- Task 4, 5 results
- https://docs.near.org/tools/near-cli

**Acceptance Criteria**:

```
Scenario: Deploy all contracts to testnet
  Tool: Bash (near CLI)
  Preconditions: All contracts built, testnet accounts ready
  Steps:
    1. ./scripts/deploy-testnet.sh
    2. Assert: ZK Verifier deployed to apollon-verifier.testnet
    3. Assert: Intent Publisher deployed to apollon-publisher.testnet
    4. near view apollon-verifier.testnet get_version
    5. Assert: Returns version number
    6. Save deployment addresses to .sisyphus/evidence/task10-deployments.json
  Expected Result: All contracts deployed and accessible
  Evidence: .sisyphus/evidence/task10-deployments.json

Scenario: Configure SDKs with testnet addresses
  Tool: Bash
  Preconditions: Contracts deployed
  Steps:
    1. Update sdk/typescript/src/config.ts with testnet addresses
    2. Update sdk/python/apollon_near_sdk/config.py with testnet addresses
    3. npm test -- --network testnet
    4. pytest tests/test_testnet_integration.py
    5. Assert: All tests pass
  Expected Result: SDKs configured for testnet
  Evidence: Test output in terminal
```

**Commit**: YES
- Message: `deploy: testnet deployment complete`
- Files: `scripts/deploy-testnet.sh`, `.env.testnet`
- Pre-commit: `./scripts/deploy-testnet.sh --dry-run`

---

### Task 11: End-to-End Testing

**What to do**:
- [ ] Full E2E test: Intent → Solver → ZK Proof → Verification
- [ ] Test error scenarios
- [ ] Performance testing
- [ ] Document test results
- [ ] Fix any issues

**Must NOT do**:
- Skip edge cases
- Use mainnet
- Ignore performance issues

**Recommended Agent Profile**:
- **Category**: `deep`
- **Skills**: [`e2e-testing-patterns`]
  - End-to-end testing
  - Integration testing
- **Skills Evaluated but Omitted**:
  - None

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 4
- **Blocks**: Task 12
- **Blocked By**: Task 9, 10

**References**:
- Task 9, 10 results
- `backend/zk-privacy/` - ZK proof generation

**Acceptance Criteria**:

```
Scenario: Full E2E flow
  Tool: Bash (integration script)
  Preconditions: All components deployed
  Steps:
    1. ./scripts/e2e-test.sh
    2. Script performs:
       a. Submit prediction intent
       b. Solver generates prediction + ZK proof
       c. Solver fulfills intent on-chain
       d. Verify ZK proof on-chain
       e. Assert prediction available with verification status
    3. Assert: Total time < 60 seconds
    4. Assert: All steps succeed
    5. Save results to .sisyphus/evidence/task11-e2e-results.json
  Expected Result: Complete flow succeeds
  Evidence: .sisyphus/evidence/task11-e2e-results.json

Scenario: Test invalid proof rejection
  Tool: Bash
  Preconditions: Contracts deployed
  Steps:
    1. Submit intent with invalid ZK proof
    2. Assert: Intent rejected
    3. Assert: User deposit refunded
    4. Verify transaction logs
  Expected Result: Invalid proofs correctly rejected
  Evidence: Transaction logs
```

**Commit**: YES
- Message: `test: e2e tests passing`
- Files: `scripts/e2e-test.sh`, `tests/e2e/`
- Pre-commit: `./scripts/e2e-test.sh`

---

### Task 12: Documentation and Final Polish

**What to do**:
- [ ] Update README with NEAR instructions
- [ ] Document contract architecture
- [ ] Write SDK usage guide
- [ ] Add deployment guide
- [ ] Final code review

**Must NOT do**:
- Skip documentation
- Rush final review
- Ignore code quality

**Recommended Agent Profile**:
- **Category**: `writing`
- **Skills**: []
  - Documentation writing
- **Skills Evaluated but Omitted**:
  - None (writing task)

**Parallelization**:
- **Can Run In Parallel**: NO
- **Parallel Group**: Wave 5
- **Blocks**: None
- **Blocked By**: Task 11

**References**:
- All previous tasks
- `README.md` - Existing documentation

**Acceptance Criteria**:

```
Scenario: Documentation complete
  Tool: Bash
  Preconditions: All tasks completed
  Steps:
    1. Verify README.md updated with NEAR instructions
    2. Verify docs/ARCHITECTURE.md exists
    3. Verify docs/SDK_GUIDE.md exists
    4. Verify docs/DEPLOYMENT.md exists
    5. Run markdown linter: `npm run lint:docs`
    6. Assert: No critical documentation errors
  Expected Result: All documentation complete
  Evidence: Documentation files

Scenario: Final code quality check
  Tool: Bash
  Preconditions: All code complete
  Steps:
    1. cargo clippy --all-targets --all-features
    2. npm run lint (frontend + SDK)
    3. flake8 sdk/python
    4. Assert: No critical errors
    5. Save lint results to .sisyphus/evidence/task12-lint.txt
  Expected Result: Code passes quality checks
  Evidence: .sisyphus/evidence/task12-lint.txt
```

**Commit**: YES
- Message: `docs: complete documentation and final polish`
- Files: `README.md`, `docs/`
- Pre-commit: Documentation review

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(contracts): prototype ZK verifier and measure gas` | `contracts/verifier/` | `cargo test` |
| 2 | `research(contracts): analyze NEAR Intents support` | `research/intents.md` | N/A |
| 3 | `test(contracts): verify snarkjs to Rust compatibility` | `contracts/verifier/tests/` | `cargo test` |
| 4 | `feat(contracts): implement Groth16 ZK verifier` | `contracts/verifier/` | `cargo test` |
| 5 | `feat(contracts): implement intent publisher` | `contracts/publisher/` | `cargo test` |
| 6 | `feat(sdk): integrate intents-sdk` | `sdk/typescript/src/intents/` | `npm test` |
| 7 | `feat(sdk): migrate TypeScript SDK to NEAR` | `sdk/typescript/` | `npm test` |
| 8 | `feat(sdk): migrate Python SDK to NEAR` | `sdk/python/` | `pytest` |
| 9 | `feat(frontend): integrate NEAR Wallet Selector` | `frontend/` | `npm run build` |
| 10 | `deploy: testnet deployment` | `scripts/`, `.env.testnet` | `./scripts/deploy-testnet.sh --dry-run` |
| 11 | `test: e2e tests passing` | `scripts/e2e-test.sh`, `tests/e2e/` | `./scripts/e2e-test.sh` |
| 12 | `docs: complete documentation` | `README.md`, `docs/` | `npm run lint:docs` |

---

## Success Criteria

### Verification Commands

```bash
# Contract deployment
near view apollon-verifier.testnet get_version
# Expected: Returns version string

near view apollon-publisher.testnet get_intents
# Expected: Returns list of intents

# SDK tests
cd sdk/typescript && npm test
# Expected: All tests pass

cd sdk/python && pytest
# Expected: All tests pass

# Frontend build
cd frontend/algo-zk-dashboard && npm run build
# Expected: Build succeeds

# E2E test
./scripts/e2e-test.sh
# Expected: All steps pass in < 60s
```

### Final Checklist

- [ ] All contracts deployed to testnet
- [ ] TypeScript SDK published to npm
- [ ] Python SDK published to PyPI
- [ ] Frontend builds successfully
- [ ] E2E tests passing
- [ ] Documentation complete
- [ ] Code quality checks passing
- [ ] All "Must Have" features implemented
- [ ] No "Must NOT Have" features included

### Go/No-Go Decision Points

**Week 2 (After Wave 1)**:
- [ ] ZK verification gas < 50 TGas
- [ ] NEAR Intents supports custom oracle intents
- [ ] snarkjs → Rust proof compatibility verified
- **If NO**: Pivot to traditional NEAR contracts

**Week 6 (After Wave 2)**:
- [ ] Core contracts deployed and tested
- [ ] Intent submission working
- **If NO**: Extend timeline or reduce scope

**Week 10 (After Wave 3)**:
- [ ] Both SDKs updated and tested
- **If NO**: Deprecate Python SDK, focus on TypeScript

**Week 14 (After Wave 4)**:
- [ ] Testnet deployment complete
- [ ] E2E tests passing
- **If NO**: Fix critical bugs, extend if needed

---

## Risk Log

| Risk | Likelihood | Impact | Mitigation | Status |
|------|------------|--------|------------|--------|
| ZK verification gas > 50 TGas | High | High | Week 1 validation | Monitoring |
| NEAR Intents doesn't support custom intents | Medium | High | Week 1 validation | Monitoring |
| snarkjs → Rust format incompatibility | Medium | High | Week 1 validation | Monitoring |
| near-api-py insufficient features | Medium | Medium | Fallback to TypeScript SDK only | Open |
| Team Rust expertise gap | Medium | High | Training or hire | Open |
| Intent publisher complexity | Medium | Medium | Start simple, iterate | Open |
| Solver infrastructure operational burden | Medium | Medium | Single trusted solver v1 | Open |

---

## Assumptions Log

| # | Assumption | Validation Method | Status |
|---|------------|-------------------|--------|
| 1 | ZK proofs fit in NEAR gas limits | Task 1 prototype | Pending |
| 2 | NEAR Intents supports custom intents | Task 2 research | Pending |
| 3 | snarkjs proof format compatible with Rust | Task 3 test | Pending |
| 4 | near-api-py sufficient for Python SDK | Task 8 implementation | Pending |
| 5 | 3-4 month timeline realistic | Weekly progress reviews | Pending |
| 6 | Circom circuits don't need changes | Maintain existing circuits | Accepted |

---

**Plan Created**: 2026-02-04
**Next Step**: Run `/start-work` to begin execution with Sisyphus
