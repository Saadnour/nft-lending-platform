// javascript
// File: `frontend/src/components/LoanCard.jsx`
import React from 'react';
import {
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Typography,
    Button,
    Chip,
    Box,
    LinearProgress,
    Avatar,
    Grid,
} from '@mui/material';
import {
    AccountBalance,
    Timer,
    CheckCircle,
    Error as ErrorIcon,
} from '@mui/icons-material';

function parseAmountToEth(amount) {
    // Supporte : string en ETH ("1.23"), string wei ("1230000000000000000"), number, BigInt, BigNumber-like
    if (amount == null) return 0;
    try {
        if (typeof amount === 'string') {
            if (amount.includes('.')) return parseFloat(amount);
            // integer string - peut-être wei
            const maybeInt = BigInt(amount);
            // si très grand, considérer comme wei
            if (maybeInt > 0n) {
                const val = Number(maybeInt) / 1e18;
                return isFinite(val) ? val : 0;
            }
        }
        if (typeof amount === 'bigint') return Number(amount) / 1e18;
        if (typeof amount === 'number') return amount;
        // BigNumber-like (ethers v5/v6)
        if (amount?.toString) {
            const s = amount.toString();
            if (s.includes('.')) return parseFloat(s);
            const bn = BigInt(s);
            return Number(bn) / 1e18;
        }
    } catch {
        // fallback
        try { return parseFloat(String(amount)) || 0; } catch { return 0; }
    }
    return 0;
}

export default function LoanCard({ loan = {}, onRepay, onLiquidate }) {
    // Robust parsing
    const amountEth = parseAmountToEth(loan.amount);
    const amountRepaidEth = parseAmountToEth(loan.amountRepaid);

    const repaymentPercent = amountEth > 0 ? Math.min((amountRepaidEth / amountEth) * 100, 100) : 0;

    // Dates: prefer dueDate, else startTime + duration (duration may be secs or days)
    const nowSec = Math.floor(Date.now() / 1000);
    const start = Number(loan.startTime || 0);
    let durationSec = Number(loan.duration || 0);
    if (durationSec > 0 && durationSec < 86400) {
        // If duration looks small assume it's days (safety), convert to secs
        // but only if start+duration seems unreasonable; keep simple convert if small value < 10000 -> treat as days
        if (durationSec < 10000) durationSec = durationSec * 86400;
    }
    const endTime = loan.dueDate ? Number(loan.dueDate) : (start ? start + durationSec : start + durationSec);
    const isExpired = endTime && nowSec > endTime;

    const getStatusChip = () => {
        if (loan.isRepaid) return <Chip label="Remboursé" color="success" icon={<CheckCircle />} />;
        if (loan.isDefaulted) return <Chip label="Défaut" color="error" icon={<ErrorIcon />} />;
        if (isExpired) return <Chip label="En retard" color="warning" icon={<Timer />} />;
        return <Chip label="Actif" color="primary" icon={<AccountBalance />} />;
    };

    const timeRemaining = () => {
        if (!endTime) return '—';
        const diff = endTime - nowSec;
        if (diff <= 0) return 'Expiré';
        const days = Math.floor(diff / 86400);
        const hours = Math.floor((diff % 86400) / 3600);
        const mins = Math.floor((diff % 3600) / 60);
        if (days > 0) return `${days}j ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    };

    const nftDisplay = loan.nftName || `NFT #${loan.tokenId ?? loan.nftId ?? '?'}`;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <CardMedia
                component="img"
                height="180"
                image={loan.nftImage || '/placeholder-nft.png'}
                alt={nftDisplay}
                sx={{ objectFit: 'cover' }}
            />

            <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="h6" noWrap>{nftDisplay}</Typography>
                    {getStatusChip()}
                </Box>

                <Grid container spacing={1} sx={{ mb: 1 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Montant</Typography>
                        <Typography variant="subtitle1" color="primary">{amountEth.toFixed(4)} ETH</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Remboursé</Typography>
                        <Typography variant="subtitle1" color="text.secondary">{amountRepaidEth.toFixed(4)} ETH</Typography>
                    </Grid>

                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Intérêt</Typography>
                        <Typography variant="body2" color="secondary">{loan.interestRate ?? '—'}%</Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Échéance</Typography>
                        <Typography variant="body2">{timeRemaining()}</Typography>
                    </Grid>
                </Grid>

                <Box sx={{ mb: 1 }}>
                    <LinearProgress variant="determinate" value={repaymentPercent} sx={{ height: 8, borderRadius: 6 }} />
                    <Typography variant="caption" color="text.secondary">{repaymentPercent.toFixed(1)}% remboursé</Typography>
                </Box>

                {loan.lender && loan.lender !== '0x0000000000000000000000000000000000000000' && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
                            L
                        </Avatar>
                        <Typography variant="caption" color="text.secondary">
                            Prêteur : {loan.lender.slice(0,6)}...{loan.lender.slice(-4)}
                        </Typography>
                    </Box>
                )}
            </CardContent>

            <CardActions sx={{ p: 2, pt: 0, display: 'flex', gap: 1 }}>
                {!loan.isRepaid && !loan.isDefaulted && (
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => onRepay?.(loan.id)}
                        disabled={!onRepay}
                    >
                        Rembourser
                    </Button>
                )}

                {isExpired && !loan.isRepaid && (
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        onClick={() => onLiquidate?.(loan.id)}
                        disabled={!onLiquidate}
                    >
                        Liquider
                    </Button>
                )}

                {loan.isRepaid && (
                    <Button fullWidth variant="outlined" color="success" disabled>Remboursé ✓</Button>
                )}
            </CardActions>
        </Card>
    );
}
