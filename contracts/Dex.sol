// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;
pragma experimental ABIEncoderV2;

import "./Wallet.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";


contract Dex is Wallet {
    using SafeMath for uint256;
    using Counters for Counters.Counter;
    using Math for uint;

    enum Side {
        BUY, 
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    } 
    
    //ticker => SELL/BUY =>List of orders
    mapping(bytes32 => mapping (uint => Order[])) public orderBook;
    
    Counters.Counter private counter;
    
    constructor() Wallet(){
        Counters.reset(counter);
    }

    function getOrderBook (bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }
    
    event LimitOrderCreated(bytes32 ticker, Side side, uint amount, uint price);
    
    function createLimitOrder(bytes32 _ticker, Side _side, uint _amount, uint _price ) tokenExist(_ticker) external returns (Order memory){
        if(_side == Side.BUY){
            require(balances[_msgSender()][bytes32("ETH")] >= SafeMath.mul(_amount, _price), "Sender doesn't have enougth ETH to buy"); 
        }
        else if(_side == Side.SELL){
            require(balances[_msgSender()][_ticker] >= _amount, "Sender doesn't have enougth TOKEN to sell");
        }
        Order[] storage orders = orderBook[_ticker][uint(_side)];
        
        Order memory order = Order(Counters.current(counter), _msgSender(), _side, _ticker, _amount, _price, 0);
        
        orders.push(order);
        emit LimitOrderCreated(_ticker, _side, _amount, _price);
        sortArray(orderBook[_ticker][uint(_side)], _side);
        Counters.increment(counter);
        return order;
    }

    event MarketOrderMatched(bytes32 ticker, Side side, uint amount, uint price);

    function createMarketOrder (bytes32 _ticker, Side _side, uint _value ) tokenExist(_ticker) external{
        if(_side == Side.SELL){
            require(balances[_msgSender()][_ticker] >= _value, "Sender doesn't have enougth TOKEN to sell");
        }

        uint other_side = SafeMath.mod(SafeMath.add(uint(_side), 1), 2);
        
        Order[] storage orders = orderBook[_ticker][other_side];
        uint marketOrderFilled = 0;
        bool continueMatchingOrders = true;
        uint index = 0;
        while ( continueMatchingOrders && orders.length > index){
            uint pendingAmount = SafeMath.sub(_value, marketOrderFilled);
            uint amountToFill = Math.min(pendingAmount, orders[index].amount);
            uint valueInEth =0;
            uint priceOrder = orders[index].price;
            uint buyerBalance = 0;
            if(_side == Side.BUY){
                buyerBalance = balances[_msgSender()][bytes32("ETH")];
                require(buyerBalance >= priceOrder, "Sender doesn't have enougth ETH to buy 1 token");
                uint tokensCanBuy = SafeMath.div(buyerBalance, priceOrder);
                amountToFill  = Math.min(tokensCanBuy, amountToFill);               
            }
            orders[index].filled = SafeMath.add(orders[index].filled, amountToFill);
            valueInEth = SafeMath.mul(amountToFill, priceOrder);
            marketOrderFilled = SafeMath.add(marketOrderFilled, amountToFill);
            
            updateBalance(_msgSender(), _ticker, _side, valueInEth, amountToFill);
            updateBalance(orders[index].trader, _ticker, Side(other_side), valueInEth, amountToFill);
            
            emit MarketOrderMatched(_ticker, _side, amountToFill, priceOrder);
            continueMatchingOrders =  marketOrderFilled < _value && (buyerBalance > priceOrder && _side == Side.BUY || _side == Side.SELL);
            index = index +1;
        }
        
        uint lastCompleteFilledPosition = 0;
        bool shiftAndDeleteOrders = false;
        if (orders.length > 0){
            if (orders[index -1].amount == orders[index -1].filled){
            lastCompleteFilledPosition = index -1;
            shiftAndDeleteOrders = true;
            } else if (index > 1 && orders[index -1].amount != orders[index -1].filled){
                lastCompleteFilledPosition = index -2; //always positive as index > 1 ==> index >= 2 ==> index -2 >= 0
                shiftAndDeleteOrders = true;
            }     
            else{ 
                //index ==1 && orders[index -1].amount != orders[index -1].filled 
                //this case means that there are no orders to delete as no order was completed
                shiftAndDeleteOrders = false;
            }
        }
        
        if (shiftAndDeleteOrders==true){
            shiftOrderArray(orders, lastCompleteFilledPosition);
            deleteFilledOrders(orders, lastCompleteFilledPosition);
        }
                
    }

    function updateBalance(address account, bytes32 _ticker, Side _side, uint _value,  uint _amount) private {
        if(_side == Side.BUY){
            balances[account][bytes32("ETH")] = SafeMath.sub(balances[account][bytes32("ETH")], _value );  
            balances[account][_ticker] = SafeMath.add(balances[account][_ticker], _amount) ; 
        }
        else if(_side == Side.SELL){
            balances[account][_ticker] = SafeMath.sub(balances[account][_ticker],  _amount) ;
            balances[account][bytes32("ETH")] = SafeMath.add(balances[account][bytes32("ETH")], _value ); 
        }
    }

    function shiftOrderArray(Order[] storage orders, uint _lastCompleteFilledPosition) private {
        //while lastCompleteFilledPosition remains inside the array, shift the following elements
        uint indexCopy = 0;
        while (orders.length > _lastCompleteFilledPosition + indexCopy + 1){
            orders[indexCopy] = orders[_lastCompleteFilledPosition + indexCopy + 1];
            indexCopy = indexCopy +1;
        }
    }
    function deleteFilledOrders(Order[] storage orders, uint _lastCompleteFilledPosition) private {
        uint indexToDelete = 0;
        while (indexToDelete <= _lastCompleteFilledPosition ){
            orders.pop();            
            indexToDelete = indexToDelete +1;
        }
    }

    function sortArray(Order[] storage orders, Side _side) private {
        uint length = orders.length >0 ? orders.length -1 : 0;
        if (Side.BUY == _side ){
            for(uint i=length ; i>0 ; i--){    
                if (orders[i-1].price < orders[i].price){
                    Order memory aux = orders[i-1];
                    orders[i-1] = orders[i];
                    orders[i] = aux;
                }
            }
        }
        if (Side.SELL == _side ){
            for(uint i=length; i>0 ; i--){    
                if (orders[i-1].price > orders[i].price){
                    Order memory aux = orders[i-1];
                    orders[i-1] = orders[i];
                    orders[i] = aux;
                }
            }
        }
    }
}