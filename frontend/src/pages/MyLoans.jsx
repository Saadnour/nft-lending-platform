import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    Alert,
    CircularProgress,
    Divider,
    Tab,
    Tabs,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    AccountBalanceWallet,
    AccessTime,
    TrendingUp,
    CheckCircle,
    Warning,
    Cancel,
    Payment,
    Gavel,
} from '@mui/icons-material';
import { ethers } from 'ethers';

function MyLoans({ account, provider, signer, showNotification, contract }) {
    const [myBorrowedLoans, setMyBorrowedLoans] = useState([]);
    const [myLentLoans, setMyLentLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [openRepayDialog, setOpenRepayDialog] = useState(false);
    const [openLiquidateDialog, setOpenLiquidateDialog] = useState(false);
    const [repaymentAmount, setRepaymentAmount] = useState('0');
    const [contractLoading, setContractLoading] = useState(false);

    useEffect(() => {
        if (account && contract?.lendingContract) {
            loadMyLoans();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, refreshKey, contract?.lendingContract]);

    useEffect(() => {
        // Rafraîchir toutes les 30 secondes
        if (!account || !contract?.lendingContract) return;

        const interval = setInterval(() => {
            loadMyLoans();
        }, 30000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, contract?.lendingContract]);

    const loadMyLoans = async () => {
        if (!account || !contract?.lendingContract) {
            console.log('⏳ En attente du contrat...');
            return;
        }

        setLoading(true);
        try {
            console.log('📊 Chargement des prêts pour:', account);

            // Récupérer les IDs des prêts
            const borrowedIds = await contract.lendingContract.getBorrowerLoans(account);
            const lentIds = await contract.lendingContract.getLenderLoans(account);

            console.log('📋 IDs Prêts empruntés:', borrowedIds);
            console.log('📋 IDs Prêts financés:', lentIds);

            // Charger les détails de chaque prêt emprunté
            const borrowedLoans = [];
            for (let id of borrowedIds) {
                try {
                    const loan = await contract.lendingContract.loans(Number(id));
                    borrowedLoans.push({
                        id: Number(id),
                        borrower: loan.borrower,
                        lender: loan.lender,
                        nftContract: loan.nftContract,
                        tokenId: loan.tokenId,
                        amount: loan.amount,
                        interest: loan.interest,
                        interestRate: loan.interestRate,
                        startTime: Number(loan.startTime),
                        duration: Number(loan.duration),
                        isActive: loan.isActive,
                        isRepaid: !loan.isActive && loan.lender !== ethers.ZeroAddress
                    });
                } catch (err) {
                    console.error(`Erreur chargement prêt #${id}:`, err);
                }
            }

            // Charger les détails de chaque prêt financé
            const lentLoans = [];
            for (let id of lentIds) {
                try {
                    const loan = await contract.lendingContract.loans(Number(id));
                    lentLoans.push({
                        id: Number(id),
                        borrower: loan.borrower,
                        lender: loan.lender,
                        nftContract: loan.nftContract,
                        tokenId: loan.tokenId,
                        amount: loan.amount,
                        interest: loan.interest,
                        interestRate: loan.interestRate,
                        startTime: Number(loan.startTime),
                        duration: Number(loan.duration),
                        isActive: loan.isActive,
                        isRepaid: !loan.isActive && loan.lender !== ethers.ZeroAddress
                    });
                } catch (err) {
                    console.error(`Erreur chargement prêt #${id}:`, err);
                }
            }

            console.log('✅ Prêts empruntés chargés:', borrowedLoans);
            console.log('✅ Prêts financés chargés:', lentLoans);

            setMyBorrowedLoans(borrowedLoans);
            setMyLentLoans(lentLoans);
        } catch (error) {
            console.error('❌ Erreur chargement prêts:', error);
            showNotification('Erreur lors du chargement de vos prêts', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenRepayDialog = async (loan) => {
        console.log('🔍 Ouverture dialog remboursement pour prêt:', loan);

        // Vérifier que le prêt est actif et a un prêteur
        if (!loan.isActive || loan.lender === ethers.ZeroAddress) {
            showNotification('Ce prêt n\'est pas encore financé par un prêteur', 'warning');
            return;
        }

        try {
            setSelectedLoan(loan);

            // Calculer le montant de remboursement
            console.log('💰 Calcul du montant de remboursement...');
            const amount = await contract.lendingContract.calculateRepaymentAmount(loan.id);
            const amountInEth = ethers.formatEther(amount);
            console.log('✅ Montant calculé:', amountInEth, 'ETH');

            // Vérifier si le montant est raisonnable
            const principal = ethers.formatEther(loan.amount);
            const ratio = parseFloat(amountInEth) / parseFloat(principal);

            console.log('📊 Ratio remboursement/principal:', ratio);

            if (ratio > 2) {
                showNotification(`⚠️ Attention: Le montant de remboursement (${amountInEth} ETH) semble anormalement élevé par rapport au principal (${principal} ETH). Vérifiez le calcul des intérêts.`, 'warning');
            }

            setRepaymentAmount(amountInEth);
            setOpenRepayDialog(true);
        } catch (error) {
            console.error('❌ Erreur calcul remboursement:', error);
            showNotification('Erreur lors du calcul du remboursement', 'error');
        }
    };

    const handleOpenLiquidateDialog = (loan) => {
        // Vérifier que le prêt est bien expiré et actif
        if (!loan.isActive) {
            showNotification('Ce prêt n\'est pas actif', 'warning');
            return;
        }

        if (!isLoanExpired(loan.startTime, loan.duration)) {
            showNotification('Ce prêt n\'est pas encore expiré', 'warning');
            return;
        }

        setSelectedLoan(loan);
        setOpenLiquidateDialog(true);
    };

    const handleRepay = async () => {
        if (!selectedLoan || !contract?.lendingContract || !signer) return;

        setContractLoading(true);
        try {
            console.log('💰 Remboursement du prêt #' + selectedLoan.id);

            // Calculer le montant à rembourser
            const repayAmount = await contract.lendingContract.calculateRepaymentAmount(selectedLoan.id);
            const repayAmountEth = ethers.formatEther(repayAmount);
            console.log('💰 Montant à rembourser:', repayAmountEth, 'ETH');

            // Ajouter un petit buffer (0.1%) pour éviter les problèmes d'arrondi
            const buffer = repayAmount / 1000n; // 0.1%
            const repayAmountWithBuffer = repayAmount + buffer;
            console.log('💰 Montant avec buffer (0.1%):', ethers.formatEther(repayAmountWithBuffer), 'ETH');

            // Vérifier le solde
            const balance = await provider.getBalance(account);
            const balanceInEth = ethers.formatEther(balance);
            console.log('💳 Solde du wallet:', balanceInEth, 'ETH');

            if (balance < repayAmountWithBuffer) {
                showNotification(`❌ Fonds insuffisants. Vous avez ${balanceInEth} ETH mais ${ethers.formatEther(repayAmountWithBuffer)} ETH sont nécessaires. Obtenez des ETH de test sur un faucet.`, 'error');
                setContractLoading(false);
                return;
            }

            console.log('📤 Envoi de la transaction de remboursement...');

            // Appeler la fonction repayLoan avec le montant (avec buffer)
            const tx = await contract.lendingContract.repayLoan(selectedLoan.id, {
                value: repayAmountWithBuffer,
                gasLimit: 500000
            });

            console.log('⏳ Transaction envoyée:', tx.hash);
            showNotification('⏳ Transaction en cours...', 'info');

            const receipt = await tx.wait();
            console.log('✅ Transaction confirmée:', receipt);

            showNotification('✅ Prêt remboursé avec succès! Votre NFT vous a été retourné.', 'success');
            setOpenRepayDialog(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('❌ Erreur remboursement complète:', error);
            console.error('Détails de l\'erreur:', {
                code: error.code,
                message: error.message,
                reason: error.reason,
                data: error.data
            });

            let errorMessage = 'Erreur lors du remboursement';
            if (error.code === 'ACTION_REJECTED') {
                errorMessage = 'Transaction annulée par l\'utilisateur';
            } else if (error.message.includes('insufficient funds')) {
                errorMessage = 'Fonds insuffisants. Obtenez des ETH de test sur un faucet Sepolia.';
            } else if (error.message.includes('Insufficient repayment amount')) {
                errorMessage = 'Montant de remboursement insuffisant. Problème de calcul des intérêts.';
            } else if (error.message.includes('Loan not funded')) {
                errorMessage = 'Le prêt n\'a pas encore été financé par un prêteur';
            } else if (error.message.includes('Only borrower can repay')) {
                errorMessage = 'Seul l\'emprunteur peut rembourser ce prêt';
            } else if (error.message.includes('Loan is not active')) {
                errorMessage = 'Le prêt n\'est pas actif';
            } else if (error.reason) {
                errorMessage = error.reason;
            } else if (error.message) {
                errorMessage = error.message;
            }

            showNotification(`❌ ${errorMessage}`, 'error');
        } finally {
            setContractLoading(false);
        }
    };

    const handleLiquidate = async () => {
        if (!selectedLoan || !contract?.lendingContract || !signer) return;

        setContractLoading(true);
        try {
            console.log('⚖️ Liquidation du prêt #' + selectedLoan.id);

            // Appeler la fonction liquidateLoan
            const tx = await contract.lendingContract.liquidateLoan(selectedLoan.id, {
                gasLimit: 300000
            });

            console.log('⏳ Transaction envoyée:', tx.hash);
            showNotification('⏳ Transaction en cours...', 'info');

            const receipt = await tx.wait();
            console.log('✅ Transaction confirmée:', receipt);

            showNotification('✅ NFT liquidé avec succès! Le NFT vous a été transféré.', 'success');
            setOpenLiquidateDialog(false);
            setRefreshKey(prev => prev + 1);
        } catch (error) {
            console.error('❌ Erreur liquidation:', error);

            let errorMessage = 'Erreur lors de la liquidation';
            if (error.code === 'ACTION_REJECTED') {
                errorMessage = 'Transaction annulée par l\'utilisateur';
            } else if (error.message.includes('Loan not expired')) {
                errorMessage = 'Le prêt n\'est pas encore expiré';
            } else if (error.message) {
                errorMessage = error.message;
            }

            showNotification(`❌ ${errorMessage}`, 'error');
        } finally {
            setContractLoading(false);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const calculateEndDate = (startTime, duration) => {
        if (!startTime || !duration) return 'N/A';
        const endTimestamp = startTime + (duration * 24 * 60 * 60);
        return formatDate(endTimestamp);
    };

    const isLoanExpired = (startTime, duration) => {
        if (!startTime || !duration) return false;
        const endTimestamp = startTime + (duration * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        return now > endTimestamp;
    };

    const getTimeRemaining = (startTime, duration) => {
        if (!startTime || !duration) return null;
        const endTimestamp = startTime + (duration * 24 * 60 * 60);
        const now = Math.floor(Date.now() / 1000);
        const remaining = endTimestamp - now;

        if (remaining <= 0) return { expired: true, text: 'Expiré', percentage: 0 };

        const days = Math.floor(remaining / (24 * 60 * 60));
        const hours = Math.floor((remaining % (24 * 60 * 60)) / 3600);

        if (days > 0) {
            return { expired: false, text: `${days}j ${hours}h restantes`, percentage: (remaining / (duration * 24 * 60 * 60)) * 100 };
        } else {
            return { expired: false, text: `${hours}h restantes`, percentage: (remaining / (duration * 24 * 60 * 60)) * 100 };
        }
    };

    const getLoanStatus = (loan) => {
        if (loan.isRepaid) {
            return { label: 'Remboursé', color: 'success', icon: <CheckCircle /> };
        }
        if (!loan.isActive && loan.lender === ethers.ZeroAddress) {
            return { label: 'En attente', color: 'warning', icon: <AccessTime /> };
        }
        if (loan.isActive && isLoanExpired(loan.startTime, loan.duration)) {
            return { label: 'Expiré - Liquidable', color: 'error', icon: <Warning /> };
        }
        if (loan.isActive) {
            return { label: 'Actif', color: 'primary', icon: <TrendingUp /> };
        }
        return { label: 'Inactif', color: 'default', icon: <Cancel /> };
    };

    const LoanCard = ({ loan, isBorrower }) => {
        const status = getLoanStatus(loan);
        const amount = ethers.formatEther(loan.amount);
        const interestRate = (Number(loan.interestRate) / 100).toFixed(2);
        const timeRemaining = loan.isActive && !loan.isRepaid ? getTimeRemaining(loan.startTime, loan.duration) : null;

        return (
            <Card sx={{
                height: '100%',
                position: 'relative',
                border: timeRemaining?.expired ? '2px solid' : 'none',
                borderColor: 'error.main',
            }}>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">
                                Prêt #{loan.id}
                            </Typography>
                            <Typography variant="h6" fontWeight="bold">
                                {amount} ETH
                            </Typography>
                        </Box>
                        <Chip
                            icon={status.icon}
                            label={status.label}
                            color={status.color}
                            size="small"
                        />
                    </Box>

                    {/* Barre de progression du temps */}
                    {timeRemaining && (
                        <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Temps restant
                                </Typography>
                                <Typography variant="caption" fontWeight="medium" color={timeRemaining.expired ? 'error' : 'primary'}>
                                    {timeRemaining.text}
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={timeRemaining.expired ? 0 : timeRemaining.percentage}
                                color={timeRemaining.expired ? 'error' : timeRemaining.percentage < 20 ? 'warning' : 'primary'}
                                sx={{ height: 6, borderRadius: 3 }}
                            />
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* Details */}
                    <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                NFT Token ID
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                #{loan.tokenId?.toString()}
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Taux d'intérêt
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="primary">
                                {interestRate}% /an
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Durée
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {loan.duration} jours
                            </Typography>
                        </Grid>

                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                Date de fin
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {loan.isActive ? calculateEndDate(loan.startTime, loan.duration) : 'N/A'}
                            </Typography>
                        </Grid>

                        {isBorrower && loan.lender !== ethers.ZeroAddress && (
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                    Prêteur
                                </Typography>
                                <Typography variant="body2" fontWeight="medium" sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                }}>
                                    {loan.lender.slice(0, 10)}...{loan.lender.slice(-8)}
                                </Typography>
                            </Grid>
                        )}

                        {!isBorrower && (
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary">
                                    Emprunteur
                                </Typography>
                                <Typography variant="body2" fontWeight="medium" sx={{
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                }}>
                                    {loan.borrower.slice(0, 10)}...{loan.borrower.slice(-8)}
                                </Typography>
                            </Grid>
                        )}
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Actions */}
                    {isBorrower && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {!loan.isActive && loan.lender === ethers.ZeroAddress && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" width="100%">
                                    ⏳ En attente d'un prêteur - Votre NFT est en garantie
                                </Typography>
                            )}
                            {loan.isActive && !loan.isRepaid && (
                                <>
                                    {timeRemaining?.expired ? (
                                        <Alert severity="error" sx={{ width: '100%', py: 0.5 }}>
                                            ⚠️ Prêt expiré! Le prêteur peut saisir votre NFT
                                        </Alert>
                                    ) : (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            fullWidth
                                            onClick={() => handleOpenRepayDialog(loan)}
                                            disabled={contractLoading}
                                            startIcon={<Payment />}
                                        >
                                            Rembourser
                                        </Button>
                                    )}
                                </>
                            )}
                            {loan.isRepaid && (
                                <Typography variant="body2" color="success.main" textAlign="center" width="100%">
                                    ✅ Prêt remboursé - NFT récupéré
                                </Typography>
                            )}
                        </Box>
                    )}

                    {!isBorrower && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {loan.isActive && !loan.isRepaid && timeRemaining?.expired && (
                                <Button
                                    variant="contained"
                                    color="error"
                                    fullWidth
                                    onClick={() => handleOpenLiquidateDialog(loan)}
                                    disabled={contractLoading}
                                    startIcon={<Gavel />}
                                >
                                    Liquider le NFT
                                </Button>
                            )}
                            {loan.isActive && !loan.isRepaid && !timeRemaining?.expired && (
                                <Typography variant="body2" color="success.main" textAlign="center" width="100%">
                                    ✅ Prêt en cours - En attente du remboursement
                                </Typography>
                            )}
                            {loan.isRepaid && (
                                <Typography variant="body2" color="success.main" textAlign="center" width="100%">
                                    ✅ Prêt remboursé - Vous avez reçu le paiement
                                </Typography>
                            )}
                        </Box>
                    )}
                </CardContent>
            </Card>
        );
    };

    if (!account) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Alert severity="info">
                    🔌 Veuillez connecter votre wallet MetaMask pour voir vos prêts
                </Alert>
            </Box>
        );
    }

    if (!contract?.lendingContract || !signer) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>Chargement des contrats...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        📋 Mes Prêts
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Gérez vos prêts créés et financés
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    onClick={() => setRefreshKey(prev => prev + 1)}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} /> : null}
                >
                    Rafraîchir
                </Button>
            </Box>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
                    <Tab
                        label={`Mes emprunts (${myBorrowedLoans.length})`}
                        icon={<AccountBalanceWallet />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`Mes investissements (${myLentLoans.length})`}
                        icon={<TrendingUp />}
                        iconPosition="start"
                    />
                </Tabs>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* Onglet: Prêts que j'ai créés (empruntés) */}
                    {activeTab === 0 && (
                        <Box>
                            {myBorrowedLoans.length === 0 ? (
                                <Alert severity="info" sx={{ textAlign: 'center' }}>
                                    Vous n'avez pas encore créé de prêt. Utilisez votre NFT comme garantie pour emprunter des ETH.
                                </Alert>
                            ) : (
                                <Grid container spacing={3}>
                                    {myBorrowedLoans.map((loan) => (
                                        <Grid item xs={12} md={6} lg={4} key={loan.id}>
                                            <LoanCard loan={loan} isBorrower={true} />
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}

                    {/* Onglet: Prêts que j'ai financés (prêtés) */}
                    {activeTab === 1 && (
                        <Box>
                            {myLentLoans.length === 0 ? (
                                <Alert severity="info" sx={{ textAlign: 'center' }}>
                                    Vous n'avez pas encore financé de prêt. Consultez les prêts disponibles pour investir.
                                </Alert>
                            ) : (
                                <Grid container spacing={3}>
                                    {myLentLoans.map((loan) => (
                                        <Grid item xs={12} md={6} lg={4} key={loan.id}>
                                            <LoanCard loan={loan} isBorrower={false} />
                                        </Grid>
                                    ))}
                                </Grid>
                            )}
                        </Box>
                    )}
                </>
            )}

            {/* Dialog Remboursement */}
            <Dialog open={openRepayDialog} onClose={() => setOpenRepayDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    💰 Rembourser le prêt #{selectedLoan?.id || ''}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Vous êtes sur le point de rembourser votre prêt. Votre NFT vous sera retourné après le remboursement.
                    </Alert>
                    <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Montant à rembourser (principal + intérêts)
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary">
                            {repaymentAmount || '0'} ETH
                        </Typography>
                    </Box>
                    <Alert severity="warning" icon="ℹ️">
                        Un petit supplément (0.1%) est ajouté pour compenser les variations d'intérêts. Le surplus vous sera automatiquement remboursé.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenRepayDialog(false)} disabled={contractLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleRepay}
                        variant="contained"
                        disabled={contractLoading}
                        startIcon={contractLoading ? <CircularProgress size={16} /> : <Payment />}
                    >
                        Confirmer le remboursement
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog Liquidation */}
            <Dialog open={openLiquidateDialog} onClose={() => setOpenLiquidateDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    ⚖️ Liquider le NFT #{selectedLoan?.tokenId?.toString() || ''}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        Le prêt est expiré et n'a pas été remboursé. Vous pouvez maintenant récupérer le NFT en garantie.
                    </Alert>
                    <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2 }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            Prêt #{selectedLoan?.id || ''}
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                            NFT Token ID: #{selectedLoan?.tokenId?.toString() || ''}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Le NFT sera transféré à votre adresse
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenLiquidateDialog(false)} disabled={contractLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleLiquidate}
                        variant="contained"
                        color="error"
                        disabled={contractLoading}
                        startIcon={contractLoading ? <CircularProgress size={16} /> : <Gavel />}
                    >
                        Liquider le NFT
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default MyLoans;