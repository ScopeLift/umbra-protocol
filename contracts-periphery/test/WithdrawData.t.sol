// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./utils/DSTestPlus.sol";
import "src/WithdrawData.sol";

interface DaiMint{
  function mint(address usr, uint wad) external;
}


contract WithdrawDataTest is DSTestPlus {
  WithdrawData withdrawData;
  MockERC20 token;
  // ERC20 dai;

  IUmbra umbraContract;
  ISwapRouter swapRouter;

  IERC20 dai;
  uint256 toll;
  bytes32 pkx = "pkx";
  bytes32 ciphertext = "ciphertext";

  address alice = address(0x202204);
  address bob = address(0x202205);
  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  address public immutable DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  uint24 public constant poolFee = 3000;

  function setUp() public {
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
    umbraContract = IUmbra(address(umbra));
    swapRouter = ISwapRouter(address(0xE592427A0AEce92De3Edee1F18E0157C05861564));
    withdrawData = new WithdrawData(IUmbra(address(umbraContract)), ISwapRouter(swapRouter));
    token = new MockERC20("Test","TT", 18);
    token.mint(address(this), 1e7 ether);
    dai = IERC20(DAI);
    deal(address(DAI), address(this), 1e7 ether);
    vm.label(alice, 'alice');
    vm.label(bob, 'bob');
    vm.label(address(this), 'thisContract');
    vm.label(umbra, 'umbraContract');
    vm.label(address(withdrawData), 'withdrawDataContract');
    // dai = new ERC20(address(DAIaddr));
    // dai.mint(address(this), 1e7 ether);
  }

  function testPostSetupState() public {
    assertTrue(true);
    assertEq(IERC20(DAI).balanceOf(address(this)), 1e7 ether);
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

    emit log_named_uint('dai balance is now' , dai.balanceOf(address(this)));
    dai.approve(address(umbraContract), 1000 ether);
    // token.transferFrom(address(this), address(withdrawData), 10*1e18);

    emit log_named_uint('dai balance is now' , dai.balanceOf(address(this)));

    umbraContract.sendToken{value: toll}(
        address(alice),  // This line was alice. But the withdraw token assumes msg.sender
        address(DAI),
        1000 ether,
        pkx,
        ciphertext
    );
    emit log_named_uint('dai balance is now' , dai.balanceOf(address(this)));
    emit log_named_uint('umbraContract dai balance is now' , dai.balanceOf(address(umbraContract)));

    assertEq(dai.balanceOf(address(umbraContract)), 1000 ether);

    // address sender = withdrawData.gm();
    // emit log_named_address('This should be alices address' , sender);

    IUmbraHookReceiver receiver = IUmbraHookReceiver(address(withdrawData));

    vm.startPrank(alice);


    emit log_named_uint('CALLER address balance is' , IERC20(WETH9).balanceOf(address(umbraContract)));

    bytes memory data = abi.encode(address(bob), 10 ether);
    (address a, uint b) = abi.decode(data, (address, uint));

    emit log_named_address('a is' , a);
    emit log_named_uint('b is' , b);
    // data.push(bytes20(address(bob)));
    emit log_named_bytes('caller data is', data);
    umbraContract.withdrawTokenAndCall(address(withdrawData), address(DAI), receiver, data);
    emit log_named_address("this contracts address is", address(this));
    emit log_named_uint('umbraContract dai balance is now' , dai.balanceOf(address(umbraContract)));
    emit log_named_uint('withdrawData' , dai.balanceOf(address(withdrawData)));

    emit log_named_uint('CALLER address balance is' , address(bob).balance);
    emit log_named_uint('CALLER address balance is' , IERC20(DAI).balanceOf(address(bob)));

    // assertEq(token.balanceOf(address(alice)), 10 ether);

  }
}