// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Deploy} from "script/DeployBatchSend.s.sol";
import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";

contract DeployBatchSendTest is Deploy, Test {
  uint256 constant EXPECTED_TEST_NONCE = 4; // TODO Edit this with the nonce of the
  address expectedContractAddress = computeCreateAddress(msg.sender, EXPECTED_NONCE);

  function setUp() public {
    assertEq(EXPECTED_NONCE, EXPECTED_TEST_NONCE);
    assertTrue(expectedContractAddress.code.length == 0);
  }

  function test_checkContractIsDeployed() public {
    console2.log("expectedContractAddress is ", expectedContractAddress);
    run();
    for (uint256 i; i < networks.length; i++) {
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      assertTrue(expectedContractAddress.code.length > 0);
    }
  }
}
