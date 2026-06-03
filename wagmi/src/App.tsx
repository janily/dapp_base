import { useMemo, useState } from 'react';
import { formatEther, formatUnits, isAddress, parseEther, parseUnits, type Address } from 'viem';
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useChainId,
  useReadContract,
  useSendTransaction,
  useWaitForTransactionReceipt,
  useWatchContractEvent,
  useWriteContract,
  useSwitchChain,
} from 'wagmi';
import { appConfig, erc20Abi } from './config';

function WalletAndEthBalance() {
  const { address, isConnected } = useAccount();
  const activeChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { connectors, connect, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [queryAddress, setQueryAddress] = useState(appConfig.defaultQueryAddress || address || '');
  const enabled = isAddress(queryAddress);
  const { data, refetch, isFetching, error } = useBalance({ address: enabled ? (queryAddress as Address) : undefined, query: { enabled } });

  return <section className="card stack">
    <h2>1. 连接测试网并查询 ETH 余额</h2>
    <div className="row">
      {isConnected ? <button onClick={() => disconnect()}>断开钱包</button> : connectors.map((connector) => <button key={connector.uid} onClick={() => connect({ connector })}>连接 {connector.name}</button>)}
      <button disabled={!isConnected || activeChainId === appConfig.chainId || isSwitching} onClick={() => switchChain({ chainId: appConfig.chainId })}>切换到 {appConfig.chainName}</button>
      <span className="muted">{status}</span>
    </div>
    <p className="code">当前钱包：{address ?? '未连接'}；当前 Chain ID：{activeChainId}</p>
    <label>要查询的地址<input value={queryAddress} onChange={(e) => setQueryAddress(e.target.value)} placeholder="0x..." /></label>
    <button disabled={!enabled || isFetching} onClick={() => refetch()}>查询余额</button>
    {data && <p className="status">余额：{data.formatted} {data.symbol}</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

function SendEth() {
  const [to, setTo] = useState(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('0.001');
  const { data: hash, sendTransaction, error, isPending } = useSendTransaction();
  const receipt = useWaitForTransactionReceipt({ hash });
  const canSend = isAddress(to) && Number(amount) > 0;

  return <section className="card stack">
    <h2>2. 发送 ETH</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value as Address)} placeholder="0x..." /></label>
    <label>ETH 数量<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.001" /></label>
    <button disabled={!canSend || isPending} onClick={() => sendTransaction({ to: to as Address, value: parseEther(amount) })}>发送 ETH</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {receipt.isSuccess && <p className="status">交易已确认</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

function Erc20Balance() {
  const [account, setAccount] = useState(appConfig.defaultQueryAddress);
  const enabled = isAddress(appConfig.erc20Address) && isAddress(account);
  const { data, refetch, isFetching, error } = useReadContract({
    address: appConfig.erc20Address || undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: enabled ? [account as Address] : undefined,
    query: { enabled },
  });

  return <section className="card stack">
    <h2>3. 调用 ERC-20 balanceOf</h2>
    <p className="code">合约：{appConfig.erc20Address || '请配置 VITE_ERC20_ADDRESS'}</p>
    <label>账户地址<input value={account} onChange={(e) => setAccount(e.target.value as Address)} placeholder="0x..." /></label>
    <button disabled={!enabled || isFetching} onClick={() => refetch()}>读取 Token 余额</button>
    {typeof data === 'bigint' && <p className="status">余额：{formatUnits(data, 18)} Token（按 18 位小数显示）</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

function TransferEvents() {
  const [events, setEvents] = useState<string[]>([]);
  useWatchContractEvent({
    address: appConfig.erc20Address || undefined,
    abi: erc20Abi,
    eventName: 'Transfer',
    onLogs(logs) {
      setEvents((current) => [...logs.map((log) => `${log.args.from} -> ${log.args.to}: ${formatEther(log.args.value ?? 0n)}`), ...current].slice(0, 20));
    },
    enabled: isAddress(appConfig.erc20Address),
  });

  return <section className="card stack">
    <h2>4. 监听 ERC-20 Transfer 事件</h2>
    <p className="muted">页面打开后会持续监听配置合约的新 Transfer 事件。</p>
    <ol className="event-list">{events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
    {!events.length && <p className="muted">暂无事件</p>}
  </section>;
}

function Erc20Transfer() {
  const [to, setTo] = useState(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('1');
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const canTransfer = isAddress(appConfig.erc20Address) && isAddress(to) && Number(amount) > 0;

  return <section className="card stack">
    <h2>5. ERC-20 Token 转账</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value as Address)} placeholder="0x..." /></label>
    <label>Token 数量（18 位小数）<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" /></label>
    <button disabled={!canTransfer || isPending} onClick={() => writeContract({ address: appConfig.erc20Address as Address, abi: erc20Abi, functionName: 'transfer', args: [to as Address, parseUnits(amount, 18)] })}>转账 Token</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {receipt.isSuccess && <p className="status">转账已确认</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

export default function App() {
  const envRows = useMemo(() => [
    ['Chain ID', String(appConfig.chainId)],
    ['RPC URL', appConfig.rpcUrl],
    ['Read RPC', appConfig.readRpcUrl],
    ['ERC-20', appConfig.erc20Address || '未配置'],
  ], []);

  return <main className="app">
    <header className="hero">
      <h1>wagmi React DApp 示例</h1>
      <p>使用 wagmi Hooks 完成钱包连接、ETH 查询/转账、ERC-20 balanceOf、Transfer 监听和 Token 转账。</p>
    </header>
    <section className="env-grid">{envRows.map(([key, value]) => <div className="env-card" key={key}><strong>{key}</strong><p className="code">{value}</p></div>)}</section>
    <div className="card-grid" style={{ marginTop: 18 }}>
      <WalletAndEthBalance />
      <SendEth />
      <Erc20Balance />
      <TransferEvents />
      <Erc20Transfer />
    </div>
  </main>;
}
