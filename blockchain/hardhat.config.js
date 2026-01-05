require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20", // ✅ Version corrigée
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },

    networks: {
        // Réseau Hardhat local
        hardhat: {
            chainId: 31337,
        },

        // Réseau localhost (pour npx hardhat node)
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },

        // Ganache local
        ganache: {
            url: "http://localhost:8545",
            chainId: 1337,

        },

        // Sepolia Testnet
        sepolia: {
            url: process.env.SEPOLIA_RPC_URL || "",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 11155111,
        },

        // Polygon Mumbai Testnet
        mumbai: {
            url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
            chainId: 80001,
        },
    },

    paths: {
        sources: "./contracts",
        tests: "./tests",
        cache: "./cache",
        artifacts: "./artifacts",
    },

    mocha: {
        timeout: 40000,
    },
};