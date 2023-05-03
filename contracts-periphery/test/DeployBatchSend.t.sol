// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {DeployBatchSend} from "script/DeployBatchSend.s.sol";
import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract DeployBatchSendTest is DeployBatchSend, Test {
  uint256 constant EXPECTED_TEST_NONCE = 0; // TODO Edit this with the nonce of the
  address expectedContractAddress = computeCreateAddress(msg.sender, EXPECTED_NONCE);
  UmbraBatchSend umbraBatchSend = new UmbraBatchSend(IUmbra(UMBRA));
  bytes batchSendCode = address(umbraBatchSend).code;

  function test_checkNonce() public {
    assertEq(EXPECTED_NONCE, EXPECTED_TEST_NONCE);
    assertTrue(expectedContractAddress.code.length == 0);
  }

  function test_checkContractIsDeployed() public {
    console2.log("expectedContractAddress is ", expectedContractAddress);
    run();
    for (uint256 i; i < networks.length; i++) {
      vm.selectFork(i);
      assertEq(vm.activeFork(), i);
      assertTrue(expectedContractAddress.code.length > 0);
      assertEq(address(expectedContractAddress).code, batchSendCode);
    }
  }
}
