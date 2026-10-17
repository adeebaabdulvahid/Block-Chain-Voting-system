import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import AlertNotification from '../components/AlertNotification';
import { Vote, CheckCircle2, AlertCircle, ShieldAlert, Users, ArrowRight, ShieldCheck, BarChart3, AlertTriangle } from 'lucide-react';

const VotingPage = ({ setActivePage }) => {
  const { contract, account, voterStatus, refreshVoterStatus, connectWallet, isConnecting, isWrongNetwork, switchNetwork } = useWeb3();

  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);

  // Voting transaction status
  const [txPending, setTxPending] = useState(false);
  const [txSuccessHash, setTxSuccessHash] = useState('');
  const [txErrorMessage, setTxErrorMessage] = useState('');

  // Fetch candidates from smart contract
  const loadCandidates = useCallback(async () => {
    if (!contract) return;
    setIsLoadingCandidates(true);
    try {
      const candidateList = await contract.methods.getAllCandidates().call();
      const parsed = candidateList.map((c) => ({
        id: Number(c.id),
        name: c.name,
        party: c.party,
        voteCount: Number(c.voteCount),
      }));
      setCandidates(parsed);
    } catch (err) {
      console.error('Failed to load candidates:', err);
    } finally {
      setIsLoadingCandidates(false);
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      loadCandidates();
    }
  }, [contract, loadCandidates]);

  // Execute vote submission
  const handleConfirmVote = async () => {
    if (!selectedCandidate || !contract || !account) return;

    if (isWrongNetwork) {
      const switched = await switchNetwork();
      if (!switched) {
        setTxErrorMessage('Please switch MetaMask network to Hardhat Localhost (Chain ID: 31337) to submit your ballot.');
        return;
      }
    }

    setShowConfirmModal(false);
    setTxPending(true);
    setTxErrorMessage('');
    setTxSuccessHash('');

    try {
      // Try to estimate gas; fall back to safe limit if simulation fails
      let gas = 150000; // safe fallback for castVote
      try {
        const est = await contract.methods.castVote(selectedCandidate.id).estimateGas({ from: account });
        gas = Math.round(Number(est) * 1.3);
      } catch (_) {
        console.warn('Gas estimation failed, using fallback gas limit.');
      }

      // Send transaction to smart contract castVote method
      const promi = contract.methods.castVote(selectedCandidate.id).send({
        from: account,
        gas,
      });

      const receipt = await new Promise((resolve, reject) => {
        promi.on('receipt', resolve);
        promi.on('error', reject);
      });

      setTxSuccessHash(receipt.transactionHash);
      // Immediately refresh voter status on-chain
      await refreshVoterStatus();
      await loadCandidates();
    } catch (err) {
      console.error('Voting transaction failed:', err);
      let errorText = err.message || 'Transaction reverted';
      if (errorText.includes('Voter has already cast a vote')) {
        errorText = 'Double Voting Rejected: The smart contract detected that this wallet has already cast a vote!';
      } else if (errorText.includes('Voter is not registered')) {
        errorText = 'Access Denied: This wallet is not registered in the smart contract.';
      } else if (errorText.includes('User denied') || errorText.includes('user rejected')) {
        errorText = 'MetaMask Signature Rejected: You declined the transaction in MetaMask.';
      } else if (errorText.includes('nonce') || errorText.includes('Nonce')) {
        errorText = 'MetaMask transaction nonce mismatch. Go to MetaMask > Settings > Advanced > Clear activity tab data (Reset Account) to synchronize nonces with the local chain.';
      } else if (errorText.includes('lock') || errorText.includes('Lock')) {
        errorText = 'MetaMask is locked. Please unlock MetaMask with your password and try again.';
      }
      setTxErrorMessage(errorText);
    } finally {
      setTxPending(false);
    }
  };

  // State 1: Wallet Not Connected
  if (!account) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <Vote size={48} color="var(--primary-600)" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Connect Wallet to Enter Voting Booth
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          MetaMask connection is required to authenticate your voting rights and submit a cryptographically signed ballot.
        </p>
        <button className="btn btn-primary" onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? 'Connecting MetaMask...' : 'Connect MetaMask Wallet'}
        </button>
      </div>
    );
  }

  // State 2: Unregistered Wallet
  if (!voterStatus.isRegistered) {
    return (
      <div className="card" style={{ maxWidth: '640px', margin: '3rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <ShieldAlert size={48} color="var(--danger-solid)" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger-text)', marginBottom: '0.5rem' }}>
          Voting Booth Access Denied
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Your wallet (<code style={{ fontFamily: 'var(--font-mono)' }}>{account}</code>) is not on the registered voter roll.
          The smart contract strictly prevents unauthorized voting.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={() => setActivePage('voter-auth')}>
            Check Registration Status
          </button>
          <button className="btn btn-outline-primary" onClick={() => setActivePage('results')}>
            View Public Results
          </button>
        </div>
      </div>
    );
  }

  // State 3: Already Voted (Mitigate Double Voting)
  if (voterStatus.hasVoted && !txPending) {
    return (
      <div className="card" style={{ maxWidth: '680px', margin: '2rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'var(--primary-50)',
            color: 'var(--primary-700)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.5rem auto',
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-800)', marginBottom: '0.5rem' }}>
          Your Ballot is Recorded & Locked
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          Thank you for participating! Your wallet (<code style={{ fontFamily: 'var(--font-mono)' }}>{account.substring(0, 8)}...</code>) has successfully cast its vote for Candidate #{voterStatus.votedCandidateId}.
        </p>

        {txSuccessHash && (
          <div className="alert alert-success" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={20} />
            <div className="alert-content">
              <div className="alert-title">Transaction Confirmed on Blockchain!</div>
              <div>Your ballot transaction was mined successfully and the candidate tally has updated.</div>
              <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', wordBreak: 'break-all' }}>
                Hash: {txSuccessHash}
              </div>
            </div>
          </div>
        )}

        <div className="alert alert-info" style={{ textAlign: 'left', marginBottom: '2rem' }}>
          <ShieldCheck size={20} />
          <div className="alert-content">
            <div className="alert-title">IEEE Double-Voting Mitigation Active:</div>
            The smart contract has permanently marked this wallet's status as <code style={{ color: 'var(--primary-700)' }}>hasVoted = true</code>.
            Even if a user triggers another contract call, the Ethereum EVM will immediately revert the transaction with an error.
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => setActivePage('results')}>
          <BarChart3 size={18} /> View Live Election Results <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Official Electronic Voting Booth</h1>
        <p className="page-subtitle">
          Select one candidate to cast your official ballot. Your vote will be cryptographically signed and permanently recorded on the blockchain.
        </p>
      </div>

      {/* Pending Banner */}
      {txPending && (
        <div className="alert alert-warning" style={{ alignItems: 'center' }}>
          <span className="spinner spinner-blue" style={{ width: 22, height: 22 }}></span>
          <div className="alert-content">
            <div className="alert-title">Voting Transaction Pending</div>
            <div>
              Waiting for MetaMask confirmation and Ethereum block validation. Please do not close this window...
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {txErrorMessage && (
        <AlertNotification
          type="error"
          title="Voting Failed"
          message={txErrorMessage}
          onClose={() => setTxErrorMessage('')}
        />
      )}

      {/* Eligible Voter Status Bar */}
      <div
        className="card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.5rem',
          marginBottom: '2rem',
          background: 'var(--primary-50)',
          borderColor: 'var(--primary-200)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <CheckCircle2 size={22} color="var(--success-solid)" />
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-800)' }}>
              Authenticated Registered Voter
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Wallet: {account}
            </div>
          </div>
        </div>
        <span className="badge badge-success">Single Vote Allocation Available</span>
      </div>

      {/* Candidates List */}
      {candidates.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Users size={40} className="empty-state-icon" />
            <div className="empty-state-title">No Candidates Declared</div>
            <p style={{ fontSize: '0.875rem' }}>
              The Election Administrator has not yet added candidates to the ballot. Please check back shortly.
            </p>
          </div>
        </div>
      ) : (
        <div className="candidate-grid" style={{ marginBottom: '3rem' }}>
          {candidates.map((c) => {
            const isSelected = selectedCandidate?.id === c.id;
            return (
              <div
                key={c.id}
                className={`candidate-card ${isSelected ? 'selected' : ''}`}
              >
                <div className="candidate-badge-num">#{c.id}</div>
                <div>
                  <div className="candidate-party">{c.party}</div>
                  <h3 className="candidate-name">{c.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                    Candidate ID: {c.id}
                  </div>
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => {
                      setSelectedCandidate(c);
                      setShowConfirmModal(true);
                    }}
                    disabled={txPending}
                  >
                    <Vote size={16} />
                    {isSelected ? 'Candidate Selected' : 'Vote for Candidate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCandidate && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Vote size={20} />
              </div>
              <h2 className="modal-title">Confirm Ballot Submission</h2>
            </div>

            <div style={{ margin: '1.25rem 0' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                You are about to cast your official vote for:
              </p>

              <div
                style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: 'var(--primary-700)', fontWeight: 600 }}>
                  {selectedCandidate.party}
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedCandidate.name} (Candidate #{selectedCandidate.id})
                </div>
              </div>

              <div className="alert alert-warning" style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', margin: 0 }}>
                <AlertTriangle size={18} />
                <div className="alert-content">
                  <strong>Permanent Action:</strong> Once confirmed, this ballot will be immutably recorded on the Ethereum blockchain.
                  You will NOT be able to change your vote or cast a second ballot.
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={txPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmVote}
                disabled={txPending}
              >
                Confirm & Submit via MetaMask
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotingPage;
