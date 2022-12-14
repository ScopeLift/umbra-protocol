// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";
import {DeployUmbraTest} from "test/utils/DeployUmbraTest.sol";
import {IUmbra} from "src/interface/IUmbra.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";

abstract contract UmbraBatchSendGasTest is DeployUmbraTest {
  address internal constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

  UmbraBatchSend router;

  uint256 ethBalance;
  uint256 tokenBalance;
  uint256 toll;

  UmbraBatchSend.SendData[] sendData;

  enum Send {
    ETH,
    TOKEN,
    BOTH
  }

  address payable[] addrs;

  function setUp() public virtual override {
    super.setUp();
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    ethBalance = address(this).balance;
    tokenBalance = token.balanceOf(address(this));
    token.approve(address(router), type(uint256).max);
    router.approveToken(IERC20(address(token)));
  }

  function test_PostSetupState() public {
    uint256 currentToll = IUmbra(umbra).toll();
    assertEq(toll, currentToll);
    assertTrue(ethBalance > 0 && tokenBalance > 0);
  }

  function executeParams(Send _type, uint256 numOfAddrs, uint256 etherAmount, uint256 tokenAmount)
    public
  {
    assertTrue(numOfAddrs > 0);

    uint256 valueAmount;
    // Create a list of addresses
    for (uint256 i = 0; i < numOfAddrs; i++) {
      addrs.push(payable(address(uint160(uint256(keccak256(abi.encode(i)))))));
    }

    if (_type == Send.ETH) {
      assertTrue(etherAmount > 0);

      for (uint256 i = 0; i < numOfAddrs; i++) {
        valueAmount += etherAmount + toll;
        sendData.push(UmbraBatchSend.SendData(addrs[i], ETH, etherAmount, pkx, ciphertext));
      }
      router.batchSend{value: valueAmount}(toll, sendData);
    } else if (_type == Send.TOKEN) {
      assertTrue(tokenAmount > 0);
      for (uint256 i = 0; i < numOfAddrs; i++) {
        valueAmount += toll;
        sendData.push(
          UmbraBatchSend.SendData(addrs[i], address(token), tokenAmount, pkx, ciphertext)
        );
      }

      router.batchSend{value: valueAmount}(toll, sendData);
    } else {
      assertTrue(etherAmount > 0 && tokenAmount > 0);

      valueAmount += etherAmount * numOfAddrs + toll * numOfAddrs * 2;

      for (uint256 i = 0; i < numOfAddrs; i++) {
        sendData.push(
          UmbraBatchSend.SendData(addrs[i], address(token), tokenAmount, pkx, ciphertext)
        );
      }
      for (uint256 i = 0; i < numOfAddrs; i++) {
        sendData.push(UmbraBatchSend.SendData(addrs[i], ETH, etherAmount, pkx, ciphertext));
      }
      router.batchSend{value: valueAmount}(toll, sendData);
    }
  }

  // Send max balance
  function executeParams(Send _type, uint256 numOfAddrs) public {
    assertTrue(numOfAddrs > 0);

    if (_type == Send.ETH) {
      executeParams(Send.ETH, numOfAddrs, (ethBalance / numOfAddrs) - toll, 0);
    } else if (_type == Send.TOKEN) {
      executeParams(Send.TOKEN, numOfAddrs, 0, (tokenBalance / numOfAddrs));
    } else {
      executeParams(
        Send.BOTH, numOfAddrs, (ethBalance / numOfAddrs) - toll * 2, (tokenBalance / numOfAddrs)
      );
    }
  }

  function test_BatchSendEth_To1Addr() public {
    executeParams(Send.ETH, 1, 10 ether, 0);
  }

  function test_BatchSendEth_To2Addrs() public {
    executeParams(Send.ETH, 2, 10 ether, 0);
  }

  function test_BatchSendEth_To5Addrs() public {
    executeParams(Send.ETH, 5, 10 ether, 0);
  }

  function test_BatchSendEth_To10Addrs() public {
    executeParams(Send.ETH, 10, 10 ether, 0);
  }

  function test_BatchSendEth_To25Addrs() public {
    executeParams(Send.ETH, 25, 10 ether, 0);
  }

  function test_BatchSendEth_To100Addrs() public {
    executeParams(Send.ETH, 100, 10 ether, 0);
  }

  function test_BatchSendEth_MaxBalance_To1Addr() public {
    executeParams(Send.ETH, 1);
  }

  function test_BatchSendEth_MaxBalance_To2Addrs() public {
    executeParams(Send.ETH, 2);
  }

  function test_BatchSendEth_MaxBalance_To5Addrs() public {
    executeParams(Send.ETH, 5);
  }

  function test_BatchSendEth_MaxBalance_To10Addrs() public {
    executeParams(Send.ETH, 10);
  }

  function test_BatchSendEth_MaxBalance_To25Addrs() public {
    executeParams(Send.ETH, 25);
  }

  function test_BatchSendEth_MaxBalance_To100Addrs() public {
    executeParams(Send.ETH, 100);
  }

  function test_BatchSendTokens_To1Addr() public {
    executeParams(Send.TOKEN, 1, 0, 10_000 ether);
  }

  function test_BatchSendTokens_To100Addrs() public {
    executeParams(Send.TOKEN, 100, 0, 10_000 ether);
  }

  function test_BatchSendTokens_To2Addrs() public {
    executeParams(Send.TOKEN, 2, 0, 10_000 ether);
  }

  function test_BatchSendTokens_To5Addrs() public {
    executeParams(Send.TOKEN, 5, 0, 10_000 ether);
  }

  function test_BatchSendTokens_To10Addrs() public {
    executeParams(Send.TOKEN, 10, 0, 10_000 ether);
  }

  function test_BatchSendTokens_To25Addrs() public {
    executeParams(Send.TOKEN, 25, 0, 10_000 ether);
  }

  function test_BatchSendTokens_MaxBalance_To1Addr() public {
    executeParams(Send.TOKEN, 1);
  }

  function test_BatchSendTokens_MaxBalance_To2Addrs() public {
    executeParams(Send.TOKEN, 2);
  }

  function test_BatchSendTokens_MaxBalance_To5Addrs() public {
    executeParams(Send.TOKEN, 5);
  }

  function test_BatchSendTokens_MaxBalance_To10Addrs() public {
    executeParams(Send.TOKEN, 10);
  }

  function test_BatchSendTokens_MaxBalance_To25Addrs() public {
    executeParams(Send.TOKEN, 25);
  }

  function test_BatchSendTokens_MaxBalance_To100Addrs() public {
    executeParams(Send.TOKEN, 100);
  }

  function test_BatchSend_To1Addr() public {
    executeParams(Send.BOTH, 100, 10 ether, 10_000 ether);
  }

  function test_BatchSend_To2Addrs() public {
    executeParams(Send.BOTH, 2, 10 ether, 10_000 ether);
  }

  function test_BatchSend_To5Addrs() public {
    executeParams(Send.BOTH, 5, 10 ether, 10_000 ether);
  }

  function test_BatchSend_To10Addrs() public {
    executeParams(Send.BOTH, 10, 10 ether, 10_000 ether);
  }

  function test_BatchSend_To25Addrs() public {
    executeParams(Send.BOTH, 25, 10 ether, 10_000 ether);
  }

  function test_BatchSend_To100Addrs() public {
    executeParams(Send.BOTH, 100, 10 ether, 10_000 ether);
  }

  function test_BatchSend_MaxBalance_To1Addr() public {
    executeParams(Send.BOTH, 1);
  }

  function test_BatchSend_MaxBalance_To2Addrs() public {
    executeParams(Send.BOTH, 2);
  }

  function test_BatchSend_MaxBalance_To5Addrs() public {
    executeParams(Send.BOTH, 5);
  }

  function test_BatchSend_MaxBalance_To10Addrs() public {
    executeParams(Send.BOTH, 10);
  }

  function test_BatchSend_MaxBalance_To25Addrs() public {
    executeParams(Send.BOTH, 25);
  }

  function test_BatchSend_MaxBalance_To100Addrs() public {
    executeParams(Send.BOTH, 100);
  }
}

contract BatchSendWithTollGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 1e17;
    setToll(umbra, toll);
  }
}

contract BatchSendWithoutTollGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 0;
    setToll(umbra, toll);
  }
}

contract BatchSendWithTollAndWithTokenBalanceGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 1e17;
    setToll(umbra, toll);
    token.mint(address(umbra), 1e7 ether); // Umbra has non-zero token balance
  }
}

contract BatchSendWithoutTollAndWithTokenBalanceGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 0;
    setToll(umbra, toll);
    token.mint(address(umbra), 1e7 ether); // Umbra has non-zero token balance
  }
}
