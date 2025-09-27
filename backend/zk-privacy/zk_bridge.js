#!/usr/bin/env node
/**
 * ZK Proof Bridge for FastAPI Integration
 * Provides command-line interface for ZK proof generation
 */

const ZKProofGenerator = require('./proof_generator.js');
const fs = require('fs');

class ZKBridge {
    constructor() {
        this.generator = new ZKProofGenerator();
    }

    async generateProofFromCLI() {
        try {
            // Read input from stdin (JSON format)
            const input = process.argv[2];
            if (!input) {
                throw new Error('No input provided. Usage: node zk_bridge.js \'{"lstm_prediction": 0.210, ...}\'');
            }

            const predictionData = JSON.parse(input);
            
            console.log('ZK Bridge: Starting proof generation...');
            
            // Generate ZK proof
            const result = await this.generator.generateAPIProof(predictionData);
            
            console.log('ZK Bridge: Proof generation completed');
            
            // Output result as JSON
            console.log(JSON.stringify(result, null, 2));
            
            // Force process exit to cleanup snarkjs worker threads
            setTimeout(() => {
                process.exit(0);
            }, 100);
            
        } catch (error) {
            console.error('ZK Bridge Error:', error.message);
            process.exit(1);
        }
    }

    async verifyProofFromCLI() {
        try {
            const input = process.argv[2];
            if (!input) {
                throw new Error('No input provided. Usage: node zk_bridge.js verify \'{"proof": {...}, "publicSignals": [...]}\'');
            }

            const { proof, publicSignals } = JSON.parse(input);
            
            console.log('ZK Bridge: Starting proof verification...');
            
            const verified = await this.generator.verifyProof(proof, publicSignals);
            
            console.log('ZK Bridge: Verification completed');
            console.log(JSON.stringify({ verified }, null, 2));
            
            // Force process exit
            setTimeout(() => {
                process.exit(0);
            }, 100);
            
        } catch (error) {
            console.error('ZK Bridge Verification Error:', error.message);
            process.exit(1);
        }
    }
}

// CLI interface
async function main() {
    const bridge = new ZKBridge();
    const command = process.argv[2];
    
    if (command === 'verify') {
        // Shift arguments for verify command
        process.argv[2] = process.argv[3];
        await bridge.verifyProofFromCLI();
    } else {
        await bridge.generateProofFromCLI();
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error('ZK Bridge Fatal Error:', error);
        process.exit(1);
    });
}

module.exports = ZKBridge;