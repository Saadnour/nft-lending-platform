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
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from '@mui/material';
import {
    TrendingUp,
    AccountBalanceWallet,
    Payment,
    CheckCircle,
    LocalOffer,
} from '@mui/icons-material';
import { ethers } from 'ethers';

function FundLoans({ account, provider, signer, showNotification, contract }) {
    const [availableLoans, setAvailableLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [openFundDialog, setOpenFundDialog] = useState(false);
    const [contractLoading, setContractLoading] = useState(false);

    useEffect(() => {
        if (account && contract?.lendingContract) {
            loadAvailableLoans();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, refreshKey, contract?.lendingContract]);

    useEffect(() => {
        // Rafraîchir automatiquement toutes les 30 secondes
        if (!account || !contract?.lendingContract) return;

        const interval = setInterval(() => {
            loadAvailableLoans();
        }, 30000);

        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [account, contract?.lendingContract]);

    const loadAvailableLoans = async () => {
        if (!account || !contract?.getAvailableLoans) {
            console.log('⏳ En attente du contrat...');
            return;
        }

        setLoading(true);
        try {
            console.log('📊 Chargement des prêts disponibles...');
            const loans = await contract.getAvailableLoans();

            // Filtrer pour ne pas afficher ses propres prêts
            const filteredLoans = loans.filter(loan =>
                loan.borrower.toLowerCase() !== account.toLowerCase()
            );

            console.log('✅ Prêts disponibles:', filteredLoans);
            setAvailableLoans(filteredLoans || []);
        } catch (error) {
            console.error('❌ Erreur chargement prêts:', error);
            showNotification('Erreur lors du chargement des prêts disponibles', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenFundDialog = (loan) => {
        setSelectedLoan(loan);
        setOpenFundDialog(true);
    };

    const handleFundLoan = async () => {
        if (!selectedLoan || !contract?.fundLoan) return;

        setContractLoading(true);
        try {
            const amount = ethers.formatEther(selectedLoan.amount);
            const result = await contract.fundLoan(selectedLoan.id, amount);

            if (result.success) {
                showNotification('✅ Prêt financé avec succès! Vous recevrez le remboursement avec intérêts.', 'success');
                setOpenFundDialog(false);
                setRefreshKey(prev => prev + 1);
            } else {
                showNotification(`❌ Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            showNotification(`❌ Erreur: ${error.message}`, 'error');
        } finally {
            setContractLoading(false);
        }
    };

    const calculateTotalReturn = (loan) => {
        const principal = Number(ethers.formatEther(loan.amount));
        const rate = Number(loan.interestRate) / 100 / 100; // Convertir basis points en décimal
        const days = Number(loan.duration);
        const interest = (principal * rate * days) / 365;
        const total = principal + interest;

        return {
            principal: principal.toFixed(4),
            interest: interest.toFixed(4),
            total: total.toFixed(4),
            roi: ((interest / principal) * 100).toFixed(2)
        };
    };

    const LoanCard = ({ loan }) => {
        const amount = ethers.formatEther(loan.amount);
        const interestRate = (Number(loan.interestRate) / 100).toFixed(2);
        const returns = calculateTotalReturn(loan);

        return (
            <Card sx={{ height: '100%', position: 'relative' }}>
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
                            icon={<LocalOffer />}
                            label="Disponible"
                            color="success"
                            size="small"
                        />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    {/* Details du prêt */}
                    <Grid container spacing={1.5}>
                        <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">
                                NFT Garantie
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
                                ROI
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="success.main">
                                {returns.roi}%
                            </Typography>
                        </Grid>

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
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    {/* Rendement estimé */}
                    <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 2, mb: 2 }}>
                        <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                            💰 Rendement estimé
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                                Principal
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                                {returns.principal} ETH
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">
                                Intérêts
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="success.main">
                                +{returns.interest} ETH
                            </Typography>
                        </Box>
                        <Divider sx={{ my: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body1" fontWeight="bold">
                                Total à recevoir
                            </Typography>
                            <Typography variant="body1" fontWeight="bold" color="primary">
                                {returns.total} ETH
                            </Typography>
                        </Box>
                    </Box>

                    {/* Action */}
                    <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        onClick={() => handleOpenFundDialog(loan)}
                        disabled={contractLoading}
                        startIcon={<Payment />}
                    >
                        Financer ce prêt
                    </Button>
                </CardContent>
            </Card>
        );
    };

    if (!account) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Alert severity="info">
                    🔌 Veuillez connecter votre wallet MetaMask pour voir les prêts disponibles
                </Alert>
            </Box>
        );
    }

    if (!contract?.lendingContract) {
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
                        💎 Prêts Disponibles
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Financez des prêts garantis par des NFTs et gagnez des intérêts
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

            {/* Statistiques */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'primary.50' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUp color="primary" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Prêts disponibles
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {availableLoans.length}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'success.50' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalanceWallet color="success" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Volume total
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {availableLoans.reduce((sum, loan) =>
                                            sum + Number(ethers.formatEther(loan.amount)), 0
                                        ).toFixed(2)} ETH
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card sx={{ bgcolor: 'warning.50' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle color="warning" />
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Taux moyen
                                    </Typography>
                                    <Typography variant="h5" fontWeight="bold">
                                        {availableLoans.length > 0
                                            ? (availableLoans.reduce((sum, loan) =>
                                                sum + Number(loan.interestRate), 0
                                            ) / availableLoans.length / 100).toFixed(2)
                                            : '0.00'
                                        }% /an
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : availableLoans.length === 0 ? (
                <Alert severity="info" sx={{ textAlign: 'center' }}>
                    Aucun prêt disponible pour le moment. Revenez plus tard pour découvrir de nouvelles opportunités d'investissement.
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {availableLoans.map((loan) => (
                        <Grid item xs={12} md={6} lg={4} key={loan.id}>
                            <LoanCard loan={loan} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog de confirmation de financement */}
            <Dialog open={openFundDialog} onClose={() => setOpenFundDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    💰 Financer le prêt #{selectedLoan?.id}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Vous allez financer ce prêt. L'emprunteur recevra les fonds immédiatement et vous serez remboursé avec intérêts à la fin de la période.
                    </Alert>

                    {selectedLoan && (
                        <>
                            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 2, mb: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Montant à envoyer
                                </Typography>
                                <Typography variant="h4" fontWeight="bold" color="primary">
                                    {ethers.formatEther(selectedLoan.amount)} ETH
                                </Typography>
                            </Box>

                            <Box sx={{ bgcolor: 'success.50', p: 2, borderRadius: 2 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    📊 Détails du retour sur investissement
                                </Typography>
                                {(() => {
                                    const returns = calculateTotalReturn(selectedLoan);
                                    return (
                                        <>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Durée</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {selectedLoan.duration} jours
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Taux d'intérêt</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {(Number(selectedLoan.interestRate) / 100).toFixed(2)}% /an
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Intérêts à recevoir</Typography>
                                                <Typography variant="body2" fontWeight="medium" color="success.main">
                                                    +{returns.interest} ETH
                                                </Typography>
                                            </Box>
                                            <Divider sx={{ my: 1 }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Typography variant="body1" fontWeight="bold">Total à recevoir</Typography>
                                                <Typography variant="body1" fontWeight="bold" color="primary">
                                                    {returns.total} ETH
                                                </Typography>
                                            </Box>
                                        </>
                                    );
                                })()}
                            </Box>

                            <Alert severity="warning" sx={{ mt: 2 }}>
                                ⚠️ Le NFT Token #{selectedLoan.tokenId?.toString()} sert de garantie. Si l'emprunteur ne rembourse pas à temps, vous pourrez récupérer le NFT.
                            </Alert>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenFundDialog(false)} disabled={contractLoading}>
                        Annuler
                    </Button>
                    <Button
                        onClick={handleFundLoan}
                        variant="contained"
                        disabled={contractLoading}
                        startIcon={contractLoading ? <CircularProgress size={16} /> : <Payment />}
                    >
                        Confirmer le financement
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default FundLoans;