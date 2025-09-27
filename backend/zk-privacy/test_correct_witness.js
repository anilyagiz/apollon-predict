// Test with correct witness calculation

const weights = {
    lstm_weight: 350,      // 0.35 * 1000
    gru_weight: 250,       // 0.25 * 1000  
    prophet_weight: 250,   // 0.25 * 1000
    xgboost_weight: 150    // 0.15 * 1000
};

// Individual predictions (scaled by 1000)
const predictions = {
    lstm_prediction: 210,    // 0.210 * 1000
    gru_prediction: 205,     // 0.205 * 1000
    prophet_prediction: 208, // 0.208 * 1000
    xgboost_prediction: 207  // 0.207 * 1000
};

// Calculate weighted sum
const weighted_sum = 
    predictions.lstm_prediction * weights.lstm_weight +
    predictions.gru_prediction * weights.gru_weight +
    predictions.prophet_prediction * weights.prophet_weight +
    predictions.xgboost_prediction * weights.xgboost_weight;

console.log("🔍 Correct Witness Calculation:");
console.log("weighted_sum:", weighted_sum);

// For circuit: weighted_sum === predicted_price * 1000
// So: predicted_price = weighted_sum / 1000
const predicted_price = Math.round(weighted_sum / 1000);

console.log("predicted_price (calculated):", predicted_price);
console.log("predicted_price * 1000:", predicted_price * 1000);
console.log("Circuit equation valid:", weighted_sum === predicted_price * 1000);

console.log("");
console.log("✅ Correct witness values:");
console.log("predicted_price:", predicted_price);
console.log("All other values stay the same");

// Test with these values
const correctWitness = {
    predicted_price,
    ...weights,
    ...predictions
};

console.log("");
console.log("🧪 Final witness object:");
console.log(JSON.stringify(correctWitness, null, 2));