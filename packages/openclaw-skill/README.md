# Web3Ads OpenClaw Skill

<p align="center">
  <strong>Use your ad earnings to pay for ANY x402 API</strong>
</p>

OpenClaw skill-pack that enables AI agents to interact with Web3Ads - a decentralized advertising platform where users earn ETH from viewing and publishing ads.

## 🎯 Unique Value Proposition

**Web3Ads earnings as universal x402 payment source**: 
- Earn ETH by viewing/publishing ads
- Use those earnings to pay for Web3Ads campaigns
- Use those earnings to pay for ANY x402-compatible API (HeyElsa, etc.)
- All payments are gasless - Web3Ads covers fees!

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/web3ads/web3ads-openclaw.git
cd web3ads-openclaw
npm install
```

### 2. Configure OpenClaw

Edit `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/web3ads-openclaw"]
    },
    "entries": {
      "web3ads": {
        "env": {
          "WEB3ADS_WALLET_ADDRESS": "0xYourWalletAddress"
        }
      }
    }
  }
}
```

### 3. Restart OpenClaw

The skill will load automatically. Verify with `/skills` in chat.

## 🛠️ Available Tools

### Read-Only (Always Available)

| Tool | Description |
|------|-------------|
| `web3ads_check_balance` | Check your Web3Ads earnings |
| `web3ads_get_earnings` | Detailed breakdown by source |
| `web3ads_platform_info` | Platform info and pricing |
| `web3ads_payment_info` | x402 payment requirements |
| `web3ads_list_campaigns` | Your ad campaigns |
| `web3ads_budget_status` | Skill budget usage |

### Execution (Opt-In)

| Tool | Description |
|------|-------------|
| `web3ads_create_campaign` | Create and fund ad campaign |
| `web3ads_pay_x402` | Pay any x402 API with earnings |

Enable with `WEB3ADS_ENABLE_EXECUTION=true`

## 💬 Usage Examples

```
YOU: "What's my Web3Ads balance?"
→ Returns ETH balance from viewing/publishing ads

YOU: "Show my earnings breakdown"
→ Detailed breakdown: publisher vs viewer earnings

YOU: "Create a banner ad for my DeFi app with 0.01 ETH budget"
→ Creates campaign, pays from your ad earnings (gasless!)

YOU: "Use my Web3Ads earnings to pay 0.001 ETH to 0x..."
→ Sends payment from ad earnings (no wallet needed!)
```

## ⚙️ Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEB3ADS_WALLET_ADDRESS` | Yes | - | Your wallet address |
| `WEB3ADS_API_URL` | No | `https://api.web3ads.wtf` | API endpoint |
| `WEB3ADS_ENABLE_EXECUTION` | No | `false` | Enable execution tools |
| `WEB3ADS_MAX_USD_PER_CALL` | No | `1.00` | Per-call limit |
| `WEB3ADS_MAX_USD_PER_DAY` | No | `10.00` | Daily limit |

## 🔐 Security

- **Non-custodial**: Your wallet keys never leave your machine
- **Budget controls**: Per-call and daily USD limits
- **Execution disabled by default**: Opt-in for any spending

## 🌐 x402 Integration

Web3Ads implements the [Coinbase x402 protocol](https://github.com/coinbase/x402):

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ User views ads  │ ──▶ │ Earns ETH in    │ ──▶ │ AI agent uses   │
│ on websites     │     │ Web3Ads balance │     │ balance for x402│
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Your Web3Ads earnings become a **universal payment source** for any x402 API!

## 🧪 Smoke Test

```bash
# Check balance
npx tsx scripts/index.ts web3ads_check_balance '{"wallet_address": "0x..."}'

# Get platform info
npx tsx scripts/index.ts web3ads_platform_info '{}'

# Check budget status
npx tsx scripts/index.ts web3ads_budget_status '{}'
```

## 📊 Network Info

- **Network**: Base Sepolia (Testnet)
- **Chain ID**: 84532
- **Currency**: ETH
- **Contract**: `0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F`

## 🔗 Links

- Website: https://web3ads.wtf
- x402 Protocol: https://x402.org
- HeyElsa x402: https://x402.heyelsa.ai
- GitHub: https://github.com/web3ads

## 📄 License

MIT
