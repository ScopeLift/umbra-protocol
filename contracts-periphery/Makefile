.PHONY: test

ifeq (${SKIP_FORGE}, true)
  INSTALL_CMD := echo skip forge install
else
  INSTALL_CMD := forge install
endif

build :; forge build
clean :; forge clean
install :; $(INSTALL_CMD)
snapshot :; forge snapshot --match-path test/UmbraBatchSend.gas.t.sol
test :; forge test