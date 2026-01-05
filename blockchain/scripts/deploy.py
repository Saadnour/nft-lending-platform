#!/usr/bin/env python3
"""
Script de déploiement Python pour les contrats NFTLending
Déploie sans utiliser Truffle ou Remix, utilise Web3.py directement
"""

import json
import os
import sys
from pathlib import Path
from web3 import Web3
from solcx import compile_standard, install_solc
from dotenv import load_dotenv
from datetime import datetime

# Charger les variables d'environnement
load_dotenv()

class ContractDeployer:
    """Classe pour gérer le déploiement des smart contracts"""

    def __init__(self, network="ganache"):
        """
        Initialiser le déployeur

        Args:
            network: Nom du réseau (ganache, sepolia, mumbai)
        """
        self.network = network
        self.w3 = self._connect_to_network()
        self.account = self._load_account()

        # Chemins
        self.project_root = Path(__file__).parent.parent
        self.contracts_dir = self.project_root / "contracts"
        self.deployments_dir = self.project_root / "deployments"
        self.frontend_dir = self.project_root.parent / "frontend" / "src" / "contracts"

        # Créer les dossiers nécessaires
        self.deployments_dir.mkdir(exist_ok=True)
        (self.frontend_dir / "abis").mkdir(parents=True, exist_ok=True)

    def _connect_to_network(self):
        """Connecter au réseau blockchain"""
        networks = {
            "ganache": "http://localhost:8545",
            "sepolia": os.getenv("SEPOLIA_RPC_URL"),
            "mumbai": os.getenv("MUMBAI_RPC_URL", "https://rpc-mumbai.maticvigil.com"),
        }

        if self.network not in networks:
            raise ValueError(f"Réseau {self.network} non supporté")

        rpc_url = networks[self.network]
        if not rpc_url:
            raise ValueError(f"RPC URL non configurée pour {self.network}")

        w3 = Web3(Web3.HTTPProvider(rpc_url))

        if not w3.is_connected():
            raise ConnectionError(f"Impossible de se connecter à {self.network}")

        print(f"✅ Connecté au réseau: {self.network}")
        print(f"📍 Chain ID: {w3.eth.chain_id}")

        return w3

    def _load_account(self):
        """Charger le compte pour le déploiement"""
        private_key = os.getenv("PRIVATE_KEY")

        if not private_key:
            # Pour Ganache, utiliser le premier compte
            if self.network == "ganache":
                accounts = self.w3.eth.accounts
                if accounts:
                    print(f"👤 Utilisation du compte Ganache: {accounts[0]}")
                    return accounts[0]
            raise ValueError("PRIVATE_KEY non définie dans .env")

        account = self.w3.eth.account.from_key(private_key)
        print(f"👤 Compte déployeur: {account.address}")

        balance = self.w3.eth.get_balance(account.address)
        print(f"💰 Balance: {self.w3.from_wei(balance, 'ether')} ETH")

        return account

    def compile_contract(self, contract_name):
        """
        Compiler un contrat Solidity

        Args:
            contract_name: Nom du fichier du contrat (sans .sol)

        Returns:
            dict: Bytecode et ABI du contrat
        """
        print(f"\n📜 Compilation de {contract_name}.sol...")

        # Installer la version de Solidity si nécessaire
        install_solc("0.8.20")

        contract_path = self.contracts_dir / f"{contract_name}.sol"

        with open(contract_path, "r", encoding="utf-8") as file:
            contract_source = file.read()

        # Compiler le contrat
        compiled_sol = compile_standard(
            {
                "language": "Solidity",
                "sources": {f"{contract_name}.sol": {"content": contract_source}},
                "settings": {
                    "outputSelection": {
                        "*": {
                            "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                        }
                    },
                    "optimizer": {
                        "enabled": True,
                        "runs": 200
                    }
                },
            },
            solc_version="0.8.20",
        )

        contract_interface = compiled_sol["contracts"][f"{contract_name}.sol"][contract_name]

        bytecode = contract_interface["evm"]["bytecode"]["object"]
        abi = contract_interface["abi"]

        print(f"✅ {contract_name} compilé avec succès")

        return {"bytecode": bytecode, "abi": abi}

    def deploy_contract(self, contract_name, constructor_args=None):
        """
        Déployer un contrat

        Args:
            contract_name: Nom du contrat
            constructor_args: Arguments du constructeur (liste)

        Returns:
            str: Adresse du contrat déployé
        """
        if constructor_args is None:
            constructor_args = []

        print(f"\n🚀 Déploiement de {contract_name}...")

        # Compiler le contrat
        compiled = self.compile_contract(contract_name)

        # Créer l'instance du contrat
        Contract = self.w3.eth.contract(
            abi=compiled["abi"],
            bytecode=compiled["bytecode"]
        )

        # Construire la transaction
        if isinstance(self.account, str):
            # Ganache account
            tx_hash = Contract.constructor(*constructor_args).transact({
                "from": self.account
            })
        else:
            # Account with private key
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            transaction = Contract.constructor(*constructor_args).build_transaction({
                "chainId": self.w3.eth.chain_id,
                "from": self.account.address,
                "nonce": nonce,
                "gas": 5000000,
                "gasPrice": self.w3.eth.gas_price,
            })

            # Signer et envoyer la transaction
            signed_txn = self.w3.eth.account.sign_transaction(
                transaction, private_key=self.account.key
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

        # Attendre la confirmation
        print("⏳ Attente de la confirmation...")
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        contract_address = tx_receipt.contractAddress
        print(f"✅ {contract_name} déployé à: {contract_address}")
        print(f"⛽ Gas utilisé: {tx_receipt.gasUsed}")

        return contract_address, compiled["abi"]

    def mint_nft(self, nft_address, nft_abi, to_address, token_id):
        """Mint un NFT de test"""
        contract = self.w3.eth.contract(address=nft_address, abi=nft_abi)

        if isinstance(self.account, str):
            tx_hash = contract.functions.mint(to_address, token_id).transact({
                "from": self.account
            })
        else:
            nonce = self.w3.eth.get_transaction_count(self.account.address)

            transaction = contract.functions.mint(to_address, token_id).build_transaction({
                "chainId": self.w3.eth.chain_id,
                "from": self.account.address,
                "nonce": nonce,
                "gas": 200000,
                "gasPrice": self.w3.eth.gas_price,
            })

            signed_txn = self.w3.eth.account.sign_transaction(
                transaction, private_key=self.account.key
            )
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)

        self.w3.eth.wait_for_transaction_receipt(tx_hash)
        print(f"   NFT #{token_id} minté pour {to_address}")

    def save_deployment(self, contracts_info):
        """Sauvegarder les informations de déploiement"""
        deployment_info = {
            "network": self.network,
            "chainId": self.w3.eth.chain_id,
            "deployer": self.account.address if hasattr(self.account, 'address') else self.account,
            "timestamp": datetime.now().isoformat(),
            "contracts": contracts_info
        }

        # Sauvegarder dans deployments/
        deployment_file = self.deployments_dir / f"{self.network}.json"
        with open(deployment_file, "w") as f:
            json.dump(deployment_info, f, indent=2)

        print(f"\n💾 Informations sauvegardées dans: {deployment_file}")

        # Copier les ABIs vers le frontend
        for contract_name, contract_data in contracts_info.items():
            abi_file = self.frontend_dir / "abis" / f"{contract_name}.json"
            with open(abi_file, "w") as f:
                json.dump(contract_data["abi"], f, indent=2)

        # Sauvegarder les adresses pour le frontend
        addresses = {
            name: {"address": data["address"], "abi": f"{name}.json"}
            for name, data in contracts_info.items()
        }

        addresses_file = self.frontend_dir / "addresses.json"
        with open(addresses_file, "w") as f:
            json.dump(addresses, f, indent=2)

        print(f"✅ ABIs et adresses copiés vers le frontend")

    def deploy_all(self):
        """Déployer tous les contrats"""
        print("═" * 50)
        print("🚀 DÉMARRAGE DU DÉPLOIEMENT")
        print("═" * 50)

        contracts_info = {}

        # 1. Déployer NFTLending
        nft_lending_address, nft_lending_abi = self.deploy_contract("NFTLending")
        contracts_info["NFTLending"] = {
            "address": nft_lending_address,
            "abi": nft_lending_abi
        }

        # 2. Déployer MockNFT
        mock_nft_address, mock_nft_abi = self.deploy_contract(
            "MockNFT",
            ["Test NFT", "TNFT"]
        )
        contracts_info["MockNFT"] = {
            "address": mock_nft_address,
            "abi": mock_nft_abi
        }

        # 3. Mint quelques NFTs de test
        print("\n🎁 Mint de NFTs de test...")
        deployer_address = self.account.address if hasattr(self.account, 'address') else self.account

        for token_id in range(1, 6):
            self.mint_nft(mock_nft_address, mock_nft_abi, deployer_address, token_id)

        # 4. Sauvegarder les informations
        self.save_deployment(contracts_info)

        # 5. Résumé
        print("\n" + "═" * 50)
        print("🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS")
        print("═" * 50)
        print(f"📋 Résumé:")
        print(f"   • NFTLending: {nft_lending_address}")
        print(f"   • MockNFT: {mock_nft_address}")
        print(f"   • NFTs mintés: 5 tokens (#1 à #5)")
        print("═" * 50)


def main():
    """Point d'entrée principal"""
    # Déterminer le réseau depuis les arguments
    network = sys.argv[1] if len(sys.argv) > 1 else "ganache"

    print(f"\n🔧 Configuration pour le réseau: {network}\n")

    try:
        deployer = ContractDeployer(network)
        deployer.deploy_all()

        print("\n✨ Script de déploiement terminé!\n")
        sys.exit(0)

    except Exception as e:
        print(f"\n❌ Erreur: {str(e)}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()