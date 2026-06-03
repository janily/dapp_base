import { http, type Address } from 'viem';
import { defineChain } from 'viem/chains';
import { createConfig } from 'wagmi';
import { injected } from 'wagmi/connectors';

const defaultSepoliaRpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';

export const appConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 11155111),
  chainName: import.meta.env.VITE_CHAIN_NAME ?? 'Sepolia',
  rpcUrl: import.meta.env.VITE_RPC_URL ?? defaultSepoliaRpcUrl,
  readRpcUrl: import.meta.env.VITE_READ_RPC_URL ?? '/rpc/sepolia',
  erc20Address: (import.meta.env.VITE_ERC20_ADDRESS ?? '') as Address | '',
  defaultQueryAddress: (import.meta.env.VITE_DEFAULT_QUERY_ADDRESS ?? '') as Address | '',
  defaultRecipient: (import.meta.env.VITE_DEFAULT_RECIPIENT ?? '') as Address | '',
};

export const configuredChain = defineChain({
  id: appConfig.chainId,
  name: appConfig.chainName,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [appConfig.rpcUrl] } },
});

export const wagmiConfig = createConfig({
  chains: [configuredChain],
  connectors: [injected({ target: 'metaMask' }), injected()],
  transports: { [configuredChain.id]: http(appConfig.readRpcUrl) },
});

export const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { name: 'from', type: 'address', indexed: true },
      { name: 'to', type: 'address', indexed: true },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const;
