// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {DeployBatchSend} from "script/DeployBatchSend.s.sol";
import {Test} from "forge-std/Test.sol";
import {console2} from "forge-std/console2.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract DeployBatchSendTest is DeployBatchSend, Test {
  address sender = msg.sender;
  address expectedContractAddress;
  UmbraBatchSend umbraBatchSendTest;
  bytes batchSendCode;

  function setUp() public {
    expectedContractAddress = computeCreateAddress(sender, EXPECTED_NONCE);
    umbraBatchSendTest = new UmbraBatchSend(IUmbra(UMBRA));
    batchSendCode = address(umbraBatchSendTest).code;
  }

  function test_checkNonce() public {
    for (uint256 i; i < networks.length; i++) {
      vm.createSelectFork(getChain(networks[i]).rpcUrl);
      assertEq(vm.activeFork(), i);
      uint256 nonce = vm.getNonce(sender);
      assertEq(nonce, EXPECTED_NONCE);
    }
  }

  function test_checkContractIsDeployed() public {
    DeployBatchSend.run();
    for (uint256 i; i < networks.length; i++) {
      vm.selectFork(i);
      assertEq(vm.activeFork(), i);
      assertTrue(expectedContractAddress.code.length > 0);
      assertEq(batchSendAddresses[networks[i]], expectedContractAddress);
      assertEq(address(expectedContractAddress).code, batchSendCode);
    }
  }
}
