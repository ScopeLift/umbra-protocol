pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";

contract Umbra is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    event Announcement(
        address indexed receiver,
        uint256 indexed amount,
        address indexed token,
        bytes16 iv,  // Inivitalization Vector
        bytes32 pk0, // Ephemeral Public Key
        bytes32 pk1,
        bytes32 ct0, // Ciphertext
        bytes32 ct1,
        bytes32 ct2,
        bytes32 mac // Message Authetnication Code
    );

    uint256 public toll;
    address public tollCollector;
    address payable public tollReceiver;

    constructor(uint256 _toll, address _tollCollector, address payable _tollReceiver) public {
        initialize(msg.sender);
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

    function sendEth(
            address payable _receiver,
            bytes16 _iv,  // Inivitalization Vector
            bytes32 _pk0, // Ephemeral Public Key
            bytes32 _pk1,
            bytes32 _ct0, // Ciphertext
            bytes32 _ct1,
            bytes32 _ct2,
            bytes32 _mac // Message Authetnication Code
        )
        public
        payable
        nonReentrant
    {
        require(msg.value > toll, "Umbra: Must pay more than the toll");

        uint256 amount = msg.value.sub(toll);
        emit Announcement(_receiver, amount, address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE), _iv, _pk0, _pk1, _ct0, _ct1, _ct2, _mac);

        _receiver.transfer(amount);
    }

    function sendToken(
            address _receiver,
            address _tokenAddr,
            uint256 _amount,
            bytes16 _iv,  // Inivitalization Vector
            bytes32 _pk0, // Ephemeral Public Key
            bytes32 _pk1,
            bytes32 _ct0, // Ciphertext
            bytes32 _ct1,
            bytes32 _ct2,
            bytes32 _mac // Message Authetnication Code
        )
        public
        payable
        nonReentrant
    {
        require(msg.value == toll, "Umbra: Must pay the exact toll");

        emit Announcement(_receiver, _amount, _tokenAddr, _iv, _pk0, _pk1, _ct0, _ct1, _ct2, _mac);

        SafeERC20.safeTransferFrom(IERC20(_tokenAddr), msg.sender, _receiver, _amount);
    }

    function collectTolls() public onlyCollector nonReentrant {
        tollReceiver.transfer(address(this).balance);
    }

    modifier onlyCollector() {
        require(msg.sender == tollCollector, "Umbra: Not Toll Collector");
        _;
    }
}
