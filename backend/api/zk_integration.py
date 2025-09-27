"""
ZK Proof Integration for FastAPI
Bridges Python FastAPI with Node.js ZK proof generation
"""

import asyncio
import json
import subprocess
import os
import logging
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class ZKProofIntegration:
    """
    Integration layer for ZK proof generation in FastAPI
    """
    
    def __init__(self):
        # Path to ZK privacy directory
        self.zk_dir = Path(__file__).parent.parent / "zk-privacy"
        self.bridge_script = self.zk_dir / "zk_bridge.js"
        
        # Verify ZK components exist
        self._verify_zk_setup()
    
    def _verify_zk_setup(self):
        """Verify ZK proof system is properly set up"""
        required_files = [
            self.bridge_script,
            self.zk_dir / "proof_generator.js",
            self.zk_dir / "build" / "prediction_verification_0001.zkey",
            self.zk_dir / "build" / "verification_key.json"
        ]
        
        for file_path in required_files:
            if not file_path.exists():
                raise FileNotFoundError(f"ZK setup incomplete: {file_path} not found")
        
        logger.info("ZK proof system verified and ready")
    
    async def generate_zk_proof(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate ZK proof for ML prediction
        
        Args:
            prediction_data: Dictionary containing:
                - ensemble_prediction: float
                - confidence: float  
                - lstm_prediction: float
                - gru_prediction: float
                - prophet_prediction: float
                - xgboost_prediction: float
        
        Returns:
            Dictionary containing ZK proof and verification status
        """
        try:
            logger.info("Starting ZK proof generation...")
            
            # Prepare input for ZK bridge
            zk_input = json.dumps(prediction_data)
            
            # Execute ZK proof generation via Node.js bridge
            result = await self._execute_zk_bridge(zk_input)
            
            logger.info("ZK proof generation completed")
            return result
            
        except Exception as e:
            logger.error(f"ZK proof generation failed: {e}")
            raise Exception(f"ZK proof generation failed: {str(e)}")
    
    async def verify_zk_proof(self, proof: Dict, public_signals: list) -> bool:
        """
        Verify ZK proof
        
        Args:
            proof: ZK proof object
            public_signals: Public signals array
        
        Returns:
            Boolean verification result
        """
        try:
            logger.info("Starting ZK proof verification...")
            
            verify_input = json.dumps({
                "proof": proof,
                "publicSignals": public_signals
            })
            
            # Execute verification via Node.js bridge
            result = await self._execute_zk_bridge(verify_input, command="verify")
            
            verified = result.get("verified", False)
            logger.info(f"ZK proof verification: {'PASSED' if verified else 'FAILED'}")
            
            return verified
            
        except Exception as e:
            logger.error(f"ZK proof verification failed: {e}")
            return False
    
    async def _execute_zk_bridge(self, input_data: str, command: str = "generate") -> Dict[str, Any]:
        """
        Execute ZK bridge Node.js script
        """
        try:
            # Prepare command
            if command == "verify":
                cmd = ["node", str(self.bridge_script), "verify", input_data]
            else:
                cmd = ["node", str(self.bridge_script), input_data]
            
            # Execute with timeout
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=str(self.zk_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=30.0)  # 30 sec timeout
            
            if process.returncode != 0:
                error_msg = stderr.decode() if stderr else "Unknown error"
                raise Exception(f"ZK bridge execution failed: {error_msg}")
            
            # Parse JSON output
            output = stdout.decode().strip()
            
            # Debug: Log raw output
            logger.info(f"ZK Bridge raw output:\n{output}")
            
            # Extract JSON from output (bridge might have logging)
            # Handle multi-line JSON by finding JSON block boundaries
            lines = output.strip().split('\n')
            json_output = None
            
            # Find JSON start and end
            json_start_idx = -1
            json_end_idx = -1
            brace_count = 0
            
            for i, line in enumerate(lines):
                line = line.strip()
                if line.startswith('{') and json_start_idx == -1:
                    json_start_idx = i
                
                if json_start_idx != -1:
                    brace_count += line.count('{') - line.count('}')
                    if brace_count == 0 and line.endswith('}'):
                        json_end_idx = i
                        break
            
            if json_start_idx != -1 and json_end_idx != -1:
                # Combine multi-line JSON
                json_lines = lines[json_start_idx:json_end_idx + 1]
                json_output = '\n'.join(json_lines)
                
                try:
                    result = json.loads(json_output)
                    logger.info(f"Found valid multi-line JSON ({len(json_lines)} lines)")
                    return result
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid multi-line JSON: {e}")
            
            # Fallback: try single-line JSON
            for line in reversed(lines):
                line = line.strip()
                if line.startswith('{') and line.endswith('}'):
                    try:
                        json.loads(line)  # Test if valid JSON
                        json_output = line
                        logger.info(f"Found valid single-line JSON")
                        return json.loads(json_output)
                    except json.JSONDecodeError:
                        continue
            
            logger.error(f"No valid JSON found in output lines: {len(lines)}")
            raise Exception("No valid JSON output found from ZK bridge")
                
        except asyncio.TimeoutError:
            raise Exception("ZK proof generation timed out (30 seconds)")
        except json.JSONDecodeError as e:
            raise Exception(f"Invalid JSON response from ZK bridge: {e}")
        except Exception as e:
            raise Exception(f"ZK bridge execution error: {e}")
    
    def format_prediction_for_zk(self, prediction_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format FastAPI prediction response for ZK proof generation
        """
        try:
            return {
                "ensemble_prediction": prediction_response.get("predicted_price", 0.0),
                "confidence": prediction_response.get("confidence", 0.0),
                "lstm_prediction": prediction_response.get("individual_predictions", {}).get("lstm", 0.0),
                "gru_prediction": prediction_response.get("individual_predictions", {}).get("gru", 0.0),
                "prophet_prediction": prediction_response.get("individual_predictions", {}).get("prophet", 0.0),
                "xgboost_prediction": prediction_response.get("individual_predictions", {}).get("xgboost", 0.0)
            }
        except Exception as e:
            raise Exception(f"Failed to format prediction for ZK: {e}")

# Global instance
zk_integration = ZKProofIntegration()