import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';

export const appConfig = {
  chainId: Number(import.meta.env.VITE_CHAIN_ID ?? 11155111),
  chainName: import.meta.env.VITE_CHAIN_NAME ?? 'Sepolia',
  rpcUrl: import.meta.env.VITE_RPC_URL ?? 'https://rpc.sepolia.org',
  erc20Address: import.meta.env.VITE_ERC20_ADDRESS ?? '',
  defaultQueryAddress: import.meta.env.VITE_DEFAULT_QUERY_ADDRESS ?? '',
  defaultRecipient: import.meta.env.VITE_DEFAULT_RECIPIENT ?? '',
};

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
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export function getReadProvider() {
  return new JsonRpcProvider(appConfig.rpcUrl, appConfig.chainId);
}

export function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error('未检测到浏览器钱包，请安装 MetaMask 或兼容钱包。');
  }
  return new BrowserProvider(window.ethereum);
}

export function getReadErc20Contract() {
  if (!appConfig.erc20Address) {
    throw new Error('请先配置 VITE_ERC20_ADDRESS。');
  }
  return new Contract(appConfig.erc20Address, erc20Abi, getReadProvider());
}
