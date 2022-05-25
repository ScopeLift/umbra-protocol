// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "solmate/test/utils/mocks/MockERC20.sol";
import "test/utils/DSTestPlus.sol";
import "src/UmbraBatchSend.sol";

interface UmbraToll {
  function toll() external returns(uint256);
}

abstract contract UmbraBatchSendGasTest is DSTestPlus {
  UmbraBatchSend router;
  MockERC20 token;

  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  address alice = address(0x202204);
  address bob = address(0x202205);

  uint256 ethBalance;
  uint256 tokenBalance;

  uint256 toll;
  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";

  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendToken[] sendToken;


  // Setup params for each function
  enum Send {ETH, TOKEN, BOTH}
  address payable[] addrs;
  uint256 valueAmount; // {value: valueAmount} when calling Umbra
  uint256 numOfAddrs;
  uint256 etherAmount; // Ether amount to be sent per address
  uint256 tokenAmount; // Token amount to be sent per address

  function setUp() virtual public {
    // Deploy Umbra at an arbitrary address, then place the resulting bytecode at the same address as the production deploys.
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    token = new MockERC20("Test","TT", 18);
    token.mint(address(this), 1e7 ether);
    deal(address(this), 1e5 ether);

    ethBalance = address(this).balance;
    tokenBalance = token.balanceOf(address(this));
  }

  function testPostSetupState() public {
    uint256 currentToll = UmbraToll(umbra).toll();
    assertEq(toll, currentToll);
  }

  function addParams(Send _type, uint256 numOfAddrs, uint256 etherAmount, uint256 tokenAmount) public {
    token.approve(address(router), tokenBalance);
    // Create a list of addresses
    for(uint256 i = 0; i < numOfAddrs; i++) {
      addrs.push(payable(address(uint160(uint(keccak256(abi.encode(i)))))));
    }

    if (_type == Send.ETH) {
      for (uint256 i = 0; i < numOfAddrs; i ++) {
        valueAmount += etherAmount + toll;
        sendEth.push(UmbraBatchSend.SendEth(addrs[i], etherAmount, pkx, ciphertext));
      }

    } else if (_type == Send.TOKEN) {
      for (uint256 i = 0; i < numOfAddrs; i ++) {
        valueAmount += toll;
        sendToken.push(UmbraBatchSend.SendToken(addrs[i], address(token), tokenAmount, pkx, ciphertext));
      }

    } else {
        for (uint256 i = 0; i < numOfAddrs; i ++) {
        valueAmount += etherAmount + toll * 2;
        sendEth.push(UmbraBatchSend.SendEth(addrs[i], etherAmount, pkx, ciphertext));
        sendToken.push(UmbraBatchSend.SendToken(addrs[i], address(token), tokenAmount, pkx, ciphertext));
        }
      }
  }

  // Send MAX balance
  function addParams(Send _type, uint256 numOfAddrs) public {
    token.approve(address(router), tokenBalance);

    for(uint256 i = 0; i < numOfAddrs; i++) {
      addrs.push(payable(address(uint160(uint(keccak256(abi.encode(i)))))));
    }

    if (_type == Send.ETH) {
      for (uint256 i = 0; i < numOfAddrs; i ++) {
        sendEth.push(UmbraBatchSend.SendEth(addrs[i], (ethBalance/numOfAddrs) - toll, pkx, ciphertext));
      }
      valueAmount = ethBalance;

    } else if (_type == Send.TOKEN) {
      for (uint256 i = 0; i < numOfAddrs; i ++) {
        valueAmount += toll;
        sendToken.push(UmbraBatchSend.SendToken(addrs[i], address(token), (tokenBalance/numOfAddrs), pkx, ciphertext));
      }

    } else {
        for (uint256 i = 0; i < numOfAddrs; i ++) {
        sendEth.push(UmbraBatchSend.SendEth(addrs[i], (ethBalance/numOfAddrs) - toll * 2, pkx, ciphertext));
        sendToken.push(UmbraBatchSend.SendToken(addrs[i], address(token), (tokenBalance/numOfAddrs), pkx, ciphertext));
        }
        valueAmount = ethBalance;
      }
  }

  function test_BatchSendEth() public {
    numOfAddrs = 1;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalance() public {
    numOfAddrs = 1;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_To2Addrs() public {
    numOfAddrs = 2;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_To5Addrs() public {
    numOfAddrs = 5;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_To10Addrs() public {
    numOfAddrs = 10;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_To25Addrs() public {
    numOfAddrs = 25;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_To100Addrs() public {
    numOfAddrs = 100;
    etherAmount = 10 ether;
    addParams(Send.ETH, numOfAddrs, etherAmount, 0);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalanceTo2Addrs() public {
    numOfAddrs = 2;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalanceTo5Addrs() public {
    numOfAddrs = 5;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalanceTo10Addrs() public {
    numOfAddrs = 10;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalanceTo25Addrs() public {
    numOfAddrs = 25;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendEth_MaxBalanceTo100Addrs() public {
    numOfAddrs = 100;
    addParams(Send.ETH, numOfAddrs);

    router.batchSendEth{value: valueAmount}(toll, sendEth);
  }

  function test_BatchSendTokens() public {
    numOfAddrs = 1;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0 , tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalance() public {
    numOfAddrs = 1;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_To100Addrs() public {
    numOfAddrs = 100;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0, tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_To2Addrs() public {
    numOfAddrs = 2;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0, tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_To5Addrs() public {
    numOfAddrs = 5;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0, tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_To10Addrs() public {
    numOfAddrs = 10;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0, tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_To25Addrs() public {
    numOfAddrs = 25;
    tokenAmount = 10000 ether;
    addParams(Send.TOKEN, numOfAddrs, 0, tokenAmount);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalanceTo2Addrs() public {
    numOfAddrs = 2;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalanceTo5Addrs() public {
    numOfAddrs = 5;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalanceTo10Addrs() public {
    numOfAddrs = 10;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalanceTo25Addrs() public {
    numOfAddrs = 25;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSendTokens_MaxBalanceTo100Addrs() public {
    numOfAddrs = 100;
    addParams(Send.TOKEN, numOfAddrs);

    router.batchSendTokens{value: valueAmount}(toll, sendToken);
  }

  function test_BatchSend() public {
    numOfAddrs = 100;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalance() public {
    numOfAddrs = 1;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_To2Addrs() public {
    numOfAddrs = 2;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_To5Addrs() public {
    numOfAddrs = 5;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_To10Addrs() public {
    numOfAddrs = 10;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_To25Addrs() public {
    numOfAddrs = 25;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_To100Addrs() public {
    numOfAddrs = 100;
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addParams(Send.BOTH, numOfAddrs, etherAmount, tokenAmount);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalanceTo2Addrs() public {
    numOfAddrs = 2;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalanceTo5Addrs() public {
    numOfAddrs = 5;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalanceTo10Addrs() public {
    numOfAddrs = 10;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalanceTo25Addrs() public {
    numOfAddrs = 25;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MaxBalanceTo100Addrs() public {
    numOfAddrs = 100;
    addParams(Send.BOTH, numOfAddrs);

    router.batchSend{value: valueAmount}(toll, sendEth, sendToken);
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