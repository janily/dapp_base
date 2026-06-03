import { createPublicClient, custom, defineChain, http, type Address } from 'viem';

const defaultSepoliaRpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
const appEnvPrefix = 'VITE_VIEM_';

function getEnvValue(name: string, fallback = '') {
  return import.meta.env[`${appEnvPrefix}${name}`] || import.meta.env[`VITE_${name}`] || fallback;
}

export const appConfig = {
  chainId: Number(getEnvValue('CHAIN_ID', '11155111')),
  chainName: getEnvValue('CHAIN_NAME', 'Sepolia'),
  rpcUrl: getEnvValue('RPC_URL', defaultSepoliaRpcUrl),
  readRpcUrl: getEnvValue('READ_RPC_URL', '/rpc/sepolia'),
  erc20Address: getEnvValue('ERC20_ADDRESS') as Address | '',
  defaultQueryAddress: getEnvValue('DEFAULT_QUERY_ADDRESS') as Address | '',
  defaultRecipient: getEnvValue('DEFAULT_RECIPIENT') as Address | '',
};

export const configuredChain = defineChain({
  id: appConfig.chainId,
  name: appConfig.chainName,
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: [appConfig.rpcUrl] } },
});

export const publicClient = createPublicClient({
  chain: configuredChain,
  transport: http(appConfig.readRpcUrl),
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
