// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Test, console2} from "forge-std/Test.sol";
import {ApproveBatchSendTokens} from "script/ApproveBatchSendTokens.s.sol";
import {IERC20} from "openzeppelin-contracts/token/ERC20/IERC20.sol";

contract ApproveBatchSendTokensTest is Test {
  ApproveBatchSendTokens approveTokensScript;
  address umbraContractAddressOnMainnet = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  address batchSendContractAddressOnMainnet = 0xDbD0f5EBAdA6632Dde7d47713ea200a7C2ff91EB;
  address constant DAI_ADDRESS = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address constant LUSD_ADDRESS = 0x5f98805A4E8be255a32880FDeC7F6728C6568bA0;
  address constant RAI_ADDRESS = 0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919;
  address constant USDC_ADDRESS = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
  address constant USDT_ADDRESS = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
  address constant WBTC_ADDRESS = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
  address[] tokensToApprove =
    [DAI_ADDRESS, LUSD_ADDRESS, RAI_ADDRESS, USDC_ADDRESS, USDT_ADDRESS, WBTC_ADDRESS];

  function setUp() public {
    vm.createSelectFork(vm.rpcUrl("mainnet"), 18_428_858);
    approveTokensScript = new ApproveBatchSendTokens();
  }

  function test_ApproveSingleToken() public {
    address[] memory tokenAddressesToApprove = new address[](1);
    tokenAddressesToApprove[0] = DAI_ADDRESS;
    approveTokensScript.run(
      umbraContractAddressOnMainnet, batchSendContractAddressOnMainnet, tokenAddressesToApprove
    );

    assertEq(
      IERC20(DAI_ADDRESS).allowance(
        batchSendContractAddressOnMainnet, umbraContractAddressOnMainnet
      ),
      type(uint256).max
    );
  }

  function test_ApproveMultipleTokens() public {
    approveTokensScript.run(
      umbraContractAddressOnMainnet, batchSendContractAddressOnMainnet, tokensToApprove
    );

    for (uint256 _i; _i < tokensToApprove.length; _i++) {
      assertEq(
        IERC20(tokensToApprove[_i]).allowance(
          batchSendContractAddressOnMainnet, umbraContractAddressOnMainnet
        ),
        type(uint256).max
      );
    }
  }
}
