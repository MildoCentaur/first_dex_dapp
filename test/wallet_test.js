const Dex = artifacts.require("Dex")
const USDT = artifacts.require("USDT")
const { ErrorType } = require('truffle-assertions');
const truffleAssert = require('truffle-assertions')
contract("Wallet", accounts=>{
    const USDT_TICKER = web3.utils.fromUtf8("USDT");
    const ETH_TICKER = web3.utils.fromUtf8("ETH");
    it("Should only be possible for owner to add tokens", async() => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        
        await truffleAssert.passes(
             dex.registerToken(USDT_TICKER, usdt.address, {from: accounts[0]})
        )
   
        await truffleAssert.reverts(
             dex.registerToken(USDT_TICKER, usdt.address, {from: accounts[1]})
        )
    })

    it("Should handle deposits correctly", async() => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        
        await usdt.approve(dex.address, 500);
        await dex.deposit(100, USDT_TICKER);
        let balance = (await dex.balances(accounts[0], USDT_TICKER)).toNumber();
        assert.equal(balance, 100);

    })

    
    it("Should handle falty withdrawals correctly", async() => {
        let dex = await Dex.deployed();
        let balance = (await dex.balances(accounts[0], USDT_TICKER)).toNumber();
        await truffleAssert.fails(dex.withdraw(600, USDT_TICKER),ErrorType.REVERT, "balance should be bigger thant the amount");
      
    })

    it("Should handle withdrawals correctly", async() => {
        let dex = await Dex.deployed();
        let balance = (await dex.balances(accounts[0], USDT_TICKER)).toNumber();
        await dex.withdraw(100, USDT_TICKER, {from: accounts[0]});
        let newBalance = (await dex.balances(accounts[0], USDT_TICKER)).toNumber();
        assert.equal(newBalance, balance - 100, "account should have 100 less in the balance");
    })
})