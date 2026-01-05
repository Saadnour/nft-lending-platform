const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NFTLending", function () {
    let nftLending;
    let mockNFT;
    let owner;
    let borrower;
    let lender;
    let otherAccount;

    const LOAN_AMOUNT = ethers.parseEther("1.0"); // 1 ETH
    const INTEREST_RATE = 500; // 5%
    const LOAN_DURATION = 30 * 24 * 60 * 60; // 30 jours en secondes
    const NFT_TOKEN_ID = 1;

    beforeEach(async function () {
        // Obtenir les signataires
        [owner, borrower, lender, otherAccount] = await ethers.getSigners();

        // Déployer MockNFT
        const MockNFT = await ethers.getContractFactory("MockNFT");
        mockNFT = await MockNFT.deploy("Test NFT", "TNFT");
        await mockNFT.waitForDeployment();

        // Déployer NFTLending
        const NFTLending = await ethers.getContractFactory("NFTLending");
        nftLending = await NFTLending.deploy();
        await nftLending.waitForDeployment();

        // Mint un NFT pour le borrower
        await mockNFT.mint(borrower.address, NFT_TOKEN_ID);
    });

    describe("Déploiement", function () {
        it("Devrait déployer correctement", async function () {
            expect(await nftLending.getAddress()).to.be.properAddress;
            expect(await mockNFT.getAddress()).to.be.properAddress;
        });

        it("Le borrower devrait posséder le NFT", async function () {
            expect(await mockNFT.ownerOf(NFT_TOKEN_ID)).to.equal(borrower.address);
        });
    });

    describe("Création de prêt", function () {
        it("Devrait créer un prêt avec succès", async function () {
            // Approuver le contrat pour transférer le NFT
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );

            // Créer le prêt
            await expect(
                nftLending.connect(borrower).createLoan(
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION
                )
            )
                .to.emit(nftLending, "LoanCreated")
                .withArgs(
                    1, // loanId
                    borrower.address,
                    ethers.ZeroAddress, // pas encore de lender
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION
                );

            // Vérifier que le NFT a été transféré au contrat
            expect(await mockNFT.ownerOf(NFT_TOKEN_ID)).to.equal(
                await nftLending.getAddress()
            );

            // Vérifier les détails du prêt
            const loan = await nftLending.getLoan(1);
            expect(loan.borrower).to.equal(borrower.address);
            expect(loan.amount).to.equal(LOAN_AMOUNT);
            expect(loan.isActive).to.be.true;
        });

        it("Devrait échouer si le NFT n'est pas approuvé", async function () {
            await expect(
                nftLending.connect(borrower).createLoan(
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION
                )
            ).to.be.reverted;
        });

        it("Devrait échouer si l'utilisateur ne possède pas le NFT", async function () {
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );

            await expect(
                nftLending.connect(otherAccount).createLoan(
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID,
                    LOAN_AMOUNT,
                    INTEREST_RATE,
                    LOAN_DURATION
                )
            ).to.be.revertedWith("You don't own this NFT");
        });

        it("Devrait échouer avec un montant de 0", async function () {
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );

            await expect(
                nftLending.connect(borrower).createLoan(
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID,
                    0,
                    INTEREST_RATE,
                    LOAN_DURATION
                )
            ).to.be.revertedWith("Amount must be greater than 0");
        });
    });

    describe("Financement de prêt", function () {
        beforeEach(async function () {
            // Créer un prêt
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );
            await nftLending.connect(borrower).createLoan(
                await mockNFT.getAddress(),
                NFT_TOKEN_ID,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION
            );
        });

        it("Devrait financer un prêt avec succès", async function () {
            const borrowerBalanceBefore = await ethers.provider.getBalance(
                borrower.address
            );

            await nftLending.connect(lender).fundLoan(1, { value: LOAN_AMOUNT });

            // Vérifier que le borrower a reçu les fonds
            const borrowerBalanceAfter = await ethers.provider.getBalance(
                borrower.address
            );
            expect(borrowerBalanceAfter - borrowerBalanceBefore).to.equal(
                LOAN_AMOUNT
            );

            // Vérifier que le prêteur est enregistré
            const loan = await nftLending.getLoan(1);
            expect(loan.lender).to.equal(lender.address);
        });

        it("Devrait échouer si le montant est incorrect", async function () {
            await expect(
                nftLending.connect(lender).fundLoan(1, {
                    value: ethers.parseEther("0.5"),
                })
            ).to.be.revertedWith("Incorrect funding amount");
        });

        it("Devrait échouer si déjà financé", async function () {
            await nftLending.connect(lender).fundLoan(1, { value: LOAN_AMOUNT });

            await expect(
                nftLending.connect(otherAccount).fundLoan(1, { value: LOAN_AMOUNT })
            ).to.be.revertedWith("Loan already funded");
        });
    });

    describe("Remboursement de prêt", function () {
        beforeEach(async function () {
            // Créer et financer un prêt
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );
            await nftLending.connect(borrower).createLoan(
                await mockNFT.getAddress(),
                NFT_TOKEN_ID,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION
            );
            await nftLending.connect(lender).fundLoan(1, { value: LOAN_AMOUNT });
        });

        it("Devrait rembourser un prêt avec succès", async function () {
            // Avancer le temps de 15 jours
            await time.increase(15 * 24 * 60 * 60);

            // Calculer le montant de remboursement
            const repaymentAmount = await nftLending.calculateRepaymentAmount(1);

            const lenderBalanceBefore = await ethers.provider.getBalance(
                lender.address
            );

            // Rembourser le prêt
            await expect(
                nftLending.connect(borrower).repayLoan(1, { value: repaymentAmount })
            )
                .to.emit(nftLending, "LoanRepaid")
                .withArgs(1, borrower.address, repaymentAmount);

            // Vérifier que le prêteur a reçu les fonds
            const lenderBalanceAfter = await ethers.provider.getBalance(
                lender.address
            );
            expect(lenderBalanceAfter - lenderBalanceBefore).to.equal(
                repaymentAmount
            );

            // Vérifier que le NFT est retourné au borrower
            expect(await mockNFT.ownerOf(NFT_TOKEN_ID)).to.equal(borrower.address);

            // Vérifier que le prêt est marqué comme inactif
            const loan = await nftLending.getLoan(1);
            expect(loan.isActive).to.be.false;
        });

        it("Devrait calculer les intérêts correctement", async function () {
            // Avancer le temps de 365 jours (1 an)
            await time.increase(365 * 24 * 60 * 60);

            const repaymentAmount = await nftLending.calculateRepaymentAmount(1);

            // Intérêts attendus: 1 ETH * 5% = 0.05 ETH
            const expectedInterest = (LOAN_AMOUNT * BigInt(INTEREST_RATE)) / 10000n;
            const expectedTotal = LOAN_AMOUNT + expectedInterest;

            expect(repaymentAmount).to.be.closeTo(expectedTotal, ethers.parseEther("0.001"));
        });

        it("Devrait échouer si le montant est insuffisant", async function () {
            await time.increase(15 * 24 * 60 * 60);
            const repaymentAmount = await nftLending.calculateRepaymentAmount(1);

            await expect(
                nftLending.connect(borrower).repayLoan(1, {
                    value: repaymentAmount - ethers.parseEther("0.1"),
                })
            ).to.be.revertedWith("Insufficient repayment amount");
        });

        it("Seul le borrower peut rembourser", async function () {
            const repaymentAmount = await nftLending.calculateRepaymentAmount(1);

            await expect(
                nftLending.connect(otherAccount).repayLoan(1, {
                    value: repaymentAmount,
                })
            ).to.be.revertedWith("Only borrower can repay");
        });
    });

    describe("Liquidation de prêt", function () {
        beforeEach(async function () {
            // Créer et financer un prêt
            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );
            await nftLending.connect(borrower).createLoan(
                await mockNFT.getAddress(),
                NFT_TOKEN_ID,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION
            );
            await nftLending.connect(lender).fundLoan(1, { value: LOAN_AMOUNT });
        });

        it("Devrait liquider un prêt expiré", async function () {
            // Avancer le temps au-delà de la durée du prêt
            await time.increase(LOAN_DURATION + 1);

            // Vérifier que le prêt est en défaut
            expect(await nftLending.isLoanDefaulted(1)).to.be.true;

            // Liquider le prêt
            await expect(nftLending.connect(otherAccount).liquidateLoan(1))
                .to.emit(nftLending, "LoanLiquidated")
                .withArgs(
                    1,
                    otherAccount.address,
                    await mockNFT.getAddress(),
                    NFT_TOKEN_ID
                );

            // Vérifier que le NFT a été transféré au prêteur
            expect(await mockNFT.ownerOf(NFT_TOKEN_ID)).to.equal(lender.address);

            // Vérifier que le prêt est marqué comme inactif
            const loan = await nftLending.getLoan(1);
            expect(loan.isActive).to.be.false;
        });

        it("Devrait échouer si le prêt n'est pas expiré", async function () {
            await expect(
                nftLending.connect(otherAccount).liquidateLoan(1)
            ).to.be.revertedWith("Loan not expired yet");
        });

        it("Devrait échouer sur un prêt déjà liquidé", async function () {
            await time.increase(LOAN_DURATION + 1);
            await nftLending.connect(otherAccount).liquidateLoan(1);

            await expect(
                nftLending.connect(otherAccount).liquidateLoan(1)
            ).to.be.revertedWith("Loan is not active");
        });
    });

    describe("Fonctions de lecture", function () {
        beforeEach(async function () {
            // Créer quelques prêts
            await mockNFT.mint(borrower.address, 2);
            await mockNFT.mint(borrower.address, 3);

            await mockNFT.connect(borrower).approve(
                await nftLending.getAddress(),
                NFT_TOKEN_ID
            );
            await nftLending.connect(borrower).createLoan(
                await mockNFT.getAddress(),
                NFT_TOKEN_ID,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION
            );

            await mockNFT.connect(borrower).approve(await nftLending.getAddress(), 2);
            await nftLending.connect(borrower).createLoan(
                await mockNFT.getAddress(),
                2,
                LOAN_AMOUNT,
                INTEREST_RATE,
                LOAN_DURATION
            );
        });

        it("Devrait retourner les prêts du borrower", async function () {
            const borrowerLoans = await nftLending.getBorrowerLoans(borrower.address);
            expect(borrowerLoans.length).to.equal(2);
            expect(borrowerLoans[0]).to.equal(1);
            expect(borrowerLoans[1]).to.equal(2);
        });

        it("Devrait retourner les prêts du lender", async function () {
            await nftLending.connect(lender).fundLoan(1, { value: LOAN_AMOUNT });
            await nftLending.connect(lender).fundLoan(2, { value: LOAN_AMOUNT });

            const lenderLoans = await nftLending.getLenderLoans(lender.address);
            expect(lenderLoans.length).to.equal(2);
        });
    });
});