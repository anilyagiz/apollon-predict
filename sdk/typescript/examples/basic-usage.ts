/**
 * Basic usage examples for Apollon - ZK Oracle Oracle SDK
 */

import { AlgoZKOracleClient } from '../src';

async function basicExample() {
  // Initialize client
  const client = new AlgoZKOracleClient({
    baseURL: 'http://localhost:8000',
    timeout: 30000,
    retries: 3,
    enableZKVerification: true,
  });

  try {
    // Check API health
    console.log('Checking API health...');
    const health = await client.health();
    console.log('Health:', health);

    // Wait for models to be ready
    if (!health.models_trained) {
      console.log('Waiting for models to be trained...');
      const ready = await client.waitForModels(60000); // 1 minute timeout
      if (!ready) {
        throw new Error('Models not ready within timeout');
      }
    }

    // Get current price
    console.log('\\nGetting current price...');
    const currentPrice = await client.getCurrentPrice();
    console.log('Current Price:', currentPrice);

    // Get technical indicators
    console.log('\\nGetting technical indicators...');
    const technicals = await client.getTechnicalIndicators();
    console.log('Technical Indicators:', technicals);

    // Generate basic prediction
    console.log('\\nGenerating prediction...');
    const prediction = await client.predict({
      symbol: 'ALGOUSD',
      timeframe: '24h',
      include_confidence: true,
    });
    console.log('Prediction:', {
      predicted_price: prediction.predicted_price,
      confidence: prediction.confidence,
      price_change_percent: prediction.price_change_percent,
    });

    // Generate ZK-enhanced prediction
    console.log('\\nGenerating ZK-enhanced prediction...');
    const zkPrediction = await client.predictWithZK({
      symbol: 'ALGOUSD',
      timeframe: '24h',
    });
    console.log('ZK Prediction:', {
      predicted_price: zkPrediction.predicted_price,
      confidence: zkPrediction.confidence,
      privacy_status: zkPrediction.privacy_status,
      zk_proof_verified: zkPrediction.zk_proof.verified,
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run example
if (require.main === module) {
  basicExample();
}