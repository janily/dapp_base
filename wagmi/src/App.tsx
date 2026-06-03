import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatUnits, isAddress, parseEther, parseUnits, type Address } from 'viem';
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

async function requestInjectedAccountSelection() {
  if (!window.ethereum) {
    throw new Error('未检测到浏览器钱包，请安装 MetaMask 或兼容钱包。');
  }
  await window.ethereum.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
  const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
  return Array.isArray(accounts) ? (accounts[0] as Address | undefined) : undefined;
}

function WalletAndEthBalance() {
  const { address, isConnected } = useAccount();
  const activeChainId = useChainId();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const { connectors, connect, status } = useConnect();
  const { disconnect } = useDisconnect();
  const [queryAddress, setQueryAddress] = useState(appConfig.defaultQueryAddress || address || '');
  const [accountSwitchStatus, setAccountSwitchStatus] = useState('');
  const [accountSwitchError, setAccountSwitchError] = useState('');
  const enabled = isAddress(queryAddress);

  useEffect(() => {
    if (address && !queryAddress) setQueryAddress(address);
  }, [address, queryAddress]);

  async function switchAccount() {
    setAccountSwitchStatus('切换钱包账号中...');
    setAccountSwitchError('');
    try {
      const selectedAccount = await requestInjectedAccountSelection();
      if (selectedAccount) setQueryAddress((current) => current || selectedAccount);
      setAccountSwitchStatus(selectedAccount ? '账号已切换' : '已重新请求钱包账号授权');
    } catch (err) {
      setAccountSwitchError(err instanceof Error ? err.message : String(err));
      setAccountSwitchStatus('');
    }
  }
  const { data, refetch, isFetching, error } = useBalance({ address: enabled ? (queryAddress as Address) : undefined, query: { enabled } });

  return <section className="card stack">
    <h2>1. 连接测试网并查询 ETH 余额</h2>
    <div className="row">
      {isConnected ? <button onClick={() => disconnect()}>断开钱包</button> : connectors.map((connector) => <button key={connector.uid} onClick={() => connect({ connector })}>连接 {connector.name}</button>)}
      <button className="secondary" onClick={switchAccount}>切换账号</button>
      <button disabled={!isConnected || activeChainId === appConfig.chainId || isSwitching} onClick={() => switchChain({ chainId: appConfig.chainId })}>切换到 {appConfig.chainName}</button>
      <span className="muted">{status}</span>
    </div>
    <p className="code">当前钱包：{address ?? '未连接'}；当前 Chain ID：{activeChainId}</p>
    <label>要查询的地址<input value={queryAddress} onChange={(e) => setQueryAddress(e.target.value)} placeholder="0x..." /></label>
    <button disabled={!enabled || isFetching} onClick={() => refetch()}>查询余额</button>
    {data && <p className="status">余额：{data.formatted} {data.symbol}</p>}
    {accountSwitchStatus && <p className="muted">{accountSwitchStatus}</p>}
    {accountSwitchError && <p className="error">{accountSwitchError}</p>}
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

function Erc20Balance({ erc20Address }: { erc20Address: Address | '' }) {
  const [account, setAccount] = useState(appConfig.defaultQueryAddress);
  const enabled = isAddress(erc20Address) && isAddress(account);
  const { data, refetch, isFetching, error } = useReadContract({
    address: isAddress(erc20Address) ? erc20Address : undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: enabled ? [account as Address] : undefined,
    query: { enabled },
  });

  return <section className="card stack">
    <h2>3. 调用 ERC-20 balanceOf</h2>
    <p className="code">合约：{erc20Address || '请在页面上填写 ERC-20 合约地址'}</p>
    <label>账户地址<input value={account} onChange={(e) => setAccount(e.target.value as Address)} placeholder="0x..." /></label>
    <button disabled={!enabled || isFetching} onClick={() => refetch()}>读取 Token 余额</button>
    {typeof data === 'bigint' && <p className="status">余额：{formatUnits(data, 18)} Token（按 18 位小数显示）</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

function TransferEvents({ erc20Address }: { erc20Address: Address | '' }) {
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState('');
  const canWatch = isAddress(erc20Address);

  useEffect(() => {
    setEvents([]);
    setError('');
  }, [erc20Address]);

  const handleLogs = useCallback((logs: readonly { args: { from?: Address; to?: Address; value?: bigint } }[]) => {
    setEvents((current) => [
      ...logs.map((log) => `${log.args.from} -> ${log.args.to}: ${formatUnits(log.args.value ?? 0n, 18)}`),
      ...current,
    ].slice(0, 20));
  }, []);

  const handleError = useCallback((err: Error) => {
    setError(err.message);
  }, []);

  useWatchContractEvent({
    address: canWatch ? erc20Address : undefined,
    abi: erc20Abi,
    eventName: 'Transfer',
    chainId: appConfig.chainId,
    onLogs: handleLogs,
    onError: handleError,
    enabled: canWatch,
    poll: true,
    pollingInterval: 2_000,
  });

  return <section className="card stack">
    <h2>4. 监听 ERC-20 Transfer 事件</h2>
    <p className="muted">页面打开后会持续监听配置合约的新 Transfer 事件。</p>
    {canWatch && <p className="status">监听中：{erc20Address}</p>}
    <ol className="event-list">{events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
    {!events.length && <p className="muted">暂无事件</p>}
    {error && <p className="error">监听失败：{error}</p>}
  </section>;
}

function Erc20Transfer({ erc20Address }: { erc20Address: Address | '' }) {
  const [to, setTo] = useState(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('1');
  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const canTransfer = isAddress(erc20Address) && isAddress(to) && Number(amount) > 0;

  return <section className="card stack">
    <h2>5. ERC-20 Token 转账</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value as Address)} placeholder="0x..." /></label>
    <label>Token 数量（18 位小数）<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" /></label>
    <button disabled={!canTransfer || isPending} onClick={() => writeContract({ address: erc20Address as Address, abi: erc20Abi, functionName: 'transfer', args: [to as Address, parseUnits(amount, 18)] })}>转账 Token</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {receipt.isSuccess && <p className="status">转账已确认</p>}
    {error && <p className="error">{error.message}</p>}
  </section>;
}

function Erc20AddressConfig({ erc20Address, open, onChange, onClose }: { erc20Address: Address | ''; open: boolean; onChange: (address: Address | '') => void; onClose: () => void }) {
  const [draft, setDraft] = useState(erc20Address);
  const trimmedDraft = draft.trim() as Address | '';
  const isEmpty = !trimmedDraft;
  const isValid = isAddress(trimmedDraft);

  useEffect(() => {
    if (open) setDraft(erc20Address);
  }, [erc20Address, open]);

  if (!open) return null;

  function saveAddress() {
    onChange(trimmedDraft);
    onClose();
  }

  return <div className="modal-backdrop" role="presentation" onClick={onClose}>
    <section className="modal-card stack" role="dialog" aria-modal="true" aria-labelledby="erc20-config-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-header">
        <h2 id="erc20-config-title">ERC-20 合约配置</h2>
        <button className="icon-button" aria-label="关闭合约配置弹窗" onClick={onClose}>×</button>
      </div>
      <p className="muted">填写要测试的 ERC-20 合约地址；balanceOf、Transfer 监听和 Token 转账会共用这个地址。</p>
      <label>ERC-20 合约地址<input value={draft} onChange={(e) => setDraft(e.target.value as Address | '')} placeholder="0x..." autoFocus /></label>
      {isEmpty && <p className="muted">页面初始值会读取环境变量 VITE_ERC20_ADDRESS / VITE_WAGMI_ERC20_ADDRESS；也可以直接在这里填写后测试。</p>}
      {!isEmpty && !isValid && <p className="error">请输入有效的 ERC-20 合约地址。</p>}
      {isValid && <p className="status">当前使用：{trimmedDraft}</p>}
      <div className="modal-actions">
        <button className="secondary" onClick={() => setDraft('')}>清空</button>
        <button className="secondary" onClick={onClose}>取消</button>
        <button disabled={!isEmpty && !isValid} onClick={saveAddress}>保存配置</button>
      </div>
    </section>
  </div>;
}

export default function App() {
  const [erc20Address, setErc20Address] = useState<Address | ''>(() => (localStorage.getItem('erc20Address') as Address | null) || appConfig.erc20Address);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const envRows = useMemo(() => [
    ['Chain ID', String(appConfig.chainId)],
    ['RPC URL', appConfig.rpcUrl],
    ['Read RPC', appConfig.readRpcUrl],
    ['ERC-20', erc20Address || '未配置'],
  ], [erc20Address]);

  function updateErc20Address(address: Address | '') {
    setErc20Address(address);
    if (address) {
      localStorage.setItem('erc20Address', address);
    } else {
      localStorage.removeItem('erc20Address');
    }
  }

  return <main className="app">
    <header className="hero">
      <h1>wagmi React DApp 示例</h1>
      <p>使用 wagmi Hooks 完成钱包连接、ETH 查询/转账、ERC-20 balanceOf、Transfer 监听和 Token 转账。</p>
    </header>
    <section className="env-grid">{envRows.map(([key, value]) => <div className="env-card" key={key}><strong>{key}</strong><p className="code">{value}</p>{key === 'ERC-20' && <button className="secondary" onClick={() => setIsConfigOpen(true)}>配置合约地址</button>}</div>)}</section>
    <Erc20AddressConfig erc20Address={erc20Address} open={isConfigOpen} onChange={updateErc20Address} onClose={() => setIsConfigOpen(false)} />
    <div className="card-grid" style={{ marginTop: 18 }}>
      <WalletAndEthBalance />
      <SendEth />
      <Erc20Balance erc20Address={erc20Address} />
      <TransferEvents erc20Address={erc20Address} />
      <Erc20Transfer erc20Address={erc20Address} />
    </div>
  </main>;
}
