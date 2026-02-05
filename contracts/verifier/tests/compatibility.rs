//! SnarkJS → Rust Proof Compatibility Tests

use ark_bn254::Fr;
use ark_ec::AffineRepr;
use ark_ff::Zero;
use verifier::{create_dummy_proof, SnarkJSProof};

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
        pi_a: vec!["1".to_string(), "2".to_string()],
        pi_b: vec![
            vec!["1".to_string(), "0".to_string()],
            vec!["2".to_string(), "0".to_string()],
        ],
        pi_c: vec!["3".to_string(), "4".to_string()],
        public_signals: vec!["208".to_string()],
    };

    let hex_proof = SnarkJSProof {
        pi_a: vec!["0x1".to_string(), "0x2".to_string()],
        pi_b: vec![
            vec!["0x1".to_string(), "0x0".to_string()],
            vec!["0x2".to_string(), "0x0".to_string()],
        ],
        pi_c: vec!["0x3".to_string(), "0x4".to_string()],
        public_signals: vec!["0xD0".to_string()],
    };

    let parsed_decimal = decimal_proof
        .to_arkworks_proof()
        .expect("Failed to parse decimal proof");
    let parsed_hex = hex_proof
        .to_arkworks_proof()
        .expect("Failed to parse hex proof");

    assert_eq!(parsed_decimal.public_inputs[0], parsed_hex.public_inputs[0]);
    println!("✓ Field compatibility verified (decimal == hex)");
}

#[test]
fn test_proof_structure_matches_snarkjs() {
    // Verify that our Rust types match the snarkjs format
    let proof = create_dummy_proof();

    // pi_a should be [x, y] for G1 point
    assert_eq!(proof.pi_a.len(), 2, "pi_a should have 2 elements");

    // pi_b should be [[x_c0, x_c1], [y_c0, y_c1]] for G2 point
    assert_eq!(proof.pi_b.len(), 2, "pi_b should have 2 elements");
    assert_eq!(proof.pi_b[0].len(), 2, "pi_b[0] should have 2 elements");
    assert_eq!(proof.pi_b[1].len(), 2, "pi_b[1] should have 2 elements");

    // pi_c should be [x, y] for G1 point
    assert_eq!(proof.pi_c.len(), 2, "pi_c should have 2 elements");

    // publicSignals should be an array of strings
    assert_eq!(proof.public_signals.len(), 1, "Should have 1 public signal");

    println!("✓ Proof structure matches snarkjs format");
}

#[test]
fn test_field_element_parsing() {
    // Test decimal parsing
    let json = r#"{"pi_a":["1","2"],"pi_b":[["1","0"],["2","0"]],"pi_c":["3","4"],"publicSignals":["208"]}"#;
    let proof: SnarkJSProof = serde_json::from_str(json).unwrap();
    let parsed = proof.to_arkworks_proof().unwrap();

    // 208 as Fr
    let expected = Fr::from(208u32);
    assert_eq!(parsed.public_inputs[0], expected);

    // Test hex parsing
    let json_hex = r#"{"pi_a":["0x1","0x2"],"pi_b":[["0x1","0x0"],["0x2","0x0"]],"pi_c":["0x3","0x4"],"publicSignals":["0xD0"]}"#;
    let proof_hex: SnarkJSProof = serde_json::from_str(json_hex).unwrap();
    let parsed_hex = proof_hex.to_arkworks_proof().unwrap();

    assert_eq!(parsed_hex.public_inputs[0], expected);
    println!("✓ Field element parsing works for both decimal and hex");
}

#[test]
fn test_public_signals_compatibility() {
    // Test that public signals from snarkjs (which is the predicted price) are correctly parsed
    let proof = create_dummy_proof();
    let parsed = proof.to_arkworks_proof().unwrap();

    // The public signal should be 208 (the predicted price)
    let expected = Fr::from(208u32);
    assert_eq!(parsed.public_inputs[0], expected);

    println!("✓ Public signals compatibility verified");
}

#[test]
fn test_full_integration() {
    // Step 1: Create a snarkjs-style proof
    let snarkjs_json = r#"{"pi_a":["1","2"],"pi_b":[["1","0"],["2","0"]],"pi_c":["3","4"],"publicSignals":["208"]}"#;

    // Step 2: Parse JSON
    let snarkjs_proof = SnarkJSProof::from_json(snarkjs_json).expect("Step 2: JSON parsing failed");

    // Step 3: Convert to arkworks
    let arkworks_proof = snarkjs_proof
        .to_arkworks_proof()
        .expect("Step 3: Arkworks conversion failed");

    // Step 4: Verify the proof structure
    assert!(
        arkworks_proof.pi_a.is_on_curve() || arkworks_proof.pi_a.is_zero(),
        "Step 4: pi_a validation failed"
    );
    assert!(
        arkworks_proof.pi_b.is_on_curve() || arkworks_proof.pi_b.is_zero(),
        "Step 4: pi_b validation failed"
    );
    assert!(
        arkworks_proof.pi_c.is_on_curve() || arkworks_proof.pi_c.is_zero(),
        "Step 4: pi_c validation failed"
    );

    // Step 5: Verify public inputs
    assert_eq!(
        arkworks_proof.public_inputs.len(),
        1,
        "Step 5: Public inputs count mismatch"
    );
    let expected = Fr::from(208u32);
    assert_eq!(
        arkworks_proof.public_inputs[0], expected,
        "Step 5: Public input value mismatch"
    );

    println!("✓ Full integration test passed");
}
