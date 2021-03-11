// SPDX-License-Identifier: MIT

pragma solidity ^0.6.12;

interface UmbraHookable {

    function callHook (
        uint256 _amount,
        address _stealthAddr,
        address _acceptor,
        address _tokenAddr,
        address _sponsor,
        uint256 _sponsorFee,
        bytes memory _data
    ) external;
}