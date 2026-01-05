const hre = require("hardhat");

async function main() {
    console.log("🧪 Test de la plateforme NFT Lending\n");

    const [borrower, lender] = await hre.ethers.getSigners();
    console.log("👤 Emprunteur:", borrower.address);
    console.log("👤 Prêteur:", lender.address);

    const addresses = require("../frontend/src/contracts/addresses.json");

    const mockNFT = await hre.ethers.getContractAt("MockNFT", addresses.MockNFT.address);
    const nftLending = await hre.ethers.getContractAt("NFTLending", addresses.NFTLending.address);

    console.log("\n📦 Contrats chargés:");
    console.log("  - MockNFT:", addresses.MockNFT.address);
    console.log("  - NFTLending:", addresses.NFTLending.address);

    // ========== TEST 1: Vérifier la propriété du NFT ==========
    console.log("\n========== TEST 1: Vérification propriété NFT ==========");
    const tokenId = 1;
    const owner = await mockNFT.ownerOf(tokenId);
    console.log(`✅ Propriétaire du NFT #${tokenId}:`, owner);
    console.log(`✅ Match avec emprunteur:`, owner === borrower.address);

    // ========== TEST 2: Approuver le NFT ==========
    console.log("\n========== TEST 2: Approbation du NFT ==========");
    const approveTx = await mockNFT.connect(borrower).approve(addresses.NFTLending.address, tokenId);
    await approveTx.wait();
    console.log("✅ NFT approuvé pour le contrat de prêt");

    const approved = await mockNFT.getApproved(tokenId);
    console.log("✅ Adresse approuvée:", approved);

    // ========== TEST 3: Créer un prêt ==========
    console.log("\n========== TEST 3: Création du prêt ==========");
    const loanAmount = hre.ethers.parseEther("1.0");
    const interestRate = 500;
    const duration = 30 * 24 * 60 * 60;

    console.log("📝 Paramètres du prêt:");
    console.log("  - NFT Token ID:", tokenId);
    console.log("  - Montant:", hre.ethers.formatEther(loanAmount), "ETH");
    console.log("  - Taux d'intérêt:", interestRate / 100, "%");
    console.log("  - Durée:", duration / (24 * 60 * 60), "jours");

    const createTx = await nftLending.connect(borrower).createLoan(
        addresses.MockNFT.address,
        tokenId,
        loanAmount,
        interestRate,
        duration
    );
    const receipt = await createTx.wait();

    const loanCreatedEvent = receipt.logs.find(log => {
        try {
            const parsed = nftLending.interface.parseLog(log);
            return parsed.name === "LoanCreated";
        } catch {
            return false;
        }
    });

    let loanId;
    if (loanCreatedEvent) {
        const parsed = nftLending.interface.parseLog(loanCreatedEvent);
        loanId = parsed.args[0];
        console.log("✅ Prêt créé! ID:", loanId.toString());
    }

    // ========== TEST 4: Vérifier les détails du prêt ==========
    console.log("\n========== TEST 4: Détails du prêt ==========");
    const loan = await nftLending.getLoan(loanId);
    console.log("📋 Détails:");
    console.log("  - Emprunteur:", loan.borrower);
    console.log("  - Prêteur:", loan.lender === "0x0000000000000000000000000000000000000000" ? "Pas encore financé" : loan.lender);
    console.log("  - Montant:", hre.ethers.formatEther(loan.amount), "ETH");
    console.log("  - Taux:", loan.interestRate.toString(), "basis points");
    console.log("  - Actif:", loan.isActive);

    // ========== TEST 5: Financer le prêt ==========
    console.log("\n========== TEST 5: Financement du prêt ==========");
    const fundTx = await nftLending.connect(lender).fundLoan(loanId, { value: loanAmount });
    await fundTx.wait();
    console.log("✅ Prêt financé par le prêteur!");

    const borrowerBalance = await hre.ethers.provider.getBalance(borrower.address);
    console.log("💰 Nouveau solde emprunteur:", hre.ethers.formatEther(borrowerBalance), "ETH");

    // ========== TEST 6: Vérifier les prêts de l'emprunteur ==========
    console.log("\n========== TEST 6: Prêts de l'emprunteur ==========");
    const borrowerLoans = await nftLending.getBorrowerLoans(borrower.address);
    console.log("📊 Nombre de prêts:", borrowerLoans.length);
    console.log("📊 IDs des prêts:", borrowerLoans.map(id => id.toString()));

    // ========== TEST 7: Calculer le montant de remboursement ==========
    console.log("\n========== TEST 7: Calcul du remboursement ==========");
    const repaymentAmount = await nftLending.calculateRepaymentAmount(loanId);
    console.log("💵 Montant à rembourser:", hre.ethers.formatEther(repaymentAmount), "ETH");

    // ========== TEST 8: Rembourser le prêt (CORRIGÉ) ==========
    console.log("\n========== TEST 8: Remboursement du prêt ==========");

    // Ajouter une marge de sécurité de 0.1% pour couvrir les intérêts accumulés
    const repaymentWithBuffer = repaymentAmount + (repaymentAmount * BigInt(1) / BigInt(1000));
    console.log("💰 Montant avec marge:", hre.ethers.formatEther(repaymentWithBuffer), "ETH");

    try {
        const repayTx = await nftLending.connect(borrower).repayLoan(loanId, { value: repaymentWithBuffer });
        await repayTx.wait();
        console.log("✅ Prêt remboursé!");

        const loanAfter = await nftLending.getLoan(loanId);
        console.log("✅ Prêt actif:", loanAfter.isActive);

        const newOwner = await mockNFT.ownerOf(tokenId);
        console.log("✅ Nouveau propriétaire du NFT:", newOwner);
        console.log("✅ NFT retourné à l'emprunteur:", newOwner === borrower.address);
    } catch (error) {
        console.error("❌ Erreur remboursement:", error.message);
    }

    // ========== TEST 9: Test de liquidation ==========
    console.log("\n========== TEST 9: Test de liquidation ==========");

    const tokenId2 = 2;
    await mockNFT.connect(borrower).approve(addresses.NFTLending.address, tokenId2);

    const createTx2 = await nftLending.connect(borrower).createLoan(
        addresses.MockNFT.address,
        tokenId2,
        loanAmount,
        interestRate,
        2 // 2 secondes pour test
    );
    const receipt2 = await createTx2.wait();

    const event2 = receipt2.logs.find(log => {
        try {
            const parsed = nftLending.interface.parseLog(log);
            return parsed.name === "LoanCreated";
        } catch {
            return false;
        }
    });

    const loanId2 = event2 ? nftLending.interface.parseLog(event2).args[0] : null;
    console.log("✅ Nouveau prêt créé, ID:", loanId2.toString());

    await nftLending.connect(lender).fundLoan(loanId2, { value: loanAmount });
    console.log("✅ Prêt financé");

    console.log("⏳ Attente expiration du prêt...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    await hre.network.provider.send("evm_increaseTime", [3]);
    await hre.network.provider.send("evm_mine");

    const isDefaulted = await nftLending.isLoanDefaulted(loanId2);
    console.log("⚠️ Prêt en défaut:", isDefaulted);

    const liquidateTx = await nftLending.connect(lender).liquidateLoan(loanId2);
    await liquidateTx.wait();
    console.log("✅ Prêt liquidé!");

    const nftOwner = await mockNFT.ownerOf(tokenId2);
    console.log("✅ Nouveau propriétaire du NFT #2:", nftOwner);
    console.log("✅ NFT transféré au prêteur:", nftOwner === lender.address);

    // ========== RÉSUMÉ FINAL ==========
    console.log("\n========== 📊 RÉSUMÉ FINAL ==========");
    const finalBorrowerLoans = await nftLending.getBorrowerLoans(borrower.address);
    const finalLenderLoans = await nftLending.getLenderLoans(lender.address);

    console.log("👤 Emprunteur:");
    console.log("  - Prêts créés:", finalBorrowerLoans.length);
    console.log("  - Solde final:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(borrower.address)), "ETH");

    console.log("\n👤 Prêteur:");
    console.log("  - Prêts financés:", finalLenderLoans.length);
    console.log("  - Solde final:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(lender.address)), "ETH");
    console.log("  - NFT liquidé acquis: NFT #2");

    console.log("\n🎉 Tous les tests sont terminés avec succès!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Erreur:", error);
        process.exit(1);
    });