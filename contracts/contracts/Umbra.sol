pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";

contract Umbra is Ownable, ReentrancyGuard {
    using SafeMath for uint256;

    event Announcement(address indexed receiver, uint256 indexed amount, string note);

    uint256 public toll;

    constructor(uint256 _toll) public {
        initialize(msg.sender);
        toll = _toll;
    }

    function setToll(uint256 _newToll) public onlyOwner {
        toll = _newToll;
    }

    function sendEth(address payable _receiver, string memory _announcement) public payable nonReentrant {
        require(msg.value > toll, "Umbra: Must pay more than the toll");

        uint256 payment = msg.value.sub(toll);
        emit Announcement(_receiver, payment, _announcement);

        _receiver.transfer(payment);
    }
}
