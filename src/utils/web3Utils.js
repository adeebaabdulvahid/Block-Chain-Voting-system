export const TARGET_CHAIN_ID_DEC = '31337';
export const TARGET_CHAIN_ID_HEX = '0x7a69';

// Check if chain ID matches target local Hardhat network (supports hex and decimal)
export const isTargetNetwork = (id) => {
  if (!id) return false;
  const s = String(id).toLowerCase();
  return s === TARGET_CHAIN_ID_DEC || s === TARGET_CHAIN_ID_HEX || s === '31337' || s === '0x7a69';
};
