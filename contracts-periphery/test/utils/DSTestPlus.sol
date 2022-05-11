// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "solmate/test/utils/mocks/MockERC20.sol";

contract DSTestPlus is Test {
  using stdStorage for StdStorage;

  function setToll(address umbraAddr, uint256 newToll) public {
    stdstore.target(address(umbraAddr)).sig("toll()").checked_write(newToll);
  }
}