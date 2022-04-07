# include .env file and export its env vars
# (-include to ignore error if it does not exist)
-include .env

all: clean remove install update solc build 

# Install proper solc version.
solc:; nix-env -f https://github.com/dapphub/dapptools/archive/master.tar.gz -iA solc-static-versions.solc_0_8_10

# Clean the repo
clean  :; forge clean

# Test your contract on a forked network
test   :; forge test -f ${ETH_RPC_URL} --fork-block-number 10465092

# Remove modules
remove :; rm -rf ../.gitmodules && rm -rf ../.git/modules/* && rm -rf lib"

# Install the Modules
install :; 
	forge install dapphub/ds-test 
	forge install brockelmore/forge-std
	forge install OpenZeppelin/openzeppelin-contracts


# Update Dependencies
update:; forge update

# Builds
build  :; forge clean && forge build --optimize --optimize-runs 1000000

setup-yarn:
	yarn 

local-node: setup-yarn 
	yarn hardhat node 

deploy:
	forge create UmbraBatchSend --private-key ${PRIVATE_KEY} # --rpc-url 