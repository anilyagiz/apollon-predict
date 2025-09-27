"""
Basic usage examples for ALGO ZK Oracle Python SDK
"""

import asyncio
from algo_zk_oracle import AlgoZKOracleClient, SDKConfig, PredictionRequest


async def async_example():
    """Async client usage example"""
    
    # Initialize async client
    config = SDKConfig(
        base_url="http://localhost:8000",
        timeout=30.0,
        retries=3,
        enable_zk_verification=True,
    )
    
    async with AlgoZKOracleClient(config) as client:
        try:
            # Check API health
            print("Checking API health...")
            health = await client.health()
            print(f"Health: {health.status}, Models trained: {health.models_trained}")
            
            # Wait for models to be ready
            if not health.models_trained:
                print("Waiting for models to be trained...")
                ready = await client.wait_for_models(60.0)  # 1 minute timeout
                if not ready:
                    raise Exception("Models not ready within timeout")
            
            # Get current price
            print("\\nGetting current price...")
            current_price = await client.get_current_price()
            print(f"Current Price: ${current_price.price:.6f}")
            print(f"Confidence: {current_price.confidence:.2%}")
            print(f"Sources: {', '.join(current_price.sources)}")
            
            # Get technical indicators
            print("\\nGetting technical indicators...")
            technicals = await client.get_technical_indicators()
            print(f"RSI: {technicals.indicators.rsi:.2f}")
            print(f"Volatility: {technicals.indicators.volatility:.4f}")
            
            # Generate basic prediction
            print("\\nGenerating prediction...")
            prediction = await client.predict(PredictionRequest(
                symbol="ALGOUSD",
                timeframe="24h",
                include_confidence=True,
            ))
            print(f"Predicted Price: ${prediction.predicted_price:.6f}")
            print(f"Price Change: {prediction.price_change_percent:.2f}%")
            print(f"Confidence: {prediction.confidence:.2%}")
            
            # Generate ZK-enhanced prediction
            print("\\nGenerating ZK-enhanced prediction...")
            zk_prediction = await client.predict_with_zk(PredictionRequest(
                symbol="ALGOUSD",
                timeframe="24h",
            ))
            print(f"ZK Predicted Price: ${zk_prediction.predicted_price:.6f}")
            print(f"ZK Confidence: {zk_prediction.confidence:.2%}")
            print(f"Model weights hidden: {zk_prediction.privacy_status.model_weights_hidden}")
            print(f"Individual predictions hidden: {zk_prediction.privacy_status.individual_predictions_hidden}")
            print(f"ZK Proof verified: {zk_prediction.zk_proof.verified}")
            
            # Get historical data
            print("\\nGetting historical data...")
            historical = await client.get_historical_data(days=7)
            print(f"Historical data points: {historical.data_points}")
            print(f"Latest price: ${historical.data[-1].price:.6f}")
            
        except Exception as error:
            print(f"Error: {error}")


def sync_example():
    """Synchronous client usage example"""
    from algo_zk_oracle.client.oracle_client import AlgoZKOracleClientSync
    
    # Initialize sync client
    config = SDKConfig(
        base_url="http://localhost:8000",
        timeout=30.0,
        retries=3,
    )
    
    client = AlgoZKOracleClientSync(config)
    
    try:
        # Check API health
        print("Checking API health (sync)...")
        health = client.health()
        print(f"Health: {health.status}")
        
        # Get current price
        print("Getting current price (sync)...")
        current_price = client.get_current_price()
        print(f"Current Price: ${current_price.price:.6f}")
        
        # Generate prediction
        print("Generating prediction (sync)...")
        prediction = client.predict()
        print(f"Predicted Price: ${prediction.predicted_price:.6f}")
        print(f"Confidence: {prediction.confidence:.2%}")
        
    except Exception as error:
        print(f"Error: {error}")
    finally:
        client.close()


if __name__ == "__main__":
    print("=== Async Example ===")
    asyncio.run(async_example())
    
    print("\\n=== Sync Example ===")
    sync_example()