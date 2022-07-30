const Dex = artifacts.require("Dex");
const USDT = artifacts.require("USDT");

module.exports = async function (deployer, network, accounts) {
  await deployer.deploy(Dex);
  await deployer.deploy(USDT);
  // IT IS BETTER TO LEAVE THE LOGIC TO THE TESTS
  // let dex = await Dex.deployed();
  // let usdt = await USDT.deployed();
  // await usdt.approve(dex.address, 500);
  // await dex.registerToken(web3.utils.fromUtf8("USDT"), usdt.address);
  // await dex.deposit(100, web3.utils.fromUtf8("USDT"));
  // let balanceOfLink = (await dex.balances(accounts[0], web3.utils.fromUtf8("USDT"))).toNumber();
  // console.log(balanceOfLink);
};




