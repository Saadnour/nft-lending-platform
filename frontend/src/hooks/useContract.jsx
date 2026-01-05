import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import NFTLendingABI from '../contracts/abis/NFTLending.json';
import MockNFTABI from '../contracts/abis/MockNFT.json';
import addressesData from '../contracts/addresses.json';

export const useContract = (provider, signer) => {
    const [addresses, setAddresses] = useState({
        MockNFT: addressesData?.MockNFT?.address || '',
        NFTLending: addressesData?.NFTLending?.address || ''
    });

    const [contracts, setContracts] = useState({
        nftLending: null,
        mockNFT: null,
        nftFeatures: {}
    });

    const [loading, setLoading] = useState(false);
    const [contractsReady, setContractsReady] = useState(false);

    // Initialisation des contrats
    useEffect(() => {
        const initContracts = async () => {
            if (!provider || !signer) {
                console.log('⏳ En attente du provider et signer...');
                setContractsReady(false);
                return;
            }

            try {
                console.log('🔄 Initialisation des contrats...');
                console.log('📋 Adresses chargées:', addresses);

                const nftAddress = addresses.MockNFT;
                const lendingAddress = addresses.NFTLending;

                if (!nftAddress || !lendingAddress) {
                    console.error('❌ Adresses manquantes:', { nftAddress, lendingAddress });
                    setContractsReady(false);
                    return;
                }

                const nftAbi = Array.isArray(MockNFTABI) ? MockNFTABI : MockNFTABI.abi;
                const lendingAbi = Array.isArray(NFTLendingABI) ? NFTLendingABI : NFTLendingABI.abi;

                if (!nftAbi || !lendingAbi) {
                    throw new Error('ABI invalide');
                }

                const nftContract = new ethers.Contract(nftAddress, nftAbi, signer);
                const lendingContract = new ethers.Contract(lendingAddress, lendingAbi, signer);

                const nftCode = await provider.getCode(nftAddress);
                const lendingCode = await provider.getCode(lendingAddress);

                if (nftCode === '0x') {
                    throw new Error('Contrat MockNFT non déployé');
                }
                if (lendingCode === '0x') {
                    throw new Error('Contrat NFTLending non déployé');
                }

                const hasMintWithTokenId = nftAbi.some(
                    item => item.name === 'mint' && item.inputs?.[1]?.type === 'uint256'
                );
                const hasMintWithURI = nftAbi.some(
                    item => item.name === 'mint' && item.inputs?.[1]?.type === 'string'
                );
                const hasExists = nftAbi.some(item => item.name === 'exists');

                setContracts({
                    nftLending: lendingContract,
                    mockNFT: nftContract,
                    nftFeatures: { hasMintWithTokenId, hasMintWithURI, hasExists }
                });

                setContractsReady(true);
                console.log('✅ Contrats initialisés avec succès');
            } catch (error) {
                console.error('❌ Erreur initialisation contrats:', error);
                setContractsReady(false);
            }
        };

        initContracts();
    }, [provider, signer, addresses]);

    // ==================== NFT FUNCTIONS ====================

    const nftExists = async (tokenId) => {
        if (!contracts?.mockNFT) {
            console.warn('⚠️ Contract mockNFT non disponible');
            return false;
        }
        try {
            const tokenIdNum = Number(tokenId);
            if (contracts.nftFeatures?.hasExists) {
                return await contracts.mockNFT.exists(tokenIdNum);
            } else {
                try {
                    await contracts.mockNFT.ownerOf(tokenIdNum);
                    return true;
                } catch {
                    return false;
                }
            }
        } catch (error) {
            console.error('Erreur vérification NFT:', error);
            return false;
        }
    };

    const getNFTOwner = async (tokenId) => {
        if (!contracts?.mockNFT) {
            throw new Error('Contrat NFT non initialisé. Attendez quelques secondes et réessayez.');
        }

        if (!tokenId || tokenId === '') {
            throw new Error('Token ID manquant');
        }

        const tokenIdNum = Number(tokenId);
        if (isNaN(tokenIdNum) || tokenIdNum < 0) {
            throw new Error('Token ID invalide');
        }

        try {
            const exists = await nftExists(tokenId);
            if (!exists) {
                throw new Error(`NFT #${tokenId} n'existe pas`);
            }

            const owner = await contracts.mockNFT.ownerOf(tokenIdNum);

            if (!owner || !ethers.isAddress(owner)) {
                throw new Error(`Impossible de récupérer le propriétaire du NFT #${tokenId}`);
            }

            console.log(`✅ Propriétaire du NFT #${tokenId}:`, owner);
            return owner;
        } catch (error) {
            console.error('❌ Erreur getNFTOwner:', error);

            if (error.message.includes('n\'existe pas')) {
                throw error;
            } else if (error.code === 'CALL_EXCEPTION') {
                throw new Error(`Le NFT #${tokenId} n'existe pas ou le contrat n'est pas accessible`);
            } else if (error.message.includes('non initialisé')) {
                throw error;
            } else {
                throw new Error(`Erreur lors de la vérification du NFT: ${error.message}`);
            }
        }
    };

    const mintNFT = async (toAddress, tokenId) => {
        if (!contracts?.mockNFT || !signer) {
            return { success: false, error: 'Contrat ou signer manquant' };
        }
        setLoading(true);
        try {
            const tokenIdNum = Number(tokenId);
            if (!ethers.isAddress(toAddress)) {
                throw new Error('Adresse invalide');
            }

            const exists = await nftExists(tokenId);
            if (exists) {
                throw new Error(`NFT #${tokenId} existe déjà`);
            }

            let tx;
            if (contracts.nftFeatures?.hasMintWithTokenId) {
                tx = await contracts.mockNFT.mint(toAddress, tokenIdNum);
            } else if (contracts.nftFeatures?.hasMintWithURI) {
                const uri = `ipfs://QmDefault${tokenIdNum}`;
                tx = await contracts.mockNFT.mint(toAddress, uri);
            } else {
                throw new Error('Aucune fonction mint compatible');
            }

            const receipt = await tx.wait();
            return { success: true, tx, receipt, tokenId: tokenIdNum };
        } catch (error) {
            return { success: false, error: error.message || 'Erreur mint NFT' };
        } finally {
            setLoading(false);
        }
    };

    const approveNFT = async (tokenId) => {
        if (!contracts?.mockNFT || !addresses?.NFTLending) {
            return { success: false, error: 'Contrat ou adresse manquant' };
        }
        setLoading(true);
        try {
            const tx = await contracts.mockNFT.approve(addresses.NFTLending, tokenId);
            await tx.wait();
            return { success: true, tx };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const isNFTApproved = async (tokenId) => {
        if (!contracts?.mockNFT || !addresses?.NFTLending) {
            return false;
        }
        try {
            const approved = await contracts.mockNFT.getApproved(tokenId);
            return approved.toLowerCase() === addresses.NFTLending.toLowerCase();
        } catch (error) {
            console.error('Erreur vérification approbation:', error);
            return false;
        }
    };

    // ==================== LOAN FUNCTIONS ====================

    const createLoan = async (nftAddress, tokenId, amount, interestRate, duration) => {
        if (!contracts.nftLending) {
            return { success: false, error: 'Contrat non initialisé' };
        }
        setLoading(true);
        try {
            const amountWei = ethers.parseEther(amount.toString());
            const tx = await contracts.nftLending.createLoan(
                nftAddress,
                tokenId,
                amountWei,
                interestRate,
                duration
            );
            const receipt = await tx.wait();

            const event = receipt.logs.find(log => {
                try {
                    const parsedLog = contracts.nftLending.interface.parseLog(log);
                    return parsedLog?.name === 'LoanCreated';
                } catch {
                    return false;
                }
            });

            let loanId = null;
            if (event) {
                const parsedEvent = contracts.nftLending.interface.parseLog(event);
                loanId = parsedEvent?.args?.loanId;
            }

            return { success: true, tx, receipt, loanId };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const getAllLoans = async () => {
        if (!contracts.nftLending) return [];
        try {
            const totalLoans = await contracts.nftLending.loanCounter();
            const loans = [];

            for (let i = 1; i <= Number(totalLoans); i++) {
                try {
                    const loan = await contracts.nftLending.getLoan(i);
                    loans.push({
                        id: i.toString(),
                        borrower: loan.borrower,
                        lender: loan.lender,
                        nftContract: loan.nftContract,
                        tokenId: loan.tokenId.toString(),
                        amount: loan.amount,
                        interest: loan.interest || 0n,
                        interestRate: loan.interestRate.toString(),
                        startTime: Number(loan.startTime),
                        duration: Number(loan.duration),
                        isActive: loan.isActive,
                    });
                } catch (error) {
                    console.log(`Prêt #${i} non trouvé:`, error.message);
                }
            }

            return loans;
        } catch (error) {
            console.error('Erreur getAllLoans:', error);
            return [];
        }
    };

    const getAvailableLoans = async () => {
        if (!contracts.nftLending) {
            console.log('⚠️ Contract nftLending non disponible');
            return [];
        }
        try {
            console.log('📞 Appel getAvailableLoans sur le contrat...');

            // Méthode 1: Si la fonction existe dans le contrat
            if (contracts.nftLending.getAvailableLoans) {
                try {
                    const loanIds = await contracts.nftLending.getAvailableLoans();
                    console.log('📞 IDs retournés:', loanIds);

                    const loans = await Promise.all(
                        loanIds.map(async (id) => {
                            const loan = await contracts.nftLending.getLoan(id);
                            return {
                                id: id.toString(),
                                borrower: loan.borrower,
                                lender: loan.lender,
                                nftContract: loan.nftContract,
                                tokenId: loan.tokenId.toString(),
                                amount: loan.amount,
                                interest: loan.interest || 0n,
                                interestRate: loan.interestRate.toString(),
                                startTime: Number(loan.startTime),
                                duration: Number(loan.duration),
                                isActive: loan.isActive,
                            };
                        })
                    );
                    return loans;
                } catch (err) {
                    console.log('⚠️ Fonction getAvailableLoans non disponible, utilisation de getAllLoans');
                }
            }

            // Méthode 2: Fallback - filtrer côté client
            const allLoans = await getAllLoans();
            const available = allLoans.filter(loan =>
                loan.isActive && loan.lender === ethers.ZeroAddress
            );
            console.log('✅ Prêts disponibles (filtré client):', available);
            return available;

        } catch (error) {
            console.error('❌ Erreur getAvailableLoans:', error);
            return [];
        }
    };

    const getBorrowerLoans = async (borrower) => {
        if (!contracts.nftLending || !borrower) return [];
        try {
            const loanIds = await contracts.nftLending.getBorrowerLoans(borrower);
            return await Promise.all(
                loanIds.map(async (id) => {
                    const loan = await contracts.nftLending.getLoan(id);
                    return {
                        id: id.toString(),
                        borrower: loan.borrower,
                        lender: loan.lender,
                        nftContract: loan.nftContract,
                        tokenId: loan.tokenId.toString(),
                        amount: loan.amount,
                        interest: loan.interest || 0n,
                        interestRate: loan.interestRate.toString(),
                        startTime: Number(loan.startTime),
                        duration: Number(loan.duration),
                        isActive: loan.isActive,
                        isRepaid: !loan.isActive,
                    };
                })
            );
        } catch (error) {
            console.error('Erreur getBorrowerLoans:', error);
            return [];
        }
    };

    const getLenderLoans = async (lender) => {
        if (!contracts.nftLending || !lender) return [];
        try {
            const loanIds = await contracts.nftLending.getLenderLoans(lender);
            return await Promise.all(
                loanIds.map(async (id) => {
                    const loan = await contracts.nftLending.getLoan(id);
                    return {
                        id: id.toString(),
                        borrower: loan.borrower,
                        lender: loan.lender,
                        nftContract: loan.nftContract,
                        tokenId: loan.tokenId.toString(),
                        amount: loan.amount,
                        interest: loan.interest || 0n,
                        interestRate: loan.interestRate.toString(),
                        startTime: Number(loan.startTime),
                        duration: Number(loan.duration),
                        isActive: loan.isActive,
                        isRepaid: !loan.isActive,
                    };
                })
            );
        } catch (error) {
            console.error('Erreur getLenderLoans:', error);
            return [];
        }
    };

    const fundLoan = async (loanId, amount) => {
        if (!contracts.nftLending) {
            return { success: false, error: 'Contrat non initialisé' };
        }
        setLoading(true);
        try {
            const amountWei = ethers.parseEther(amount.toString());
            const tx = await contracts.nftLending.fundLoan(loanId, { value: amountWei });
            await tx.wait();
            return { success: true };
        } catch (error) {
            console.error('Erreur financement prêt:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const repayLoan = async (loanId) => {
        if (!contracts.nftLending) {
            return { success: false, error: 'Contrat non initialisé' };
        }
        setLoading(true);
        try {
            const repaymentAmount = await contracts.nftLending.calculateRepaymentAmount(loanId);
            const tx = await contracts.nftLending.repayLoan(loanId, { value: repaymentAmount });
            const receipt = await tx.wait();
            return { success: true, tx, receipt };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    const liquidateLoan = async (loanId) => {
        if (!contracts.nftLending) {
            return { success: false, error: 'Contrat non initialisé' };
        }
        setLoading(true);
        try {
            const tx = await contracts.nftLending.liquidateLoan(loanId);
            const receipt = await tx.wait();
            return { success: true, tx, receipt };
        } catch (error) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // ==================== RETURN ====================

    return {
        // Contrats
        lendingContract: contracts.nftLending,
        nftContract: contracts.mockNFT,
        addresses,
        loading,
        contractsReady,

        // NFT functions
        nftExists,
        getNFTOwner,
        mintNFT,
        approveNFT,
        isNFTApproved,

        // Loan functions
        createLoan,
        getAllLoans,
        getAvailableLoans,
        getBorrowerLoans,
        getLenderLoans,
        fundLoan,
        repayLoan,
        liquidateLoan
    };
};