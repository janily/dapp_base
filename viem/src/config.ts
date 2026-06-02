import { createPublicClient, custom, defineChain, http, type Address } from 'viem';

export const appConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 11155111),
  chainName: import.meta.env.VITE_CHAIN_NAME ?? 'Sepolia',
  rpcUrl: import.meta.env.VITE_RPC_URL ?? 'https://rpc.sepolia.org',
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

export const publicClient = createPublicClient({
  chain: configuredChain,
  transport: http(appConfig.rpcUrl),
});

export function getWalletTransport() {
  if (!window.ethereum) {
    throw new Error('未检测到浏览器钱包，请安装 MetaMask 或兼容钱包。');
  }
  return custom(window.ethereum);
}

export async function switchToConfiguredChain() {
  if (!window.ethereum) {
    throw new Error('未检测到浏览器钱包，请安装 MetaMask 或兼容钱包。');
  }
  const chainIdHex = `0x${appConfig.chainId.toString(16)}`;
  try {
    await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] });
  } catch (err) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? (err as { code?: number }).code : undefined;
    if (code !== 4902) throw err;
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: chainIdHex,
        chainName: appConfig.chainName,
        nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
        rpcUrls: [appConfig.rpcUrl],
      }],
    });
  }
}

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
