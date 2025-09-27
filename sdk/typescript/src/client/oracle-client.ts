/**
 * Main ALGO ZK Oracle SDK Client
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  SDKConfig,
  PredictionRequest,
  PredictionResponse,
  ZKPredictionResponse,
  CurrentPriceResponse,
  TechnicalIndicatorsResponse,
  HealthResponse,
  HistoricalDataResponse,
  ModelStatusResponse,
} from '../types';
import {
  AlgoZKOracleError,
  NetworkError,
  ValidationError,
  ModelNotReadyError,
  RateLimitError,
} from '../utils/errors';
import { withRetry } from '../utils/retry';
import { ZKVerifier } from '../utils/zk-verifier';

export class AlgoZKOracleClient {
  private http: AxiosInstance;
  private zkVerifier: ZKVerifier;
  private config: SDKConfig;

  constructor(config: SDKConfig) {
    this.config = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      enableZKVerification: true,
      ...config,
    };

    this.http = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': '@algo-zk/oracle-sdk/1.0.0',
      },
    });

    this.zkVerifier = new ZKVerifier();
    this.setupInterceptors();
  }

  /**
   * Initialize ZK verification (optional)
   */
  async initializeZKVerification(verificationKeyUrl?: string): Promise<void> {
    if (!this.config.enableZKVerification) return;

    const vkUrl = verificationKeyUrl || `${this.config.baseURL.replace('/api', '')}/verification_key.json`;
    
    try {
      await this.zkVerifier.loadVerificationKey(vkUrl);
    } catch (error) {
      console.warn('Failed to load ZK verification key:', error);
    }
  }

  /**
   * Setup HTTP interceptors for error handling
   */
  private setupInterceptors(): void {
    this.http.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          switch (status) {
            case 400:
              throw new ValidationError(data.detail || 'Invalid request');
            case 429:
              throw new RateLimitError(data.detail || 'Rate limit exceeded');
            case 503:
              if (data.detail?.includes('training')) {
                throw new ModelNotReadyError(data.detail);
              }
              throw new NetworkError(data.detail || 'Service unavailable');
            case 500:
              throw new AlgoZKOracleError('SERVER_ERROR', data.detail || 'Internal server error');
            default:
              throw new NetworkError(`HTTP ${status}: ${data.detail || error.message}`);
          }
        }

        if (error.request) {
          throw new NetworkError('Network error: No response received');
        }

        throw new AlgoZKOracleError('UNKNOWN_ERROR', error.message);
      }
    );
  }

  /**
   * Check API health status
   */
  async health(): Promise<HealthResponse> {
    return withRetry(async () => {
      const response: AxiosResponse<HealthResponse> = await this.http.get('/health');
      return response.data;
    });
  }

  /**
   * Get current aggregated price
   */
  async getCurrentPrice(): Promise<CurrentPriceResponse> {
    return withRetry(async () => {
      const response: AxiosResponse<CurrentPriceResponse> = await this.http.get('/price/current');
      return response.data;
    });
  }

  /**
   * Get technical indicators
   */
  async getTechnicalIndicators(): Promise<TechnicalIndicatorsResponse> {
    return withRetry(async () => {
      const response: AxiosResponse<TechnicalIndicatorsResponse> = await this.http.get('/price/technicals');
      return response.data;
    });
  }

  /**
   * Get historical price data
   */
  async getHistoricalData(days: number = 30): Promise<HistoricalDataResponse> {
    if (days > 365) {
      throw new ValidationError('Maximum historical data period is 365 days');
    }

    return withRetry(async () => {
      const response: AxiosResponse<HistoricalDataResponse> = await this.http.get(`/price/historical?days=${days}`);
      return response.data;
    });
  }

  /**
   * Get model training status
   */
  async getModelStatus(): Promise<ModelStatusResponse> {
    return withRetry(async () => {
      const response: AxiosResponse<ModelStatusResponse> = await this.http.get('/models/status');
      return response.data;
    });
  }

  /**
   * Generate price prediction
   */
  async predict(request: PredictionRequest = {}): Promise<PredictionResponse> {
    const payload = {
      symbol: 'ALGOUSD',
      timeframe: '24h',
      include_confidence: true,
      include_technicals: false,
      ...request,
    };

    return withRetry(async () => {
      const response: AxiosResponse<PredictionResponse> = await this.http.post('/predict', payload);
      return response.data;
    });
  }

  /**
   * Generate privacy-enhanced prediction with ZK proof
   */
  async predictWithZK(request: PredictionRequest = {}): Promise<ZKPredictionResponse> {
    const payload = {
      symbol: 'ALGOUSD',
      timeframe: '24h',
      include_confidence: true,
      include_technicals: false,
      ...request,
    };

    return withRetry(async () => {
      const response: AxiosResponse<ZKPredictionResponse> = await this.http.post('/predict-zk', payload);
      const result = response.data;

      // Verify ZK proof if enabled
      if (this.config.enableZKVerification && result.zk_proof) {
        try {
          const verification = await this.zkVerifier.verifyComplete(
            result.zk_proof,
            result.predicted_price
          );

          if (!verification.overallValid) {
            console.warn('ZK proof verification failed:', verification);
          }

          // Add verification result to response
          result.privacy_status.circuit_verified = verification.overallValid;
        } catch (error) {
          console.warn('ZK verification error:', error);
        }
      }

      return result;
    });
  }

  /**
   * Verify a ZK proof independently
   */
  async verifyZKProof(proof: any, publicSignals: string[]): Promise<boolean> {
    const response = await this.http.post('/verify-zk', {
      proof,
      public_signals: publicSignals,
    });

    return response.data.verified;
  }

  /**
   * Trigger model retraining (admin function)
   */
  async retrainModels(): Promise<{ message: string; timestamp: string }> {
    const response = await this.http.post('/models/retrain');
    return response.data;
  }

  /**
   * Wait for models to be ready
   */
  async waitForModels(maxWaitTime: number = 300000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const health = await this.health();
        if (health.models_trained) {
          return true;
        }
      } catch (error) {
        // Continue waiting on errors
      }

      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    }

    return false;
  }
}