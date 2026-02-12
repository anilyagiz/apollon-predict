"""
Oracle Validation System
Comprehensive validation framework for oracle predictions, data integrity, and consensus mechanisms
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging
import json
import statistics
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.exceptions import InvalidSignature

class ValidationLevel(Enum):
    BASIC = "basic"
    INTERMEDIATE = "intermediate" 
    COMPREHENSIVE = "comprehensive"
    CRITICAL = "critical"

class ValidationResult(Enum):
    VALID = "valid"
    WARNING = "warning"
    INVALID = "invalid"
    CRITICAL_FAILURE = "critical_failure"
    INSUFFICIENT_DATA = "insufficient_data"

@dataclass
class ValidationCheck:
    """Individual validation check result"""
    check_name: str
    check_type: str
    validation_level: ValidationLevel
    result: ValidationResult
    score: float  # 0.0 to 1.0
    message: str
    details: Dict[str, Any]
    timestamp: datetime
    oracle_id: Optional[str] = None

@dataclass
class OracleValidationReport:
    """Comprehensive validation report for oracle prediction"""
    prediction_id: str
    oracle_id: str
    overall_score: float
    validation_level: ValidationLevel
    validation_checks: List[ValidationCheck]
    consensus_status: str
    recommendation: str
    timestamp: datetime
    confidence_adjustment: float  # Multiplier for prediction confidence

class OracleValidationEngine:
    """
    Comprehensive oracle validation engine with multi-level checks
    """
    
    def __init__(self, 
                 reputation_system: Optional[Any] = None,
                 validation_level: ValidationLevel = ValidationLevel.COMPREHENSIVE,
                 consensus_threshold: float = 0.7,
                 outlier_threshold: float = 2.5,
                 minimum_oracles_for_consensus: int = 3):
        
        self.reputation_system = reputation_system
        self.validation_level = validation_level
        self.consensus_threshold = consensus_threshold
        self.outlier_threshold = outlier_threshold
        self.minimum_oracles_for_consensus = minimum_oracles_for_consensus
        
        self.logger = logging.getLogger(__name__)
        
        # Validation thresholds
        self.thresholds = {
            'minimum_confidence': 0.6,
            'maximum_deviation': 0.15,  # 15% deviation from consensus
            'minimum_data_points': 50,
            'maximum_prediction_age': 3600,  # 1 hour
            'minimum_reputation_score': 0.5,
            'maximum_volatility_ratio': 2.0,
            'minimum_market_correlation': 0.3
        }
        
        # Historical validation data
        self.validation_history: Dict[str, List[ValidationCheck]] = {}
        self.consensus_cache: Dict[str, Dict[str, Any]] = {}
        
        self.logger.info("Oracle Validation Engine initialized")
    
    async def validate_prediction(self, 
                                  prediction_data: Dict[str, Any],
                                  oracle_id: str,
                                  prediction_id: str,
                                  market_data: Optional[pd.DataFrame] = None,
                                  peer_predictions: Optional[List[Dict[str, Any]]] = None) -> OracleValidationReport:
        """
        Comprehensive validation of oracle prediction
        
        Args:
            prediction_data: Prediction details (value, confidence, timestamp, etc.)
            oracle_id: Oracle making the prediction
            prediction_id: Unique prediction identifier
            market_data: Current market data for validation
            peer_predictions: Predictions from other oracles for consensus
            
        Returns:
            Comprehensive validation report
        """
        validation_checks = []
        
        # Basic validations
        if self.validation_level in [ValidationLevel.BASIC, ValidationLevel.INTERMEDIATE, ValidationLevel.COMPREHENSIVE]:
            validation_checks.extend(await self._run_basic_validations(prediction_data, oracle_id))
        
        # Intermediate validations
        if self.validation_level in [ValidationLevel.INTERMEDIATE, ValidationLevel.COMPREHENSIVE]:
            validation_checks.extend(await self._run_intermediate_validations(prediction_data, oracle_id, market_data))
        
        # Comprehensive validations
        if self.validation_level == ValidationLevel.COMPREHENSIVE:
            validation_checks.extend(await self._run_comprehensive_validations(
                prediction_data, oracle_id, prediction_id, market_data, peer_predictions
            ))
        
        # Critical validations (always run)
        validation_checks.extend(await self._run_critical_validations(prediction_data, oracle_id))
        
        # Calculate overall score and consensus
        overall_score = self._calculate_overall_score(validation_checks)
        consensus_status = await self._evaluate_consensus(prediction_data, peer_predictions)
        confidence_adjustment = self._calculate_confidence_adjustment(validation_checks, consensus_status)
        
        # Generate recommendation
        recommendation = self._generate_recommendation(overall_score, consensus_status, validation_checks)
        
        # Create validation report
        report = OracleValidationReport(
            prediction_id=prediction_id,
            oracle_id=oracle_id,
            overall_score=overall_score,
            validation_level=self.validation_level,
            validation_checks=validation_checks,
            consensus_status=consensus_status,
            recommendation=recommendation,
            timestamp=datetime.now(),
            confidence_adjustment=confidence_adjustment
        )
        
        # Store validation history
        self.validation_history[prediction_id] = validation_checks
        
        self.logger.info(f"Validation completed for prediction {prediction_id}: Score={overall_score:.3f}")
        return report
    
    async def _run_basic_validations(self, prediction_data: Dict[str, Any], oracle_id: str) -> List[ValidationCheck]:
        """Basic validation checks"""
        checks = []
        
        # Check 1: Prediction completeness
        required_fields = ['predicted_value', 'confidence', 'timestamp', 'asset']
        missing_fields = [field for field in required_fields if field not in prediction_data]
        
        completeness_score = 1.0 if not missing_fields else (len(required_fields) - len(missing_fields)) / len(required_fields)
        checks.append(ValidationCheck(
            check_name="prediction_completeness",
            check_type="data_integrity",
            validation_level=ValidationLevel.BASIC,
            result=ValidationResult.VALID if completeness_score == 1.0 else ValidationResult.INVALID,
            score=completeness_score,
            message=f"Missing required fields: {missing_fields}" if missing_fields else "All required fields present",
            details={"missing_fields": missing_fields, "required_fields": required_fields},
            timestamp=datetime.now(),
            oracle_id=oracle_id
        ))
        
        # Check 2: Confidence range validation
        confidence = prediction_data.get('confidence', 0)
        confidence_valid = 0 <= confidence <= 1
        
        checks.append(ValidationCheck(
            check_name="confidence_range",
            check_type="data_integrity",
            validation_level=ValidationLevel.BASIC,
            result=ValidationResult.VALID if confidence_valid else ValidationResult.INVALID,
            score=1.0 if confidence_valid else 0.0,
            message=f"Confidence {confidence} is {'valid' if confidence_valid else 'invalid'} (must be 0-1)",
            details={"confidence": confidence, "valid_range": [0, 1]},
            timestamp=datetime.now(),
            oracle_id=oracle_id
        ))
        
        # Check 3: Oracle registration status
        oracle_registered = oracle_id in self.reputation_system.oracles if self.reputation_system else True
        oracle_active = (self.reputation_system.oracles[oracle_id].status == OracleStatus.ACTIVE 
                        if oracle_registered and self.reputation_system else True)
        
        registration_score = 1.0 if (oracle_registered and oracle_active) else 0.0
        
        checks.append(ValidationCheck(
            check_name="oracle_registration",
            check_type="authorization",
            validation_level=ValidationLevel.BASIC,
            result=ValidationResult.VALID if registration_score == 1.0 else ValidationResult.INVALID,
            score=registration_score,
            message=f"Oracle {oracle_id} is {'registered and active' if registration_score == 1.0 else 'not registered or inactive'}",
            details={"oracle_id": oracle_id, "registered": oracle_registered, "active": oracle_active},
            timestamp=datetime.now(),
            oracle_id=oracle_id
        ))
        
        return checks
    
    async def _run_intermediate_validations(self, prediction_data: Dict[str, Any], 
                                          oracle_id: str, market_data: Optional[pd.DataFrame]) -> List[ValidationCheck]:
        """Intermediate validation checks"""
        checks = []
        
        # Check 4: Oracle reputation score
        if self.reputation_system and oracle_id in self.reputation_system.oracles:
            oracle = self.reputation_system.oracles[oracle_id]
            reputation_score = oracle.reputation_score
            reputation_valid = reputation_score >= self.thresholds['minimum_reputation_score']
            
            checks.append(ValidationCheck(
                check_name="oracle_reputation",
                check_type="reputation",
                validation_level=ValidationLevel.INTERMEDIATE,
                result=ValidationResult.VALID if reputation_valid else ValidationResult.WARNING,
                score=reputation_score,
                message=f"Oracle reputation score: {reputation_score:.3f} (threshold: {self.thresholds['minimum_reputation_score']})",
                details={"reputation_score": reputation_score, "threshold": self.thresholds['minimum_reputation_score']},
                timestamp=datetime.now(),
                oracle_id=oracle_id
            ))
        
        # Check 5: Prediction age
        prediction_timestamp = prediction_data.get('timestamp')
        if prediction_timestamp:
            if isinstance(prediction_timestamp, str):
                prediction_timestamp = datetime.fromisoformat(prediction_timestamp)
            
            age_seconds = (datetime.now() - prediction_timestamp).total_seconds()
            age_valid = age_seconds <= self.thresholds['maximum_prediction_age']
            age_score = max(0, 1 - (age_seconds / self.thresholds['maximum_prediction_age']))
            
            checks.append(ValidationCheck(
                check_name="prediction_freshness",
                check_type="temporal",
                validation_level=ValidationLevel.INTERMEDIATE,
                result=ValidationResult.VALID if age_valid else ValidationResult.WARNING,
                score=age_score,
                message=f"Prediction age: {age_seconds:.0f}s (max: {self.thresholds['maximum_prediction_age']}s)",
                details={"age_seconds": age_seconds, "max_age": self.thresholds['maximum_prediction_age']},
                timestamp=datetime.now(),
                oracle_id=oracle_id
            ))
        
        # Check 6: Confidence threshold
        confidence = prediction_data.get('confidence', 0)
        confidence_valid = confidence >= self.thresholds['minimum_confidence']
        
        checks.append(ValidationCheck(
            check_name="confidence_threshold",
            check_type="quality",
            validation_level=ValidationLevel.INTERMEDIATE,
            result=ValidationResult.VALID if confidence_valid else ValidationResult.WARNING,
            score=confidence,
            message=f"Confidence: {confidence:.3f} (threshold: {self.thresholds['minimum_confidence']})",
            details={"confidence": confidence, "threshold": self.thresholds['minimum_confidence']},
            timestamp=datetime.now(),
            oracle_id=oracle_id
        ))
        
        return checks
    
    async def _run_comprehensive_validations(self, prediction_data: Dict[str, Any], 
                                           oracle_id: str, prediction_id: str,
                                           market_data: Optional[pd.DataFrame], 
                                           peer_predictions: Optional[List[Dict[str, Any]]]) -> List[ValidationCheck]:
        """Comprehensive validation checks"""
        checks = []
        
        # Check 7: Consensus validation
        if peer_predictions and len(peer_predictions) >= self.minimum_oracles_for_consensus:
            consensus_check = await self._validate_consensus(prediction_data, peer_predictions)
            checks.append(consensus_check)
        
        # Check 8: Statistical outlier detection
        if peer_predictions:
            outlier_check = self._detect_statistical_outlier(prediction_data, peer_predictions)
            checks.append(outlier_check)
        
        # Check 9: Market correlation validation
        if market_data is not None and len(market_data) >= self.thresholds['minimum_data_points']:
            market_correlation_check = await self._validate_market_correlation(prediction_data, market_data)
            checks.append(market_correlation_check)
        
        # Check 10: Volatility consistency
        if market_data is not None:
            volatility_check = await self._validate_volatility_consistency(prediction_data, market_data)
            checks.append(volatility_check)
        
        # Check 11: Historical accuracy consistency
        if self.reputation_system and oracle_id in self.reputation_system.oracles:
            historical_accuracy_check = await self._validate_historical_consistency(oracle_id)
            checks.append(historical_accuracy_check)
        
        return checks
    
    async def _run_critical_validations(self, prediction_data: Dict[str, Any], oracle_id: str) -> List[ValidationCheck]:
        """Critical validation checks that must pass"""
        checks = []
        
        # Check 12: Prediction value sanity
        predicted_value = prediction_data.get('predicted_value', 0)
        value_positive = predicted_value > 0
        value_reasonable = 0 < predicted_value < 1000000  # Reasonable price range
        
        checks.append(ValidationCheck(
            check_name="prediction_value_sanity",
            check_type="sanity",
            validation_level=ValidationLevel.CRITICAL,
            result=ValidationResult.VALID if (value_positive and value_reasonable) else ValidationResult.CRITICAL_FAILURE,
            score=1.0 if (value_positive and value_reasonable) else 0.0,
            message=f"Prediction value {predicted_value} is {'valid' if (value_positive and value_reasonable) else 'invalid'}",
            details={"predicted_value": predicted_value, "positive": value_positive, "reasonable": value_reasonable},
            timestamp=datetime.now(),
            oracle_id=oracle_id
        ))
        
        return checks
    
    async def _validate_consensus(self, prediction_data: Dict[str, Any], 
                                peer_predictions: List[Dict[str, Any]]) -> ValidationCheck:
        """Validate prediction against peer consensus"""
        predicted_value = prediction_data.get('predicted_value', 0)
        
        if not peer_predictions:
            return ValidationCheck(
                check_name="consensus_validation",
                check_type="consensus",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.INSUFFICIENT_DATA,
                score=0.5,
                message="Insufficient peer predictions for consensus validation",
                details={"peer_count": 0, "minimum_required": self.minimum_oracles_for_consensus},
                timestamp=datetime.now()
            )
        
        # Calculate consensus metrics
        peer_values = [p.get('predicted_value', 0) for p in peer_predictions]
        consensus_mean = statistics.mean(peer_values)
        consensus_median = statistics.median(peer_values)
        consensus_std = statistics.stdev(peer_values) if len(peer_values) > 1 else 0
        
        # Calculate deviation from consensus
        deviation_from_mean = abs(predicted_value - consensus_mean) / consensus_mean if consensus_mean != 0 else 0
        deviation_from_median = abs(predicted_value - consensus_median) / consensus_median if consensus_median != 0 else 0
        
        # Z-score calculation
        z_score = abs(predicted_value - consensus_mean) / consensus_std if consensus_std > 0 else 0
        
        # Determine validation result
        consensus_valid = (deviation_from_mean <= self.thresholds['maximum_deviation'] and 
                          z_score <= self.outlier_threshold)
        
        score = max(0, 1 - (deviation_from_mean / self.thresholds['maximum_deviation']))
        
        return ValidationCheck(
            check_name="consensus_validation",
            check_type="consensus",
            validation_level=ValidationLevel.COMPREHENSIVE,
            result=ValidationResult.VALID if consensus_valid else ValidationResult.WARNING,
            score=score,
            message=f"Deviation from consensus: {deviation_from_mean:.1%} (threshold: {self.thresholds['maximum_deviation']:.1%})",
            details={
                "predicted_value": predicted_value,
                "consensus_mean": consensus_mean,
                "consensus_median": consensus_median,
                "deviation_from_mean": deviation_from_mean,
                "deviation_from_median": deviation_from_median,
                "z_score": z_score,
                "peer_count": len(peer_predictions)
            },
            timestamp=datetime.now()
        )
    
    def _detect_statistical_outlier(self, prediction_data: Dict[str, Any], 
                                  peer_predictions: List[Dict[str, Any]]) -> ValidationCheck:
        """Detect statistical outliers using multiple methods"""
        predicted_value = prediction_data.get('predicted_value', 0)
        peer_values = [p.get('predicted_value', 0) for p in peer_predictions]
        
        if len(peer_values) < 3:
            return ValidationCheck(
                check_name="statistical_outlier_detection",
                check_type="statistical",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.INSUFFICIENT_DATA,
                score=0.5,
                message="Insufficient data for statistical outlier detection",
                details={"peer_count": len(peer_values), "minimum_required": 3},
                timestamp=datetime.now()
            )
        
        # IQR Method
        q1 = np.percentile(peer_values, 25)
        q3 = np.percentile(peer_values, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        iqr_outlier = not (lower_bound <= predicted_value <= upper_bound)
        
        # Z-Score Method
        mean_val = statistics.mean(peer_values)
        std_val = statistics.stdev(peer_values)
        z_score = abs(predicted_value - mean_val) / std_val if std_val > 0 else 0
        
        z_score_outlier = z_score > self.outlier_threshold
        
        # Modified Z-Score (using median)
        median_val = statistics.median(peer_values)
        mad = statistics.median([abs(x - median_val) for x in peer_values])
        modified_z_score = 0.6745 * (predicted_value - median_val) / mad if mad > 0 else 0
        
        modified_z_outlier = abs(modified_z_score) > self.outlier_threshold
        
        # Combine results
        is_outlier = iqr_outlier or z_score_outlier or modified_z_outlier
        score = 1.0 - (sum([iqr_outlier, z_score_outlier, modified_z_outlier]) / 3.0)
        
        return ValidationCheck(
            check_name="statistical_outlier_detection",
            check_type="statistical",
            validation_level=ValidationLevel.COMPREHENSIVE,
            result=ValidationResult.WARNING if is_outlier else ValidationResult.VALID,
            score=score,
            message=f"Statistical outlier detected: IQR={iqr_outlier}, Z-score={z_score_outlier}, Modified Z={modified_z_outlier}",
            details={
                "iqr_outlier": iqr_outlier,
                "z_score_outlier": z_score_outlier,
                "modified_z_outlier": modified_z_outlier,
                "z_score": z_score,
                "modified_z_score": modified_z_score,
                "iqr_bounds": [lower_bound, upper_bound]
            },
            timestamp=datetime.now()
        )
    
    async def _validate_market_correlation(self, prediction_data: Dict[str, Any], 
                                         market_data: pd.DataFrame) -> ValidationCheck:
        """Validate prediction against market correlation patterns"""
        # This is a simplified implementation - would need actual market correlation analysis
        predicted_value = prediction_data.get('predicted_value', 0)
        
        if len(market_data) < self.thresholds['minimum_data_points']:
            return ValidationCheck(
                check_name="market_correlation",
                check_type="market_analysis",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.INSUFFICIENT_DATA,
                score=0.5,
                message="Insufficient market data for correlation analysis",
                details={"data_points": len(market_data), "minimum_required": self.thresholds['minimum_data_points']},
                timestamp=datetime.now()
            )
        
        # Calculate recent market trend
        if 'price' in market_data.columns and len(market_data) > 10:
            recent_prices = market_data['price'].tail(10)
            market_trend = (recent_prices.iloc[-1] - recent_prices.iloc[0]) / recent_prices.iloc[0]
            
            # Simple correlation check (would be more sophisticated in production)
            current_price = recent_prices.iloc[-1]
            predicted_change = (predicted_value - current_price) / current_price if current_price != 0 else 0
            
            # Check if prediction aligns with market trend
            trend_alignment = (market_trend > 0 and predicted_change > 0) or (market_trend < 0 and predicted_change < 0)
            
            correlation_score = abs(market_trend - predicted_change) / abs(market_trend) if market_trend != 0 else 0
            correlation_valid = correlation_score <= self.thresholds['minimum_market_correlation']
            
            score = 1.0 - correlation_score
            
            return ValidationCheck(
                check_name="market_correlation",
                check_type="market_analysis",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.VALID if correlation_valid else ValidationResult.WARNING,
                score=score,
                message=f"Market correlation: {correlation_score:.3f} (trend_alignment: {trend_alignment})",
                details={
                    "market_trend": market_trend,
                    "predicted_change": predicted_change,
                    "trend_alignment": trend_alignment,
                    "correlation_score": correlation_score,
                    "current_price": current_price
                },
                timestamp=datetime.now()
            )
        
        return ValidationCheck(
            check_name="market_correlation",
            check_type="market_analysis",
            validation_level=ValidationLevel.COMPREHENSIVE,
            result=ValidationResult.INSUFFICIENT_DATA,
            score=0.5,
            message="No price data available for market correlation",
            details={},
            timestamp=datetime.now()
        )
    
    async def _validate_volatility_consistency(self, prediction_data: Dict[str, Any], 
                                             market_data: pd.DataFrame) -> ValidationCheck:
        """Validate prediction volatility consistency with market"""
        predicted_value = prediction_data.get('predicted_value', 0)
        
        if 'price' in market_data.columns and len(market_data) > 20:
            recent_prices = market_data['price'].tail(20)
            
            # Calculate historical volatility
            price_changes = recent_prices.pct_change().dropna()
            historical_volatility = price_changes.std() if len(price_changes) > 1 else 0
            
            # Calculate predicted volatility (would need prediction uncertainty)
            predicted_volatility = prediction_data.get('volatility_estimate', historical_volatility * 1.1)
            
            # Check volatility consistency
            volatility_ratio = predicted_volatility / historical_volatility if historical_volatility > 0 else 1.0
            volatility_valid = volatility_ratio <= self.thresholds['maximum_volatility_ratio']
            
            score = 1.0 - min(1.0, abs(volatility_ratio - 1.0) / self.thresholds['maximum_volatility_ratio'])
            
            return ValidationCheck(
                check_name="volatility_consistency",
                check_type="volatility_analysis",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.VALID if volatility_valid else ValidationResult.WARNING,
                score=score,
                message=f"Volatility ratio: {volatility_ratio:.3f} (historical: {historical_volatility:.4f}, predicted: {predicted_volatility:.4f})",
                details={
                    "historical_volatility": historical_volatility,
                    "predicted_volatility": predicted_volatility,
                    "volatility_ratio": volatility_ratio,
                    "recent_price_std": recent_prices.std()
                },
                timestamp=datetime.now()
            )
        
        return ValidationCheck(
            check_name="volatility_consistency",
            check_type="volatility_analysis",
            validation_level=ValidationLevel.COMPREHENSIVE,
            result=ValidationResult.INSUFFICIENT_DATA,
            score=0.5,
            message="Insufficient market data for volatility analysis",
            details={},
            timestamp=datetime.now()
        )
    
    async def _validate_historical_consistency(self, oracle_id: str) -> ValidationCheck:
        """Validate oracle's historical prediction consistency"""
        if not self.reputation_system or oracle_id not in self.reputation_system.oracles:
            return ValidationCheck(
                check_name="historical_consistency",
                check_type="historical_analysis",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.INSUFFICIENT_DATA,
                score=0.5,
                message="No reputation system or oracle data available",
                details={},
                timestamp=datetime.now()
            )
        
        oracle = self.reputation_system.oracles[oracle_id]
        
        if oracle.total_predictions < 5:
            return ValidationCheck(
                check_name="historical_consistency",
                check_type="historical_analysis",
                validation_level=ValidationLevel.COMPREHENSIVE,
                result=ValidationResult.INSUFFICIENT_DATA,
                score=0.7,
                message=f"Insufficient prediction history (only {oracle.total_predictions} predictions)",
                details={"total_predictions": oracle.total_predictions, "minimum_required": 5},
                timestamp=datetime.now()
            )
        
        # Calculate consistency metrics
        recent_accuracy = oracle.average_accuracy
        recent_confidence = oracle.average_confidence
        
        # Check for sudden accuracy drops
        accuracy_consistency = recent_accuracy >= 0.6  # Minimum acceptable accuracy
        confidence_consistency = recent_confidence >= 0.5  # Minimum acceptable confidence
        
        # Calculate consistency score
        consistency_score = (recent_accuracy + recent_confidence) / 2.0
        
        return ValidationCheck(
            check_name="historical_consistency",
            check_type="historical_analysis",
            validation_level=ValidationLevel.COMPREHENSIVE,
            result=ValidationResult.VALID if (accuracy_consistency and confidence_consistency) else ValidationResult.WARNING,
            score=consistency_score,
            message=f"Historical consistency: accuracy={recent_accuracy:.3f}, confidence={recent_confidence:.3f}",
            details={
                "recent_accuracy": recent_accuracy,
                "recent_confidence": recent_confidence,
                "accuracy_consistency": accuracy_consistency,
                "confidence_consistency": confidence_consistency,
                "total_predictions": oracle.total_predictions
            },
            timestamp=datetime.now()
        )
    
    async def _evaluate_consensus(self, prediction_data: Dict[str, Any], 
                                peer_predictions: Optional[List[Dict[str, Any]]]) -> str:
        """Evaluate consensus status among peer predictions"""
        if not peer_predictions or len(peer_predictions) < self.minimum_oracles_for_consensus:
            return "insufficient_peers"
        
        predicted_value = prediction_data.get('predicted_value', 0)
        peer_values = [p.get('predicted_value', 0) for p in peer_predictions]
        
        # Calculate consensus statistics
        consensus_mean = statistics.mean(peer_values)
        consensus_std = statistics.stdev(peer_values) if len(peer_values) > 1 else 0
        
        # Check if prediction is within consensus range
        deviation = abs(predicted_value - consensus_mean) / consensus_mean if consensus_mean != 0 else 0
        
        if deviation <= 0.05:  # Within 5% of consensus
            return "strong_consensus"
        elif deviation <= 0.10:  # Within 10% of consensus
            return "moderate_consensus"
        elif deviation <= 0.15:  # Within 15% of consensus
            return "weak_consensus"
        else:
            return "outlier"
    
    def _calculate_overall_score(self, validation_checks: List[ValidationCheck]) -> float:
        """Calculate overall validation score"""
        if not validation_checks:
            return 0.0
        
        # Weight different validation levels
        weights = {
            ValidationLevel.BASIC: 0.3,
            ValidationLevel.INTERMEDIATE: 0.25,
            ValidationLevel.COMPREHENSIVE: 0.25,
            ValidationLevel.CRITICAL: 0.2
        }
        
        weighted_scores = []
        for check in validation_checks:
            weight = weights.get(check.validation_level, 0.1)
            weighted_scores.append(check.score * weight)
        
        return sum(weighted_scores) / sum(weights.values())
    
    def _calculate_confidence_adjustment(self, validation_checks: List[ValidationCheck], 
                                       consensus_status: str) -> float:
        """Calculate confidence adjustment based on validation results"""
        # Base adjustment from validation scores
        valid_checks = [c for c in validation_checks if c.result == ValidationResult.VALID]
        warning_checks = [c for c in validation_checks if c.result == ValidationResult.WARNING]
        invalid_checks = [c for c in validation_checks if c.result == ValidationResult.INVALID]
        
        # Calculate base adjustment
        if invalid_checks:
            base_adjustment = 0.5  # Significant reduction for invalid checks
        elif warning_checks:
            base_adjustment = 0.8  # Moderate reduction for warnings
        else:
            base_adjustment = 1.0  # No reduction for all valid
        
        # Consensus adjustment
        consensus_adjustments = {
            "strong_consensus": 1.0,
            "moderate_consensus": 0.95,
            "weak_consensus": 0.85,
            "outlier": 0.7,
            "insufficient_peers": 0.9
        }
        
        consensus_adjustment = consensus_adjustments.get(consensus_status, 0.9)
        
        return base_adjustment * consensus_adjustment
    
    def _generate_recommendation(self, overall_score: float, consensus_status: str, 
                               validation_checks: List[ValidationCheck]) -> str:
        """Generate recommendation based on validation results"""
        if overall_score >= 0.9:
            return "ACCEPT: High confidence prediction with strong validation"
        elif overall_score >= 0.7:
            return "ACCEPT: Good prediction with minor concerns"
        elif overall_score >= 0.5:
            return "REVIEW: Prediction requires additional validation"
        else:
            return "REJECT: Prediction failed critical validation checks"
    
    def get_validation_summary(self, oracle_id: str, time_window_hours: int = 24) -> Dict[str, Any]:
        """Get validation summary for specific oracle"""
        recent_validations = []
        
        # Filter validation history for this oracle
        for prediction_id, checks in self.validation_history.items():
            oracle_checks = [c for c in checks if c.oracle_id == oracle_id]
            if oracle_checks:
                # Check if within time window
                latest_check = max(oracle_checks, key=lambda x: x.timestamp)
                if (datetime.now() - latest_check.timestamp).total_seconds() / 3600 <= time_window_hours:
                    recent_validations.extend(oracle_checks)
        
        if not recent_validations:
            return {
                "oracle_id": oracle_id,
                "validation_count": 0,
                "average_score": 0.0,
                "valid_percentage": 0.0,
                "warning_percentage": 0.0,
                "invalid_percentage": 0.0,
                "most_common_issues": []
            }
        
        # Calculate summary statistics
        total_checks = len(recent_validations)
        valid_checks = len([c for c in recent_validations if c.result == ValidationResult.VALID])
        warning_checks = len([c for c in recent_validations if c.result == ValidationResult.WARNING])
        invalid_checks = len([c for c in recent_validations if c.result == ValidationResult.INVALID])
        
        average_score = statistics.mean([c.score for c in recent_validations])
        
        # Identify most common issues
        issue_counts = {}
        for check in recent_validations:
            if check.result != ValidationResult.VALID:
                issue_counts[check.check_name] = issue_counts.get(check.check_name, 0) + 1
        
        most_common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "oracle_id": oracle_id,
            "validation_count": total_checks,
            "average_score": average_score,
            "valid_percentage": valid_checks / total_checks,
            "warning_percentage": warning_checks / total_checks,
            "invalid_percentage": invalid_checks / total_checks,
            "most_common_issues": most_common_issues,
            "time_window_hours": time_window_hours
        }

# Example usage and testing
async def test_oracle_validation():
    """Test the oracle validation system"""
    
    print("🔍 Testing Oracle Validation Engine...")
    
    # Initialize validation engine
    validation_engine = OracleValidationEngine(
        reputation_system=None,  # Would be actual reputation system
        validation_level=ValidationLevel.COMPREHENSIVE,
        consensus_threshold=0.7,
        outlier_threshold=2.5,
        minimum_oracles_for_consensus=3
    )
    
    # Create test prediction data
    test_prediction = {
        "predicted_value": 51000.0,
        "confidence": 0.85,
        "timestamp": datetime.now().isoformat(),
        "asset": "BTC",
        "volatility_estimate": 0.02,
        "model_contributions": {"lstm": 0.4, "gru": 0.3, "prophet": 0.2, "xgboost": 0.1}
    }
    
    # Create peer predictions for consensus testing
    peer_predictions = [
        {"predicted_value": 50800.0, "confidence": 0.82},
        {"predicted_value": 51200.0, "confidence": 0.88},
        {"predicted_value": 50950.0, "confidence": 0.79},
        {"predicted_value": 51100.0, "confidence": 0.91},
        {"predicted_value": 50750.0, "confidence": 0.76}
    ]
    
    # Create test market data
    dates = pd.date_range(start=datetime.now() - timedelta(hours=50), periods=50, freq='H')
    market_data = pd.DataFrame({
        'timestamp': dates,
        'price': 50000 + np.cumsum(np.random.randn(50) * 100),
        'volume': np.random.randint(1000000, 10000000, 50),
        'high': 50000 + np.cumsum(np.random.randn(50) * 150) + 200,
        'low': 50000 + np.cumsum(np.random.randn(50) * 150) - 200
    })
    market_data.set_index('timestamp', inplace=True)
    
    # Run validation
    print("Running comprehensive validation...")
    validation_report = await validation_engine.validate_prediction(
        prediction_data=test_prediction,
        oracle_id="test_oracle_1",
        prediction_id="test_pred_123",
        market_data=market_data,
        peer_predictions=peer_predictions
    )
    
    # Print results
    print(f"\n📊 Validation Report:")
    print(f"  Overall Score: {validation_report.overall_score:.3f}")
    print(f"  Consensus Status: {validation_report.consensus_status}")
    print(f"  Confidence Adjustment: {validation_report.confidence_adjustment:.3f}")
    print(f"  Recommendation: {validation_report.recommendation}")
    
    print(f"\n🔍 Validation Checks ({len(validation_report.validation_checks)} total):")
    for check in validation_report.validation_checks:
        status_emoji = "✅" if check.result == ValidationResult.VALID else "⚠️" if check.result == ValidationResult.WARNING else "❌"
        print(f"  {status_emoji} {check.check_name}: {check.score:.3f} - {check.message}")
    
    print("\n✅ Oracle validation test completed!")
    return validation_engine

if __name__ == "__main__":
    # Run test
    asyncio.run(test_oracle_validation())