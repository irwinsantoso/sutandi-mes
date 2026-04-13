# Sutandi MES - User Activities Diagram

This diagram illustrates the day-to-day activities users perform in the system, with icons representing each action (scanning, inputting, viewing, etc.).

> **Note:** Mermaid renders FontAwesome icons via the `fa:` prefix. View this file in a Mermaid renderer with internet access (GitHub, VS Code Mermaid Preview, mermaid.live) for the icons to display.

---

## 1. User Activities Overview

```mermaid
flowchart TB
    subgraph ROLES["fa:fa-users  Who Uses the System"]
        ADMIN["fa:fa-user-shield  **Admin**<br/>Sets up master data<br/>Manages users"]
        SUPER["fa:fa-user-tie  **Supervisor**<br/>Approves transactions<br/>Reviews reports"]
        OP["fa:fa-user-hard-hat  **Operator**<br/>Scans & receives goods<br/>Issues materials"]
    end

    subgraph ACTIVITIES["fa:fa-tasks  Daily Activities"]
        LOGIN["fa:fa-sign-in-alt  **Login**<br/>Type username & password"]
        TYPE["fa:fa-keyboard  **Input Data**<br/>Fill forms for items,<br/>UOM, warehouses"]
        SCAN_IN["fa:fa-qrcode  **Receive Inbound**<br/>Enter received goods, print bin labels"]
        SCAN_OUT["fa:fa-barcode  **Scan Outbound**<br/>Scan bin QR, enter qty (partial ok)"]
        APPROVE["fa:fa-check-circle  **Confirm**<br/>Approve transactions"]
        VIEW["fa:fa-chart-bar  **View Reports**<br/>Stock levels & movements"]
        PRINT["fa:fa-print  **Print Labels**<br/>Generate QR labels"]
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

## 2. Operator's Daily Journey (Scanning Workflow)

```mermaid
flowchart LR
    A["fa:fa-mobile-alt<br/>**Open App**<br/>on tablet/phone"] --> B["fa:fa-sign-in-alt<br/>**Login**<br/>enter credentials"]
    B --> C["fa:fa-truck-loading<br/>**Goods Arrive**<br/>at warehouse"]
    C --> D["fa:fa-keyboard<br/>**Enter Received**<br/>item, qty, location, batch"]
    D --> E["fa:fa-print<br/>**Print Bin Label**<br/>stick on shelf/bin"]
    E --> F["fa:fa-check<br/>**Confirm Inbound**<br/>stock goes UP"]

    F --> G["fa:fa-clipboard-list<br/>**Pick Production Order**<br/>from list"]
    G --> H["fa:fa-qrcode<br/>**Scan Bin QR**<br/>auto-fill item/loc/batch, enter qty"]
    H --> I["fa:fa-minus-circle<br/>**Issue Material**<br/>stock goes DOWN"]
    I --> J["fa:fa-check-double<br/>**Mark Complete**"]

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

## 3. Admin's Setup Activities (Data Entry)

```mermaid
flowchart TB
    START(["fa:fa-user-shield  Admin logs in"]) --> SETUP

    subgraph SETUP["fa:fa-cogs  Master Data Setup"]
        direction LR
        ITEM["fa:fa-keyboard<br/>**Type Item Details**<br/>code, name, category"]
        UOM["fa:fa-balance-scale<br/>**Define UOM**<br/>pcs, kg, pack..."]
        WH["fa:fa-warehouse<br/>**Add Warehouses**<br/>& locations"]
    end

    SETUP --> INBOUND["fa:fa-truck-loading<br/>**Receive Inbound**<br/>adds stock to bins"]
    INBOUND --> PRINT["fa:fa-print<br/>**Print Bin Labels**<br/>from Inventory page"]
    PRINT --> STICK["fa:fa-tag<br/>**Stick Labels**<br/>on bins/shelves (reusable)"]
    STICK --> READY(["fa:fa-flag-checkered  Ready for Operators<br/>to scan"])

    classDef admin fill:#ede9fe,stroke:#7c3aed,color:#000,stroke-width:2px
    classDef action fill:#fef3c7,stroke:#d97706,color:#000
    classDef physical fill:#fee2e2,stroke:#dc2626,color:#000

    class START,READY admin
    class ITEM,UOM,WH,INBOUND,PRINT action
    class STICK physical
```

---

## 4. Supervisor's Review Activities

```mermaid
flowchart LR
    LOGIN["fa:fa-user-tie<br/>**Supervisor**<br/>logs in"] --> DASH["fa:fa-tachometer-alt<br/>**Open Dashboard**<br/>see KPIs"]

    DASH --> REVIEW["fa:fa-search<br/>**Review Pending**<br/>transactions"]
    REVIEW --> DECIDE{"fa:fa-question-circle<br/>**Looks OK?**"}
    DECIDE -->|"fa:fa-check Yes"| CONFIRM["fa:fa-check-circle<br/>**Confirm**<br/>commit to stock"]
    DECIDE -->|"fa:fa-times No"| CANCEL["fa:fa-ban<br/>**Cancel**<br/>or send back"]

    CONFIRM --> REPORT["fa:fa-chart-line<br/>**View Reports**<br/>stock & movements"]
    CANCEL --> REPORT

    REPORT --> EXPORT["fa:fa-file-excel<br/>**Export**<br/>to Excel/CSV"]

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

## 5. The Big Picture - All Users Together

```mermaid
flowchart TB
    subgraph PHYSICAL["fa:fa-industry  Physical Warehouse"]
        TRUCK["fa:fa-truck<br/>Goods arrive"]
        BOX["fa:fa-boxes<br/>Items on shelves"]
        FACTORY["fa:fa-cogs<br/>Production line"]
    end

    subgraph DIGITAL["fa:fa-laptop  Sutandi MES Software"]
        APP["fa:fa-desktop  **App Interface**"]
    end

    ADMIN2["fa:fa-user-shield<br/>**Admin**"] -->|"fa:fa-keyboard types data"| APP
    OP2["fa:fa-user-hard-hat<br/>**Operator**"] -->|"fa:fa-qrcode scans QR"| APP
    SUP2["fa:fa-user-tie<br/>**Supervisor**"] -->|"fa:fa-eye reviews"| APP

    TRUCK -.->|"unloaded by"| OP2
    OP2 -.->|"scans items into"| BOX
    BOX -.->|"feeds"| FACTORY

    APP -->|"fa:fa-database  updates"| STOCK["fa:fa-warehouse<br/>**Live Stock Records**"]

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

## Legend

| Icon | Activity |
|------|----------|
| fa:fa-keyboard | Typing / inputting data into forms |
| fa:fa-qrcode / fa:fa-barcode | Scanning QR or barcode with camera |
| fa:fa-check-circle | Confirming / approving a transaction |
| fa:fa-chart-bar | Viewing reports & dashboards |
| fa:fa-print | Printing QR labels |
| fa:fa-user-shield | Admin role |
| fa:fa-user-tie | Supervisor role |
| fa:fa-user-hard-hat | Operator role (warehouse floor) |
