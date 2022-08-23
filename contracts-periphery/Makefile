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
test :; forge test
test-gas :; forge test --match-path *.gas.t.sol
snapshot-gas :; forge test --match-path *.gas.t.sol --gas-report > snapshot/.gas
