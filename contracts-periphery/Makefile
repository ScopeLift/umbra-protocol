-include .env

forkBlock = 14800081

build :; FOUNDRY_PROFILE=hook forge build
install :; forge install
Test :; FOUNDRY_PROFILE=hook forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-contract WithdrawData -vv