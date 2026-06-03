import { useEffect, useMemo, useState } from 'react';
import { Contract, formatEther, formatUnits, isAddress, parseEther, parseUnits } from 'ethers';
import { appConfig, erc20Abi, getBrowserProvider, getReadErc20Contract, getReadProvider, switchToConfiguredChain } from './config';

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

function WalletAndEthBalance() {
  const [wallet, setWallet] = useState('');
  const [queryAddress, setQueryAddress] = useState(appConfig.defaultQueryAddress);
  const [balance, setBalance] = useState('');
  const { status, error, run } = useStatus();

  async function connect() {
    await switchToConfiguredChain();
    const provider = getBrowserProvider();
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    setWallet(address);
    setQueryAddress((current: any) => current || address);
  }

  async function queryBalance() {
    const provider = getReadProvider();
    const value = await provider.getBalance(queryAddress);
    setBalance(formatEther(value));
  }

  return <section className="card stack">
    <h2>1. 连接测试网并查询 ETH 余额</h2>
    <button onClick={() => run(connect, '连接钱包中...')}>连接钱包</button>
    <p className="code">当前钱包：{wallet || '未连接'}</p>
    <label>要查询的地址<input value={queryAddress} onChange={(e) => setQueryAddress(e.target.value)} placeholder="0x..." /></label>
    <button disabled={!isAddress(queryAddress)} onClick={() => run(queryBalance, '查询余额中...')}>查询余额</button>
    {balance && <p className="status">余额：{balance} ETH</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function SendEth() {
  const [to, setTo] = useState(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('0.001');
  const [hash, setHash] = useState('');
  const { status, error, run } = useStatus();

  async function sendEth() {
    await switchToConfiguredChain();
    const provider = getBrowserProvider();
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({ to, value: parseEther(amount) });
    setHash(tx.hash);
    await tx.wait();
  }

  return <section className="card stack">
    <h2>2. 发送 ETH</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." /></label>
    <label>ETH 数量<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.001" /></label>
    <button disabled={!isAddress(to) || Number(amount) <= 0} onClick={() => run(sendEth, '发送 ETH 中...')}>发送 ETH</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function Erc20Balance() {
  const [account, setAccount] = useState(appConfig.defaultQueryAddress);
  const [balance, setBalance] = useState('');
  const { status, error, run } = useStatus();

  async function readBalance() {
    const contract = getReadErc20Contract();
    const value = await contract.balanceOf(account);
    setBalance(formatUnits(value, 18));
  }

  return <section className="card stack">
    <h2>3. 调用 ERC-20 balanceOf</h2>
    <p className="code">合约：{appConfig.erc20Address || '请配置 VITE_ERC20_ADDRESS'}</p>
    <label>账户地址<input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="0x..." /></label>
    <button disabled={!appConfig.erc20Address || !isAddress(account)} onClick={() => run(readBalance, '读取 Token 余额中...')}>读取 Token 余额</button>
    {balance && <p className="status">余额：{balance} Token（按 18 位小数显示）</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function TransferEvents() {
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!appConfig.erc20Address) return;
    const contract = getReadErc20Contract();
    const listener = (from: string, to: string, value: bigint) => {
      setEvents((current) => [`${from} -> ${to}: ${formatEther(value)}`, ...current].slice(0, 20));
    };
    contract.on('Transfer', listener).catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
    return () => {
      contract.off('Transfer', listener).catch(() => undefined);
    };
  }, []);

  return <section className="card stack">
    <h2>4. 监听 ERC-20 Transfer 事件</h2>
    <p className="muted">使用 ethers Contract.on 监听配置合约的新 Transfer 事件。</p>
    <ol className="event-list">{events.map((event, index) => <li key={`${event}-${index}`}>{event}</li>)}</ol>
    {!events.length && <p className="muted">暂无事件</p>}
    {error && <p className="error">{error}</p>}
  </section>;
}

function Erc20Transfer() {
  const [to, setTo] = useState(appConfig.defaultRecipient);
  const [amount, setAmount] = useState('1');
  const [hash, setHash] = useState('');
  const { status, error, run } = useStatus();

  async function transferToken() {
    if (!appConfig.erc20Address) throw new Error('请先配置 VITE_ERC20_ADDRESS。');
    await switchToConfiguredChain();
    const provider = getBrowserProvider();
    const signer = await provider.getSigner();
    const contract = new Contract(appConfig.erc20Address, erc20Abi, signer);
    const tx = await contract.transfer(to, parseUnits(amount, 18));
    setHash(tx.hash);
    await tx.wait();
  }

  return <section className="card stack">
    <h2>5. ERC-20 Token 转账</h2>
    <label>接收地址<input value={to} onChange={(e) => setTo(e.target.value)} placeholder="0x..." /></label>
    <label>Token 数量（18 位小数）<input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1" /></label>
    <button disabled={!appConfig.erc20Address || !isAddress(to) || Number(amount) <= 0} onClick={() => run(transferToken, 'Token 转账中...')}>转账 Token</button>
    {hash && <p className="code">交易哈希：{hash}</p>}
    {status && <p className="muted">{status}</p>}
    {error && <p className="error">{error}</p>}
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
      <h1>ethers React DApp 示例</h1>
      <p>使用 ethers v6 完成钱包连接、ETH 查询/转账、ERC-20 balanceOf、Transfer 监听和 Token 转账。</p>
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
