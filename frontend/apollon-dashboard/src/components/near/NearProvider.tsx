"use client";

import React, { useCallback, useContext, useEffect, useState } from "react";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupModal } from "@near-wallet-selector/modal-ui";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";
import type { WalletSelector, AccountState } from "@near-wallet-selector/core";
import type { NearOracleConfig } from "../../../lib/near-sdk";
import { NearOracleClient } from "../../../lib/near-sdk";
import "@near-wallet-selector/modal-ui/styles.css";

interface NearContextType {
  selector: WalletSelector | null;
  modal: ReturnType<typeof setupModal> | null;
  accounts: AccountState[];
  accountId: string | null;
  isSignedIn: boolean;
  client: NearOracleClient | null;
  connect: () => void;
  disconnect: () => void;
}

const NearContext = React.createContext<NearContextType | null>(null);

interface NearProviderProps {
  children: React.ReactNode;
  network?: "testnet" | "mainnet";
  publisherContract: string;
  verifierContract?: string;
}

export const NearProvider: React.FC<NearProviderProps> = ({
  children,
  network = "testnet",
  publisherContract,
  verifierContract,
}) => {
  const [selector, setSelector] = useState<WalletSelector | null>(null);
  const [modal, setModal] = useState<ReturnType<typeof setupModal> | null>(null);
  const [accounts, setAccounts] = useState<AccountState[]>([]);
  const [client, setClient] = useState<NearOracleClient | null>(null);

  const init = useCallback(async () => {
    const _selector = await setupWalletSelector({
      network: network,
      modules: [setupMyNearWallet()],
    });

    const _modal = setupModal(_selector, {
      contractId: publisherContract,
    });

    const state = _selector.store.getState();
    setAccounts(state.accounts);

    // Initialize SDK client
    const config: NearOracleConfig = {
      networkId: network,
      publisherContract,
      verifierContract,
    };

    const _client = new NearOracleClient(config);
    await _client.initialize();

    setSelector(_selector);
    setModal(_modal);
    setClient(_client);
  }, [network, publisherContract, verifierContract]);

  useEffect(() => {
    init().catch((err) => {
      console.error("Failed to initialize NEAR:", err);
    });
  }, [init]);

  useEffect(() => {
    if (!selector) return;

    const subscription = selector.store.observable
      .subscribe((state) => {
        setAccounts(state.accounts);
      });

    return () => subscription.unsubscribe();
  }, [selector]);

  const accountId = accounts.length > 0 ? accounts[0].accountId : null;
  const isSignedIn = accounts.length > 0;

  const connect = useCallback(() => {
    modal?.show();
  }, [modal]);

  const disconnect = useCallback(async () => {
    if (!selector) return;
    const wallet = await selector.wallet();
    await wallet.signOut();
  }, [selector]);

  return (
    <NearContext.Provider
      value={{
        selector,
        modal,
        accounts,
        accountId,
        isSignedIn,
        client,
        connect,
        disconnect,
      }}
    >
      {children}
    </NearContext.Provider>
  );
};

export const useNear = () => {
  const context = useContext(NearContext);
  if (!context) {
    throw new Error("useNear must be used within a NearProvider");
  }
  return context;
};
