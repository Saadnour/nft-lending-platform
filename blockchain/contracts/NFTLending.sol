// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTLending
 * @dev Contrat de prêt avec NFTs comme garantie - VERSION AMÉLIORÉE
 * @notice Permet d'emprunter des ETH en déposant des NFTs en collatéral
 */
contract NFTLending is ReentrancyGuard, Ownable {

    // ========== STRUCTURES ==========

    struct Loan {
        address borrower;
        address lender;
        address nftContract;
        uint256 tokenId;
        uint256 amount;
        uint256 interest;
        uint256 interestRate;
        uint256 startTime;
        uint256 duration;
        bool isActive;
    }

    // ========== VARIABLES D'ÉTAT ==========

    uint256 private loanIdCounter;
    mapping(uint256 => Loan) public loans;
    mapping(address => uint256[]) public borrowerLoans;
    mapping(address => uint256[]) public lenderLoans;

    uint256 public constant LIQUIDATION_THRESHOLD = 7000;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    // ========== ÉVÉNEMENTS ==========

    event LoanCreated(
        uint256 indexed loanId,
        address indexed borrower,
        address indexed lender,
        address nftContract,
        uint256 tokenId,
        uint256 amount,
        uint256 interestRate,
        uint256 duration
    );

    event LoanRepaid(
        uint256 indexed loanId,
        address indexed borrower,
        uint256 totalRepaid
    );

    event LoanLiquidated(
        uint256 indexed loanId,
        address indexed liquidator,
        address nftContract,
        uint256 tokenId
    );

    // ========== CONSTRUCTEUR ==========

    constructor() Ownable(msg.sender) {
        loanIdCounter = 1;
    }

    // ========== FONCTIONS PRINCIPALES ==========

    function createLoan(
        address _nftContract,
        uint256 _tokenId,
        uint256 _amount,
        uint256 _interestRate,
        uint256 _duration
    ) external nonReentrant returns (uint256) {
        require(_nftContract != address(0), "Invalid NFT contract");
        require(_amount > 0, "Amount must be greater than 0");
        require(_duration > 0, "Duration must be greater than 0");
        require(_interestRate <= 10000, "Interest rate too high");

        IERC721 nft = IERC721(_nftContract);
        require(
            nft.ownerOf(_tokenId) == msg.sender,
            "You don't own this NFT"
        );

        nft.transferFrom(msg.sender, address(this), _tokenId);

        uint256 loanId = loanIdCounter++;
        loans[loanId] = Loan({
            borrower: msg.sender,
            lender: address(0),
            nftContract: _nftContract,
            tokenId: _tokenId,
            amount: _amount,
            interest: 0,
            interestRate: _interestRate,
            startTime: block.timestamp,
            duration: _duration,
            isActive: true
        });

        borrowerLoans[msg.sender].push(loanId);

        emit LoanCreated(
            loanId,
            msg.sender,
            address(0),
            _nftContract,
            _tokenId,
            _amount,
            _interestRate,
            _duration
        );

        return loanId;
    }

    function fundLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];

        require(loan.isActive, "Loan is not active");
        require(loan.lender == address(0), "Loan already funded");
        require(msg.value == loan.amount, "Incorrect funding amount");

        loan.lender = msg.sender;
        lenderLoans[msg.sender].push(_loanId);

        (bool success, ) = loan.borrower.call{value: msg.value}("");
        require(success, "Transfer failed");

        emit LoanCreated(
            _loanId,
            loan.borrower,
            msg.sender,
            loan.nftContract,
            loan.tokenId,
            loan.amount,
            loan.interestRate,
            loan.duration
        );
    }

    /**
     * @notice Rembourser un prêt - AMÉLIORÉ
     * @dev Accepte un surplus pour gérer les variations d'intérêts et le rembourse automatiquement
     */
    function repayLoan(uint256 _loanId) external payable nonReentrant {
        Loan storage loan = loans[_loanId];

        require(loan.isActive, "Loan is not active");
        require(loan.lender != address(0), "Loan not funded");
        require(msg.sender == loan.borrower, "Only borrower can repay");

        uint256 totalRepayment = calculateRepaymentAmount(_loanId);
        require(msg.value >= totalRepayment, "Insufficient repayment amount");

        loan.isActive = false;

        // Transférer le montant exact au prêteur
        (bool success, ) = loan.lender.call{value: totalRepayment}("");
        require(success, "Transfer to lender failed");

        // Rembourser automatiquement le surplus à l'emprunteur
        if (msg.value > totalRepayment) {
            uint256 refund = msg.value - totalRepayment;
            (bool refundSuccess, ) = msg.sender.call{value: refund}("");
            require(refundSuccess, "Refund failed");
        }

        // Retourner le NFT à l'emprunteur
        IERC721(loan.nftContract).transferFrom(
            address(this),
            loan.borrower,
            loan.tokenId
        );

        emit LoanRepaid(_loanId, msg.sender, totalRepayment);
    }

    function liquidateLoan(uint256 _loanId) external nonReentrant {
        Loan storage loan = loans[_loanId];

        require(loan.isActive, "Loan is not active");
        require(loan.lender != address(0), "Loan not funded");
        require(
            block.timestamp > loan.startTime + loan.duration,
            "Loan not expired yet"
        );

        loan.isActive = false;

        IERC721(loan.nftContract).transferFrom(
            address(this),
            loan.lender,
            loan.tokenId
        );

        emit LoanLiquidated(
            _loanId,
            msg.sender,
            loan.nftContract,
            loan.tokenId
        );
    }

    // ========== FONCTIONS DE LECTURE ==========

    /**
     * @notice Calcul du montant de remboursement - AMÉLIORÉ
     * @dev Division unique pour éviter la perte de précision
     * @param _loanId ID du prêt
     * @return Montant total à rembourser (principal + intérêts)
     */
    function calculateRepaymentAmount(uint256 _loanId)
    public
    view
    returns (uint256)
    {
        Loan memory loan = loans[_loanId];

        if (!loan.isActive) return 0;

        uint256 timeElapsed = block.timestamp - loan.startTime;

        // AMÉLIORATION: Multiplier d'abord, puis diviser une seule fois
        // Cela évite la perte de précision due aux divisions successives
        uint256 interest = (loan.amount * loan.interestRate * timeElapsed)
            / (SECONDS_PER_YEAR * BASIS_POINTS);

        return loan.amount + interest;
    }

    function getLoan(uint256 _loanId) external view returns (Loan memory) {
        return loans[_loanId];
    }

    /**
     * @notice Retourne tous les prêts disponibles (non financés)
     * @return Tableau des IDs de prêts disponibles
     */
    function getAvailableLoans() external view returns (uint256[] memory) {
        // Compter les prêts disponibles
        uint256 count = 0;
        for (uint256 i = 1; i < loanIdCounter; i++) {
            Loan memory loan = loans[i];
            if (loan.isActive && loan.lender == address(0) && loan.borrower != address(0)) {
                count++;
            }
        }

        // Créer le tableau des IDs disponibles
        uint256[] memory availableIds = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 1; i < loanIdCounter; i++) {
            Loan memory loan = loans[i];
            if (loan.isActive && loan.lender == address(0) && loan.borrower != address(0)) {
                availableIds[index] = i;
                index++;
            }
        }

        return availableIds;
    }

    /**
     * @notice Retourne le compteur de prêts
     * @return Nombre total de prêts créés
     */
    function loanCounter() external view returns (uint256) {
        return loanIdCounter;
    }

    function getBorrowerLoans(address _borrower)
    external
    view
    returns (uint256[] memory)
    {
        return borrowerLoans[_borrower];
    }

    function getLenderLoans(address _lender)
    external
    view
    returns (uint256[] memory)
    {
        return lenderLoans[_lender];
    }

    function isLoanDefaulted(uint256 _loanId) external view returns (bool) {
        Loan memory loan = loans[_loanId];
        return
            loan.isActive &&
            loan.lender != address(0) &&
            block.timestamp > loan.startTime + loan.duration;
    }

    receive() external payable {}
}