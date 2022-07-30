// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20{
    constructor() ERC20("Tether USD", "USDT") {
        _mint(msg.sender, 10000);
    }
}