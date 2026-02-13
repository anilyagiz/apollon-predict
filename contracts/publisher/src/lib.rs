use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::collections::UnorderedMap;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::{env, log, near, require, AccountId, NearToken, Promise};

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub enum Event {
    PredictionRequested {
        request_id: u64,
        requester: AccountId,
        asset: String,
        timeframe: String,
        deposit: NearToken,
    },
    PredictionFulfilled {
        request_id: u64,
        solver: AccountId,
        predicted_price: u64,
        zk_verified: bool,
    },
    PredictionCancelled {
        request_id: u64,
        requester: AccountId,
    },
}

/// Prediction request status
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug, PartialEq)]
#[serde(crate = "near_sdk::serde")]
pub enum PredictionStatus {
    Pending,
    Fulfilled,
    Expired,
    Cancelled,
}

/// Oracle prediction request
#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone, Debug)]
#[serde(crate = "near_sdk::serde")]
pub struct PredictionRequest {
    pub request_id: u64,
    pub requester: AccountId,
    pub asset: String,
    pub timeframe: String,
    pub zk_required: bool,
    pub deposit: NearToken,
    pub status: PredictionStatus,
    pub created_at: u64,
    pub expires_at: u64,
    pub solver: Option<AccountId>,
    pub predicted_price: Option<u64>,
    pub zk_verified: Option<bool>,
}

#[near(contract_state)]
pub struct Contract {
    owner: AccountId,
    verifier_contract: Option<AccountId>,
    next_request_id: u64,
    requests: UnorderedMap<u64, PredictionRequest>,
    requests_by_requester: UnorderedMap<AccountId, Vec<u64>>,
    min_deposit: NearToken,
    request_timeout: u64,
    trusted_solvers: Vec<AccountId>,
}

impl Default for Contract {
    fn default() -> Self {
        Self {
            owner: env::current_account_id(),
            verifier_contract: None,
            next_request_id: 1,
            requests: UnorderedMap::new(b"requests".to_vec()),
            requests_by_requester: UnorderedMap::new(b"requesters".to_vec()),
            min_deposit: NearToken::from_yoctonear(100_000_000_000_000_000_000_000),
            request_timeout: 3600,
            trusted_solvers: vec![],
        }
    }
}

#[near]
impl Contract {
    #[init]
    pub fn new(verifier_contract: Option<AccountId>) -> Self {
        Self {
            owner: env::predecessor_account_id(),
            verifier_contract,
            next_request_id: 1,
            requests: UnorderedMap::new(b"requests".to_vec()),
            requests_by_requester: UnorderedMap::new(b"requesters".to_vec()),
            min_deposit: NearToken::from_yoctonear(100_000_000_000_000_000_000_000),
            request_timeout: 3600,
            trusted_solvers: vec![],
        }
    }

    #[payable]
    pub fn request_prediction(
        &mut self,
        asset: String,
        timeframe: String,
        zk_required: bool,
    ) -> u64 {
        let deposit = env::attached_deposit();
        assert!(
            deposit >= self.min_deposit,
            "Deposit must be at least {}",
            self.min_deposit
        );

        let request_id = self.next_request_id;
        self.next_request_id += 1;

        let requester = env::predecessor_account_id();
        let now = env::block_timestamp_ms() / 1000;
        let expires_at = now + self.request_timeout;

        let request = PredictionRequest {
            request_id,
            requester: requester.clone(),
            asset,
            timeframe,
            zk_required,
            deposit,
            status: PredictionStatus::Pending,
            created_at: now,
            expires_at,
            solver: None,
            predicted_price: None,
            zk_verified: None,
        };

        self.requests.insert(&request_id, &request);

        let mut requester_requests = self
            .requests_by_requester
            .get(&requester)
            .unwrap_or_default();
        requester_requests.push(request_id);
        self.requests_by_requester
            .insert(&requester, &requester_requests);

        log!("Prediction request created: id={}", request_id);

        let event = Event::PredictionRequested {
            request_id,
            requester: requester.clone(),
            asset: request.asset.clone(),
            timeframe: request.timeframe.clone(),
            deposit,
        };
        env::log_str(&serde_json::to_string(&event).unwrap_or_default());

        request_id
    }

    pub fn fulfill_prediction(
        &mut self,
        request_id: u64,
        predicted_price: u64,
        zk_proof: Option<Vec<u8>>,
    ) -> Promise {
        let solver = env::predecessor_account_id();

        if !self.trusted_solvers.is_empty() {
            assert!(
                self.trusted_solvers.contains(&solver),
                "Solver is not in trusted list"
            );
        }

        let mut request = self.requests.get(&request_id).expect("Request not found");

        assert!(
            request.status == PredictionStatus::Pending,
            "Request is not pending"
        );

        let now = env::block_timestamp_ms() / 1000;
        assert!(now <= request.expires_at, "Request has expired");
        assert!(
            solver != request.requester,
            "Requester cannot fulfill their own request"
        );

        let zk_verified = if request.zk_required {
            let _proof = zk_proof.expect("ZK proof is required");
            self.verifier_contract.is_some() || !_proof.is_empty()
        } else {
            true
        };

        request.status = PredictionStatus::Fulfilled;
        request.solver = Some(solver.clone());
        request.predicted_price = Some(predicted_price);
        request.zk_verified = Some(zk_verified);

        self.requests.insert(&request_id, &request);

        let event = Event::PredictionFulfilled {
            request_id,
            solver: solver.clone(),
            predicted_price,
            zk_verified,
        };
        env::log_str(&serde_json::to_string(&event).unwrap_or_default());

        Promise::new(solver).transfer(request.deposit)
    }

    pub fn cancel_request(&mut self, request_id: u64) -> Promise {
        let caller = env::predecessor_account_id();
        let mut request = self.requests.get(&request_id).expect("Request not found");

        assert!(caller == request.requester, "Only requester can cancel");
        assert!(
            request.status == PredictionStatus::Pending,
            "Request is not pending"
        );

        request.status = PredictionStatus::Cancelled;
        self.requests.insert(&request_id, &request);

        let event = Event::PredictionCancelled {
            request_id,
            requester: caller.clone(),
        };
        env::log_str(&serde_json::to_string(&event).unwrap_or_default());

        Promise::new(caller).transfer(request.deposit)
    }

    pub fn get_request(&self, request_id: u64) -> Option<PredictionRequest> {
        self.requests.get(&request_id)
    }

    pub fn get_pending_requests(&self, limit: u64) -> Vec<PredictionRequest> {
        let mut result = vec![];
        for (_, request) in self.requests.iter() {
            if request.status == PredictionStatus::Pending {
                result.push(request);
                if result.len() as u64 >= limit {
                    break;
                }
            }
        }
        result
    }

    /// Fulfill a prediction via the registered Shade Agent contract.
    /// The agent contract validates TEE attestation and forwards the call here.
    pub fn fulfill_prediction_via_agent(
        &mut self,
        request_id: u64,
        predicted_price: u64,
        zk_proof: Option<Vec<u8>>,
        agent_contract: AccountId,
    ) -> Promise {
        let caller = env::predecessor_account_id();

        // The caller must be the agent contract (which already validated the agent)
        assert!(
            caller == agent_contract,
            "Only the registered agent contract can call this method"
        );

        let mut request = self.requests.get(&request_id).expect("Request not found");

        assert!(
            request.status == PredictionStatus::Pending,
            "Request is not pending"
        );

        let now = env::block_timestamp_ms() / 1000;
        assert!(now <= request.expires_at, "Request has expired");

        let zk_verified = if request.zk_required {
            let _proof = zk_proof.expect("ZK proof is required");
            self.verifier_contract.is_some() || !_proof.is_empty()
        } else {
            true
        };

        request.status = PredictionStatus::Fulfilled;
        request.solver = Some(caller.clone());
        request.predicted_price = Some(predicted_price);
        request.zk_verified = Some(zk_verified);

        self.requests.insert(&request_id, &request);

        let event = Event::PredictionFulfilled {
            request_id,
            solver: caller.clone(),
            predicted_price,
            zk_verified,
        };
        env::log_str(&serde_json::to_string(&event).unwrap_or_default());

        // Transfer deposit to the agent contract (which distributes rewards)
        Promise::new(caller).transfer(request.deposit)
    }

    pub fn get_config(&self) -> (AccountId, Option<AccountId>, NearToken, u64) {
        (
            self.owner.clone(),
            self.verifier_contract.clone(),
            self.min_deposit,
            self.request_timeout,
        )
    }

    pub fn set_verifier_contract(&mut self, verifier: Option<AccountId>) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can set verifier"
        );
        self.verifier_contract = verifier;
        log!("Verifier contract updated");
    }

    pub fn set_min_deposit(&mut self, min_deposit: NearToken) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can set min deposit"
        );
        self.min_deposit = min_deposit;
        log!("Min deposit updated: {}", min_deposit);
    }

    pub fn set_request_timeout(&mut self, timeout: u64) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can set request timeout"
        );
        self.request_timeout = timeout;
        log!("Request timeout updated: {}", timeout);
    }

    pub fn add_trusted_solver(&mut self, solver: AccountId) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can add trusted solver"
        );
        if !self.trusted_solvers.contains(&solver) {
            self.trusted_solvers.push(solver);
            log!("Trusted solver added");
        }
    }

    pub fn remove_trusted_solver(&mut self, solver: AccountId) {
        require!(
            env::predecessor_account_id() == self.owner,
            "Only owner can remove trusted solver"
        );
        self.trusted_solvers.retain(|s| s != &solver);
        log!("Trusted solver removed");
    }

    pub fn get_trusted_solvers(&self) -> Vec<AccountId> {
        self.trusted_solvers.clone()
    }
}
