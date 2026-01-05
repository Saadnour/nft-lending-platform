/**
 * Script pour vérifier les fichiers ABI
 * Usage: node scripts/verifyABI.js
 */

const fs = require('fs');
const path = require('path');

const ABI_DIR = './src/contracts/abis';
const ADDRESS_FILE = './src/contracts/addresses.json';

console.log('🔍 Vérification des fichiers ABI...\n');

// Fonction pour vérifier un fichier ABI
function verifyABI(filename) {
    const filepath = path.join(ABI_DIR, filename);

    console.log(`📄 ${filename}`);

    try {
        if (!fs.existsSync(filepath)) {
            console.log('   ❌ Fichier non trouvé\n');
            return false;
        }

        const content = fs.readFileSync(filepath, 'utf8');
        const json = JSON.parse(content);

        // Vérifier la structure
        let abi;
        if (Array.isArray(json)) {
            console.log('   ℹ️  Format: tableau direct');
            abi = json;
        } else if (json.abi && Array.isArray(json.abi)) {
            console.log('   ℹ️  Format: objet avec propriété "abi"');
            abi = json.abi;
        } else {
            console.log('   ❌ Format invalide\n');
            return false;
        }

        console.log(`   ✅ ${abi.length} éléments dans l'ABI`);

        // Compter les types d'éléments
        const functions = abi.filter(item => item.type === 'function');
        const events = abi.filter(item => item.type === 'event');
        const constructor = abi.filter(item => item.type === 'constructor');

        console.log(`   📊 ${functions.length} fonctions`);
        console.log(`   📊 ${events.length} événements`);
        console.log(`   📊 ${constructor.length} constructeur(s)`);

        // Afficher quelques fonctions importantes
        console.log('   🔑 Fonctions clés:');
        const keyFunctions = ['mint', 'approve', 'ownerOf', 'exists', 'createLoan', 'fundLoan'];
        keyFunctions.forEach(name => {
            const found = functions.find(f => f.name === name);
            if (found) {
                console.log(`      ✅ ${name}`);
            }
        });

        console.log('   ✅ Fichier valide\n');
        return true;

    } catch (error) {
        console.log(`   ❌ Erreur: ${error.message}\n`);
        return false;
    }
}

// Vérifier les fichiers ABI
console.log('═══════════════════════════════════════\n');
const mockNFTOk = verifyABI('MockNFT.json');
const nftLendingOk = verifyABI('NFTLending.json');

// Vérifier le fichier addresses.json
console.log('═══════════════════════════════════════\n');
console.log('📄 addresses.json');

try {
    if (!fs.existsSync(ADDRESS_FILE)) {
        console.log('   ❌ Fichier non trouvé\n');
    } else {
        const addresses = JSON.parse(fs.readFileSync(ADDRESS_FILE, 'utf8'));

        if (addresses.MockNFT) {
            console.log(`   ✅ MockNFT: ${addresses.MockNFT}`);
        } else {
            console.log('   ❌ Adresse MockNFT manquante');
        }

        if (addresses.NFTLending) {
            console.log(`   ✅ NFTLending: ${addresses.NFTLending}`);
        } else {
            console.log('   ❌ Adresse NFTLending manquante');
        }
        console.log();
    }
} catch (error) {
    console.log(`   ❌ Erreur: ${error.message}\n`);
}

// Résumé
console.log('═══════════════════════════════════════\n');
console.log('📊 RÉSUMÉ:');
console.log(`   MockNFT.json: ${mockNFTOk ? '✅' : '❌'}`);
console.log(`   NFTLending.json: ${nftLendingOk ? '✅' : '❌'}`);

if (mockNFTOk && nftLendingOk) {
    console.log('\n✅ Tous les fichiers sont valides!');
} else {
    console.log('\n❌ Certains fichiers nécessitent une correction.');
    console.log('\n💡 Solutions:');
    console.log('   1. Exécutez: node scripts/extractABI.js');
    console.log('   2. Vérifiez que vos contrats sont compilés');
    console.log('   3. Vérifiez les chemins dans extractABI.js');
}

console.log();