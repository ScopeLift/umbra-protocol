// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import "forge-std/Script.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract Deploy is Script {
  address constant UMBRA = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  function run() public {
    vm.broadcast();
    UmbraBatchSend batchSend = new UmbraBatchSend(IUmbra(umbraAddress));
    console2.log("batchSend Address: ", address(batchSend));
  }
}
