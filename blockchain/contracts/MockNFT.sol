// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockNFT
 * @dev Contrat NFT simple pour tester le système de prêt
 * @notice Collection de NFTs utilisable pour les tests
 */
contract MockNFT is ERC721, Ownable {

    /// @dev Compteur pour les token IDs
    uint256 private _tokenIdCounter;

    /// @dev Base URI pour les métadonnées
    string private _baseTokenURI;

    /// @dev Mapping pour suivre les NFTs mintés
    mapping(uint256 => bool) public tokenExists;

    /**
     * @dev Constructeur du contrat
     * @param name Nom de la collection NFT
     * @param symbol Symbole de la collection
     */
    constructor(
        string memory name,
        string memory symbol
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = "https://api.example.com/nft/";
        _tokenIdCounter = 0;
    }

    /**
     * @notice Mint un nouveau NFT (accessible à tous pour les tests)
     * @param to Adresse qui recevra le NFT
     * @param tokenId ID du token à minter
     */
    function mint(address to, uint256 tokenId) external {
        require(!tokenExists[tokenId], "Token already exists");
        require(to != address(0), "Cannot mint to zero address");

        _safeMint(to, tokenId);
        tokenExists[tokenId] = true;

        // Mettre à jour le compteur si nécessaire
        if (tokenId >= _tokenIdCounter) {
            _tokenIdCounter = tokenId + 1;
        }
    }

    /**
     * @notice Mint un NFT avec auto-incrémentation de l'ID
     * @param to Adresse qui recevra le NFT
     * @return tokenId L'ID du token minté
     */
    function mintNext(address to) external returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;

        _safeMint(to, tokenId);
        tokenExists[tokenId] = true;

        return tokenId;
    }

    /**
     * @notice Mint plusieurs NFTs d'un coup (réservé au owner)
     * @param to Adresse qui recevra les NFTs
     * @param quantity Nombre de NFTs à minter
     */
    function batchMint(address to, uint256 quantity) external onlyOwner {
        require(quantity > 0 && quantity <= 100, "Invalid quantity");

        for (uint256 i = 0; i < quantity; i++) {
            _tokenIdCounter++;
            _safeMint(to, _tokenIdCounter);
            tokenExists[_tokenIdCounter] = true;
        }
    }

    /**
     * @notice Définir l'URI de base pour les métadonnées
     * @param baseURI Nouvelle URI de base
     */
    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    /**
     * @dev Override de la fonction _baseURI
     * @return L'URI de base
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Obtenir l'URI complet d'un token
     * @param tokenId ID du token
     * @return URI complet du token
     */
    function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory)
    {
        _requireOwned(tokenId);
        return super.tokenURI(tokenId);
    }

    /**
     * @notice Vérifier si un token existe
     * @param tokenId ID du token à vérifier
     * @return true si le token existe
     */
    function exists(uint256 tokenId) external view returns (bool) {
        return tokenExists[tokenId];
    }

    /**
     * @notice Obtenir le compteur actuel
     * @return Le nombre de tokens mintés
     */
    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }
}