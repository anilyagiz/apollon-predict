# NEAR Verifier Contract

This contract verifies ZK proofs on-chain using arkworks verification.

## Building

```bash
cargo build --target wasm32-unknown-unknown --release
```

## Testing

```bash
cargo test
```

## Contract Interface

### Methods

#### `verify_proof(proof: SnarkJSProof, public_inputs: Vec<String>) -> bool`

Verifies a ZK proof against the verification key.

#### `set_verification_key(key: VerificationKey)`

Sets the verification key (owner only).

## Architecture

The verifier contract uses arkworks libraries for on-chain Groth16 verification:

- **ark-groth16**: Groth16 proof verification
- **ark-bn254**: BN254 curve operations
- **ark-ec**: Elliptic curve operations
- **ark-ff**: Finite field arithmetic

## ZK Proof Format

The contract accepts proofs in SnarkJS format:

```json
{
  "pi_a": ["x", "y"],
  "pi_b": [["x1", "y1"], ["x2", "y2"]],
  "pi_c": ["x", "y"],
  "publicSignals": ["input1", "input2"]
}
```

## Security

- Proofs are verified using the Groth16 verification algorithm
- Public inputs are checked against the proof
- The verification key is stored immutably after initialization
