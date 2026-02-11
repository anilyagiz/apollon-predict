from .random_forest import RandomForest
from .LSTM import MyLSTM
from .GRU import MyGRU

# Base models always available
MODELS = {
    "random_forest": RandomForest,
    "lstm": MyLSTM,
    "gru": MyGRU,
}

# Optional: Sarimax model (requires statsmodels)
try:
    from .sarimax import Sarimax
    MODELS["sarimax"] = Sarimax
except ImportError:
    pass

# Optional: ARIMA model (requires statsmodels)
try:
    from .arima import MyARIMA
    MODELS["arima"] = MyARIMA
except ImportError:
    pass

# Optional: Prophet model (requires prophet)
try:
    from .my_prophet import MyProphet
    MODELS["prophet"] = MyProphet
except ImportError:
    pass

# Optional: XGBoost model (requires xgboost)
try:
    from .my_xgboost import MyXGboost
    MODELS["xgboost"] = MyXGboost
except ImportError:
    pass

# Optional: Neural Prophet model (requires neuralprophet)
try:
    from .neural_prophet import Neural_Prophet
    MODELS["neural_prophet"] = Neural_Prophet
except ImportError:
    pass

# Optional: Orbit model (requires orbit-ml)
try:
    from .orbit_model import Orbit
    MODELS["orbit"] = Orbit
except ImportError:
    pass
