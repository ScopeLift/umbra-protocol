// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

contract Umbra is Ownable {
  using SafeMath for uint256;

  string public constant version = "1";
  uint256 public immutable chainId;

  event Announcement(
    address indexed receiver,
    uint256 indexed amount,
    address indexed token,
    bytes32 pkx, // ephemeral public key x coordinate
    bytes32 ciphertext
  );

  event TokenWithdrawal(address indexed receiver, address indexed acceptor, uint256 amount, address indexed token);

  address constant ETH_TOKEN_PLACHOLDER = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

  uint256 public toll;
  address public tollCollector;
  address payable public tollReceiver;
  // stealth address => token address => amount
  mapping(address => mapping(address => uint256)) public tokenPayments;

  constructor(
    uint256 _toll,
    address _tollCollector,
    address payable _tollReceiver
  ) public {
    toll = _toll;
    tollCollector = _tollCollector;
    tollReceiver = _tollReceiver;

    uint256 _chainId;

    assembly {
      _chainId := chainid()
    }

    chainId = _chainId;
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

  function sendEth(
    address payable _receiver,
    uint256 _tollCommitment,
    bytes32 _pkx, // ephemeral public key x coordinate
    bytes32 _ciphertext
  ) public payable {
    require(_tollCommitment == toll, "Umbra: Invalid or outdated toll commitment");
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
    require(tokenPayments[_receiver][_tokenAddr] == 0, "Umbra: Cannot send more tokens to stealth address");

    tokenPayments[_receiver][_tokenAddr] = _amount;
    emit Announcement(_receiver, _amount, _tokenAddr, _pkx, _ciphertext);

    SafeERC20.safeTransferFrom(IERC20(_tokenAddr), msg.sender, address(this), _amount);
  }

  function withdrawToken(address _acceptor, address _tokenAddr) public {
    uint256 amount = tokenPayments[msg.sender][_tokenAddr];

    require(amount > 0, "Umbra: No tokens available for withdrawal");

    delete tokenPayments[msg.sender][_tokenAddr];
    emit TokenWithdrawal(msg.sender, _acceptor, amount, _tokenAddr);

    SafeERC20.safeTransfer(IERC20(_tokenAddr), _acceptor, amount);
  }

  function withdrawTokenOnBehalf(
    address _stealthAddr,
    address _acceptor,
    address _tokenAddr,
    address _sponsor,
    uint256 _sponsorFee,
    uint8 _v,
    bytes32 _r,
    bytes32 _s
  ) external {
    uint256 _amount = tokenPayments[_stealthAddr][_tokenAddr];

    // also protects from underflow
    require(_amount > _sponsorFee, "Umbra: No balance to withdraw or fee exceeds balance");

    bytes32 _digest =
      keccak256(
        abi.encodePacked("\x19Ethereum Signed Message:\n32",
          keccak256(
            abi.encode(
              chainId,
              version,
              _acceptor,
              _tokenAddr,
              _sponsor,
              _sponsorFee
            )
          )
        )
      );

    address _recoveredAddress = ecrecover(_digest, _v, _r, _s);

    require(_recoveredAddress != address(0) && _recoveredAddress == _stealthAddr, "Umbra: Invalid Signature");

    uint256 _withdrawalAmount = _amount - _sponsorFee;
    delete tokenPayments[_stealthAddr][_tokenAddr];
    emit TokenWithdrawal(_stealthAddr, _acceptor, _withdrawalAmount, _tokenAddr);

    SafeERC20.safeTransfer(IERC20(_tokenAddr), _acceptor, _withdrawalAmount);
    SafeERC20.safeTransfer(IERC20(_tokenAddr), _sponsor, _sponsorFee);
  }

  function collectTolls() public onlyCollector {
    tollReceiver.transfer(address(this).balance);
  }

  modifier onlyCollector() {
    require(msg.sender == tollCollector, "Umbra: Not Toll Collector");
    _;
  }
}
