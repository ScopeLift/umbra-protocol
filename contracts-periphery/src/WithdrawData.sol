// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
pragma abicoder v2;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import '@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol';
import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';

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

interface WETH {
  function withdraw(uint wad) external;
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
  ISwapRouter public immutable swapRouter;

  address public immutable DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
  address public constant WETH9 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
  uint24 public constant poolFee = 3000;

  constructor(IUmbra _umbra, ISwapRouter _swapRouter) {
  umbra = _umbra;
  swapRouter = _swapRouter;
  }

  // Function to receive Ether. msg.data must be empty
  receive() external payable {}

  // Fallback function is called when msg.data is not empty
  fallback() external payable {}

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
    // lastCallData = CallHookData({
    //   amount: _amount,
    //   stealthAddr: _stealthAddr,
    //   acceptor: _acceptor,
    //   tokenAddr: _tokenAddr,
    //   sponsor: _sponsor,
    //   sponsorFee: _sponsorFee,
    //   data: _data
    // });

    // IERC20(_tokenAddr).approve(address(this), 1000 ether);
    // IERC20(_tokenAddr).transferFrom(msg.sender, address(this), _amount);

    // this.gm();
    swapForEth(_amount, _stealthAddr, _acceptor, _tokenAddr, _data);

  }

  function swapForEth(uint256 amountIn, address _stealthAddr, address _acceptor, address _tokenAddr, bytes memory _data) internal returns (uint256 amountOut) {
    // msg.sender must approve this contract

    // Transfer the specified amount of DAI to this contract.
    // TransferHelper.safeTransferFrom(DAI, msg.sender, address(this), amountIn);

    (address dest, uint256 swapAmount) = abi.decode(_data, (address, uint256));


    uint256 senderBalance = amountIn - swapAmount;
    // Approve the router to spend DAI.
    TransferHelper.safeApprove(_tokenAddr, address(swapRouter), amountIn);

    // Naively set amountOutMinimum to 0. In production, use an oracle or other data source to choose a safer value for amountOutMinimum.
    // We also set the sqrtPriceLimitx96 to be 0 to ensure we swap our exact input amount.
    ISwapRouter.ExactInputSingleParams memory params =
      ISwapRouter.ExactInputSingleParams({
        tokenIn: _tokenAddr,
        tokenOut: WETH9,
        fee: poolFee,
        recipient: _acceptor,
        deadline: block.timestamp,
        amountIn: swapAmount,
        amountOutMinimum: 0,  // Change this
        sqrtPriceLimitX96: 0
      });
      // The call to `exactInputSingle` executes the swap.
      amountOut = swapRouter.exactInputSingle(params);

      WETH(WETH9).withdraw(amountOut);
      (bool sent, bytes memory data) = dest.call{value: amountOut}("");
      require(sent, "Failed to send Ether");

      IERC20(_tokenAddr).transfer(dest, senderBalance);

    }

  function gm() public view returns(address) {
    return msg.sender;
  }
}