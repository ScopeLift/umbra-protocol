// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "solmate/test/utils/mocks/MockERC20.sol";
import "test/utils/DSTestPlus.sol";

contract DeployUmbraTest is DSTestPlus {
  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  MockERC20 token;

  function deployUmbra() virtual public {
    // Deploy Umbra at an arbitrary address, then place the resulting bytecode at the same address as the production deploys.
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
  }

  function createMockERC20AndMint(address addr, uint256 amount) public {
    token = new MockERC20("Test","TT", 18);
    token.mint(addr, amount);
  }
}