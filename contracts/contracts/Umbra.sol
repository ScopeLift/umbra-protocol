// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";
import "@opengsn/gsn/contracts/interfaces/IKnowForwarderAddress.sol";
import "@opengsn/gsn/contracts/interfaces/IRelayHub.sol";

contract Umbra is BaseRelayRecipient, IKnowForwarderAddress, Ownable {
  using SafeMath for uint256;

  struct TokenPayment {
    address token;
    uint256 amount;
  }

  event Announcement(
    address indexed receiver,
    uint256 indexed amount,
    address indexed token,
    bytes32 pkx, // ephemeral public key x coordinate
    bytes32 ciphertext
  );

  event TokenWithdrawal(
    address indexed receiver,
    address indexed acceptor,
    uint256 amount,
    address indexed token
  );

  address constant ETH_TOKEN_PLACHOLDER = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  uint256 public toll;
  address public tollCollector;
  address payable public tollReceiver;
  mapping(address => TokenPayment) tokenPayments;

  constructor(
    uint256 _toll,
    address _tollCollector,
    address payable _tollReceiver,
    address _gsnForwarder
  ) public {
    toll = _toll;
    tollCollector = _tollCollector;
    tollReceiver = _tollReceiver;
    trustedForwarder = _gsnForwarder;
  }

  function setToll(uint256 _newToll) public onlyOwner {
    toll = _newToll;
  }

  function setTollCollector(address _newTollCollector) public onlyOwner {
    tollCollector = _newTollCollector;
  }

  function setTollReceiver(address payable _newTollReceiver) public onlyOwner {
    tollReceiver = _newTollReceiver;
  }

  function setForwarder(address _forwarder) public onlyOwner {
    trustedForwarder = _forwarder;
  }

  function getTrustedForwarder() external view override returns (address) {
    return trustedForwarder;
  }

  function versionRecipient() external view override returns (string memory) {
    return "1.0.0";
  }

  function sendEth(
    address payable _receiver,
    bytes32 _pkx, // ephemeral public key x coordinate
    bytes32 _ciphertext
  ) public payable {
    require(msg.value > toll, "Umbra: Must pay more than the toll");

    uint256 amount = msg.value.sub(toll);
    emit Announcement(_receiver, amount, ETH_TOKEN_PLACHOLDER, _pkx, _ciphertext);

    _receiver.transfer(amount);
  }

  function sendToken(
    address _receiver,
    address _tokenAddr,
    uint256 _amount,
    bytes32 _pkx, // ephemeral public key x coordinate
    bytes32 _ciphertext
  ) public payable {
    require(msg.value == toll, "Umbra: Must pay the exact toll");
    require(
      tokenPayments[_receiver].amount == 0,
      "Umbra: Cannot send more tokens to stealth address"
      );

    tokenPayments[_receiver] = TokenPayment({token: _tokenAddr, amount: _amount});
    emit Announcement(_receiver, _amount, _tokenAddr, _pkx, _ciphertext);

    SafeERC20.safeTransferFrom(IERC20(_tokenAddr), _msgSender(), address(this), _amount);
  }

  function withdrawToken(address _acceptor) public {
    uint256 amount = tokenPayments[_msgSender()].amount;
    address tokenAddr = tokenPayments[_msgSender()].token;

    require(amount > 0, "Umbra: No tokens available for withdrawal");

    delete tokenPayments[_msgSender()];
    emit TokenWithdrawal(_msgSender(), _acceptor, amount, tokenAddr);

    SafeERC20.safeTransfer(IERC20(tokenAddr), _acceptor, amount);
  }

  function withdrawMeta(
    address _stealthAddr,
    address _sponsor,
    address _acceptor,
    uint256 _sponsorFee,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    uint256 _amount = tokenPayments[_stealthAddr].amount;
    address _tokenAddr = tokenPayments[_stealthAddr].token;

    require(_amount > 0, "Umbra: No tokens available for withdrawal");
    // also protects from underflow
    require(_amount > _sponsorFee, "Umbra: Relay fee exceeds balance");

    bytes32 _digest = keccak256(
      abi.encodePacked(
        "\x19Ethereum Signed Message:\n32",
        keccak256(
          abi.encode(
            _sponsor,
            _acceptor,
            _sponsorFee
          )
        )
      )
    );

    address _recoveredAddress = ecrecover(_digest, _v, _r, _s);

    require(
      _recoveredAddress != address(0) && _recoveredAddress == _stealthAddr,
      'Umbra: Invalid Signature'
    );

    uint256 _withdrawalAmount = _amount - _sponsorFee;
    delete tokenPayments[_stealthAddr];
    emit TokenWithdrawal(_stealthAddr, _acceptor, _withdrawalAmount, _tokenAddr);

    SafeERC20.safeTransfer(IERC20(_tokenAddr), _acceptor, _withdrawalAmount);
    SafeERC20.safeTransfer(IERC20(_tokenAddr), _sponsor, _sponsorFee);
  }

  function _msgSender()
    internal
    view
    override(Context, BaseRelayRecipient)
    returns (address payable)
  {
    return BaseRelayRecipient._msgSender();
  }

  function collectTolls() public onlyCollector {
    tollReceiver.transfer(address(this).balance);
  }

  modifier onlyCollector() {
    require(_msgSender() == tollCollector, "Umbra: Not Toll Collector");
    _;
  }
}
