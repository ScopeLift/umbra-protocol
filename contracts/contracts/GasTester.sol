pragma solidity ^0.5.0;

contract GasTester {

    event ManyBytes(address indexed sender, address indexed token, uint256 indexed amount, bytes32 b1, bytes32 b2, bytes32 b3, bytes32 b4, bytes32 b5, bytes32 b6, bytes32 b7);

    function manyBytes(bytes32 b1,
                        bytes32 b2,
                        bytes32 b3,
                        bytes32 b4,
                        bytes32 b5,
                        bytes32 b6,
                        bytes32 b7
                    )
                    public
                    payable
    {
        emit ManyBytes(msg.sender, address(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee), msg.value, b1, b2, b3, b4, b5, b6, b7);
    }
}
