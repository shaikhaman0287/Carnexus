$baseDir = "C:\Users\shaik\OneDrive\Desktop\Car Nexus'"
$clientDir = Join-Path $baseDir 'client'
$serverDir = Join-Path $baseDir 'server'

New-Item -ItemType Directory -Force -Path $clientDir
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\pages')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\components')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\hooks')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\services')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\utils')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\assets\images')
New-Item -ItemType Directory -Force -Path (Join-Path $clientDir 'src\styles')

New-Item -ItemType Directory -Force -Path $serverDir
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'controllers')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'routes')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'models')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'middlewares')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'services')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'config')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'utils')
New-Item -ItemType Directory -Force -Path (Join-Path $serverDir 'tests')

# Move CSS
if (Test-Path "$baseDir\css\style.css") {
    Move-Item -Path "$baseDir\css\style.css" -Destination "$clientDir\src\styles\style.css"
}

# Move JS
if (Test-Path "$baseDir\js\app.js") {
    Move-Item -Path "$baseDir\js\app.js" -Destination "$clientDir\src\services\app.js"
}

# Move Images
if (Test-Path "$baseDir\images") {
    Get-ChildItem -Path "$baseDir\images" | ForEach-Object {
        Move-Item -Path $_.FullName -Destination "$clientDir\src\assets\images\$($_.Name)"
    }
}

# HTML files
$htmlFiles = Get-ChildItem -Path $baseDir -Filter *.html
foreach ($file in $htmlFiles) {
    $content = [System.IO.File]::ReadAllText($file.FullName)
    $content = $content -replace 'href="css/style\.css"','href="../styles/style.css"'
    $content = $content -replace 'src="js/app\.js"','src="../services/app.js"'
    $content = $content -replace 'src="images/','src="../assets/images/'
    $content = $content -replace "url\('images/","url('../assets/images/"
    $content = $content -replace 'onerror="this\.src=''images/','onerror="this.src=''../assets/images/'
    
    [System.IO.File]::WriteAllText("$clientDir\src\pages\$($file.Name)", $content)
    Remove-Item -Path $file.FullName
}

# Create Basic Backend Boilerplates
Set-Content -Path "$clientDir\package.json" -Value "{ `"name`": `"carnexus-client`", `"version`": `"1.0.0`", `"scripts`": { `"start`": `"echo 'Serve static via web server'`" } }"
Set-Content -Path "$clientDir\README.md" -Value "# Frontend System`nSeparation for modern UI rendering paths."

$serverPackageJson = @"
{
  "name": "carnexus-server",
  "version": "1.0.0",
  "description": "API Gateway",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5"
  }
}
"@
Set-Content -Path "$serverDir\package.json" -Value $serverPackageJson

$serverJs = @"
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API routing modular hooks
app.use('/api/cars', require('./routes/carRoutes'));

// Stub to serve static
app.use(express.static(path.join(__dirname, '../client/src')));

app.listen(PORT, () => {
    console.log(\`Server executing gracefully on port \${PORT}\`);
});
"@
Set-Content -Path "$serverDir\server.js" -Value $serverJs

$carRoutes = @"
const express = require('express');
const router = express.Router();
const { getCars } = require('../controllers/carController');

router.get('/', getCars);

module.exports = router;
"@
Set-Content -Path "$serverDir\routes\carRoutes.js" -Value $carRoutes

$carController = @"
exports.getCars = (req, res) => {
    res.json({ message: "Mock response, currently simulating DB payload" });
};
"@
Set-Content -Path "$serverDir\controllers\carController.js" -Value $carController

Set-Content -Path "$serverDir\.env" -Value "PORT=5000`nNODE_ENV=development"

# Cleanup
Remove-Item "$baseDir\refactor.js" -ErrorAction SilentlyContinue
Remove-Item "$baseDir\css" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$baseDir\js" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$baseDir\images" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Restructuring Complete."
