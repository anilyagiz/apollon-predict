/**
 * Zero-Knowledge proof verification utilities
 */

import { groth16 } from 'snarkjs';
import { ZKProof, ZKVerificationError } from '../types';

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

export class ZKVerifier {
  private verificationKey: ZKVerificationKey | null = null;

  /**
   * Set verification key from JSON
   */
  setVerificationKey(vKey: ZKVerificationKey): void {
    this.verificationKey = vKey;
  }

  /**
   * Load verification key from URL
   */
  async loadVerificationKey(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch verification key: ${response.statusText}`);
      }
      const vKey = await response.json();
      this.setVerificationKey(vKey);
    } catch (error) {
      throw new ZKVerificationError(
        `Failed to load verification key from ${url}`,
        error
      );
    }
  }

  /**
   * Verify a ZK proof
   */
  async verifyProof(proof: ZKProof): Promise<boolean> {
    if (!this.verificationKey) {
      throw new ZKVerificationError(
        'Verification key not loaded. Call setVerificationKey() or loadVerificationKey() first.'
      );
    }

    try {
      const verified = await groth16.verify(
        this.verificationKey,
        proof.public_signals,
        proof.proof
      );

      return verified;
    } catch (error) {
      throw new ZKVerificationError(
        'ZK proof verification failed',
        error
      );
    }
  }

  /**
   * Verify prediction data matches public signals
   */
  verifyPredictionConsistency(
    predictedPrice: number,
    publicSignals: string[]
  ): boolean {
    // Public signal should be the predicted price scaled by 1000
    const scaledPrice = Math.round(predictedPrice * 1000);
    const publicSignal = parseInt(publicSignals[0], 10);

    return scaledPrice === publicSignal;
  }

  /**
   * Comprehensive ZK verification including proof and data consistency
   */
  async verifyComplete(
    proof: ZKProof,
    predictedPrice: number
  ): Promise<{
    proofValid: boolean;
    dataConsistent: boolean;
    overallValid: boolean;
  }> {
    const proofValid = await this.verifyProof(proof);
    const dataConsistent = this.verifyPredictionConsistency(
      predictedPrice,
      proof.public_signals
    );

    return {
      proofValid,
      dataConsistent,
      overallValid: proofValid && dataConsistent,
    };
  }
}