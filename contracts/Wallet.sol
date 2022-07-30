// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Wallet is AccessControl, ReentrancyGuard{
    using Counters for Counters.Counter;
    using SafeMath for uint256;

    bytes32 public constant TOKEN_REGISTRATOR_ROLE = keccak256("TOKEN_REGISTRATOR_ROLE");
    bytes32 public constant TOKEN_REGISTRATOR_ADMIN_ROLE = keccak256("TOKEN_REGISTRATOR_ADMIN_ROLE");
    bytes32 public constant CONTRACT_DESTROYER_ROLE = keccak256("CONTRACT_DESTROYER_ROLE");

    // maps address to token-ticker to amounts
    // usa bytes32 en lugar de string por que en solidity no se pueden comparar strings
    mapping(address => mapping(bytes32 => uint256)) public balances;

    struct Token{
        bytes32 ticker;
        address tokenAddress;
    }

    bytes32[] public tokenList; // List with all the tickers registered -- ability to iterate thru all the tokens
    mapping(bytes32 => Token) public tokenMapping; //for each ticker get the token 
    
    event TokenRegisteredEvent(bytes32 indexed ticker, address indexed tokenAddress);
    event TokenDepositApproved(bytes32 indexed ticker, uint amount, address account);
    event TokenDepositRejected(bytes32 indexed ticker, uint amount, address account);
    event TokenDepositDone(bytes32 indexed ticker, uint amount, address account);

    event DebugBalanceOf(bytes32 indexed ticker, uint amount, address account);

    modifier tokenExist(bytes32 token){
        require(tokenMapping[token].tokenAddress != address(0), "Token should be registered first");
        _;
    }

    constructor(){
        _grantRole(TOKEN_REGISTRATOR_ADMIN_ROLE, _msgSender());
        _grantRole(TOKEN_REGISTRATOR_ROLE, _msgSender());
        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setRoleAdmin(TOKEN_REGISTRATOR_ROLE, TOKEN_REGISTRATOR_ADMIN_ROLE);
        _grantRole(CONTRACT_DESTROYER_ROLE, _msgSender());
    }

    function balanceOf(bytes32 _ticker, address user) public returns (uint256){
        emit DebugBalanceOf(_ticker, balances[user][_ticker] , user);
        return balances[user][_ticker];
    }

    function registerToken(bytes32 _ticker, address _tokenAddress) external onlyRole(TOKEN_REGISTRATOR_ROLE){
        tokenMapping[_ticker] =Token(_ticker, _tokenAddress);
        tokenList.push(_ticker);
        emit TokenRegisteredEvent(_ticker, _tokenAddress);
    }

    function deposit(uint _amount, bytes32 _ticker) tokenExist(_ticker) external {
        
        balances[msg.sender][_ticker] = SafeMath.add(balances[msg.sender][_ticker], _amount);
        IERC20 token = IERC20(tokenMapping[_ticker].tokenAddress);
        uint allowence = token.allowance(_msgSender(), address(this)); 
        if (allowence >= _amount){
            emit TokenDepositApproved(_ticker, _amount, msg.sender);
            IERC20(tokenMapping[_ticker].tokenAddress).transferFrom(msg.sender, address(this), _amount);
            emit TokenDepositDone(_ticker, _amount, msg.sender);
        }else{
            emit TokenDepositRejected(_ticker, _amount, msg.sender);
            balances[msg.sender][_ticker] = SafeMath.sub(balances[msg.sender][_ticker], _amount);
        }
        
    }
    function depositEth() payable external {
        balances[msg.sender][bytes32("ETH")] = SafeMath.add(balances[msg.sender][bytes32("ETH")], msg.value);
    }

    function withdrawEth(uint _amount) payable external nonReentrant {
        require(balances[msg.sender][bytes32("ETH")] > _amount, "Insufficient balance");
        balances[msg.sender][bytes32("ETH")] = SafeMath.sub(balances[msg.sender][bytes32("ETH")], msg.value);
        msg.sender.call{value:_amount}("");
    }

    function withdraw(uint _amount, bytes32 _ticker) tokenExist(_ticker) external{
        require( balances[msg.sender][_ticker] >= _amount, "balance should be bigger thant the amount");

        balances[msg.sender][_ticker] = SafeMath.sub(balances[msg.sender][_ticker], _amount);
        IERC20(tokenMapping[_ticker].tokenAddress).transfer(msg.sender, _amount);
    }
    
    function destroy()  onlyRole(CONTRACT_DESTROYER_ROLE) external {
        selfdestruct(payable(_msgSender()));
    }
}