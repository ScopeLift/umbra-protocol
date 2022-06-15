-include .env
.PHONY: test

ifeq (${SKIP_FORGE}, true)
  INSTALL_CMD := echo skip forge install
else
  INSTALL_CMD := forge install
endif

forkBlock = 14800081

build :; forge build
clean :; forge clean
install :; $(INSTALL_CMD)
snapshot :; forge snapshot -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path *.gas.t.sol
test :; make test-contracts test-gas
test-contracts :; make test-batch-send test-uniswap-hook
test-gas :; make test-batch-send-gas test-uniswap-hook-gas
test-batch-send :; forge test --match-path test/UmbraBatchSend.t.sol
test-uniswap-hook :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/UniswapWithdrawHook.fork.1.t.sol
test-batch-send-gas :; forge test --match-path test/gas/UmbraBatchSend.gas.t.sol
test-uniswap-hook-gas :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/gas/UniswapWithdrawHook.fork.1.gas.t.sol