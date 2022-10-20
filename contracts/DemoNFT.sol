// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IRandomHbbft.sol";
import "./interfaces/INetworkHealthHbbft.sol";

/** @dev demonstrates an NFT using the Diamond Random System as an example.
 */
contract DemoNFT is ERC721 {
    uint256 private _currentTokenId = 0; //Token ID here will start from 1

    // salt value that is used uniquely for salting the rng for each minted nft.
    uint256 private _currentMintingRegistrySalt = 1;

    // Fee that is required to be paid upfront for minting an NFT
    uint256 public mintingFee = 1 ether;

    // a minting registry holds the information about upcomming minting of nfts.
    // one account can only mint one NFT at a time.
    // minting can only be done after registering the minting
    // minting registry is cleared after the minting is done.
    mapping(address => uint256) private _mintingRegistryBlocks;

    // the salt is connected to _mintingRegistryBlocks and prevents manipulation of the rng
    mapping(address => uint256) private _mintingRegistrySalts;

    // stored random number for each minted nft
    mapping(uint256 => bytes32) public tokenDna;

    // Mock Implementation for tests, Diamond Contracts for diamond-node networks.
    IRandomHbbft public randomHbbft;

    // Mock Implementation for tests, Diamond Contracts for diamond-node networks.
    INetworkHealthHbbft public networkHealthHbbft;

    /** @dev mint registered event,
     * emitted when a minting is registered
     * block_number is the block number of the block where minting becomes possible.
     * @param account the account that registered the minting
     * @param blockNumber the block number of the block where minting becomes possible.
     */
    event MintRegistered(address indexed account, uint256 blockNumber);

    /** @dev constructor for the DemoNFT contract
     * @param randomHbbftAddress IRandomHbbft address. Mock Implementation for tests, Diamond Contracts for diamond-node networks.
     * @param networkHealthHbbftAddress INetworkHealthHbbft address. Mock Implementation for tests, Diamond Contracts for diamond-node networks.
     */
    constructor(address randomHbbftAddress, address networkHealthHbbftAddress)
        ERC721("DemoNFT", "DEMO")
    {
        randomHbbft = IRandomHbbft(randomHbbftAddress);
        networkHealthHbbft = INetworkHealthHbbft(networkHealthHbbftAddress);
    }

    /** @dev registers a minting of an NFT, paying the minting fee.
     * the receiver of the NFT can be an account other than the account who pays the fee.
     * Only one mint can be registered at a time.
     * @param _to the account that will receive the NFT.
     */
    function registerMinting(address _to) public payable {
        // if there is already a minting registered for the sender, then the minting is not allowed.
        require(_mintingRegistryBlocks[_to] == 0, "minting already registered");

        // the minting fee has to be paid for registering the minting.
        require(msg.value == mintingFee, "must send exact minting fee");

        // we do not allow minting if the network is not in full health.
        // we only allow "the best" generated random numbers - only those generated by a 100% healthy network.
        // It is highly likely that an unhealthy network is still unhealthy on the next block
        // therefore we do not allow the registrations, since it is also the point in time when the fee is paid.
        require(
            networkHealthHbbft.isFullHealth(),
            "Service is currently paused"
        );

        // the minting can only happen in the future,
        // all minting fees have to be paid during the registration.
        _mintingRegistryBlocks[_to] = block.number + 1;
        _mintingRegistrySalts[_to] = _currentMintingRegistrySalt;
        _currentMintingRegistrySalt++;

        emit MintRegistered(_to, block.number + 1);
    }

    /**
     * @dev Mints a token to an address with a tokenURI.
     * The minting will fail if it has not been registered yet.
     * Minting can be called by anyone who has registered the minting.
     * @param _to address of the future owner of the token
     */
    function mintTo(address _to) public {
        uint256 blockNumber = _mintingRegistryBlocks[_to];

        // if there is no minting registered for the sender, then the minting is not allowed.
        require(blockNumber != 0, "minting not registered");

        require(block.number >= blockNumber, "RNG number for ready yet.");

        // we do not allow minting if the network is not in full health.
        // we only allow "the best" generated random numbers - only those generated by a 100% healthy network.
        // It is highly likely that an unhealthy network is still unhealthy on the next block
        // therefore we do not allow the registrations, since it is also the point in time when the fee is paid.
        require(
            networkHealthHbbft.isFullHealthHistoric(blockNumber),
            "No Healthy RNG on this Block"
        );

        // clear the minting registry for this sender.
        _mintingRegistryBlocks[_to] = 0;
        _mintingRegistrySalts[_to] = 0;

        uint256 newTokenId = _getNextTokenId();
        _safeMint(_to, newTokenId);

        // the salt makes sure that registered mints for the same block do not result in the same DNA.
        // every salt is only used once.
        uint256 salt = _mintingRegistrySalts[_to];

        // get the RNG that has been written in the past. (including the same block, but the RNG transaction is the same)
        uint256 rng = randomHbbft.getSeedHistoric(blockNumber);

        // store the salted rng as the DNA of the NFT. the salt makes sure that every minted NFT has a (cryptographic) unique DNA.
        tokenDna[newTokenId] = (keccak256(abi.encodePacked(rng, salt)));
        
        _incrementTokenId();
    }

    /** @dev can be called for registration that happend during the healthy network time,
     * but the network has switch into unhealthy state just 1 block later.
     * This is a rare corner case, and might never show up in reality - but it is covered.
     * it reschedules the given minting registration to the next block in the unlucky situation
     * that the network has switched into unhealthy state just 1 block after registration of the minting.
     */
    function rescheduleUnhealthyMintRegistration(address _to) external {
        uint256 blockNumber = _mintingRegistryBlocks[_to];
        require(blockNumber != 0, "minting not registered");
        require(
            !networkHealthHbbft.isFullHealthHistoric(blockNumber),
            "already healthy registered"
        );
        require(
            networkHealthHbbft.isFullHealth(),
            "network needs to be healthy"
        );
        // move the registration to the next block - that should be healthy.
        _mintingRegistryBlocks[_to] = block.number + 1;

        // emit MintRegistered event again, so automated services can react to it.
        emit MintRegistered(_to, block.number + 1);
    }

    /**
     * @dev calculates the next token ID based on value of _currentTokenId
     * @return uint256 for the next token ID
     */
    function _getNextTokenId() private view returns (uint256) {
        return _currentTokenId + 1;
    }

    /**
     * @dev increments the value of _currentTokenId
     */
    function _incrementTokenId() private {
        _currentTokenId++;
    }
}
