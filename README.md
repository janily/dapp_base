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

## 本地运行单个示例

进入任一目录后复制 `.env.example` 为 `.env`，配置 RPC、测试网和 ERC-20 合约地址，再执行：

```bash
npm install
npm run dev
```

也可以在仓库根目录安装 workspace 依赖后运行某个示例：

```bash
npm install
npm run dev:ethers
npm run dev:viem
npm run dev:wagmi
```


## 环境变量配置

三个应用都支持同一套共享变量。如果部署时三个示例使用同一个测试网、RPC、ERC-20 合约和默认地址，只需要在 Vercel 项目的 Environment Variables 中配置这一组变量：

```bash
VITE_CHAIN_ID=11155111
VITE_CHAIN_NAME=Sepolia
VITE_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
VITE_READ_RPC_URL=/rpc/sepolia
VITE_ERC20_ADDRESS=
VITE_DEFAULT_QUERY_ADDRESS=
VITE_DEFAULT_RECIPIENT=
```

如果三个应用需要不同配置，可以在 Vercel 中使用应用前缀覆盖共享变量：

- `ethers/` 优先读取 `VITE_ETHERS_*`，没有配置时回退到共享的 `VITE_*`。
- `viem/` 优先读取 `VITE_VIEM_*`，没有配置时回退到共享的 `VITE_*`。
- `wagmi/` 优先读取 `VITE_WAGMI_*`，没有配置时回退到共享的 `VITE_*`。

例如只覆盖 wagmi 的 ERC-20 合约地址，可以配置：

```bash
VITE_WAGMI_ERC20_ADDRESS=0x...
```

本地根目录构建时可以复制根目录 `.env.example` 为 `.env`。`npm run build` 会先读取根目录 `.env`，再分别构建三个应用；单独进入某个应用目录运行时，仍然可以使用该应用目录自己的 `.env`。

## Vercel 部署

Vercel 只需要部署这个仓库根目录。根目录的 `package.json` 使用 npm workspaces 管理三个独立应用，`vercel.json` 会执行：

```bash
npm run build
```

构建脚本会：

1. 清空并创建根目录 `dist/`。
2. 复制 `homepage/` 作为站点主页。
3. 分别编译 `ethers/`、`viem/`、`wagmi/`。
4. 把三个应用的产物复制到 `dist/ethers/`、`dist/viem/`、`dist/wagmi/`。

部署后访问路径：

- `/`：统一入口页。
- `/ethers/`：ethers 独立示例。
- `/viem/`：viem 独立示例。
- `/wagmi/`：wagmi 独立示例。

三个 Vite 应用的 `base` 已分别设置为 `/ethers/`、`/viem/`、`/wagmi/`，因此部署到子路径时静态资源会从正确目录加载。
