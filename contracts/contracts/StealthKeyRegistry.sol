// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

contract StealthKeyRegistry {

  mapping(address => mapping(uint256 => uint256)) public keys;
}
