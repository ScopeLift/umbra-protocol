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

export const CNS_RESOLVER_ABI = [
  'constructor(address registry, address mintingController)',
  'event NewKey(uint256 indexed tokenId, string indexed keyIndex, string key)',
  'event ResetRecords(uint256 indexed tokenId)',
  'event Set(uint256 indexed tokenId, string indexed keyIndex, string indexed valueIndex, string key, string value)',
  'function nonceOf(uint256 tokenId) view returns (uint256)',
  'function registry() view returns (address)',
  'function reset(uint256 tokenId)',
  'function resetFor(uint256 tokenId, bytes signature)',
  'function get(string key, uint256 tokenId) view returns (string)',
  'function hashToKey(uint256 keyHash) view returns (string)',
  'function hashesToKeys(uint256[] hashes) view returns (string[])',
  'function getByHash(uint256 keyHash, uint256 tokenId) view returns (string key, string value)',
  'function getManyByHash(uint256[] keyHashes, uint256 tokenId) view returns (string[] keys, string[] values)',
  'function preconfigure(string[] keys, string[] values, uint256 tokenId)',
  'function set(string key, string value, uint256 tokenId)',
  'function setFor(string key, string value, uint256 tokenId, bytes signature)',
  'function getMany(string[] keys, uint256 tokenId) view returns (string[])',
  'function setMany(string[] keys, string[] values, uint256 tokenId)',
  'function setManyFor(string[] keys, string[] values, uint256 tokenId, bytes signature)',
  'function reconfigure(string[] keys, string[] values, uint256 tokenId)',
  'function reconfigureFor(string[] keys, string[] values, uint256 tokenId, bytes signature)',
];

export const ENS_REGISTRY_ABI = [
  'constructor(address _old)',
  'event ApprovalForAll(address indexed owner, address indexed operator, bool approved)',
  'event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner)',
  'event NewResolver(bytes32 indexed node, address resolver)',
  'event NewTTL(bytes32 indexed node, uint64 ttl)',
  'event Transfer(bytes32 indexed node, address owner)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
  'function old() view returns (address)',
  'function owner(bytes32 node) view returns (address)',
  'function recordExists(bytes32 node) view returns (bool)',
  'function resolver(bytes32 node) view returns (address)',
  'function setApprovalForAll(address operator, bool approved)',
  'function setOwner(bytes32 node, address owner)',
  'function setRecord(bytes32 node, address owner, address resolver, uint64 ttl)',
  'function setResolver(bytes32 node, address resolver)',
  'function setSubnodeOwner(bytes32 node, bytes32 label, address owner) returns (bytes32)',
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
  'function setTTL(bytes32 node, uint64 ttl)',
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

export const FORWARDING_STEALTH_KEY_RESOLVER_ABI = [
  'constructor(address _ens, address _fallbackResolver)',
  'event ABIChanged(bytes32 indexed node, uint256 indexed contentType)',
  'event AddrChanged(bytes32 indexed node, address a)',
  'event AddressChanged(bytes32 indexed node, uint256 coinType, bytes newAddress)',
  'event AuthorisationChanged(bytes32 indexed node, address indexed owner, address indexed target, bool isAuthorised)',
  'event ContenthashChanged(bytes32 indexed node, bytes hash)',
  'event DNSRecordChanged(bytes32 indexed node, bytes name, uint16 resource, bytes record)',
  'event DNSRecordDeleted(bytes32 indexed node, bytes name, uint16 resource)',
  'event DNSZoneCleared(bytes32 indexed node)',
  'event DNSZonehashChanged(bytes32 indexed node, bytes lastzonehash, bytes zonehash)',
  'event InterfaceChanged(bytes32 indexed node, bytes4 indexed interfaceID, address implementer)',
  'event NameChanged(bytes32 indexed node, string name)',
  'event PubkeyChanged(bytes32 indexed node, bytes32 x, bytes32 y)',
  'event StealthKeyChanged(bytes32 indexed node, uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
  'event TextChanged(bytes32 indexed node, string indexed indexedKey, string key)',
  'function ABI(bytes32 node, uint256 contentTypes) view returns (uint256, bytes)',
  'function addr(bytes32 node) view returns (address)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)',
  'function authorisations(bytes32, address, address) view returns (bool)',
  'function clearDNSZone(bytes32 node)',
  'function contenthash(bytes32 node) view returns (bytes)',
  'function dnsRecord(bytes32 node, bytes32 name, uint16 resource) view returns (bytes)',
  'function fallbackResolver() view returns (address)',
  'function hasDNSRecords(bytes32 node, bytes32 name) view returns (bool)',
  'function interfaceImplementer(bytes32 node, bytes4 interfaceID) view returns (address)',
  'function multicall(bytes[] data) returns (bytes[] results)',
  'function name(bytes32 node) view returns (string)',
  'function pubkey(bytes32 node) view returns (bytes32 x, bytes32 y)',
  'function setABI(bytes32 node, uint256 contentType, bytes data)',
  'function setAddr(bytes32 node, uint256 coinType, bytes a)',
  'function setAddr(bytes32 node, address a)',
  'function setAuthorisation(bytes32 node, address target, bool isAuthorised)',
  'function setContenthash(bytes32 node, bytes hash)',
  'function setDNSRecords(bytes32 node, bytes data)',
  'function setInterface(bytes32 node, bytes4 interfaceID, address implementer)',
  'function setName(bytes32 node, string name)',
  'function setPubkey(bytes32 node, bytes32 x, bytes32 y)',
  'function setStealthKeys(bytes32 node, uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
  'function setText(bytes32 node, string key, string value)',
  'function setZonehash(bytes32 node, bytes hash)',
  'function stealthKeys(bytes32 node) view returns (uint256 spendingPubKeyPrefix, uint256 spendingPubKey, uint256 viewingPubKeyPrefix, uint256 viewingPubKey)',
  'function supportsInterface(bytes4 interfaceID) pure returns (bool)',
  'function text(bytes32 node, string key) view returns (string)',
  'function zonehash(bytes32 node) view returns (bytes)',
];
