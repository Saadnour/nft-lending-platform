import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Alert,
    Chip,
    Grid,
} from '@mui/material';
import { CheckCircle, Error, Warning } from '@mui/icons-material';
import { useContract } from '../hooks/useContract';

function DebugPanel({ account, provider, signer }) {
    const contract = useContract(provider, signer);
    const [status, setStatus] = useState({
        provider: false,
        signer: false,
        nftContract: false,
        lendingContract: false,
        addresses: false,
        nftCode: false,
        lendingCode: false,
    });

    useEffect(() => {
        checkStatus();
    }, [provider, signer, contract]);

    const checkStatus = async () => {
        const newStatus = {
            provider: !!provider,
            signer: !!signer,
            nftContract: !!contract.nftContract,
            lendingContract: !!contract.lendingContract,
            addresses: !!contract.addresses,
            nftCode: false,
            lendingCode: false,
        };

        // Vérifier le code déployé
        if (provider && contract.addresses) {
            try {
                const nftCode = await provider.getCode(contract.addresses.MockNFT);
                const lendingCode = await provider.getCode(contract.addresses.NFTLending);
                newStatus.nftCode = nftCode !== '0x';
                newStatus.lendingCode = lendingCode !== '0x';
            } catch (error) {
                console.error('Erreur vérification code:', error);
            }
        }

        setStatus(newStatus);
    };

    const StatusChip = ({ label, active }) => (
        <Chip
            icon={active ? <CheckCircle /> : <Error />}
            label={label}
            color={active ? 'success' : 'error'}
            size="small"
        />
    );

    const testMint = async () => {
        if (!account) {
            alert('Connectez votre wallet');
            return;
        }

        console.log('🧪 Test de mint...');
        console.log('Account:', account);
        console.log('NFT Contract:', contract.nftContract);
        console.log('Addresses:', contract.addresses);

        const result = await contract.mintNFT(account, 999);
        console.log('Résultat:', result);

        if (result.success) {
            alert('✅ Mint réussi! NFT #999');
        } else {
            alert('❌ Erreur: ' + result.error);
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>
                🔍 Diagnostic du système
            </Typography>

            <Card sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        État des connexions
                    </Typography>
                    <Grid container spacing={1}>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="Provider" active={status.provider} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="Signer" active={status.signer} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="NFT Contract" active={status.nftContract} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="Lending Contract" active={status.lendingContract} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="Addresses" active={status.addresses} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="NFT Deployed" active={status.nftCode} />
                        </Grid>
                        <Grid item xs={6} md={3}>
                            <StatusChip label="Lending Deployed" active={status.lendingCode} />
                        </Grid>
                    </Grid>
                </CardContent>
            </Card>

            {contract.addresses && (
                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            📍 Adresses des contrats
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>MockNFT:</strong> {contract.addresses.MockNFT}
                        </Typography>
                        <Typography variant="body2">
                            <strong>NFTLending:</strong> {contract.addresses.NFTLending}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {account && (
                <Card sx={{ mb: 2 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            👤 Compte connecté
                        </Typography>
                        <Typography variant="body2">
                            {account}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        🧪 Tests rapides
                    </Typography>
                    <Button
                        variant="contained"
                        onClick={testMint}
                        disabled={!status.nftContract || !account}
                        fullWidth
                    >
                        Tester le mint (NFT #999)
                    </Button>
                </CardContent>
            </Card>

            {(!status.nftCode || !status.lendingCode) && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    <strong>⚠️ Contrats non déployés!</strong>
                    <br />
                    Assurez-vous d'avoir déployé les contrats sur votre réseau local:
                    <br />
                    <code>npx hardhat run scripts/deploy.js --network localhost</code>
                </Alert>
            )}
        </Box>
    );
}

export default DebugPanel;