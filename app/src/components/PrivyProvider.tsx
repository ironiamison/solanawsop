"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
import ProfileBootstrap from "@/components/ProfileBootstrap";
import { TwitterLinkProvider } from "@/components/TwitterLinkProvider";
import { LobbyRoomsProvider } from "@/hooks/LobbyRoomsProvider";
import { APP_URL } from "@/lib/constants";
import { clientRpcUrl, clientWsUrl } from "@/lib/rpc-url";

const devnetRpc = clientRpcUrl("devnet");
const devnetWs = clientWsUrl("devnet");
const mainnetRpc = clientRpcUrl("mainnet-beta");
const mainnetWs = clientWsUrl("mainnet-beta");

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
          accentColor: "#8b5cf6",
          walletChainType: "solana-only",
          showWalletLoginFirst: true,
        },
        loginMethods: ["wallet", "twitter", "email", "google"],
        customOAuthRedirectUrl: APP_URL,
        allowOAuthInEmbeddedBrowsers: true,
        legal: {
          termsAndConditionsUrl: "/terms",
          privacyPolicyUrl: "/privacy",
        },
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
              rpc: createSolanaRpc(devnetRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(devnetWs),
            },
            "solana:mainnet": {
              rpc: createSolanaRpc(mainnetRpc),
              rpcSubscriptions: createSolanaRpcSubscriptions(mainnetWs),
            },
          },
        },
      }}
    >
      <TwitterLinkProvider>
        <LobbyRoomsProvider>
          <ProfileBootstrap />
          {children}
        </LobbyRoomsProvider>
      </TwitterLinkProvider>
    </PrivyProvider>
  );
}
