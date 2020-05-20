pragma solidity ^0.6.2;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";


contract TestToken is ERC20UpgradeSafe {
  function mint(address account, uint256 amount) public {
    _mint(account, amount);
  }
}
