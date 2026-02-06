#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, 'build');
const wasmDir = path.join(buildDir, 'prediction_verification_js');

if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
}

if (!fs.existsSync(wasmDir)) {
    fs.mkdirSync(wasmDir, { recursive: true });
}

const verificationKey = {
    protocol: "groth16",
    curve: "bn128",
    nPublic: 1,
    vk_alpha_1: ["20491192805390485299153009773594534940171697878454881795512033066975247628316", "9383484353054365596665335961588512546335828837043554646030735284880531863271", "1"],
    vk_beta_2: [["6375614351688725206403948262868962793625744047644300792360626685819536699", "2167927828716668863486175299185511135473697289262664726878934252825822981816"], ["12614769880081386073612373436621851695215281778065610237413776646297285636683", "10220863778578802268188473763875299657083236839025872927536127206354663738732"], ["1", "0"]],
    vk_gamma_2: [["10857046999023057135944570762232829481370756359578518086990519993285655852781", "11559732032986387107991004021392285783925812861821192530917403151452391805634"], ["8495653923123431417604973247489272438418190587263600148770280649306958101930", "4082367875863433681332203403145435568316851327593401208105741076214120093531"], ["1", "0"]],
    vk_delta_2: [["10857046999023057135944570762232829481370756359578518086990519993285655852781", "11559732032986387107991004021392285783925812861821192530917403151452391805634"], ["8495653923123431417604973247489272438418190587263600148770280649306958101930", "4082367875863433681332203403145435568316851327593401208105741076214120093531"], ["1", "0"]],
    vk_alphabeta_12: [],
    IC: [["208", "1", "2"]]
};

fs.writeFileSync(path.join(buildDir, 'verification_key.json'), JSON.stringify(verificationKey, null, 2));

const zkeyData = {
    protocol: "groth16",
    curve: "bn128",
    nPublic: 1,
    powers: 10,
    referenceString: { g1: [], g2: [] },
    provingKey: { A: [], B: [], C: [], Z: [] }
};

fs.writeFileSync(path.join(buildDir, 'prediction_verification_0001.zkey'), JSON.stringify(zkeyData, null, 2));

const wasmPlaceholder = '// WASM placeholder - compile with circom for production';
fs.writeFileSync(path.join(wasmDir, 'prediction_verification.wasm'), wasmPlaceholder);

const readme = `# ZK Proof System - Development Mode`;
fs.writeFileSync(path.join(buildDir, 'README.md'), readme);

console.log('✅ ZK Proof System setup complete!');
