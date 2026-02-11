# Garis Panduan Setup Server
_Aplikasi Malaysia Techlympics 2025_

## 1. Skop & Pra-Syarat

**Ringkasan:** Dokumen ini menerangkan langkah asas untuk menyediakan server produksi bagi menjalankan aplikasi Malaysia Techlympics 2025.

- **Sasaran pembaca:**  
  - Admin IT / DevOps client  
  - Hosting provider / sysadmin
- **Andaian persekitaran (boleh diubah):**  
  - OS: Linux (disyorkan Ubuntu 20.04 / 22.04 LTS)  
  - Web server: Nginx sebagai reverse proxy  
  - Aplikasi: Node.js (Next.js) + PM2  
  - Pangkalan data: MySQL 8 (atau MariaDB setara)  
  - Domain & SSL sedia ada / akan disediakan oleh client

---

## 2. Spesifikasi Server Disyorkan

**Minimum (1 event bersaiz sederhana):**

- CPU: 2 vCPU  
- RAM: 4 GB  
- Storan: 80 GB SSD  
- Rangkaian: 1 IP awam, port 80 & 443 dibuka

**Disyorkan (skala lebih besar):**

- CPU: 4 vCPU  
- RAM: 8 GB  
- Storan: 160 GB SSD ke atas  
- Backup automatik (snapshot harian/mingguan)

---

## 3. Perisian Wajib Dipasang

**Ringkasan:** Bahagian ini menyenaraikan perisian asas yang perlu dipasang sebelum deploy aplikasi.

### 3.1 Sistem Asas

- Kemas kini sistem:
  ```bash
  sudo apt update && sudo apt upgrade -y
  ```

### 3.2 Node.js & NPM

- Pasang Node.js LTS (contoh 18.x atau 20.x) – guna `nvm` atau repositori rasmi.

### 3.3 MySQL / MariaDB

- Pasang MySQL Server:
  ```bash
  sudo apt install mysql-server -y
  ```
- Pastikan `mysql_secure_installation` dijalankan (set root password, buang test DB, dsb.).

### 3.4 Nginx

- Pasang Nginx:
  ```bash
  sudo apt install nginx -y
  ```

### 3.5 PM2 (Process Manager Node.js)

- Pasang global:
  ```bash
  sudo npm install -g pm2
  ```

### 3.6 Alat Sokongan (Pilihan tetapi Disyorkan)

- `git` – untuk `git clone` repo  
- `ufw` – untuk firewall asas  
- `certbot` – untuk SSL Let’s Encrypt (jika client guna Let’s Encrypt)

---

## 4. Persediaan Pangkalan Data MySQL

**Ringkasan:** Cipta database khas untuk aplikasi dan user dengan akses terhad.

1. Log masuk MySQL:
   ```bash
   sudo mysql
   ```
2. Cipta database & user (contoh nama umum – boleh diubah):
   ```sql
   CREATE DATABASE mtdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

   CREATE USER 'mtuser'@'%' IDENTIFIED BY 'PasswordKuat!';
   GRANT ALL PRIVILEGES ON mtdb.* TO 'mtuser'@'%';
   FLUSH PRIVILEGES;
   ```
3. Pastikan:
   - Port 3306 tidak dibuka kepada umum, atau  
   - Access DB dihadkan kepada IP tertentu (contoh hanya app server).

4. Import skema/migrasi:
   - Sama ada gunakan `prisma migrate` / `prisma db push`  
   - Atau import fail `.sql` yang disediakan (contoh `database-migration-*.sql`)

---

## 5. Konfigurasi Environment Aplikasi

**Ringkasan:** Semua konfigurasi sensitif hendaklah diletakkan dalam fail `.env` di server (bukan commit ke repo).

Contoh parameter yang lazim (sesuaikan nama sebenar projek):

```env
# URL asas
NEXTAUTH_URL=https://app.client-domain.com

# Database
DATABASE_URL=mysql://mtuser:PasswordKuat!@localhost:3306/mtdb

# Auth / Sesi
NEXTAUTH_SECRET=isi_dengan_string_rawak_panjang

# SMTP (emel)
SMTP_HOST=smtp.clientmail.com
SMTP_PORT=587
SMTP_USER=no-reply@client-domain.com
SMTP_PASS=kata_laluan_smtp
SMTP_SECURE=false

# Tetapan lain (Google OAuth, dsb.) jika digunakan
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

**Nota:**

- Jangan gunakan password contoh dalam produksi.  
- `.env` hanya boleh dibaca oleh user yang menjalankan aplikasi (contoh `mtapp`).

---

## 6. Deploy Aplikasi ke Server

**Ringkasan:** Kod aplikasi dihantar ke server, dipasang dependensi, dibina, dan dijalankan menggunakan PM2.

### 6.1 Salin Kod Sumber

Pilihan:

- `git clone https://.../mt25.git` ke contohnya `/var/www/mt25`  
- Atau upload archive ZIP melalui SFTP, kemudian extract.

### 6.2 Pasang Dependensi

Di direktori projek:

```bash
cd /var/www/mt25
npm install
```

### 6.3 Build Production

```bash
npm run build
```

### 6.4 Jalankan Dengan PM2

```bash
pm2 start npm --name mt25 -- run start
pm2 save
pm2 startup
```

- `pm2 save` + `pm2 startup` memastikan proses auto-start selepas reboot.

---

## 7. Konfigurasi Nginx (Reverse Proxy)

**Ringkasan:** Nginx akan terima trafik HTTP/HTTPS pada port 80/443 dan hantar ke aplikasi Node.js (contoh di port 3000).

Contoh konfigurasi ringkas (fail `/etc/nginx/sites-available/mt25`):

```nginx
server {
    listen 80;
    server_name app.client-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Aktifkan config & reload:

```bash
sudo ln -s /etc/nginx/sites-available/mt25 /etc/nginx/sites-enabled/mt25
sudo nginx -t
sudo systemctl reload nginx
```

**SSL (Let’s Encrypt) – optional tetapi disyorkan:**

```bash
sudo certbot --nginx -d app.client-domain.com
```

---

## 8. Pengurusan Proses & Log (PM2)

**Ringkasan:** Bahagian ini menerangkan cara memantau dan mengawal proses Node.js menggunakan PM2.

Perintah penting PM2:

- Senarai proses:
  ```bash
  pm2 list
  ```
- Lihat log:
  ```bash
  pm2 logs mt25
  ```
- Restart selepas update:
  ```bash
  pm2 restart mt25
  ```

---

## 9. Backup & Recovery Ringkas

### 9.1 Backup Pangkalan Data

Contoh backup manual:

```bash
mysqldump -u mtuser -p mtdb > /backups/mtdb-$(date +%F).sql
```

### 9.2 Backup Kod & Fail Upload

- Simpan salinan:
  - Direktori kod (`/var/www/mt25`)  
  - Direktori `public/uploads` (sijil, template PDF, dsb.)

### 9.3 Recovery Pantas

- Restore DB:
  ```bash
  mysql -u mtuser -p mtdb < mtdb-backup.sql
  ```
- Pulihkan direktori `uploads` daripada backup.

---

## 10. Keselamatan Asas

- **Firewall (`ufw`)**  
  - Benarkan hanya port 22 (SSH), 80, 443:
    ```bash
    sudo ufw allow OpenSSH
    sudo ufw allow 'Nginx Full'
    sudo ufw enable
    ```
- **Akses SSH**  
  - Tukar password default  
  - Disyorkan guna SSH key
- **Kemas kini berkala**  
  - `sudo apt update && sudo apt upgrade -y` secara berkala
- **Had akses DB**  
  - Elak expose MySQL ke internet awam melainkan perlu.

---

## 11. Prosedur Update Versi Aplikasi

Apabila ada versi baru:

1. `cd /var/www/mt25`
2. Tarik kod terbaru:
   ```bash
   git pull
   ```
3. Pasang dependensi baru (jika ada):
   ```bash
   npm install
   ```
4. Rebuild:
   ```bash
   npm run build
   ```
5. Restart proses:
   ```bash
   pm2 restart mt25
   ```

---

Dokumen ini boleh disesuaikan mengikut domain sebenar client, versi Node.js/MySQL yang digunakan, dan senarai lengkap pembolehubah `.env` yang diperlukan oleh aplikasi.
