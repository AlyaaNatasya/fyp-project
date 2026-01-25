# StudyBloom Deployment Guide (DigitalOcean)
**Date:** January 24, 2026
**Server IP:** `165.245.185.70`
**OS:** Ubuntu 24.04 LTS (1GB RAM)

---

## 1. Initial Server Setup (One-Time)
These steps prepare a fresh "Regular" ($6/mo) Droplet.

### A. Create Swap Memory (The Safety Net)
Prevents crashes on low-RAM servers.
```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
```

### B. Install Software Stack
Installs Node.js (v20), Nginx (Web Server), MySQL (Database), and Git.
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx mysql-server git
```

---

## 2. Database Setup
### A. Create Database & User
Run `mysql` to enter the console, then run:
```sql
CREATE DATABASE studybloom;
CREATE USER 'studybloom_user'@'localhost' IDENTIFIED BY 'Fypsayang@1234';
GRANT ALL PRIVILEGES ON studybloom.* TO 'studybloom_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### B. Import Tables
Run this from the `backend` folder after cloning your code:
```bash
mysql -u studybloom_user -p studybloom < ../database/setup_complete.sql
```

---

## 3. Application Deployment
### A. Clone Code
```bash
mkdir -p /var/www/studybloom
cd /var/www/studybloom
git clone https://github.com/AlyaaNatasya/fyp-project .
```

### B. Install Dependencies
```bash
cd backend
npm install
mkdir uploads preserved_files  # Create necessary folders ignored by git
```

### C. Configure Environment (.env)
Create the file: `nano backend/.env`
```env
DB_HOST=localhost
DB_USER=studybloom_user
DB_PASSWORD=Fypsayang@1234
DB_NAME=studybloom
JWT_SECRET=your_secure_random_string
DEEPSEEK_API_KEY=your_actual_key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_16_char_app_password
PORT=5001
NODE_ENV=production
FRONTEND_URL=http://165.245.185.70
```

---

## 4. Web Server Configuration (Nginx)
File path: `/etc/nginx/sites-available/studybloom`

```nginx
server {
    listen 80;
    server_name 165.245.185.70; # Replace with your IP

    root /var/www/studybloom/fyp-project/frontend;
    index pages/home.html;

    location / {
        try_files $uri $uri/ /pages/home.html;
    }

    # API Proxy
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```
**Enable it:**
```bash
ln -s /etc/nginx/sites-available/studybloom /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
systemctl restart nginx
```

---

## 5. Maintenance Cheat Sheet (Save This!)

### How to Update Your Code
When you make changes on your laptop and push to GitHub:
1. **SSH into server:** `ssh root@165.245.185.70`
2. **Go to folder:** `cd /var/www/studybloom/fyp-project`
3. **Pull changes:** `git pull`
4. **Restart App:** `pm2 restart studybloom`

### How to Check Logs (If something breaks)
*   **View Live Logs:** `pm2 logs`
*   **Monitor Resources:** `pm2 monit`

### Useful Commands
*   **Restart Nginx:** `systemctl restart nginx`
*   **Edit Environment Variables:** `nano backend/.env` (Remember to restart PM2 after editing!)
