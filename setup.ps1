# Setup script pour Windows PowerShell
Write-Host "Configuration du projet NFT-Lending Platform" -ForegroundColor Cyan

# Verifier Docker
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "Docker installe" -ForegroundColor Green
} else {
    Write-Host "Docker manquant" -ForegroundColor Red
    exit
}

# Verifier Node.js
if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Host "Node.js installe" -ForegroundColor Green
} else {
    Write-Host "Node.js manquant" -ForegroundColor Red
    exit
}

# Verifier Python
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Python installe" -ForegroundColor Green
} else {
    Write-Host "Python manquant" -ForegroundColor Red
    exit
}

# Creer structure
Write-Host "Creation des dossiers..." -ForegroundColor Blue
New-Item -ItemType Directory -Force -Path "blockchain\contracts\interfaces" | Out-Null
New-Item -ItemType Directory -Force -Path "blockchain\scripts" | Out-Null
New-Item -ItemType Directory -Force -Path "blockchain\tests" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend\src\components" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend\src\utils" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend\src\contracts\abis" | Out-Null
New-Item -ItemType Directory -Force -Path "frontend\public" | Out-Null
Write-Host "Structure creee" -ForegroundColor Green

# Installer Python deps
Write-Host "Installation Python..." -ForegroundColor Blue
Set-Location blockchain
python -m pip install eth-brownie web3 python-dotenv
brownie init --force
Set-Location ..
Write-Host "Python OK" -ForegroundColor Green

# Installer Frontend
Write-Host "Installation Frontend..." -ForegroundColor Blue
Set-Location frontend
npm init -y
npm install react react-dom ethers vite @vitejs/plugin-react tailwindcss postcss autoprefixer
Set-Location ..
Write-Host "Frontend OK" -ForegroundColor Green

Write-Host "Installation terminee !" -ForegroundColor Green
Write-Host "Lancez: docker-compose up -d" -ForegroundColor Yellow