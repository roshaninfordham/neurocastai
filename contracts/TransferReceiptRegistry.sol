// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract TransferReceiptRegistry {
    struct Receipt {
        bytes32 packetHash;
        uint8 state; // 0=PROCEED,1=HOLD,2=ESCALATE
        uint256 issuedAt;
        address issuer;
    }

    mapping(bytes32 => Receipt) private receipts;

    event ReceiptMinted(bytes32 indexed runIdHash, bytes32 packetHash, uint8 state, address issuer);

    function mintReceipt(bytes32 runIdHash, bytes32 packetHash, uint8 state) external {
        require(runIdHash != bytes32(0), "runIdHash required");
        require(packetHash != bytes32(0), "packetHash required");
        require(receipts[runIdHash].issuedAt == 0, "receipt exists");

        receipts[runIdHash] = Receipt({
            packetHash: packetHash,
            state: state,
            issuedAt: block.timestamp,
            issuer: msg.sender
        });

        emit ReceiptMinted(runIdHash, packetHash, state, msg.sender);
    }

    function getReceipt(bytes32 runIdHash) external view returns (bytes32 packetHash, uint8 state, uint256 issuedAt, address issuer) {
        Receipt memory r = receipts[runIdHash];
        return (r.packetHash, r.state, r.issuedAt, r.issuer);
    }
}
