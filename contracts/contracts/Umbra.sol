pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

contract Umbra is Ownable {

    uint256 public toll;

    constructor(uint256 _toll) public {
        initialize(msg.sender);
        toll = _toll;
    }

    function setToll(uint256 _newToll) public onlyOwner {
        toll = _newToll;
    }
}
