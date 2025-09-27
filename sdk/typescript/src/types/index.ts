/**
 * Type definitions for Apollon - ZK Oracle Price Oracle SDK
 */

export interface PredictionRequest {
  symbol?: string;
  timeframe?: string;
  include_confidence?: boolean;
  include_technicals?: boolean;
}

export interface PredictionResponse {
  symbol: string;
  timeframe: string;
  predicted_price: number;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  confidence: number;
  confidence_interval: {
    lower: number;
    upper: number;
  };
  individual_predictions: {
    lstm: number;
    gru: number;
    prophet: number;
    xgboost: number;
  };
  model_weights: {
    lstm: number;
    gru: number;
    prophet: number;
    xgboost: number;
  };
  timestamp: string;
  status: string;
}

export interface ZKProof {
  proof: {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
  };
  public_signals: string[];
  verified: boolean;
}

export interface ZKPredictionResponse extends PredictionResponse {
  zk_proof: ZKProof;
  privacy_status: {
    model_weights_hidden: boolean;
    individual_predictions_hidden: boolean;
    circuit_verified: boolean;
    circuit_hash?: string;
  };
}

export interface CurrentPriceResponse {
  price: number;
  confidence: number;
  sources: string[];
  timestamp: string;
  aggregated_from: number;
}

export interface TechnicalIndicatorsResponse {
  symbol: string;
  indicators: {
    rsi: number;
    bollinger_upper: number;
    bollinger_lower: number;
    sma_5: number;
    sma_10: number;
    sma_20: number;
    volatility: number;
    volume_sma: number;
  };
  timestamp: string;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  models_trained: boolean;
  last_prediction?: string;
}

export interface HistoricalDataResponse {
  symbol: string;
  period_days: number;
  data_points: number;
  data: Array<{
    timestamp: string;
    price: number;
    volume?: number;
  }>;
  timestamp: string;
}

export interface ModelStatusResponse {
  models_trained: boolean;
  training_in_progress: boolean;
  last_prediction?: string;
  model_weights: {
    lstm: number;
    gru: number;
    prophet: number;
    xgboost: number;
  };
  prediction_history_count: number;
}

export interface SDKConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  enableZKVerification?: boolean;
}

export interface SDKError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}