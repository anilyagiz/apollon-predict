//! Minimal test for proof parsing

use ark_bn254::{Fr, G1Affine, G2Affine};
use ark_ff::Zero;

/// SnarkJS proof format as received from JavaScript
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, PartialEq)]
pub struct SnarkJSProof {
    pub pi_a: Vec<String>,
    pub pi_b: Vec<Vec<String>>,
    pub pi_c: Vec<String>,
    #[serde(rename = "publicSignals")]
    pub public_signals: Vec<String>,
}

/// Parsed proof ready for arkworks verification
#[derive(Debug, Clone)]
pub struct ParsedProof {
    pub pi_a: G1Affine,
    pub pi_b: G2Affine,
    pub pi_c: G1Affine,
    pub public_inputs: Vec<Fr>,
}

/// Errors that can occur during proof parsing
#[derive(Debug, Clone, PartialEq)]
pub enum ProofParseError {
    InvalidPiALength { expected: usize, got: usize },
    InvalidPiBLength { expected: usize, got: usize },
    InvalidPiCLength { expected: usize, got: usize },
    InvalidFieldElement(String),
    InvalidG2Format(String),
    JsonParseError(String),
    InvalidPoint(String),
}

impl SnarkJSProof {
    pub fn from_json(json_str: &str) -> Result<Self, ProofParseError> {
        serde_json::from_str(json_str).map_err(|e| ProofParseError::JsonParseError(e.to_string()))
    }

    pub fn to_arkworks_proof(&self) -> Result<ParsedProof, ProofParseError> {
        if self.pi_a.len() != 2 {
            return Err(ProofParseError::InvalidPiALength {
                expected: 2,
                got: self.pi_a.len(),
            });
        }

        if self.pi_b.len() != 2 {
            return Err(ProofParseError::InvalidPiBLength {
                expected: 2,
                got: self.pi_b.len(),
            });
        }

        if self.pi_c.len() != 2 {
            return Err(ProofParseError::InvalidPiCLength {
                expected: 2,
                got: self.pi_c.len(),
            });
        }

        let pi_a = parse_g1_point(&self.pi_a[0], &self.pi_a[1])?;
        let pi_b = parse_g2_point(&self.pi_b)?;
        let pi_c = parse_g1_point(&self.pi_c[0], &self.pi_c[1])?;

        let public_inputs: Result<Vec<Fr>, _> = self
            .public_signals
            .iter()
            .map(|s| parse_fr_element(s))
            .collect();
        let public_inputs = public_inputs?;

        Ok(ParsedProof {
            pi_a,
            pi_b,
            pi_c,
            public_inputs,
        })
    }
}

fn parse_g1_point(x_str: &str, y_str: &str) -> Result<G1Affine, ProofParseError> {
    let x = parse_fq_element(x_str)?;
    let y = parse_fq_element(y_str)?;

    if x.is_zero() && y.is_zero() {
        return Ok(G1Affine::identity());
    }

    let point = G1Affine::new_unchecked(x, y);
    Ok(point)
}

fn parse_g2_point(coords: &[Vec<String>]) -> Result<G2Affine, ProofParseError> {
    use ark_bn254::Fq2;

    let c0_x = parse_fq_element(&coords[0][0])?;
    let c1_x = parse_fq_element(&coords[0][1])?;
    let c0_y = parse_fq_element(&coords[1][0])?;
    let c1_y = parse_fq_element(&coords[1][1])?;

    let x = Fq2::new(c0_x, c1_x);
    let y = Fq2::new(c0_y, c1_y);

    if x.is_zero() && y.is_zero() {
        return Ok(G2Affine::identity());
    }

    let point = G2Affine::new_unchecked(x, y);
    Ok(point)
}

fn parse_fq_element(s: &str) -> Result<ark_bn254::Fq, ProofParseError> {
    use ark_ff::PrimeField;
    use std::str::FromStr;

    let s = s.trim_matches('"');

    if s.starts_with("0x") || s.starts_with("0X") {
        let hex_str = &s[2..];
        if let Ok(bytes) = hex::decode(hex_str) {
            return Ok(ark_bn254::Fq::from_be_bytes_mod_order(&bytes));
        }
    }

    if let Ok(val) = num_bigint::BigUint::from_str(s) {
        let bytes = val.to_bytes_be();
        return Ok(ark_bn254::Fq::from_be_bytes_mod_order(&bytes));
    }

    Err(ProofParseError::InvalidFieldElement(s.to_string()))
}

fn parse_fr_element(s: &str) -> Result<Fr, ProofParseError> {
    use ark_ff::PrimeField;
    use std::str::FromStr;

    let s = s.trim_matches('"');

    if s.starts_with("0x") || s.starts_with("0X") {
        let hex_str = &s[2..];
        if let Ok(bytes) = hex::decode(hex_str) {
            return Ok(Fr::from_be_bytes_mod_order(&bytes));
        }
    }

    if let Ok(val) = num_bigint::BigUint::from_str(s) {
        let bytes = val.to_bytes_be();
        return Ok(Fr::from_be_bytes_mod_order(&bytes));
    }

    Err(ProofParseError::InvalidFieldElement(s.to_string()))
}

pub fn create_dummy_proof() -> SnarkJSProof {
    SnarkJSProof {
        pi_a: vec!["1".to_string(), "2".to_string()],
        pi_b: vec![
            vec!["1".to_string(), "0".to_string()],
            vec!["2".to_string(), "0".to_string()],
        ],
        pi_c: vec!["3".to_string(), "4".to_string()],
        public_signals: vec!["208".to_string()],
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dummy_proof_structure() {
        let proof = create_dummy_proof();
        assert_eq!(proof.pi_a.len(), 2);
        assert_eq!(proof.pi_b.len(), 2);
        assert_eq!(proof.pi_c.len(), 2);
        assert_eq!(proof.public_signals.len(), 1);
        println!("✓ Dummy proof structure is valid");
    }

    #[test]
    fn test_json_roundtrip() {
        let original = create_dummy_proof();
        let json = serde_json::to_string(&original).expect("Failed to serialize proof");
        let parsed: SnarkJSProof = SnarkJSProof::from_json(&json).expect("Failed to parse JSON");
        assert_eq!(original.pi_a, parsed.pi_a);
        assert_eq!(original.pi_b, parsed.pi_b);
        assert_eq!(original.pi_c, parsed.pi_c);
        assert_eq!(original.public_signals, parsed.public_signals);
        println!("✓ JSON roundtrip successful");
    }

    #[test]
    fn test_field_element_parsing() {
        let fe = parse_fr_element("208").unwrap();
        assert!(!fe.is_zero());

        let fe_hex = parse_fr_element("0xD0").unwrap();
        assert!(!fe_hex.is_zero());

        let fe_zero = parse_fr_element("0").unwrap();
        assert!(fe_zero.is_zero());
        println!("✓ Field element parsing successful");
    }

    #[test]
    fn test_real_snarkjs_proof_parsing() {
        let json_str = r#"{
            "pi_a": [
                "10274249768465900327306268923683348681830233589229858473983842235323544425283",
                "18664476181570008034444970628796250662779179882408168571166245523809032281783"
            ],
            "pi_b": [
                [
                    "15207077863895439206274667835018895550958547241465292497934922005167771917126",
                    "19039248822195396262818558617229196343352696950167628977251619258547228399338"
                ],
                [
                    "6769767883849060554131686844989529664474827717332204936063358394245546459993",
                    "19487141093550588067618588324988175126253691933204605333604822898737279119361"
                ]
            ],
            "pi_c": [
                "19933544583834744316855562493024345964644628840958253768877291080358985567214",
                "17024745392260473434308667830934585736039238264673233626465581343343342273662"
            ],
            "publicSignals": ["208"]
        }"#;

        let snarkjs_proof = SnarkJSProof::from_json(json_str).unwrap();
        assert_eq!(snarkjs_proof.pi_a.len(), 2);
        assert_eq!(snarkjs_proof.pi_b.len(), 2);
        assert_eq!(snarkjs_proof.pi_c.len(), 2);
        assert_eq!(snarkjs_proof.public_signals.len(), 1);
        assert_eq!(snarkjs_proof.public_signals[0], "208");

        let parsed = snarkjs_proof.to_arkworks_proof();
        assert!(parsed.is_ok(), "Failed to parse proof: {:?}", parsed.err());
        println!("✓ Real snarkjs proof parsing successful");
    }

    #[test]
    fn test_field_compatibility() {
        let decimal_proof = SnarkJSProof {
            pi_a: vec![
                "10274249768465900327306268923683348681830233589229858473983842235323544425283"
                    .to_string(),
                "18664476181570008034444970628796250662779179882408168571166245523809032281783"
                    .to_string(),
            ],
            pi_b: vec![
                vec![
                    "15207077863895439206274667835018895550958547241465292497934922005167771917126"
                        .to_string(),
                    "19039248822195396262818558617229196343352696950167628977251619258547228399338"
                        .to_string(),
                ],
                vec![
                    "6769767883849060554131686844989529664474827717332204936063358394245546459993"
                        .to_string(),
                    "19487141093550588067618588324988175126253691933204605333604822898737279119361"
                        .to_string(),
                ],
            ],
            pi_c: vec![
                "19933544583834744316855562493024345964644628840958253768877291080358985567214"
                    .to_string(),
                "17024745392260473434308667830934585736039238264673233626465581343343342273662"
                    .to_string(),
            ],
            public_signals: vec!["208".to_string()],
        };

        let parsed_decimal = decimal_proof
            .to_arkworks_proof()
            .expect("Failed to parse decimal proof");

        assert_eq!(parsed_decimal.public_inputs[0], Fr::from(208u32));
        println!("✓ Field compatibility verified (snarkjs proof parses successfully)");
    }
}
