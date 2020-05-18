pragma solidity ^0.6.2;
pragma experimental ABIEncoderV2;

import "@opengsn/gsn/contracts/BasePaymaster.sol";

contract UmbraPaymaster is BasePaymaster {

    address public umbraAddr;

    constructor(address _umbraAddr) public {
        umbraAddr = _umbraAddr;
    }

    function acceptRelayedCall(
		GSNTypes.RelayRequest calldata relayRequest  ,
		bytes calldata approvalData,
		uint256 maxPossibleGas
	) external view override returns (bytes memory context) {
		(approvalData, maxPossibleGas);  // avoid a warning

		require(relayRequest.target == umbraAddr, "UmbraPaymaster: Not Target");

		return abi.encode(0x0);
	}

    function preRelayedCall(
		bytes calldata context
	) external relayHubOnly override returns(bytes32) {
		return bytes32(0);
	}

	function postRelayedCall(
		bytes calldata context,
		bool success,
		bytes32 preRetVal,
		uint256 gasUse,
		GSNTypes.GasData calldata gasData
	) external relayHubOnly override {
		(success, preRetVal, gasUse, gasData);
	}
}
