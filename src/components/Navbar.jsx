import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { Vote, Shield, UserCheck, BarChart3, Wallet, CheckCircle2 } from 'lucide-react';

const Navbar = ({ activePage, setActivePage }) => {
  const { account, connectWallet, isConnecting, isAdmin, networkName, isWrongNetwork, switchNetwork } = useWeb3();

  const shortenAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-section" onClick={() => setActivePage('home')}>
          <div className="brand-icon">
            <Vote size={24} />
          </div>
          <div className="brand-text">
            <h1>Decentralized Voting</h1>
            <span>Double-Voting Mitigation Protocol</span>
          </div>
        </div>

        <nav className="nav-links">
          <button
            className={`nav-link ${activePage === 'home' ? 'active' : ''}`}
            onClick={() => setActivePage('home')}
          >
            Home
          </button>
          <button
            className={`nav-link ${activePage === 'voter-auth' ? 'active' : ''}`}
            onClick={() => setActivePage('voter-auth')}
          >
            <UserCheck size={16} />
            Voter Portal
          </button>
          <button
            className={`nav-link ${activePage === 'voting' ? 'active' : ''}`}
            onClick={() => setActivePage('voting')}
          >
            <Vote size={16} />
            Cast Vote
          </button>
          <button
            className={`nav-link ${activePage === 'results' ? 'active' : ''}`}
            onClick={() => setActivePage('results')}
          >
            <BarChart3 size={16} />
            Results
          </button>
          <button
            className={`nav-link ${activePage === 'admin' ? 'active' : ''}`}
            onClick={() => setActivePage('admin')}
          >
            <Shield size={16} />
            Admin
          </button>
        </nav>

        <div className="nav-wallet-section">
          {account ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isWrongNetwork && (
                <button
                  className="btn btn-warning btn-sm"
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                  onClick={switchNetwork}
                  title="Switch to Hardhat Localhost (31337)"
                >
                  Switch Network
                </button>
              )}
              <span className="wallet-pill" title={account}>
                <span className="wallet-dot"></span>
                {shortenAddress(account)}
              </span>
              {isAdmin && (
                <span className="badge badge-info" title="Election Administrator">
                  Admin
                </span>
              )}
            </div>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={connectWallet}
              disabled={isConnecting}
            >
              <Wallet size={16} />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
