const MyToken = artifacts.require("MyToken");

module.exports = function (deployer) {
  const _cap = 1000
  const _amount = 100
  
  deployer.deploy(MyToken, _cap, _amount);
};
