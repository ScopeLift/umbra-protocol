pragma solidity ^0.5.0;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {

    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
