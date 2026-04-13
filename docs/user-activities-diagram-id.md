# Sutandi MES - Diagram Aktivitas Pengguna

Diagram ini menggambarkan aktivitas harian yang dilakukan pengguna di dalam sistem, lengkap dengan ikon yang mewakili setiap tindakan (memindai, menginput, melihat, dll).

> **Catatan:** Mermaid menampilkan ikon FontAwesome melalui awalan `fa:`. Buka file ini di penampil Mermaid yang memiliki akses internet (GitHub, VS Code Mermaid Preview, mermaid.live) agar ikon dapat ditampilkan.

---

## 1. Gambaran Umum Aktivitas Pengguna

```mermaid
flowchart TB
    subgraph ROLES["fa:fa-users  Siapa yang Menggunakan Sistem"]
        ADMIN["fa:fa-user-shield  **Admin**<br/>Mengatur master data<br/>Mengelola pengguna"]
        SUPER["fa:fa-user-tie  **Supervisor**<br/>Menyetujui transaksi<br/>Meninjau laporan"]
        OP["fa:fa-user-hard-hat  **Operator**<br/>Memindai & menerima barang<br/>Mengeluarkan material"]
    end

    subgraph ACTIVITIES["fa:fa-tasks  Aktivitas Harian"]
        LOGIN["fa:fa-sign-in-alt  **Login**<br/>Ketik username & password"]
        TYPE["fa:fa-keyboard  **Input Data**<br/>Isi formulir untuk item,<br/>UOM, gudang"]
        SCAN_IN["fa:fa-qrcode  **Terima Inbound**<br/>Input barang masuk, cetak label bin"]
        SCAN_OUT["fa:fa-barcode  **Scan Outbound**<br/>Pindai QR bin, input qty (parsial ok)"]
        APPROVE["fa:fa-check-circle  **Konfirmasi**<br/>Setujui transaksi"]
        VIEW["fa:fa-chart-bar  **Lihat Laporan**<br/>Stok & pergerakan barang"]
        PRINT["fa:fa-print  **Cetak Label**<br/>Buat label QR"]
    end

    ADMIN --> LOGIN
    SUPER --> LOGIN
    OP --> LOGIN

    LOGIN --> TYPE
    LOGIN --> SCAN_IN
    LOGIN --> SCAN_OUT
    LOGIN --> APPROVE
    LOGIN --> VIEW
    LOGIN --> PRINT

    ADMIN -.-> TYPE
    OP -.-> SCAN_IN
    OP -.-> SCAN_OUT
    SUPER -.-> APPROVE
    SUPER -.-> VIEW
    ADMIN -.-> PRINT

    classDef role fill:#e0f2fe,stroke:#0284c7,color:#000,stroke-width:2px
    classDef act fill:#fef3c7,stroke:#d97706,color:#000,stroke-width:2px
    class ADMIN,SUPER,OP role
    class LOGIN,TYPE,SCAN_IN,SCAN_OUT,APPROVE,VIEW,PRINT act
```

---

## 2. Alur Harian Operator (Workflow Pemindaian)

```mermaid
flowchart LR
    A["fa:fa-mobile-alt<br/>**Buka Aplikasi**<br/>di tablet/HP"] --> B["fa:fa-sign-in-alt<br/>**Login**<br/>masukkan kredensial"]
    B --> C["fa:fa-truck-loading<br/>**Barang Tiba**<br/>di gudang"]
    C --> D["fa:fa-keyboard<br/>**Input Penerimaan**<br/>item, qty, lokasi, batch"]
    D --> E["fa:fa-print<br/>**Cetak Label Bin**<br/>tempel di rak/bin"]
    E --> F["fa:fa-check<br/>**Konfirmasi Inbound**<br/>stok BERTAMBAH"]

    F --> G["fa:fa-clipboard-list<br/>**Pilih Production Order**<br/>dari daftar"]
    G --> H["fa:fa-qrcode<br/>**Pindai QR Bin**<br/>auto-isi item/lokasi/batch, input qty"]
    H --> I["fa:fa-minus-circle<br/>**Keluarkan Material**<br/>stok BERKURANG"]
    I --> J["fa:fa-check-double<br/>**Tandai Selesai**"]

    classDef start fill:#dbeafe,stroke:#2563eb,color:#000
    classDef scan fill:#fed7aa,stroke:#ea580c,color:#000,stroke-width:2px
    classDef input fill:#fef9c3,stroke:#ca8a04,color:#000
    classDef done fill:#d1fae5,stroke:#059669,color:#000

    class A,B,C start
    class H scan
    class D,G input
    class E,F,I,J done
```

---

## 3. Aktivitas Setup Admin (Input Data)

```mermaid
flowchart TB
    START(["fa:fa-user-shield  Admin login"]) --> SETUP

    subgraph SETUP["fa:fa-cogs  Setup Master Data"]
        direction LR
        ITEM["fa:fa-keyboard<br/>**Ketik Detail Item**<br/>kode, nama, kategori"]
        UOM["fa:fa-balance-scale<br/>**Tentukan UOM**<br/>pcs, kg, pack..."]
        WH["fa:fa-warehouse<br/>**Tambah Gudang**<br/>& lokasi"]
    end

    SETUP --> INBOUND["fa:fa-truck-loading<br/>**Terima Inbound**<br/>tambah stok ke bin"]
    INBOUND --> PRINT["fa:fa-print<br/>**Cetak Label Bin**<br/>dari halaman Inventory"]
    PRINT --> STICK["fa:fa-tag<br/>**Tempel Label**<br/>pada bin/rak (reusable)"]
    STICK --> READY(["fa:fa-flag-checkered  Siap untuk Operator<br/>memindai"])

    classDef admin fill:#ede9fe,stroke:#7c3aed,color:#000,stroke-width:2px
    classDef action fill:#fef3c7,stroke:#d97706,color:#000
    classDef physical fill:#fee2e2,stroke:#dc2626,color:#000

    class START,READY admin
    class ITEM,UOM,WH,INBOUND,PRINT action
    class STICK physical
```

---

## 4. Aktivitas Tinjauan Supervisor

```mermaid
flowchart LR
    LOGIN["fa:fa-user-tie<br/>**Supervisor**<br/>login"] --> DASH["fa:fa-tachometer-alt<br/>**Buka Dashboard**<br/>lihat KPI"]

    DASH --> REVIEW["fa:fa-search<br/>**Tinjau Transaksi**<br/>yang tertunda"]
    REVIEW --> DECIDE{"fa:fa-question-circle<br/>**Sudah Benar?**"}
    DECIDE -->|"fa:fa-check Ya"| CONFIRM["fa:fa-check-circle<br/>**Konfirmasi**<br/>commit ke stok"]
    DECIDE -->|"fa:fa-times Tidak"| CANCEL["fa:fa-ban<br/>**Batalkan**<br/>atau kembalikan"]

    CONFIRM --> REPORT["fa:fa-chart-line<br/>**Lihat Laporan**<br/>stok & pergerakan"]
    CANCEL --> REPORT

    REPORT --> EXPORT["fa:fa-file-excel<br/>**Ekspor**<br/>ke Excel/CSV"]

    classDef sup fill:#dbeafe,stroke:#2563eb,color:#000,stroke-width:2px
    classDef ok fill:#d1fae5,stroke:#059669,color:#000
    classDef bad fill:#fee2e2,stroke:#dc2626,color:#000
    classDef report fill:#fef3c7,stroke:#d97706,color:#000

    class LOGIN,DASH sup
    class CONFIRM,REPORT,EXPORT ok
    class CANCEL bad
    class REVIEW,DECIDE report
```

---

## 5. Gambaran Besar - Semua Pengguna Bersama

```mermaid
flowchart TB
    subgraph PHYSICAL["fa:fa-industry  Gudang Fisik"]
        TRUCK["fa:fa-truck<br/>Barang tiba"]
        BOX["fa:fa-boxes<br/>Item di rak"]
        FACTORY["fa:fa-cogs<br/>Lini produksi"]
    end

    subgraph DIGITAL["fa:fa-laptop  Software Sutandi MES"]
        APP["fa:fa-desktop  **Antarmuka Aplikasi**"]
    end

    ADMIN2["fa:fa-user-shield<br/>**Admin**"] -->|"fa:fa-keyboard mengetik data"| APP
    OP2["fa:fa-user-hard-hat<br/>**Operator**"] -->|"fa:fa-qrcode memindai QR"| APP
    SUP2["fa:fa-user-tie<br/>**Supervisor**"] -->|"fa:fa-eye meninjau"| APP

    TRUCK -.->|"diturunkan oleh"| OP2
    OP2 -.->|"memindai item ke"| BOX
    BOX -.->|"memasok"| FACTORY

    APP -->|"fa:fa-database  memperbarui"| STOCK["fa:fa-warehouse<br/>**Catatan Stok Real-time**"]

    classDef person fill:#e0f2fe,stroke:#0284c7,color:#000,stroke-width:2px
    classDef phys fill:#fee2e2,stroke:#dc2626,color:#000
    classDef sw fill:#ede9fe,stroke:#7c3aed,color:#000,stroke-width:2px
    classDef data fill:#d1fae5,stroke:#059669,color:#000,stroke-width:2px

    class ADMIN2,OP2,SUP2 person
    class TRUCK,BOX,FACTORY phys
    class APP sw
    class STOCK data
```

---

## Keterangan

| Ikon | Aktivitas |
|------|-----------|
| fa:fa-keyboard | Mengetik / menginput data ke formulir |
| fa:fa-qrcode / fa:fa-barcode | Memindai QR atau barcode dengan kamera |
| fa:fa-check-circle | Mengonfirmasi / menyetujui transaksi |
| fa:fa-chart-bar | Melihat laporan & dashboard |
| fa:fa-print | Mencetak label QR |
| fa:fa-user-shield | Peran Admin |
| fa:fa-user-tie | Peran Supervisor |
| fa:fa-user-hard-hat | Peran Operator (lantai gudang) |
