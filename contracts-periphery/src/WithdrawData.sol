// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUmbraHookReceiver {
  /**
   * @notice Method called after a user completes an Umbra token withdrawal
   * @param _amount The amount of the token withdrawn _after_ subtracting the sponsor fee
   * @param _stealthAddr The stealth address whose token balance was withdrawn
   * @param _acceptor Address where withdrawn funds were sent; can be this contract
   * @param _tokenAddr Address of the ERC20 token that was withdrawn
   * @param _sponsor Address which was compensated for submitting the withdrawal tx
   * @param _sponsorFee Amount of the token that was paid to the sponsor
   * @param _data Arbitrary data passed to this hook by the withdrawer
   */
  function tokensWithdrawn(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data
  ) external;
}

interface IUmbra {
    function sendToken(
    address receiver,
    address tokenAddr,
    uint256 amount,
    bytes32 pkx,
    bytes32 ciphertext
  ) external payable;

  function withdrawToken(address _acceptor, address _tokenAddr) external;

  function withdrawTokenAndCall(
    address _acceptor,
    address _tokenAddr,
    IUmbraHookReceiver _hook,
    bytes memory _data
  ) external;

}

contract WithdrawData {

  struct CallHookData {
    uint256 amount;
    address stealthAddr;
    address acceptor;
    address tokenAddr;
    address sponsor;
    uint256 sponsorFee;
    bytes data;
  }
  CallHookData public lastCallData;

  IUmbra internal immutable umbra;

  constructor(IUmbra _umbra) {
  umbra = _umbra;
  }

  function sendToken(
    address receiver,
    address tokenAddr,
    uint256 amount,
    bytes32 pkx,
    bytes32 ciphertext
  ) external payable {
    IERC20(tokenAddr).approve(address(umbra), type(uint256).max);
    IERC20(tokenAddr).transferFrom(msg.sender, address(this), amount);
    umbra.sendToken(receiver, tokenAddr, amount, pkx, ciphertext);
  }


  function withdrawToken(address _acceptor, address _tokenAddr) external {
    umbra.withdrawToken(_acceptor, _tokenAddr);
  }

  function withdrawTokenWithHook(address _acceptor, address _tokenAddr, IUmbraHookReceiver _hook, bytes memory _data) public {
    umbra.withdrawTokenAndCall(_acceptor, _tokenAddr, _hook, _data);
  }

  function tokensWithdrawn(
    uint256 _amount,
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    bytes memory _data
  ) external{
    lastCallData = CallHookData({
      amount: _amount,
      stealthAddr: _stealthAddr,
      acceptor: _acceptor,
      tokenAddr: _tokenAddr,
      sponsor: _sponsor,
      sponsorFee: _sponsorFee,
      data: _data
    });

    // IERC20(_tokenAddr).approve(address(_acceptor), 10*1e18);

    IERC20(_tokenAddr).transfer(address(0x202204), _amount);
    // this.gm();

  }

  function gm() public view returns(address) {
    return msg.sender;
  }
}