# Web3Ads MCP Server

MCP (Model Context Protocol) server that enables AI agents to make payments and create campaigns using Web3Ads earnings.

## Features

- **Check Balance**: Query user's ad earnings balance
- **Make Payment**: Pay for services using ad earnings (gasless)
- **Create Campaign**: Create ad campaigns with x402 payment
- **Get Earnings**: Detailed breakdown of earnings from publishing/viewing
- **Platform Info**: Information about Web3Ads platform
- **Payment Info**: x402 protocol details for integrations

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

The MCP server is designed for x402 integration, allowing AI agents to:
1. **Pay for API calls** using funds earned from viewing/publishing ads
2. **Create ad campaigns** using x402 payment protocol

### x402 Flow for API Payments

1. User earns ETH by viewing/publishing ads on Web3Ads
2. User asks AI agent: "Use my Web3Ads balance to pay for this API call"
3. Agent calls `web3ads_check_balance` to verify funds
4. Agent calls `web3ads_make_payment` to send ETH to service provider
5. Payment is gasless - Web3Ads covers all transaction fees

### x402 Flow for Campaign Creation

1. User asks AI agent: "Create an ad campaign for my product"
2. Agent calls `web3ads_check_balance` to verify funds
3. Agent calls `web3ads_create_campaign` with campaign details
4. Campaign is created and funded atomically using x402
5. Payment deducted from user's ad earnings (gasless!)

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

### `web3ads_create_campaign`

Create an ad campaign using x402 payment from Web3Ads balance.

**Input:**

- `walletAddress` (string): Wallet with ad earnings
- `name` (string): Campaign name
- `description` (string, optional): Campaign description
- `adType` (enum): `BANNER`, `SQUARE`, `SIDEBAR`, or `INTERSTITIAL`
- `mediaUrl` (string): URL to the ad image
- `targetUrl` (string): URL users go to when clicking
- `budget` (number): Budget in ETH (paid from Web3Ads balance)
- `category` (string, optional): Ad category

**Output:**

```json
{
  "success": true,
  "campaign": {
    "id": "abc123",
    "name": "My Campaign",
    "status": "ACTIVE",
    "budget": 0.01,
    "adType": "BANNER"
  },
  "payment": {
    "method": "web3ads-balance",
    "amountETH": 0.01,
    "amountUSD": 20.0,
    "remainingBalance": 0.005,
    "gasless": true
  },
  "dashboardUrl": "https://web3ads.wtf/advertiser?campaign=abc123"
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

### `web3ads_payment_info`

Get x402 payment protocol information.

**Input:**

- `walletAddress` (string, optional): Wallet to check balance for

**Output:**

```json
{
  "protocol": "x402",
  "paymentAddress": "0x...",
  "network": "base-sepolia",
  "chainId": 84532,
  "methods": {
    "direct": { ... },
    "web3adsBalance": {
      "yourBalance": {
        "available": 0.01,
        "fromPublishing": 0.005,
        "fromViewing": 0.005
      }
    }
  },
  "cpmRates": {
    "BANNER": 0.5,
    "SQUARE": 0.75,
    "SIDEBAR": 1.0,
    "INTERSTITIAL": 2.0
  }
}
```

## Environment Variables

| Variable          | Description          | Default                 |
| ----------------- | -------------------- | ----------------------- |
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
