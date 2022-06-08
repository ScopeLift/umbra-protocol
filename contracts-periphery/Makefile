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
snapshot :; forge snapshot --match-path test/UmbraBatchSend.gas.t.sol
test :; forge test --no-match-path test/UniswapWithdrawHook.t.sol && make test-hook
test-hook :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/UniswapWithdrawHook.t.sol