import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ShieldCheck, UserX, UserCheck, Vote, CheckCircle2, ArrowRight, Wallet, AlertCircle, BarChart3 } from 'lucide-react';

const VoterAuthPage = ({ setActivePage }) => {
  const { account, connectWallet, isConnecting, voterStatus, refreshVoterStatus } = useWeb3();

  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto' }}>
      <div className="page-header" style={{ textAlign: 'center' }}>
        <h1 className="page-title">Voter Eligibility Authentication</h1>
        <p className="page-subtitle">
          Cryptographic wallet verification against the decentralized voter registry in the smart contract.
        </p>
      </div>

      {!account ? (
        /* Not Connected State */
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'var(--primary-50)',
              color: 'var(--primary-600)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
            }}
          >
            <Wallet size={28} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Connect Your Ethereum Wallet
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem', maxWidth: '480px', margin: '0 auto 2rem auto' }}>
            MetaMask serves as your cryptographic identity. Once connected, your wallet address will be verified
            directly against the on-chain voter registration roll.
          </p>

          <button className="btn btn-primary btn-lg" onClick={connectWallet} disabled={isConnecting}>
            <Wallet size={18} />
            {isConnecting ? 'Requesting MetaMask Access...' : 'Connect MetaMask Wallet'}
          </button>
        </div>
      ) : (
        /* Connected State: Status Checks */
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Connected Wallet Address
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                {account}
              </div>
            </div>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => refreshVoterStatus()}
              disabled={voterStatus.loading}
            >
              {voterStatus.loading ? 'Verifying...' : 'Re-verify Status'}
            </button>
          </div>

          {/* Condition 1: Unregistered Wallet */}
          {!voterStatus.isRegistered && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger-solid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <UserX size={28} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.5rem' }}>
                Wallet Not Registered
              </h3>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                This Ethereum address has not been registered in the smart contract by the Election Administrator.
                Under the IEEE security protocol, unregistered addresses are strictly blocked from voting.
              </p>

              <div className="alert alert-warning" style={{ textAlign: 'left', margin: '1.5rem 0' }}>
                <AlertCircle size={20} />
                <div className="alert-content">
                  <div className="alert-title">How to Resolve:</div>
                  Provide this wallet address (<code style={{ wordBreak: 'break-all' }}>{account}</code>) to your election
                  administrator to be added to the official voter registry.
                </div>
              </div>

              <button
                className="btn btn-secondary"
                onClick={() => setActivePage('home')}
              >
                Back to Home
              </button>
            </div>
          )}

          {/* Condition 2: Registered and Has Already Voted (Mitigate Double Voting) */}
          {voterStatus.isRegistered && voterStatus.hasVoted && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--primary-100)',
                  color: 'var(--primary-700)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <CheckCircle2 size={30} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary-800)', marginBottom: '0.5rem' }}>
                Ballot Already Cast (Double-Voting Prevented)
              </h3>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                Our on-chain record confirms that this wallet has already participated in this election and cast its vote for Candidate #{voterStatus.votedCandidateId}.
                In adherence to the IEEE research protocol, the smart contract will reject any second voting attempt.
              </p>

              <div className="alert alert-info" style={{ textAlign: 'left', margin: '1.5rem 0' }}>
                <ShieldCheck size={20} />
                <div className="alert-content">
                  <div className="alert-title">Double-Voting Protection Active</div>
                  Your vote is cryptographically secured and immutable. You can view the live tally and standings on the Results page.
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => setActivePage('results')}
              >
                <BarChart3 size={16} /> View Election Results
              </button>
            </div>
          )}

          {/* Condition 3: Registered and Eligible to Vote */}
          {voterStatus.isRegistered && !voterStatus.hasVoted && (
            <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: '50%',
                  background: 'var(--success-bg)',
                  color: 'var(--success-solid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1.25rem auto',
                }}
              >
                <UserCheck size={28} />
              </div>

              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--success-text)', marginBottom: '0.5rem' }}>
                Eligibility Confirmed!
              </h3>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                Your wallet is verified in the smart contract voter list and has not voted yet. You are eligible to proceed to the voting booth to cast your single vote.
              </p>

              <button
                className="btn btn-success btn-lg"
                onClick={() => setActivePage('voting')}
              >
                <Vote size={18} /> Proceed to Voting Booth <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VoterAuthPage;
