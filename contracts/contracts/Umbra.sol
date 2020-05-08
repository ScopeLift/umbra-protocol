pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

contract Umbra is Ownable {

    event Announcement(address indexed receiver, uint256 indexed amount, string note);

    uint256 public toll;

    constructor(uint256 _toll) public {
        initialize(msg.sender);
        toll = _toll;
    }

    function setToll(uint256 _newToll) public onlyOwner {
        toll = _newToll;
    }

    function sendEth(address payable _receiver, string memory _announcement) public payable {
        uint256 payment = msg.value - toll;

        emit Announcement(_receiver, payment, _announcement);

        _receiver.transfer(payment);
    }
}
