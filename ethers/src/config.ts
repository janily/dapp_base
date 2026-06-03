import { BrowserProvider, Contract, JsonRpcProvider } from 'ethers';

const defaultSepoliaRpcUrl = 'https://ethereum-sepolia-rpc.publicnode.com';
const appEnvPrefix = 'VITE_ETHERS_';

function getEnvValue(name: string, fallback = '') {
  return import.meta.env[`${appEnvPrefix}${name}`] || import.meta.env[`VITE_${name}`] || fallback;
}

export const appConfig = {
  chainId: Number(getEnvValue('CHAIN_ID', '11155111')),
  chainName: getEnvValue('CHAIN_NAME', 'Sepolia'),
  rpcUrl: getEnvValue('RPC_URL', defaultSepoliaRpcUrl),
  readRpcUrl: getEnvValue('READ_RPC_URL', '/rpc/sepolia'),
  erc20Address: getEnvValue('ERC20_ADDRESS'),
  defaultQueryAddress: getEnvValue('DEFAULT_QUERY_ADDRESS'),
  defaultRecipient: getEnvValue('DEFAULT_RECIPIENT'),
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
  const rpcUrl = appConfig.readRpcUrl.startsWith('/')
    ? new URL(appConfig.readRpcUrl, window.location.origin).toString()
    : appConfig.readRpcUrl;
  return new JsonRpcProvider(rpcUrl, appConfig.chainId);
}

export function getBrowserProvider() {
  if (!window.ethereum) {
    throw new Error('未检测到浏览器钱包，请安装 MetaMask 或兼容钱包。');
  }
  return new BrowserProvider(window.ethereum);
}

export function getReadErc20Contract(erc20Address = appConfig.erc20Address) {
  if (!erc20Address) {
    throw new Error('请先填写 ERC-20 合约地址。');
  }
  return new Contract(erc20Address, erc20Abi, getReadProvider());
}
