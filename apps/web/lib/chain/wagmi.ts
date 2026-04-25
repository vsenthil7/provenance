import { http, createConfig } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

// InterwovenKit wraps wagmi internally for EVM-side wallet primitives.
// We don't use EVM directly, but the kit requires a config to mount.
export const wagmiConfig = createConfig({
  chains: [mainnet],
  connectors: [injected()],
  transports: { [mainnet.id]: http() },
});
