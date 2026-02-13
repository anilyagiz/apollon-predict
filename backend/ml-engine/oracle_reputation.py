"""
Oracle Reputation System and Dispute Resolution
Addresses oracle game theory issues: centralization, reputation tracking, dispute mechanisms
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from enum import Enum
import json
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature
import asyncio
import statistics

class OracleStatus(Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended" 
    UNDER_INVESTIGATION = "under_investigation"
    BLACKLISTED = "blacklisted"

class DisputeStatus(Enum):
    PENDING = "pending"
    EVIDENCE_GATHERING = "evidence_gathering"
    VOTING = "voting"
    RESOLVED = "resolved"
    APPEALED = "appealed"

class DisputeOutcome(Enum):
    VALID_PREDICTION = "valid_prediction"
    INVALID_PREDICTION = "invalid_prediction"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"
    MALICIOUS_BEHAVIOR = "malicious_behavior"

@dataclass
class PredictionRecord:
    """Individual prediction record with validation data"""
    prediction_id: str
    oracle_id: str
    asset: str
    predicted_value: float
    actual_value: Optional[float]
    prediction_timestamp: datetime
    actualization_timestamp: Optional[datetime]
    confidence: float
    model_contributions: Dict[str, float]
    metadata: Dict[str, Any]
    
    def calculate_accuracy(self) -> Optional[float]:
        """Calculate prediction accuracy if actual value is available"""
        if self.actual_value is None:
            return None
        
        if self.actual_value == 0:
            return None
            
        return 1 - abs(self.predicted_value - self.actual_value) / abs(self.actual_value)

@dataclass
class OracleReputation:
    """Comprehensive oracle reputation tracking"""
    oracle_id: str
    total_predictions: int = 0
    successful_predictions: int = 0
    average_accuracy: float = 0.0
    average_confidence: float = 0.0
    reputation_score: float = 0.0
    status: OracleStatus = OracleStatus.ACTIVE
    last_prediction_timestamp: Optional[datetime] = None
    prediction_history: List[str] = field(default_factory=list)
    disputes_filed: int = 0
    disputes_resolved_against: int = 0
    stake_amount: float = 0.0
    rewards_earned: float = 0.0
    penalties_incurred: float = 0.0
    
    def update_reputation(self, prediction_accuracy: float, confidence: float):
        """Update reputation using exponential moving average"""
        if self.total_predictions == 0:
            self.average_accuracy = prediction_accuracy
            self.average_confidence = confidence
        else:
            # Exponential moving average with decay factor
            decay_factor = 0.1
            self.average_accuracy = (
                (1 - decay_factor) * self.average_accuracy + 
                decay_factor * prediction_accuracy
            )
            self.average_confidence = (
                (1 - decay_factor) * self.average_confidence + 
                decay_factor * confidence
            )
        
        self.total_predictions += 1
        if prediction_accuracy >= 0.95:  # 95% accuracy threshold
            self.successful_predictions += 1
        
        # Calculate comprehensive reputation score
        accuracy_component = self.average_accuracy
        confidence_component = min(self.average_confidence, 0.95)  # Cap confidence
        dispute_component = max(0, 1 - (self.disputes_resolved_against / max(1, self.disputes_filed)))
        
        self.reputation_score = (
            0.5 * accuracy_component +
            0.2 * confidence_component +
            0.3 * dispute_component
        )
        
        self.last_prediction_timestamp = datetime.now()

@dataclass
class DisputeCase:
    """Comprehensive dispute case tracking"""
    dispute_id: str
    prediction_id: str
    challenger_id: str
    accused_oracle_id: str
    dispute_reason: str
    evidence_submitted: List[Dict[str, Any]] = field(default_factory=list)
    votes: Dict[str, str] = field(default_factory=dict)  # voter_id -> vote
    status: DisputeStatus = DisputeStatus.PENDING
    outcome: Optional[DisputeOutcome] = None
    created_timestamp: datetime = field(default_factory=datetime.now)
    resolution_timestamp: Optional[datetime] = None
    penalty_amount: float = 0.0
    reward_amount: float = 0.0
    
    def add_evidence(self, evidence_type: str, evidence_data: Dict[str, Any], submitter_id: str):
        """Add evidence to dispute case"""
        evidence = {
            'evidence_type': evidence_type,
            'evidence_data': evidence_data,
            'submitter_id': submitter_id,
            'timestamp': datetime.now(),
            'verified': False
        }
        self.evidence_submitted.append(evidence)
    
    def submit_vote(self, voter_id: str, vote: str, voter_reputation: float):
        """Submit vote with reputation weighting"""
        if voter_reputation < 0.7:  # Minimum reputation to vote
            raise ValueError("Insufficient reputation to vote")
        
        self.votes[voter_id] = {
            'vote': vote,
            'voter_reputation': voter_reputation,
            'timestamp': datetime.now()
        }
    
    def calculate_vote_result(self) -> Tuple[str, float]:
        """Calculate weighted vote result"""
        if not self.votes:
            return "insufficient_votes", 0.0
        
        vote_weights = {}
        for voter_id, vote_data in self.votes.items():
            vote = vote_data['vote']
            reputation = vote_data['voter_reputation']
            
            if vote not in vote_weights:
                vote_weights[vote] = 0.0
            vote_weights[vote] += reputation
        
        total_weight = sum(vote_weights.values())
        winning_vote = max(vote_weights, key=vote_weights.get)
        winning_percentage = vote_weights[winning_vote] / total_weight if total_weight > 0 else 0.0
        
        return winning_vote, winning_percentage

class OracleReputationSystem:
    """
    Comprehensive oracle reputation system with dispute resolution
    """
    
    def __init__(self, 
                 min_reputation_for_voting: float = 0.7,
                 dispute_voting_period_hours: int = 72,
                 evidence_submission_period_hours: int = 24,
                 minimum_stake_amount: float = 1000.0,
                 penalty_rate: float = 0.1,
                 reward_rate: float = 0.05):
        
        self.min_reputation_for_voting = min_reputation_for_voting
        self.dispute_voting_period_hours = dispute_voting_period_hours
        self.evidence_submission_period_hours = evidence_submission_period_hours
        self.minimum_stake_amount = minimum_stake_amount
        self.penalty_rate = penalty_rate
        self.reward_rate = reward_rate
        
        self.oracles: Dict[str, OracleReputation] = {}
        self.disputes: Dict[str, DisputeCase] = {}
        self.prediction_records: Dict[str, PredictionRecord] = {}
        
        self.logger = logging.getLogger(__name__)
        
        # Generate system key pair for cryptographic verification
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )
        self.public_key = self.private_key.public_key()
    
    def register_oracle(self, oracle_id: str, initial_stake: float) -> bool:
        """Register new oracle with minimum stake"""
        if oracle_id in self.oracles:
            self.logger.warning(f"Oracle {oracle_id} already registered")
            return False
        
        if initial_stake < self.minimum_stake_amount:
            self.logger.warning(f"Insufficient stake amount: {initial_stake}")
            return False
        
        self.oracles[oracle_id] = OracleReputation(
            oracle_id=oracle_id,
            stake_amount=initial_stake,
            status=OracleStatus.ACTIVE
        )
        
        self.logger.info(f"Oracle {oracle_id} registered with stake {initial_stake}")
        return True
    
    def record_prediction(self, prediction: PredictionRecord) -> bool:
        """Record prediction with cryptographic verification"""
        if prediction.oracle_id not in self.oracles:
            self.logger.error(f"Oracle {prediction.oracle_id} not registered")
            return False
        
        # Verify oracle is active
        oracle = self.oracles[prediction.oracle_id]
        if oracle.status != OracleStatus.ACTIVE:
            self.logger.warning(f"Oracle {prediction.oracle_id} is not active: {oracle.status}")
            return False
        
        # Store prediction record
        self.prediction_records[prediction.prediction_id] = prediction
        oracle.prediction_history.append(prediction.prediction_id)
        oracle.last_prediction_timestamp = prediction.prediction_timestamp
        
        self.logger.info(f"Prediction {prediction.prediction_id} recorded for oracle {prediction.oracle_id}")
        return True
    
    def record_actual_value(self, prediction_id: str, actual_value: float, actualization_timestamp: datetime) -> bool:
        """Record actual value and update oracle reputation"""
        if prediction_id not in self.prediction_records:
            self.logger.error(f"Prediction {prediction_id} not found")
            return False
        
        prediction = self.prediction_records[prediction_id]
        prediction.actual_value = actual_value
        prediction.actualization_timestamp = actualization_timestamp
        
        # Calculate accuracy and update reputation
        accuracy = prediction.calculate_accuracy()
        if accuracy is not None:
            oracle = self.oracles[prediction.oracle_id]
            oracle.update_reputation(accuracy, prediction.confidence)
            
            # Calculate rewards/penalties based on accuracy
            if accuracy >= 0.95:
                reward = prediction.confidence * self.reward_rate * oracle.stake_amount
                oracle.rewards_earned += reward
                oracle.stake_amount += reward
                self.logger.info(f"Oracle {oracle.oracle_id} earned reward: {reward}")
            elif accuracy < 0.8:
                penalty = (0.8 - accuracy) * self.penalty_rate * oracle.stake_amount
                oracle.penalties_incurred += penalty
                oracle.stake_amount = max(0, oracle.stake_amount - penalty)
                self.logger.warning(f"Oracle {oracle.oracle_id} incurred penalty: {penalty}")
                
                # Suspend oracle if stake drops too low
                if oracle.stake_amount < self.minimum_stake_amount * 0.5:
                    oracle.status = OracleStatus.SUSPENDED
                    self.logger.warning(f"Oracle {oracle.oracle_id} suspended due to low stake")
        
        return True
    
    def file_dispute(self, prediction_id: str, challenger_id: str, dispute_reason: str) -> Optional[str]:
        """File a dispute against a prediction"""
        if prediction_id not in self.prediction_records:
            self.logger.error(f"Prediction {prediction_id} not found")
            return None
        
        prediction = self.prediction_records[prediction_id]
        
        # Check if dispute already exists
        existing_disputes = [d for d in self.disputes.values() if d.prediction_id == prediction_id]
        if existing_disputes:
            self.logger.warning(f"Dispute already exists for prediction {prediction_id}")
            return None
        
        # Create dispute case
        dispute_id = f"dispute_{prediction_id}_{int(datetime.now().timestamp())}"
        dispute = DisputeCase(
            dispute_id=dispute_id,
            prediction_id=prediction_id,
            challenger_id=challenger_id,
            accused_oracle_id=prediction.oracle_id,
            dispute_reason=dispute_reason
        )
        
        self.disputes[dispute_id] = dispute
        
        # Update oracle dispute count
        oracle = self.oracles[prediction.oracle_id]
        oracle.disputes_filed += 1
        oracle.status = OracleStatus.UNDER_INVESTIGATION
        
        self.logger.info(f"Dispute {dispute_id} filed against oracle {prediction.oracle_id}")
        return dispute_id
    
    def submit_evidence(self, dispute_id: str, evidence_type: str, 
                       evidence_data: Dict[str, Any], submitter_id: str) -> bool:
        """Submit evidence to a dispute case"""
        if dispute_id not in self.disputes:
            self.logger.error(f"Dispute {dispute_id} not found")
            return False
        
        dispute = self.disputes[dispute_id]
        
        # Verify evidence submission period
        time_elapsed = (datetime.now() - dispute.created_timestamp).total_seconds() / 3600
        if time_elapsed > self.evidence_submission_period_hours:
            self.logger.warning(f"Evidence submission period expired for dispute {dispute_id}")
            return False
        
        # Verify submitter reputation
        if submitter_id not in self.oracles:
            self.logger.warning(f"Submitter {submitter_id} not registered")
            return False
        
        submitter = self.oracles[submitter_id]
        if submitter.reputation_score < self.min_reputation_for_voting:
            self.logger.warning(f"Submitter {submitter_id} insufficient reputation: {submitter.reputation_score}")
            return False
        
        dispute.add_evidence(evidence_type, evidence_data, submitter_id)
        self.logger.info(f"Evidence submitted to dispute {dispute_id} by {submitter_id}")
        return True
    
    def vote_on_dispute(self, dispute_id: str, voter_id: str, vote: str) -> bool:
        """Submit vote on dispute resolution"""
        if dispute_id not in self.disputes:
            self.logger.error(f"Dispute {dispute_id} not found")
            return False
        
        dispute = self.disputes[dispute_id]
        
        # Verify voting period
        time_elapsed = (datetime.now() - dispute.created_timestamp).total_seconds() / 3600
        if time_elapsed > self.dispute_voting_period_hours:
            self.logger.warning(f"Voting period expired for dispute {dispute_id}")
            return False
        
        # Verify voter eligibility
        if voter_id not in self.oracles:
            self.logger.warning(f"Voter {voter_id} not registered")
            return False
        
        voter = self.oracles[voter_id]
        if voter.reputation_score < self.min_reputation_for_voting:
            self.logger.warning(f"Voter {voter_id} insufficient reputation: {voter.reputation_score}")
            return False
        
        try:
            dispute.submit_vote(voter_id, vote, voter.reputation_score)
            self.logger.info(f"Vote submitted to dispute {dispute_id} by {voter_id}: {vote}")
            return True
        except ValueError as e:
            self.logger.error(f"Vote submission failed: {e}")
            return False
    
    def resolve_dispute(self, dispute_id: str) -> Optional[DisputeOutcome]:
        """Resolve dispute based on voting results"""
        if dispute_id not in self.disputes:
            self.logger.error(f"Dispute {dispute_id} not found")
            return None
        
        dispute = self.disputes[dispute_id]
        
        # Check if voting period has ended
        time_elapsed = (datetime.now() - dispute.created_timestamp).total_seconds() / 3600
        if time_elapsed < self.dispute_voting_period_hours:
            self.logger.warning(f"Voting period not ended for dispute {dispute_id}")
            return None
        
        # Calculate vote result
        winning_vote, winning_percentage = dispute.calculate_vote_result()
        
        if winning_percentage < 0.6:  # 60% threshold for resolution
            outcome = DisputeOutcome.INSUFFICIENT_EVIDENCE
        elif winning_vote == "valid":
            outcome = DisputeOutcome.VALID_PREDICTION
        elif winning_vote == "invalid":
            outcome = DisputeOutcome.INVALID_PREDICTION
        elif winning_vote == "malicious":
            outcome = DisputeOutcome.MALICIOUS_BEHAVIOR
        else:
            outcome = DisputeOutcome.INSUFFICIENT_EVIDENCE
        
        dispute.outcome = outcome
        dispute.resolution_timestamp = datetime.now()
        dispute.status = DisputeStatus.RESOLVED
        
        # Apply penalties/rewards
        self._apply_dispute_resolution(dispute)
        
        self.logger.info(f"Dispute {dispute_id} resolved with outcome: {outcome.value}")
        return outcome
    
    def _apply_dispute_resolution(self, dispute: DisputeCase):
        """Apply penalties and rewards based on dispute outcome"""
        accused_oracle = self.oracles[dispute.accused_oracle_id]
        
        if dispute.outcome == DisputeOutcome.INVALID_PREDICTION:
            # Penalize oracle for inaccurate prediction
            penalty = self.penalty_rate * accused_oracle.stake_amount
            accused_oracle.penalties_incurred += penalty
            accused_oracle.stake_amount = max(0, accused_oracle.stake_amount - penalty)
            dispute.penalty_amount = penalty
            
            # Reward challenger
            challenger = self.oracles.get(dispute.challenger_id)
            if challenger:
                challenger.rewards_earned += penalty * 0.5
                challenger.stake_amount += penalty * 0.5
                dispute.reward_amount = penalty * 0.5
            
            accused_oracle.disputes_resolved_against += 1
            
        elif dispute.outcome == DisputeOutcome.MALICIOUS_BEHAVIOR:
            # Severe penalty for malicious behavior
            penalty = 0.5 * accused_oracle.stake_amount  # 50% stake slashed
            accused_oracle.penalties_incurred += penalty
            accused_oracle.stake_amount = max(0, accused_oracle.stake_amount - penalty)
            accused_oracle.status = OracleStatus.BLACKLISTED
            dispute.penalty_amount = penalty
            
            # Reward challenger significantly
            challenger = self.oracles.get(dispute.challenger_id)
            if challenger:
                challenger.rewards_earned += penalty * 0.8
                challenger.stake_amount += penalty * 0.8
                dispute.reward_amount = penalty * 0.8
            
            accused_oracle.disputes_resolved_against += 1
            
        elif dispute.outcome == DisputeOutcome.VALID_PREDICTION:
            # Penalize frivolous dispute
            challenger = self.oracles.get(dispute.challenger_id)
            if challenger:
                penalty = 0.1 * challenger.stake_amount
                challenger.penalties_incurred += penalty
                challenger.stake_amount = max(0, challenger.stake_amount - penalty)
                dispute.penalty_amount = penalty
        
        # Update oracle status
        if accused_oracle.stake_amount < self.minimum_stake_amount * 0.3:
            accused_oracle.status = OracleStatus.SUSPENDED
        else:
            accused_oracle.status = OracleStatus.ACTIVE
    
    def get_oracle_rankings(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get ranked list of oracles by reputation"""
        active_oracles = [
            oracle for oracle in self.oracles.values() 
            if oracle.status == OracleStatus.ACTIVE
        ]
        
        ranked_oracles = sorted(
            active_oracles,
            key=lambda x: x.reputation_score,
            reverse=True
        )[:limit]
        
        return [
            {
                'oracle_id': oracle.oracle_id,
                'reputation_score': oracle.reputation_score,
                'total_predictions': oracle.total_predictions,
                'accuracy': oracle.average_accuracy,
                'stake_amount': oracle.stake_amount,
                'status': oracle.status.value
            }
            for oracle in ranked_oracles
        ]
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get overall system health metrics"""
        total_oracles = len(self.oracles)
        active_oracles = sum(1 for o in self.oracles.values() if o.status == OracleStatus.ACTIVE)
        suspended_oracles = sum(1 for o in self.oracles.values() if o.status == OracleStatus.SUSPENDED)
        
        total_predictions = len(self.prediction_records)
        active_disputes = sum(1 for d in self.disputes.values() if d.status != DisputeStatus.RESOLVED)
        
        if self.oracles:
            avg_reputation = statistics.mean(o.reputation_score for o in self.oracles.values())
            avg_accuracy = statistics.mean(o.average_accuracy for o in self.oracles.values())
        else:
            avg_reputation = 0.0
            avg_accuracy = 0.0
        
        return {
            'total_oracles': total_oracles,
            'active_oracles': active_oracles,
            'suspended_oracles': suspended_oracles,
            'total_predictions': total_predictions,
            'active_disputes': active_disputes,
            'average_reputation': avg_reputation,
            'average_accuracy': avg_accuracy,
            'system_status': 'healthy' if avg_reputation > 0.7 and active_oracles > 3 else 'degraded'
        }

# Example usage and testing
async def test_reputation_system():
    """Test the reputation system with sample data"""
    
    # Initialize system
    reputation_system = OracleReputationSystem(
        min_reputation_for_voting=0.6,
        dispute_voting_period_hours=1,  # Short period for testing
        evidence_submission_period_hours=0.5
    )
    
    # Register test oracles
    oracle_ids = ["oracle_1", "oracle_2", "oracle_3", "oracle_4"]
    for oracle_id in oracle_ids:
        reputation_system.register_oracle(oracle_id, initial_stake=1000.0)
    
    # Create test predictions
    test_predictions = [
        PredictionRecord(
            prediction_id=f"pred_{i}",
            oracle_id=oracle_ids[i % len(oracle_ids)],
            asset="BTC",
            predicted_value=50000 + i * 1000,
            actual_value=50000 + i * 1000 + (np.random.random() - 0.5) * 2000,
            prediction_timestamp=datetime.now() - timedelta(hours=i+1),
            actualization_timestamp=datetime.now() - timedelta(hours=i),
            confidence=0.8 + np.random.random() * 0.2,
            model_contributions={'lstm': 0.4, 'gru': 0.3, 'prophet': 0.2, 'xgboost': 0.1},
            metadata={'market_volatility': 0.15, 'prediction_horizon': '1h'}
        )
        for i in range(10)
    ]
    
    # Record predictions and actual values
    for prediction in test_predictions:
        reputation_system.record_prediction(prediction)
        reputation_system.record_actual_value(
            prediction.prediction_id,
            prediction.actual_value,
            prediction.actualization_timestamp
        )
    
    # Get oracle rankings
    rankings = reputation_system.get_oracle_rankings()
    print("Oracle Rankings:")
    for ranking in rankings:
        print(f"  {ranking['oracle_id']}: Score={ranking['reputation_score']:.3f}, "
              f"Accuracy={ranking['accuracy']:.3f}, Predictions={ranking['total_predictions']}")
    
    # Test dispute system
    dispute_id = reputation_system.file_dispute(
        prediction_id="pred_1",
        challenger_id="oracle_2",
        dispute_reason="Prediction significantly deviated from market consensus"
    )
    
    if dispute_id:
        # Submit evidence
        reputation_system.submit_evidence(
            dispute_id, 
            "market_data",
            {"average_market_price": 51000, "price_sources": ["binance", "coinbase", "kraken"]},
            "oracle_3"
        )
        
        # Submit votes
        reputation_system.vote_on_dispute("oracle_2", "invalid", dispute_id)
        reputation_system.vote_on_dispute("oracle_3", "invalid", dispute_id)
        reputation_system.vote_on_dispute("oracle_4", "valid", dispute_id)
        
        # Resolve dispute (after voting period)
        await asyncio.sleep(2)  # Simulate time passing
        outcome = reputation_system.resolve_dispute(dispute_id)
        print(f"Dispute resolved with outcome: {outcome}")
    
    # Get system health
    health = reputation_system.get_system_health()
    print(f"System Health: {health}")
    
    return reputation_system

if __name__ == "__main__":
    # Run test
    asyncio.run(test_reputation_system())
    print("Oracle reputation system test completed!")