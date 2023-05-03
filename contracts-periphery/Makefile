-include .env
.PHONY: test

ifeq (${SKIP_FORGE}, true)
  INSTALL_CMD := echo skip forge install
else
  INSTALL_CMD := forge install
endif

build :; forge build
clean :; forge clean
install :; $(INSTALL_CMD)
test :; forge test --nmc DeployBatchSendTest && make test-scripts
test-gas :; forge test --match-path *.gas.t.sol
test-scripts :; forge test --mc DeployBatchSendTest --sender 0x4f78F7f3482D9f1790649f9DD18Eec5A1Cc70F86
snapshot-gas :; forge test --match-path *.gas.t.sol --gas-report > snapshot/.gas
coverage :; forge coverage --report lcov --report summary && sed -i'.bak' 's/SF:/SF:contracts-periphery\//gI' lcov.info
