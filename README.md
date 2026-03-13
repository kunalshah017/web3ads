# Web3Ads

A full-stack Web3 advertising platform with a React client, Express server, and Chrome extension.

## Project Structure

```
web3ads/
├── client/          # Vite + React + TypeScript + Tailwind
├── server/          # Express + TypeScript API server
├── extension/       # Chrome Extension (React + Vite + Tailwind)
└── .claude/         # AI agent instructions
```

## Prerequisites

- Node.js >= 22
- pnpm (`npm install -g pnpm`)

## Quick Start

```bash
# Install all dependencies
pnpm install

# Run all services in development mode
pnpm dev

# Or run individually:
pnpm dev:client     # React app on http://localhost:5173
pnpm dev:server     # API server on http://localhost:3001
pnpm dev:extension  # Extension dev mode with HMR
```

## Building

```bash
# Build all
pnpm build

# Or individually:
pnpm build:client
pnpm build:server
pnpm build:extension
```

## Extension Setup

1. Run `pnpm dev:extension`
2. Open Chrome → `chrome://extensions`
3. Enable "Developer mode"
4. Click "Load unpacked"
5. Select `extension/dist` directory

## Tech Stack

### Client

- React 19
- TypeScript
- Vite 8
- Tailwind CSS 4

### Server

- Express 5
- TypeScript
- tsx (for development)

### Extension

- React 19
- TypeScript
- Vite 6
- Tailwind CSS 3
- Turborepo
- Chrome Manifest V3
