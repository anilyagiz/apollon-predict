"""
Ensemble ML Prediction Engine for ALGO ZK Oracle
Combines LSTM, GRU, Prophet, and XGBoost models for robust price prediction
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import joblib
import logging
from typing import Dict, List, Tuple, Optional
import asyncio
import warnings
warnings.filterwarnings('ignore')

# Import the copied ML models
from LSTM import MyLSTM
from GRU import MyGRU
from my_prophet import MyProphet
from my_xgboost import MyXGboost

class EnsemblePredictionEngine:
    def __init__(self, model_weights: Dict[str, float] = None):
        """
        Initialize ensemble prediction engine
        
        Args:
            model_weights: Dictionary of model weights for ensemble averaging
        """
        # Default weights (can be optimized based on historical performance)
        self.model_weights = model_weights or {
            'lstm': 0.35,
            'gru': 0.25,
            'prophet': 0.25,
            'xgboost': 0.15
        }
        
        # Initialize models
        self.models = {}
        self.is_trained = False
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # Prediction history for accuracy tracking
        self.prediction_history = []
        
    def prepare_features(self, data: List[Dict]) -> pd.DataFrame:
        """
        Prepare features for ML models from price data
        
        Args:
            data: List of price data dictionaries
            
        Returns:
            DataFrame with features for ML models
        """
        df = pd.DataFrame(data)
        
        if 'datetime' not in df.columns:
            df['datetime'] = pd.to_datetime(df.get('timestamp', df.index))
        
        df = df.sort_values('datetime').reset_index(drop=True)
        
        # Basic price features
        df['price_lag_1'] = df['price'].shift(1)
        df['price_lag_2'] = df['price'].shift(2)
        df['price_lag_3'] = df['price'].shift(3)
        
        # Moving averages
        df['sma_5'] = df['price'].rolling(window=5).mean()
        df['sma_10'] = df['price'].rolling(window=10).mean()
        df['sma_20'] = df['price'].rolling(window=20).mean()
        
        # Price changes
        df['price_change'] = df['price'].pct_change()
        df['price_change_lag_1'] = df['price_change'].shift(1)
        
        # Volatility
        df['volatility'] = df['price'].rolling(window=10).std()
        
        # RSI
        delta = df['price'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['rsi'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        bb_window = 20
        df['bb_middle'] = df['price'].rolling(window=bb_window).mean()
        bb_std = df['price'].rolling(window=bb_window).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        df['bb_position'] = (df['price'] - df['bb_lower']) / (df['bb_upper'] - df['bb_lower'])
        
        # Volume features (if available)
        if 'volume' in df.columns:
            df['volume_sma'] = df['volume'].rolling(window=10).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma']
        
        # Time features
        df['hour'] = df['datetime'].dt.hour
        df['day_of_week'] = df['datetime'].dt.dayofweek
        df['day_of_month'] = df['datetime'].dt.day
        
        # Drop rows with NaN values
        df = df.dropna()
        
        return df
    
    def create_sequences(self, data: pd.DataFrame, sequence_length: int = 60, 
                        target_col: str = 'price') -> Tuple[np.ndarray, np.ndarray]:
        """
        Create sequences for LSTM/GRU models
        
        Args:
            data: DataFrame with features
            sequence_length: Length of input sequences
            target_col: Target column name
            
        Returns:
            Tuple of (sequences, targets)
        """
        feature_cols = [col for col in data.columns if col not in ['datetime', target_col]]
        
        sequences = []
        targets = []
        
        for i in range(sequence_length, len(data)):
            seq = data[feature_cols].iloc[i-sequence_length:i].values
            target = data[target_col].iloc[i]
            
            sequences.append(seq)
            targets.append(target)
        
        return np.array(sequences), np.array(targets)
    
    async def train_models(self, training_data: List[Dict]):
        """
        Train all models in the ensemble
        
        Args:
            training_data: List of historical price data
        """
        self.logger.info("Starting ensemble model training...")
        
        # Prepare features
        df = self.prepare_features(training_data)
        
        if len(df) < 100:
            raise ValueError("Insufficient training data. Need at least 100 data points.")
        
        # Split data for training
        train_size = int(len(df) * 0.8)
        train_df = df[:train_size]
        val_df = df[train_size:]
        
        # Train LSTM model
        try:
            self.logger.info("Training LSTM model...")
            # Prepare data for LSTM (simplified for demo)
            lstm_data = train_df[['datetime', 'price_lag_1', 'sma_5', 'rsi', 'price']].dropna()
            
            # Create a simple args object for LSTM
            class LSTMArgs:
                hidden_dim = 50
                epochs = 10
            
            self.models['lstm'] = MyLSTM(LSTMArgs())
            self.models['lstm'].fit(lstm_data.values)
            
        except Exception as e:
            self.logger.error(f"LSTM training failed: {e}")
            self.model_weights['lstm'] = 0
        
        # Train GRU model
        try:
            self.logger.info("Training GRU model...")
            # Similar to LSTM
            gru_data = train_df[['datetime', 'price_lag_1', 'sma_10', 'volatility', 'price']].dropna()
            
            class GRUArgs:
                hidden_dim = 50
                epochs = 10
                
            self.models['gru'] = MyGRU(GRUArgs())
            self.models['gru'].fit(gru_data.values)
            
        except Exception as e:
            self.logger.error(f"GRU training failed: {e}")
            self.model_weights['gru'] = 0
        
        # Train Prophet model
        try:
            self.logger.info("Training Prophet model...")
            prophet_data = train_df[['datetime', 'price']].rename(columns={'datetime': 'ds', 'price': 'y'})
            
            class ProphetArgs:
                response_col = 'y'
                date_col = 'ds'
                
            self.models['prophet'] = MyProphet(ProphetArgs())
            self.models['prophet'].fit(prophet_data)
            
        except Exception as e:
            self.logger.error(f"Prophet training failed: {e}")
            self.model_weights['prophet'] = 0
        
        # Train XGBoost model
        try:
            self.logger.info("Training XGBoost model...")
            feature_cols = ['price_lag_1', 'price_lag_2', 'sma_5', 'sma_10', 'rsi', 'volatility']
            available_cols = [col for col in feature_cols if col in train_df.columns]
            
            xgb_features = train_df[available_cols].fillna(0)
            xgb_target = train_df['price']
            
            class XGBArgs:
                response_col = 'price'
                date_col = 'datetime'
            
            self.models['xgboost'] = MyXGboost(XGBArgs())
            
            # Prepare data for XGBoost format
            xgb_data = pd.concat([xgb_features, xgb_target], axis=1)
            self.models['xgboost'].fit(xgb_data)
            
        except Exception as e:
            self.logger.error(f"XGBoost training failed: {e}")
            self.model_weights['xgboost'] = 0
        
        # Normalize weights
        total_weight = sum(self.model_weights.values())
        if total_weight > 0:
            self.model_weights = {k: v/total_weight for k, v in self.model_weights.items()}
            self.is_trained = True
            self.logger.info(f"Training completed. Final weights: {self.model_weights}")
        else:
            raise Exception("All models failed to train")
    
    async def predict(self, recent_data: List[Dict], 
                     timeframe: str = '24h') -> Dict:
        """
        Generate ensemble prediction
        
        Args:
            recent_data: Recent price data for prediction
            timeframe: Prediction timeframe ('1h', '24h', '7d')
            
        Returns:
            Dictionary with prediction results
        """
        if not self.is_trained:
            raise ValueError("Models not trained. Call train_models() first.")
        
        self.logger.info(f"Generating {timeframe} prediction...")
        
        # Prepare features
        df = self.prepare_features(recent_data)
        
        if len(df) < 20:
            raise ValueError("Insufficient recent data for prediction")
        
        predictions = {}
        confidences = {}
        
        # Get predictions from each model
        for model_name, model in self.models.items():
            try:
                if model_name in ['lstm', 'gru']:
                    # For LSTM/GRU, use latest features
                    latest_features = df[['price_lag_1', 'sma_5', 'rsi']].iloc[-1:].fillna(0)
                    pred = model.predict(latest_features)
                    predictions[model_name] = float(pred[0]) if isinstance(pred, np.ndarray) else float(pred)
                    confidences[model_name] = 0.8  # Base confidence
                    
                elif model_name == 'prophet':
                    # Prophet needs future dataframe
                    future_df = pd.DataFrame({
                        'ds': [df['datetime'].iloc[-1] + timedelta(hours=24)]
                    })
                    pred = model.predict(future_df)
                    predictions[model_name] = float(pred[0]) if isinstance(pred, np.ndarray) else float(pred)
                    confidences[model_name] = 0.7
                    
                elif model_name == 'xgboost':
                    # XGBoost uses feature vector
                    feature_cols = ['price_lag_1', 'price_lag_2', 'sma_5', 'sma_10', 'rsi', 'volatility']
                    available_cols = [col for col in feature_cols if col in df.columns]
                    latest_features = df[available_cols].iloc[-1:].fillna(0)
                    
                    pred = model.predict(latest_features)
                    predictions[model_name] = float(pred[0]) if isinstance(pred, np.ndarray) else float(pred)
                    confidences[model_name] = 0.75
                    
            except Exception as e:
                self.logger.error(f"Prediction failed for {model_name}: {e}")
                predictions[model_name] = df['price'].iloc[-1]  # Fallback to last price
                confidences[model_name] = 0.1
        
        # Calculate weighted ensemble prediction
        total_weight = 0
        weighted_prediction = 0
        
        for model_name, prediction in predictions.items():
            weight = self.model_weights.get(model_name, 0)
            confidence = confidences.get(model_name, 0.1)
            
            # Adjust weight by confidence
            adjusted_weight = weight * confidence
            
            weighted_prediction += prediction * adjusted_weight
            total_weight += adjusted_weight
        
        if total_weight == 0:
            # Fallback: simple average
            ensemble_prediction = np.mean(list(predictions.values()))
            ensemble_confidence = 0.3
        else:
            ensemble_prediction = weighted_prediction / total_weight
            ensemble_confidence = min(total_weight, 0.95)  # Cap at 95%
        
        # Calculate prediction range based on model variance
        pred_values = list(predictions.values())
        prediction_std = np.std(pred_values)
        current_price = df['price'].iloc[-1]
        
        # Confidence interval
        confidence_interval = prediction_std * 1.96  # 95% CI
        
        result = {
            "symbol": "ALGOUSD",
            "timeframe": timeframe,
            "predicted_price": round(ensemble_prediction, 6),
            "current_price": round(current_price, 6),
            "price_change": round(ensemble_prediction - current_price, 6),
            "price_change_percent": round(((ensemble_prediction - current_price) / current_price) * 100, 2),
            "confidence": round(ensemble_confidence, 3),
            "confidence_interval": {
                "lower": round(ensemble_prediction - confidence_interval, 6),
                "upper": round(ensemble_prediction + confidence_interval, 6)
            },
            "individual_predictions": {k: round(v, 6) for k, v in predictions.items()},
            "model_weights": self.model_weights,
            "prediction_std": round(prediction_std, 6),
            "timestamp": datetime.now().isoformat(),
            "data_points_used": len(df)
        }
        
        # Store prediction for accuracy tracking
        self.prediction_history.append({
            "prediction": ensemble_prediction,
            "confidence": ensemble_confidence,
            "timestamp": datetime.now(),
            "timeframe": timeframe
        })
        
        return result
    
    def calculate_accuracy(self, actual_prices: List[float], 
                          predictions: List[float]) -> Dict:
        """Calculate prediction accuracy metrics"""
        if len(actual_prices) != len(predictions):
            raise ValueError("Actual and predicted arrays must have same length")
        
        actual = np.array(actual_prices)
        pred = np.array(predictions)
        
        # Mean Absolute Error
        mae = np.mean(np.abs(actual - pred))
        
        # Mean Absolute Percentage Error
        mape = np.mean(np.abs((actual - pred) / actual)) * 100
        
        # Root Mean Square Error
        rmse = np.sqrt(np.mean((actual - pred) ** 2))
        
        # R-squared
        ss_res = np.sum((actual - pred) ** 2)
        ss_tot = np.sum((actual - np.mean(actual)) ** 2)
        r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0
        
        return {
            "mae": round(mae, 6),
            "mape": round(mape, 2),
            "rmse": round(rmse, 6),
            "r2": round(r2, 3),
            "accuracy": round(max(0, 100 - mape), 2)  # Simple accuracy metric
        }

# Usage example
async def main():
    # Create ensemble predictor
    predictor = EnsemblePredictionEngine()
    
    # Generate dummy training data for demo
    dates = pd.date_range(start='2024-01-01', end='2024-09-01', freq='D')
    dummy_data = []
    
    base_price = 0.20
    for i, date in enumerate(dates):
        price = base_price + 0.05 * np.sin(i * 0.1) + np.random.normal(0, 0.01)
        dummy_data.append({
            'datetime': date,
            'price': max(0.1, price),  # Ensure positive price
            'volume': np.random.uniform(1000000, 5000000)
        })
    
    print("Training ensemble models...")
    await predictor.train_models(dummy_data)
    
    # Make prediction
    recent_data = dummy_data[-30:]  # Last 30 days
    prediction = await predictor.predict(recent_data, timeframe='24h')
    
    print("\nEnsemble Prediction Result:")
    print(f"Current Price: ${prediction['current_price']}")
    print(f"Predicted Price (24h): ${prediction['predicted_price']}")
    print(f"Price Change: ${prediction['price_change']} ({prediction['price_change_percent']}%)")
    print(f"Confidence: {prediction['confidence']}")
    print(f"Range: ${prediction['confidence_interval']['lower']} - ${prediction['confidence_interval']['upper']}")

if __name__ == "__main__":
    asyncio.run(main())