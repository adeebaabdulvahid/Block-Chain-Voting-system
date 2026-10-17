import { createContext, useContext } from 'react';

export const Web3Context = createContext();

export const useWeb3 = () => useContext(Web3Context);
