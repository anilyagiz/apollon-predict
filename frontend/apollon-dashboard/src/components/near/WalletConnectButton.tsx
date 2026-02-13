"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useNear } from "./NearProvider";
import { Wallet, LogOut } from "lucide-react";

export const WalletConnectButton: React.FC = () => {
  const { isSignedIn, accountId, connect, disconnect } = useNear();

  if (isSignedIn && accountId) {
    return (
      <Button
        variant="outline"
        onClick={disconnect}
        className="flex items-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        <span className="max-w-[150px] truncate">{accountId}</span>
      </Button>
    );
  }

  return (
    <Button
      onClick={connect}
      className="flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </Button>
  );
};
