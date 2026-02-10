declare module 'snarkjs' {
  export interface ZKProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve?: string;
  }

  export interface VerificationKey {
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

  export function groth16Verify(
    vKey: VerificationKey,
    publicSignals: string[],
    proof: ZKProof
  ): Promise<boolean>;

  export const groth16: {
    verify: (
      vKey: VerificationKey,
      publicSignals: string[],
      proof: ZKProof
    ) => Promise<boolean>;
    fullProve: (
      input: Record<string, any>,
      wasmFile: string,
      zkeyFile: string
    ) => Promise<{ proof: ZKProof; publicSignals: string[] }>;
  };
}
