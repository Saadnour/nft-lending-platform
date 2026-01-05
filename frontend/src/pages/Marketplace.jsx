import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    Chip,
    TextField,
    MenuItem,
    Alert,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    Avatar,
    InputAdornment,
} from '@mui/material';
import {
    Search,
    TrendingUp,
    Image as ImageIcon,
} from '@mui/icons-material';
import { ethers } from 'ethers';

// Page principale du Marketplace
function Marketplace({ account, provider, signer, showNotification, contract }) {
    const [allLoans, setAllLoans] = useState([]);
    const [filteredLoans, setFilteredLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [fundDialogOpen, setFundDialogOpen] = useState(false);
    const [funding, setFunding] = useState(false);

    // Filtres
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('recent');
    const [filterStatus, setFilterStatus] = useState('available');

    useEffect(() => {
        loadAllLoans();
    }, [contract.lendingContract]);

    useEffect(() => {
        applyFilters();
    }, [allLoans, searchTerm, sortBy, filterStatus]);

    const loadAllLoans = async () => {
        if (!contract.lendingContract) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const loans = [];

            // Parcourir les IDs de prêts (ajuster la limite selon vos besoins)
            for (let i = 1; i <= 100; i++) {
                try {
                    const loan = await contract.lendingContract.getLoan(i);

                    // Vérifier si le prêt existe (borrower != address(0))
                    if (loan.borrower !== ethers.ZeroAddress) {
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
                            isFunded: loan.lender !== ethers.ZeroAddress,
                            isRepaid: loan.isRepaid || false,
                        });
                    }
                } catch (e) {
                    // Si getLoan échoue, on a probablement atteint la fin
                    if (e.message.includes('Invalid loan ID') || e.message.includes('revert')) {
                        break;
                    }
                }
            }

            console.log(`✅ ${loans.length} prêts chargés dans le marketplace`);
            setAllLoans(loans);
        } catch (error) {
            console.error('Erreur chargement prêts:', error);
            showNotification('Erreur lors du chargement des prêts', 'error');
        }
        setLoading(false);
    };

    const applyFilters = () => {
        let filtered = [...allLoans];

        // Filtre par statut
        if (filterStatus === 'available') {
            filtered = filtered.filter(loan => !loan.isFunded && loan.isActive);
        } else if (filterStatus === 'funded') {
            filtered = filtered.filter(loan => loan.isFunded && loan.isActive);
        } else if (filterStatus === 'completed') {
            filtered = filtered.filter(loan => !loan.isActive);
        }

        // Recherche
        if (searchTerm) {
            filtered = filtered.filter(loan =>
                loan.id.includes(searchTerm) ||
                loan.tokenId.includes(searchTerm) ||
                loan.borrower.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Tri
        if (sortBy === 'recent') {
            filtered.sort((a, b) => Number(b.id) - Number(a.id));
        } else if (sortBy === 'amount-high') {
            filtered.sort((a, b) => Number(b.amount - a.amount));
        } else if (sortBy === 'amount-low') {
            filtered.sort((a, b) => Number(a.amount - b.amount));
        } else if (sortBy === 'rate-high') {
            filtered.sort((a, b) => Number(b.interestRate) - Number(a.interestRate));
        } else if (sortBy === 'rate-low') {
            filtered.sort((a, b) => Number(a.interestRate) - Number(b.interestRate));
        }

        setFilteredLoans(filtered);
    };

    const handleFundLoan = (loan) => {
        setSelectedLoan(loan);
        setFundDialogOpen(true);
    };

    const confirmFundLoan = async () => {
        if (!selectedLoan || !contract.fundLoan) return;

        setFunding(true);
        try {
            const amountInEth = ethers.formatEther(selectedLoan.amount);

            showNotification('⏳ Transaction en cours...', 'info');

            const result = await contract.fundLoan(selectedLoan.id, amountInEth);

            if (result.success) {
                showNotification('✅ Prêt financé avec succès!', 'success');
                setFundDialogOpen(false);
                loadAllLoans(); // Recharger
            } else {
                showNotification(`❌ Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur financement:', error);
            showNotification(`❌ Erreur: ${error.message}`, 'error');
        }
        setFunding(false);
    };

    const calculateAPY = (interestRate) => {
        return (Number(interestRate) / 100).toFixed(2);
    };

    const calculateTotalReturn = (amount, interestRate, duration) => {
        const principal = Number(ethers.formatEther(amount));
        const rate = Number(interestRate) / 10000;
        const days = Number(duration) / 86400;
        const interest = principal * rate * (days / 365);
        return (principal + interest).toFixed(4);
    };

    if (!account) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Alert severity="info">
                    🔌 Connectez votre wallet pour accéder au marketplace
                </Alert>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>Chargement du marketplace...</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                🏪 Marketplace de Prêts NFT
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Financez des prêts garantis par des NFTs et gagnez des intérêts
            </Typography>

            {/* Statistiques */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">
                                Prêts disponibles
                            </Typography>
                            <Typography variant="h4" color="primary">
                                {allLoans.filter(l => !l.isFunded && l.isActive).length}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">
                                Volume total
                            </Typography>
                            <Typography variant="h4" color="success.main">
                                {allLoans
                                    .reduce((sum, l) => sum + Number(ethers.formatEther(l.amount)), 0)
                                    .toFixed(2)} ETH
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="text.secondary" variant="caption">
                                Taux moyen
                            </Typography>
                            <Typography variant="h4" color="warning.main">
                                {allLoans.length > 0
                                    ? (allLoans.reduce((sum, l) => sum + Number(l.interestRate), 0) / allLoans.length / 100).toFixed(2)
                                    : '0.00'}%
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Filtres */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Rechercher par ID, Token ID ou adresse..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Search />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Statut"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <MenuItem value="available">💰 Disponibles</MenuItem>
                                <MenuItem value="funded">✅ Financés</MenuItem>
                                <MenuItem value="completed">🏁 Terminés</MenuItem>
                                <MenuItem value="all">📋 Tous</MenuItem>
                            </TextField>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                select
                                size="small"
                                label="Trier par"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <MenuItem value="recent">📅 Plus récents</MenuItem>
                                <MenuItem value="amount-high">💎 Montant (élevé)</MenuItem>
                                <MenuItem value="amount-low">💵 Montant (faible)</MenuItem>
                                <MenuItem value="rate-high">📈 Taux (élevé)</MenuItem>
                                <MenuItem value="rate-low">📉 Taux (faible)</MenuItem>
                            </TextField>
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {/* Liste des prêts */}
            {filteredLoans.length === 0 ? (
                <Alert severity="info">
                    {allLoans.length === 0
                        ? "Aucun prêt créé sur la plateforme"
                        : "Aucun prêt ne correspond à vos critères"}
                </Alert>
            ) : (
                <Grid container spacing={3}>
                    {filteredLoans.map((loan) => (
                        <Grid item xs={12} md={6} lg={4} key={loan.id}>
                            <LoanCard
                                loan={loan}
                                onFund={handleFundLoan}
                                calculateAPY={calculateAPY}
                                calculateTotalReturn={calculateTotalReturn}
                                isOwner={account?.toLowerCase() === loan.borrower.toLowerCase()}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Dialog confirmation financement */}
            <Dialog open={fundDialogOpen} onClose={() => !funding && setFundDialogOpen(false)}>
                <DialogTitle>💰 Financer ce prêt</DialogTitle>
                <DialogContent>
                    {selectedLoan && (
                        <Box>
                            <Alert severity="warning" sx={{ mb: 2 }}>
                                Vous allez envoyer <strong>{ethers.formatEther(selectedLoan.amount)} ETH</strong>
                            </Alert>

                            <Typography variant="caption" color="text.secondary">Prêt ID</Typography>
                            <Typography variant="h6" sx={{ mb: 2 }}>#{selectedLoan.id}</Typography>

                            <Typography variant="caption" color="text.secondary">NFT Token ID</Typography>
                            <Typography variant="h6" sx={{ mb: 2 }}>#{selectedLoan.tokenId}</Typography>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Montant</Typography>
                                <Typography fontWeight="bold">
                                    {ethers.formatEther(selectedLoan.amount)} ETH
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography>Taux APY</Typography>
                                <Typography fontWeight="bold" color="success.main">
                                    {calculateAPY(selectedLoan.interestRate)}%
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                <Typography>Durée</Typography>
                                <Typography fontWeight="bold">
                                    {(Number(selectedLoan.duration) / 86400).toFixed(0)} jours
                                </Typography>
                            </Box>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6">Vous recevrez</Typography>
                                <Typography variant="h6" color="primary">
                                    {calculateTotalReturn(
                                        selectedLoan.amount,
                                        selectedLoan.interestRate,
                                        selectedLoan.duration
                                    )} ETH
                                </Typography>
                            </Box>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                💡 L'emprunteur devra rembourser ce montant pour récupérer son NFT
                            </Alert>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFundDialogOpen(false)} disabled={funding}>
                        Annuler
                    </Button>
                    <Button
                        variant="contained"
                        onClick={confirmFundLoan}
                        disabled={funding}
                        startIcon={funding && <CircularProgress size={20} />}
                    >
                        {funding ? 'Transaction...' : 'Confirmer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// Carte de prêt
function LoanCard({ loan, onFund, calculateAPY, calculateTotalReturn, isOwner }) {
    return (
        <Card
            sx={{
                height: '100%',
                border: loan.isFunded ? '1px solid' : '2px solid',
                borderColor: loan.isFunded ? 'divider' : 'primary.main',
                '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 },
                transition: 'all 0.2s',
                position: 'relative',
            }}
        >
            {/* Badge statut */}
            <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
                {!loan.isFunded && loan.isActive && (
                    <Chip label="💰 Disponible" color="success" size="small" />
                )}
                {loan.isFunded && loan.isActive && (
                    <Chip label="✅ Financé" color="primary" size="small" />
                )}
                {!loan.isActive && (
                    <Chip label="🏁 Terminé" color="default" size="small" />
                )}
            </Box>

            <CardContent sx={{ pt: 5 }}>
                {/* NFT Info */}
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 48, height: 48 }}>
                        <ImageIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            NFT Token ID
                        </Typography>
                        <Typography variant="h6">#{loan.tokenId}</Typography>
                        <Typography variant="caption" color="text.secondary">
                            Prêt #{loan.id}
                        </Typography>
                    </Box>
                </Box>

                {/* Informations du prêt */}
                <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">💵 Montant</Typography>
                        <Typography variant="h6" fontWeight="bold">
                            {ethers.formatEther(loan.amount)} ETH
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">📈 APY</Typography>
                        <Typography variant="h6" fontWeight="bold" color="success.main">
                            {calculateAPY(loan.interestRate)}%
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">⏱️ Durée</Typography>
                        <Typography fontWeight="bold">
                            {(Number(loan.duration) / 86400).toFixed(0)} jours
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">🎯 Retour total</Typography>
                        <Typography color="primary" fontWeight="bold">
                            {calculateTotalReturn(loan.amount, loan.interestRate, loan.duration)} ETH
                        </Typography>
                    </Grid>
                </Grid>

                {/* Actions */}
                {!loan.isFunded && loan.isActive && !isOwner && (
                    <Button
                        variant="contained"
                        fullWidth
                        size="large"
                        startIcon={<TrendingUp />}
                        onClick={() => onFund(loan)}
                        sx={{ mt: 1 }}
                    >
                        Financer ce prêt
                    </Button>
                )}

                {isOwner && !loan.isFunded && (
                    <Chip
                        label="🏷️ Votre demande de prêt"
                        color="info"
                        sx={{ width: '100%', mt: 1 }}
                    />
                )}

                {loan.isFunded && (
                    <Alert severity="info" sx={{ mt: 2 }}>
                        <Typography variant="caption">
                            Financé par: {loan.lender.slice(0, 6)}...{loan.lender.slice(-4)}
                        </Typography>
                    </Alert>
                )}

                {!loan.isActive && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                        Prêt remboursé et terminé
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
}

export default Marketplace;