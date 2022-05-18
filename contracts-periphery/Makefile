-include .env

forkBlock = 14800081

build :; forge build
install :; forge install
Test :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-contract WithdrawData