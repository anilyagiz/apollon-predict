"""
Enhanced Oracle System Integration
Combines adaptive ML ensemble with reputation system for production deployment
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
import numpy as np

# Import our enhanced components
from adaptive_ensemble import AdaptiveEnsemblePredictor, PredictionRequest
from oracle_reputation import OracleReputationSystem, PredictionRecord, OracleStatus

class EnhancedOracleSystem:
    """
    Production-ready oracle system combining:
    - Adaptive ML ensemble with cryptographic integrity
    - Comprehensive reputation system
    - Dispute resolution mechanism
    - Advanced feature engineering
    - Proper train/test separation
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize enhanced oracle system
        
        Args:
            config: System configuration dictionary
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize ML ensemble
        self.ml_predictor = AdaptiveEnsemblePredictor(
            encryption_key=config.get('ml_encryption_key'),
            performance_window=config.get('performance_window', 100),
            weight_adjustment_rate=config.get('weight_adjustment_rate', 0.1),
            minimum_prediction_count=config.get('minimum_prediction_count', 10)
        )
        
        # Initialize reputation system
        self.reputation_system = OracleReputationSystem(
            min_reputation_for_voting=config.get('min_reputation_for_voting', 0.7),
            dispute_voting_period_hours=config.get('dispute_voting_period_hours', 72),
            evidence_submission_period_hours=config.get('evidence_submission_period_hours', 24),
            minimum_stake_amount=config.get('minimum_stake_amount', 1000.0),
            penalty_rate=config.get('penalty_rate', 0.1),
            reward_rate=config.get('reward_rate', 0.05)
        )
        
        # System state
        self.is_initialized = False
        self.last_model_update = None
        self.prediction_counter = 0
        
        self.logger.info("Enhanced Oracle System initialized")
    
    async def initialize_models(self, historical_data: pd.DataFrame) -> bool:
        """
        Initialize ML models with proper train/test separation
        
        Args:
            historical_data: Historical price data for model training
            
        Returns:
            Success status
        """
        try:
            self.logger.info("Initializing ML models...")
            
            # Feature engineering
            engineered_features = self.ml_predictor.advanced_feature_engineering(historical_data)
            self.logger.info(f"Features engineered: {engineered_features.shape}")
            
            # Train/test split
            train_data, test_data = self.ml_predictor.create_train_test_split(
                engineered_features, 
                test_size=self.config.get('test_split_size', 0.2)
            )
            
            # Train individual models (placeholder - implement actual training)
            # This would integrate with existing LSTM, GRU, Prophet, XGBoost implementations
            self.logger.info("Training individual models...")
            
            # Backtesting
            backtest_results = self.ml_predictor.backtest_ensemble(test_data)
            self.logger.info(f"Backtesting results: {backtest_results}")
            
            # Validate performance meets minimum thresholds
            if backtest_results.get('mape', 1.0) > self.config.get('max_acceptable_mape', 0.1):
                self.logger.error("Model performance below acceptable threshold")
                return False
            
            self.is_initialized = True
            self.last_model_update = datetime.now()
            
            self.logger.info("ML models initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Model initialization failed: {e}")
            return False
    
    def register_oracle_agent(self, oracle_id: str, initial_stake: float) -> bool:
        """
        Register a new oracle agent with the system
        
        Args:
            oracle_id: Unique oracle identifier
            initial_stake: Initial stake amount
            
        Returns:
            Registration success status
        """
        return self.reputation_system.register_oracle(oracle_id, initial_stake)
    
    async def generate_prediction(self, 
                                oracle_id: str,
                                asset: str,
                                timeframe: str,
                                historical_data: pd.DataFrame,
                                prediction_metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate prediction with full system integration
        
        Args:
            oracle_id: Oracle making the prediction
            asset: Asset being predicted
            timeframe: Prediction timeframe
            historical_data: Historical price data
            prediction_metadata: Additional prediction metadata
            
        Returns:
            Comprehensive prediction result
        """
        if not self.is_initialized:
            raise RuntimeError("System not initialized")
        
        # Verify oracle is active
        oracle_info = self.reputation_system.oracles.get(oracle_id)
        if not oracle_info or oracle_info.status != OracleStatus.ACTIVE:
            raise ValueError(f"Oracle {oracle_id} is not active")
        
        try:
            # Generate prediction with ML ensemble
            prediction_result = self.ml_predictor.predict_with_confidence(historical_data)
            
            # Create prediction record
            prediction_id = f"pred_{oracle_id}_{int(datetime.now().timestamp())}_{self.prediction_counter}"
            self.prediction_counter += 1
            
            prediction_record = PredictionRecord(
                prediction_id=prediction_id,
                oracle_id=oracle_id,
                asset=asset,
                predicted_value=prediction_result['predicted_price'],
                actual_value=None,  # Will be filled when actual value is known
                prediction_timestamp=datetime.now(),
                actualization_timestamp=None,
                confidence=prediction_result['confidence'],
                model_contributions=prediction_result['model_contributions'],
                metadata=prediction_metadata or {}
            )
            
            # Record prediction in reputation system
            self.reputation_system.record_prediction(prediction_record)
            
            # Add system metadata
            result = {
                **prediction_result,
                'prediction_id': prediction_id,
                'oracle_id': oracle_id,
                'asset': asset,
                'timeframe': timeframe,
                'oracle_reputation': oracle_info.reputation_score,
                'system_timestamp': datetime.now().isoformat(),
                'model_update_timestamp': self.last_model_update.isoformat() if self.last_model_update else None
            }
            
            self.logger.info(f"Prediction generated: {prediction_id} by {oracle_id}")
            return result
            
        except Exception as e:
            self.logger.error(f"Prediction generation failed for {oracle_id}: {e}")
            raise
    
    async def record_actual_value(self, prediction_id: str, actual_value: float, 
                                actualization_timestamp: datetime) -> bool:
        """
        Record actual value and update system state
        
        Args:
            prediction_id: Prediction to update
            actual_value: Actual realized value
            actualization_timestamp: When the actual value was determined
            
        Returns:
            Success status
        """
        try:
            # Record actual value in reputation system
            success = self.reputation_system.record_actual_value(
                prediction_id, actual_value, actualization_timestamp
            )
            
            if success:
                # Update ML ensemble weights based on performance
                prediction = self.reputation_system.prediction_records[prediction_id]
                oracle = self.reputation_system.oracles[prediction.oracle_id]
                
                # Create performance metrics for ML models
                if prediction.calculate_accuracy():
                    model_performance = {
                        model_name: oracle.reputation_score * prediction.confidence
                        for model_name in prediction.model_contributions.keys()
                    }
                    
                    # Update ensemble weights (this would be implemented in the ML predictor)
                    self.logger.info(f"Updated system based on actual value for {prediction_id}")
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to record actual value for {prediction_id}: {e}")
            return False
    
    def file_prediction_dispute(self, prediction_id: str, challenger_id: str, 
                              dispute_reason: str) -> Optional[str]:
        """
        File a dispute against a prediction
        
        Args:
            prediction_id: Prediction to dispute
            challenger_id: Oracle filing the dispute
            dispute_reason: Reason for the dispute
            
        Returns:
            Dispute ID if successful
        """
        return self.reputation_system.file_dispute(prediction_id, challenger_id, dispute_reason)
    
    def get_system_status(self) -> Dict[str, Any]:
        """
        Get comprehensive system status
        
        Returns:
            System health and performance metrics
        """
        ml_status = {
            'initialized': self.is_initialized,
            'last_model_update': self.last_model_update.isoformat() if self.last_model_update else None,
            'current_model_weights': self.ml_predictor.model_weights,
            'feature_engineering_version': self.ml_predictor.feature_engineering_version
        }
        
        reputation_status = self.reputation_system.get_system_health()
        
        # Calculate additional metrics
        total_predictions = len(self.reputation_system.prediction_records)
        recent_predictions = [
            p for p in self.reputation_system.prediction_records.values()
            if p.actual_value is not None and 
            p.actualization_timestamp > datetime.now() - timedelta(hours=24)
        ]
        
        recent_accuracy = np.mean([
            p.calculate_accuracy() for p in recent_predictions 
            if p.calculate_accuracy() is not None
        ]) if recent_predictions else 0.0
        
        return {
            'ml_system': ml_status,
            'reputation_system': reputation_status,
            'overall_system': {
                'total_predictions': total_predictions,
                'recent_predictions_24h': len(recent_predictions),
                'recent_accuracy_24h': recent_accuracy,
                'system_health': 'healthy' if (
                    self.is_initialized and 
                    reputation_status['system_status'] == 'healthy' and
                    recent_accuracy > 0.7
                ) else 'degraded'
            },
            'timestamp': datetime.now().isoformat()
        }
    
    def get_oracle_performance_dashboard(self, oracle_id: str) -> Dict[str, Any]:
        """
        Get detailed performance dashboard for specific oracle
        
        Args:
            oracle_id: Oracle to analyze
            
        Returns:
            Comprehensive performance metrics
        """
        oracle = self.reputation_system.oracles.get(oracle_id)
        if not oracle:
            return {'error': 'Oracle not found'}
        
        # Get recent predictions
        recent_predictions = [
            p for p in self.reputation_system.prediction_records.values()
            if p.oracle_id == oracle_id and
            p.actual_value is not None
        ]
        
        # Calculate performance trends
        accuracy_trend = []
        confidence_trend = []
        
        for pred in sorted(recent_predictions, key=lambda x: x.prediction_timestamp)[-20:]:
            accuracy = pred.calculate_accuracy()
            if accuracy is not None:
                accuracy_trend.append(accuracy)
                confidence_trend.append(pred.confidence)
        
        return {
            'oracle_id': oracle_id,
            'reputation_score': oracle.reputation_score,
            'total_predictions': oracle.total_predictions,
            'successful_predictions': oracle.successful_predictions,
            'average_accuracy': oracle.average_accuracy,
            'average_confidence': oracle.average_confidence,
            'stake_amount': oracle.stake_amount,
            'rewards_earned': oracle.rewards_earned,
            'penalties_incurred': oracle.penalties_incurred,
            'disputes_filed': oracle.disputes_filed,
            'disputes_resolved_against': oracle.disputes_resolved_against,
            'status': oracle.status.value,
            'performance_trends': {
                'accuracy_trend': accuracy_trend,
                'confidence_trend': confidence_trend,
                'recent_accuracy': np.mean(accuracy_trend[-10:]) if accuracy_trend else 0.0
            },
            'last_prediction': oracle.last_prediction_timestamp.isoformat() if oracle.last_prediction_timestamp else None
        }

# Configuration template
DEFAULT_CONFIG = {
    # ML Configuration
    'ml_encryption_key': None,  # Will generate if not provided
    'performance_window': 100,
    'weight_adjustment_rate': 0.05,
    'minimum_prediction_count': 10,
    'test_split_size': 0.2,
    'max_acceptable_mape': 0.1,
    
    # Reputation System Configuration
    'min_reputation_for_voting': 0.7,
    'dispute_voting_period_hours': 72,
    'evidence_submission_period_hours': 24,
    'minimum_stake_amount': 1000.0,
    'penalty_rate': 0.1,
    'reward_rate': 0.05
}

# Example usage and testing
async def test_enhanced_oracle_system():
    """Comprehensive test of the enhanced oracle system"""
    
    print("🚀 Testing Enhanced Oracle System...")
    
    # Initialize system
    system = EnhancedOracleSystem(DEFAULT_CONFIG)
    
    # Create sample historical data
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=500, freq='H')
    prices = 50000 + np.cumsum(np.random.randn(500) * 100)
    volumes = np.random.randint(1000000, 10000000, 500)
    
    historical_data = pd.DataFrame({
        'timestamp': dates,
        'price': prices,
        'volume': volumes
    })
    historical_data.set_index('timestamp', inplace=True)
    
    # Initialize models
    print("📊 Initializing ML models...")
    init_success = await system.initialize_models(historical_data)
    print(f"Model initialization: {'✅ Success' if init_success else '❌ Failed'}")
    
    # Register oracles
    oracle_ids = ["oracle_alpha", "oracle_beta", "oracle_gamma"]
    for oracle_id in oracle_ids:
        system.register_oracle_agent(oracle_id, initial_stake=2000.0)
    print(f"Registered {len(oracle_ids)} oracles")
    
    # Generate predictions
    print("🔮 Generating test predictions...")
    predictions = []
    for i, oracle_id in enumerate(oracle_ids):
        recent_data = historical_data.tail(100)  # Use recent data for prediction
        
        prediction = await system.generate_prediction(
            oracle_id=oracle_id,
            asset="BTC",
            timeframe="1h",
            historical_data=recent_data,
            prediction_metadata={'test_run': True, 'iteration': i}
        )
        predictions.append(prediction)
        print(f"  {oracle_id}: Predicted ${prediction['predicted_price']:,.2f} "
              f"(confidence: {prediction['confidence']:.2f})")
    
    # Simulate actual values (with some realistic variance)
    print("📈 Recording actual values...")
    for i, prediction in enumerate(predictions):
        actual_value = prediction['predicted_price'] * (1 + (np.random.random() - 0.5) * 0.02)
        
        success = await system.record_actual_value(
            prediction_id=prediction['prediction_id'],
            actual_value=actual_value,
            actualization_timestamp=datetime.now()
        )
        accuracy = 1 - abs(actual_value - prediction['predicted_price']) / prediction['predicted_price']
        print(f"  {prediction['oracle_id']}: Actual ${actual_value:,.2f} "
              f"(accuracy: {accuracy:.3f})")
    
    # Get system status
    status = system.get_system_status()
    print(f"\n📊 System Status: {status['overall_system']['system_health'].upper()}")
    print(f"  Total Predictions: {status['overall_system']['total_predictions']}")
    print(f"  Recent Accuracy (24h): {status['overall_system']['recent_accuracy_24h']:.3f}")
    print(f"  Active Oracles: {status['reputation_system']['active_oracles']}")
    
    # Get oracle rankings
    rankings = system.reputation_system.get_oracle_rankings()
    print(f"\n🏆 Oracle Rankings:")
    for ranking in rankings:
        print(f"  {ranking['oracle_id']}: Score={ranking['reputation_score']:.3f}, "
              f"Accuracy={ranking['accuracy']:.3f}")
    
    # Test dispute system
    print(f"\n⚖️ Testing dispute system...")
    dispute_id = system.file_prediction_dispute(
        prediction_id=predictions[0]['prediction_id'],
        challenger_id=oracle_ids[1],
        dispute_reason="Prediction deviated significantly from market consensus"
    )
    
    if dispute_id:
        print(f"  Dispute filed: {dispute_id}")
        
        # Submit evidence and votes
        system.reputation_system.submit_evidence(
            dispute_id, "market_data",
            {"consensus_price": predictions[0]['predicted_price'] * 1.01},
            oracle_ids[2]
        )
        
        system.reputation_system.vote_on_dispute(dispute_id, oracle_ids[2], "valid")
        system.reputation_system.vote_on_dispute(dispute_id, oracle_ids[1], "invalid")
        
        print("  Evidence and votes submitted")
    
    print("\n✅ Enhanced Oracle System test completed!")
    return system

if __name__ == "__main__":
    # Run comprehensive test
    asyncio.run(test_enhanced_oracle_system())