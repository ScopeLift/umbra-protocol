// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "ds-test/test.sol";
import "forge-std/Vm.sol";
import "forge-std/Test.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "solmate/test/utils/mocks/MockERC20.sol";

contract DSTestPlus is DSTest, Test {
  using stdStorage for StdStorage;

  function setToll(address umbraAddr, uint256 newToll) public {
    stdstore.target(address(umbraAddr)).sig("toll()").checked_write(newToll);
  }
}