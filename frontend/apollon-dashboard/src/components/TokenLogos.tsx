import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
}

/* ======================================================================== */
/*  NEAR Protocol — stylised "N"                                            */
/* ======================================================================== */
export function NearLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 90 90"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M72.2 4.6L53.4 32.6C52.1 34.5 54.6 36.8 56.5 35.2L72 22.2C72.6 21.7 73.5 22.1 73.5 22.9V66.5C73.5 67.3 72.5 67.7 71.9 67.1L20.2 5.4C18.3 3.1 15.6 1.6 12.6 1.6H11.2C5.6 1.6 1 6.2 1 11.8V78.2C1 83.8 5.6 88.4 11.2 88.4C14.7 88.4 18 86.6 19.8 83.7L38.6 55.7C39.9 53.8 37.4 51.5 35.5 53.1L20 66.1C19.4 66.6 18.5 66.2 18.5 65.4V21.8C18.5 21 19.5 20.6 20.1 21.2L71.8 82.9C73.7 85.2 76.5 86.7 79.4 86.7H80.8C86.4 86.7 91 82.1 91 76.5V11.8C91 6.2 86.4 1.6 80.8 1.6C77.3 1.6 74 3.4 72.2 4.6Z"
        fill="white"
      />
    </svg>
  );
}

/* ======================================================================== */
/*  Aurora — green "A" flame shape                                          */
/* ======================================================================== */
export function AuroraLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 288 288"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="aurora-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#78D64B" />
          <stop offset="100%" stopColor="#4BCA6B" />
        </linearGradient>
      </defs>
      <path
        d="M144 0L288 288H0L144 0Z"
        fill="url(#aurora-grad)"
      />
      <path
        d="M144 96L216 240H72L144 96Z"
        fill="#0E0514"
      />
    </svg>
  );
}

/* ======================================================================== */
/*  Ethereum — diamond logo                                                 */
/* ======================================================================== */
export function EthereumLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 417"
      width={size}
      height={size * (417 / 256)}
      className={className}
      style={{ width: size, height: size }}
    >
      <g transform="scale(1)" fill="none">
        <polygon
          fill="#8C8C8C"
          points="127.962 0 125.166 9.5 125.166 285.168 127.962 287.958 255.923 212.32"
        />
        <polygon
          fill="#CFCFCF"
          points="127.962 0 0 212.32 127.962 287.958 127.962 154.158"
        />
        <polygon
          fill="#8C8C8C"
          points="127.962 312.187 126.386 314.107 126.386 412.306 127.962 416.905 255.999 236.587"
        />
        <polygon
          fill="#CFCFCF"
          points="127.962 416.905 127.962 312.187 0 236.587"
        />
        <polygon
          fill="#636363"
          points="127.962 287.958 255.923 212.32 127.962 154.158"
        />
        <polygon
          fill="#8C8C8C"
          points="0 212.32 127.962 287.958 127.962 154.158"
        />
      </g>
    </svg>
  );
}

/* ======================================================================== */
/*  Solana — angular "S" gradient mark                                      */
/* ======================================================================== */
export function SolanaLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 397 311"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="sol-a" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <path
        d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"
        fill="url(#sol-a)"
      />
      <path
        d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"
        fill="url(#sol-a)"
      />
      <path
        d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z"
        fill="url(#sol-a)"
      />
    </svg>
  );
}

/* ======================================================================== */
/*  Algorand — triangle "A" mark                                            */
/* ======================================================================== */
export function AlgorandLogo({ className, size = 20 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      className={className}
    >
      <path
        d="M 219.2 231 H 189.4 L 164.2 150.5 L 120.8 231 H 88.8 L 155.2 110.8 L 143 69 L 52.1 231 H 19.6 L 134 7.7 H 163 L 178.4 69 H 217.2 L 193.8 110.8 L 219.2 231 Z"
        fill="white"
      />
    </svg>
  );
}

/* ======================================================================== */
/*  Unified map for convenience                                             */
/* ======================================================================== */

export const TOKEN_LOGOS: Record<
  string,
  React.FC<LogoProps>
> = {
  near: NearLogo,
  aurora: AuroraLogo,
  ethereum: EthereumLogo,
  solana: SolanaLogo,
  algorand: AlgorandLogo,
};

/**
 * Render a token logo by id string.
 * Falls back to a colored circle if the id is unknown.
 */
export function TokenLogo({
  tokenId,
  size = 20,
  className,
}: {
  tokenId: string;
  size?: number;
  className?: string;
}) {
  const Logo = TOKEN_LOGOS[tokenId];
  if (Logo) return <Logo size={size} className={className} />;
  return (
    <div
      className={`rounded-full bg-purple-500/30 ${className || ""}`}
      style={{ width: size, height: size }}
    />
  );
}
