// javascript
import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Paper,
    TextField,
    Button,
    Alert,
    CircularProgress,
} from '@mui/material';
import { Search, TrendingUp } from '@mui/icons-material';

function BlockchainExplorer({ contract, provider }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchLoanId, setSearchLoanId] = useState('');

    useEffect(() => {
        if (contract?.lendingContract && provider) {
            loadRecentEvents();
        } else {
            setEvents([]);
        }
        // dépendances : recharger quand le contrat ou le provider change
    }, [contract?.lendingContract, provider]);

    const safeToString = (v) => {
        try {
            return v?.toString?.() ?? String(v ?? '');
        } catch {
            return String(v ?? '');
        }
    };

    const loadRecentEvents = async () => {
        if (!contract?.lendingContract || !provider) {
            console.warn('Contract or provider manquant');
            setEvents([]);
            return;
        }

        setLoading(true);
        try {
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);

            const lc = contract.lendingContract;

            // si filters non disponibles, retourner vide
            if (!lc.filters) {
                console.warn('Filters non disponibles sur lendingContract');
                setEvents([]);
                return;
            }

            const loanCreatedFilter = lc.filters.LoanCreated ? lc.filters.LoanCreated() : null;
            const loanRepaidFilter = lc.filters.LoanRepaid ? lc.filters.LoanRepaid() : null;
            const loanLiquidatedFilter = lc.filters.LoanLiquidated ? lc.filters.LoanLiquidated() : null;

            const queries = [];

            if (loanCreatedFilter) queries.push(lc.queryFilter(loanCreatedFilter, fromBlock, currentBlock));
            if (loanRepaidFilter) queries.push(lc.queryFilter(loanRepaidFilter, fromBlock, currentBlock));
            if (loanLiquidatedFilter) queries.push(lc.queryFilter(loanLiquidatedFilter, fromBlock, currentBlock));

            const [created = [], repaid = [], liquidated = []] = await Promise.all(queries);

            const mapCreated = (e) => ({
                type: 'LoanCreated',
                loanId: safeToString(e.args?.loanId ?? e.args?.loanId ?? ''),
                borrower: e.args?.borrower ?? '',
                lender: e.args?.lender ?? '',
                amount: safeToString(e.args?.amount ?? ''),
                blockNumber: e.blockNumber ?? 0,
                transactionHash: e.transactionHash ?? '',
            });

            const mapRepaid = (e) => ({
                type: 'LoanRepaid',
                loanId: safeToString(e.args?.loanId ?? ''),
                borrower: e.args?.borrower ?? '',
                totalRepaid: safeToString(e.args?.totalRepaid ?? e.args?.amount ?? ''),
                blockNumber: e.blockNumber ?? 0,
                transactionHash: e.transactionHash ?? '',
            });

            const mapLiquidated = (e) => ({
                type: 'LoanLiquidated',
                loanId: safeToString(e.args?.loanId ?? ''),
                liquidator: e.args?.liquidator ?? '',
                blockNumber: e.blockNumber ?? 0,
                transactionHash: e.transactionHash ?? '',
            });

            const allEvents = [
                ...created.map(mapCreated),
                ...repaid.map(mapRepaid),
                ...liquidated.map(mapLiquidated),
            ].sort((a, b) => b.blockNumber - a.blockNumber);

            setEvents(allEvents);
        } catch (error) {
            console.error('Erreur chargement événements:', error);
            setEvents([]);
        } finally {
            setLoading(false);
        }
    };

    const searchLoan = async () => {
        if (!searchLoanId || !contract?.lendingContract) return;
        try {
            const loan = await contract.lendingContract.getLoan(searchLoanId);
            console.log('Loan details:', loan);
            // Si on veut ajouter l'événement de recherche dans la liste :
            setEvents((prev) => [{ type: 'LoanDetail', loanId: safeToString(searchLoanId), blockNumber: 0, transactionHash: '', borrower: loan.borrower ?? '', amount: safeToString(loan.amount ?? loan.principal ?? '') }, ...prev]);
        } catch (error) {
            console.error('Prêt non trouvé:', error);
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'LoanCreated': return 'primary';
            case 'LoanRepaid': return 'success';
            case 'LoanLiquidated': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                🔍 Explorateur Blockchain
            </Typography>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Rechercher un prêt par ID"
                            value={searchLoanId}
                            onChange={(e) => setSearchLoanId(e.target.value)}
                            type="text"
                        />
                        <Button
                            variant="contained"
                            startIcon={<Search />}
                            onClick={searchLoan}
                        >
                            Rechercher
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            <Card>
                <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                        <Typography variant="h6">📊 Événements Récents</Typography>
                        <Button startIcon={<TrendingUp />} onClick={loadRecentEvents} disabled={loading}>
                            Actualiser
                        </Button>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CircularProgress size={20} />
                            <Typography>Chargement des événements...</Typography>
                        </Box>
                    ) : events.length === 0 ? (
                        <Alert severity="info">Aucun événement trouvé pour les derniers blocs. Vérifiez que le contrat et le provider sont connectés.</Alert>
                    ) : (
                        <TableContainer component={Paper}>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Prêt ID</TableCell>
                                        <TableCell>Adresse</TableCell>
                                        <TableCell>Bloc</TableCell>
                                        <TableCell>Transaction</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {events.map((event, index) => (
                                        <TableRow key={index}>
                                            <TableCell>
                                                <Chip label={event.type} color={getEventColor(event.type)} size="small" />
                                            </TableCell>
                                            <TableCell>#{event.loanId}</TableCell>
                                            <TableCell>
                                                {(event.borrower || event.liquidator || '').toString().slice(0, 10)}...
                                            </TableCell>
                                            <TableCell>{event.blockNumber}</TableCell>
                                            <TableCell>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                                                    {(event.transactionHash || '').toString().slice(0, 10)}...
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}

export default BlockchainExplorer;