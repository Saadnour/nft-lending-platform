import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Grid,
} from '@mui/material';
import { Add } from '@mui/icons-material';

function MintNFT({ account, provider, signer, showNotification, contract }) {
    const [tokenId, setTokenId] = useState('');
    const [minting, setMinting] = useState(false);

    const handleMint = async () => {
        if (!tokenId || !account) {
            showNotification('Veuillez entrer un Token ID', 'warning');
            return;
        }

        // Convertir en string si nécessaire
        const tokenIdStr = tokenId.toString();

        setMinting(true);
        try {
            console.log('🎨 Mint NFT #' + tokenIdStr + ' pour', account);
            const result = await contract.mintNFT(account, tokenIdStr);

            if (result.success) {
                showNotification(`✅ NFT #${tokenIdStr} créé avec succès!`, 'success');
                setTokenId('');
            } else {
                showNotification(`❌ Erreur: ${result.error}`, 'error');
            }
        } catch (error) {
            console.error('Erreur mint:', error);
            showNotification(`❌ Erreur: ${error.message}`, 'error');
        } finally {
            setMinting(false);
        }
    };

    if (!account) {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <Alert severity="info">
                    🔌 Veuillez connecter votre wallet MetaMask
                </Alert>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
                🎨 Créer un NFT
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Mintez un NFT pour l'utiliser comme garantie dans vos prêts
            </Typography>

            <Grid container spacing={3} justifyContent="center">
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Alert severity="info" sx={{ mb: 3 }}>
                                💡 Créez un NFT avec un ID unique (1-1000). Vous pourrez ensuite l'utiliser comme garantie pour emprunter des ETH.
                            </Alert>

                            <TextField
                                fullWidth
                                label="Token ID"
                                type="number"
                                value={tokenId}
                                onChange={(e) => setTokenId(e.target.value)}
                                placeholder="Ex: 1, 2, 3..."
                                helperText="Choisissez un ID unique entre 1 et 1000"
                                sx={{ mb: 3 }}
                                inputProps={{ min: 1, max: 1000 }}
                            />

                            <Button
                                variant="contained"
                                size="large"
                                fullWidth
                                onClick={handleMint}
                                disabled={minting || !tokenId}
                                startIcon={minting ? <CircularProgress size={20} /> : <Add />}
                            >
                                {minting ? 'Création en cours...' : 'Créer le NFT'}
                            </Button>

                            <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 2 }}>
                                <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                                    📋 Informations
                                </Typography>
                                <Typography variant="body2">
                                    • Le NFT sera créé à votre adresse
                                </Typography>
                                <Typography variant="body2">
                                    • Vous pourrez ensuite l'utiliser comme garantie
                                </Typography>
                                <Typography variant="body2">
                                    • Chaque ID ne peut être utilisé qu'une seule fois
                                </Typography>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default MintNFT;