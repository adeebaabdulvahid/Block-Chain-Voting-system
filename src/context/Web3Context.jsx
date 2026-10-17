import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Web3 from 'web3';
import defaultContractData from '../contracts/VotingContract.json';
import { isTargetNetwork, TARGET_CHAIN_ID_DEC, TARGET_CHAIN_ID_HEX } from '../utils/web3Utils';
import { Web3Context, useWeb3 } from './Web3ContextCore';

export { Web3Context, useWeb3 };

const LOCAL_RPC_URL = 'http://127.0.0.1:8545';

// Dedicated Web3 instance for reading on-chain data directly from local node
const localReadWeb3 = new Web3(LOCAL_RPC_URL);

const createWeb3Instance = (provider) => {
  if (!provider) return null;
  const instance = new Web3(provider);
  instance.eth.transactionConfirmationBlocks = 1;
  instance.eth.transactionPollingInterval = 300;
  instance.eth.transactionBlockTimeout = 15;
  return instance;
};

export const Web3Provider = ({ children }) => {
  // Web3 instance wrapping MetaMask provider (window.ethereum) for signing
  const [web3, setWeb3] = useState(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return createWeb3Instance(window.ethereum);
    }
    return null;
  });

  // Default to deployed artifact address, synchronizing whenever a new deployment happens
  const [contractAddress, setContractAddress] = useState(() => {
    if (typeof window !== 'undefined') {
      const deployed = defaultContractData.address || '';
      const lastKnown = localStorage.getItem('LAST_KNOWN_DEPLOYED_CONTRACT');
      if (deployed && deployed !== lastKnown) {
        localStorage.setItem('LAST_KNOWN_DEPLOYED_CONTRACT', deployed);
        localStorage.removeItem('CUSTOM_VOTING_CONTRACT_ADDRESS');
        return deployed;
      }
      const custom = localStorage.getItem('CUSTOM_VOTING_CONTRACT_ADDRESS');
      if (custom && custom.trim().length === 42 && custom.startsWith('0x')) {
        return custom.trim();
      }
      return deployed;
    }
    return defaultContractData.address || '';
  });

  const [account, setAccount] = useState('');
  const [chainId, setChainId] = useState(null);
  const [networkName, setNetworkName] = useState('Not Connected');
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [adminAddress, setAdminAddress] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContractDeployed, setIsContractDeployed] = useState(true);
  const [contractError, setContractError] = useState('');

  const [voterStatus, setVoterStatus] = useState({
    isRegistered: false,
    hasVoted: false,
    votedCandidateId: 0,
    loading: false,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isClaimingAdmin, setIsClaimingAdmin] = useState(false);
  const [error, setError] = useState('');

  // Automatically fund connected account with test ETH on local Hardhat network if balance is low
  const ensureLocalBalance = useCallback(async (userAddress) => {
    if (!userAddress) return;
    try {
      await fetch(LOCAL_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'hardhat_setBalance',
          params: [userAddress, '0x21E19E0C9BAB2400000'], // 10,000 ETH
          id: Date.now(),
        }),
      });
    } catch (_) {}
  }, []);

  // One-click helper for local development to set any connected wallet as the smart contract administrator
  const claimAdminRole = async () => {
    if (!account) return false;
    setIsClaimingAdmin(true);
    try {
      // 1. Ensure connected account has 10,000 ETH on the node
      await ensureLocalBalance(account);

      // 2. Impersonate account on Hardhat
      await fetch(LOCAL_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'hardhat_impersonateAccount',
          params: [account],
          id: Date.now() + 1,
        }),
      });

      // 3. Deploy contract using eth_sendTransaction from impersonated account
      const deployTx = await fetch(LOCAL_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendTransaction',
          params: [
            {
              from: account,
              data: defaultContractData.bytecode,
              gas: '0x2dc6c0', // 3,000,000 gas
            },
          ],
          id: Date.now() + 2,
        }),
      });
      const deployRes = await deployTx.json();
      if (!deployRes.result) throw new Error(deployRes.error?.message || 'Deploy failed');

      // 4. Wait for receipt to retrieve deployed contract address
      let receipt = null;
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 200));
        const rcTx = await fetch(LOCAL_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionReceipt',
            params: [deployRes.result],
            id: Date.now() + 3 + i,
          }),
        });
        const rcRes = await rcTx.json();
        if (rcRes.result && rcRes.result.contractAddress) {
          receipt = rcRes.result;
          break;
        }
      }

      if (receipt && receipt.contractAddress) {
        const newAddr = receipt.contractAddress;
        setContractAddress(newAddr);
        localStorage.setItem('CUSTOM_VOTING_CONTRACT_ADDRESS', newAddr);
        setIsAdmin(true);
        setAdminAddress(account);
        setIsClaimingAdmin(false);
        return true;
      }
    } catch (err) {
      console.error('Failed to authorize admin role:', err);
    } finally {
      setIsClaimingAdmin(false);
    }
    return false;
  };

  // Identify network names
  const getNetworkFriendlyName = (id) => {
    if (!id) return 'Not Connected';
    const hexOrNum = String(id).toLowerCase();
    if (hexOrNum === TARGET_CHAIN_ID_DEC || hexOrNum === TARGET_CHAIN_ID_HEX) return 'Hardhat Localhost (31337)';
    if (hexOrNum === '1337' || hexOrNum === '0x539') return 'Ganache Localhost (1337)';
    if (hexOrNum === '1' || hexOrNum === '0x1') return 'Ethereum Mainnet';
    if (hexOrNum === '11155111' || hexOrNum === '0xaa36a7') return 'Sepolia Testnet';
    return `Chain ID: ${id}`;
  };

  // Dedicated read contract instance connecting directly to local node
  const readContract = useMemo(() => {
    if (!contractAddress || !defaultContractData.abi) return null;
    try {
      if (!localReadWeb3.utils.isAddress(contractAddress)) return null;
      return new localReadWeb3.eth.Contract(defaultContractData.abi, contractAddress);
    } catch (err) {
      console.error('Failed to create readContract:', err);
      return null;
    }
  }, [contractAddress]);

  // Write contract instance connected to MetaMask provider
  const writeContract = useMemo(() => {
    if (!web3 || !contractAddress || !defaultContractData.abi) return null;
    try {
      if (!web3.utils.isAddress(contractAddress)) return null;
      return new web3.eth.Contract(defaultContractData.abi, contractAddress);
    } catch (err) {
      console.error('Failed to create writeContract:', err);
      return null;
    }
  }, [web3, contractAddress]);

  // Unified contract interface: calls query local node reliably; sends execute through MetaMask
  const contract = useMemo(() => {
    if (!readContract) return null;
    const proxyMethods = {};
    for (const item of defaultContractData.abi) {
      if (item.type === 'function' && item.name) {
        proxyMethods[item.name] = (...args) => {
          const readMethod = readContract.methods[item.name](...args);
          return {
            call: (options) => readMethod.call(options),
            estimateGas: (options) => {
              const target = writeContract ? writeContract.methods[item.name](...args) : readMethod;
              return target.estimateGas(options);
            },
            send: (options) => {
              if (!writeContract) throw new Error('MetaMask is not connected. Please connect your wallet.');
              return writeContract.methods[item.name](...args).send(options);
            },
          };
        };
      }
    }
    return {
      options: readContract.options,
      methods: proxyMethods,
    };
  }, [readContract, writeContract]);

  // Verify bytecode exists at contractAddress on local node
  const verifyContractDeployment = useCallback(async (addr) => {
    if (!addr || !localReadWeb3.utils.isAddress(addr)) {
      return false;
    }
    try {
      const code = await localReadWeb3.eth.getCode(addr);
      const hasCode = code && code !== '0x' && code !== '0x0';
      return Boolean(hasCode);
    } catch (err) {
      console.warn('Failed to verify contract code:', err);
      return false;
    }
  }, []);

  // Update Contract Address manually if needed
  const updateContractAddress = (newAddress) => {
    if (localReadWeb3 && localReadWeb3.utils.isAddress(newAddress)) {
      setContractAddress(newAddress);
      localStorage.setItem('CUSTOM_VOTING_CONTRACT_ADDRESS', newAddress);
      setContractError('');
      return true;
    }
    return false;
  };

  const resetToDefaultContractAddress = () => {
    localStorage.removeItem('CUSTOM_VOTING_CONTRACT_ADDRESS');
    localStorage.removeItem('VOTING_CONTRACT_ADDRESS');
    setContractAddress(defaultContractData.address || '');
    setContractError('');
  };

  // Switch MetaMask to local Hardhat network (Chain ID: 31337)
  const switchNetwork = async () => {
    if (!window.ethereum) {
      setError('MetaMask extension is not installed.');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: TARGET_CHAIN_ID_HEX }],
      });
      setIsWrongNetwork(false);
      return true;
    } catch (switchError) {
      const errMsg = (switchError?.message || '').toLowerCase();
      const errCode = switchError?.code;

      if (errMsg.includes('lock')) {
        setError('MetaMask is locked. Please unlock MetaMask with your password and try again.');
        return false;
      }

      if (errCode === 4902 || errMsg.includes('unrecognized') || errMsg.includes('not found') || errCode === -32603) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: TARGET_CHAIN_ID_HEX,
                chainName: 'Hardhat Localhost',
                rpcUrls: ['http://127.0.0.1:8545'],
                nativeCurrency: {
                  name: 'Ether',
                  symbol: 'ETH',
                  decimals: 18,
                },
              },
            ],
          });
          setIsWrongNetwork(false);
          return true;
        } catch (addError) {
          const addErrMsg = (addError?.message || '').toLowerCase();
          if (addErrMsg.includes('lock')) {
            setError('MetaMask is locked. Please unlock MetaMask with your password and try again.');
          } else {
            console.error('Failed to add Hardhat network:', addError);
            setError('Could not add Hardhat network to MetaMask. Please add http://127.0.0.1:8545 manually in MetaMask.');
          }
          return false;
        }
      } else if (errCode === 4001 || errMsg.includes('user rejected') || errMsg.includes('denied')) {
        setError('Network switch request was rejected in MetaMask.');
        return false;
      } else if (errMsg.includes('already pending')) {
        setError('A network request is already pending in MetaMask. Please open your MetaMask popup.');
        return false;
      } else {
        console.error('Network switch error:', switchError);
        setError(switchError.message || 'Please open MetaMask and switch to Hardhat Localhost.');
        return false;
      }
    }
  };

  // Check Admin Address strictly by querying admin() on the smart contract directly via local node
  const checkAdminStatus = useCallback(
    async (contractInst = contract, userAcc = account) => {
      const c = contractInst || contract;
      const u = userAcc !== undefined ? userAcc : account;

      if (!c) {
        setIsAdmin(false);
        return;
      }

      try {
        const targetAddress = c.options.address;
        const deployed = await verifyContractDeployment(targetAddress);
        setIsContractDeployed(deployed);

        if (!deployed) {
          setContractError(
            `No contract bytecode found at ${targetAddress}. Verify the contract is deployed to http://127.0.0.1:8545.`
          );
          setIsAdmin(false);
          setAdminAddress('');
          return;
        }

        setContractError('');
        const onChainAdmin = await c.methods.admin().call();
        setAdminAddress(onChainAdmin);

        const authorized = Boolean(
          onChainAdmin && u && onChainAdmin.toLowerCase() === u.toLowerCase()
        );
        setIsAdmin(authorized);
      } catch (err) {
        console.warn('Could not query admin from contract:', err.message);
        setIsAdmin(false);
        setAdminAddress('');
        setContractError('Unable to connect to smart contract on http://127.0.0.1:8545.');
      }
    },
    [contract, account, verifyContractDeployment]
  );

  // Fetch Voter Status for connected account from smart contract
  const refreshVoterStatus = useCallback(
    async (contractInst = contract, userAcc = account) => {
      const c = contractInst || contract;
      const u = userAcc || account;
      if (!c || !u) {
        setVoterStatus({ isRegistered: false, hasVoted: false, votedCandidateId: 0, loading: false });
        return;
      }

      try {
        setVoterStatus((prev) => ({ ...prev, loading: true }));
        const status = await c.methods.getVoterStatus(u).call();
        setVoterStatus({
          isRegistered: Boolean(status.isRegistered),
          hasVoted: Boolean(status.hasVoted),
          votedCandidateId: Number(status.votedCandidateId),
          loading: false,
        });
      } catch (err) {
        console.warn('Could not fetch voter status:', err.message);
        setVoterStatus({ isRegistered: false, hasVoted: false, votedCandidateId: 0, loading: false });
      }
    },
    [contract, account]
  );

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setAccount('');
    setIsAdmin(false);
    setVoterStatus({ isRegistered: false, hasVoted: false, votedCandidateId: 0, loading: false });
  }, []);

  // Connect to MetaMask
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed. Please install the MetaMask browser extension.');
      return false;
    }

    setIsConnecting(true);
    setError('');

    try {
      const web3Instance = web3 || createWeb3Instance(window.ethereum);
      if (!web3) setWeb3(web3Instance);

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in MetaMask.');
      }

      const activeAccount = accounts[0];
      setAccount(activeAccount);

      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(currentChainId);
      setNetworkName(getNetworkFriendlyName(currentChainId));
      setIsWrongNetwork(!isTargetNetwork(currentChainId));

      if (contract) {
        await checkAdminStatus(contract, activeAccount);
        await refreshVoterStatus(contract, activeAccount);
      }

      await ensureLocalBalance(activeAccount);

      setIsConnecting(false);
      return true;
    } catch (err) {
      console.error('Wallet connection error:', err);
      const errMsg = (err?.message || '').toLowerCase();
      if (errMsg.includes('already pending')) {
        setError('MetaMask is locked or has a pending connection request. Please click the MetaMask extension to unlock/approve.');
      } else if (errMsg.includes('lock')) {
        setError('MetaMask is locked. Please unlock MetaMask with your password and try again.');
      } else {
        setError(err.message || 'Failed to connect MetaMask wallet.');
      }
      setIsConnecting(false);
      return false;
    }
  };

  // 1. One-time setup on mount for MetaMask listeners
  useEffect(() => {
    if (!window.ethereum) return;

    const web3Instance = createWeb3Instance(window.ethereum);
    setWeb3(web3Instance);

    const handleAccountsChanged = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        disconnectWallet();
      } else {
        const newAccount = accounts[0];
        setAccount(newAccount);
        if (contract) {
          await checkAdminStatus(contract, newAccount);
          await refreshVoterStatus(contract, newAccount);
        }
        await ensureLocalBalance(newAccount);
      }
    };

    const handleChainChanged = (newChainId) => {
      setChainId(newChainId);
      setNetworkName(getNetworkFriendlyName(newChainId));
      setIsWrongNetwork(!isTargetNetwork(newChainId));
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check for already connected accounts
    window.ethereum
      .request({ method: 'eth_accounts' })
      .then((accounts) => {
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0]);
          ensureLocalBalance(accounts[0]);
        }
      })
      .catch(console.error);

    window.ethereum
      .request({ method: 'eth_chainId' })
      .then((cid) => {
        setChainId(cid);
        setNetworkName(getNetworkFriendlyName(cid));
        setIsWrongNetwork(!isTargetNetwork(cid));
      })
      .catch(console.error);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnectWallet, checkAdminStatus, refreshVoterStatus, contract, ensureLocalBalance]);

  // 2. Refresh admin & voter status whenever contract or account changes
  useEffect(() => {
    if (contract) {
      checkAdminStatus(contract, account);
    }
    if (contract && account) {
      refreshVoterStatus(contract, account);
    } else {
      setVoterStatus({ isRegistered: false, hasVoted: false, votedCandidateId: 0, loading: false });
    }
  }, [contract, account, checkAdminStatus, refreshVoterStatus]);

  return (
    <Web3Context.Provider
      value={{
        web3,
        contract,
        contractAddress,
        isContractDeployed,
        contractError,
        updateContractAddress,
        resetToDefaultContractAddress,
        claimAdminRole,
        isClaimingAdmin,
        account,
        chainId,
        networkName,
        isWrongNetwork,
        switchNetwork,
        adminAddress,
        isAdmin,
        voterStatus,
        refreshVoterStatus,
        checkAdminStatus,
        connectWallet,
        disconnectWallet,
        isConnecting,
        error,
        setError,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
