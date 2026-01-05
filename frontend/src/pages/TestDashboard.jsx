import React,{ useState } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Button,
    TextField,
    Card,
    CardContent,
    Divider,
    Alert,
    Snackbar,
    Stack,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Send,
    AttachMoney,
    AccountBalance,
    TrendingUp,
    Assessment,
} from '@mui/icons-material';

export default function TestDashboard() {
    const [tabValue, setTabValue] = useState(0);
    const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

    const [loanAmount, setLoanAmount] = useState('');
    const [nftId, setNftId] = useState('');
    const [interestRate, setInterestRate] = useState('5');
    const [duration, setDuration] = useState('30');

    const stats = [
        { label: 'Prêts Actifs', value: '12', icon: <AccountBalance />, color: 'primary' },
        { label: 'Total Prêté', value: '45.5 ETH', icon: <AttachMoney />, color: 'success' },
        { label: 'Intérêts Gagnés', value: '2.3 ETH', icon: <TrendingUp />, color: 'warning' },
        { label: 'NFTs Garantis', value: '18', icon: <Assessment />, color: 'secondary' },
    ];

    const handleCreateLoan = async () => {
        try {
            console.log('Test: Création de prêt', {
                nftId,
                loanAmount,
                interestRate,
                duration
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            setNotification({
                open: true,
                message: `Prêt créé avec succès! NFT #${nftId} pour ${loanAmount} ETH`,
                severity: 'success'
            });

            setNftId('');
            setLoanAmount('');
        } catch (error) {
            setNotification({
                open: true,
                message: 'Erreur lors de la création du prêt',
                severity: 'error'
            });
        }
    };

    const handleRepayLoan = async () => {
        try {
            console.log('Test: Remboursement de prêt');
            await new Promise(resolve => setTimeout(resolve, 1000));

            setNotification({
                open: true,
                message: 'Prêt remboursé avec succès!',
                severity: 'success'
            });
        } catch (error) {
            setNotification({
                open: true,
                message: 'Erreur lors du remboursement',
                severity: 'error'
            });
        }
    };

    const handleLiquidate = async () => {
        try {
            console.log('Test: Liquidation de garantie');
            await new Promise(resolve => setTimeout(resolve, 1000));

            setNotification({
                open: true,
                message: 'NFT liquidé avec succès!',
                severity: 'warning'
            });
        } catch (error) {
            setNotification({
                open: true,
                message: 'Erreur lors de la liquidation',
                severity: 'error'
            });
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                🧪 Dashboard de Test - Fonctionnalités NFT Lending
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                {stats.map((stat, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                        <Card
                            sx={{
                                height: '100%',
                                background: `linear-gradient(135deg, ${
                                    stat.color === 'primary' ? '#00d4ff15' :
                                        stat.color === 'success' ? '#00ff0015' :
                                            stat.color === 'warning' ? '#ffaa0015' :
                                                '#ff00ff15'
                                }, transparent)`,
                            }}
                        >
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box
                                        sx={{
                                            p: 1.5,
                                            borderRadius: 2,
                                            bgcolor: `${stat.color}.main`,
                                            display: 'flex',
                                            color: 'white'
                                        }}
                                    >
                                        {stat.icon}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {stat.label}
                                        </Typography>
                                        <Typography variant="h5" fontWeight="bold">
                                            {stat.value}
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Paper sx={{ mb: 3 }}>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
                    <Tab label="Créer un Prêt" />
                    <Tab label="Gérer les Prêts" />
                    <Tab label="Tests Rapides" />
                </Tabs>
            </Paper>

            {tabValue === 0 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Créer un nouveau prêt
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="NFT Token ID"
                                value={nftId}
                                onChange={(e) => setNftId(e.target.value)}
                                placeholder="Ex: 1234"
                                helperText="ID du NFT utilisé comme garantie"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Montant du prêt (ETH)"
                                type="number"
                                value={loanAmount}
                                onChange={(e) => setLoanAmount(e.target.value)}
                                placeholder="Ex: 1.5"
                                helperText="Montant à emprunter"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Taux d'intérêt (%)"
                                type="number"
                                value={interestRate}
                                onChange={(e) => setInterestRate(e.target.value)}
                                helperText="Taux d'intérêt annuel"
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Durée (jours)"
                                type="number"
                                value={duration}
                                onChange={(e) => setDuration(e.target.value)}
                                helperText="Durée du prêt en jours"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<Send />}
                                onClick={handleCreateLoan}
                                disabled={!nftId || !loanAmount}
                            >
                                Créer le Prêt
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {tabValue === 1 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Actions sur les prêts existants
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Stack spacing={2}>
                        <Alert severity="info">
                            Sélectionnez un prêt pour effectuer des actions
                        </Alert>

                        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={handleRepayLoan}
                            >
                                Rembourser un Prêt
                            </Button>

                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleLiquidate}
                            >
                                Liquider un NFT
                            </Button>

                            <Button
                                variant="outlined"
                                onClick={() => console.log('Voir détails')}
                            >
                                Voir les Détails
                            </Button>
                        </Box>
                    </Stack>
                </Paper>
            )}

            {tabValue === 2 && (
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Tests rapides des fonctionnalités
                    </Typography>
                    <Divider sx={{ mb: 3 }} />

                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Connexion Wallet')}
                            >
                                Tester Connexion Wallet
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Lecture contrat')}
                            >
                                Lire État du Contrat
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Events')}
                            >
                                Écouter les Events
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Approbation NFT')}
                            >
                                Approuver NFT
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Calcul intérêts')}
                            >
                                Calculer Intérêts
                            </Button>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={() => console.log('Test: Vérif collateral')}
                            >
                                Vérifier Collatéral
                            </Button>
                        </Grid>
                    </Grid>

                    <Alert severity="success" sx={{ mt: 3 }}>
                        Tous les tests s'exécutent sans restrictions - Parfait pour le développement!
                    </Alert>
                </Paper>
            )}

            <Snackbar
                open={notification.open}
                autoHideDuration={4000}
                onClose={() => setNotification({ ...notification, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    severity={notification.severity}
                    onClose={() => setNotification({ ...notification, open: false })}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}