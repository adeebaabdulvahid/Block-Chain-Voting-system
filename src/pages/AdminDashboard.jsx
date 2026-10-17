import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import AlertNotification from '../components/AlertNotification';
import { Shield, UserPlus, UserCheck, Users, Vote, CheckCircle2, AlertTriangle, RefreshCw, Hash, Award } from 'lucide-react';

const AdminDashboard = () => {
  const {
    web3,
    contract,
    account,
    isAdmin,
    adminAddress,
    isContractDeployed,
    contractError,
    isWrongNetwork,
    switchNetwork,
    claimAdminRole,
    isClaimingAdmin,
    connectWallet,
    isConnecting,
  } = useWeb3();

  // State
  const [candidates, setCandidates] = useState([]);
  const [registeredVoters, setRegisteredVoters] = useState([]);
  const [voterStatuses, setVoterStatuses] = useState({});
  const [totalVotes, setTotalVotes] = useState(0);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Forms
  const [voterAddressInput, setVoterAddressInput] = useState('');
  const [candidateNameInput, setCandidateNameInput] = useState('');
  const [candidatePartyInput, setCandidatePartyInput] = useState('');

  // Transaction states separated per action
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAddingCandidate, setIsAddingCandidate] = useState(false);
  const [txSuccess, setTxSuccess] = useState(null);
  const [txError, setTxError] = useState(null);

  const isLoadingRef = React.useRef(false);

  // Fetch all dashboard data from smart contract efficiently in parallel
  const loadDashboardData = useCallback(async () => {
    if (!contract || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingData(true);

    try {
      // Parallel fetch for top-level stats
      const [total, candidateList, votersList] = await Promise.all([
        contract.methods.totalVotes().call(),
        contract.methods.getAllCandidates().call(),
        contract.methods.getRegisteredVoters().call(),
      ]);

      setTotalVotes(Number(total));

      const parsedCandidates = candidateList.map((c) => ({
        id: Number(c.id),
        name: c.name,
        party: c.party,
        voteCount: Number(c.voteCount),
      }));
      setCandidates(parsedCandidates);
      setRegisteredVoters(votersList);

      // Concurrent fetch for voter statuses
      if (votersList && votersList.length > 0) {
        const statusEntries = await Promise.all(
          votersList.map(async (addr) => {
            try {
              const st = await contract.methods.getVoterStatus(addr).call();
              return [
                addr.toLowerCase(),
                {
                  hasVoted: Boolean(st.hasVoted),
                  votedCandidateId: Number(st.votedCandidateId),
                },
              ];
            } catch (e) {
              return [addr.toLowerCase(), { hasVoted: false, votedCandidateId: 0 }];
            }
          })
        );
        setVoterStatuses(Object.fromEntries(statusEntries));
      } else {
        setVoterStatuses({});
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoadingData(false);
      isLoadingRef.current = false;
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      loadDashboardData();
    }
  }, [contract, loadDashboardData]);

  // Format error messages nicely
  const parseErrorMessage = (err) => {
    const msg = err?.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('eth_getBlockByNumber')) {
      return 'RPC connection error: Please make sure your local Hardhat node is running on http://127.0.0.1:8545.';
    }
    if (msg.includes('User denied') || msg.includes('user rejected')) {
      return 'MetaMask signature request was cancelled by user.';
    }
    if (msg.includes('Voter is already registered')) {
      return 'This wallet address is already registered in the smart contract.';
    }
    if (msg.includes('Invalid voter address')) {
      return 'Invalid voter address: The zero address (0x00...00) cannot be registered.';
    }
    if (msg.includes('Only administrator')) {
      return 'Unauthorized: Only the on-chain contract administrator can perform this action.';
    }
    if (msg.includes('nonce') || msg.includes('Nonce')) {
      return 'MetaMask transaction nonce mismatch. Go to MetaMask > Settings > Advanced > Clear activity tab data (Reset Account) to synchronize nonces with the local chain.';
    }
    if (msg.includes('lock') || msg.includes('Lock')) {
      return 'MetaMask is locked. Please unlock MetaMask with your password to continue.';
    }
    return msg;
  };

  // Status indicators for prompt vs mining
  const [registerStatus, setRegisterStatus] = useState('');
  const [candidateStatus, setCandidateStatus] = useState('');

  // Handle Register Voter
  const handleRegisterVoter = async (e) => {
    e.preventDefault();
    setTxError(null);
    setTxSuccess(null);

    const addr = voterAddressInput.trim();
    if (!web3 || !web3.utils.isAddress(addr)) {
      setTxError('Please enter a valid 42-character Ethereum address (0x...).');
      return;
    }

    if (addr.toLowerCase() === '0x0000000000000000000000000000000000000000') {
      setTxError('Invalid voter address: Cannot register the zero address.');
      return;
    }

    if (registeredVoters.some((v) => v.toLowerCase() === addr.toLowerCase())) {
      setTxError(`Address ${addr} is already registered in the on-chain voter registry.`);
      return;
    }

    if (!isAdmin) {
      setTxError(
        `Unauthorized: Only the smart contract administrator (${adminAddress || 'Unknown'}) can register voters.`
      );
      return;
    }

    if (isWrongNetwork) {
      const switched = await switchNetwork();
      if (!switched) {
        setTxError('Please switch MetaMask network to Hardhat Localhost (Chain ID: 31337).');
        return;
      }
    }

    setIsRegistering(true);
    setRegisterStatus('prompting');

    try {
      // Estimate gas safely; let MetaMask handle nonce and gas limits
      let gas = 120000;
      try {
        const est = await contract.methods.registerVoter(addr).estimateGas({ from: account });
        gas = Math.round(Number(est) * 1.3);
      } catch (_) {
        console.warn('Gas estimation fallback used for registerVoter');
      }

      const promi = contract.methods.registerVoter(addr).send({
        from: account,
        gas,
      });

      promi.on('transactionHash', () => {
        setRegisterStatus('mining');
      });

      const receipt = await new Promise((resolve, reject) => {
        promi.on('receipt', resolve);
        promi.on('error', reject);
      });

      setTxSuccess({
        title: 'Voter Registered Successfully!',
        message: `Wallet ${addr} is now officially registered in the smart contract and eligible to vote.`,
        txHash: receipt.transactionHash,
      });
      setVoterAddressInput('');
      await loadDashboardData();
    } catch (err) {
      console.error('Register voter error:', err);
      setTxError(parseErrorMessage(err));
    } finally {
      setIsRegistering(false);
      setRegisterStatus('');
    }
  };

  // Handle Add Candidate
  const handleAddCandidate = async (e) => {
    e.preventDefault();
    setTxError(null);
    setTxSuccess(null);

    const name = candidateNameInput.trim();
    const party = candidatePartyInput.trim();

    if (!name || !party) {
      setTxError('Candidate name and political party affiliation cannot be empty.');
      return;
    }

    if (!isAdmin) {
      setTxError(
        `Unauthorized: Only the smart contract administrator (${adminAddress || 'Unknown'}) can add candidates.`
      );
      return;
    }

    if (isWrongNetwork) {
      const switched = await switchNetwork();
      if (!switched) {
        setTxError('Please switch MetaMask network to Hardhat Localhost (Chain ID: 31337).');
        return;
      }
    }

    setIsAddingCandidate(true);
    setCandidateStatus('prompting');

    try {
      // Estimate gas safely; let MetaMask handle nonce and gas limits
      let gas = 220000;
      try {
        const est = await contract.methods.addCandidate(name, party).estimateGas({ from: account });
        gas = Math.round(Number(est) * 1.3);
      } catch (_) {
        console.warn('Gas estimation fallback used for addCandidate');
      }

      const promi = contract.methods.addCandidate(name, party).send({
        from: account,
        gas,
      });

      promi.on('transactionHash', () => {
        setCandidateStatus('mining');
      });

      const receipt = await new Promise((resolve, reject) => {
        promi.on('receipt', resolve);
        promi.on('error', reject);
      });

      setTxSuccess({
        title: 'Candidate Added Successfully!',
        message: `Candidate "${name}" (${party}) has been declared and stored immutably on-chain.`,
        txHash: receipt.transactionHash,
      });
      setCandidateNameInput('');
      setCandidatePartyInput('');
      await loadDashboardData();
    } catch (err) {
      console.error('Add candidate error:', err);
      setTxError(parseErrorMessage(err));
    } finally {
      setIsAddingCandidate(false);
      setCandidateStatus('');
    }
  };

  if (!account) {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <Shield size={48} color="var(--primary-600)" style={{ margin: '0 auto 1rem auto' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Admin Authentication Required
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Please connect your MetaMask wallet. Only the address that deployed the smart contract has administrative rights to register voters and declare candidates.
        </p>
        <button className="btn btn-primary" onClick={connectWallet} disabled={isConnecting}>
          {isConnecting ? 'Connecting MetaMask...' : 'Connect Admin Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Election Administration Dashboard</h1>
          <p className="page-subtitle">
            Manage official candidates, register verified voter addresses, and audit on-chain election records.
          </p>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={loadDashboardData}
          disabled={isLoadingData}
        >
          <RefreshCw size={14} className={isLoadingData ? 'spinner' : ''} />
          {isLoadingData ? 'Refreshing...' : 'Refresh On-Chain Data'}
        </button>
      </div>

      {/* Admin Verification Alert */}
      {!isAdmin ? (
        <div
          className="card"
          style={{
            borderLeft: '4px solid var(--danger-solid)',
            marginBottom: '1.5rem',
            background: 'var(--danger-bg)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 700,
                  color: 'var(--danger-text)',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <AlertTriangle size={18} color="var(--danger-solid)" />
                Connected Account Is Not the Contract Administrator
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                Connected Account: <code style={{ fontFamily: 'var(--font-mono)' }}>{account}</code>
                <br />
                Deployed Contract Administrator: <code style={{ fontFamily: 'var(--font-mono)' }}>{adminAddress || 'Unknown'}</code>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                const ok = await claimAdminRole();
                if (ok) {
                  await loadDashboardData();
                }
              }}
              disabled={isClaimingAdmin}
            >
              <Shield size={16} />
              {isClaimingAdmin ? 'Authorizing...' : 'Authorize Connected Account as Admin'}
            </button>
          </div>
        </div>
      ) : (
        <AlertNotification
          type="success"
          title="Administrator Wallet Verified"
          message={`Authenticated as on-chain contract administrator: ${account}`}
        />
      )}

      {/* Action Notification */}
      {txSuccess && (
        <AlertNotification
          type="success"
          title={txSuccess.title}
          message={txSuccess.message}
          txHash={txSuccess.txHash}
          onClose={() => setTxSuccess(null)}
        />
      )}

      {txError && (
        <AlertNotification
          type="error"
          title="Transaction Failed"
          message={txError}
          onClose={() => setTxError(null)}
        />
      )}

      {/* Summary Stat Cards */}
      <div className="grid-4" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Candidates</div>
            <div className="stat-value">{candidates.length}</div>
          </div>
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Registered Voters</div>
            <div className="stat-value">{registeredVoters.length}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: 'var(--success-solid)', background: '#ecfdf5' }}>
            <UserCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Votes Cast</div>
            <div className="stat-value">{totalVotes}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: 'var(--primary-700)', background: 'var(--primary-50)' }}>
            <Vote size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Voter Turnout</div>
            <div className="stat-value">
              {registeredVoters.length > 0
                ? `${Math.round((totalVotes / registeredVoters.length) * 100)}%`
                : '0%'}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#d97706', background: '#fef3c7' }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Management Forms: Register Voter & Add Candidate */}
      <div className="grid-2" style={{ marginBottom: '2.5rem' }}>
        {/* Register Voter Form */}
        <div className="card">
          <h2 className="card-title">
            <UserPlus size={20} color="var(--primary-600)" />
            Register Eligible Voter
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Authorizes an Ethereum wallet to vote. Smart contract will verify registration before accepting a ballot.
          </p>

          <form onSubmit={handleRegisterVoter}>
            <div className="form-group">
              <label className="form-label" htmlFor="voter-address">
                Voter Ethereum Wallet Address
              </label>
              <input
                id="voter-address"
                type="text"
                className="form-input form-input-mono"
                placeholder="0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
                value={voterAddressInput}
                onChange={(e) => setVoterAddressInput(e.target.value)}
                disabled={isRegistering || !isAdmin}
                required
              />
              <span className="form-help">
                Must be a valid 42-character hexadecimal Ethereum address.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isRegistering || !isAdmin || !voterAddressInput.trim()}
            >
              {isRegistering ? (
                <>
                  <span className="spinner"></span> {registerStatus === 'mining' ? 'Mining on Blockchain...' : 'Check MetaMask & Click Confirm...'}
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Register Voter on Blockchain
                </>
              )}
            </button>
          </form>
        </div>

        {/* Add Candidate Form */}
        <div className="card">
          <h2 className="card-title">
            <Users size={20} color="var(--primary-600)" />
            Add Official Candidate
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
            Declares an election candidate with a unique ID stored immutably on the Ethereum blockchain.
          </p>

          <form onSubmit={handleAddCandidate}>
            <div className="form-group">
              <label className="form-label" htmlFor="candidate-name">
                Candidate Full Name
              </label>
              <input
                id="candidate-name"
                type="text"
                className="form-input"
                placeholder="e.g. Eleanor Vance"
                value={candidateNameInput}
                onChange={(e) => setCandidateNameInput(e.target.value)}
                disabled={isAddingCandidate || !isAdmin}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="candidate-party">
                Party / Affiliation Name
              </label>
              <input
                id="candidate-party"
                type="text"
                className="form-input"
                placeholder="e.g. Democratic Alliance"
                value={candidatePartyInput}
                onChange={(e) => setCandidatePartyInput(e.target.value)}
                disabled={isAddingCandidate || !isAdmin}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isAddingCandidate || !isAdmin || !candidateNameInput.trim() || !candidatePartyInput.trim()}
            >
              {isAddingCandidate ? (
                <>
                  <span className="spinner"></span> {candidateStatus === 'mining' ? 'Mining on Blockchain...' : 'Check MetaMask & Click Confirm...'}
                </>
              ) : (
                <>
                  <Users size={16} /> Add Candidate to Ballot
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Official Candidates List */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h2 className="card-title">
          <Users size={20} color="var(--primary-600)" />
          Declared Candidates ({candidates.length})
        </h2>

        {candidates.length === 0 ? (
          <div className="empty-state">
            <Users size={36} className="empty-state-icon" />
            <div className="empty-state-title">No Candidates Added Yet</div>
            <p style={{ fontSize: '0.875rem' }}>
              Use the Add Candidate form above to register candidates for this election.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>ID</th>
                  <th>Candidate Name</th>
                  <th>Party / Affiliation</th>
                  <th style={{ textAlign: 'right' }}>Current Vote Count</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className="badge badge-info">#{c.id}</span>
                    </td>
                    <td><strong>{c.name}</strong></td>
                    <td>{c.party}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-800)' }}>
                      {c.voteCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registered Voters List */}
      <div className="card">
        <h2 className="card-title">
          <UserCheck size={20} color="var(--primary-600)" />
          Registered Voters ({registeredVoters.length})
        </h2>

        {registeredVoters.length === 0 ? (
          <div className="empty-state">
            <UserCheck size={36} className="empty-state-icon" />
            <div className="empty-state-title">No Voters Registered Yet</div>
            <p style={{ fontSize: '0.875rem' }}>
              Add eligible voter Ethereum wallet addresses using the form above.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>Voter Wallet Address</th>
                  <th>Registration Status</th>
                  <th>Voting Status</th>
                </tr>
              </thead>
              <tbody>
                {registeredVoters.map((addr, idx) => {
                  const status = voterStatuses[addr.toLowerCase()] || {};
                  return (
                    <tr key={addr}>
                      <td>{idx + 1}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.825rem' }}>
                        {addr}
                        {addr.toLowerCase() === account.toLowerCase() && (
                          <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>
                            You
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} /> Registered
                        </span>
                      </td>
                      <td>
                        {status.hasVoted ? (
                          <span className="badge badge-success">
                            Voted (Candidate #{status.votedCandidateId})
                          </span>
                        ) : (
                          <span className="badge badge-warning">
                            Pending / Not Voted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
