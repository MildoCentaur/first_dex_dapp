const Dex = artifacts.require("Dex")
const USDT = artifacts.require("USDT")
const truffleAssert = require('truffle-assertions')
const assert = require("chai").assert;
truffleAssert.ErrorType.REVERT='Revert'
contract("Dex", accounts=>{
    const USDT_TICKER = web3.utils.fromUtf8("USDT");
    const PRICE = 1; 
    const BUY = 0;
    const SELL = 1;
    
    it("Should throw an error if ticker dosn't exist", async () => {
        let dex = await Dex.deployed();
        await truffleAssert.reverts(
            dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE , {from: accounts[1]}), 
            "Token should be registered first"
        )
    }) 

    it("Should throw an error if ETH balance is too low when creating BUY limit order", async() => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        await dex.registerToken(USDT_TICKER, usdt.address, {from:accounts[0]});
        
        await truffleAssert.reverts(
           dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: accounts[1]}),
           "Sender doesn't have enougth ETH to buy"
        )
        
        await dex.depositEth({value:10,from: accounts[1]});
        await truffleAssert.passes(
            dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: accounts[1]})
        )

    })

    it("should throw an error if TOKEN balance is too low when creating SELL limit order", async () => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        
        await dex.registerToken(USDT_TICKER, usdt.address, {from:accounts[0]});
        
        await truffleAssert.reverts(
            dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE , {from: accounts[1]}),
            "Sender doesn't have enougth TOKEN to sell"
        )
        await usdt.transfer(accounts[1], 500);
        await usdt.approve(dex.address, 500, {from:accounts[1]});
        await dex.deposit(10, USDT_TICKER, {from:accounts[1]});
        await truffleAssert.passes(
            dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE , {from: accounts[1]})
        )
    })

    it("The Buy order book should be ordered on price from highest to lowest starting at index 0", async () => {
        let dex = await Dex.deployed();
        await dex.depositEth({value:100,from: accounts[1]});
        await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: accounts[1]});
        await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE+1 , {from: accounts[1]});
        await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE+2 , {from: accounts[1]});
        let orders  = await dex.getOrderBook(USDT_TICKER, BUY);
        assert(orders.length >0, "there should be 3 orders");
        for(let i=0; i< orders.length-1; i++){
            await  assert(orders[i].price >= orders[i+1].price)
        }  

    })

    it("The Sell order book should be ordered on price from  lowest to highest starting at index 0", async () => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        await usdt.transfer(accounts[1], 500);
        await usdt.approve(dex.address, 500, {from:accounts[1]});
        await dex.deposit(10, USDT_TICKER, {from:accounts[1]});

        await dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE+2 , {from: accounts[1]});
        await dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE+1 , {from: accounts[1]});
        await dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE , {from: accounts[1]});
        let orders  = await dex.getOrderBook(USDT_TICKER, SELL);
        
        assert(orders.length >0, "there should be 3 orders");
        for(let i=0; i< orders.length-1; i++){
            await assert(orders[i].price <= orders[i+1].price)
        }  
    })

    it("createLimitOrder should emit LimitOrderCreated event", async () => {
        let dex = await Dex.deployed();
        let usdt = await USDT.deployed();
        await dex.registerToken(USDT_TICKER, usdt.address, {from:accounts[0]});
        await usdt.transfer(accounts[1], 500);
        await usdt.approve(dex.address, 500, {from:accounts[1]});
        await dex.deposit(10, USDT_TICKER, {from:accounts[1]});
        let createLimitOrder = await dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE+10 , {from: accounts[1]});
        
        truffleAssert.eventEmitted(createLimitOrder, "LimitOrderCreated", (ev) => {
            evTicker = web3.utils.hexToUtf8(ev.ticker) 
            ticker = web3.utils.hexToUtf8(USDT_TICKER)
            return evTicker == ticker && ev.side == SELL && ev.price.toNumber() == PRICE+10  && ev.amount.toNumber() ==1;
        }, 'TestEvent should be emitted with correct parameters');
    });
});

contract("Dex - Market orders", accounts=>{
    const USDT_TICKER = web3.utils.fromUtf8("USDT");
    const ETH_TICKER = web3.utils.fromUtf8("ETH");
    const LINK_TICKER = web3.utils.fromUtf8("LINK");
    const PRICE = 1; 
    const BUY = 0;
    const SELL = 1;
    describe("Market orders creation requirements tests", function(){
        it("Market order should throw an error if ticker dosn't exist", async () => {
            let dex = await Dex.deployed();
            await truffleAssert.reverts(
                dex.createMarketOrder(USDT_TICKER, SELL, 1, {from: accounts[1]}),
                "Token should be registered first"
            )
        });
        
        it("Market order should throw an error if TOKEN balance is too low when creating SELL limit order", async () => {
            let dex = await Dex.deployed();
            let usdt = await USDT.deployed();
            
            await dex.registerToken(USDT_TICKER, usdt.address, {from:accounts[0]});
            
            await truffleAssert.reverts(
                dex.createMarketOrder(USDT_TICKER, SELL, 1, {from: accounts[1]})
            )
            await usdt.transfer(accounts[1], 500);
            await usdt.approve(dex.address, 500, {from:accounts[1]});
            await dex.deposit(10, USDT_TICKER, {from:accounts[1]});
            await truffleAssert.passes(
                dex.createMarketOrder(USDT_TICKER, SELL, 1, {from: accounts[1]})
            )
        });

        it("Market order should throw an error if ETH balance is too low when creating BUY limit order", async() => {
            let dex = await Dex.deployed();

            await dex.createLimitOrder(USDT_TICKER, SELL, 10, PRICE+10 , {from: accounts[1]});

            await truffleAssert.reverts(
                dex.createMarketOrder(USDT_TICKER, BUY, 1, {from: accounts[1]}),
                "Sender doesn't have enougth ETH to buy"
            )

        });
    });
    describe("Market orders functionality tests", function(){
        let dex;
        let usdt;
        const fundingAccount = accounts[0];
        const buyerAccount = accounts[1];
        const sellerAccount = accounts[2];
        const anotherSellerAccount = accounts[3];
        const anotherBuyerAccount = accounts[4];

        let ETHBuyerAccountStartBalance;
        let USDTBuyerAccountStartBalance;
        let USDTAnotherBuyerAccountStartBalance;
        let ETHAnotherBuyerAccountStartBalance;
        let USDTSellerAccountStartBalance;
        let ETHSellerAccountStartBalance;
        let USDTAnotherSellerAccountStartBalance;
        let ETHAnotherSellerAccountStartBalance;

        let ordersBuyStart;
        let ordersSellStart;
        
        // build up and tear down a new Casino contract before each test
        beforeEach(async () => {
            dex = await Dex.new({ from: fundingAccount });
            usdt = await USDT.new({ from: fundingAccount });
            await dex.registerToken(USDT_TICKER, usdt.address, {from:fundingAccount});
            await usdt.transfer(sellerAccount, 500);
            await usdt.approve(dex.address, 500, {from:sellerAccount});
            await dex.deposit(100, USDT_TICKER, {from:sellerAccount});

            await usdt.transfer(anotherSellerAccount, 500);
            await usdt.approve(dex.address, 500, {from:anotherSellerAccount});
            await dex.deposit(100, USDT_TICKER, {from:anotherSellerAccount});

            await dex.depositEth({value:100,from: buyerAccount});
            await dex.depositEth({value:100,from: anotherBuyerAccount});
            
            
            ETHBuyerAccountStartBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHAnotherBuyerAccountStartBalance=(await dex.balances(anotherBuyerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountStartBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();
            ETHAnotherSellerAccountStartBalance=(await dex.balances(anotherSellerAccount, ETH_TICKER)).toNumber();

            USDTBuyerAccountStartBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTAnotherBuyerAccountStartBalance= (await dex.balances(anotherBuyerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountStartBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            USDTAnotherSellerAccountStartBalance= (await dex.balances(anotherSellerAccount, USDT_TICKER)).toNumber();
            
            assert.equal(USDTSellerAccountStartBalance, 100, "sellerAccount USDT start balance should be 100");
            assert.equal(USDTAnotherSellerAccountStartBalance, 100, "AnotherSellerAccount USDT start balance should be 100");
            assert.equal(USDTBuyerAccountStartBalance, 0, "buyerAccount USDT start balance should be 0");
            assert.equal(USDTAnotherBuyerAccountStartBalance, 0, "AnotherBuyerAccount USDT start balance should be 0");

            assert.equal(ETHSellerAccountStartBalance, 0, "sellerAccount ETH start balance should be 0");
            assert.equal(ETHAnotherSellerAccountStartBalance, 0, "AnotherSellerAccount ETH start balance should be 0");
            assert.equal(ETHBuyerAccountStartBalance, 100, "buyerAccount ETH start balance should be 100");
            assert.equal(ETHAnotherBuyerAccountStartBalance, 100, "AnotherBuyerAccount ETH start balance should be 100");
            
            ordersBuyStart  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyStart.length, 0, "Buyer orderbook for ticker should be empty");
            ordersSellStart  = await dex.getOrderBook(USDT_TICKER, SELL);
            assert.equal(ordersSellStart.length, 0, "Seller orderbook for ticker should be empty");
        });

        afterEach(async () => {
            await dex.destroy({ from: fundingAccount });
        });

        //Market orders shouldn't do anything if the orderbook is empty 
        it("Market orders can be submited even if the orderbook is empty", async () => {
            
            let marketOrder = await dex.createMarketOrder(USDT_TICKER, SELL, 1, {from: sellerAccount})
            
            truffleAssert.eventNotEmitted(marketOrder, "MarketOrderMatched", (ev) => { 
                evTicker = web3.utils.hexToUtf8(ev.ticker) 
                ticker = web3.utils.hexToUtf8(USDT_TICKER)
                return evTicker == ticker && ev.side == SELL && ev.price.toNumber() * ev.amount.toNumber() > 1 ;
            }, 'MarketOrderMatched should not have been emitted');
            let orders_after  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(orders_after.length, 0, "orderbook for ticker should remain empty");
            let USDTSellerAccountEndBalance = (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            assert.equal(USDTSellerAccountStartBalance, USDTSellerAccountEndBalance);
        });

        it("Market orders created for exact amount of limit orders", async () => {
            //GIVEN
            await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: anotherBuyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 2, PRICE+10 , {from: buyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 3, PRICE+20 , {from: buyerAccount});
            //Check valid assumptions
            ordersBuyStart  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyStart.length, 3, "orderbook for buy ticker should not be empty");
            
            //TEST
            let marketOrder = await dex.createMarketOrder(USDT_TICKER, SELL, 3, {from: sellerAccount});

            //THEN
            truffleAssert.eventEmitted(marketOrder, "MarketOrderMatched", (ev) => {
                evTicker = web3.utils.hexToUtf8(ev.ticker) 
                ticker = web3.utils.hexToUtf8(USDT_TICKER)
                return evTicker == ticker && ev.side == SELL && ev.price.toNumber() == 21  && ev.amount.toNumber() ==3;
            }, 'MarketOrderMatched should have been emitted');

            ETHBuyerAccountEndBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHAnotherBuyerAccountEndBalance=(await dex.balances(anotherBuyerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountEndBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();

            USDTBuyerAccountEndBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTAnotherBuyerAccountEndBalance= (await dex.balances(anotherBuyerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountEndBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            let ordersBuyEnd  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyEnd.length, ordersBuyStart.length -1, "orderbook for ticker should be one less");
            assert.equal(USDTSellerAccountEndBalance + 3 , USDTSellerAccountStartBalance, "Seller account should end with 3 USDT less");
            assert.equal(USDTBuyerAccountEndBalance , USDTBuyerAccountStartBalance +3, "Buyer account should end with 3 USDT more than started");
            assert.equal(ETHSellerAccountStartBalance + (PRICE+20) * 3, ETHSellerAccountEndBalance);
            assert.equal(ETHBuyerAccountStartBalance - (PRICE+20) * 3, ETHBuyerAccountEndBalance);

            assert.equal(ETHAnotherBuyerAccountStartBalance, ETHAnotherBuyerAccountEndBalance);
            assert.equal(USDTAnotherBuyerAccountStartBalance, USDTAnotherBuyerAccountEndBalance);
            
        });

        it("Market orders created for bigger amount of tokens than limit orders created", async () => {
            
            //GIVEN
            await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: anotherBuyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 2, PRICE+10 , {from: buyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 3, PRICE+20 , {from: buyerAccount});
            //Check valid assumptions
            ordersBuyStart  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyStart.length, 3, "orderbook for buy ticker should contain 3 orders");
            
            //TEST
            let marketOrder = await dex.createMarketOrder(USDT_TICKER, SELL, 7, {from: sellerAccount});

            //THEN
            truffleAssert.eventEmitted(marketOrder, "MarketOrderMatched", (ev) => {
                let evTicker = web3.utils.hexToUtf8(ev.ticker); 
                let ticker = web3.utils.hexToUtf8(USDT_TICKER);
                let checkTickerAndSide = evTicker == ticker && ev.side == SELL;
                return checkTickerAndSide && (ev.price.toNumber() == 21  && ev.amount.toNumber() ==3) || 
                (ev.price.toNumber() == 11  && ev.amount.toNumber() ==2) || (ev.price.toNumber() == 1  && ev.amount.toNumber() ==1)
                ;
            }, 'MarketOrderMatched should have been emitted');
            
            ETHBuyerAccountEndBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHAnotherBuyerAccountEndBalance=(await dex.balances(anotherBuyerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountEndBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();

            USDTBuyerAccountEndBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTAnotherBuyerAccountEndBalance= (await dex.balances(anotherBuyerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountEndBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            ordersBuyEnd  = await dex.getOrderBook(USDT_TICKER, BUY);

            assert.equal(ordersBuyEnd.length, 0, "orderbook for ticker should be one less");
            assert.equal(USDTSellerAccountEndBalance + 6 , USDTSellerAccountStartBalance, "Seller account should end with 3 USDT less");
            assert.equal(USDTBuyerAccountEndBalance , USDTBuyerAccountStartBalance +5, "Buyer account should end with 3 USDT more than started");
            assert.equal(ETHSellerAccountStartBalance + (PRICE+20) * 3 + (PRICE + 10)*2 + PRICE, ETHSellerAccountEndBalance, "ETH Seller balance");
            assert.equal(ETHBuyerAccountStartBalance - (PRICE+20) * 3 - (PRICE + 10)*2, ETHBuyerAccountEndBalance, "ETH Buyer balance");
            assert.equal(ETHAnotherBuyerAccountStartBalance - PRICE, ETHAnotherBuyerAccountEndBalance, "Another buyer should have - PRICE in the ETH account");
            assert.equal(USDTAnotherBuyerAccountStartBalance + 1, USDTAnotherBuyerAccountEndBalance, "Another should end with 1 USDT more");
        });

        it("Market orders should be filled until the order book is empty ", async () => {
            
            //GIVEN
            await dex.createLimitOrder(USDT_TICKER, BUY, 1, PRICE , {from: anotherBuyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 2, PRICE+10 , {from: buyerAccount});
            await dex.createLimitOrder(USDT_TICKER, BUY, 3, PRICE+20 , {from: buyerAccount});
            //Check valid assumptions
            ordersBuyStart  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyStart.length, 3, "orderbook for buy ticker should not be empty");
            
            //TEST
            let marketOrder = await dex.createMarketOrder(USDT_TICKER, SELL, 10, {from: sellerAccount});

            //THEN
            truffleAssert.eventEmitted(marketOrder, "MarketOrderMatched", (ev) => {
                let evTicker = web3.utils.hexToUtf8(ev.ticker); 
                let ticker = web3.utils.hexToUtf8(USDT_TICKER);
                let checkTickerAndSide = evTicker == ticker && ev.side == SELL;
                return checkTickerAndSide && (ev.price.toNumber() == 21  && ev.amount.toNumber() ==3) || 
                (ev.price.toNumber() == 11  && ev.amount.toNumber() ==2) || (ev.price.toNumber() == 1  && ev.amount.toNumber() ==1);
            }, 'MarketOrderMatched should have been emitted');

            ETHBuyerAccountEndBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHAnotherBuyerAccountEndBalance=(await dex.balances(anotherBuyerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountEndBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();

            USDTBuyerAccountEndBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTAnotherBuyerAccountEndBalance= (await dex.balances(anotherBuyerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountEndBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            ordersBuyEnd  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyEnd.length, 0, "orderbook for ticker should be 0");
            assert.equal(USDTSellerAccountEndBalance + 6 , USDTSellerAccountStartBalance, "Seller account should end with 6 USDT less");
            assert.equal(USDTBuyerAccountEndBalance , USDTBuyerAccountStartBalance +5, "Buyer account should end with 5 USDT more than started");
            assert.equal(ETHSellerAccountStartBalance + (PRICE+20) * 3 + (PRICE + 10)* 2 + PRICE, ETHSellerAccountEndBalance);
            assert.equal(ETHBuyerAccountStartBalance - (PRICE+20) * 3 - (PRICE + 10)* 2, ETHBuyerAccountEndBalance);
            assert.equal(ETHAnotherBuyerAccountStartBalance - PRICE, ETHAnotherBuyerAccountEndBalance);
            assert.equal(USDTAnotherBuyerAccountStartBalance + 1, USDTAnotherBuyerAccountEndBalance);
        });
    });
    describe("Market orders BUY functionality tests", function(){
        let dex;
        let usdt;
        const fundingAccount = accounts[0];
        const buyerAccount = accounts[1];
        const sellerAccount = accounts[2];
        const anotherSellerAccount = accounts[3];
        
        let ETHBuyerAccountStartBalance;
        let USDTBuyerAccountStartBalance;
        let USDTSellerAccountStartBalance;
        let ETHSellerAccountStartBalance;
        let USDTAnotherSellerAccountStartBalance;
        let ETHAnotherSellerAccountStartBalance;

        let ordersBuyStart;
        let ordersSellStart;
        
        // build up and tear down a new Casino contract before each test
        beforeEach(async () => {
            dex = await Dex.new({ from: fundingAccount });
            usdt = await USDT.new({ from: fundingAccount });
            await dex.registerToken(USDT_TICKER, usdt.address, {from:fundingAccount});
            await usdt.transfer(sellerAccount, 500);
            await usdt.approve(dex.address, 500, {from:sellerAccount});
            await dex.deposit(100, USDT_TICKER, {from:sellerAccount});
            await usdt.transfer(anotherSellerAccount, 500);
            await usdt.approve(dex.address, 500, {from:anotherSellerAccount});
            await dex.deposit(100, USDT_TICKER, {from:anotherSellerAccount});
            await dex.depositEth({value:1000,from: buyerAccount});
            
            ETHBuyerAccountStartBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountStartBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();
            ETHAnotherSellerAccountStartBalance= (await dex.balances(anotherSellerAccount, ETH_TICKER)).toNumber();
            USDTBuyerAccountStartBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountStartBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            USDTAnotherSellerAccountStartBalance= (await dex.balances(anotherSellerAccount, USDT_TICKER)).toNumber();
            assert.equal(USDTSellerAccountStartBalance, 100, "sellerAccount USDT start balance should be 100");
            assert.equal(USDTAnotherSellerAccountStartBalance, 100, "AnotherSellerAccount USDT start balance should be 100");
            assert.equal(USDTBuyerAccountStartBalance, 0, "buyerAccount USDT start balance should be 0");
            assert.equal(ETHSellerAccountStartBalance, 0, "sellerAccount ETH start balance should be 0");
            assert.equal(ETHAnotherSellerAccountStartBalance, 0, "AnotherSellerAccount ETH start balance should be 0");
            assert.equal(ETHBuyerAccountStartBalance, 1000, "buyerAccount ETH start balance should be 100");
            ordersBuyStart  = await dex.getOrderBook(USDT_TICKER, BUY);
            assert.equal(ordersBuyStart.length, 0, "Buyer orderbook for ticker should be empty");
            ordersSellStart  = await dex.getOrderBook(USDT_TICKER, SELL);
            assert.equal(ordersSellStart.length, 0, "Seller orderbook for ticker should be empty");
        });

        afterEach(async () => {
            await dex.destroy({ from: fundingAccount });
        });

        it("Market orders should be filled until the order book is empty ", async () => {
            
            //GIVEN
            await dex.createLimitOrder(USDT_TICKER, SELL, 1, PRICE , {from: anotherSellerAccount});
            await dex.createLimitOrder(USDT_TICKER, SELL, 2, PRICE+10 , {from: sellerAccount});
            await dex.createLimitOrder(USDT_TICKER, SELL, 3, PRICE+20 , {from: sellerAccount});
            //Check valid assumptions
            ordersSellStart  = await dex.getOrderBook(USDT_TICKER, SELL);
            assert.equal(ordersSellStart.length, 3, "orderbook for buy ticker should not be empty");
            
            //TEST
            let marketOrder = await dex.createMarketOrder(USDT_TICKER, BUY, 2, {from: buyerAccount});

            //THEN
            truffleAssert.eventEmitted(marketOrder, "MarketOrderMatched", (ev) => {
                let evTicker = web3.utils.hexToUtf8(ev.ticker); 
                let ticker = web3.utils.hexToUtf8(USDT_TICKER);
                let checkTickerAndSide = evTicker == ticker && ev.side == BUY;
                return checkTickerAndSide && (ev.price.toNumber() == 1  && ev.amount.toNumber() ==1) || 
                (ev.price.toNumber() == 11  && ev.amount.toNumber() ==1);
            }, 'MarketOrderMatched should have been emitted');

            ETHBuyerAccountEndBalance = (await dex.balances(buyerAccount, ETH_TICKER)).toNumber();
            ETHAnotherSellerAccountEndBalance=(await dex.balances(anotherSellerAccount, ETH_TICKER)).toNumber();
            ETHSellerAccountEndBalance= (await dex.balances(sellerAccount, ETH_TICKER)).toNumber();

            USDTBuyerAccountEndBalance= (await dex.balances(buyerAccount, USDT_TICKER)).toNumber();
            USDTAnotherSellerAccountEndBalance= (await dex.balances(anotherSellerAccount, USDT_TICKER)).toNumber();
            USDTSellerAccountEndBalance= (await dex.balances(sellerAccount, USDT_TICKER)).toNumber();
            
            let ordersSellEnd  = await dex.getOrderBook(USDT_TICKER, SELL);
            
            assert.equal(ordersSellEnd.length, 2, "orderbook for ticker should be 2");
            assert.equal(USDTSellerAccountEndBalance, USDTSellerAccountStartBalance - 1, "Seller account should end with 1 USDT less");
            assert.equal(USDTAnotherSellerAccountEndBalance, USDTAnotherSellerAccountStartBalance - 1, "Another Seller account should end with 1 USDT less");
            assert.equal(USDTBuyerAccountEndBalance , USDTBuyerAccountStartBalance + 2, "Buyer account should end with 2 USDT more than started");
            
            assert.equal(ETHSellerAccountStartBalance + (PRICE + 10), ETHSellerAccountEndBalance, "Seller account should end with 10 ETH more");
            assert.equal(ETHAnotherSellerAccountStartBalance + PRICE, ETHAnotherSellerAccountEndBalance, "Another Seller account should end with 1 ETH more");
            assert.equal(ETHBuyerAccountStartBalance - (PRICE + 10) - PRICE, ETHBuyerAccountEndBalance);
            
        });
    });
});

