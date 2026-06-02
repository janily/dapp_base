# viem React DApp 示例

这个目录是一个独立的 Vite + React 示例应用，使用 **viem** 实现 5 个基础 DApp 功能：

1. 连接以太坊测试网并查询任意地址 ETH 余额。
2. 发送 ETH 到另一个地址。
3. 调用 ERC-20 合约的 `balanceOf` 方法。
4. 监听 ERC-20 合约的 `Transfer` 事件。
5. 调用 ERC-20 `transfer` 实现 Token 转账。

## 环境变量

复制配置模板：

```bash
cp .env.example .env
```

可配置项：

- `VITE_CHAIN_ID`：测试网 Chain ID，默认 Sepolia `11155111`。
- `VITE_CHAIN_NAME`：网络名称，默认 `Sepolia`。
- `VITE_RPC_URL`：RPC 地址，默认 `https://rpc.sepolia.org`。
- `VITE_ERC20_ADDRESS`：要读取、监听和转账的 ERC-20 合约地址。
- `VITE_DEFAULT_QUERY_ADDRESS`：页面表单默认查询地址。
- `VITE_DEFAULT_RECIPIENT`：页面表单默认收款地址。

> 示例按 18 位小数格式化 Token 数量。如目标 ERC-20 不是 18 位小数，请在源码中调整 `formatUnits` / `parseUnits` 的 decimals 参数。

## 运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```
