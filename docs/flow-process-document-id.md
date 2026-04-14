# Sutandi MES - Dokumen Alur Proses

## 1. Login

Pengguna mengakses sistem dengan memasukkan **username** dan **password**. Sistem mendukung tiga peran: **Admin**, **Supervisor**, dan **Operator**.

![Halaman Login](screenshots/01-login.png)

Setelah login berhasil, pengguna diarahkan ke **Dashboard**.

---

## 2. Dashboard

Dashboard memberikan ringkasan cepat sistem dengan metrik utama:

- **Total Item** - Jumlah item terdaftar di master data
- **Inbound Tertunda** - Transaksi yang menunggu konfirmasi penerimaan
- **Production Order Aktif** - Order yang sedang berjalan
- **Item Stok Rendah** - Item di bawah batas minimum

Sidebar di sebelah kiri menyediakan navigasi ke seluruh modul.

![Dashboard](screenshots/02-dashboard.png)

---

## 3. Setup Master Data

Sebelum memproses transaksi apa pun, master data harus dikonfigurasi terlebih dahulu. Ini adalah fondasi sistem.

### 3.1 Item

Mengelola katalog item. Setiap item memiliki **kode**, **nama**, **kategori** (Raw Material, Finished Good, WIP, Packaging, Consumable), dan **satuan dasar (UOM)**.

![Master Item](screenshots/03-master-items.png)

### 3.2 UOM (Satuan Ukur)

Mendefinisikan satuan seperti Piece (pcs), Pack, Bundle, Kilogram (kg), dll. Konversi UOM dapat dikonfigurasi per item (contoh: 1 pack = 12 pcs).

### 3.3 Gudang & Lokasi

Mendefinisikan gudang fisik dan lokasi penyimpanannya (zona/bin). Setiap pergerakan inventory dilacak hingga tingkat lokasi.

---

## 4. Transaksi Inbound (Penerimaan)

Transaksi inbound mencatat barang yang **diterima** ke dalam gudang.

### Alur Proses:

1. Klik **"+ New Inbound"** untuk membuat transaksi penerimaan baru
2. Masukkan informasi supplier, nomor referensi, dan tanggal penerimaan
3. Tambahkan baris item: pilih item, jumlah, UOM, lokasi penyimpanan, dan nomor batch/lot
4. Simpan sebagai **DRAFT**
5. Tinjau kembali lalu klik **Confirm** untuk finalisasi
6. Setelah dikonfirmasi, stok **bertambah** di inventory dan catatan pergerakan stok dibuat
7. Cetak **Label Bin** dari halaman Inventory untuk barang fisik (satu QR per item + lokasi + batch + UOM)

### Alur Status:
- **DRAFT** - Transaksi dibuat, masih dapat diedit
- **CONFIRMED** - Difinalisasi, stok terupdate (tidak dapat diedit)
- **CANCELLED** - Transaksi dibatalkan

![Transaksi Inbound](screenshots/04-inbound.png)

---

## 5. Transaksi Outbound (Pengeluaran)

Transaksi outbound mencatat barang yang **dikeluarkan** dari gudang.

### Alur Proses:

1. Klik **"+ New Outbound"** untuk membuat transaksi pengeluaran baru
2. Opsional: tautkan ke **Production Order** (untuk konsumsi material)
3. Masukkan tujuan, tanggal pengeluaran, dan baris item
4. **Pindai QR bin** untuk auto-isi item, lokasi, batch, dan UOM — atau pilih manual
5. Masukkan jumlah yang diambil (dapat parsial; label yang sama tetap valid untuk stok yang tersisa)
6. Simpan sebagai **DRAFT**, lalu **Confirm** untuk finalisasi
7. Setelah dikonfirmasi, stok **berkurang** dari inventory dan catatan pergerakan stok dibuat

### Alur Status:
- Sama dengan Inbound: **DRAFT** -> **CONFIRMED** atau **CANCELLED**

![Transaksi Outbound](screenshots/05-outbound.png)

---

## 6. Production Order

Production order mendefinisikan **Bill of Materials (BOM)** -- material apa yang masuk dan produk apa yang keluar.

### Alur Proses:

1. Klik **"+ New Order"** untuk membuat production order
2. Pilih tipe order: **WIP** (Work in Progress) atau **Finished Good**
3. Definisikan **Material** (input) dengan jumlah yang dibutuhkan
4. Definisikan **Output** (produk) dengan jumlah target
5. Tetapkan tanggal mulai/selesai yang direncanakan
6. Progresi status: **DRAFT** -> **IN_PROGRESS** -> **COMPLETED**
7. Material dikonsumsi melalui **Transaksi Outbound** yang tertaut
8. Output dicatat saat penyelesaian

![Production Order](screenshots/06-production-orders.png)

---

## 7. Inventory

### 7.1 Level Stok

Menampilkan jumlah stok real-time di seluruh lokasi. Tabel menunjukkan:

- **Kode & Nama Item**
- **Kategori** (Raw Material, Finished Good, dll.)
- **Lokasi** (Gudang / Zona)
- **Nomor Batch/Lot**
- **On Hand** (jumlah di tangan)
- **Reserved** (dialokasikan untuk produksi — klik untuk melihat order mana yang memegang)
- **Available** (On Hand - Reserved)
- **Label** — cetak label QR bin. Meng-encode item + lokasi + batch + UOM sehingga stiker yang sama tetap valid meski pengambilan parsial

![Level Stok](screenshots/07-inventory.png)

### 7.2 Pergerakan Stok

**Audit trail** lengkap untuk semua perubahan inventory. Setiap perubahan stok dicatat dengan:

- **Tanggal/Waktu** pergerakan
- **Tipe**: INBOUND, OUTBOUND, ADJUSTMENT, TRANSFER, atau PRODUCTION
- **Item** yang terpengaruh
- **Lokasi** yang terlibat
- **Jumlah** perubahan (+ untuk penambahan, - untuk pengurangan)
- **Nomor Referensi** transaksi untuk ketertelusuran

![Pergerakan Stok](screenshots/08-stock-movements.png)

---

## 8. Import Data (Excel)

Import data secara massal ke sistem menggunakan file Excel. Mendukung import:

- **Items** - Master data item
- **Warehouses** - Gudang dan lokasi penyimpanan
- **UOM Conversions** - Faktor konversi satuan
- **Inventory** - Penyesuaian level stok
- **BOM** - Bill of Materials (membuat Production Order)

### Alur Proses:

1. Pilih **Tipe Import**
2. Unduh **template Excel** (sudah mencakup instruksi)
3. Isi template dengan data Anda
4. Upload file yang sudah diisi
5. **Preview** data dan tinjau error validasi (jika ada)
6. Klik **Import** untuk memproses
7. Tinjau ringkasan hasil (jumlah sukses/error per baris)

![Import Data](screenshots/09-import.png)

---

## Ringkasan Alur Sistem Keseluruhan

```
Setup Master Data          Transaksi                 Inventory
==================    ======================    ==================

  Items ──────────>   Inbound (Penerimaan) ──>   + Stok Ditambah
  UOM   ──────────>     └── Confirm              │
  Gudang ─────────>                               │
                                                  ├── Level Stok
                      Outbound (Pengeluaran) ─>  │  (Real-time)
                        ├── Pindai QR Bin        │    └── Cetak Label Bin
                        ├── (parsial ok)         │
                        └── Confirm         ──>  - Stok Dikurangi
                                                  │
                      Production Order            ├── Pergerakan Stok
                        ├── Definisikan BOM       │  (Audit Trail)
                        ├── Material ──────────>  │
                        └── Output ────────────>  │

  Import Excel ──────────────────────────────>   Muat Data Massal
```

---

## Peran Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **Admin** | Akses penuh ke seluruh modul termasuk master data dan manajemen pengguna |
| **Supervisor** | Dapat membuat dan mengkonfirmasi transaksi, melihat semua laporan |
| **Operator** | Dapat membuat transaksi draft, akses terbatas |
