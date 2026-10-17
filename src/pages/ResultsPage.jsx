import React, { useState, useEffect, useCallback } from 'react';
import { useWeb3 } from '../context/Web3Context';
import { BarChart3, Award, Users, RefreshCw, Vote, Trophy, CheckCircle2, AlertCircle } from 'lucide-react';

const ResultsPage = () => {
  const { contract } = useWeb3();

  const [candidates, setCandidates] = useState([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [totalVoters, setTotalVoters] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  const isLoadingRef = React.useRef(false);

  // Fetch results directly from smart contract
  const loadResults = useCallback(async () => {
    if (!contract || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const [votesTotal, votersTotal, candidateList] = await Promise.all([
        contract.methods.totalVotes().call(),
        contract.methods.getVoterCount().call(),
        contract.methods.getAllCandidates().call(),
      ]);

      setTotalVotes(Number(votesTotal));
      setTotalVoters(Number(votersTotal));

      const parsed = candidateList.map((c) => ({
        id: Number(c.id),
        name: c.name,
        party: c.party,
        voteCount: Number(c.voteCount),
      }));

      // Sort descending by voteCount
      parsed.sort((a, b) => b.voteCount - a.voteCount);
      setCandidates(parsed);
      setLastRefreshed(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  }, [contract]);

  useEffect(() => {
    if (contract) {
      loadResults();
    }
  }, [contract, loadResults]);

  // Determine leader(s)
  const highestVotes = candidates.length > 0 ? candidates[0].voteCount : 0;
  const leaders = candidates.filter((c) => c.voteCount === highestVotes && highestVotes > 0);

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Live Election Results & Tally</h1>
          <p className="page-subtitle">
            Auditable on-chain results retrieved in real time directly from the Ethereum smart contract.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastRefreshed && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Updated at {lastRefreshed}
            </span>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={loadResults}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            {isLoading ? 'Fetching...' : 'Refresh Tally'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid-3" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Total Ballots Cast</div>
            <div className="stat-value">{totalVotes}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: 'var(--primary-700)', background: 'var(--primary-50)' }}>
            <Vote size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Eligible Registered Voters</div>
            <div className="stat-value">{totalVoters}</div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: 'var(--success-solid)', background: '#ecfdf5' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-label">Overall Turnout Rate</div>
            <div className="stat-value">
              {totalVoters > 0 ? `${Math.round((totalVotes / totalVoters) * 100)}%` : '0%'}
            </div>
          </div>
          <div className="stat-icon-wrapper" style={{ color: '#d97706', background: '#fef3c7' }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Leading Candidate Highlight Banner */}
      {leaders.length > 0 && totalVotes > 0 && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            borderColor: 'var(--primary-200)',
            marginBottom: '2rem',
            padding: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: 'var(--primary-600)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary-800)', textTransform: 'uppercase' }}>
                Leading Candidate
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {leaders.map((l) => `${l.name} (${l.party})`).join(' & ')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--primary-700)', fontWeight: 600, marginTop: '0.2rem' }}>
                {highestVotes} {highestVotes === 1 ? 'vote' : 'votes'} (
                {Math.round((highestVotes / totalVotes) * 100)}% of total votes)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <h2 className="card-title">
          <BarChart3 size={20} color="var(--primary-600)" />
          Vote Distribution Chart
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Graphical breakdown of verified on-chain votes per candidate.
        </p>

        {candidates.length === 0 ? (
          <div className="empty-state">
            <Users size={36} className="empty-state-icon" />
            <div className="empty-state-title">No Election Data Available</div>
            <p style={{ fontSize: '0.875rem' }}>Candidates have not been registered yet.</p>
          </div>
        ) : (
          <div className="chart-container">
            {candidates.map((c) => {
              const percentage = totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0;
              return (
                <div key={c.id} className="chart-row">
                  <div className="chart-header">
                    <div>
                      <strong>{c.name}</strong>{' '}
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        ({c.party})
                      </span>
                    </div>
                    <div style={{ color: 'var(--primary-800)' }}>
                      <strong>{c.voteCount}</strong> votes ({percentage}%)
                    </div>
                  </div>

                  <div className="chart-bar-bg">
                    <div
                      className="chart-bar-fill"
                      style={{
                        width: totalVotes > 0 ? `${Math.max(percentage, 5)}%` : '0%',
                        background:
                          c.voteCount === highestVotes && highestVotes > 0
                            ? 'linear-gradient(90deg, #2563eb, #1d4ed8)'
                            : 'linear-gradient(90deg, #64748b, #475569)',
                      }}
                    >
                      {percentage > 10 ? `${percentage}%` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Standings Table */}
      <div className="card">
        <h2 className="card-title">
          <Award size={20} color="var(--primary-600)" />
          Certified Candidate Standings
        </h2>

        {candidates.length === 0 ? (
          <div className="empty-state">
            <p>No candidates available.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Rank</th>
                  <th style={{ width: '90px' }}>ID</th>
                  <th>Candidate Name</th>
                  <th>Political Affiliation</th>
                  <th style={{ textAlign: 'center' }}>Share (%)</th>
                  <th style={{ textAlign: 'right' }}>Vote Count</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, index) => {
                  const percentage = totalVotes > 0 ? ((c.voteCount / totalVotes) * 100).toFixed(1) : '0.0';
                  const isLeader = c.voteCount === highestVotes && highestVotes > 0;
                  return (
                    <tr key={c.id} style={{ background: isLeader ? 'var(--primary-50)' : 'transparent' }}>
                      <td>
                        {index === 0 && highestVotes > 0 ? (
                          <span className="badge badge-success">
                            <Trophy size={12} /> 1st
                          </span>
                        ) : (
                          <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                            #{index + 1}
                          </span>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-info">#{c.id}</span>
                      </td>
                      <td>
                        <strong>{c.name}</strong>
                      </td>
                      <td>{c.party}</td>
                      <td style={{ textAlign: 'center', fontWeight: 600 }}>
                        {percentage}%
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary-800)', fontSize: '1rem' }}>
                        {c.voteCount}
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

export default ResultsPage;
