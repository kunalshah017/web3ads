# Web3Ads MCP Server

MCP (Model Context Protocol) server that enables AI agents to make payments using Web3Ads earnings.

## Features

- **Check Balance**: Query user's ad earnings balance
- **Make Payment**: Pay for services using ad earnings (gasless)
- **Get Earnings**: Detailed breakdown of earnings from publishing/viewing
- **Platform Info**: Information about Web3Ads platform

## Installation

```bash
npm install web3ads-mcp
# or
pnpm add web3ads-mcp
```

## Usage with Claude Desktop

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "web3ads": {
      "command": "npx",
      "args": ["web3ads-mcp"],
      "env": {
        "WEB3ADS_API_URL": "https://api.web3ads.wtf"
      }
    }
  }
}
```

## Usage with HeyElsa / x402

The MCP server is designed for x402 integration, allowing AI agents to pay for API calls using funds earned from Web3Ads.

### Example Flow

1. User earns ETH by viewing/publishing ads on Web3Ads
2. User asks AI agent: "Use my Web3Ads balance to pay for this API call"
3. Agent calls `web3ads_check_balance` to verify funds
4. Agent calls `web3ads_make_payment` to send ETH to service provider
5. Payment is gasless - Web3Ads covers all transaction fees

## Available Tools

### `web3ads_check_balance`

Check user's available ad earnings.

**Input:**
- `walletAddress` (string): User's Ethereum wallet address

**Output:**
```json
{
  "balanceETH": 0.001,
  "balanceUSD": 2.0,
  "canWithdraw": true,
  "breakdown": {
    "fromPublishing": 0.0005,
    "fromViewing": 0.0005,
    "totalClaimed": 0.002,
    "totalEarned": 0.003
  }
}
```

### `web3ads_make_payment`

Pay for services using ad earnings (gasless).

**Input:**
- `walletAddress` (string): Wallet with ad earnings
- `amountETH` (number): Amount to pay
- `recipientAddress` (string): Service provider's address
- `memo` (string, optional): Payment description

**Output:**
```json
{
  "success": true,
  "txHash": "0x...",
  "amountETH": 0.001,
  "amountUSD": 2.0,
  "recipient": "0x...",
  "explorerUrl": "https://sepolia.basescan.org/tx/0x..."
}
```

### `web3ads_get_earnings`

Get detailed earnings breakdown.

**Input:**
- `walletAddress` (string): User's wallet address

**Output:**
```json
{
  "summary": {
    "totalEarnedETH": 0.003,
    "pendingETH": 0.001,
    "claimedETH": 0.002
  },
  "publisher": { ... },
  "viewer": { ... }
}
```

### `web3ads_platform_info`

Get platform information.

**Output:**
```json
{
  "name": "Web3Ads",
  "network": "Base Sepolia",
  "features": [...],
  "pricing": {...},
  "contracts": {...}
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WEB3ADS_API_URL` | Web3Ads API endpoint | `http://localhost:3001` |

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Type check
pnpm typecheck
```

## Network

Currently deployed on **Base Sepolia** (testnet).

Contracts:
- Web3AdsCoreV2: `0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F`
- Forwarder: `0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E`

## License

MIT
