//This contract created and deployed by using RemixIde. 

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract AccessControl {
    // Mapping to store admin status (Address => Is Admin?)
    mapping(address => bool) public admins;
    
    // Super Admin address (The deployer of the contract, cannot be removed)
    address public superAdmin;

    // Events to log actions on the blockchain
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    // Constructor runs once when the contract is deployed.
    // It sets the deployer (msg.sender) as the Super Admin.
    constructor() {
        superAdmin = msg.sender;
        admins[msg.sender] = true; // The deployer is the first admin
    }

    // Modifier to restrict access to admin-only functions
    modifier onlyAdmin() {
        require(admins[msg.sender], "Access Denied: You are not an admin.");
        _;
    }

    // Function to grant admin rights to a new address
    function addAdmin(address _newAdmin) public onlyAdmin {
        admins[_newAdmin] = true;
        emit AdminAdded(_newAdmin);
    }

    // Function to revoke admin rights from an address
    function removeAdmin(address _target) public onlyAdmin {
        require(_target != superAdmin, "Super Admin cannot be removed!");
        admins[_target] = false;
        emit AdminRemoved(_target);
    }

    // Function used by Backend/Frontend to verify admin status
    function isAdmin(address _wallet) public view returns (bool) {
        return admins[_wallet];
    }
}