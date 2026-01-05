// scripts/deploy.js

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Début du déploiement des contrats...\n");

    try {
        // 1. Récupérer le deployer
        const [deployer] = await hre.ethers.getSigners();

        console.log("📝 Compte de déploiement :", deployer.address);

        const balance = await hre.ethers.provider.getBalance(deployer.address);
        console.log(
            "💰 Solde du compte :",
            hre.ethers.formatEther(balance),
            "ETH\n"
        );

        if (balance === 0n) {
            throw new Error(
                "Le compte deployer n'a pas de fonds ! Vérifie que Ganache est lancé avec le bon mnemonic."
            );
        }

        // 2. Déployer MockNFT
        console.log("📦 Déploiement de MockNFT...");
        const MockNFT = await hre.ethers.getContractFactory("MockNFT", deployer);
        const mockNFT = await MockNFT.deploy("Test NFT Collection", "TNFT");

        console.log("⏳ Attente de la confirmation du déploiement MockNFT...");
        await mockNFT.waitForDeployment();

        const mockNFTAddress = await mockNFT.getAddress();
        console.log("✅ MockNFT déployé à :", mockNFTAddress);

        // 3. Déployer NFTLending
        console.log("\n📦 Déploiement de NFTLending...");
        const NFTLending = await hre.ethers.getContractFactory("NFTLending", deployer);
        const nftLending = await NFTLending.deploy();

        console.log("⏳ Attente de la confirmation du déploiement NFTLending...");
        await nftLending.waitForDeployment();

        const nftLendingAddress = await nftLending.getAddress();
        console.log("✅ NFTLending déployé à :", nftLendingAddress);

        // 4. Mint 5 NFTs de test
        console.log("\n🎨 Mint de 5 NFTs de test...");
        for (let i = 1; i <= 5; i++) {
            console.log(`   Mint du NFT #${i}...`);
            const tx = await mockNFT.mint(deployer.address, i);
            await tx.wait(1); // Attente d'une confirmation
            console.log(`   ✅ NFT #${i} minté`);
        }

        // 5. Préparer les données pour addresses.json
        const networkInfo = await hre.ethers.provider.getNetwork();

        const addresses = {
            NFTLending: {
                address: nftLendingAddress,
                deployedAt: new Date().toISOString(),
            },
            MockNFT: {
                address: mockNFTAddress,
                deployedAt: new Date().toISOString(),
            },
            deployer: deployer.address,
            network: hre.network.name,
            chainId: networkInfo.chainId.toString(),
        };

        // 6. Sauvegarder dans le frontend
        const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");

        if (!fs.existsSync(frontendContractsDir)) {
            fs.mkdirSync(frontendContractsDir, { recursive: true });
            console.log("📁 Dossier contracts créé dans le frontend");
        }

        const addressesPath = path.join(frontendContractsDir, "addresses.json");
        fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));

        console.log("\n📄 addresses.json mis à jour :", addressesPath);

        // 7. Résumé final
        console.log("\n🎉 Déploiement terminé avec succès !\n");
        console.log("📋 Résumé :");
        console.log(`   MockNFT     : ${mockNFTAddress}`);
        console.log(`   NFTLending  : ${nftLendingAddress}`);
        console.log(`   Deployer    : ${deployer.address}`);
        console.log(`   Réseau      : ${hre.network.name} (chainId: ${networkInfo.chainId})`);
        console.log(`   NFTs mintés : 5 (token IDs: 1 à 5)\n`);

        console.log("Tu peux maintenant lancer ton frontend et tout tester ! 🚀");
    } catch (error) {
        console.error("\n❌ Erreur lors du déploiement :");
        console.error(error.message || error);
        process.exit(1);
    }
}

main().then(() => process.exit(0));