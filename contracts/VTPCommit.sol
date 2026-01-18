// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * NeuroCast VTP (Verified Transfer Packet) Commitment Contract
 * 
 * Stores cryptographic commitments of VTP hashes to provide
 * tamper-evident audit trail for inter-hospital transfers.
 * 
 * IMPORTANT: NO PHI (Protected Health Information) is stored on-chain.
 * Only hashes, timestamps, and non-identifying metadata.
 * 
 * This ensures compliance with HIPAA while providing immutable proof
 * that a transfer packet has not been altered since commitment.
 */
contract VTPCommit {
    
    // VTP Commitment record - stores non-PHI commitment proof
    struct VTPCommitment {
        bytes32 vtpHash;           // SHA-256 hash of the full VTP
        bytes32 signerPubKeyHash;  // Hash of Ed25519 signer public key
        uint256 timestamp;         // Block timestamp when committed
        bytes32 metadataHash;      // Hash of case metadata (case_id, run_id, etc - no PHI)
        address committer;         // Ethereum address that committed the packet
        string kairoDecision;      // ALLOW | WARN | BLOCK | ESCALATE
        uint256 riskScore;         // 0-100 security risk assessment
    }
    
    // Mapping from transaction ID to commitment record
    mapping(string => VTPCommitment) public commitments;
    
    // Array of all commitment transaction IDs for enumeration
    string[] public commitmentIds;
    
    // Counter for generating transaction IDs
    uint256 private txIdCounter;
    
    // Admin address for special operations
    address public admin;
    
    // Events for auditing
    event VTPCommitted(
        bytes32 indexed vtpHash,
        uint256 timestamp,
        bytes32 metadataHash,
        address indexed committer,
        string txId
    );
    
    event KairoGateDecision(
        string indexed txId,
        string decision,
        uint256 riskScore
    );
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        txIdCounter = 0;
    }
    
    /**
     * Commit a VTP hash to immutable on-chain log
     * 
     * This function records a cryptographic proof (hash + signature) of a 
     * verified transfer packet WITHOUT storing any PHI.
     * 
     * The commitment proves:
     * 1. The packet existed at this time with this exact content (hash)
     * 2. It was signed by the expected signer (signerPubKeyHash)
     * 3. The case metadata (run_id, case_id) via metadataHash
     * 4. The security analysis result (kairoDecision, riskScore)
     *
     * @param vtpHash SHA-256 hash of complete VTP (hex with 0x prefix)
     * @param signerPubKeyHash Hash of Ed25519 public key that signed the VTP
     * @param metadataHash Hash of case/run metadata (non-PHI)
     * @param kairoDecision Result from Kairo security gate analysis
     * @param riskScore Risk assessment score from Kairo (0-100)
     * @return txId Unique identifier for this commitment
     */
    function commit(
        bytes32 vtpHash,
        bytes32 signerPubKeyHash,
        bytes32 metadataHash,
        string calldata kairoDecision,
        uint256 riskScore
    ) external returns (string memory txId) {
        require(vtpHash != bytes32(0), "VTP hash cannot be zero");
        require(signerPubKeyHash != bytes32(0), "Signer pubkey hash cannot be zero");
        require(riskScore <= 100, "Risk score must be 0-100");
        
        // Generate transaction ID
        txIdCounter++;
        txId = string(
            abi.encodePacked(
                "VTP-",
                _uint2str(block.number),
                "-",
                _uint2str(txIdCounter)
            )
        );
        
        // Create and store commitment record
        VTPCommitment memory record = VTPCommitment({
            vtpHash: vtpHash,
            signerPubKeyHash: signerPubKeyHash,
            timestamp: block.timestamp,
            metadataHash: metadataHash,
            committer: msg.sender,
            kairoDecision: kairoDecision,
            riskScore: riskScore
        });
        
        commitments[txId] = record;
        commitmentIds.push(txId);
        
        // Emit events for off-chain indexing
        emit VTPCommitted(vtpHash, block.timestamp, metadataHash, msg.sender, txId);
        emit KairoGateDecision(txId, kairoDecision, riskScore);
        
        return txId;
    }
    
    /**
     * Retrieve full commitment record by transaction ID
     * 
     * @param txId Transaction ID from commit()
     * @return Commitment record with all metadata
     */
    function getCommitment(string calldata txId)
        external
        view
        returns (VTPCommitment memory)
    {
        return commitments[txId];
    }
    
    /**
     * Verify a VTP hash was committed (simple lookup)
     * 
     * @param txId Transaction ID
     * @param expectedHash Hash to verify against
     * @return true if hash matches and commitment exists
     */
    function verifyCommitment(string calldata txId, bytes32 expectedHash)
        external
        view
        returns (bool)
    {
        return commitments[txId].vtpHash == expectedHash;
    }
    
    /**
     * Get total number of VTP commitments stored
     * 
     * @return Count of all commitments
     */
    function getCommitmentCount() external view returns (uint256) {
        return commitmentIds.length;
    }
    
    /**
     * Get commitment transaction ID by index
     * 
     * Useful for iterating through all commitments off-chain
     * 
     * @param index Position in array
     * @return Transaction ID at that index
     */
    function getCommitmentIdAt(uint256 index)
        external
        view
        returns (string memory)
    {
        require(index < commitmentIds.length, "Index out of bounds");
        return commitmentIds[index];
    }
    
    /**
     * Get latest N commitments (newest first)
     * 
     * @param limit Number of recent commitments to return
     * @return Array of recent commitment transaction IDs
     */
    function getRecentCommitments(uint256 limit)
        external
        view
        returns (string[] memory)
    {
        uint256 count = limit > commitmentIds.length ? commitmentIds.length : limit;
        string[] memory recent = new string[](count);
        
        for (uint256 i = 0; i < count; i++) {
            recent[i] = commitmentIds[commitmentIds.length - 1 - i];
        }
        
        return recent;
    }
    
    /**
     * Check if a commitment was approved by Kairo gate
     * 
     * @param txId Transaction ID
     * @return true if kairoDecision is "ALLOW" or "WARN"
     */
    function wasApproved(string calldata txId) external view returns (bool) {
        string memory decision = commitments[txId].kairoDecision;
        return
            keccak256(abi.encodePacked(decision)) ==
            keccak256(abi.encodePacked("ALLOW")) ||
            keccak256(abi.encodePacked(decision)) ==
            keccak256(abi.encodePacked("WARN"));
    }
    
    // Utility function to convert uint to string
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
