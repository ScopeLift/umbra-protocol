// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
import "src/WithdrawData.sol";


contract WithdrawDataTest is DSTestPlus {
  WithdrawData withdrawData;
  MockERC20 token;

  IUmbra umbraContract;

  uint256 toll;
  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";

  address alice = address(0x202204);
  address bob = address(0x202205);
  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  function setUp() public {
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
    umbraContract = IUmbra(address(umbra));
    withdrawData = new WithdrawData(IUmbra(address(umbraContract)));
    token = new MockERC20("Test","TT", 18);
    token.mint(address(this), 1e7 ether);
  }

  function testPostSetupState() public {
    assertTrue(true);
  }

  function test_DirectSendToken() public {
    token.approve(address(umbraContract), 10*1e18);

    umbraContract.sendToken{value: toll}(
      alice,
      address(token),
      10*1e18,
      pkx,
      ciphertext
    );

    assertEq(token.balanceOf(umbra), 10*1e18);
  }

  function test_SendToken() public {

    token.approve(address(withdrawData), 10*1e18);
    // token.transferFrom(address(this), address(withdrawData), 10*1e18);

    withdrawData.sendToken{value: toll}(
        alice,
        address(token),
        10 ether,
        pkx,
        ciphertext
      );


    assertEq(token.balanceOf(address(umbra)), 10 ether);
    // emit log_string(withdrawData.gm());
  }

  function test_Withdrawal() public {

    token.approve(address(umbraContract), 10*1e18);

    umbraContract.sendToken{value: toll}(
        alice,
        address(token),
        10*1e18,
        pkx,
        ciphertext
      );

    emit log_named_uint('umbra balance is now' , token.balanceOf(umbra));

    assertEq(token.balanceOf(umbra), 10*1e18);


    vm.startPrank(alice);
    emit log_named_address('This should be alices address' , msg.sender);
    // emit log_named_uint('alice stealth balance is', umbra.tokenPayments[alice][address(token)]);
    emit log_named_address('Token address is ' , address(token));
    umbraContract.withdrawToken(bob, address(token));
    // withdrawData.withdrawToken(bob, address(token));


    vm.stopPrank();
  }

  function test_WithdrawalNew() public {
    token.approve(address(withdrawData), 10*1e18);
    // token.transferFrom(address(this), address(withdrawData), 10*1e18);

    withdrawData.sendToken{value: toll}(
        address(withdrawData),  // This line was alice. But the withdraw token assumes msg.sender
        address(token),
        10 ether,
        pkx,
        ciphertext
    );

    vm.startPrank(alice);
    withdrawData.withdrawToken(bob, address(token));

    assertEq(token.balanceOf(bob), 10 ether);

  }

  function test_WithdrawalHook() public {
    token.approve(address(withdrawData), 10*1e18);
    // token.transferFrom(address(this), address(withdrawData), 10*1e18);

    withdrawData.sendToken{value: toll}(
        address(withdrawData),  // This line was alice. But the withdraw token assumes msg.sender
        address(token),
        10 ether,
        pkx,
        ciphertext
    );

    // address sender = withdrawData.gm();
    // emit log_named_address('This should be alices address' , sender);

    IUmbraHookReceiver receiver = IUmbraHookReceiver(address(withdrawData));

    withdrawData.withdrawTokenWithHook(address(withdrawData), address(token), receiver, '');
    emit log_named_address("this contracts address is", address(this));
    assertEq(token.balanceOf(address(alice)), 10 ether);


  }
}