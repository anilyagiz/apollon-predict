//! SnarkJS → Rust Proof Compatibility Tests

use ark_bn254::Fr;
use ark_ec::AffineRepr;
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

    println!("✓ Real snarkjs proof JSON parsing successful");
    println!("  Note: Full arkworks conversion requires valid curve points");
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
    let json = r#"{"pi_a":["10274249768465900327306268923683348681830233589229858473983842235323544425283","18664476181570008034444970628796250662779179882408168571166245523809032281783"],"pi_b":[["15207077863895439206274667835018895550958547241465292497934922005167771917126","19039248822195396262818558617229196343352696950167628977251619258547228399338"],["6769767883849060554131686844989529664474827717332204936063358394245546459993","19487141093550588067618588324988175126253691933204605333604822898737279119361"]],"pi_c":["19933544583834744316855562493024345964644628840958253768877291080358985567214","17024745392260473434308667830934585736039238264673233626465581343343342273662"],"publicSignals":["208"]}"#;
    let proof: SnarkJSProof = serde_json::from_str(json).unwrap();
    let parsed = proof.to_arkworks_proof().unwrap();

    let expected = Fr::from(208u32);
    assert_eq!(parsed.public_inputs[0], expected);

    println!("✓ Field element parsing works for decimal values");
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
    let snarkjs_json = r#"{"pi_a":["10274249768465900327306268923683348681830233589229858473983842235323544425283","18664476181570008034444970628796250662779179882408168571166245523809032281783"],"pi_b":[["15207077863895439206274667835018895550958547241465292497934922005167771917126","19039248822195396262818558617229196343352696950167628977251619258547228399338"],["6769767883849060554131686844989529664474827717332204936063358394245546459993","19487141093550588067618588324988175126253691933204605333604822898737279119361"]],"pi_c":["19933544583834744316855562493024345964644628840958253768877291080358985567214","17024745392260473434308667830934585736039238264673233626465581343343342273662"],"publicSignals":["208"]}"#;

    let snarkjs_proof = SnarkJSProof::from_json(snarkjs_json).expect("JSON parsing failed");

    let arkworks_proof = snarkjs_proof
        .to_arkworks_proof()
        .expect("Arkworks conversion failed");

    assert!(!arkworks_proof.pi_a.is_zero(), "pi_a should not be zero");
    assert!(!arkworks_proof.pi_b.is_zero(), "pi_b should not be zero");
    assert!(!arkworks_proof.pi_c.is_zero(), "pi_c should not be zero");

    assert_eq!(
        arkworks_proof.public_inputs.len(),
        1,
        "Public inputs count mismatch"
    );
    let expected = Fr::from(208u32);
    assert_eq!(
        arkworks_proof.public_inputs[0], expected,
        "Public input value mismatch"
    );

    println!("✓ Full integration test passed");
}
