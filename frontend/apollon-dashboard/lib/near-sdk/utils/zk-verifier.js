"use strict";
/**
 * Zero-Knowledge proof verification utilities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKVerifier = void 0;
const snarkjs_1 = require("snarkjs");
const errors_1 = require("./errors");
class ZKVerifier {
    constructor() {
        this.verificationKey = null;
    }
    /**
     * Set verification key from JSON
     */
    setVerificationKey(vKey) {
        this.verificationKey = vKey;
    }
    /**
     * Load verification key from URL
     */
    async loadVerificationKey(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch verification key: ${response.statusText}`);
            }
            const vKey = await response.json();
            this.setVerificationKey(vKey);
        }
        catch (error) {
            throw new errors_1.ZKVerificationError(`Failed to load verification key from ${url}`, error);
        }
    }
    /**
     * Verify a ZK proof
     */
    async verifyProof(proof) {
        if (!this.verificationKey) {
            throw new errors_1.ZKVerificationError('Verification key not loaded. Call setVerificationKey() or loadVerificationKey() first.');
        }
        try {
            const verified = await snarkjs_1.groth16.verify(this.verificationKey, proof.public_signals, proof.proof);
            return verified;
        }
        catch (error) {
            throw new errors_1.ZKVerificationError('ZK proof verification failed', error);
        }
    }
    /**
     * Verify prediction data matches public signals
     */
    verifyPredictionConsistency(predictedPrice, publicSignals) {
        // Public signal should be the predicted price scaled by 1000
        const scaledPrice = Math.round(predictedPrice * 1000);
        const publicSignal = parseInt(publicSignals[0], 10);
        return scaledPrice === publicSignal;
    }
    /**
     * Comprehensive ZK verification including proof and data consistency
     */
    async verifyComplete(proof, predictedPrice) {
        const proofValid = await this.verifyProof(proof);
        const dataConsistent = this.verifyPredictionConsistency(predictedPrice, proof.public_signals);
        return {
            proofValid,
            dataConsistent,
            overallValid: proofValid && dataConsistent,
        };
    }
}
exports.ZKVerifier = ZKVerifier;
//# sourceMappingURL=zk-verifier.js.map