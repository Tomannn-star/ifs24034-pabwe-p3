# DelHub Workspace — Platform Produktivitas & Pembelajaran (Praktikum PABWE P3)

Dokumentasi implementasi studi kasus praktikum **Pemrograman Aplikasi Berbasis Web (PABWE) Praktikum 3 - JavaScript & DOM Manipulation**. Proyek ini menggabungkan tiga fitur utama dalam arsitektur **Single Page Application (SPA)** berbasis navigasi tab tanpa reload halaman.

- **Nama Mahasiswa:** Toman Sihombing
- **NIM:** 11S24034
- **Username / Repository:** `ifs24034-pabwe-p3`
- **Mata Kuliah:** Pemrograman Aplikasi Berbasis Web (PABWE)
- **Institusi:** Institut Teknologi Del

---

## 📁 Struktur Proyek & Organisasi File

```
ifs24034-pabwe-p3/
├── index.html            # Antarmuka Single Page Application (Semantic HTML5 + Tailwind CSS CDN)
├── assets/
│   ├── script.js         # Seluruh Logika JavaScript (DOM, Events, CRUD, State, & localStorage)
│   └── img/              # Aset gambar pendukung (opsional)
└── README.md             # Dokumentasi Lengkap Proyek & Rubrik Penilaian
```

---

## 🚀 Fitur-Fitur Utama Aplikasi

### 1. 💳 Catatan Pengeluaran Harian (Expense Tracker)
* **Ringkasan Real-Time:** Menghitung akumulasi **Total Pemasukan**, **Total Pengeluaran**, dan **Saldo Bersih** secara dinamis setiap kali ada perubahan data.
* **Operasi CRUD Lengkap:**
  * **Create:** Formulir input transaksi (deskripsi, tipe, kategori, jumlah nominal positif, dan tanggal transaksi).
  * **Read:** Daftar riwayat transaksi dirender secara dinamis melalui pohon DOM (`document.createElement`).
  * **Update:** Modal ubah transaksi memungkinkan pengeditan data secara presisi tanpa meninggalkan halaman.
  * **Delete:** Modal konfirmasi sebelum penghapusan data untuk mencegah kesalahan pengguna.
* **Filter & Pencarian Lanjutan:**
  * Pencarian teks berdasarkan deskripsi secara instan (`input` event).
  * Filter multi-kategori (Makanan, Transportasi, Belanja, Tagihan, Pendidikan, Gaji, dll.).
  * Filter tipe transaksi (Semua, Pemasukan, Pengeluaran).
  * Pengurutan (Sorting): Tanggal Terbaru, Terlama, Nominal Terbesar, Nominal Terkecil, Judul A–Z.
* **Persistensi Data:** Seluruh catatan disimpan di `localStorage` dengan key `ifs24034-p3-expenses`.

---

### 2. 🔖 Bookmark / Link Manager
* **Manajemen Tautan Web:** Menyimpan URL website penting, dokumentasi teknis, dan referensi belajar.
* **Validasi URL:**
  * Memvalidasi bahwa tautan diawali protokol aman `http://` atau `https://` dan memiliki struktur URL valid (`new URL()`).
  * Menampilkan pesan peringatan inline jika URL tidak memenuhi standar.
* **Interaktivitas Ekstra:**
  * Tautan dapat langsung dibuka pada tab baru dengan atribut keamanan (`target="_blank"` dan `rel="noopener noreferrer"`).
  * Tombol **Salin URL** menyalin alamat website ke papan klip (*clipboard*) disertai notifikasi toast visual.
* **Operasi CRUD:** Tambah bookmark, ubah melalui modal, dan konfirmasi hapus melalui modal dialog.
* **Pencarian & Pengurutan:** Filter kategori serta pengurutan berdasarkan nama dan waktu penambahan.
* **Persistensi Data:** Disimpan di `localStorage` dengan key `ifs24034-p3-bookmarks`.

---

### 3. 🧠 Kuis Interaktif (Quiz App)
* **Data Berbasis JavaScript:** Daftar soal disimpan sebagai *Array of Objects* di JavaScript (8 soal berkualitas tentang HTML5, CSS, ES6, DOM, Web Storage, dan SPA).
* **Alur Kuis Interaktif:**
  1. **Layar Mulai:** Menampilkan rekor skor tertinggi (*High Score*) yang pernah diraih pengguna dan jumlah soal.
  2. **Layar Soal:** Navigasi soal demi soal disertai *progress bar* visual, kartu pilihan ganda interaktif, serta evaluasi langsung per soal dengan highlight warna (hijau untuk benar, merah untuk salah) dan kotak penjelasan materi.
  3. **Layar Hasil Akhir:** Menampilkan perolehan nilai, persentase kelulusan, jumlah benar/salah, deteksi rekor baru (*New High Score*), tombol coba lagi, serta daftar ulasan lengkap seluruh soal.
* **Persistensi Data:** Skor tertinggi disimpan di `localStorage` dengan key `ifs24034-p3-quiz-highscore`.

---

### 4. 🗂️ Integrasi Tab & Arsitektur SPA
* **3 Tab Terintegrasi:** Navigasi mulus antara Catatan Pengeluaran, Bookmark Manager, dan Kuis Interaktif.
* **Pemulihan Status Terakhir (*State Memory*):** Tab yang terakhir dibuka disimpan ke `localStorage` (`ifs24034-p3-active-tab`) dan otomatis dipulihkan ketika halaman dimuat ulang (*refresh*).
* **Isolasi Namespace:** Masing-masing fitur menggunakan kunci `localStorage` yang terpisah sehingga data tidak saling menimpa.
* **Aksesibilitas Modal:** Modal mendukung penutupan melalui tombol silang (X), tombol Batal, klik pada *backdrop*, serta tombol keyboard `Escape`.

---

## 🎯 Pemenuhan Checklist Praktikum 3

| Kriteria / Syarat Penilaian | Status | Implementasi pada Proyek |
| :--- | :---: | :--- |
| **Nama proyek format `{username}-pabwe-p3`** | ✅ Terpenuhi | Folder dan penamaan: `ifs24034-pabwe-p3` |
| **Hanya `index.html` + `assets/script.js` sebagai inti** | ✅ Terpenuhi | Terstruktur rapi dengan external script `assets/script.js` |
| **Tiga tab aktif berjalan (Expense, Bookmark, Quiz)** | ✅ Terpenuhi | Navigasi tab responsif dengan atribut semantik `role="tab"` |
| **Expense Tracker (CRUD + Ringkasan + Filter + Storage)** | ✅ Terpenuhi | CRUD DOM, modal edit/hapus, kalkulasi saldo, localStorage |
| **Bookmark Manager (CRUD + Validasi URL + Sort + Storage)** | ✅ Terpenuhi | CRUD DOM, regex/URL constructor, copy clipboard, localStorage |
| **Quiz App (≥5 soal dari array object + Skor + High Score)** | ✅ Terpenuhi | 8 soal terstruktur array object, scoring, review, localStorage |
| **Tab terakhir diingat setelah refresh** | ✅ Terpenuhi | Membaca dan menulis tab aktif ke `localStorage` |
| **Ubah / Hapus memakai Modal Dialog** | ✅ Terpenuhi | Modal dialog khusus untuk ubah & hapus tanpa `confirm()` browser |
| **Desain Responsif (Desktop & Mobile)** | ✅ Terpenuhi | Tailwind CSS Grid & Flexbox teruji rapi di berbagai ukuran layar |
| **Kode bersih & bukan copy-paste mentah** | ✅ Terpenuhi | Implementasi orisinal, modular, aman XSS, dan terdokumentasi |

---

## 🛠️ Cara Menjalankan Proyek

1. Buka folder `ifs24034-pabwe-p3` di teks editor (misalnya **Visual Studio Code**).
2. Buka file `index.html` langsung di peramban web (Google Chrome, Microsoft Edge, Mozilla Firefox) atau gunakan ekstensi **Live Server**.
3. Seluruh fitur dapat langsung diuji secara mandiri tanpa memerlukan dependensi server backend atau instalasi paket tambahan.

