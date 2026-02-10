from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import random
from datetime import datetime

app = FastAPI(title="Apollon Oracle API Mock")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Apollon Oracle API Mock", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "models_trained": True}


@app.get("/price/current")
def current_price():
    near_price = 1.03 + random.uniform(-0.02, 0.02)
    return {
        "aggregated_price": near_price,
        "confidence": 0.95,
        "sources": [
            {
                "name": "CoinGecko",
                "price": near_price,
                "volume_24h": 117000000,
                "change_24h": -0.97,
            },
            {
                "name": "CoinMarketCap",
                "price": near_price + 0.001,
                "volume_24h": 115000000,
                "change_24h": -0.95,
            },
        ],
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/predict")
def predict():
    current = 0.1854
    predicted = current * (1 + random.uniform(-0.02, 0.02))
    return {
        "symbol": "ALGOUSD",
        "timeframe": "24h",
        "predicted_price": predicted,
        "current_price": current,
        "price_change": predicted - current,
        "price_change_percent": ((predicted - current) / current) * 100,
        "confidence": 0.82,
        "confidence_interval": {"lower": predicted * 0.95, "upper": predicted * 1.05},
        "individual_predictions": {
            "lstm": predicted * 1.01,
            "gru": predicted * 0.99,
            "prophet": predicted * 1.00,
            "xgboost": predicted * 1.02,
        },
        "model_weights": {"lstm": 0.35, "gru": 0.25, "prophet": 0.25, "xgboost": 0.15},
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
