// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IUmbraHookReceiver} from "src/interface/IUmbraHookReceiver.sol";

interface IUmbra {
  /**
   * @notice Public state variable get function
   * @return uint256 toll
   */
  function toll() external returns (uint256);

  /**
   * @notice Admin only function to update the toll
   * @param _newToll New ETH toll in wei
   */
  function setToll(uint256 _newToll) external;

  /**
   * @notice Admin only function to update the toll collector
   * @param _newTollCollector New address which has fund sweeping privileges
   */
  function setTollCollector(address _newTollCollector) external;

  /**
   * @notice Admin only function to update the toll receiver
   * @param _newTollReceiver New address which receives collected funds
   */
  function setTollReceiver(address payable _newTollReceiver) external;

  /**
   * @notice Function only the toll collector can call to sweep funds to the toll receiver
   */
  function collectTolls() external;

  // ======================
  // ======== Send ========
  // ======================

  /**
   * @notice Send and announce ETH payment to a stealth address
   * @param _receiver Stealth address receiving the payment
   * @param _tollCommitment Exact toll the sender is paying; should equal contract toll;
   * the commitment is used to prevent frontrunning attacks by the owner;
   * see https://github.com/ScopeLift/umbra-protocol/issues/54 for more information
   * @param _pkx X-coordinate of the ephemeral public key used to encrypt the payload
   * @param _ciphertext Encrypted entropy (used to generated the stealth address) and payload
   * extension
   */
  function sendEth(
    address payable _receiver,
    uint256 _tollCommitment,
    bytes32 _pkx, // ephemeral public key x coordinate
    bytes32 _ciphertext
  ) external payable;

  /**
   * @notice Send and announce an ERC20 payment to a stealth address
   * @param _receiver Stealth address receiving the payment
   * @param _tokenAddr Address of the ERC20 token being sent
   * @param _amount Amount of the token to send, in its own base units
   * @param _pkx X-coordinate of the ephemeral public key used to encrypt the payload
   * @param _ciphertext Encrypted entropy (used to generated the stealth address) and payload
   * extension
   */
  function sendToken(
    address _receiver,
    address _tokenAddr,
    uint256 _amount,
    bytes32 _pkx, // ephemeral public key x coordinate
    bytes32 _ciphertext
  ) external payable;

  // ==========================
  // ======== Withdraw ========
  // ==========================

  /**
   * @notice Withdraw an ERC20 token payment sent to a stealth address
   * @dev This method must be directly called by the stealth address
   * @param _acceptor Address where withdrawn funds should be sent
   * @param _tokenAddr Address of the ERC20 token being withdrawn
   */
  function withdrawToken(address _acceptor, address _tokenAddr) external;

  /**
   * @notice Withdraw an ERC20 token payment sent to a stealth address
   * @dev This method must be directly called by the stealth address
   * @param _acceptor Address where withdrawn funds should be sent
   * @param _tokenAddr Address of the ERC20 token being withdrawn
   * @param _hook Contract that will be called after the token withdrawal has completed
   * @param _data Arbitrary data that will be passed to the post-withdraw hook contract
   */
  function withdrawTokenAndCall(
    address _acceptor,
    address _tokenAddr,
    IUmbraHookReceiver _hook,
    bytes memory _data
  ) external;

  /**
   * @notice Withdraw an ERC20 token payment on behalf of a stealth address via signed authorization
   * @param _stealthAddr The stealth address whose token balance will be withdrawn
   * @param _acceptor Address where withdrawn funds should be sent
   * @param _tokenAddr Address of the ERC20 token being withdrawn
   * @param _sponsor Address which is compensated for submitting the withdrawal tx
   * @param _sponsorFee Amount of the token to pay to the sponsor
   * @param _v ECDSA signature component: Parity of the `y` coordinate of point `R`
   * @param _r ECDSA signature component: x-coordinate of `R`
   * @param _s ECDSA signature component: `s` value of the signature
   */
  function withdrawTokenOnBehalf(
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;

  /**
   * @notice Withdraw an ERC20 token payment on behalf of a stealth address via signed authorization
   * @param _stealthAddr The stealth address whose token balance will be withdrawn
   * @param _acceptor Address where withdrawn funds should be sent
   * @param _tokenAddr Address of the ERC20 token being withdrawn
   * @param _sponsor Address which is compensated for submitting the withdrawal tx
   * @param _sponsorFee Amount of the token to pay to the sponsor
   * @param _hook Contract that will be called after the token withdrawal has completed
   * @param _data Arbitrary data that will be passed to the post-withdraw hook contract
   * @param _v ECDSA signature component: Parity of the `y` coordinate of point `R`
   * @param _r ECDSA signature component: x-coordinate of `R`
   * @param _s ECDSA signature component: `s` value of the signature
   */
  function withdrawTokenAndCallOnBehalf(
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    IUmbraHookReceiver _hook,
    bytes memory _data,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external;
}
