# DApp Base

本仓库包含 3 个独立的 React/Vite DApp 示例目录：

- `wagmi/`：使用 wagmi Hooks。
- `ethers/`：使用 ethers v6。
- `viem/`：使用 viem publicClient / walletClient。

每个目录都实现同一组 5 个功能组件：

1. 连接以太坊测试网并查询地址 ETH 余额。
2. 发送 ETH 到另一个地址。
3. 调用 ERC-20 合约 `balanceOf`。
4. 监听 ERC-20 合约 `Transfer` 事件。
5. 调用 ERC-20 `transfer` 完成 Token 转账。

进入任一目录后复制 `.env.example` 为 `.env`，配置 RPC、测试网和 ERC-20 合约地址，再执行：

```bash
npm install
npm run dev
```
