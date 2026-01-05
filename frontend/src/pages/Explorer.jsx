import React,{ useState, useEffect } from 'react';
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
    IconButton,
    Tooltip,
    Alert,
    CircularProgress,
    Paper,
    Tab,
    Tabs,
    Link as MuiLink,
} from '@mui/material';
import {
    Refresh as RefreshIcon,
    OpenInNew,
    CheckCircle,
    Error as ErrorIcon,
    Schedule,
} from '@mui/icons-material';
import { useContract } from '../hooks/useContract';

function Explorer({ provider, showNotification }) {
    const { lendingContract, subscribeToEvents } = useContract(provider, null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tabValue, setTabValue] = useState(0);

    const loadPastEvents = async () => {
        if (!lendingContract) return;

        setLoading(true);
        try {
            const currentBlock = await provider.getBlockNumber();
            const fromBlock = Math.max(0, currentBlock - 1000);

            const loanCreatedFilter = lendingContract.filters.LoanCreated();
            const loanCreatedEvents = await lendingContract.queryFilter(
                loanCreatedFilter,
                fromBlock,
                currentBlock
            );

            const loanRepaidFilter = lendingContract.filters.LoanRepaid();
            const loanRepaidEvents = await lendingContract.queryFilter(
                loanRepaidFilter,
                fromBlock,
                currentBlock
            );

            const loanLiquidatedFilter = lendingContract.filters.LoanLiquidated();
            const loanLiquidatedEvents = await lendingContract.queryFilter(
                loanLiquidatedFilter,
                fromBlock,
                currentBlock
            );

            const allEvents = [
                ...loanCreatedEvents.map((e) => ({
                    type: 'LoanCreated',
                    loanId: e.args[0].toString(),
                    borrower: e.args[1],
                    lender: e.args[2],
                    amount: (Number(e.args[4]) / 1e18).toFixed(4),
                    blockNumber: e.blockNumber,
                    transactionHash: e.transactionHash,
                    timestamp: null,
                })),
                ...loanRepaidEvents.map((e) => ({
                    type: 'LoanRepaid',
                    loanId: e.args[0].toString(),
                    borrower: e.args[1],
                    totalRepaid: (Number(e.args[2]) / 1e18).toFixed(4),
                    blockNumber: e.blockNumber,
                    transactionHash: e.transactionHash,
                    timestamp: null,
                })),
                ...loanLiquidatedEvents.map((e) => ({
                    type: 'LoanLiquidated',
                    loanId: e.args[0].toString(),
                    liquidator: e.args[1],
                    blockNumber: e.blockNumber,
                    transactionHash: e.transactionHash,
                    timestamp: null,
                })),
            ];

            allEvents.sort((a, b) => b.blockNumber - a.blockNumber);

            for (const event of allEvents) {
                const block = await provider.getBlock(event.blockNumber);
                event.timestamp = block.timestamp;
            }

            setEvents(allEvents);
        } catch (error) {
            console.error('Erreur chargement événements:', error);
            showNotification('Erreur lors du chargement des événements', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!lendingContract) return;

        const unsubscribeFunctions = [];

        const unsubCreated = subscribeToEvents('LoanCreated', (...args) => {
            const event = args[args.length - 1];
            const newEvent = {
                type: 'LoanCreated',
                loanId: args[0].toString(),
                borrower: args[1],
                lender: args[2],
                amount: (Number(args[4]) / 1e18).toFixed(4),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: Date.now() / 1000,
            };
            setEvents((prev) => [newEvent, ...prev]);
            showNotification(`Nouveau prêt créé: #${newEvent.loanId}`, 'info');
        });
        if (unsubCreated) unsubscribeFunctions.push(unsubCreated);

        const unsubRepaid = subscribeToEvents('LoanRepaid', (...args) => {
            const event = args[args.length - 1];
            const newEvent = {
                type: 'LoanRepaid',
                loanId: args[0].toString(),
                borrower: args[1],
                totalRepaid: (Number(args[2]) / 1e18).toFixed(4),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: Date.now() / 1000,
            };
            setEvents((prev) => [newEvent, ...prev]);
            showNotification(`Prêt remboursé: #${newEvent.loanId}`, 'success');
        });
        if (unsubRepaid) unsubscribeFunctions.push(unsubRepaid);

        const unsubLiquidated = subscribeToEvents('LoanLiquidated', (...args) => {
            const event = args[args.length - 1];
            const newEvent = {
                type: 'LoanLiquidated',
                loanId: args[0].toString(),
                liquidator: args[1],
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
                timestamp: Date.now() / 1000,
            };
            setEvents((prev) => [newEvent, ...prev]);
            showNotification(`Prêt liquidé: #${newEvent.loanId}`, 'warning');
        });
        if (unsubLiquidated) unsubscribeFunctions.push(unsubLiquidated);

        loadPastEvents();

        return () => {
            unsubscribeFunctions.forEach((unsub) => unsub && unsub());
        };
    }, [lendingContract]);

    const formatAddress = (address) => {
        if (!address || address === '0x0000000000000000000000000000000000000000')
            return 'N/A';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const formatTimestamp = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('fr-FR');
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'LoanCreated':
                return <Schedule color="primary" />;
            case 'LoanRepaid':
                return <CheckCircle color="success" />;
            case 'LoanLiquidated':
                return <ErrorIcon color="error" />;
            default:
                return null;
        }
    };

    const getEventChip = (type) => {
        const colors = {
            LoanCreated: 'primary',
            LoanRepaid: 'success',
            LoanLiquidated: 'error',
        };
        const labels = {
            LoanCreated: 'Créé',
            LoanRepaid: 'Remboursé',
            LoanLiquidated: 'Liquidé',
        };
        return (
            <Chip
                label={labels[type] || type}
                color={colors[type] || 'default'}
                size="small"
                icon={getEventIcon(type)}
            />
        );
    };

    const getFilteredEvents = () => {
        if (tabValue === 0) return events;
        const types = ['LoanCreated', 'LoanRepaid', 'LoanLiquidated'];
        return events.filter((e) => e.type === types[tabValue - 1]);
    };

    if (!provider) {
        return (
            <Alert severity="info">
                Veuillez connecter votre wallet pour voir l'explorateur
            </Alert>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Explorateur Blockchain
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Événements du contrat NFT Lending en temps réel
                    </Typography>
                </Box>
                <IconButton
                    onClick={loadPastEvents}
                    disabled={loading}
                    color="primary"
                >
                    {loading ? <CircularProgress size={24} /> : <RefreshIcon />}
                </IconButton>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                <Card sx={{ flex: '1 1 200px' }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Total événements
                        </Typography>
                        <Typography variant="h4" fontWeight="bold">
                            {events.length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px' }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Prêts créés
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="primary">
                            {events.filter((e) => e.type === 'LoanCreated').length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px' }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Prêts remboursés
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="success.main">
                            {events.filter((e) => e.type === 'LoanRepaid').length}
                        </Typography>
                    </CardContent>
                </Card>
                <Card sx={{ flex: '1 1 200px' }}>
                    <CardContent>
                        <Typography variant="body2" color="text.secondary">
                            Prêts liquidés
                        </Typography>
                        <Typography variant="h4" fontWeight="bold" color="error.main">
                            {events.filter((e) => e.type === 'LoanLiquidated').length}
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, v) => setTabValue(v)}
                    variant="fullWidth"
                >
                    <Tab label="Tous" />
                    <Tab label="Créés" />
                    <Tab label="Remboursés" />
                    <Tab label="Liquidés" />
                </Tabs>
            </Paper>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Prêt ID</TableCell>
                            <TableCell>Détails</TableCell>
                            <TableCell>Bloc</TableCell>
                            <TableCell>Date</TableCell>
                            <TableCell align="right">Transaction</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {getFilteredEvents().length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography color="text.secondary">
                                        Aucun événement trouvé
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            getFilteredEvents().map((event, index) => (
                                <TableRow key={`${event.transactionHash}-${index}`}>
                                    <TableCell>{getEventChip(event.type)}</TableCell>
                                    <TableCell>
                                        <Chip label={`#${event.loanId}`} size="small" />
                                    </TableCell>
                                    <TableCell>
                                        {event.type === 'LoanCreated' && (
                                            <Box>
                                                <Typography variant="caption" display="block">
                                                    Emprunteur: {formatAddress(event.borrower)}
                                                </Typography>
                                                <Typography variant="caption" display="block">
                                                    Montant: {event.amount} ETH
                                                </Typography>
                                            </Box>
                                        )}
                                        {event.type === 'LoanRepaid' && (
                                            <Box>
                                                <Typography variant="caption" display="block">
                                                    Par: {formatAddress(event.borrower)}
                                                </Typography>
                                                <Typography variant="caption" display="block">
                                                    Total: {event.totalRepaid} ETH
                                                </Typography>
                                            </Box>
                                        )}
                                        {event.type === 'LoanLiquidated' && (
                                            <Typography variant="caption">
                                                Par: {formatAddress(event.liquidator)}
                                            </Typography>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={event.blockNumber}
                                            size="small"
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">
                                            {formatTimestamp(event.timestamp)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Tooltip title="Voir sur Etherscan">
                                            <IconButton
                                                size="small"
                                                component={MuiLink}
                                                href={`https://etherscan.io/tx/${event.transactionHash}`}
                                                target="_blank"
                                            >
                                                <OpenInNew fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

export default Explorer;