import React from 'react';
import { useWeb3 } from '../context/Web3Context';
import { ShieldCheck, Cpu } from 'lucide-react';

const Footer = () => {
  const { contractAddress, networkName } = useWeb3();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <p>
            <strong>IEEE Research Prototype:</strong> “A Secure Approach to Mitigate Double Voting in Electronic Voting Systems using Blockchain”
          </p>
          <p style={{ marginTop: '0.25rem' }}>
            Academic research implementation &bull; Solidity EVM consensus-level double-voting prevention
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem' }}>
            <Cpu size={14} /> Network: <strong>{networkName}</strong>
          </p>
          {contractAddress && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Contract: {contractAddress.substring(0, 10)}...{contractAddress.substring(contractAddress.length - 8)}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
