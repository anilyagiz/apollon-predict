#!/usr/bin/env python3
"""
Simple async-only test for Python SDK
"""

import asyncio
import sys
import os

# Add SDK to path (local testing)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'sdk', 'python'))

from algo_zk_oracle import AlgoZKOracleClient, SDKConfig, PredictionRequest

async def main():
    print("🧪 Testing Python Async SDK (Basic)...")
    
    config = SDKConfig(base_url="http://localhost:8000")
    
    async with AlgoZKOracleClient(config) as client:
        try:
            # Health check
            health = await client.health()
            print(f"✅ Health: {health.status}, Models: {health.models_trained}")
            
            # Current price
            price = await client.get_current_price()
            print(f"✅ Price: ${price.aggregated_price:.6f}, Confidence: {price.confidence:.2%}")
            
            # Technical indicators
            tech = await client.get_technical_indicators()
            print(f"✅ RSI: {tech.indicators.rsi:.2f}, SMA7: {tech.indicators.sma_7:.6f}")
            
            # Standard prediction
            pred = await client.predict()
            print(f"✅ Prediction: ${pred.predicted_price:.6f}, Change: {pred.price_change_percent:.2f}%")
            
            # ZK prediction
            zk_pred = await client.predict_with_zk()
            print(f"✅ ZK Prediction: ${zk_pred.predicted_price:.6f}")
            print(f"   Privacy: Weights={zk_pred.privacy_status.model_weights_hidden}, Verified={zk_pred.zk_proof.verified}")
            
            print("\n🎉 Python SDK Test Completed Successfully!")
            
        except Exception as e:
            print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())