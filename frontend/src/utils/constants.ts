export const ERC20_ABI = [
  'function name() view returns (string)',
  'function approve(address spender, uint256 value) returns (bool)',
  'function totalSupply() view returns (uint256)',
  'function transferFrom(address from, address to, uint256 value) returns (bool)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256 balance)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 value) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

export const MULTICALL_ABI = [
  'function aggregate(tuple(address target, bytes callData)[] calls) returns (uint256 blockNumber, bytes[] returnData)',
  'function getBlockHash(uint256 blockNumber) view returns (bytes32 blockHash)',
  'function getCurrentBlockCoinbase() view returns (address coinbase)',
  'function getCurrentBlockDifficulty() view returns (uint256 difficulty)',
  'function getCurrentBlockGasLimit() view returns (uint256 gaslimit)',
  'function getCurrentBlockTimestamp() view returns (uint256 timestamp)',
  'function getEthBalance(address addr) view returns (uint256 balance)',
  'function getLastBlockHash() view returns (bytes32 blockHash)',
];

export const MULTICALL_ADDRESSES = {
  '1': '0x5e227AD1969Ea493B43F840cfF78d08a6fc17796',
  '3': '0x53C43764255c17BD724F74c4eF150724AC50a3ed',
  '4': '0x42Ad527de7d4e9d9d011aC45B31D8551f8Fe9821',
};
