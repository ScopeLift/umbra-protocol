// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
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

  uint256 etherAmount;
  uint256 tokenAmount;
  uint256 addressAmount;
  uint256 ethBalance;
  uint256 ethBalanceAfterGas;
  uint256 tokenBalance;

  uint256 toll;
  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";

  UmbraBatchSend.SendEth[] sendEth;
  UmbraBatchSend.SendEth[] sendEthMax;
  UmbraBatchSend.SendEth[] sendEthMaxWithTokens;
  UmbraBatchSend.SendEth[] sendEth100;
  UmbraBatchSend.SendEth[] sendEth100Max;
  UmbraBatchSend.SendEth[] sendEth100MaxWithTokens;

  UmbraBatchSend.SendToken[] sendToken;
  UmbraBatchSend.SendToken[] sendTokenMax;
  UmbraBatchSend.SendToken[] sendToken100;
  UmbraBatchSend.SendToken[] sendToken100Max;

  function setUp() virtual public {
    // Deploy Umbra at an arbitrary address, then place the resulting bytecode at the same address as the production deploys.
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
    router = new UmbraBatchSend(IUmbra(address(umbra)));
    token = new MockERC20("Test","TT", 18);
    token.mint(address(this), 1e7 ether);
    deal(address(this), 1e5 ether);

    ethBalance = address(this).balance;
    tokenBalance = token.balanceOf(address(this));

    // Set test parameters
    etherAmount = 10 ether;
    tokenAmount = 10000 ether;
    addressAmount = 10;
  }

  function testPostSetupState() public {
    uint256 currentToll = UmbraToll(umbra).toll();
    assertEq(toll, currentToll);
  }

  function addParams(uint256 etherAmount, uint256 tokenAmount) public {
    sendEth.push(UmbraBatchSend.SendEth(payable(alice), etherAmount, pkx, ciphertext));
    sendEthMax.push(UmbraBatchSend.SendEth(payable(alice), (ethBalance - toll), pkx, ciphertext));
    sendEthMaxWithTokens.push(UmbraBatchSend.SendEth(payable(alice), (ethBalance - toll * 2), pkx, ciphertext));

    sendToken.push(UmbraBatchSend.SendToken(alice, address(token), tokenAmount, pkx, ciphertext));
    sendTokenMax.push(UmbraBatchSend.SendToken(alice, address(token), (tokenBalance), pkx, ciphertext));
    token.approve(address(router), tokenBalance);

    for (uint256 i = 0; i < addressAmount; i ++) {
      address payable addr = payable(address(uint160(uint(keccak256(abi.encode(i))))));
      sendEth100.push(UmbraBatchSend.SendEth(addr, etherAmount, pkx, ciphertext));
      sendEth100Max.push(UmbraBatchSend.SendEth(addr, (ethBalance/addressAmount) - toll, pkx, ciphertext));
      sendEth100MaxWithTokens.push(UmbraBatchSend.SendEth(addr, (ethBalance/addressAmount) - toll * 2, pkx, ciphertext));
      sendToken100.push(UmbraBatchSend.SendToken(addr, address(token), tokenAmount, pkx, ciphertext));
      sendToken100Max.push(UmbraBatchSend.SendToken(addr, address(token), (tokenBalance/addressAmount), pkx, ciphertext));
    }
  }

  function test_BatchSendEth() public {
    router.batchSendEth{value: etherAmount + toll}(toll, sendEth);
  }

  function test_BatchSendEth_MAX() public {
    router.batchSendEth{value: ethBalance}(toll, sendEthMax);
  }

  function test_BatchSendEth_100() public {
    router.batchSendEth{value: (etherAmount + toll) * addressAmount}(toll, sendEth100);
  }

  function test_BatchSendEth_100MAX() public {
    router.batchSendEth{value: ethBalance}(toll, sendEth100Max);
  }

  function test_BatchSendTokens() public {
    router.batchSendTokens{value: toll}(toll, sendToken);
  }

  function test_BatchSendTokens_MAX() public {
    router.batchSendTokens{value: toll}(toll, sendTokenMax);
  }

  function test_BatchSendTokens_100() public {
    router.batchSendTokens{value: toll * addressAmount}(toll, sendToken100);
  }

  function test_BatchSendTokens_100MAX() public {
    router.batchSendTokens{value: toll * addressAmount}(toll, sendToken100Max);
  }

  function test_BatchSend() public {
    router.batchSend{value: etherAmount + toll * 2}(toll, sendEth, sendToken);
  }

  function test_BatchSend_MAX() public {
    router.batchSend{value: ethBalance}(toll, sendEthMaxWithTokens, sendTokenMax);
  }

  function test_BatchSend_100() public {
    router.batchSend{value: (etherAmount + toll * 2) * addressAmount}(toll, sendEth100, sendToken100);
  }

  function test_BatchSend_100MAX() public {
    router.batchSend{value: ethBalance }(toll, sendEth100MaxWithTokens, sendToken100Max);
  }

}

contract BatchSendWithTollGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 1e17;
    setToll(umbra, toll);
    addParams(etherAmount, tokenAmount);
  }

}

contract BatchSendWithoutTollGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 0;
    setToll(umbra, toll);
    addParams(etherAmount, tokenAmount);
  }
}

contract BatchSendWithTollAndBalanceGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 1e17;
    setToll(umbra, toll);
    addParams(etherAmount, tokenAmount);
    token.mint(address(umbra), 1e7 ether); // Umbra has non-zero token balance
  }
}

contract BatchSendWithoutTollAndBalanceGasTest is UmbraBatchSendGasTest {
  function setUp() public override {
    super.setUp();
    toll = 0;
    setToll(umbra, toll);
    addParams(etherAmount, tokenAmount);
    token.mint(address(umbra), 1e7 ether); // Umbra has non-zero token balance
  }
}