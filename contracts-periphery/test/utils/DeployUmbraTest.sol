// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "solmate/test/utils/mocks/MockERC20.sol";
import "test/utils/DSTestPlus.sol";
import "src/interface/IUmbra.sol";
import "src/interface/IUmbraHookReceiver.sol";
import "src/interface/IQuoter.sol";
import "forge-std/console2.sol";

contract DeployUmbraTest is DSTestPlus {
  address constant umbra = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;
  MockERC20 token;
  MockERC20 token2;
  address alice = address(0x202204);
  address bob = address(0x202205);
  bytes32 constant pkx = "pkx";
  bytes32 constant ciphertext = "ciphertext";

  function setUp() public virtual {
    deployUmbra();
    createMockERC20AndMint(address(this), 1e9 ether);
    vm.deal(address(this), 1e5 ether);
  }

  function deployUmbra() public virtual {
    // Deploy Umbra at an arbitrary address, then place the resulting bytecode at the same address as the production deploys.
    vm.etch(umbra, (deployCode("test/utils/Umbra.json", bytes(abi.encode(0, address(this), address(this))))).code);
  }

  function createMockERC20AndMint(address addr, uint256 amount) public {
    token = new MockERC20("Test", "TT", 18);
    token2 = new MockERC20("Test2", "TT2", 18);
    token.mint(addr, amount);
    token2.mint(addr, amount);
  }

  function createDigestAndSign(
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    IUmbraHookReceiver _hook,
    bytes memory _data,
    uint256 _privateKey
  )
    internal
    returns (
      uint8 v,
      bytes32 r,
      bytes32 s
    )
  {
    bytes32 _digest =
      keccak256(
        abi.encodePacked(
          "\x19Ethereum Signed Message:\n32",
          keccak256(
            abi.encode(
              block.chainid,
              address(umbra),
              _acceptor,
              _tokenAddr,
              _sponsor,
              _sponsorFee,
              address(_hook),
              _data
            )
          )
        )
      );

    return vm.sign(_privateKey, _digest);
  }
}
