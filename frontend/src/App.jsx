// javascript
import React, { useState, useEffect } from 'react';
import {
    ThemeProvider,
    createTheme,
    CssBaseline,
    AppBar,
    Toolbar,
    Typography,
    Container,
    Box,
    Button,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemButton,
    Chip,
    Snackbar,
    Alert,
    Grid,
    Card,
    CardContent,
} from '@mui/material';
import {
    AccountBalanceWallet,
    Dashboard,
    AccountBalance,
    Assessment,
    Menu as MenuIcon,
    Add, TrendingUp,
} from '@mui/icons-material';
import { BrowserProvider, formatEther } from 'ethers';
import { useContract } from './hooks/useContract';
import CreateLoan from './pages/CreateLoan';
import LoanCard from './components/LoanCard';
import Marketplace from './pages/Marketplace';
import BlockchainExplorer from './components/BlockchainExplorer';
import MyLoans from "./pages/MyLoans.jsx";
import FundLoans from "./pages/FundLoans.jsx";

const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#00d4ff' },
        secondary: { main: '#ff00ff' },
        background: {
            default: '#0a0e27',
            paper: '#141b38',
        },
    },
    typography: {
        fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    },
});

function App() {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [network, setNetwork] = useState(null);
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info'
    });

    const contract = useContract(provider, signer);

    const getNetworkName = (chainId) => {
        const networks = {
            '1': 'Ethereum Mainnet',
            '5': 'Goerli',
            '11155111': 'Sepolia',
            '137': 'Polygon',
            '80001': 'Mumbai',
            '31337': 'Hardhat Local',
            '1337': 'Ganache Local',
        };
        return networks[chainId] || `Chain ${chainId}`;
    };

    const showNotification = (message, severity = 'info') => {
        setNotification({ open: true, message, severity });
    };

    const connectWallet = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const p = new BrowserProvider(window.ethereum);
                const accounts = await p.send("eth_requestAccounts", []);
                const s = await p.getSigner();
                const net = await p.getNetwork();

                const chainIdString = net.chainId.toString();

                setAccount(accounts[0]);
                setProvider(p);
                setSigner(s);
                setNetwork({
                    ...net,
                    chainId: chainIdString
                });

                showNotification(`Connecté à ${getNetworkName(chainIdString)}`, 'success');
            } catch (error) {
                console.error('Erreur connexion wallet:', error);
                showNotification('Impossible de se connecter au wallet', 'error');
            }
        } else {
            showNotification('MetaMask non détecté. Installez-le !', 'warning');
        }
    };

    useEffect(() => {
        if (!window.ethereum) return;

        const handleAccountsChanged = (accounts) => {
            if (accounts.length > 0) {
                setAccount(accounts[0]);
                showNotification('Compte changé', 'info');
            } else {
                setAccount(null);
                setProvider(null);
                setSigner(null);
                setNetwork(null);
                showNotification('Wallet déconnecté', 'warning');
            }
        };

        const handleChainChanged = () => window.location.reload();

        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return () => {
            try {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            } catch (e) {
                // ignore
            }
        };
    }, []);

    const menuItems = [
        { text: 'Dashboard', icon: <Dashboard />, page: 'dashboard' },
        { text: 'Créer un Prêt', icon: <Add />, page: 'create' },
        { text: 'Mes Prêts', icon: <AccountBalance />, page: 'loans' },
        { text: 'Financer des Prêts', icon: <TrendingUp />, page: 'fund' }, // ← CETTE PAGE
        { text: 'Explorer', icon: <Assessment />, page: 'explorer' },
    ];

    return (
        <ThemeProvider theme={darkTheme}>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                <AppBar position="fixed">
                    <Toolbar>
                        <Button color="inherit" onClick={() => setDrawerOpen(true)}>
                            <MenuIcon />
                        </Button>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            NFT Lending Platform
                        </Typography>
                        {network && (
                            <Chip
                                label={getNetworkName(network.chainId)}
                                color={['31337', '1337'].includes(String(network.chainId)) ? 'warning' : 'success'}
                                sx={{ mr: 2 }}
                            />
                        )}
                        {account ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AccountBalanceWallet />
                                <Typography>
                                    {account.slice(0, 6)}...{account.slice(-4)}
                                </Typography>
                            </Box>
                        ) : (
                            <Button variant="contained" color="secondary" onClick={connectWallet}>
                                Connecter Wallet
                            </Button>
                        )}
                    </Toolbar>
                </AppBar>

                <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
                    <Box sx={{ width: 250, mt: '64px' }}>
                        <List>
                            {menuItems.map((item) => (
                                <ListItem key={item.page} disablePadding>
                                    <ListItemButton
                                        selected={currentPage === item.page}
                                        onClick={() => {
                                            setCurrentPage(item.page);
                                            setDrawerOpen(false);
                                        }}
                                    >
                                        <ListItemIcon sx={{ color: 'primary.main' }}>{item.icon}</ListItemIcon>
                                        <ListItemText primary={item.text} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                </Drawer>

                <Box component="main" sx={{ flexGrow: 1, p: 3, mt: '64px' }}>
                    <Container maxWidth="xl">
                        {currentPage === 'dashboard' && (
                            <DashboardPage
                                account={account}
                                provider={provider}
                                signer={signer}
                                showNotification={showNotification}
                                contract={contract}
                            />
                        )}
                        {currentPage === 'create' && (
                            <CreateLoan
                                account={account}
                                provider={provider}
                                signer={signer}
                                showNotification={showNotification}
                                contract={contract}
                            />
                        )}
                        {currentPage === 'loans' && (
                            <MyLoans
                                account={account}
                                provider={provider}
                                signer={signer}
                                showNotification={showNotification}
                                contract={contract}
                            />
                        )}
                        {currentPage === 'explorer' && (
                            <Marketplace
                                account={account}
                                provider={provider}
                                signer={signer}
                                showNotification={showNotification}
                                contract={contract}
                            />
                        )}
                        {currentPage === 'fund' && (
                            <FundLoans
                                account={account}
                                provider={provider}
                                signer={signer}
                                showNotification={showNotification}
                                contract={contract}
                            />
                        )}
                    </Container>
                </Box>
            </Box>

            <Snackbar
                open={notification.open}
                autoHideDuration={6000}
                onClose={() => setNotification({ ...notification, open: false })}
            >
                <Alert
                    onClose={() => setNotification({ ...notification, open: false })}
                    severity={notification.severity}
                >
                    {notification.message}
                </Alert>
            </Snackbar>
        </ThemeProvider>
    );
}

// Dashboard Page
function DashboardPage({ account, provider, signer, showNotification, contract }) {
    const [stats, setStats] = useState({
        borrowerLoans: 0,
        lenderLoans: 0,
        activeLoans: 0,
        totalBorrowed: '0'
    });

    const asNumber = (val) => {
        if (val == null) return 0;
        try {
            // val peut être BigNumber ou string
            return Number(formatEther(val));
        } catch {
            return Number(val || 0);
        }
    };

    useEffect(() => {
        if (account && contract?.lendingContract) {
            const load = async () => {
                try {
                    const borrower = await contract.getBorrowerLoans(account);
                    const lender = await contract.getLenderLoans(account);
                    const active = borrower.filter(l => l.isActive).length;
                    const total = borrower
                        .filter(l => l.isActive)
                        .reduce((sum, l) => sum + asNumber(l.amount), 0)
                        .toFixed(4);

                    setStats({
                        borrowerLoans: borrower.length,
                        lenderLoans: lender.length,
                        activeLoans: active,
                        totalBorrowed: total
                    });
                } catch (e) {
                    showNotification('Erreur chargement dashboard', 'error');
                }
            };
            load();
        }
    }, [account, contract]);

    if (!account) return <Alert severity="info">Connectez votre wallet pour voir le dashboard</Alert>;

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Dashboard</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Prêts Empruntés</Typography>
                        <Typography variant="h4">{stats.borrowerLoans}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Prêts Financés</Typography>
                        <Typography variant="h4" color="primary.main">{stats.lenderLoans}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Prêts Actifs</Typography>
                        <Typography variant="h4" color="success.main">{stats.activeLoans}</Typography>
                    </CardContent></Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card><CardContent>
                        <Typography color="text.secondary">Total Emprunté</Typography>
                        <Typography variant="h4" color="secondary.main">{stats.totalBorrowed} ETH</Typography>
                    </CardContent></Card>
                </Grid>
            </Grid>
        </Box>
    );
}


export default App;