//SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.14;

import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
contract MyToken is ERC20PresetMinterPauser{
    using SafeMath for uint256;

    bytes32 public constant CAPER_ROLE = keccak256("CAPER_ROLE");
    bytes32 public constant CAPER_ADMIN_ROLE = keccak256("CAPER_ADMIN_ROLE");
    bytes32 public constant MINTER_MANAGER_ADMIN_ROLE = keccak256("MINTER_MANAGER_ADMIN_ROLE");
    bytes32 public constant PAUSER_MANAGER_ADMIN_ROLE = keccak256("PAUSER_MANAGER_ADMIN_ROLE");
    uint256 private _cap;

    constructor (uint256 cap_, uint amount) ERC20PresetMinterPauser("MyToken","MTKN"){ 
        require(cap_ > 0, "ERC20Capped: cap is 0");
        require(amount >= 0, "amount should be >= 0");
        require(cap_ >= amount, "should be cap >= amount");
        _cap = cap_;
        _mint(msg.sender, amount);
        grantRole(CAPER_ADMIN_ROLE, msg.sender);
        grantRole(MINTER_MANAGER_ADMIN_ROLE, msg.sender);
        grantRole(PAUSER_MANAGER_ADMIN_ROLE, msg.sender);
        _setRoleAdmin(CAPER_ROLE, CAPER_ADMIN_ROLE);
        _setRoleAdmin(MINTER_ROLE, MINTER_MANAGER_ADMIN_ROLE);
        _setRoleAdmin(PAUSER_ROLE, PAUSER_MANAGER_ADMIN_ROLE);
        
    }

    function grantCaperRole(address account) public{
        _grantRole(CAPER_ROLE, account);
    }

    function grantMinterRole(address account) public{
        _grantRole(MINTER_ROLE, account);
    }

    function grantPauserRole(address account) public{
        _grantRole(PAUSER_ROLE, account);
    }
    
    function mint(address to, uint256 amount) public override(ERC20PresetMinterPauser){
        super.mint(to, amount);
    }
   
    function setNewCap(uint amount) public onlyRole(CAPER_ROLE) {
       require(amount > _cap, "New cap should be bigger than previous amount");
       _cap = amount;
    }

    /**
     * @dev Returns the cap on the token's total supply.
     */
    function cap() public view virtual returns (uint256) {
        return _cap;
    }

    /**
     * @dev See {ERC20-_mint}.
     */
    function _mint(address account, uint256 amount) internal virtual override {
        require(ERC20.totalSupply() + amount <= cap(), "ERC20Capped: cap exceeded");
        ERC20._mint(account, amount);
        
    }

    function _beforeTokenTransfer(address from, address to, uint amount) internal override (ERC20PresetMinterPauser){
        
        ERC20PresetMinterPauser._beforeTokenTransfer(from, to, amount);
        
    }
}