import { useEffect, useMemo, useState } from 'react';
import { createWalletClient, formatEther, formatUnits, isAddress, parseEther, parseUnits, type Address } from 'viem';
import { appConfig, configuredChain, erc20Abi, getWalletTransport, publicClient, switchToConfiguredChain } from './config';

function useStatus() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const run = async (task: () => Promise<void>, message = '处理中...') => {
    setStatus(message);
    setError('');
    try {
      await task();
      setStatus('完成');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus('');
    }
  };
  return { status, error, run };
}

async function getWalletAccount(forceAccountPicker = false) {
  await switchToConfiguredChain();
  if (forceAccountPicker) {
    await window.ethereum?.request({ method: 'wallet_requestPermissions', params: [{ eth_accounts: {} }] });
  }
  const walletClient = createWalletClient({ chain: configuredChain, transport: getWalletTransport() });
  const [account] = await walletClient.requestAddresses();
  return { walletClient, account };
}

function WalletAndEthBalance() {
  const [wallet, setWallet] = useState<Address | ''>('');
  const [queryAddress, setQueryAddress] = useState<Address | ''>(appConfig.defaultQueryAddress);
  const [balance, setBalance] = useState('');
  const { status, error, run } = useStatus();

  async function connect(forceAccountPicker = false) {
    const { account } = await getWalletAccount(forceAccountPicker);
    setWallet(account);
    setQueryAddress((current) => current || account);
  }

  async function queryBalance() {
    const value = await publicClient.getBalance({ address: queryAddress as Address });
    setBalance(formatEther(value));
  }

  return <section className="card stack">
    <h2>1. 连接测试网并查询 ETH 余额</h2>
    <div className="row">
      <button onClick={() => run(() => connect(false), '连接钱包中...')}>连接钱包</button>
      <button className="secondary" onClick={() => run(() => connect(true), '切换钱包账号中...')}>切换账号</button>
    </div>
    <p className="code">当前钱包：{wallet || '未连接'}</p>
    <label>要查询的地址<input value={queryAddress} onChange={(e) => setQueryAddress(e.target.value as Address)} placeholder="0x..." /></label>
    <button disabled={!isAddress(queryAddress)} onClick={() => run(queryBalance, '查询余额中...')}>查询余额</button>
    {balance && <p className="status">余额：{balance} ETH</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function SendEth() {
  const [to, setTo] = useState<Address | ''>(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('0.001');
  const [hash, setHash] = useState('');
  const { status, error, run } = useStatus();

  async function sendEth() {
    const { walletClient, account } = await getWalletAccount();
    const txHash = await walletClient.sendTransaction({ account, to: to as Address, value: parseEther(amount) });
    setHash(txHash);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  return <section className="card stack">
    <h2>2. 发送 ETH</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value as Address)} placeholder="0x..." /></label>
    <label>ETH 数量<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.001" /></label>
    <button disabled={!isAddress(to) || Number(amount) <= 0} onClick={() => run(sendEth, '发送 ETH 中...')}>发送 ETH</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function Erc20Balance({ erc20Address }: { erc20Address: Address | '' }) {
  const [account, setAccount] = useState<Address | ''>(appConfig.defaultQueryAddress);
  const [balance, setBalance] = useState('');
  const { status, error, run } = useStatus();

  async function readBalance() {
    const value = await publicClient.readContract({ address: erc20Address as Address, abi: erc20Abi, functionName: 'balanceOf', args: [account as Address] });
    setBalance(formatUnits(value, 18));
  }

  return <section className="card stack">
    <h2>3. 调用 ERC-20 balanceOf</h2>
    <p className="code">合约：{erc20Address || '请在页面上填写 ERC-20 合约地址'}</p>
    <label>账户地址<input value={account} onChange={(e) => setAccount(e.target.value as Address)} placeholder="0x..." /></label>
    <button disabled={!isAddress(erc20Address) || !isAddress(account)} onClick={() => run(readBalance, '读取 Token 余额中...')}>读取 Token 余额</button>
    {balance && <p className="status">余额：{balance} Token（按 18 位小数显示）</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function TransferEvents({ erc20Address }: { erc20Address: Address | '' }) {
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    setEvents([]);
    setError('');
    if (!isAddress(erc20Address)) return;

    let isWatching = true;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastScannedBlock: bigint | undefined;

    async function pollTransferEvents() {
      try {
        const latestBlock = await publicClient.getBlockNumber();
        if (lastScannedBlock === undefined) {
          lastScannedBlock = latestBlock;
          setError('');
          return;
        }

        if (latestBlock > lastScannedBlock) {
          const logs = await publicClient.getContractEvents({
            address: erc20Address as Address,
            abi: erc20Abi,
            eventName: 'Transfer',
            fromBlock: lastScannedBlock + 1n,
            toBlock: latestBlock,
          });
          lastScannedBlock = latestBlock;

          if (logs.length) {
            setEvents((current) => [
              ...logs.map((log) => `${log.args.from} -> ${log.args.to}: ${formatUnits(log.args.value ?? 0n, 18)}`),
              ...current,
            ].slice(0, 20));
          }
        }

        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (isWatching) timeoutId = setTimeout(pollTransferEvents, publicClient.pollingInterval);
      }
    }

    void pollTransferEvents();

    return () => {
      isWatching = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [erc20Address]);

  return <section className="card stack">
    <h2>4. 监听 ERC-20 Transfer 事件</h2>
    <p className="muted">使用 viem getContractEvents 按新区块轮询 Transfer 事件，避免部分 RPC 节点的 filter 失效导致 eth_getFilterChanges 报错。</p>
    <ol className="event-list">{events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
    {!events.length && <p className="muted">暂无事件</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function Erc20Transfer({ erc20Address }: { erc20Address: Address | '' }) {
  const [to, setTo] = useState<Address | ''>(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('1');
  const [hash, setHash] = useState('');
  const { status, error, run } = useStatus();

  async function transferToken() {
    if (!isAddress(erc20Address)) throw new Error('请先在页面上填写有效的 ERC-20 合约地址。');
    const { walletClient, account } = await getWalletAccount();
    const txHash = await walletClient.writeContract({ account, address: erc20Address as Address, abi: erc20Abi, functionName: 'transfer', args: [to as Address, parseUnits(amount, 18)] });
    setHash(txHash);
    await publicClient.waitForTransactionReceipt({ hash: txHash });
  }

  return <section className="card stack">
    <h2>5. ERC-20 Token 转账</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value as Address)} placeholder="0x..." /></label>
    <label>Token 数量（18 位小数）<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" /></label>
    <button disabled={!isAddress(erc20Address) || !isAddress(to) || Number(amount) <= 0} onClick={() => run(transferToken, 'Token 转账中...')}>转账 Token</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
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
      {isEmpty && <p className="muted">页面初始值会读取环境变量 VITE_ERC20_ADDRESS / VITE_VIEM_ERC20_ADDRESS；也可以直接在这里填写后测试。</p>}
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
      <h1>viem React DApp 示例</h1>
      <p>使用 viem publicClient/walletClient 完成钱包连接、ETH 查询/转账、ERC-20 balanceOf、Transfer 监听和 Token 转账。</p>
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
