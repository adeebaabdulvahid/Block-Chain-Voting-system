import React, { useState } from 'react';
import { Web3Provider, useWeb3 } from './context/Web3Context';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import VoterAuthPage from './pages/VoterAuthPage';
import VotingPage from './pages/VotingPage';
import ResultsPage from './pages/ResultsPage';
import { Settings, ShieldCheck, Check, AlertCircle } from 'lucide-react';

const AppContent = () => {
  const [activePage, setActivePage] = useState('home');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const {
    contractAddress,
    updateContractAddress,
    resetToDefaultContractAddress,
    networkName,
    isWrongNetwork,
    switchNetwork,
    isContractDeployed,
    contractError,
    error,
    setError,
  } = useWeb3();
  const [customAddressInput, setCustomAddressInput] = useState(contractAddress || '');
  const [configSuccess, setConfigSuccess] = useState(false);
  const [configError, setConfigError] = useState('');

  const handleSaveContractAddress = (e) => {
    e.preventDefault();
    setConfigSuccess(false);
    setConfigError('');

    const trimmed = customAddressInput.trim();
    const ok = updateContractAddress(trimmed);
    if (ok) {
      setConfigSuccess(true);
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccess(false);
      }, 1000);
    } else {
      setConfigError('Invalid Ethereum contract address format.');
    }
  };

  const handleResetContractAddress = () => {
    resetToDefaultContractAddress();
    setCustomAddressInput(contractAddress);
    setConfigSuccess(true);
    setTimeout(() => {
      setShowConfigModal(false);
      setConfigSuccess(false);
    }, 1000);
  };

  return (
    <div className="app-container">
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      {/* Global Wallet Error Banner */}
      {error && (
        <div
          style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '0.6rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#991b1b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          <span>⚠️ {error}</span>
          <button
            onClick={() => setError('')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#991b1b',
              fontWeight: 'bold',
              fontSize: '1.1rem',
              lineHeight: 1,
              padding: '0 0.4rem',
            }}
            title="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Global Network Warning Banner */}
      {isWrongNetwork && (
        <div
          style={{
            background: '#fffbeb',
            borderBottom: '1px solid #fde68a',
            padding: '0.6rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <span>
            ⚠️ <strong>Wrong Network:</strong> Connected to <strong>{networkName}</strong>. This application requires Hardhat Localhost (Chain ID: 31337).
          </span>
          <button
            className="btn btn-warning btn-sm"
            style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem' }}
            onClick={switchNetwork}
          >
            Switch to Hardhat (31337)
          </button>
        </div>
      )}

      {/* Global Contract Missing Banner */}
      {(!isContractDeployed || contractError) && (
        <div
          style={{
            background: '#fef2f2',
            borderBottom: '1px solid #fecaca',
            padding: '0.6rem 1.5rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#991b1b',
          }}
        >
          <strong>Smart Contract Alert:</strong>{' '}
          {contractError ||
            `No contract bytecode found at ${contractAddress}. Please run "npm run deploy" to deploy the contract.`}
        </div>
      )}

      <main className="main-content">
        {activePage === 'home' && <HomePage setActivePage={setActivePage} />}
        {activePage === 'admin' && <AdminDashboard />}
        {activePage === 'voter-auth' && <VoterAuthPage setActivePage={setActivePage} />}
        {activePage === 'voting' && <VotingPage setActivePage={setActivePage} />}
        {activePage === 'results' && <ResultsPage />}
      </main>

      {/* Floating Network & Contract Config Button */}
      <button
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-full)',
          padding: '0.5rem 0.85rem',
          boxShadow: 'var(--shadow-md)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          fontWeight: 600,
          zIndex: 40,
        }}
        onClick={() => {
          setCustomAddressInput(contractAddress);
          setShowConfigModal(true);
        }}
        title="Configure Smart Contract Address & Network"
      >
        <Settings size={14} />
        <span>Contract Settings</span>
      </button>

      {/* Contract Settings Modal */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <Settings size={22} color="var(--primary-600)" />
              <h2 className="modal-title">Smart Contract Configuration</h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
              Connected Network: <strong>{networkName}</strong>. If you redeploy the contract to another address,
              you can update the target address below without restarting Vite.
            </p>

            <form onSubmit={handleSaveContractAddress}>
              <div className="form-group">
                <label className="form-label" htmlFor="contract-addr">
                  Voting Smart Contract Address
                </label>
                <input
                  id="contract-addr"
                  type="text"
                  className="form-input form-input-mono"
                  value={customAddressInput}
                  onChange={(e) => setCustomAddressInput(e.target.value)}
                  placeholder="0x5FbDB2315678afecb367f032d93F642f64180aa3"
                  required
                />
              </div>

              {configSuccess && (
                <div style={{ color: 'var(--success-solid)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Check size={16} /> Contract address updated successfully!
                </div>
              )}

              {configError && (
                <div style={{ color: 'var(--danger-solid)', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertCircle size={16} /> {configError}
                </div>
              )}

              <div className="modal-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleResetContractAddress}
                  title="Reset to contract address generated during latest deployment"
                >
                  Reset to Deployed
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfigModal(false)}
                >
                  Close
                </button>
                <button type="submit" className="btn btn-primary">
                  Save & Apply
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <Web3Provider>
      <AppContent />
    </Web3Provider>
  );
};

export default App;
