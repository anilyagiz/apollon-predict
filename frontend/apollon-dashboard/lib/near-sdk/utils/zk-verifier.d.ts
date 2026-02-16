/**
 * Zero-Knowledge proof verification utilities
 */
import { ZKProof } from '../types';
export interface ZKVerificationKey {
    protocol: string;
    curve: string;
    nPublic: number;
    vk_alpha_1: string[];
    vk_beta_2: string[][];
    vk_gamma_2: string[][];
    vk_delta_2: string[][];
    vk_alphabeta_12: string[][][];
    IC: string[][];
}
export declare class ZKVerifier {
    private verificationKey;
    /**
     * Set verification key from JSON
     */
    setVerificationKey(vKey: ZKVerificationKey): void;
    /**
     * Load verification key from URL
     */
    loadVerificationKey(url: string): Promise<void>;
    /**
     * Verify a ZK proof
     */
    verifyProof(proof: ZKProof): Promise<boolean>;
    /**
     * Verify prediction data matches public signals
     */
    verifyPredictionConsistency(predictedPrice: number, publicSignals: string[]): boolean;
    /**
     * Comprehensive ZK verification including proof and data consistency
     */
    verifyComplete(proof: ZKProof, predictedPrice: number): Promise<{
        proofValid: boolean;
        dataConsistent: boolean;
        overallValid: boolean;
    }>;
}
//# sourceMappingURL=zk-verifier.d.ts.map