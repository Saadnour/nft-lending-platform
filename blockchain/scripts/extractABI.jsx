/**
 * Script pour extraire les ABIs depuis les artifacts de compilation
 * Usage: node scripts/extractABI.js
 */

const fs = require('fs');
const path = require('path');

// Configuration des chemins
const ARTIFACTS_DIR = './artifacts/contracts';
const ABI_OUTPUT_DIR = './src/contracts/abis';

// Contrats à extraire
const contracts = [
    {
        name: 'MockNFT',
        path: 'MockNFT.sol/MockNFT.json'
    },
    {
        name: 'NFTLending',
        path: 'NFTLending.sol/NFTLending.json'
    }
];

// Créer le dossier de sortie s'il n'existe pas
if (!fs.existsSync(ABI_OUTPUT_DIR)) {
    fs.mkdirSync(ABI_OUTPUT_DIR, { recursive: true });
    console.log('✅ Dossier créé:', ABI_OUTPUT_DIR);
}

// Extraire les ABIs
contracts.forEach(contract => {
    try {
        const artifactPath = path.join(ARTIFACTS_DIR, contract.path);

        console.log(`\n🔍 Traitement de ${contract.name}...`);
        console.log(`   Chemin: ${artifactPath}`);

        // Lire le fichier artifact
        if (!fs.existsSync(artifactPath)) {
            console.error(`❌ Fichier non trouvé: ${artifactPath}`);
            return;
        }

        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

        // Vérifier que l'ABI existe
        if (!artifact.abi || !Array.isArray(artifact.abi)) {
            console.error(`❌ ABI invalide dans ${contract.name}`);
            return;
        }

        console.log(`   ✅ ABI trouvé (${artifact.abi.length} éléments)`);

        // Créer l'objet ABI au format attendu
        const abiOutput = {
            abi: artifact.abi
        };

        // Écrire le fichier ABI
        const outputPath = path.join(ABI_OUTPUT_DIR, `${contract.name}.json`);
        fs.writeFileSync(
            outputPath,
            JSON.stringify(abiOutput, null, 2),
            'utf8'
        );

        console.log(`   ✅ ABI extrait vers: ${outputPath}`);

        // Afficher un aperçu
        const functions = artifact.abi.filter(item => item.type === 'function');
        const events = artifact.abi.filter(item => item.type === 'event');
        console.log(`   📊 ${functions.length} fonctions, ${events.length} événements`);

    } catch (error) {
        console.error(`❌ Erreur pour ${contract.name}:`, error.message);
    }
});

console.log('\n✅ Extraction terminée!\n');