import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Stepper,
    Step,
    StepLabel,
    Alert,
    CircularProgress,
    Divider,
    Chip,
    Switch,
    FormControlLabel,
} from '@mui/material';
import {
    CheckCircle,
    Send,
    Warning,
    AccountBalanceWallet,
    Science,
} from '@mui/icons-material';
import { useContract } from '../hooks/useContract';

const steps = ['Informations NFT', 'Conditions du prêt', 'Confirmation'];

function CreateLoan({ account, provider, signer, showNotification }) {
    const {
        createLoan,
        approveNFT,
        getNFTOwner,
        isNFTApproved,
        loading: contractLoading,
        addresses,
    } = useContract(provider, signer);

    const [activeStep, setActiveStep] = useState(0);
    const [formData, setFormData] = useState({
        nftAddress: '',
        tokenId: '',
        amount: '',
        interestRate: '5',
        duration: '30',
    });
    const [isApproved, setIsApproved] = useState(false);
    const [checking, setChecking] = useState(false);
    const [nftOwnershipVerified, setNftOwnershipVerified] = useState(false);
    const [testMode, setTestMode] = useState(false);
    const [contractTestMode, setContractTestMode] = useState(false);

    // Vérifier le mode test du contrat
    useEffect(() => {
        const checkContractTestMode = async () => {
            if (signer) {
                try {
                    const lendingContract = new ethers.Contract(
                        addresses?.NFTLending,
                        ['function testMode() view returns (bool)'],
                        signer
                    );
                    const isTestMode = await lendingContract.testMode();
                    setContractTestMode(isTestMode);
                    setTestMode(isTestMode);
                    console.log('🧪 Mode test du contrat:', isTestMode);

                    // Ajuster la durée par défaut selon le mode
                    if (isTestMode) {
                        setFormData(prev => ({ ...prev, duration: '2' }));
                    }
                } catch (error) {
                    console.log('ℹ️ Contrat sans mode test (version ancienne)');
                    setContractTestMode(false);
                    setTestMode(false);
                }
            }
        };
        checkContractTestMode();
    }, [signer, addresses]);

    // Mettre à jour l'adresse NFT quand elle est disponible
    useEffect(() => {
        if (addresses?.MockNFT) {
            setFormData(prev => ({
                ...prev,
                nftAddress: addresses.MockNFT,
            }));
        }
    }, [addresses]);

    const handleChange = (field) => (event) => {
        const value = event.target.value;

        setFormData({
            ...formData,
            [field]: value,
        });

        // Reset verification si le tokenId change
        if (field === 'tokenId') {
            setNftOwnershipVerified(false);
            setIsApproved(false);
        }
    };

    const checkNFTOwnership = async () => {
        if (!formData.tokenId || !account) {
            showNotification("Veuillez entrer un Token ID", 'warning');
            return false;
        }

        setChecking(true);
        try {
            const owner = await getNFTOwner(formData.tokenId);

            if (!owner) {
                showNotification(`Le NFT #${formData.tokenId} n'existe pas`, 'error');
                return false;
            }

            if (owner.toLowerCase() !== account.toLowerCase()) {
                showNotification(`Ce NFT appartient à une autre adresse`, 'error');
                return false;
            }

            // Vérifier si déjà approuvé
            const approved = await isNFTApproved(formData.tokenId);
            setIsApproved(approved);
            setNftOwnershipVerified(true);

            if (approved) {
                showNotification('✅ NFT vérifié et déjà approuvé!', 'success');
            } else {
                showNotification('✅ NFT vérifié! Vous êtes le propriétaire.', 'success');
            }

            return true;
        } catch (error) {
            console.error('Erreur lors de la vérification:', error);
            const errorMsg = error.message || "Erreur lors de la vérification du NFT";
            showNotification(errorMsg, 'error');
            setNftOwnershipVerified(false);
            setIsApproved(false);
            return false;
        } finally {
            setChecking(false);
        }
    };

    const handleApproveNFT = async () => {
        if (!nftOwnershipVerified) {
            showNotification('Veuillez d\'abord vérifier la propriété du NFT', 'warning');
            return;
        }

        const result = await approveNFT(formData.tokenId);
        if (result.success) {
            setIsApproved(true);
            showNotification('NFT approuvé avec succès!', 'success');
        } else {
            showNotification(`Erreur d'approbation: ${result.error}`, 'error');
        }
    };

    const validateStep = (step) => {
        switch (step) {
            case 0:
                if (!formData.tokenId) {
                    showNotification('Veuillez entrer un Token ID', 'warning');
                    return false;
                }
                if (!nftOwnershipVerified) {
                    showNotification('Veuillez vérifier la propriété du NFT', 'warning');
                    return false;
                }
                return true;

            case 1:
                if (!formData.amount || parseFloat(formData.amount) <= 0) {
                    showNotification('Veuillez entrer un montant valide', 'warning');
                    return false;
                }
                if (!formData.interestRate || parseFloat(formData.interestRate) < 0) {
                    showNotification('Veuillez entrer un taux d\'intérêt valide', 'warning');
                    return false;
                }
                if (!formData.duration || parseFloat(formData.duration) <= 0) {
                    showNotification('Veuillez entrer une durée valide', 'warning');
                    return false;
                }
                return true;

            default:
                return true;
        }
    };

    const handleNext = async () => {
        if (activeStep === 0 && !nftOwnershipVerified) {
            const isValid = await checkNFTOwnership();
            if (!isValid) return;
        }

        if (!validateStep(activeStep)) return;

        if (activeStep === steps.length - 1) {
            await handleCreateLoan();
        } else {
            setActiveStep((prevStep) => prevStep + 1);
        }
    };

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const handleCreateLoan = async () => {
        if (!isApproved) {
            showNotification('Veuillez d\'abord approuver le NFT', 'warning');
            return;
        }

        try {
            console.log('📝 Création du prêt...');
            console.log('Mode:', testMode ? 'TEST (minutes)' : 'PRODUCTION (jours)');
            console.log('Durée brute:', formData.duration);

            // Convertir la durée en nombre entier
            const durationValue = parseFloat(formData.duration);
            let durationInt;

            if (testMode) {
                // En mode test : arrondir au minimum à 1 minute
                durationInt = Math.max(1, Math.round(durationValue));
            } else {
                // En mode production : arrondir au minimum à 1 jour
                durationInt = Math.max(1, Math.round(durationValue));
            }

            console.log('Durée convertie:', durationInt, testMode ? 'minutes' : 'jours');

            if (durationInt <= 0) {
                showNotification('La durée doit être supérieure à 0', 'error');
                return;
            }

            const result = await createLoan(
                formData.nftAddress,
                formData.tokenId,
                formData.amount,
                Math.floor(parseFloat(formData.interestRate) * 100), // Convertir en basis points
                durationInt // Nombre entier >= 1
            );

            if (result.success) {
                showNotification(
                    `🎉 Prêt créé avec succès! ID: ${result.loanId?.toString()}`,
                    'success'
                );

                // Reset le formulaire
                setFormData({
                    nftAddress: addresses?.MockNFT || '',
                    tokenId: '',
                    amount: '',
                    interestRate: '5',
                    duration: testMode ? '2' : '30',
                });
                setActiveStep(0);
                setIsApproved(false);
                setNftOwnershipVerified(false);
            } else {
                showNotification(`❌ Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur création prêt:', error);
            showNotification(`❌ Erreur: ${error.message}`, 'error');
        }
    };

    const calculateInterest = () => {
        const principal = parseFloat(formData.amount || 0);
        const rate = parseFloat(formData.interestRate || 0) / 100;
        const duration = parseFloat(formData.duration || 0);

        if (testMode) {
            // Mode test : durée en minutes
            return (principal * rate * duration) / (365 * 24 * 60);
        } else {
            // Mode normal : durée en jours
            return (principal * rate * duration) / 365;
        }
    };

    const calculateTotal = () => {
        return parseFloat(formData.amount || 0) + calculateInterest();
    };

    const formatDuration = () => {
        const duration = parseFloat(formData.duration || 0);
        if (testMode) {
            if (duration < 1) {
                return `${Math.round(duration * 60)} secondes`;
            }
            return `${duration} minute${duration > 1 ? 's' : ''}`;
        }
        return `${duration} jour${duration > 1 ? 's' : ''}`;
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Adresse du contrat NFT"
                                value={formData.nftAddress}
                                onChange={handleChange('nftAddress')}
                                helperText="Adresse du contrat ERC-721 (MockNFT)"
                                disabled
                                InputProps={{
                                    startAdornment: (
                                        <AccountBalanceWallet sx={{ mr: 1, color: 'text.secondary' }} />
                                    ),
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Token ID du NFT"
                                type="number"
                                value={formData.tokenId}
                                onChange={handleChange('tokenId')}
                                helperText="ID du NFT que vous souhaitez utiliser comme garantie (1-5)"
                                required
                                inputProps={{ min: 1 }}
                            />
                        </Grid>

                        {formData.tokenId && !nftOwnershipVerified && (
                            <Grid item xs={12}>
                                <Button
                                    variant="outlined"
                                    fullWidth
                                    onClick={checkNFTOwnership}
                                    disabled={checking || !formData.tokenId}
                                    startIcon={checking ? <CircularProgress size={20} /> : <CheckCircle />}
                                >
                                    {checking ? 'Vérification...' : 'Vérifier la propriété du NFT'}
                                </Button>
                            </Grid>
                        )}

                        {nftOwnershipVerified && (
                            <Grid item xs={12}>
                                <Alert
                                    severity={isApproved ? "success" : "info"}
                                    icon={<CheckCircle />}
                                >
                                    ✅ Vous êtes propriétaire du NFT #{formData.tokenId}
                                    {isApproved && " • NFT déjà approuvé"}
                                </Alert>
                            </Grid>
                        )}
                    </Grid>
                );

            case 1:
                return (
                    <Grid container spacing={3}>
                        {/* Indicateur de mode */}
                        {contractTestMode && (
                            <Grid item xs={12}>
                                <Alert
                                    severity="warning"
                                    icon={<Science />}
                                    sx={{ mb: 1 }}
                                >
                                    <Typography variant="body2" fontWeight="bold">
                                        🧪 MODE TEST ACTIVÉ
                                    </Typography>
                                    <Typography variant="caption">
                                        La durée est en MINUTES pour faciliter les tests de liquidation
                                    </Typography>
                                </Alert>
                            </Grid>
                        )}

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Montant du prêt (ETH)"
                                type="number"
                                value={formData.amount}
                                onChange={handleChange('amount')}
                                helperText="Montant que vous souhaitez emprunter"
                                required
                                inputProps={{ step: '0.01', min: '0.01' }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Taux d'intérêt annuel (%)"
                                type="number"
                                value={formData.interestRate}
                                onChange={handleChange('interestRate')}
                                helperText="Taux d'intérêt proposé aux prêteurs"
                                required
                                inputProps={{ step: '0.1', min: '0', max: '100' }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label={testMode ? "Durée (minutes)" : "Durée (jours)"}
                                type="number"
                                value={formData.duration}
                                onChange={handleChange('duration')}
                                helperText={testMode
                                    ? "Durée du prêt en minutes (minimum 1 minute)"
                                    : "Durée du prêt en jours (minimum 1 jour)"
                                }
                                required
                                inputProps={{
                                    step: '1',
                                    min: '1',
                                    max: testMode ? '60' : '365'
                                }}
                                InputProps={{
                                    endAdornment: (
                                        <Chip
                                            label={testMode ? "min" : "jours"}
                                            size="small"
                                            color={testMode ? "warning" : "primary"}
                                        />
                                    )
                                }}
                            />
                        </Grid>

                        {/* Suggestions rapides en mode test */}
                        {testMode && (
                            <Grid item xs={12}>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                    ⚡ Durées de test rapides :
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {[
                                        { label: '1 min', value: '1' },
                                        { label: '2 min', value: '2' },
                                        { label: '5 min', value: '5' },
                                        { label: '10 min', value: '10' }
                                    ].map((preset) => (
                                        <Chip
                                            key={preset.value}
                                            label={preset.label}
                                            onClick={() => setFormData(prev => ({ ...prev, duration: preset.value }))}
                                            size="small"
                                            variant={formData.duration === preset.value ? "filled" : "outlined"}
                                            color="warning"
                                            clickable
                                        />
                                    ))}
                                </Box>
                            </Grid>
                        )}

                        {formData.amount && formData.interestRate && formData.duration && (
                            <Grid item xs={12}>
                                <Divider sx={{ my: 2 }} />
                                <Card variant="outlined" sx={{ bgcolor: 'primary.50' }}>
                                    <CardContent>
                                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                                            📊 Récapitulatif financier
                                        </Typography>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Montant emprunté
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {parseFloat(formData.amount).toFixed(4)} ETH
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Intérêts totaux
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium" color="warning.main">
                                                {calculateInterest().toFixed(6)} ETH
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="body2" color="text.secondary">
                                                Durée
                                            </Typography>
                                            <Typography variant="body2" fontWeight="medium">
                                                {formatDuration()}
                                            </Typography>
                                        </Box>

                                        <Divider sx={{ my: 1 }} />

                                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Typography variant="body1" fontWeight="bold">
                                                Total à rembourser
                                            </Typography>
                                            <Typography variant="body1" fontWeight="bold" color="primary">
                                                {calculateTotal().toFixed(4)} ETH
                                            </Typography>
                                        </Box>

                                        {testMode && (
                                            <Alert severity="info" sx={{ mt: 2 }} icon="⏰">
                                                <Typography variant="caption">
                                                    Le prêt expirera dans {formatDuration()}
                                                    {formData.duration && (
                                                        <> (≈ {Math.round(parseFloat(formData.duration) * 60)} secondes)</>
                                                    )}
                                                </Typography>
                                            </Alert>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>
                );

            case 2:
                return (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            ⚠️ Vérifiez attentivement toutes les informations avant de confirmer
                        </Alert>

                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                                🎨 Informations du NFT
                                            </Typography>
                                            {nftOwnershipVerified && (
                                                <Chip
                                                    icon={<CheckCircle />}
                                                    label="Vérifié"
                                                    color="success"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Contrat:</strong> {formData.nftAddress.slice(0, 10)}...{formData.nftAddress.slice(-8)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Token ID:</strong> #{formData.tokenId}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                                💰 Conditions du prêt
                                            </Typography>
                                            {testMode && (
                                                <Chip
                                                    icon={<Science />}
                                                    label="Mode Test"
                                                    color="warning"
                                                    size="small"
                                                />
                                            )}
                                        </Box>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Montant emprunté
                                                </Typography>
                                                <Typography variant="h6">
                                                    {parseFloat(formData.amount).toFixed(4)} ETH
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Taux d'intérêt
                                                </Typography>
                                                <Typography variant="h6">
                                                    {formData.interestRate}% /an
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Durée
                                                </Typography>
                                                <Typography variant="h6">
                                                    {formatDuration()}
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Typography variant="caption" color="text.secondary">
                                                    Total à rembourser
                                                </Typography>
                                                <Typography variant="h6" color="primary">
                                                    {calculateTotal().toFixed(4)} ETH
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12}>
                                {!isApproved ? (
                                    <Alert
                                        severity="warning"
                                        icon={<Warning />}
                                        action={
                                            <Button
                                                variant="contained"
                                                size="small"
                                                onClick={handleApproveNFT}
                                                disabled={contractLoading || !nftOwnershipVerified}
                                            >
                                                {contractLoading ? <CircularProgress size={20} /> : 'Approuver'}
                                            </Button>
                                        }
                                    >
                                        Vous devez approuver le NFT pour que le contrat puisse le transférer en garantie
                                    </Alert>
                                ) : (
                                    <Alert severity="success" icon={<CheckCircle />}>
                                        ✅ NFT approuvé - Prêt à créer le prêt!
                                    </Alert>
                                )}
                            </Grid>
                        </Grid>
                    </Box>
                );

            default:
                return 'Étape inconnue';
        }
    };

    if (!account) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Alert severity="info">
                    🔌 Veuillez connecter votre wallet MetaMask pour créer un prêt
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                💼 Créer un nouveau prêt
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Utilisez votre NFT comme garantie pour emprunter des ETH auprès de la communauté
                {testMode && " • Mode test activé pour des tests rapides"}
            </Typography>

            <Card sx={{ maxWidth: 900, mx: 'auto' }}>
                <CardContent sx={{ p: 4 }}>
                    <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                        {steps.map((label) => (
                            <Step key={label}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Box sx={{ mb: 4, minHeight: 300 }}>
                        {getStepContent(activeStep)}
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
                        <Button
                            disabled={activeStep === 0}
                            onClick={handleBack}
                            variant="outlined"
                            size="large"
                        >
                            ← Retour
                        </Button>

                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleNext}
                            disabled={
                                contractLoading ||
                                checking ||
                                (activeStep === 0 && !nftOwnershipVerified) ||
                                (activeStep === 2 && !isApproved)
                            }
                            startIcon={
                                contractLoading || checking ? (
                                    <CircularProgress size={20} />
                                ) : activeStep === steps.length - 1 ? (
                                    <Send />
                                ) : null
                            }
                        >
                            {activeStep === steps.length - 1 ? '🚀 Créer le prêt' : 'Suivant →'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

export default CreateLoan;