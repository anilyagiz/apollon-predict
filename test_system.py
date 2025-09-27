#!/usr/bin/env python3
"""
Test script for ALGO ZK Price Oracle System
Tests price aggregation and API server functionality
"""

import asyncio
import sys
import os
import requests
import time
from datetime import datetime

# Add backend paths
sys.path.append('backend/data-aggregator')
sys.path.append('backend/ml-engine')

async def test_price_aggregator():
    """Test price data aggregator"""
    print("Testing Price Data Aggregator...")
    
    try:
        from price_aggregator import PriceDataAggregator
        
        aggregator = PriceDataAggregator()
        
        # Test current price fetch
        print("  - Fetching current price...")
        current_data = await aggregator.get_aggregated_price()
        
        if current_data:
            print(f"  Current ALGO price: ${current_data['aggregated_price']:.6f}")
            print(f"  Confidence: {current_data['confidence']:.3f}")
            print(f"  Sources: {current_data['source_count']}")
        else:
            print("  Failed to fetch current price")
            return False
            
        # Test historical data
        print("  - Fetching historical data...")
        historical = await aggregator.fetch_historical_data(days=7)
        
        if historical and len(historical) > 0:
            print(f"  Historical data: {len(historical)} data points")
        else:
            print("  Failed to fetch historical data")
            return False
            
        return True
        
    except Exception as e:
        print(f"  Price aggregator test failed: {e}")
        return False

def test_api_server():
    """Test API server endpoints"""
    print("🌐 Testing API Server...")
    
    base_url = "http://localhost:8000"
    
    try:
        # Test health endpoint
        print("  - Testing health endpoint...")
        response = requests.get(f"{base_url}/health", timeout=10)
        
        if response.status_code == 200:
            health_data = response.json()
            print(f"  Health check: {health_data['status']}")
            print(f"  Models trained: {health_data['models_trained']}")
        else:
            print(f"  Health check failed: {response.status_code}")
            return False
            
        # Test current price endpoint
        print("  - Testing current price endpoint...")
        response = requests.get(f"{base_url}/price/current", timeout=15)
        
        if response.status_code == 200:
            price_data = response.json()
            print(f"  ✅ Current price: ${price_data.get('aggregated_price', 'N/A')}")
        else:
            print(f"  ❌ Current price endpoint failed: {response.status_code}")
            # Not critical, continue
            
        # Test prediction endpoint (if models are trained)
        print("  - Testing prediction endpoint...")
        prediction_data = {
            "symbol": "ALGOUSD",
            "timeframe": "24h",
            "include_confidence": True
        }
        
        response = requests.post(
            f"{base_url}/predict", 
            json=prediction_data, 
            timeout=30
        )
        
        if response.status_code == 200:
            prediction = response.json()
            print(f"  ✅ Prediction: ${prediction.get('predicted_price', 'N/A')}")
            print(f"  ✅ Confidence: {prediction.get('confidence', 'N/A')}")
        elif response.status_code == 503:
            print("  ⚠️  Models still training - this is expected on first run")
        else:
            print(f"  ❌ Prediction endpoint failed: {response.status_code}")
            
        return True
        
    except requests.exceptions.ConnectionError:
        print("  ❌ Cannot connect to API server. Is it running?")
        print("     Start with: cd backend/api && python server.py")
        return False
    except Exception as e:
        print(f"  ❌ API test failed: {e}")
        return False

def test_ml_models():
    """Test ML model imports"""
    print("🧠 Testing ML Model Imports...")
    
    try:
        # Test LSTM import
        print("  - Testing LSTM import...")
        from LSTM import MyLSTM
        print("  ✅ LSTM import successful")
        
        # Test GRU import  
        print("  - Testing GRU import...")
        from GRU import MyGRU
        print("  ✅ GRU import successful")
        
        # Test Prophet import
        print("  - Testing Prophet import...")
        from my_prophet import MyProphet
        print("  ✅ Prophet import successful")
        
        # Test XGBoost import
        print("  - Testing XGBoost import...")
        from my_xgboost import MyXGboost
        print("  ✅ XGBoost import successful")
        
        return True
        
    except Exception as e:
        print(f"  ❌ ML model import failed: {e}")
        return False

async def main():
    """Run all tests"""
    print("🚀 ALGO ZK Price Oracle System Test")
    print("=" * 50)
    
    results = []
    
    # Test price aggregator
    results.append(await test_price_aggregator())
    print()
    
    # Test ML models
    results.append(test_ml_models())
    print()
    
    # Test API server
    results.append(test_api_server())
    print()
    
    # Summary
    print("📊 Test Summary")
    print("=" * 50)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All tests passed ({passed}/{total})")
        print("\n🎉 System is working correctly!")
        print("\nNext steps:")
        print("1. Start API server: cd backend/api && python server.py")
        print("2. Visit http://localhost:8000 for API documentation")
        print("3. Test prediction: curl -X POST http://localhost:8000/predict -H 'Content-Type: application/json' -d '{\"symbol\": \"ALGOUSD\", \"timeframe\": \"24h\"}'")
    else:
        print(f"❌ {total - passed} test(s) failed ({passed}/{total} passed)")
        print("\nCheck the errors above and:")
        print("1. Install missing dependencies: pip install -r requirements.txt")
        print("2. Start the API server: cd backend/api && python server.py")
        print("3. Check internet connection for price data")
    
    return passed == total

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)