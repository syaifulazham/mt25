# Dokumen Gambaran Aplikasi Malaysia Techlympics 2025

Dokumen ini menerangkan struktur dan fungsi utama aplikasi Techlympics 2025, dibahagikan kepada tiga bahagian besar:

1. **Public Page** – laman awam/pemasaran
2. **Organizer** – portal urus tadbir acara (ADMIN / OPERATOR / VIEWER)
3. **Participants (Pengurus Kontinjen)** – portal pengurus peserta/kontinjen

---

## 1. Public Page

**Ringkasan:** Bahagian ini merangkumi semua halaman awam yang dilihat oleh orang ramai, dengan fokus pada promosi program dan laluan masuk ke portal peserta serta organizer.

### 1.1 Halaman Utama (Landing Page)

**Ringkasan:** Halaman utama berfungsi sebagai muka depan promosi Techlympics 2025 dan mengumpulkan semua seksyen maklumat penting serta pautan ke portal peserta.

**Tujuan Utama**  
Memberi gambaran menyeluruh tentang Malaysia Techlympics 2025, menarik minat pelajar/guru/ibu bapa, serta menjadi pintu masuk kepada portal peserta dan organizer.

**Komponen Utama**
- **Navigasi utama**  
  Pautan ke seksyen:
  - About (Tentang Techlympics)
  - Themes (Tema pertandingan)
  - Announcements (Pengumuman)
  - Gallery (Galeri gambar)
  - News (Berita)
  - Partners (Rakan strategik)
  - Videos (Video unggulan)
- **Bahasa & I18N**  
  - Penukaran bahasa (BM/BI) melalui `LanguageSwitcher`
  - Semua teks utama (hero, about, nav, dll.) menggunakan sistem terjemahan.
- **Hero Section**  
  - Tajuk & slogan rasmi  
  - Penerangan ringkas program  
  - Butang tindakan utama:
    - Daftar / Log Masuk Peserta (ke portal participants)
    - Ketahui Lebih Lanjut (skrol ke seksyen About)

**Seksyen Kandungan**
- **About Us**  
  Penerangan objektif, sasaran peserta, dan konteks kebangsaan.
- **Competition Themes**  
  Senarai tema pertandingan (contoh: AI, Robotik, IoT, dsb.) dengan penjelasan ringkas.
- **Announcements**  
  Pengumuman penting (tarikh tutup, perubahan jadual, hebahan baru).
- **Gallery & Gallery Carousel**  
  Koleksi gambar edisi lepas dan promosi semasa.
- **News Section**  
  Artikel/berita ringkas berkaitan Techlympics.
- **Video Section**  
  Senarai video promosi, recap event, atau penerangan pertandingan.
- **Partners Section**  
  Logo dan nama rakan strategik/sponsor rasmi.

**Call to Action (CTA)**
- **Daftar Peserta** – pautan ke halaman pendaftaran/log masuk peserta.  
- **Ketahui Lebih Lanjut** – skrol ke seksyen About.

**Footer**
- **Quick Links & Resources**  
  - Pautan pantas (About, Events, Partners, Contact)  
  - Resources (Documentation, FAQs, Support, Privacy Policy)
- **Maklumat Hubungan**  
  - Alamat e-mel rasmi (contoh: info@techlympics.my)
- **Media Sosial**  
  - Pautan ke Facebook, Instagram, X (Twitter), TikTok, YouTube.
- **Polisi**  
  - Terms of Service, Privacy Policy, Cookie Policy.

### 1.2 Halaman Autentikasi Awam

**Ringkasan:** Modul ini menyediakan halaman log masuk dan pendaftaran peserta dengan pengesahan emel serta sokongan login luaran apabila diaktifkan.

**Log Masuk Peserta**  
- Halaman `auth/participants/login`  
- Menyokong:
  - Log masuk emel + kata laluan
  - Integrasi login Google (jika diaktifkan)
- Gaya visual selaras dengan laman utama.

**Pendaftaran Peserta**  
- Halaman `auth/participants/register`  
- **Ciri-ciri**:
  - Pendaftaran berasaskan emel
  - Pengesahan emel melalui nodemailer (SMTP boleh dikonfigurasi)
  - Akaun ditanda *inactive* sehingga pengesahan emel selesai

### 1.3 Portal Arena Peserta (Microsite Individu)

**Ringkasan:** Portal arena ialah microsite peribadi untuk peserta individu mengakses profil, maklumat kontinjen dan kuiz berjadual dalam suasana bertema permainan.

Walaupun diakses oleh pelajar (contestant), pintu masuknya adalah awam.

**Arena Login**  
- Halaman `arena/login`  
- Log masuk menggunakan:
  - Nombor IC
  - Passcode khas (dijana sistem dan disimpan dalam jadual `microsite`)

**Microsite Contestant** (`/arena/[contestanthashcode]`)  
- **Profil Peserta**  
  - Nama, IC, e-mel, jantina, umur, tahap pendidikan, kelas.
- **Maklumat Kontinjen**  
  - Nama kontinjen, jenis institusi, logo, negeri.
- **Kuiz Berjadual**  
  - Senarai kuiz yang dipadankan dengan peserta:
    - Tajuk, deskripsi, durasi, kumpulan sasaran
    - Status (Upcoming / Active / Ended)
    - Maklumat percubaan (score, masa diambil, status lengkap)
- **Pengurusan Passcode**  
  - Tukar passcode secara manual atau jana rawak
  - Pengiraan loginCounter untuk audit.

---

## 2. Organizer Portal

**Ringkasan:** Portal Organizer digunakan oleh ADMIN, OPERATOR dan VIEWER untuk mengurus acara, kontinjen, peserta, kehadiran, pengadilan, sijil dan laporan secara menyeluruh.

Portal untuk **ADMIN**, **OPERATOR**, dan **VIEWER** mengurus keseluruhan ekosistem Techlympics.

### 2.1 Autentikasi & Peranan

**Ringkasan:** Sub-modul ini mengawal proses log masuk organizer dan menetapkan tahap akses berdasarkan peranan (ADMIN, OPERATOR, VIEWER).

**Log Masuk Organizer**  
- Halaman `auth/organizer/login`  
- Selepas log masuk, pengguna dibawa ke `/organizer/dashboard`.

**Peranan & Akses**  
- **ADMIN** – akses penuh (tetapan sistem, pengurusan acara, pensijilan, dll.)
- **OPERATOR** – akses operasi (acara, peserta, pengadilan, sijil) dengan beberapa had berbanding ADMIN.
- **VIEWER** – hanya boleh melihat Dashboard; tiada akses ke modul lain (dilencongkan secara server-side jika cuba buka halaman lain).

### 2.2 Dashboard Organizer

**Ringkasan:** Dashboard memberi gambaran segera tentang statistik utama penyertaan dan aktiviti sistem, serta menjadi titik mula kerja harian organizer.

**Halaman**: `/organizer/dashboard`

**Fungsi Utama**:
- **Ringkasan Statistik Asas**  
  Bilangan kontinjen, peserta, pasukan, penyertaan mengikut acara.
- **Penapis Mengikut Negeri**  
  Memfokuskan statistik kepada negeri tertentu.
- **Graf & Carta**:
  - Agihan jantina
  - Tahap pendidikan
  - Kategori sekolah
  - Penyertaan mengikut negeri
  - Penyertaan mengikut nama pertandingan
- **Log Aktiviti**  
  Aktiviti terkini dalam sistem (contohnya pendaftaran, perubahan data).

### 2.3 Pengurusan Acara & Pertandingan

**Ringkasan:** Modul ini mengurus struktur asas pertandingan, termasuk penciptaan acara dan definisi pertandingan yang akan disertai oleh peserta.

**Pengurusan Acara (Events)**  
- Cipta dan kemaskini acara (ZONE / STATE / NATIONAL)  
- Tetapan tarikh, lokasi, skop, dan status acara.

**Pengurusan Pertandingan (Contests / EventContests)**  
- Definisi pertandingan di bawah sesuatu acara:
  - Nama pertandingan, kategori, tahap sasaran (Kids/Teens/Youth)
  - Had umur minimum/maksimum
  - Kapasiti pasukan (min/max ahli)
- Pendaftaran pasukan ke pertandingan melalui modul peserta (dipantau di sini).

### 2.4 Pengurusan Kontinjen & Peserta

**Ringkasan:** Sub-modul ini memfokuskan kepada pengurusan kontinjen, peserta dan pasukan dari perspektif organizer, termasuk tugasan pertandingan secara pukal.

**Senarai Kontinjen**  
- Papar semua kontinjen:
  - Jenis (Sekolah, IPT, Individu)
  - Negeri, PPD (untuk sekolah)
- **Penapis Negeri**  
  Menapis semua jenis kontinjen berdasarkan negeri.

**Butiran Kontinjen**  
- Lihat senarai peserta & pasukan bagi kontinjen terpilih.  
- Modul **Bulk Assign Contests** (penetapan pertandingan secara pukal):
  - Tetapkan pertandingan untuk semua peserta yang belum mempunyai pertandingan secara pukal.
  - Proses chunked (berkelompok) dengan progress bar dan kawalan pause/resume.

### 2.5 Pengurusan Kehadiran (Attendance)

**Ringkasan:** Modul kehadiran menyelaraskan data endlist ke jadual attendance, menyokong perubahan hari acara, dan mengendalikan proses check-in berasaskan kod QR.

**Sync Endlist ke Attendance**  
- Menyalin rekod endlist (pasukan & peserta yang diluluskan) ke jadual kehadiran:
  - `attendanceTeam`
  - `attendanceContestant`
  - `attendanceManager`
  - `attendanceContingent`
- Menyokong:
  - **Sync by Contingent** – sincron satu kontinjen dengan dialog penuh lebar & status per-kontinjen.
  - Status `needsSync` berdasarkan bilangan pasukan yang benar-benar layak diselaraskan (mengambil kira validasi umur, status pasukan, dsb).

**Status Sync & Semakan Pasukan Hilang**  
- Papar:
  - Berapa pasukan sepatutnya diselaraskan
  - Berapa yang sudah wujud dalam attendance
  - Senarai pasukan yang masih hilang (terhad beberapa yang pertama untuk rujukan).

**D-Day Changes (Perubahan Hari Pertandingan)**  
- Tambah atau keluarkan ahli pasukan pada hari acara:
  - Validasi had maksimum ahli
  - Pastikan ahli dari kontinjen yang sama
  - Elak ahli yang sudah dalam pasukan lain.

**QR Check-in & Endpoints Kehadiran**  
- Endpoint `/api/attendance/check-in`:
  - Menyokong imbasan kod QR untuk:
    - Pengurus kontinjen
    - Kod kontinjen khusus
  - Kawalan masa (tetingkap 3 jam sebelum acara sehingga tamat acara)
  - Cegah pendua – jika sudah `Present`, sistem balas kejayaan dengan flag `alreadyPresent`.

**Pembersihan Rekod Lapuk (Cleanup)**  
- Menghapus rekod kehadiran yang tidak lagi sepadan dengan endlist terkini:
  - `attendanceContestant` tanpa contestant dalam endlist
  - `attendanceTeam` tanpa team dalam endlist
- Papar statistik dan senarai ID yang dibersihkan.

### 2.6 Pengurusan Pengadilan (Judging)

**Ringkasan:** Modul pengadilan mengurus template penilaian, sesi skor dan paparan scoreboard bagi menentukan keputusan pertandingan secara telus.

**Template Penjurian (Judging Templates)**  
- Cipta, lihat, edit, dan padam template penilaian:
  - Jenis kriteria: POINTS, TIME, DISCRETE_SINGLE, DISCRETE_MULTIPLE
  - OPERATOR kini dibenarkan sepenuhnya mengurus template (bukan hanya ADMIN).

**Sesi Pengadilan & Skor**  
- Halaman sesi pengadilan memaparkan:
  - Senarai kriteria & skor
  - Pengiraan skor semasa (current total/weighted score)
  - Paparan pilihan kriteria diskret (discrete) dengan highlight.
- Penukaran data skor (string → number) diurus supaya paparan tepat.

**Scoreboard Pengadilan**  
- Papar ranking pasukan mengikut pertandingan.  
- Penapis:
  - Negeri
  - Tahap sekolah (Kids/Teens/Youth)
- Statistik:
  - Bilangan hakim
  - Bilangan sesi penjurian
  - Skor agregat setiap pasukan.

**Pengurusan Pemenang & Sijil Pemenang**  
- Pilih pasukan pemenang mengikut kedudukan.  
- Menjana sijil pemenang (terikat dengan modul sijil di bawah).

### 2.7 Pengurusan Sijil (Certificates)

**Ringkasan:** Modul sijil mengawal reka bentuk template, penjanaan automatik sijil peserta dan pemenang, serta pengurusan nombor siri dan pemilikan.

**Template Sijil (CertTemplate)**  
- Cipta dan edit template:
  - Muat naik PDF asas (Upload/Replace PDF Template – dalam panel konfigurasi)
  - Tetapkan saiz sijil, kalibrasi PDF, sasaran (GENERAL, EVENT_PARTICIPANT, EVENT_WINNER, NON_CONTEST_PARTICIPANT)
  - Tetapkan **prerequisites** (contoh: perlu jawab survey, hadiri acara, lengkapkan pertandingan).
- Template Configuration boleh dikembangkan/diruntuhkan untuk ruang kerja lebih luas.

**Penjanaan Sijil**  
- **Peserta Acara (EVENT_PARTICIPANT)**:
  - Butang “Generate Certificates” pada kad template (untuk ADMIN/OPERATOR).
  - Halaman khas:
    - Senarai peserta `Present` mengikut event
    - Status sijil: Not Generated / Listed / Generated
    - Pilih beberapa peserta & jana secara pukal.
- **Pemenang Acara (EVENT_WINNER)**:
  - Menyokong dua kaedah:
    - **Menggunakan sijil pra-jana (pre-generated)** dan memetakan kepada pemenang.
    - **Direct Generate** – jana terus tanpa PDF pra-jana.
  - Jika sijil sedia ada wujud (berdasarkan IC + template + award):
    - Sijil dikemas kini & PDF dijana semula **tanpa mengubah nombor siri**.
    - Elak pendua nombor siri.

**Nombor Siri & Pemilikan Sijil**  
- Nombor siri format baharu: `MT{YY}/{TYPE_CODE}/{SEQUENCE}`  
  Contoh: `MT25/GEN/000001`, `MT25/WIN/000045`.
- Jadual `certificate_serial` menjejak last sequence per tahun/template/jenis.  
- Medan `ownership` (JSON) dalam `certificate` menyimpan:
  - Tahun
  - `contingentId`
  - `contestantId`
- Digunakan untuk:
  - Had akses (contingent hanya lihat sijil sendiri)
  - Penapisan & laporan.

**Muat Turun, Cetak & Arkib Sijil**  
- PDF dijana ke dalam `public/uploads/certificates` tetapi dihidang melalui API dinamik untuk elak isu cache.
- Fungsi:
  - Buka PDF dalam tab baharu
  - Muat turun dengan nama fail mesra pengguna
  - Cetak terus dari pelayar
- Ciri “Download All”:
  - Gabung sijil dalam batch (50 per PDF), zip bersama `metadata.json`.

### 2.8 Laporan (Reports)

**Ringkasan:** Modul laporan menyediakan dokumen rasmi dalam format DOCX/XLSX untuk endlist, senarai kontinjen dan ringkasan penyertaan mengikut negeri dan kumpulan pertandingan.

**Halaman**: `/organizer/events/[id]/reports`

**Jenis Laporan Utama**:
- **Full Endlist Report (DOCX)** – dengan maklumat penuh (IC, telefon, e-mel).
- **Basic Endlist Report (DOCX)** – versi tanpa maklumat sensitif (privasi).
- **Contingents List Report (DOCX)** – senarai kontinjen mengikut negeri, jenis, PPD, bilangan pasukan/peserta.
- **Competitions Overview (DOCX/XLSX)**  
  - Ringkasan:
    - Jumlah kontinjen, pasukan, peserta
  - Struktur hierarki:
    - Untuk acara ZONE:  
      General total → Negeri → Kumpulan pertandingan → Jadual pertandingan
    - Untuk STATE/NATIONAL:  
      General total → Kumpulan pertandingan → Jadual pertandingan
- **Dashboard-style laporan lain** – termasuk penyertaan mengikut negeri dalam bentuk chunked processing untuk dataset besar.

---

## 3. Participants Portal (Pengurus Kontinjen/Peserta)

**Ringkasan:** Portal peserta digunakan oleh guru, pensyarah atau pengurus kontinjen untuk mendaftarkan peserta, membina pasukan, mengurus penyertaan pertandingan dan memantau status.

Portal ini digunakan oleh **guru/pensyarah/pengurus** yang menguruskan kontinjen dan peserta.

### 3.1 Autentikasi Peserta

**Ringkasan:** Sub-modul ini mengurus pendaftaran akaun pengurus kontinjen dan proses log masuk ke portal peserta.

**Pendaftaran Peserta**  
- Daftar akaun pengurus peserta:
  - Emel, kata laluan
  - Tetapan institusi (sekolah / IPT / lain)
  - Pengesahan emel melalui pautan.

**Log Masuk Peserta**  
- `participants/auth/login`
- Menyokong login biasa dan Google (jika diaktifkan).

### 3.2 Dashboard Peserta

**Ringkasan:** Dashboard peserta memaparkan ringkasan maklumat kontinjen, profil, peserta dan pasukan, termasuk amaran tindakan yang perlu diambil.

**Halaman**: `/participants/dashboard`

**Fungsi Utama**:
- **Contingent Summary**  
  Maklumat asas kontinjen yang dikendalikan.
- **Profile Summary**  
  Ringkasan profil pengurus (nama, emel, institusi).
- **Contestants Summary**  
  Bilangan peserta, status pendaftaran.
- **Teams Summary**  
  Bilangan pasukan, pembahagian mengikut pertandingan.
- **Amaran & Notifikasi**:
  - Peserta tanpa pertandingan (unassigned)
  - Permohonan tertangguh (pending requests).
- **Video Gallery**  
  Video berkaitan untuk motivasi atau penerangan.

**Butang Kod QR Kehadiran**  
- Papar QR code berdasarkan `attendanceContingent.hashcode`.
- Digunakan semasa hari acara untuk daftar masuk (scan oleh petugas).

### 3.3 Pengurusan Profil & Institusi

**Ringkasan:** Modul ini membenarkan pengurus mengemas kini maklumat diri dan menghubungkannya dengan institusi seperti sekolah atau IPT.

**Profil Pengguna**  
- Kemaskini:
  - Nama, telefon, jantina, tarikh lahir
  - Emel (jika dibenarkan)

**Maklumat Institusi**  
- Pautan ke sekolah atau IPT:
  - Nama sekolah/IPT
  - Negeri, PPD (untuk sekolah)

### 3.4 Pengurusan Kontinjen

**Ringkasan:** Sub-modul ini menyimpan maklumat utama tentang kontinjen yang diwakili termasuk jenis, logo dan statistik penyertaan.

**Maklumat Kontinjen**  
- Nama kontinjen, jenis (Sekolah/IPT/Individu)
- Logo kontinjen
- Negeri & maklumat berkaitan

**Statistik Kontinjen**  
- Bilangan peserta, pasukan, penyertaan pertandingan.

### 3.5 Pengurusan Peserta (Contestants)

**Ringkasan:** Modul peserta membolehkan penambahan, penyuntingan dan pemetaan peserta kepada pasukan atau pertandingan tertentu.

**Tambah & Kemaskini Peserta**  
- Butiran:
  - Nama, IC, umur, jantina
  - Tahap pendidikan, kelas
- Tetapan ke institusi (jika berbilang sekolah/IPT).

**Pengurusan Contest & Pendaftaran**  
- Tugaskan peserta ke pasukan atau pertandingan tertentu.
- Pantau status sama ada peserta telah:
  - Diassign ke pertandingan
  - Hadir (melalui modul attendance, refleksi dalam laporan).

**Penjanaan Sijil (Terpilih / Ciri Tersembunyi)**  
- Menu peserta boleh memaparkan pilihan “Generate Certificate” jika parameter URL tertentu diaktifkan (`?cert=enabled`).
- Mengelakkan penggunaan tidak sengaja, tetapi berguna semasa tempoh tertentu (contoh: fasa pengeluaran sijil untuk peserta umum).

### 3.6 Pengurusan Pasukan (Teams)

**Ringkasan:** Modul pasukan digunakan untuk membentuk pasukan mengikut pertandingan, mengurus ahli pasukan dan memastikan syarat saiz pasukan dipatuhi.

**Cipta & Urus Pasukan**  
- Tetapkan:
  - Nama pasukan
  - Pertandingan yang disertai
  - Ahli-ahli pasukan (peserta yang sama kontinjen)
- Validasi:
  - Had minimum/maksimum ahli.

**Tambah/Keluarkan Ahli**  
- Sebelum acara (oleh pengurus peserta).
- Pada hari acara, perubahan tambahan diurus organizer (D-Day changes) tetapi masih berkaitan dengan data pasukan yang dibuat oleh pengurus.

### 3.7 Pendaftaran Acara & Penyertaan

**Ringkasan:** Sub-modul ini mengurus proses mendaftarkan pasukan ke contest dalam sesuatu event dan menjejak status kelulusan/endlist.

**Pendaftaran Event–Contest**  
- Pilih contest di dalam sesuatu event untuk didaftarkan.
- Mematuhi:
  - Kumpulan sasaran umur
  - Tahap sekolah

**Status Pendaftaran**  
- Menyemak sama ada:
  - Permohonan diterima / ditolak / menunggu
  - Pasukan telah masuk ke senarai endlist (disahkan untuk hadir).

### 3.8 Token Penyertaan

**Ringkasan:** Modul token merekod penggunaan token bagi tindakan tertentu seperti pendaftaran pasukan tambahan dan perubahan ahli, lengkap dengan nota audit.

**Token Event Contest**  
- Sesetengah tindakan memakan token:
  - Daftar pasukan ekstra ke event contest
  - Tambah atau keluarkan ahli daripada pasukan.

**Rekod Notes Token**  
- Setiap penggunaan token disertakan nota jelas, contoh:
  - `register extra team (Team Alpha) to the Zone Physical Event 2025`
  - `add John Doe to team Team Alpha`
  - `remove Jane Smith from team Team Beta`
- Membantu audit dan jejak penggunaan token oleh pengurus.

### 3.9 Dokumen & Senarai Muat Turun

**Ringkasan:** Sub-modul ini menyediakan senarai boleh muat turun untuk rujukan dalaman serta menjadi penghubung kepada sijil dan kod QR kehadiran.

**Senarai Peserta/Pasukan**  
- Muat turun senarai untuk kegunaan dalaman (contoh: semakan sebelum hadir ke acara).

**Integrasi dengan Sijil & Arena**  
- Walaupun sijil dan microsite lebih banyak dikendali oleh organizer dan sistem backend, portal peserta:
  - Menyediakan data asas yang digunakan untuk penjanaan sijil (nama, kontinjen, contest).
  - Memberi QR code kehadiran yang digunakan dalam proses check-in.
