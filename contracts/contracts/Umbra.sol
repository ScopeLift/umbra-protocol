pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";

contract Umbra is Ownable {

    constructor() public {
        initialize(msg.sender);
    }
}
