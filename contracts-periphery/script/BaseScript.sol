// SPDX-License-Identifier: MIT
pragma solidity ^0.8.16;

import {Script} from "forge-std/Script.sol";
import {UmbraBatchSend} from "src/UmbraBatchSend.sol";
import {IUmbra} from "src/interface/IUmbra.sol";

contract BaseScript is Script {
  address constant UMBRA = 0xFb2dc580Eed955B528407b4d36FfaFe3da685401;

  function deploy() internal {
    vm.broadcast();
    new UmbraBatchSend(IUmbra(UMBRA));
  }
}
