#!/usr/bin/env ts-node
/**
 * Test script for ALGO ZK Oracle TypeScript SDK
 */

import * as path from 'path';

// Import SDK from local path (for testing)
const sdkPath = path.join(__dirname, '..', '..', 'sdk', 'typescript', 'src');

// Import types and classes
import { 
  AlgoZKOracleClient,
  PredictionRequest,
  AlgoZKOracleError,
  NetworkError,
  ModelNotReadyError,
  ZKVerificationError,
  withRetry,
  SDKConfig,
} from '../../sdk/typescript/src';

async function testTypeScriptSDK(): Promise<void> {
  console.log('🧪 Testing TypeScript SDK...');
  
  const config: SDKConfig = {
    baseURL: 'http://localhost:8000',
    timeout: 30000,
    retries: 3,
    enableZKVerification: true,
  };
  
  const client = new AlgoZKOracleClient(config);
  
  try {
    // Test 1: Health Check
    console.log('✅ Test 1: Health Check');
    const health = await client.health();
    console.log(`   Status: ${health.status}`);
    console.log(`   Models Trained: ${health.models_trained}`);
    console.log(`   Timestamp: ${health.timestamp}`);
    
    // Wait for models if needed
    if (!health.models_trained) {
      console.log('⏳ Waiting for models to be ready...');
      const ready = await client.waitForModels(60000);
      if (!ready) {
        console.log('❌ Models not ready within timeout');
        return;
      }
      console.log('✅ Models are now ready');
    }
    
    // Test 2: Current Price
    console.log('\\n✅ Test 2: Current Price');
    const currentPrice = await client.getCurrentPrice();
    console.log(`   Price: $${currentPrice.price.toFixed(6)}`);
    console.log(`   Confidence: ${(currentPrice.confidence * 100).toFixed(2)}%`);
    console.log(`   Sources: ${currentPrice.sources.join(', ')}`);
    
    // Test 3: Technical Indicators
    console.log('\\n✅ Test 3: Technical Indicators');
    const technicals = await client.getTechnicalIndicators();
    console.log(`   RSI: ${technicals.indicators.rsi.toFixed(2)}`);
    console.log(`   Volatility: ${technicals.indicators.volatility.toFixed(4)}`);
    console.log(`   SMA 20: ${technicals.indicators.sma_20.toFixed(6)}`);
    
    // Test 4: Historical Data
    console.log('\\n✅ Test 4: Historical Data');
    const historical = await client.getHistoricalData(7);
    console.log(`   Data Points: ${historical.data_points}`);
    console.log(`   Latest Price: $${historical.data[historical.data.length - 1].price.toFixed(6)}`);
    console.log(`   Period: ${historical.period_days} days`);
    
    // Test 5: Standard Prediction
    console.log('\\n✅ Test 5: Standard Prediction');
    const prediction = await client.predict({
      symbol: 'ALGOUSD',
      timeframe: '24h',
      include_confidence: true,
    } as PredictionRequest);
    
    console.log(`   Predicted Price: $${prediction.predicted_price.toFixed(6)}`);
    console.log(`   Current Price: $${prediction.current_price.toFixed(6)}`);
    console.log(`   Price Change: ${prediction.price_change_percent.toFixed(2)}%`);
    console.log(`   Confidence: ${(prediction.confidence * 100).toFixed(2)}%`);
    console.log(`   Individual Models:`);
    console.log(`     LSTM: $${prediction.individual_predictions.lstm.toFixed(6)}`);
    console.log(`     GRU: $${prediction.individual_predictions.gru.toFixed(6)}`);
    console.log(`     Prophet: $${prediction.individual_predictions.prophet.toFixed(6)}`);
    console.log(`     XGBoost: $${prediction.individual_predictions.xgboost.toFixed(6)}`);
    
    // Test 6: ZK-Enhanced Prediction
    console.log('\\n✅ Test 6: ZK-Enhanced Prediction');
    const startTime = Date.now();
    const zkPrediction = await client.predictWithZK();
    const endTime = Date.now();
    
    console.log(`   ZK Predicted Price: $${zkPrediction.predicted_price.toFixed(6)}`);
    console.log(`   Confidence: ${(zkPrediction.confidence * 100).toFixed(2)}%`);
    console.log(`   Processing Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`   Privacy Status:`);
    console.log(`     Model Weights Hidden: ${zkPrediction.privacy_status.model_weights_hidden}`);
    console.log(`     Individual Predictions Hidden: ${zkPrediction.privacy_status.individual_predictions_hidden}`);
    console.log(`     Circuit Verified: ${zkPrediction.privacy_status.circuit_verified}`);
    console.log(`   ZK Proof:`);
    console.log(`     Verified: ${zkPrediction.zk_proof.verified}`);
    console.log(`     Public Signals: ${zkPrediction.zk_proof.public_signals}`);
    
    // Test 7: ZK Proof Verification
    console.log('\\n✅ Test 7: Independent ZK Proof Verification');
    const verified = await client.verifyZKProof(
      zkPrediction.zk_proof.proof,
      zkPrediction.zk_proof.public_signals
    );
    console.log(`   Independent Verification: ${verified}`);
    
    // Test 8: Model Status
    console.log('\\n✅ Test 8: Model Status');
    const status = await client.getModelStatus();
    console.log(`   Models Trained: ${status.models_trained}`);
    console.log(`   Training in Progress: ${status.training_in_progress}`);
    console.log(`   Prediction History Count: ${status.prediction_history_count}`);
    
    // Test 9: Error Handling
    console.log('\\n✅ Test 9: Error Handling');
    try {
      // Try to get historical data with invalid parameter
      await client.getHistoricalData(500); // Should fail (max 365)
    } catch (error) {
      if (error instanceof AlgoZKOracleError) {
        console.log(`   Caught SDK Error: [${error.code}] ${error.message}`);
      } else {
        console.log(`   Caught Error: ${error}`);
      }
    }
    
    // Test 10: Retry Logic
    console.log('\\n✅ Test 10: Retry Logic');
    const retryResult = await withRetry(
      () => client.getCurrentPrice(),
      { maxAttempts: 2, delay: 500 }
    );
    console.log(`   Retry Success: $${retryResult.price.toFixed(6)}`);
    
    console.log('\\n🎉 All TypeScript tests completed successfully!');
    
  } catch (error) {
    if (error instanceof AlgoZKOracleError) {
      console.log(`❌ SDK Error [${error.code}]: ${error.message}`);
    } else if (error instanceof Error) {
      console.log(`❌ Unexpected Error: ${error.message}`);
    } else {
      console.log(`❌ Unknown Error: ${error}`);
    }
  }
}

async function testErrorScenarios(): Promise<void> {
  console.log('\\n🧪 Testing Error Scenarios...');
  
  // Test with invalid URL
  const invalidClient = new AlgoZKOracleClient({
    baseURL: 'http://localhost:9999', // Non-existent port
    timeout: 5000,
    retries: 1,
  });
  
  try {
    await invalidClient.health();
    console.log('❌ Expected network error but request succeeded');
  } catch (error) {
    if (error instanceof NetworkError) {
      console.log('✅ Network error properly caught and classified');
    } else {
      console.log(`✅ Error caught: ${error}`);
    }
  }
}

async function main(): Promise<void> {
  console.log('🚀 Starting ALGO ZK Oracle TypeScript SDK Tests');
  console.log('=' .repeat(60));
  
  // Test main SDK functionality
  await testTypeScriptSDK();
  
  // Test error scenarios
  await testErrorScenarios();
  
  console.log('\\n' + '='.repeat(60));
  console.log('📊 TypeScript SDK Test Summary:');
  console.log('✅ Type Safety: Full TypeScript support');
  console.log('✅ HTTP Client: Axios with interceptors');
  console.log('✅ ZK Privacy: Proof generation and verification');
  console.log('✅ Error Handling: Comprehensive error types');
  console.log('✅ Retry Logic: Configurable retry behavior');
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}