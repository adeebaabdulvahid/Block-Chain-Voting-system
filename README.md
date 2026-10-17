# Blockchain-Based Electronic Voting System - Frontend

A decentralized, responsive Web3 application for electronic voting built with **React**, **Vite**, **Web3.js**, and **Lucide Icons**.

This frontend interacts with Ethereum smart contracts to mitigate double-voting via atomic state verification.

## 🚀 Features

- **Wallet Authentication**: Seamless MetaMask integration with automatic network checking (Hardhat Localhost / Chain ID `31337`).
- **Voter Eligibility Portal**: Queries on-chain voter registration and checks ballot status.
- **Voting Booth**: Real-time ballot selection with confirmation modals and pending transaction tracking.
- **Live Election Results**: Real-time tally charts, voter turnout statistics, and leader indicators.
- **Admin Dashboard**: Whitelist eligible voter addresses and register candidates.
- **Contract Settings Modal**: Dynamic contract address configuration without server restart.

## 🛠️ Tech Stack

- **React 18**
- **Vite 5**
- **Web3.js v4**
- **Lucide React**
- **Vanilla CSS**

## 🏁 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Connect MetaMask
Configure MetaMask to connect to `Hardhat Localhost` (RPC URL: `http://127.0.0.1:8545`, Chain ID: `31337`).
