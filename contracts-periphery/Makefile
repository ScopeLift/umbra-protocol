-include .env
.PHONY: test

forkBlock = 14800081

build :; FOUNDRY_PROFILE=hook forge build
install :; forge install
snapshot :; forge snapshot --match-path test/Gas.sol
test :; forge test --no-match-path test/UniswapWithdrawHook.t.sol && make test-hook
test-hook :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/UniswapWithdrawHook.t.sol
