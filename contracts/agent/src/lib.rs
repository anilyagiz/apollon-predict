use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, log, near, require, AccountId, Promise};

/// Agent registration data from TEE attestation
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct AgentRegistration {
    pub agent_account: AccountId,
    pub code_hash: String,
    pub attestation_quote: Option<String>,
    pub tee_type: String,
    pub registered_at: u64,
}

/// Allowed action that the agent can perform
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct AllowedAction {
    pub contract_id: AccountId,
    pub method_name: String,
}

/// Shade Agent Contract
///
/// Controls what the TEE-based oracle agent is allowed to do.
/// Restricts `request_signature` to only call approved methods on approved contracts.
/// Stores TEE attestation for verifiability.
#[near(contract_state)]
pub struct AgentContract {
    owner: AccountId,
    agent: Option<AgentRegistration>,
    allowed_actions: Vec<AllowedAction>,
    publisher_contract: Option<AccountId>,
    signature_count: u64,
    last_action_timestamp: u64,
}

impl Default for AgentContract {
    fn default() -> Self {
        Self {
            owner: env::current_account_id(),
            agent: None,
            allowed_actions: vec![],
            publisher_contract: None,
            signature_count: 0,
            last_action_timestamp: 0,
        }
    }
}

#[near]
impl AgentContract {
    #[init]
    pub fn new(publisher_contract: Option<AccountId>) -> Self {
        let mut contract = Self {
            owner: env::predecessor_account_id(),
            agent: None,
            allowed_actions: vec![],
            publisher_contract: publisher_contract.clone(),
            signature_count: 0,
            last_action_timestamp: 0,
        };

        // Pre-configure allowed actions for the publisher contract
        if let Some(publisher) = publisher_contract {
            contract.allowed_actions.push(AllowedAction {
                contract_id: publisher.clone(),
                method_name: "fulfill_prediction".to_string(),
            });
            contract.allowed_actions.push(AllowedAction {
                contract_id: publisher,
                method_name: "fulfill_prediction_via_agent".to_string(),
            });
        }

        contract
    }

    // ─── Agent Registration ────────────────────────────────────────────────

    /// Register a TEE agent with attestation proof
    pub fn register_agent(
        &mut self,
        code_hash: String,
        attestation_quote: Option<String>,
        tee_type: String,
    ) {
        let caller = env::predecessor_account_id();

        // Only owner or the agent itself can register
        require!(
            caller == self.owner || self.agent.is_none(),
            "Only owner can re-register agent"
        );

        self.agent = Some(AgentRegistration {
            agent_account: caller.clone(),
            code_hash,
            attestation_quote,
            tee_type,
            registered_at: env::block_timestamp_ms() / 1000,
        });

        log!("Agent registered: {}", caller);
    }

    // ─── Signature Request (restricted) ────────────────────────────────────

    /// Request a signature for a cross-chain transaction.
    /// Only the registered agent can call this, and only for allowed actions.
    pub fn request_signature(
        &mut self,
        target_contract: AccountId,
        method_name: String,
        args: String,
    ) -> Promise {
        let caller = env::predecessor_account_id();

        // Verify caller is the registered agent
        let agent = self.agent.as_ref().expect("No agent registered");
        require!(
            caller == agent.agent_account,
            "Only the registered agent can request signatures"
        );

        // Verify action is allowed
        let is_allowed = self.allowed_actions.iter().any(|a| {
            a.contract_id == target_contract && a.method_name == method_name
        });
        require!(
            is_allowed,
            format!(
                "Action not allowed: {}.{}",
                target_contract, method_name
            )
        );

        // Update stats
        self.signature_count += 1;
        self.last_action_timestamp = env::block_timestamp_ms() / 1000;

        log!(
            "Signature requested: {}.{} (total: {})",
            target_contract,
            method_name,
            self.signature_count
        );

        // Forward the call to the target contract
        Promise::new(target_contract).function_call(
            method_name,
            args.into_bytes(),
            near_sdk::NearToken::from_yoctonear(0),
            near_sdk::Gas::from_tgas(50),
        )
    }

    // ─── Admin Functions ───────────────────────────────────────────────────

    /// Add an allowed action for the agent
    pub fn add_allowed_action(&mut self, contract_id: AccountId, method_name: String) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can add allowed actions"
        );

        // Prevent duplicates
        let exists = self.allowed_actions.iter().any(|a| {
            a.contract_id == contract_id && a.method_name == method_name
        });

        if !exists {
            self.allowed_actions.push(AllowedAction {
                contract_id,
                method_name,
            });
            log!("Allowed action added");
        }
    }

    /// Remove an allowed action
    pub fn remove_allowed_action(&mut self, contract_id: AccountId, method_name: String) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can remove allowed actions"
        );

        self.allowed_actions.retain(|a| {
            !(a.contract_id == contract_id && a.method_name == method_name)
        });

        log!("Allowed action removed");
    }

    /// Update the publisher contract reference
    pub fn set_publisher_contract(&mut self, publisher: AccountId) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can set publisher contract"
        );
        self.publisher_contract = Some(publisher);
        log!("Publisher contract updated");
    }

    // ─── View Functions ────────────────────────────────────────────────────

    /// Get agent registration info
    pub fn get_agent(&self) -> Option<AgentRegistration> {
        self.agent.clone()
    }

    /// Get agent status summary
    pub fn get_agent_status(&self) -> (bool, u64, u64, Vec<AllowedAction>) {
        (
            self.agent.is_some(),
            self.signature_count,
            self.last_action_timestamp,
            self.allowed_actions.clone(),
        )
    }

    /// Get allowed actions list
    pub fn get_allowed_actions(&self) -> Vec<AllowedAction> {
        self.allowed_actions.clone()
    }

    /// Get the publisher contract
    pub fn get_publisher_contract(&self) -> Option<AccountId> {
        self.publisher_contract.clone()
    }
}
