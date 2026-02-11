# Dokumen Serahan Sistem
_Malaysia Techlympics 2025_

## 1. Ringkasan Serahan

Dokumen ini menerangkan item-item yang diserahkan kepada pihak client berkaitan sistem Malaysia Techlympics 2025, serta tanggungjawab dan langkah susulan yang dicadangkan.

Skop serahan merangkumi:
- Kod sumber aplikasi (repositori penuh)
- Konfigurasi dan sejarah versi melalui GitHub repository
- Backup pangkalan data terkini
- Pemindahan hak dan kawalan domain `techlympics.my`

> **Nota:** Beberapa maklumat seperti nama fail sebenar, tarikh backup dan URL GitHub hendaklah diisi/semak semasa sesi serahan fizikal bersama client.

---

## 2. Repositori Kod Sumber

### 2.1 Salinan Fizikal dalam Thumbdrive

**Ringkasan:** Thumbdrive mengandungi salinan penuh kod sumber dan fail berkaitan untuk rujukan dan arkib client.

Item dalam thumbdrive (dicadangkan struktur):
- Folder `source-code/`  
  - Mengandungi keseluruhan repo aplikasi Techlympics 2025 (seperti dalam GitHub)  
  - Termasuk folder `src/`, `prisma/`, `database-migration-*.sql`, `docs/` dan fail konfigurasi contoh (`.env.example` atau rujukan pembolehubah environment)
- Folder `database-backups/`  
  - Mengandungi satu atau lebih fail backup MySQL (contoh: `mtdb-YYYY-MM-DD.sql`)
- Folder `assets/` (jika berkenaan)  
  - Logo, bahan grafik, dan dokumen rujukan tambahan

**Cadangan Rasmi kepada Client:**
- Buat salinan tambahan thumbdrive ke storan dalaman organisasi.  
- Simpan sekurang-kurangnya satu salinan sebagai arkib "read-only" (tidak digunakan untuk pembangunan harian) bagi tujuan forensik/rujukan.

### 2.2 Repositori GitHub

**Ringkasan:** GitHub repository memegang sejarah penuh perubahan kod (commit history), isu (issues), dan konfigurasi CI/CD (jika ada). Pemindahan akses memastikan client mempunyai kawalan jangka panjang terhadap pembangunan sistem.

Maklumat yang perlu dipersetujui dan diisi semasa serahan:
- URL repositori GitHub semasa:  
  `https://github.com/........` *(akan diisi mengikut repo sebenar)*
- Akaun/organisasi GitHub milik client (jika ada):  
  `github.com/<nama-organisasi-client>`

**Pilihan Mod Pemindahan:**
1. **Tambah Client sebagai Owner/Administrator**  
   - Client ditambah sebagai admin/collaborator dengan akses penuh (read/write/admin).  
   - Sesuai jika repo kekal di akaun sedia ada tetapi client mahu hak akses penuh.
2. **Transfer Ownership ke Organisasi Client**  
   - Repo dipindahkan ke organisasi GitHub client.  
   - Semua _commit history_, branches dan tags dikekalkan.  
   - Akses lama boleh dikurangkan selepas tempoh transisi.

**Tindakan Disyorkan:**
- Semak bersama client polisi keselamatan organisasi mereka (contoh: requirement SSO, protected branches).  
- Tetapkan sekurang-kurangnya satu admin teknikal di pihak client yang memahami Git dan GitHub.

---

## 3. Pangkalan Data & Backup Terakhir

### 3.1 Penerangan Pangkalan Data

**Jenis Pangkalan Data:** MySQL (atau MariaDB setara)  
**Contoh Nama Pangkalan Data:** `mtdb`  

Pangkalan data mengandungi:
- Jadual pengguna (organizer, participants, contestants, dsb.)
- Jadual pertandingan, acara, kontinjen, pasukan
- Jadual kehadiran (attendance)
- Jadual sijil (certificates, templates, siri nombor)
- Jadual audit tertentu (log, token, dll.)

### 3.2 Backup Terakhir

**Ringkasan:** Backup terakhir disertakan untuk memastikan client mempunyai salinan penuh data bagi tujuan pemulihan atau migrasi ke infrastruktur baharu.

Maklumat yang perlu dilengkapkan semasa serahan:
- Nama fail backup terakhir:  
  Contoh: `mtdb-2025-11-06.sql`
- Tarikh dan masa backup dibuat:  
  `YYYY-MM-DD HH:MM` (ikut zon masa Malaysia)
- Kaedah backup:  
  Contoh: `mysqldump -u mtuser -p mtdb > mtdb-YYYY-MM-DD.sql`
- Lokasi fail backup:
  - Dalam thumbdrive: `database-backups/mtdb-YYYY-MM-DD.sql`  
  - (Jika ada) salinan di server: `/backups/mtdb-YYYY-MM-DD.sql`

### 3.3 Cadangan Proses Restore

Untuk rujukan client (disesuaikan mengikut persekitaran mereka):

1. Cipta database kosong pada server baharu (jika perlu):
   ```sql
   CREATE DATABASE mtdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
2. Jalankan arahan restore:
   ```bash
   mysql -u <user> -p mtdb < mtdb-YYYY-MM-DD.sql
   ```
3. Pastikan `DATABASE_URL` / konfigurasi aplikasi menunjuk ke database dan server yang betul.

> **Peringatan:** Backup mengandungi data peribadi (IC, emel, dsb.). Client perlu mematuhi polisi PDPA dan polisi dalaman organisasi.

---

## 4. Domain & DNS: techlympics.my

### 4.1 Maklumat Domain

**Nama domain utama:** `techlympics.my`  
Domain ini digunakan untuk:
- Laman awam/promosi Malaysia Techlympics 2025  
- Portal organizer & participants (melalui subdomain, jika dikonfigurasi)

Maklumat semasa (pada tarikh penyediaan dokumen ini):
- Registrar/reseller semasa: **Shinjiru** (reseller/partner MYNIC).  
- _Registrant_ semasa: **pemilik asal projek / organisasi anda** (akan dinyatakan dengan nama penuh dalam borang MYNIC).  

Maklumat tambahan yang perlu disahkan dan direkod semasa serahan:
- Tempoh sah domain (tarikh luput/pembaharuan seterusnya).  
- Akaun pengurusan domain di Shinjiru (login portal, emel berdaftar, dsb.).

### 4.2 Tanggungjawab Client Selepas Pemindahan

Selepas proses pemindahan selesai, client akan menjadi pihak yang bertanggungjawab kepada:
- Pembaharuan domain tahunan (bayaran kepada MYNIC atau reseller).  
- Pengurusan DNS (A record, CNAME, MX, TXT, dsb.).  
- Memastikan rekod DNS menunjuk ke server aplikasi yang betul.  
- Memastikan maklumat _registrant_ dan _admin contact_ sentiasa terkini.

### 4.3 Ringkasan Polisi Pemindahan Domain MYNIC

> **Nota:** Ringkasan ini bersifat umum. Client disarankan merujuk dokumen polisi terkini di laman rasmi MYNIC (.my DOMAIN REGISTRY) untuk maklumat terperinci dan borang terkini.

Beberapa prinsip asas polisi MYNIC untuk domain `.my` (termasuk `techlympics.my`):

1. **Hak Milik Domain (Registrant)**  
   - Domain `.my` didaftarkan atas nama _registrant_ (individu/organisasi).  
   - Bukti pendaftaran (contoh: SSM, surat kelulusan institusi, dsb.) biasanya diperlukan semasa pendaftaran awal dan perubahan pemilik.

2. **Peranan Reseller/Registrar**  
   - Pemilik domain biasanya berurusan dengan domain melalui reseller/registrar yang berdaftar dengan MYNIC.  
   - Semua permohonan pindah milik / pindah pengurusan hendaklah melalui reseller/registrar atau terus melalui sistem MYNIC, bergantung kepada susunan asal.

3. **Pertukaran Pemilik (Change of Registrant)**  
   - Untuk memindahkan hak milik domain kepada organisasi client, biasanya diperlukan:  
     - Borang rasmi MYNIC (contoh: _Domain Name Modification / Change of Registrant_).  
     - Tandatangan wakil sah pemilik lama dan pemilik baharu.  
     - Dokumen sokongan organisasi baharu (contoh: sijil SSM, surat lantikan, dsb.).  
   - Selepas diluluskan, nama _registrant_ di rekod WHOIS MYNIC akan dikemas kini kepada organisasi client.

4. **Pertukaran Reseller/Registrar (Jika Perlu)**  
   - Selain pertukaran pemilik, domain juga boleh dipindahkan daripada satu reseller/registrar ke yang lain.  
   - Proses ini biasanya melibatkan permohonan melalui reseller baharu dan pengesahan daripada pihak yang berkuasa ke atas domain (admin contact/registrant).

5. **Sekatan Masa & Status Domain**  
   - Domain tidak boleh dipindahkan jika dalam status tertentu seperti `suspended`, `expired` (luput tanpa pembaharuan), atau jika sedang dalam pertikaian (dispute).  
   - Sesetengah perubahan tidak digalakkan ketika terlalu hampir dengan tarikh luput/pembaharuan; sebaiknya selesaikan pembaharuan dahulu atau rancang lebih awal sebelum tarikh luput.

6. **Tanggungjawab Undang-Undang & Data**  
   - Selepas domain dipindahkan, pemilik baharu bertanggungjawab ke atas kandungan yang dihoskan di bawah domain tersebut.  
   - Pemilik baharu juga perlu memastikan penggunaan domain mematuhi undang-undang Malaysia dan garis panduan MYNIC.

### 4.4 Cadangan Langkah Pemindahan techlympics.my kepada Client

Pada masa ini, domain `techlympics.my` didaftarkan atas nama anda/organisasi anda sebagai _registrant_ melalui reseller **Shinjiru**. Pemindahan kepada client akan dilaksanakan melalui proses rasmi _change-of-registrant_ dan/atau pertukaran pengurusan di Shinjiru yang mematuhi polisi MYNIC.

1. **Sahkan Maklumat Sedia Ada**  
   - Pastikan rekod di portal Shinjiru dan WHOIS MYNIC memaparkan anda/organisasi anda sebagai _registrant_ semasa bagi `techlympics.my`.

2. **Pilih Mod Pemindahan**  
   - **Hanya Tukar Pengurusan/DNS:**  
     Domain kekal atas nama organisasi anda tetapi DNS diarah ke infrastruktur client (perubahan dibuat melalui portal Shinjiru).  
   - **Tukar Pemilik kepada Client:**  
     Domain dipindahkan sepenuhnya kepada organisasi client sebagai _registrant_ baharu melalui proses _change-of-registrant_ di Shinjiru/MYNIC (digalakkan untuk jangka panjang).

3. **Sediakan Dokumen Sokongan**  
   - Dokumen syarikat/institusi client (SSM, surat lantikan, dsb.).  
   - Maklumat pegawai yang akan menjadi _admin contact_ domain (nama, emel, telefon).

4. **Isi Borang & Hantar Melalui Reseller/MYNIC**  
   - Lengkapkan borang rasmi MYNIC mengikut panduan **Shinjiru** (reseller yang mengurus domain).  
   - Pastikan kedua-dua pihak (pemilik lama iaitu anda/organisasi anda & pihak client) menandatangani jika melibatkan pertukaran pemilik (_change-of-registrant_).

5. **Uji Selepas Pemindahan**  
   - Selepas perubahan DNS/pemilik berkuatkuasa, uji:  
     - Resolusi domain ke server yang betul.  
     - Akses laman awam dan portal.  
     - Rekod MX (jika domain digunakan untuk emel).

---

## 5. Maklumat Sokongan & Penutup

Sebarang soalan teknikal lanjut berhubung kod sumber, struktur pangkalan data atau konfigurasi aplikasi boleh dirujuk kepada pasukan pembangunan asal dalam tempoh transisi yang dipersetujui.

Setelah semua item di atas disahkan diterima dan berfungsi di pihak client, tanggungjawab operasi harian (operational responsibility) akan beralih sepenuhnya kepada pihak client mengikut perjanjian projek.
