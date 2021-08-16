// SPDX-License-Identifier: MIT

pragma solidity ^0.7.6;

contract StealthKeyRegistry {
  struct StealthKeys {
    uint256 viewingKey;
    uint256 spendingKey;
  }

  mapping(address => StealthKeys) public keys;
}
