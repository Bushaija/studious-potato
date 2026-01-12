# Deployment Guide

## Initial Server Setup

### 1. Install Required Software on Ubuntu Server

```bash
# Install Node.js (v20 recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Setup PM2 to start on boot
pm2 startup
# Follow the command it outputs
```

### 2. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

- **SERVER_HOST**: Your Ubuntu server IP address (e.g., `192.168.1.100` or `yourdomain.com`)
- **SERVER_USER**: `riwa`
- **SERVER_SSH_KEY**: Content of your private key `/home/riwa/.ssh/id_ed25519` (NOT the .pub file)
- **SERVER_PORT**: `22` (or your custom SSH port)

To get your private key content:
```bash
cat ~/.ssh/id_ed25519
```
Copy the entire output including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`

### 3. Initial Deployment on Server

SSH into your server and run:

```bash
cd /home/riwa/rina/rina.1.0

# Install dependencies
pnpm install

# Create logs directory for PM2
mkdir -p logs

# Copy your .env files
# Make sure to create .env files with your production values
cp apps/client/example.env apps/client/.env
# Edit the .env files with your actual values
nano apps/client/.env

# Start the application with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Check status
pm2 status
pm2 logs rina
```

### 4. Configure Firewall (if needed)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow your Next.js port
sudo ufw allow 3050/tcp

# Enable firewall
sudo ufw enable
```

## How It Works

1. When you push to the `main` branch, GitHub Actions triggers automatically
2. The workflow connects to your Ubuntu server via SSH
3. It pulls the latest code from GitHub
4. Installs any new dependencies with `pnpm install`
5. Restarts the PM2 process to apply changes

## Useful PM2 Commands

```bash
# View logs
pm2 logs rina

# Check status
pm2 status

# Restart app
pm2 restart rina

# Stop app
pm2 stop rina

# Start app
pm2 start ecosystem.config.js

# Monitor
pm2 monit
```

## Troubleshooting

### GitHub Actions fails to connect
- Verify SERVER_HOST, SERVER_USER, and SERVER_SSH_KEY secrets are correct
- Ensure SSH key has proper permissions on server: `chmod 600 ~/.ssh/id_ed25519`
- Check if SSH port is correct (default is 22)

### PM2 app crashes
- Check logs: `pm2 logs rina`
- Verify .env files exist and have correct values
- Check if ports are available: `sudo lsof -i :3050`

### Changes not reflecting
- Check if git pull succeeded: `cd /home/riwa/rina/rina.1.0 && git status`
- Manually restart: `pm2 restart rina`
- Check PM2 logs for errors

## Accessing Your Application

Once deployed, your Next.js app will be available at:
- `http://YOUR_SERVER_IP:3050`

Consider setting up nginx as a reverse proxy for production use with a domain name.
