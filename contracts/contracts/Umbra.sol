pragma solidity ^0.6.2;

import "@openzeppelin/contracts-ethereum-package/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";
import "@opengsn/gsn/contracts/interfaces/IRelayHub.sol";

contract Umbra is BaseRelayRecipient, OwnableUpgradeSafe {
    using SafeMath for uint256;

    struct Payment {
        address token;
        uint256 amount;
    }

    event Announcement(
        address indexed receiver,
        uint256 indexed amount,
        address indexed token,
        bytes16 iv,  // Inivitalization Vector
        bytes32 pkx, // Ephemeral Public Key
        bytes32 pky,
        bytes32 ct0, // Ciphertext
        bytes32 ct1,
        bytes32 ct2,
        bytes32 mac // Message Authetnication Code
    );

    event Withdrawl(
        address indexed receiver,
        uint256 indexed amount,
        address indexed token
    );

    address constant ETH_TOKEN_PLACHOLDER = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    uint256 public toll;
    address public tollCollector;
    address payable public tollReceiver;
    mapping (address => Payment) payments;

    constructor(uint256 _toll, address _tollCollector, address payable _tollReceiver) public {
        __Ownable_init();
        toll = _toll;
        tollCollector = _tollCollector;
        tollReceiver = _tollReceiver;
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

    function sendEth(
            address payable _receiver,
            bytes16 _iv,  // Inivitalization Vector
            bytes32 _pkx, // Ephemeral Public Key
            bytes32 _pky,
            bytes32 _ct0, // Ciphertext
            bytes32 _ct1,
            bytes32 _ct2,
            bytes32 _mac // Message Authetnication Code
        )
        public
        payable
    {
        require(msg.value > toll, "Umbra: Must pay more than the toll");

        uint256 amount = msg.value.sub(toll);
        emit Announcement(_receiver, amount, ETH_TOKEN_PLACHOLDER, _iv, _pkx, _pky, _ct0, _ct1, _ct2, _mac);

        _receiver.transfer(amount);
    }

    function sendToken(
            address _receiver,
            address _tokenAddr,
            uint256 _amount,
            bytes16 _iv,  // Inivitalization Vector
            bytes32 _pkx, // Ephemeral Public Key
            bytes32 _pky,
            bytes32 _ct0, // Ciphertext
            bytes32 _ct1,
            bytes32 _ct2,
            bytes32 _mac // Message Authetnication Code
        )
        public
        payable
    {
        require(msg.value == toll, "Umbra: Must pay the exact toll");

        payments[_receiver] = Payment({token: _tokenAddr, amount: _amount});
        emit Announcement(_receiver, _amount, _tokenAddr, _iv, _pkx, _pky, _ct0, _ct1, _ct2, _mac);

        SafeERC20.safeTransferFrom(IERC20(_tokenAddr), _msgSender(), address(this), _amount);
    }

    function withdrawToken() public {
        uint256 amount = payments[_msgSender()].amount;
        address tokenAddr = payments[_msgSender()].token;

        require(
            (amount > 0) && (tokenAddr != address(0)) && (tokenAddr != ETH_TOKEN_PLACHOLDER),
            "Umbra: No tokens available for withdrawl"
        );

        delete payments[_msgSender()];
        emit Withdrawl(_msgSender(), amount, tokenAddr);

        SafeERC20.safeTransfer(IERC20(tokenAddr), _msgSender(), amount);
    }

    function _msgSender() internal override(ContextUpgradeSafe, BaseRelayRecipient) view returns (address payable) {
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
