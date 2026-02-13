"""
Advanced Feature Engineering Module
Comprehensive feature extraction for cryptocurrency price prediction
Includes market microstructure, sentiment analysis, and advanced technical indicators
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import logging
import talib
from scipy import stats
from scipy.signal import savgol_filter
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import asyncio

class FeatureCategory(Enum):
    TECHNICAL = "technical"
    MICROSTRUCTURE = "microstructure"
    SENTIMENT = "sentiment"
    MACRO = "macro"
    DERIVATIVES = "derivatives"
    ON_CHAIN = "on_chain"

@dataclass
class FeatureConfig:
    """Configuration for feature engineering"""
    lookback_windows: List[int] = None
    smoothing_windows: List[int] = None
    volatility_windows: List[int] = None
    momentum_windows: List[int] = None
    volume_windows: List[int] = None
    
    def __post_init__(self):
        if self.lookback_windows is None:
            self.lookback_windows = [5, 10, 20, 50, 100]
        if self.smoothing_windows is None:
            self.smoothing_windows = [3, 7, 14]
        if self.volatility_windows is None:
            self.volatility_windows = [5, 10, 20, 30]
        if self.momentum_windows is None:
            self.momentum_windows = [3, 5, 10, 14, 21]
        if self.volume_windows is None:
            self.volume_windows = [5, 10, 20, 50]

class AdvancedFeatureEngineer:
    """
    Advanced feature engineering for cryptocurrency price prediction
    """
    
    def __init__(self, config: Optional[FeatureConfig] = None):
        self.config = config or FeatureConfig()
        self.logger = logging.getLogger(__name__)
        
        # Feature scaling and normalization
        self.scalers: Dict[str, Union[StandardScaler, MinMaxScaler]] = {}
        
        # Feature metadata for tracking
        self.feature_metadata: Dict[str, Dict[str, Any]] = {}
        
        self.logger.info("Advanced Feature Engineer initialized")
    
    def engineer_features(self, 
                         price_data: pd.DataFrame,
                         volume_data: Optional[pd.DataFrame] = None,
                         orderbook_data: Optional[pd.DataFrame] = None,
                         sentiment_data: Optional[pd.DataFrame] = None,
                         derivatives_data: Optional[pd.DataFrame] = None,
                         on_chain_data: Optional[pd.DataFrame] = None,
                         include_categories: Optional[List[FeatureCategory]] = None) -> pd.DataFrame:
        """
        Comprehensive feature engineering pipeline
        
        Args:
            price_data: OHLCV price data
            volume_data: Additional volume metrics
            orderbook_data: Order book data (bid/ask spreads, depth)
            sentiment_data: Sentiment indicators
            derivatives_data: Futures/options data
            on_chain_data: Blockchain metrics
            include_categories: Specific feature categories to include
            
        Returns:
            Engineered features DataFrame
        """
        
        # Default to all categories if not specified
        if include_categories is None:
            include_categories = list(FeatureCategory)
        
        self.logger.info(f"Engineering features for categories: {[cat.value for cat in include_categories]}")
        
        # Initialize feature collection
        all_features = pd.DataFrame(index=price_data.index)
        
        # Technical indicators
        if FeatureCategory.TECHNICAL in include_categories:
            technical_features = self._engineer_technical_features(price_data)
            all_features = pd.concat([all_features, technical_features], axis=1)
            self.logger.info(f"Technical features: {technical_features.shape[1]}")
        
        # Market microstructure features
        if FeatureCategory.MICROSTRUCTURE in include_categories and orderbook_data is not None:
            micro_features = self._engineer_microstructure_features(orderbook_data, price_data)
            all_features = pd.concat([all_features, micro_features], axis=1)
            self.logger.info(f"Microstructure features: {micro_features.shape[1]}")
        
        # Sentiment features
        if FeatureCategory.SENTIMENT in include_categories and sentiment_data is not None:
            sentiment_features = self._engineer_sentiment_features(sentiment_data)
            all_features = pd.concat([all_features, sentiment_features], axis=1)
            self.logger.info(f"Sentiment features: {sentiment_features.shape[1]}")
        
        # Derivatives features
        if FeatureCategory.DERIVATIVES in include_categories and derivatives_data is not None:
            derivatives_features = self._engineer_derivatives_features(derivatives_data)
            all_features = pd.concat([all_features, derivatives_features], axis=1)
            self.logger.info(f"Derivatives features: {derivatives_features.shape[1]}")
        
        # On-chain features
        if FeatureCategory.ON_CHAIN in include_categories and on_chain_data is not None:
            on_chain_features = self._engineer_on_chain_features(on_chain_data)
            all_features = pd.concat([all_features, on_chain_features], axis=1)
            self.logger.info(f"On-chain features: {on_chain_features.shape[1]}")
        
        # Volume-based features (if volume data available)
        if volume_data is not None:
            volume_features = self._engineer_volume_features(volume_data, price_data)
            all_features = pd.concat([all_features, volume_features], axis=1)
            self.logger.info(f"Volume features: {volume_features.shape[1]}")
        
        # Cross-category interaction features
        interaction_features = self._engineer_interaction_features(all_features)
        all_features = pd.concat([all_features, interaction_features], axis=1)
        self.logger.info(f"Interaction features: {interaction_features.shape[1]}")
        
        # Feature selection and quality checks
        final_features = self._feature_selection_and_cleaning(all_features)
        
        self.logger.info(f"Total engineered features: {final_features.shape[1]}")
        self.logger.info(f"Feature engineering completed. Shape: {final_features.shape}")
        
        return final_features
    
    def _engineer_technical_features(self, price_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer comprehensive technical indicators"""
        features = pd.DataFrame(index=price_data.index)
        
        # Ensure we have required columns
        required_cols = ['open', 'high', 'low', 'close', 'volume']
        if not all(col in price_data.columns for col in required_cols):
            self.logger.warning("Missing required OHLCV columns for technical features")
            return features
        
        close = price_data['close']
        open_price = price_data['open']
        high = price_data['high']
        low = price_data['low']
        volume = price_data['volume']
        
        # Momentum Indicators
        for window in self.config.momentum_windows:
            # RSI
            rsi = talib.RSI(close, timeperiod=window)
            features[f'rsi_{window}'] = rsi
            
            # MACD
            macd, macdsignal, macdhist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
            features[f'macd_{window}'] = macd
            features[f'macd_signal_{window}'] = macdsignal
            features[f'macd_hist_{window}'] = macdhist
            
            # Stochastic
            slowk, slowd = talib.STOCH(high, low, close, fastk_period=window, slowk_period=window//2, slowd_period=window//3)
            features[f'stoch_k_{window}'] = slowk
            features[f'stoch_d_{window}'] = slowd
            
            # Williams %R
            willr = talib.WILLR(high, low, close, timeperiod=window)
            features[f'willr_{window}'] = willr
            
            # Rate of Change
            roc = talib.ROC(close, timeperiod=window)
            features[f'roc_{window}'] = roc
        
        # Trend Indicators
        for window in self.config.lookback_windows:
            # Moving Averages
            sma = talib.SMA(close, timeperiod=window)
            ema = talib.EMA(close, timeperiod=window)
            wma = talib.WMA(close, timeperiod=window)
            
            features[f'sma_{window}'] = sma
            features[f'ema_{window}'] = ema
            features[f'wma_{window}'] = wma
            
            # Price relative to moving averages
            features[f'price_sma_ratio_{window}'] = close / sma
            features[f'price_ema_ratio_{window}'] = close / ema
            
            # Moving average slopes
            features[f'sma_slope_{window}'] = features[f'sma_{window}'].diff()
            features[f'ema_slope_{window}'] = features[f'ema_{window}'].diff()
            
            # ADX (Average Directional Index)
            adx = talib.ADX(high, low, close, timeperiod=window)
            features[f'adx_{window}'] = adx
            
            # Aroon
            aroon_up, aroon_down = talib.AROON(high, low, timeperiod=window)
            features[f'aroon_up_{window}'] = aroon_up
            features[f'aroon_down_{window}'] = aroon_down
            features[f'aroon_osc_{window}'] = aroon_up - aroon_down
        
        # Volatility Indicators
        for window in self.config.volatility_windows:
            # Bollinger Bands
            upperband, middleband, lowerband = talib.BBANDS(close, timeperiod=window, nbdevup=2, nbdevdn=2)
            features[f'bb_upper_{window}'] = upperband
            features[f'bb_middle_{window}'] = middleband
            features[f'bb_lower_{window}'] = lowerband
            features[f'bb_width_{window}'] = (upperband - lowerband) / middleband
            features[f'bb_position_{window}'] = (close - lowerband) / (upperband - lowerband)
            
            # ATR (Average True Range)
            atr = talib.ATR(high, low, close, timeperiod=window)
            features[f'atr_{window}'] = atr
            features[f'atr_ratio_{window}'] = atr / close
            
            # Standard Deviation
            std = talib.STDDEV(close, timeperiod=window, nbdev=1)
            features[f'std_{window}'] = std
            features[f'std_ratio_{window}'] = std / close
        
        # Volume Indicators
        for window in self.config.volume_windows:
            # OBV (On Balance Volume)
            obv = talib.OBV(close, volume)
            features[f'obv_{window}'] = obv
            
            # Volume moving average
            volume_sma = talib.SMA(volume, timeperiod=window)
            features[f'volume_sma_{window}'] = volume_sma
            features[f'volume_ratio_{window}'] = volume / volume_sma
            
            # Volume Rate of Change
            volume_roc = talib.ROC(volume, timeperiod=window)
            features[f'volume_roc_{window}'] = volume_roc
        
        # Price-based features
        features['price_change'] = close.pct_change()
        features['price_range'] = (high - low) / close
        features['price_body'] = (close - open_price) / open_price
        features['upper_shadow'] = (high - np.maximum(open_price, close)) / close
        features['lower_shadow'] = (np.minimum(open_price, close) - low) / close
        
        # Gap analysis
        features['gap'] = (open_price - close.shift(1)) / close.shift(1)
        features['gap_size'] = np.abs(features['gap'])
        
        # Support and Resistance levels (simplified)
        for window in [10, 20, 50]:
            rolling_high = high.rolling(window=window).max()
            rolling_low = low.rolling(window=window).min()
            
            features[f'resistance_{window}'] = rolling_high
            features[f'support_{window}'] = rolling_low
            features[f'resistance_distance_{window}'] = (rolling_high - close) / close
            features[f'support_distance_{window}'] = (close - rolling_low) / close
        
        return features
    
    def _engineer_volume_features(self, volume_data: pd.DataFrame, price_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer advanced volume-based features"""
        features = pd.DataFrame(index=volume_data.index)
        
        # Basic volume metrics
        if 'volume' in volume_data.columns:
            volume = volume_data['volume']
            
            # Volume profile
            for window in self.config.volume_windows:
                volume_profile = volume.rolling(window=window).apply(
                    lambda x: np.percentile(x, 75) - np.percentile(x, 25)
                )
                features[f'volume_profile_{window}'] = volume_profile / volume
                
                # Volume momentum
                volume_momentum = volume.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'volume_momentum_{window}'] = volume_momentum
                
                # Volume acceleration
                volume_acceleration = volume_momentum.diff()
                features[f'volume_acceleration_{window}'] = volume_acceleration
                
                # Volume distribution
                volume_std = volume.rolling(window=window).std()
                volume_mean = volume.rolling(window=window).mean()
                features[f'volume_cv_{window}'] = volume_std / volume_mean
        
        # Price-volume relationships
        if 'close' in price_data.columns and 'volume' in volume_data.columns:
            close = price_data['close']
            volume = volume_data['volume']
            
            # Volume-Price Trend (VPT)
            vpt = (volume * ((close - close.shift(1)) / close.shift(1))).cumsum()
            features['vpt'] = vpt
            
            # Chaikin Money Flow
            for window in self.config.volume_windows:
                money_flow_multiplier = ((close - close.shift(1)) - (close.shift(1) - close)) / (close - close.shift(1))
                money_flow_volume = money_flow_multiplier * volume
                
                cmf = money_flow_volume.rolling(window=window).sum() / volume.rolling(window=window).sum()
                features[f'cmf_{window}'] = cmf
                
                # Volume-weighted average price (VWAP)
                typical_price = (price_data['high'] + price_data['low'] + close) / 3 if all(col in price_data.columns for col in ['high', 'low']) else close
                vwap = (typical_price * volume).rolling(window=window).sum() / volume.rolling(window=window).sum()
                features[f'vwap_{window}'] = vwap
                features[f'vwap_ratio_{window}'] = close / vwap
        
        return features
    
    def _engineer_microstructure_features(self, orderbook_data: pd.DataFrame, price_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer market microstructure features"""
        features = pd.DataFrame(index=orderbook_data.index)
        
        # Bid-Ask spread analysis
        if 'bid_price' in orderbook_data.columns and 'ask_price' in orderbook_data.columns:
            bid_price = orderbook_data['bid_price']
            ask_price = orderbook_data['ask_price']
            
            # Spread metrics
            spread = ask_price - bid_price
            mid_price = (bid_price + ask_price) / 2
            relative_spread = spread / mid_price
            
            features['spread'] = spread
            features['relative_spread'] = relative_spread
            features['mid_price'] = mid_price
            
            # Spread volatility
            for window in self.config.volatility_windows:
                spread_volatility = spread.rolling(window=window).std()
                features[f'spread_volatility_{window}'] = spread_volatility
                
                # Spread momentum
                spread_momentum = spread.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'spread_momentum_{window}'] = spread_momentum
        
        # Order book depth
        if 'bid_volume' in orderbook_data.columns and 'ask_volume' in orderbook_data.columns:
            bid_volume = orderbook_data['bid_volume']
            ask_volume = orderbook_data['ask_volume']
            
            # Imbalance metrics
            volume_imbalance = (bid_volume - ask_volume) / (bid_volume + ask_volume)
            features['volume_imbalance'] = volume_imbalance
            
            # Depth metrics
            total_depth = bid_volume + ask_volume
            features['total_depth'] = total_depth
            features['depth_ratio'] = total_depth / price_data['close'] if 'close' in price_data.columns else total_depth
            
            for window in self.config.volume_windows:
                # Depth momentum
                depth_momentum = total_depth.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'depth_momentum_{window}'] = depth_momentum
                
                # Imbalance persistence
                imbalance_persistence = volume_imbalance.rolling(window=window).apply(
                    lambda x: np.sum(np.sign(x))
                )
                features[f'imbalance_persistence_{window}'] = imbalance_persistence
        
        # Price impact analysis
        if 'close' in price_data.columns:
            close = price_data['close']
            
            # Quote slope (simplified)
            if 'bid_price' in orderbook_data.columns and 'ask_price' in orderbook_data.columns:
                quote_slope = (orderbook_data['ask_price'] - orderbook_data['bid_price']) / \
                             ((orderbook_data['ask_volume'] + orderbook_data['bid_volume']) / 2)
                features['quote_slope'] = quote_slope
            
            # Order flow (if available)
            if 'buy_orders' in orderbook_data.columns and 'sell_orders' in orderbook_data.columns:
                order_flow = orderbook_data['buy_orders'] - orderbook_data['sell_orders']
                features['order_flow'] = order_flow
                
                for window in self.config.volume_windows:
                    # Order flow momentum
                    flow_momentum = order_flow.rolling(window=window).apply(
                        lambda x: np.polyfit(range(len(x)), x, 1)[0]
                    )
                    features[f'order_flow_momentum_{window}'] = flow_momentum
        
        return features
    
    def _engineer_sentiment_features(self, sentiment_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer sentiment-based features"""
        features = pd.DataFrame(index=sentiment_data.index)
        
        # Basic sentiment metrics
        if 'sentiment_score' in sentiment_data.columns:
            sentiment_score = sentiment_data['sentiment_score']
            
            # Sentiment levels
            features['sentiment_level'] = sentiment_score
            features['sentiment_abs'] = np.abs(sentiment_score)
            features['sentiment_direction'] = np.sign(sentiment_score)
            
            # Sentiment momentum
            for window in self.config.momentum_windows:
                sentiment_momentum = sentiment_score.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'sentiment_momentum_{window}'] = sentiment_momentum
                
                # Sentiment volatility
                sentiment_volatility = sentiment_score.rolling(window=window).std()
                features[f'sentiment_volatility_{window}'] = sentiment_volatility
                
                # Sentiment extremes
                sentiment_max = sentiment_score.rolling(window=window).max()
                sentiment_min = sentiment_score.rolling(window=window).min()
                features[f'sentiment_range_{window}'] = sentiment_max - sentiment_min
        
        # Social media metrics
        if 'social_volume' in sentiment_data.columns:
            social_volume = sentiment_data['social_volume']
            
            # Volume-weighted sentiment
            if 'sentiment_score' in sentiment_data.columns:
                volume_weighted_sentiment = (sentiment_data['sentiment_score'] * social_volume) / social_volume.rolling(window=10).mean()
                features['volume_weighted_sentiment'] = volume_weighted_sentiment
            
            # Social momentum
            for window in self.config.volume_windows:
                social_momentum = social_volume.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'social_momentum_{window}'] = social_momentum
        
        # Fear & Greed index components
        if 'fear_greed' in sentiment_data.columns:
            fear_greed = sentiment_data['fear_greed']
            
            features['fear_greed_level'] = fear_greed
            features['fear_greed_change'] = fear_greed.diff()
            
            # Extreme fear/greed signals
            features['extreme_fear'] = (fear_greed <= 20).astype(int)
            features['extreme_greed'] = (fear_greed >= 80).astype(int)
            
            # Fear/greed momentum
            for window in self.config.momentum_windows:
                fg_momentum = fear_greed.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'fear_greed_momentum_{window}'] = fg_momentum
        
        return features
    
    def _engineer_derivatives_features(self, derivatives_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer derivatives market features"""
        features = pd.DataFrame(index=derivatives_data.index)
        
        # Futures data
        if 'futures_price' in derivatives_data.columns and 'spot_price' in derivatives_data.columns:
            futures_price = derivatives_data['futures_price']
            spot_price = derivatives_data['spot_price']
            
            # Basis (futures premium/discount)
            basis = (futures_price - spot_price) / spot_price
            features['basis'] = basis
            features['basis_abs'] = np.abs(basis)
            
            # Basis momentum
            for window in self.config.momentum_windows:
                basis_momentum = basis.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'basis_momentum_{window}'] = basis_momentum
        
        # Open Interest
        if 'open_interest' in derivatives_data.columns:
            open_interest = derivatives_data['open_interest']
            
            features['open_interest'] = open_interest
            features['oi_change'] = open_interest.pct_change()
            
            # OI momentum
            for window in self.config.volume_windows:
                oi_momentum = open_interest.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'oi_momentum_{window}'] = oi_momentum
                
                # OI relative to historical average
                oi_ratio = open_interest / open_interest.rolling(window=window).mean()
                features[f'oi_ratio_{window}'] = oi_ratio
        
        # Funding rates
        if 'funding_rate' in derivatives_data.columns:
            funding_rate = derivatives_data['funding_rate']
            
            features['funding_rate'] = funding_rate
            features['funding_rate_abs'] = np.abs(funding_rate)
            
            # Extreme funding rates
            features['extreme_positive_funding'] = (funding_rate > 0.01).astype(int)
            features['extreme_negative_funding'] = (funding_rate < -0.01).astype(int)
            
            # Funding momentum
            for window in self.config.momentum_windows:
                funding_momentum = funding_rate.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'funding_momentum_{window}'] = funding_momentum
        
        # Options data (if available)
        if 'put_call_ratio' in derivatives_data.columns:
            pcr = derivatives_data['put_call_ratio']
            
            features['put_call_ratio'] = pcr
            features['pcr_change'] = pcr.pct_change()
            
            # PCR extremes
            features['high_pcr'] = (pcr > 1.2).astype(int)  # More puts than calls
            features['low_pcr'] = (pcr < 0.8).astype(int)  # More calls than puts
        
        return features
    
    def _engineer_on_chain_features(self, on_chain_data: pd.DataFrame) -> pd.DataFrame:
        """Engineer on-chain metrics features"""
        features = pd.DataFrame(index=on_chain_data.index)
        
        # Transaction metrics
        if 'transaction_count' in on_chain_data.columns:
            tx_count = on_chain_data['transaction_count']
            
            features['transaction_count'] = tx_count
            features['tx_count_change'] = tx_count.pct_change()
            
            # Transaction momentum
            for window in self.config.volume_windows:
                tx_momentum = tx_count.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'tx_momentum_{window}'] = tx_momentum
                
                # Transaction velocity
                tx_velocity = tx_count.diff() / tx_count.rolling(window=window).mean()
                features[f'tx_velocity_{window}'] = tx_velocity
        
        # Active addresses
        if 'active_addresses' in on_chain_data.columns:
            active_addrs = on_chain_data['active_addresses']
            
            features['active_addresses'] = active_addrs
            features['active_addrs_change'] = active_addrs.pct_change()
            
            # Network growth
            for window in self.config.momentum_windows:
                network_growth = active_addrs.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'network_growth_{window}'] = network_growth
        
        # Hash rate (if available)
        if 'hash_rate' in on_chain_data.columns:
            hash_rate = on_chain_data['hash_rate']
            
            features['hash_rate'] = hash_rate
            features['hash_rate_change'] = hash_rate.pct_change()
            
            # Network security trend
            for window in self.config.momentum_windows:
                security_trend = hash_rate.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'security_trend_{window}'] = security_trend
        
        # Exchange flows
        if 'exchange_inflow' in on_chain_data.columns and 'exchange_outflow' in on_chain_data.columns:
            inflow = on_chain_data['exchange_inflow']
            outflow = on_chain_data['exchange_outflow']
            
            # Net flow
            net_flow = outflow - inflow
            features['net_exchange_flow'] = net_flow
            features['net_flow_ratio'] = net_flow / (inflow + outflow)
            
            # Exchange flow momentum
            for window in self.config.volume_windows:
                flow_momentum = net_flow.rolling(window=window).apply(
                    lambda x: np.polyfit(range(len(x)), x, 1)[0]
                )
                features[f'exchange_flow_momentum_{window}'] = flow_momentum
        
        return features
    
    def _engineer_interaction_features(self, base_features: pd.DataFrame) -> pd.DataFrame:
        """Engineer interaction features between different feature categories"""
        features = pd.DataFrame(index=base_features.index)
        
        # Price-momentum interactions
        price_cols = [col for col in base_features.columns if 'close' in col or 'price' in col]
        momentum_cols = [col for col in base_features.columns if 'rsi' in col or 'macd' in col or 'stoch' in col]
        
        for price_col in price_cols[:3]:  # Limit to avoid explosion
            for momentum_col in momentum_cols[:3]:
                if price_col != momentum_col:
                    # Price-momentum divergence
                    features[f'{price_col}_{momentum_col}_div'] = base_features[price_col] / base_features[momentum_col]
                    
                    # Price-momentum correlation (rolling)
                    window = min(20, len(base_features))
                    correlation = base_features[price_col].rolling(window=window).corr(base_features[momentum_col])
                    features[f'{price_col}_{momentum_col}_corr'] = correlation
        
        # Volume-price interactions
        volume_cols = [col for col in base_features.columns if 'volume' in col]
        
        for vol_col in volume_cols[:2]:
            for price_col in price_cols[:2]:
                # Volume-price relationship
                features[f'{vol_col}_{price_col}_ratio'] = base_features[vol_col] / base_features[price_col]
                
                # Volume confirmation of price moves
                if len(base_features) > 5:
                    price_change = base_features[price_col].pct_change()
                    volume_change = base_features[vol_col].pct_change()
                    features[f'volume_confirmation_{vol_col}_{price_col}'] = price_change * volume_change
        
        # Volatility interactions
        volatility_cols = [col for col in base_features.columns if 'volatility' in col or 'atr' in col or 'std' in col]
        
        for vol1 in volatility_cols[:2]:
            for vol2 in volatility_cols[1:3]:
                if vol1 != vol2:
                    # Volatility ratio
                    features[f'{vol1}_{vol2}_ratio'] = base_features[vol1] / base_features[vol2]
                    
                    # Volatility convergence/divergence
                    features[f'{vol1}_{vol2}_spread'] = base_features[vol1] - base_features[vol2]
        
        return features
    
    def _feature_selection_and_cleaning(self, features: pd.DataFrame) -> pd.DataFrame:
        """Feature selection and data cleaning"""
        
        # Remove features with too many NaN values (>50%)
        nan_threshold = 0.5
        features_clean = features.loc[:, features.isnull().mean() < nan_threshold]
        
        # Remove constant features
        features_clean = features_clean.loc[:, features_clean.nunique() > 1]
        
        # Remove highly correlated features (correlation > 0.95)
        if features_clean.shape[1] > 1:
            corr_matrix = features_clean.corr().abs()
            upper_tri = corr_matrix.where(np.triu(np.ones(corr_matrix.shape), k=1).astype(bool))
            to_drop = [column for column in upper_tri.columns if any(upper_tri[column] > 0.95)]
            features_clean = features_clean.drop(columns=to_drop, errors='ignore')
        
        # Forward fill remaining NaN values
        features_clean = features_clean.ffill().fillna(0)
        
        # Remove infinite values
        features_clean = features_clean.replace([np.inf, -np.inf], np.nan).fillna(0)
        
        # Store feature metadata
        self.feature_metadata = {
            'total_features': features.shape[1],
            'selected_features': features_clean.shape[1],
            'removed_due_to_nan': features.shape[1] - features_clean.shape[1],
            'feature_categories': self._categorize_features(features_clean.columns)
        }
        
        self.logger.info(f"Feature cleaning: {features.shape[1]} → {features_clean.shape[1]} features")
        
        return features_clean
    
    def _categorize_features(self, feature_names: List[str]) -> Dict[str, int]:
        """Categorize features by type"""
        categories = {
            'momentum': 0, 'trend': 0, 'volatility': 0, 'volume': 0, 'price': 0,
            'sentiment': 0, 'microstructure': 0, 'derivatives': 0, 'on_chain': 0,
            'interaction': 0, 'other': 0
        }
        
        for feature in feature_names:
            feature_lower = feature.lower()
            if any(term in feature_lower for term in ['rsi', 'macd', 'stoch', 'willr', 'roc']):
                categories['momentum'] += 1
            elif any(term in feature_lower for term in ['sma', 'ema', 'wma', 'adx', 'aroon']):
                categories['trend'] += 1
            elif any(term in feature_lower for term in ['bb', 'atr', 'std', 'volatility']):
                categories['volatility'] += 1
            elif any(term in feature_lower for term in ['volume', 'obv', 'cmf', 'vwap']):
                categories['volume'] += 1
            elif any(term in feature_lower for term in ['price', 'close', 'open', 'high', 'low']):
                categories['price'] += 1
            elif any(term in feature_lower for term in ['sentiment', 'fear', 'greed', 'social']):
                categories['sentiment'] += 1
            elif any(term in feature_lower for term in ['spread', 'depth', 'order', 'flow']):
                categories['microstructure'] += 1
            elif any(term in feature_lower for term in ['basis', 'funding', 'oi', 'put_call']):
                categories['derivatives'] += 1
            elif any(term in feature_lower for term in ['transaction', 'hash', 'address', 'exchange']):
                categories['on_chain'] += 1
            elif any(term in feature_lower for term in ['ratio', 'div', 'corr', 'interaction']):
                categories['interaction'] += 1
            else:
                categories['other'] += 1
        
        return {k: v for k, v in categories.items() if v > 0}
    
    def get_feature_importance(self, features: pd.DataFrame, target: pd.Series, 
                             method: str = 'mutual_info', top_n: int = 20) -> pd.DataFrame:
        """
        Calculate feature importance using various methods
        
        Args:
            features: Feature matrix
            target: Target variable
            method: Importance calculation method ('mutual_info', 'correlation', 'random_forest')
            top_n: Number of top features to return
            
        Returns:
            DataFrame with feature importance scores
        """
        from sklearn.feature_selection import mutual_info_regression
        from sklearn.ensemble import RandomForestRegressor
        
        if method == 'mutual_info':
            # Handle NaN values
            clean_features = features.fillna(features.median())
            clean_target = target.fillna(target.median())
            
            # Calculate mutual information
            mi_scores = mutual_info_regression(clean_features, clean_target, random_state=42)
            importance_df = pd.DataFrame({
                'feature': features.columns,
                'importance': mi_scores,
                'method': 'mutual_info'
            }).sort_values('importance', ascending=False)
            
        elif method == 'correlation':
            # Calculate correlation with target
            correlations = []
            for col in features.columns:
                corr = features[col].corr(target)
                correlations.append(abs(corr))
            
            importance_df = pd.DataFrame({
                'feature': features.columns,
                'importance': correlations,
                'method': 'correlation'
            }).sort_values('importance', ascending=False)
            
        elif method == 'random_forest':
            # Train random forest for feature importance
            rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
            clean_features = features.fillna(features.median())
            clean_target = target.fillna(target.median())
            
            rf.fit(clean_features, clean_target)
            
            importance_df = pd.DataFrame({
                'feature': features.columns,
                'importance': rf.feature_importances_,
                'method': 'random_forest'
            }).sort_values('importance', ascending=False)
        
        else:
            raise ValueError(f"Unknown importance method: {method}")
        
        return importance_df.head(top_n)
    
    def create_lag_features(self, features: pd.DataFrame, lags: List[int]) -> pd.DataFrame:
        """Create lagged versions of features"""
        lagged_features = pd.DataFrame(index=features.index)
        
        for lag in lags:
            for col in features.columns:
                lagged_features[f'{col}_lag_{lag}'] = features[col].shift(lag)
        
        return lagged_features
    
    def create_rolling_features(self, features: pd.DataFrame, 
                              windows: List[int], 
                              functions: List[str]) -> pd.DataFrame:
        """Create rolling statistical features"""
        rolling_features = pd.DataFrame(index=features.index)
        
        func_map = {
            'mean': lambda x: x.mean(),
            'std': lambda x: x.std(),
            'min': lambda x: x.min(),
            'max': lambda x: x.max(),
            'skew': lambda x: x.skew(),
            'kurt': lambda x: x.kurtosis(),
            'quantile_25': lambda x: x.quantile(0.25),
            'quantile_75': lambda x: x.quantile(0.75)
        }
        
        for window in windows:
            for func_name in functions:
                if func_name in func_map:
                    for col in features.columns:
                        rolling_features[f'{col}_{func_name}_{window}'] = (
                            features[col].rolling(window=window).apply(func_map[func_name])
                        )
        
        return rolling_features

# Example usage and testing
async def test_advanced_feature_engineering():
    """Test the advanced feature engineering system"""
    
    print("🔬 Testing Advanced Feature Engineering...")
    
    # Initialize feature engineer
    config = FeatureConfig(
        lookback_windows=[5, 10, 20, 50],
        momentum_windows=[3, 5, 10, 14],
        volatility_windows=[5, 10, 20],
        volume_windows=[5, 10, 20, 50]
    )
    
    feature_engineer = AdvancedFeatureEngineer(config)
    
    # Create synthetic test data
    np.random.seed(42)
    dates = pd.date_range(start='2024-01-01', periods=1000, freq='h')
    
    # Price data (OHLCV)
    base_price = 50000
    price_changes = np.random.randn(1000) * 100
    prices = base_price + np.cumsum(price_changes)
    
    price_data = pd.DataFrame({
        'timestamp': dates,
        'open': prices + np.random.randn(1000) * 10,
        'high': prices + np.abs(np.random.randn(1000) * 50),
        'low': prices - np.abs(np.random.randn(1000) * 50),
        'close': prices,
        'volume': np.random.randint(1000000, 10000000, 1000)
    })
    price_data.set_index('timestamp', inplace=True)
    
    # Order book data
    orderbook_data = pd.DataFrame({
        'timestamp': dates,
        'bid_price': prices - np.random.randn(1000) * 5,
        'ask_price': prices + np.random.randn(1000) * 5,
        'bid_volume': np.random.randint(100000, 1000000, 1000),
        'ask_volume': np.random.randint(100000, 1000000, 1000),
        'buy_orders': np.random.randint(100, 1000, 1000),
        'sell_orders': np.random.randint(100, 1000, 1000)
    })
    orderbook_data.set_index('timestamp', inplace=True)
    
    # Sentiment data
    sentiment_data = pd.DataFrame({
        'timestamp': dates,
        'sentiment_score': np.random.randn(1000) * 0.5,
        'social_volume': np.random.randint(1000, 10000, 1000),
        'fear_greed': np.random.randint(20, 80, 1000)
    })
    sentiment_data.set_index('timestamp', inplace=True)
    
    # Derivatives data
    derivatives_data = pd.DataFrame({
        'timestamp': dates,
        'futures_price': prices + np.random.randn(1000) * 20,
        'spot_price': prices,
        'open_interest': np.random.randint(1000000, 5000000, 1000),
        'funding_rate': np.random.randn(1000) * 0.001,
        'put_call_ratio': np.random.uniform(0.5, 1.5, 1000)
    })
    derivatives_data.set_index('timestamp', inplace=True)
    
    # On-chain data
    on_chain_data = pd.DataFrame({
        'timestamp': dates,
        'transaction_count': np.random.randint(200000, 400000, 1000),
        'active_addresses': np.random.randint(500000, 1000000, 1000),
        'hash_rate': np.random.randint(150000000, 200000000, 1000),
        'exchange_inflow': np.random.randint(1000, 5000, 1000),
        'exchange_outflow': np.random.randint(1000, 5000, 1000)
    })
    on_chain_data.set_index('timestamp', inplace=True)
    
    # Engineer features
    print("Engineering comprehensive features...")
    engineered_features = feature_engineer.engineer_features(
        price_data=price_data,
        orderbook_data=orderbook_data,
        sentiment_data=sentiment_data,
        derivatives_data=derivatives_data,
        on_chain_data=on_chain_data
    )
    
    print(f"\n📊 Feature Engineering Results:")
    print(f"  Original features: {price_data.shape[1]}")
    print(f"  Engineered features: {engineered_features.shape[1]}")
    print(f"  Feature categories: {feature_engineer.feature_metadata['feature_categories']}")
    
    # Test feature importance
    print("\n🔍 Calculating feature importance...")
    target = price_data['close'].pct_change().shift(-1)  # Next period returns
    importance = feature_engineer.get_feature_importance(
        engineered_features.tail(500),  # Use last 500 for importance
        target.tail(500),
        method='mutual_info',
        top_n=10
    )
    
    print("\nTop 10 Most Important Features:")
    for idx, row in importance.iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    # Test lag and rolling features
    print("\n🔄 Creating lag and rolling features...")
    lag_features = feature_engineer.create_lag_features(engineered_features.tail(100), lags=[1, 2, 5])
    rolling_features = feature_engineer.create_rolling_features(
        engineered_features.tail(100), 
        windows=[5, 10, 20], 
        functions=['mean', 'std', 'skew', 'kurt']
    )
    
    print(f"  Lag features: {lag_features.shape[1]}")
    print(f"  Rolling features: {rolling_features.shape[1]}")
    
    print("\n✅ Advanced feature engineering test completed!")
    return feature_engineer, engineered_features

if __name__ == "__main__":
    # Run comprehensive test
    asyncio.run(test_advanced_feature_engineering())