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
snapshot :; forge snapshot -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path \*.gas.t.sol
snapshot-hook :; forge snapshot -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/gas/UniswapWithdrawHook.fork-1.gas.t.sol
test :; forge test --match-path test/UmbraBatchSend.t.sol && make test-hook
test-hook :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/UniswapWithdrawHook.fork-1.t.sol --match-test "testFuzz_HookTest_10Addrs"
test-hook-50 :; forge test -f ${ETH_RPC_URL} --fork-block-number ${forkBlock} --match-path test/UniswapWithdrawHook.fork-1.t.sol --match-test "testFuzz_HookTest_50Addrs"