// Debug witness calculation for ZK circuit

const testPrediction = {
    ensemble_prediction: 0.207528,
    lstm_prediction: 0.210,
    gru_prediction: 0.205,
    prophet_prediction: 0.208,
    xgboost_prediction: 0.207
};

// Prepare witness like in proof_generator.js
const witness = {
    // Public input
    predicted_price: Math.round(testPrediction.ensemble_prediction * 1000),
    
    // Private inputs - model weights (scaled by 1000)
    lstm_weight: 350,      // 0.35 * 1000
    gru_weight: 250,       // 0.25 * 1000  
    prophet_weight: 250,   // 0.25 * 1000
    xgboost_weight: 150,   // 0.15 * 1000
    
    // Private inputs - individual predictions (scaled by 1000)
    lstm_prediction: Math.round(testPrediction.lstm_prediction * 1000),
    gru_prediction: Math.round(testPrediction.gru_prediction * 1000),
    prophet_prediction: Math.round(testPrediction.prophet_prediction * 1000),
    xgboost_prediction: Math.round(testPrediction.xgboost_prediction * 1000)
};

console.log("🔍 Debug Witness Calculation:");
console.log("predicted_price:", witness.predicted_price);
console.log("");

console.log("📊 Individual Contributions:");
const lstm_contrib = witness.lstm_prediction * witness.lstm_weight;
const gru_contrib = witness.gru_prediction * witness.gru_weight;
const prophet_contrib = witness.prophet_prediction * witness.prophet_weight;
const xgboost_contrib = witness.xgboost_prediction * witness.xgboost_weight;

console.log("lstm_contrib:", lstm_contrib, "=", witness.lstm_prediction, "*", witness.lstm_weight);
console.log("gru_contrib:", gru_contrib, "=", witness.gru_prediction, "*", witness.gru_weight);
console.log("prophet_contrib:", prophet_contrib, "=", witness.prophet_prediction, "*", witness.prophet_weight);
console.log("xgboost_contrib:", xgboost_contrib, "=", witness.xgboost_prediction, "*", witness.xgboost_weight);

console.log("");
console.log("🧮 Weighted Sum:");
const weighted_sum = lstm_contrib + gru_contrib + prophet_contrib + xgboost_contrib;
console.log("weighted_sum:", weighted_sum);

console.log("");
console.log("❓ Circuit Assertion Check:");
console.log("predicted_price * 1000000 =", witness.predicted_price * 1000000);
console.log("weighted_sum =", weighted_sum);
console.log("Equal?", witness.predicted_price * 1000000 === weighted_sum);

console.log("");
console.log("🔧 Expected ensemble calculation:");
const manual_ensemble = (
    witness.lstm_prediction * witness.lstm_weight +
    witness.gru_prediction * witness.gru_weight +
    witness.prophet_prediction * witness.prophet_weight +
    witness.xgboost_prediction * witness.xgboost_weight
) / 1000;

console.log("Manual ensemble (divided by 1000):", manual_ensemble);
console.log("Original ensemble * 1000:", testPrediction.ensemble_prediction * 1000);
console.log("Witness predicted_price:", witness.predicted_price);

console.log("");
console.log("💡 Issue Analysis:");
if (witness.predicted_price * 1000000 !== weighted_sum) {
    console.log("❌ Circuit assertion will FAIL");
    console.log("Difference:", Math.abs(witness.predicted_price * 1000000 - weighted_sum));
    
    // Calculate what predicted_price should be
    const correct_predicted_price = Math.round(weighted_sum / 1000000);
    console.log("Correct predicted_price should be:", correct_predicted_price);
} else {
    console.log("✅ Circuit assertion will PASS");
}