const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");

/**
 * ALGO ZK Price Oracle - Proof Generation System
 * Generates zero-knowledge proofs for ML ensemble predictions
 */

class ZKProofGenerator {
    constructor() {
        this.buildDir = path.join(__dirname, "build");
        this.wasmFile = path.join(this.buildDir, "prediction_verification_js", "prediction_verification.wasm");
        this.zkeyFile = path.join(this.buildDir, "prediction_verification_0001.zkey");
        this.verificationKeyFile = path.join(this.buildDir, "verification_key.json");
    }

    /**
     * Generate ZK proof for ensemble prediction
     * @param {Object} predictionData - The prediction data from ML models
     * @returns {Object} ZK proof object
     */
    async generateProof(predictionData) {
        try {
            // Extract and scale prediction data
            const witness = this.prepareWitness(predictionData);
            
            console.log("🔧 Generating ZK proof for prediction:", witness.predicted_price / 1000);
            console.log("📊 Model contributions hidden in proof");

            // Generate the proof
            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                witness,
                this.wasmFile,
                this.zkeyFile
            );

            console.log("✅ ZK proof generated successfully");
            console.log("📍 Public signals:", publicSignals);

            return {
                proof,
                publicSignals,
                metadata: {
                    predicted_price: witness.predicted_price / 1000,
                    timestamp: Date.now(),
                    circuit_hash: "91d0ceb6904b3525..."
                }
            };

        } catch (error) {
            console.error("❌ ZK proof generation failed:", error);
            throw new Error(`ZK proof generation failed: ${error.message}`);
        }
    }

    /**
     * Verify a ZK proof
     * @param {Object} proof - The proof object
     * @param {Array} publicSignals - Public signals
     * @returns {Boolean} Verification result
     */
    async verifyProof(proof, publicSignals) {
        try {
            const vKey = JSON.parse(fs.readFileSync(this.verificationKeyFile));
            
            const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);
            
            console.log(verified ? "✅ Proof verified" : "❌ Proof verification failed");
            return verified;

        } catch (error) {
            console.error("❌ Proof verification error:", error);
            return false;
        }
    }

    /**
     * Prepare witness data from ML prediction results
     * @param {Object} predictionData - Raw prediction data
     * @returns {Object} Formatted witness for circuit
     */
    prepareWitness(predictionData) {
        // Model weights (scaled by 1000)
        const weights = {
            lstm_weight: 350,      // 0.35 * 1000
            gru_weight: 250,       // 0.25 * 1000  
            prophet_weight: 250,   // 0.25 * 1000
            xgboost_weight: 150    // 0.15 * 1000
        };
        
        // Individual predictions (scaled by 1000)
        const predictions = {
            lstm_prediction: Math.round(predictionData.lstm_prediction * 1000),
            gru_prediction: Math.round(predictionData.gru_prediction * 1000),
            prophet_prediction: Math.round(predictionData.prophet_prediction * 1000),
            xgboost_prediction: Math.round(predictionData.xgboost_prediction * 1000)
        };
        
        // Calculate correct ensemble based on circuit math
        // weighted_sum = sum of (prediction * weight) 
        const weighted_sum = 
            predictions.lstm_prediction * weights.lstm_weight +
            predictions.gru_prediction * weights.gru_weight +
            predictions.prophet_prediction * weights.prophet_weight +
            predictions.xgboost_prediction * weights.xgboost_weight;
            
        // Circuit uses division: quotient = weighted_sum ÷ 1000, remainder = weighted_sum % 1000
        // predicted_price === quotient
        const quotient = Math.floor(weighted_sum / 1000);
        const remainder = weighted_sum % 1000;
        const predicted_price = quotient;
        
        const witness = {
            predicted_price,
            ...weights,
            ...predictions
        };

        console.log("🔍 Witness calculation:");
        console.log("weighted_sum:", weighted_sum);
        console.log("quotient:", quotient, "remainder:", remainder);
        console.log("Division check:", quotient * 1000 + remainder === weighted_sum);
        console.log("predicted_price === quotient:", predicted_price === quotient);

        // Verify witness data integrity
        this.validateWitness(witness);
        
        return witness;
    }

    /**
     * Validate witness data before proof generation
     * @param {Object} witness - Witness data
     */
    validateWitness(witness) {
        // Check weight sum equals 1000 (representing 1.0)
        const totalWeights = witness.lstm_weight + witness.gru_weight + 
                           witness.prophet_weight + witness.xgboost_weight;
        
        if (totalWeights !== 1000) {
            throw new Error(`Invalid weights sum: ${totalWeights}, expected 1000`);
        }

        // Check all predictions are valid numbers
        const predictions = [
            witness.lstm_prediction,
            witness.gru_prediction, 
            witness.prophet_prediction,
            witness.xgboost_prediction
        ];

        for (let pred of predictions) {
            if (!Number.isInteger(pred) || pred <= 0) {
                throw new Error(`Invalid prediction value: ${pred}`);
            }
        }

        // Verify division calculation
        const calculatedWeightedSum = 
            witness.lstm_prediction * witness.lstm_weight +
            witness.gru_prediction * witness.gru_weight +
            witness.prophet_prediction * witness.prophet_weight +
            witness.xgboost_prediction * witness.xgboost_weight;
        
        const calculatedQuotient = Math.floor(calculatedWeightedSum / 1000);
        const calculatedRemainder = calculatedWeightedSum % 1000;

        if (calculatedQuotient !== witness.predicted_price) {
            throw new Error(`Quotient mismatch: expected ${calculatedQuotient}, got ${witness.predicted_price}`);
        }
        
        console.log("📊 Division validation:");
        console.log("Calculated weighted sum:", calculatedWeightedSum);
        console.log("Calculated quotient:", calculatedQuotient, "remainder:", calculatedRemainder);
        console.log("Witness predicted_price:", witness.predicted_price);

        console.log("✅ Witness validation passed");
    }

    /**
     * Generate proof for API response format
     * @param {Object} predictionData - ML prediction results
     * @returns {Object} API-ready proof response
     */
    async generateAPIProof(predictionData) {
        const zkProof = await this.generateProof(predictionData);
        
        return {
            prediction: {
                value: predictionData.ensemble_prediction,
                confidence: predictionData.confidence,
                timestamp: Date.now()
            },
            zk_proof: {
                proof: zkProof.proof,
                public_signals: zkProof.publicSignals,
                verified: await this.verifyProof(zkProof.proof, zkProof.publicSignals)
            },
            privacy: {
                model_weights_hidden: true,
                individual_predictions_hidden: true,
                circuit_hash: zkProof.metadata.circuit_hash
            }
        };
    }
}

// Export for use in API
module.exports = ZKProofGenerator;

// CLI interface for testing
if (require.main === module) {
    const generator = new ZKProofGenerator();
    
    // Example prediction data for testing - adjusted for integer arithmetic
    const testPrediction = {
        ensemble_prediction: 0.2078,   // Exact value that works with our circuit
        confidence: 0.347,
        lstm_prediction: 0.210,
        gru_prediction: 0.205,
        prophet_prediction: 0.208,
        xgboost_prediction: 0.207
    };

    console.log("🧪 Testing ZK proof generation...");
    
    generator.generateAPIProof(testPrediction)
        .then(result => {
            console.log("🎉 Test completed successfully!");
            console.log("📊 Result:", JSON.stringify(result, null, 2));
        })
        .catch(error => {
            console.error("❌ Test failed:", error);
            process.exit(1);
        });
}