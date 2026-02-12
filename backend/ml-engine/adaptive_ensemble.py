"""
Adaptive Ensemble ML Prediction Engine with Reputation System
Addresses critical issues: naive ensemble weights, data leakage, model integrity
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
import hashlib
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from cryptography.fernet import Fernet
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, mean_squared_error, mean_absolute_percentage_error
import warnings
warnings.filterwarnings('ignore')

@dataclass
class ModelPerformance:
    """Tracks individual model performance over time"""
    model_name: str
    recent_mae: float
    recent_rmse: float
    recent_mape: float
    prediction_count: int
    successful_predictions: int
    average_confidence: float
    last_updated: datetime

@dataclass
class PredictionRequest:
    """Structured prediction request with validation"""
    asset: str
    timeframe: str
    historical_data: pd.DataFrame
    feature_engineering_version: str
    request_timestamp: datetime
    request_id: str

class AdaptiveEnsemblePredictor:
    """
    Advanced ensemble predictor with:
    - Adaptive weighting based on recent performance
    - Cryptographic model integrity verification
    - Proper train/test separation
    - Comprehensive feature engineering
    - Performance tracking and backtesting
    """
    
    def __init__(self, 
                 encryption_key: Optional[bytes] = None,
                 performance_window: int = 100,
                 weight_adjustment_rate: float = 0.1,
                 minimum_prediction_count: int = 10):
        """
        Initialize adaptive ensemble predictor
        
        Args:
            encryption_key: Key for model integrity verification
            performance_window: Number of recent predictions to track
            weight_adjustment_rate: How quickly weights adapt to performance changes
            minimum_prediction_count: Minimum predictions before weight adjustment
        """
        self.encryption_key = encryption_key or Fernet.generate_key()
        self.cipher = Fernet(self.encryption_key)
        self.performance_window = performance_window
        self.weight_adjustment_rate = weight_adjustment_rate
        self.minimum_prediction_count = minimum_prediction_count
        
        # Initialize models and performance tracking
        self.models = {}
        self.model_weights = {
            'lstm': 0.25,
            'gru': 0.25, 
            'prophet': 0.25,
            'xgboost': 0.25
        }
        self.model_performance = {}
        self.prediction_history = []
        self.feature_engineering_version = "v1.0.0"
        
        # Data pipeline integrity
        self.train_test_splitter = TimeSeriesSplit(n_splits=5)
        self.is_trained = False
        self.model_hashes = {}
        
        # Setup logging
        self.logger = logging.getLogger(__name__)
        
    def generate_model_signature(self, model_path: str) -> str:
        """Generate cryptographic signature for model integrity"""
        with open(model_path, 'rb') as f:
            model_data = f.read()
        return hashlib.sha256(model_data + self.encryption_key).hexdigest()
    
    def verify_model_integrity(self, model_path: str, expected_signature: str) -> bool:
        """Verify model hasn't been tampered with"""
        actual_signature = self.generate_model_signature(model_path)
        return actual_signature == expected_signature
    
    def create_secure_model_package(self, model, model_path: str, metadata: Dict) -> str:
        """Create encrypted model package with integrity verification"""
        # Save model temporarily
        temp_path = f"{model_path}.temp"
        joblib.dump(model, temp_path)
        
        # Generate signature
        signature = self.generate_model_signature(temp_path)
        
        # Create metadata package
        package = {
            'model_signature': signature,
            'metadata': metadata,
            'timestamp': datetime.now().isoformat(),
            'feature_version': self.feature_engineering_version
        }
        
        # Encrypt package
        encrypted_package = self.cipher.encrypt(json.dumps(package).encode())
        
        # Save encrypted package alongside model
        package_path = f"{model_path}.secure"
        with open(package_path, 'wb') as f:
            f.write(encrypted_package)
        
        # Move temp file to final location
        import os
        os.replace(temp_path, model_path)
        
        return signature
    
    def load_secure_model(self, model_path: str, expected_signature: str):
        """Load model with integrity verification"""
        if not self.verify_model_integrity(model_path, expected_signature):
            raise ValueError(f"Model integrity check failed for {model_path}")
        
        # Load and verify package metadata
        package_path = f"{model_path}.secure"
        if not os.path.exists(package_path):
            raise ValueError(f"Secure package not found for {model_path}")
        
        with open(package_path, 'rb') as f:
            encrypted_package = f.read()
        
        package = json.loads(self.cipher.decrypt(encrypted_package).decode())
        
        # Verify feature version compatibility
        if package['feature_version'] != self.feature_engineering_version:
            self.logger.warning(f"Feature version mismatch: expected {self.feature_engineering_version}, got {package['feature_version']}")
        
        # Load model
        return joblib.load(model_path), package['metadata']
    
    def advanced_feature_engineering(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Comprehensive feature engineering beyond basic price data
        
        Args:
            df: DataFrame with basic price data
            
        Returns:
            DataFrame with engineered features
        """
        df = df.copy()
        
        # Time-based features
        df['hour'] = df.index.hour
        df['day_of_week'] = df.index.dayofweek
        df['month'] = df.index.month
        df['quarter'] = df.index.quarter
        
        # Advanced technical indicators
        # MACD
        exp1 = df['price'].ewm(span=12).mean()
        exp2 = df['price'].ewm(span=26).mean()
        df['macd'] = exp1 - exp2
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        df['macd_histogram'] = df['macd'] - df['macd_signal']
        
        # Stochastic Oscillator
        low_14 = df['price'].rolling(window=14).min()
        high_14 = df['price'].rolling(window=14).max()
        df['stoch_k'] = 100 * ((df['price'] - low_14) / (high_14 - low_14))
        df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()
        
        # Average True Range (volatility)
        df['tr1'] = abs(df['price'] - df['price'].shift(1))
        df['tr2'] = abs(df['price'] - df['price'].rolling(window=1).max())
        df['tr3'] = abs(df['price'] - df['price'].rolling(window=1).min())
        df['true_range'] = df[['tr1', 'tr2', 'tr3']].max(axis=1)
        df['atr'] = df['true_range'].rolling(window=14).mean()
        
        # Volume-weighted features (if volume available)
        if 'volume' in df.columns:
            df['vwap'] = (df['price'] * df['volume']).cumsum() / df['volume'].cumsum()
            df['volume_ratio'] = df['volume'] / df['volume'].rolling(window=20).mean()
            
            # On-balance volume
            df['obv'] = 0
            mask = df['price'] > df['price'].shift(1)
            df.loc[mask, 'obv'] = df.loc[mask, 'volume']
            mask = df['price'] < df['price'].shift(1)
            df.loc[mask, 'obv'] = -df.loc[mask, 'volume']
            df['obv'] = df['obv'].cumsum()
        
        # Market microstructure features
        df['price_roc'] = df['price'].pct_change(periods=5)  # Rate of change
        df['price_inertia'] = df['price_roc'].rolling(window=10).mean()
        
        # Cyclical encoding for time features
        df['hour_sin'] = np.sin(2 * np.pi * df['hour'] / 24)
        df['hour_cos'] = np.cos(2 * np.pi * df['hour'] / 24)
        df['dow_sin'] = np.sin(2 * np.pi * df['day_of_week'] / 7)
        df['dow_cos'] = np.cos(2 * np.pi * df['day_of_week'] / 7)
        
        # Lag features with different periods
        for lag in [1, 3, 5, 10, 20]:
            df[f'price_lag_{lag}'] = df['price'].shift(lag)
            df[f'return_lag_{lag}'] = df['price'].pct_change(periods=lag)
        
        # Rolling statistics
        for window in [5, 10, 20, 50]:
            df[f'price_mean_{window}'] = df['price'].rolling(window=window).mean()
            df[f'price_std_{window}'] = df['price'].rolling(window=window).std()
            df[f'price_min_{window}'] = df['price'].rolling(window=window).min()
            df[f'price_max_{window}'] = df['price'].rolling(window=window).max()
            df[f'price_skew_{window}'] = df['price'].rolling(window=window).skew()
            df[f'price_kurt_{window}'] = df['price'].rolling(window=window).kurt()
        
        # Remove rows with NaN values
        df = df.dropna()
        
        self.logger.info(f"Feature engineering complete. Shape: {df.shape}, Features: {df.shape[1]}")
        return df
    
    def create_train_test_split(self, df: pd.DataFrame, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Create proper time-series train/test split to prevent data leakage
        
        Args:
            df: Feature-engineered DataFrame
            test_size: Proportion of data for testing
            
        Returns:
            Tuple of (train_data, test_data)
        """
        split_point = int(len(df) * (1 - test_size))
        train_data = df.iloc[:split_point].copy()
        test_data = df.iloc[split_point:].copy()
        
        self.logger.info(f"Train split: {len(train_data)} samples, Test split: {len(test_data)} samples")
        return train_data, test_data
    
    def update_model_weights(self, recent_performance: Dict[str, ModelPerformance]):
        """
        Adaptively update ensemble weights based on recent performance
        
        Args:
            recent_performance: Dictionary of model performance metrics
        """
        if not recent_performance:
            return
        
        # Filter models with sufficient prediction history
        eligible_models = {
            name: perf for name, perf in recent_performance.items() 
            if perf.prediction_count >= self.minimum_prediction_count
        }
        
        if not eligible_models:
            return
        
        # Calculate performance scores (lower is better for MAE/RMSE)
        performance_scores = {}
        for model_name, performance in eligible_models.items():
            # Normalize metrics (lower values = higher scores)
            mae_score = 1.0 / (1.0 + performance.recent_mae)
            rmse_score = 1.0 / (1.0 + performance.recent_rmse)
            mape_score = 1.0 / (1.0 + performance.recent_mape)
            
            # Weighted combination of metrics
            performance_scores[model_name] = (
                0.4 * mae_score + 
                0.3 * rmse_score + 
                0.3 * mape_score
            )
        
        # Normalize scores to sum to 1.0
        total_score = sum(performance_scores.values())
        if total_score > 0:
            new_weights = {
                model: score / total_score 
                for model, score in performance_scores.items()
            }
            
            # Smooth weight transitions
            for model in self.model_weights:
                if model in new_weights:
                    old_weight = self.model_weights[model]
                    new_weight = new_weights[model]
                    # Gradual adjustment with momentum
                    self.model_weights[model] = (
                        (1 - self.weight_adjustment_rate) * old_weight + 
                        self.weight_adjustment_rate * new_weight
                    )
            
            self.logger.info(f"Updated model weights: {self.model_weights}")
    
    def backtest_ensemble(self, test_data: pd.DataFrame, target_column: str = 'price') -> Dict[str, float]:
        """
        Comprehensive backtesting of ensemble performance
        
        Args:
            test_data: Test data for backtesting
            target_column: Target variable column name
            
        Returns:
            Dictionary of backtesting metrics
        """
        predictions = []
        actual_values = []
        
        # Walk-forward validation
        window_size = 20
        for i in range(window_size, len(test_data)):
            # Use data up to current point for prediction
            historical_data = test_data.iloc[:i]
            actual_value = test_data.iloc[i][target_column]
            
            # Generate prediction (simplified for backtesting)
            try:
                prediction = self.predict(historical_data, steps=1)
                predictions.append(prediction)
                actual_values.append(actual_value)
            except Exception as e:
                self.logger.warning(f"Backtesting prediction failed at index {i}: {e}")
                continue
        
        if not predictions or not actual_values:
            return {'error': 'Insufficient data for backtesting'}
        
        # Calculate metrics
        predictions = np.array(predictions)
        actual_values = np.array(actual_values)
        
        metrics = {
            'mae': mean_absolute_error(actual_values, predictions),
            'rmse': np.sqrt(mean_squared_error(actual_values, predictions)),
            'mape': mean_absolute_percentage_error(actual_values, predictions),
            'directional_accuracy': np.mean(np.sign(np.diff(predictions)) == np.sign(np.diff(actual_values))),
            'prediction_count': len(predictions),
            'backtest_period': f"{len(test_data)} timepoints"
        }
        
        self.logger.info(f"Backtesting complete: MAE={metrics['mae']:.4f}, RMSE={metrics['rmse']:.4f}, MAPE={metrics['mape']:.4f}")
        return metrics
    
    def predict_with_confidence(self, data: pd.DataFrame, steps: int = 1) -> Dict[str, Any]:
        """
        Generate prediction with confidence intervals and model contributions
        
        Args:
            data: Historical price data
            steps: Number of steps to predict
            
        Returns:
            Dictionary with prediction, confidence, and model details
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before prediction")
        
        # Feature engineering
        features = self.advanced_feature_engineering(data)
        
        # Get individual model predictions
        individual_predictions = {}
        model_confidences = {}
        
        for model_name, model in self.models.items():
            try:
                # Get prediction from each model
                if hasattr(model, 'predict'):
                    prediction = model.predict(features.iloc[-1:])
                    confidence = getattr(model, 'confidence', 0.5)  # Default confidence
                    
                    individual_predictions[model_name] = float(prediction[0])
                    model_confidences[model_name] = float(confidence)
                else:
                    self.logger.warning(f"Model {model_name} doesn't have predict method")
                    
            except Exception as e:
                self.logger.error(f"Prediction failed for model {model_name}: {e}")
                individual_predictions[model_name] = np.nan
                model_confidences[model_name] = 0.0
        
        # Weighted ensemble prediction
        valid_predictions = {
            name: pred for name, pred in individual_predictions.items() 
            if not np.isnan(pred)
        }
        
        if not valid_predictions:
            raise ValueError("No valid predictions from any model")
        
        # Calculate weighted prediction
        total_weight = sum(self.model_weights[name] for name in valid_predictions)
        normalized_weights = {
            name: self.model_weights[name] / total_weight 
            for name in valid_predictions
        }
        
        ensemble_prediction = sum(
            pred * normalized_weights[name] 
            for name, pred in valid_predictions.items()
        )
        
        # Calculate confidence intervals
        weighted_confidence = sum(
            model_confidences[name] * normalized_weights[name] 
            for name in valid_predictions
        )
        
        # Model contribution analysis
        model_contributions = {
            name: {
                'prediction': pred,
                'weight': normalized_weights[name],
                'confidence': model_confidences[name],
                'contribution': pred * normalized_weights[name]
            }
            for name in valid_predictions
        }
        
        result = {
            'predicted_price': float(ensemble_prediction),
            'confidence': float(weighted_confidence),
            'confidence_interval': {
                'lower': float(ensemble_prediction * (1 - weighted_confidence * 0.1)),
                'upper': float(ensemble_prediction * (1 + weighted_confidence * 0.1))
            },
            'individual_predictions': individual_predictions,
            'model_weights': normalized_weights,
            'model_contributions': model_contributions,
            'prediction_timestamp': datetime.now().isoformat(),
            'feature_version': self.feature_engineering_version
        }
        
        return result

# Example usage and testing
if __name__ == "__main__":
    # Initialize predictor
    predictor = AdaptiveEnsemblePredictor(
        performance_window=50,
        weight_adjustment_rate=0.05,
        minimum_prediction_count=5
    )
    
    # Create sample data
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=200, freq='H')
    prices = 100 + np.cumsum(np.random.randn(200) * 0.1)
    
    sample_data = pd.DataFrame({
        'timestamp': dates,
        'price': prices,
        'volume': np.random.randint(1000, 10000, 200)
    })
    sample_data.set_index('timestamp', inplace=True)
    
    # Feature engineering
    engineered_features = predictor.advanced_feature_engineering(sample_data)
    print(f"Engineered features shape: {engineered_features.shape}")
    print(f"Feature columns: {list(engineered_features.columns)}")
    
    # Train/test split
    train_data, test_data = predictor.create_train_test_split(engineered_features)
    print(f"Train: {len(train_data)}, Test: {len(test_data)}")
    
    print("Adaptive ensemble system ready for integration!")