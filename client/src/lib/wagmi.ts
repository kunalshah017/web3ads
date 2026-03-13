import { http, createConfig } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    coinbaseWallet({ appName: "Web3Ads Gasless" }),
  ],
  transports: {
    [baseSepolia.id]: http(),
  },
});
