export const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

export const UMBRA_ABI = [
  'constructor(uint256 toll, address tollCollector, address tollReceiver)',
  'event Announcement(address indexed receiver, uint256 amount, address indexed token, bytes32 pkx, bytes32 ciphertext)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'event TokenWithdrawal(address indexed receiver, address indexed acceptor, uint256 amount, address indexed token)',
  'function collectTolls()',
  'function owner() view returns (address)',
  'function renounceOwnership()',
  'function sendEth(address receiver, uint256 tollCommitment, bytes32 pkx, bytes32 ciphertext) payable',
  'function sendToken(address receiver, address tokenAddr, uint256 amount, bytes32 pkx, bytes32 ciphertext) payable',
  'function setToll(uint256 newToll)',
  'function setTollCollector(address newTollCollector)',
  'function setTollReceiver(address newTollReceiver)',
  'function tokenPayments(address, address) view returns (uint256)',
  'function toll() view returns (uint256)',
  'function tollCollector() view returns (address)',
  'function tollReceiver() view returns (address)',
  'function transferOwnership(address newOwner)',
  'function withdrawToken(address acceptor, address tokenAddr)',
  'function withdrawTokenAndCall(address acceptor, address tokenAddr, address hook, bytes data)',
  'function withdrawTokenAndCallOnBehalf(address stealthAddr, address acceptor, address tokenAddr, address sponsor, uint256 sponsorFee, address hook, bytes data, uint8 v, bytes32 r, bytes32 s)',
  'function withdrawTokenOnBehalf(address stealthAddr, address acceptor, address tokenAddr, address sponsor, uint256 sponsorFee, uint8 v, bytes32 r, bytes32 s)',
];

export const UMBRA_BATCH_SEND_ABI = [
  'constructor(address _umbra)',
  'error NotSorted()',
  'error TooMuchEthSent()',
  'event BatchSendExecuted(address indexed sender)',
  'event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)',
  'function approveToken(address _token)',
  'function batchSend(uint256 _tollCommitment, tuple(address receiver, address tokenAddr, uint256 amount, bytes32 pkx, bytes32 ciphertext)[] _data) payable',
  'function owner() view returns (address)',
  'function renounceOwnership()',
  'function transferOwnership(address newOwner)',
];

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
