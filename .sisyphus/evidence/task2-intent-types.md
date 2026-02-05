# NEAR Intents - Intent Types Analysis

## Repository
- **Source**: https://github.com/near/intents
- **Cloned to**: `/tmp/near-intents`
- **Analysis Date**: 2025-02-05

## Supported Intent Types

The NEAR Intents contract defines an `Intent` enum in `core/src/intents/mod.rs` with the following variants:

### Account Management Intents
1. **AddPublicKey** (`AddPublicKey`)
   - Adds a public key to an account
   - Allows the key to sign intents on behalf of the account
   - Structure: `{ public_key: PublicKey }`

2. **RemovePublicKey** (`RemovePublicKey`)
   - Removes a public key from an account
   - Structure: `{ public_key: PublicKey }`

3. **SetAuthByPredecessorId** (`SetAuthByPredecessorId`)
   - Enables/disables authentication by predecessor ID
   - Structure: `{ enabled: bool }`

### Token Transfer Intents
4. **Transfer** (`Transfer`)
   - Transfers tokens within the intents contract
   - Structure: `{ receiver_id: AccountId, tokens: Amounts, memo?: String, notification?: NotifyOnTransfer }`

5. **FtWithdraw** (`FtWithdraw`)
   - Withdraws fungible tokens (NEP-141) to external accounts
   - Structure: `{ token: AccountId, receiver_id: AccountId, amount: U128, memo?: String, msg?: String, storage_deposit?: NearToken, min_gas?: Gas }`

6. **NftWithdraw** (`NftWithdraw`)
   - Withdraws non-fungible tokens (NEP-171) to external accounts
   - Structure: `{ token: AccountId, receiver_id: AccountId, token_id: TokenId, memo?: String, msg?: String, storage_deposit?: NearToken, min_gas?: Gas }`

7. **MtWithdraw** (`MtWithdraw`)
   - Withdraws multi-token standard tokens (NEP-245) to external accounts
   - Structure: `{ token: AccountId, receiver_id: AccountId, token_ids: Vec<TokenId>, amounts: Vec<U128>, memo?: String, msg?: String, storage_deposit?: NearToken, min_gas?: Gas }`

8. **NativeWithdraw** (`NativeWithdraw`)
   - Withdraws native NEAR tokens to external accounts
   - Subtracts from wNEAR balance, sends as native NEAR
   - Structure: `{ receiver_id: AccountId, amount: NearToken }`

9. **StorageDeposit** (`StorageDeposit`)
   - Makes NEP-145 storage deposit for an account on a contract
   - Structure: `{ contract_id: AccountId, deposit_for_account_id: AccountId, amount: NearToken }`

### Trading Intents
10. **TokenDiff** (`TokenDiff`)
    - Declares desired token balance changes (for P2P trading)
    - Structure: `{ diff: TokenDeltas, memo?: String, referral?: AccountId }`
    - Example: `{"A": -100, "B": 200}` means give 100 of token A to get 200 of token B

### Authorization Intents
11. **AuthCall** (`AuthCall`)
    - Calls `.on_auth` on another contract
    - Structure: `{ contract_id: AccountId, state_init?: StateInit, msg: String, attached_deposit: NearToken, min_gas?: Gas }`

### IMT (Intent-Managed Tokens) - Feature-gated
12. **ImtMint** (`ImtMint`) - Only with `imt` feature
    - Mints IMT tokens within the contract
    - Structure: `{ receiver_id: AccountId, tokens: ImtTokens, memo?: String, notification?: NotifyOnTransfer }`

13. **ImtBurn** (`ImtBurn`) - Only with `imt` feature
    - Burns IMT tokens
    - Structure: `{ minter_id: AccountId, tokens: ImtTokens, memo?: String }`

## Intent Structure

```rust
#[near(serializers = [json])]
pub struct DefuseIntents {
    pub intents: Vec<Intent>,
}

#[near(serializers = [json])]
#[serde(tag = "intent", rename_all = "snake_case")]
pub enum Intent {
    // ... variants listed above
}
```

## Custom Oracle Intent Support: **NO**

### Verdict: **NOT SUPPORTED**

The NEAR Intents architecture does **NOT** support custom intent types for oracle predictions. Here's why:

1. **Closed Enum**: The `Intent` enum is a closed, exhaustive enum. New intent types cannot be added without modifying the core contract code.

2. **No Extension Points**: There are no generic or extensible intent types that could be used for custom oracle data.

3. **Fixed Execution Logic**: Each intent type has a specific `ExecutableIntent` implementation that is hardcoded in the contract. The execution engine matches on the enum variants directly.

4. **No Plugin System**: There is no plugin or hook system that would allow external contracts to register custom intent handlers.

### Alternative Approaches

While custom oracle intents are not directly supported, there are potential workarounds:

1. **AuthCall Intent**: Use the `AuthCall` intent to call an external oracle contract. The oracle contract could verify predictions and execute conditional logic.

2. **TokenDiff with Oracle Validation**: Use `TokenDiff` intents combined with an external oracle that validates the trade conditions before execution.

3. **Custom Contract**: Deploy a custom contract that implements the `AuthCallee` trait and use `AuthCall` to interact with it.

### Intent JSON Format Example

```json
{
  "intents": [
    {
      "intent": "token_diff",
      "diff": {
        "nep141:token-a.near": "-1000000",
        "nep141:token-b.near": "2000000"
      },
      "memo": "Trade 1M token A for 2M token B"
    }
  ]
}
```

## Key Files

- `core/src/intents/mod.rs` - Main Intent enum definition
- `core/src/intents/account.rs` - Account management intents
- `core/src/intents/tokens.rs` - Token transfer and withdrawal intents
- `core/src/intents/token_diff.rs` - Trading intents
- `core/src/intents/auth.rs` - Authorization intents

## References

- [NEAR Intents Documentation](https://docs.near-intents.org/)
- [Technical Documentation](https://near.github.io/intents/)
- [Main Contract](https://nearblocks.io/address/intents.near)
