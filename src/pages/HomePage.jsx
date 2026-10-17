import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ShieldCheck, Vote, Users, Lock, ArrowRight, CheckCircle2, AlertTriangle, Layers } from 'lucide-react';

const HomePage = ({ setActivePage }) => {
  const { account, connectWallet, isAdmin, networkName, contractAddress } = useWeb3();

  return (
    <div>
      {/* Hero Section */}
      <div style={{ textAlign: 'center', maxWidth: '840px', margin: '1.5rem auto 3rem auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            background: 'var(--primary-50)',
            border: '1px solid var(--primary-200)',
            borderRadius: 'var(--radius-full)',
            color: 'var(--primary-700)',
            fontSize: '0.825rem',
            fontWeight: 600,
            marginBottom: '1.25rem',
          }}
        >
          <ShieldCheck size={16} />
          IEEE Research Implementation &bull; EVM Smart Contract Enforcement
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
          Blockchain-Based Electronic Voting System
        </h1>

        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginTop: '1rem', lineHeight: 1.6 }}>
          A secure, verifiable electronic voting application implementing the protocols from the IEEE research paper{' '}
          <em>“A Secure Approach to Mitigate Double Voting in Electronic Voting Systems using Blockchain.”</em>
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '2rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              if (!account) connectWallet();
              setActivePage('voter-auth');
            }}
          >
            <Vote size={20} />
            Voter Login & Authenticate
          </button>

          <button
            className="btn btn-secondary btn-lg"
            onClick={() => {
              if (!account) connectWallet();
              setActivePage('admin');
            }}
          >
            <ShieldCheck size={20} />
            Administrator Portal
          </button>
        </div>
      </div>

      {/* Core Architectural Pillars */}
      <div className="grid-3" style={{ marginBottom: '3rem' }}>
        <div className="card">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: '#eff6ff',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Lock size={22} />
          </div>
          <h3 className="card-title">Atomic Double-Voting Mitigation</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Eliminates duplicate votes at the Ethereum consensus layer. The smart contract validates voter registration
            and sets <code style={{ color: 'var(--primary-700)' }}>hasVoted = true</code> in the same transaction, making re-voting cryptographically impossible.
          </p>
        </div>

        <div className="card">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: '#ecfdf5',
              color: 'var(--success-solid)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <h3 className="card-title">Role-Based Access Control</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Only the contract deployer (Administrator) holds permission to register voter wallet addresses and declare official candidates.
            Unregistered addresses are rejected automatically.
          </p>
        </div>

        <div className="card">
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              background: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
            }}
          >
            <Layers size={22} />
          </div>
          <h3 className="card-title">Transparent & Immutable Ledger</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Every cast ballot creates an on-chain <code style={{ color: 'var(--primary-700)' }}>VoteCasted</code> event.
            Vote tallies are computed directly from the Ethereum state without third-party database dependencies.
          </p>
        </div>
      </div>

      {/* Security Workflow Comparison */}
      <div className="card" style={{ marginBottom: '3rem' }}>
        <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
          IEEE Double-Voting Mitigation Workflow
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          How this system contrasts traditional centralized electronic voting with decentralized blockchain consensus:
        </p>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Security Threat</th>
                <th>Traditional E-Voting Risk</th>
                <th>This Blockchain System Mitigation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Double Voting (Replay)</strong></td>
                <td>Database race conditions, duplicate API requests, or server-side replay flaws.</td>
                <td><span className="badge badge-success">Mitigated</span> Solidity EVM checks <code style={{ color: 'var(--primary-700)' }}>require(!hasVoted)</code>; reverts transaction instantly.</td>
              </tr>
              <tr>
                <td><strong>Tally Tampering</strong></td>
                <td>Rogue database administrators or malware can modify SQL vote counter tables.</td>
                <td><span className="badge badge-success">Mitigated</span> Immutable blockchain state. Candidate tallies only increment upon valid signed transactions.</td>
              </tr>
              <tr>
                <td><strong>Unauthorized Voters</strong></td>
                <td>Forged session cookies or leaked authentication tokens.</td>
                <td><span className="badge badge-success">Mitigated</span> Wallet address must exist in <code style={{ color: 'var(--primary-700)' }}>voters[address].isRegistered</code>.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Network & Live Status Card */}
      <div className="card" style={{ background: '#f8fafc', borderColor: 'var(--border-color)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              SYSTEM STATUS &bull; LOCAL BLOCKCHAIN
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
              Ethereum Development Network: {networkName}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Contract: {contractAddress || 'Not Deployed'}
            </div>
          </div>

          <button
            className="btn btn-outline-primary"
            onClick={() => setActivePage('results')}
          >
            View Live Results <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
