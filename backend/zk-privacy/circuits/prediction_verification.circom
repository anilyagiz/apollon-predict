pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

/*
 * ALGO Price Prediction Verification Circuit
 * Verifies ensemble calculation with proper integer division
 */

template PredictionVerification() {
    // Public inputs
    signal input predicted_price;      // Scaled by 1000 (e.g., 207 for $0.207)
    
    // Private inputs (witness) - model secrets
    signal input lstm_weight;          // 350 (0.35 * 1000)
    signal input gru_weight;           // 250 (0.25 * 1000)  
    signal input prophet_weight;       // 250 (0.25 * 1000)
    signal input xgboost_weight;       // 150 (0.15 * 1000)
    
    signal input lstm_prediction;      // Individual predictions * 1000
    signal input gru_prediction;
    signal input prophet_prediction;
    signal input xgboost_prediction;
    
    // Output
    signal output verification_result;
    
    // Internal signals
    signal lstm_contrib;
    signal gru_contrib;  
    signal prophet_contrib;
    signal xgboost_contrib;
    signal weighted_sum;
    signal total_weights;
    
    // Calculate individual contributions
    lstm_contrib <== lstm_prediction * lstm_weight;
    gru_contrib <== gru_prediction * gru_weight;
    prophet_contrib <== prophet_prediction * prophet_weight;
    xgboost_contrib <== xgboost_prediction * xgboost_weight;
    
    // Sum all contributions
    weighted_sum <== lstm_contrib + gru_contrib + prophet_contrib + xgboost_contrib;
    
    // Verify weights sum to 1000
    total_weights <== lstm_weight + gru_weight + prophet_weight + xgboost_weight;
    total_weights === 1000;
    
    // Verify ensemble calculation with division constraint
    // weighted_sum = sum of (prediction * 1000) * (weight * 1000) 
    // predicted_price should be weighted_sum / 1000 (with remainder)
    // Use unconstrained division: quotient <-- dividend / divisor; quotient * divisor + remainder === dividend
    signal quotient;
    signal remainder;
    
    quotient <-- weighted_sum \ 1000;
    remainder <-- weighted_sum % 1000;
    
    // Verify division: weighted_sum === quotient * 1000 + remainder
    weighted_sum === quotient * 1000 + remainder;
    
    // Verify remainder < 1000
    component lt = LessThan(10);
    lt.in[0] <== remainder;
    lt.in[1] <== 1000;
    lt.out === 1;
    
    // predicted_price should equal quotient
    predicted_price === quotient;
    
    // Output verification success
    verification_result <== 1;
}

component main = PredictionVerification();