"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import ProfileBootstrap from "@/components/ProfileBootstrap";

const rpcUrl =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
const wsUrl = rpcUrl.replace("https://", "wss://").replace("http://", "ws://");

export default function AppPrivyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-center text-slate-300">
        <div>
          <p className="mb-2 text-lg font-semibold text-amber-300">
            Privy not configured
          </p>
          <p className="text-sm text-slate-400">
            Set <code className="text-amber-200">NEXT_PUBLIC_PRIVY_APP_ID</code>{" "}
            in <code className="text-amber-200">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#f59e0b",
          walletChainType: "solana-only",
          showWalletLoginFirst: true,
        },
        loginMethods: ["wallet", "twitter", "email", "google"],
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        solana: {
          rpcs: {
            "solana:devnet": {
              rpc: createSolanaRpc(rpcUrl),
              rpcSubscriptions: createSolanaRpcSubscriptions(wsUrl),
            },
            "solana:mainnet": {
              rpc: createSolanaRpc("https://api.mainnet-beta.solana.com"),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                "wss://api.mainnet-beta.solana.com"
              ),
            },
          },
        },
      }}
    >
      <ProfileBootstrap />
      {children}
    </PrivyProvider>
  );
}
