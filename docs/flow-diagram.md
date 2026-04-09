# Sutandi MES - System Flow Diagram

```mermaid
flowchart TB
    subgraph AUTH["Authentication"]
        LOGIN["/login<br>Username + Password"]
        NEXTAUTH["NextAuth.js v5<br>(JWT Strategy)"]
        MIDDLEWARE["Middleware<br>Route Protection"]
        LOGIN --> NEXTAUTH --> MIDDLEWARE
    end

    subgraph ROLES["User Roles"]
        ADMIN["Admin"]
        SUPERVISOR["Supervisor"]
        OPERATOR["Operator"]
    end

    MIDDLEWARE --> DASHBOARD

    subgraph APP["Application"]
        DASHBOARD["/dashboard<br>KPIs & Overview"]

        subgraph MASTER["Master Data Management"]
            ITEMS["/master/items<br>Item Master"]
            UOM["/master/uom<br>Units of Measure"]
            WAREHOUSES["/master/warehouses<br>Warehouses & Locations"]
            UOM_CONV["UOM Conversions<br>(per Item)"]
            ITEMS --> UOM_CONV
        end

        subgraph TRANSACTIONS["Transaction Processing"]
            direction TB
            subgraph INBOUND_FLOW["Inbound Flow"]
                IN_NEW["/inbound/new<br>Create Receiving"]
                IN_DRAFT["Status: DRAFT"]
                IN_CONFIRM["Status: CONFIRMED"]
                QR_GEN["Generate QR Code<br>per Line Item"]
                IN_NEW --> IN_DRAFT
                IN_DRAFT --> QR_GEN
                IN_DRAFT --> IN_CONFIRM
            end

            subgraph OUTBOUND_FLOW["Outbound Flow"]
                OUT_NEW["/outbound/new<br>Create Issue"]
                OUT_DRAFT["Status: DRAFT"]
                OUT_CONFIRM["Status: CONFIRMED"]
                QR_SCAN["Scan QR Code<br>(Verification)"]
                OUT_NEW --> OUT_DRAFT
                OUT_DRAFT --> QR_SCAN
                OUT_DRAFT --> OUT_CONFIRM
            end

            subgraph PRODUCTION_FLOW["Production Order Flow"]
                PO_NEW["/production-orders/new<br>Create Order"]
                PO_DRAFT["Status: DRAFT"]
                PO_PROGRESS["Status: IN_PROGRESS"]
                PO_COMPLETE["Status: COMPLETED"]
                BOM_MAT["BOM Materials<br>(Inputs)"]
                BOM_OUT["BOM Outputs<br>(Products)"]
                PO_NEW --> PO_DRAFT
                PO_DRAFT --> PO_PROGRESS
                PO_PROGRESS --> PO_COMPLETE
                PO_DRAFT --- BOM_MAT
                PO_DRAFT --- BOM_OUT
            end
        end

        subgraph INVENTORY["Inventory Management"]
            STOCK["/inventory<br>Current Stock Levels"]
            MOVEMENTS["/inventory/movements<br>Stock Movement Audit Trail"]
        end

        subgraph IMPORT["Excel Import Utility"]
            UPLOAD["/import<br>Upload Excel File"]
            PARSE["Parse & Validate<br>(Client-side)"]
            PREVIEW["Preview Rows<br>+ Error Highlights"]
            EXECUTE["POST /api/import/execute<br>Process Import"]
            RESULT["Import Results<br>(Success/Error per Row)"]
            UPLOAD --> PARSE --> PREVIEW --> EXECUTE --> RESULT
        end
    end

    %% Data flow connections
    DASHBOARD --> MASTER
    DASHBOARD --> TRANSACTIONS
    DASHBOARD --> INVENTORY
    DASHBOARD --> IMPORT

    %% Inbound affects inventory
    IN_CONFIRM -->|"+ Stock<br>INBOUND Movement"| STOCK
    IN_CONFIRM -->|"Audit Trail"| MOVEMENTS

    %% Outbound affects inventory
    OUT_CONFIRM -->|"- Stock<br>OUTBOUND Movement"| STOCK
    OUT_CONFIRM -->|"Audit Trail"| MOVEMENTS

    %% Production links to outbound
    PO_PROGRESS -.->|"Material Issue"| OUT_NEW
    PO_COMPLETE -->|"PRODUCTION Movement"| STOCK

    %% Import targets
    EXECUTE -->|"Items"| ITEMS
    EXECUTE -->|"Warehouses"| WAREHOUSES
    EXECUTE -->|"UOM Conversions"| UOM_CONV
    EXECUTE -->|"Stock Adjustments"| STOCK
    EXECUTE -->|"BOMs"| PO_NEW

    %% Master data feeds transactions
    ITEMS -.->|"Item Lookup"| IN_NEW
    ITEMS -.->|"Item Lookup"| OUT_NEW
    ITEMS -.->|"Item Lookup"| PO_NEW
    UOM_CONV -.->|"Qty Conversion<br>to Base UOM"| IN_CONFIRM
    UOM_CONV -.->|"Qty Conversion<br>to Base UOM"| OUT_CONFIRM
    WAREHOUSES -.->|"Location Selection"| IN_NEW
    WAREHOUSES -.->|"Location Selection"| OUT_NEW

    subgraph DB["PostgreSQL Database (Prisma ORM)"]
        direction LR
        T_USER["User"]
        T_ITEM["Item"]
        T_UOM["Uom"]
        T_UOMCONV["UomConversion"]
        T_WH["Warehouse"]
        T_LOC["Location"]
        T_INBOUND["InboundTransaction<br>+ Items"]
        T_OUTBOUND["OutboundTransaction<br>+ Items"]
        T_PO["ProductionOrder<br>+ Materials + Outputs"]
        T_INV["Inventory"]
        T_MOVE["StockMovement"]
    end

    STOCK --> T_INV
    MOVEMENTS --> T_MOVE
    IN_CONFIRM --> T_INBOUND
    OUT_CONFIRM --> T_OUTBOUND
    PO_COMPLETE --> T_PO

    %% Transaction number generation
    subgraph TXNGEN["Auto-Generated IDs"]
        IN_NUM["IN-YYYYMMDD-###"]
        OUT_NUM["OUT-YYYYMMDD-###"]
        PO_NUM["PO-YYYYMMDD-###"]
    end

    IN_NEW -.-> IN_NUM
    OUT_NEW -.-> OUT_NUM
    PO_NEW -.-> PO_NUM

    %% Styling
    classDef auth fill:#fce4ec,stroke:#c62828,color:#000
    classDef master fill:#e3f2fd,stroke:#1565c0,color:#000
    classDef transaction fill:#fff3e0,stroke:#e65100,color:#000
    classDef inventory fill:#e8f5e9,stroke:#2e7d32,color:#000
    classDef import fill:#f3e5f5,stroke:#6a1b9a,color:#000
    classDef db fill:#eceff1,stroke:#37474f,color:#000
    classDef status fill:#fffde7,stroke:#f57f17,color:#000

    class LOGIN,NEXTAUTH,MIDDLEWARE auth
    class ITEMS,UOM,WAREHOUSES,UOM_CONV master
    class IN_NEW,OUT_NEW,PO_NEW,QR_GEN,QR_SCAN,BOM_MAT,BOM_OUT transaction
    class IN_DRAFT,OUT_DRAFT,PO_DRAFT,IN_CONFIRM,OUT_CONFIRM,PO_PROGRESS,PO_COMPLETE status
    class STOCK,MOVEMENTS inventory
    class UPLOAD,PARSE,PREVIEW,EXECUTE,RESULT import
    class T_USER,T_ITEM,T_UOM,T_UOMCONV,T_WH,T_LOC,T_INBOUND,T_OUTBOUND,T_PO,T_INV,T_MOVE db
```

## Flow Summary

### 1. Authentication Flow
- User logs in via `/login` with username and password
- NextAuth.js validates credentials against the database (bcrypt)
- JWT token issued with user ID, name, and role (ADMIN / SUPERVISOR / OPERATOR)
- Middleware protects all routes except `/login` and `/api/auth`

### 2. Master Data (Foundation)
- **Items**: Define raw materials, WIP, finished goods, packaging, consumables
- **UOM**: Define units of measure (kg, pcs, litre, etc.)
- **UOM Conversions**: Per-item conversion factors between units
- **Warehouses & Locations**: Physical storage zones

### 3. Inbound (Receiving)
1. Create inbound transaction with supplier info and line items
2. Auto-generates transaction number (`IN-YYYYMMDD-###`)
3. Each line item gets a QR code with encoded payload (item, batch, qty, UOM)
4. On confirmation: stock is **added** to inventory, stock movements are recorded

### 4. Outbound (Issuing)
1. Create outbound transaction with purpose and line items
2. Auto-generates transaction number (`OUT-YYYYMMDD-###`)
3. Can optionally link to a production order (material consumption)
4. QR scanning for verification
5. On confirmation: stock is **deducted** from inventory, stock movements are recorded

### 5. Production Orders
1. Define BOM (Bill of Materials) with input materials and output products
2. Auto-generates order number (`PO-YYYYMMDD-###`)
3. Flow: DRAFT -> IN_PROGRESS -> COMPLETED
4. Materials consumed via linked outbound transactions
5. Outputs recorded as production stock movements

### 6. Inventory
- **Stock Levels**: Real-time view of quantity per item + location + batch + UOM
- **Stock Movements**: Full audit trail of all changes (INBOUND, OUTBOUND, ADJUSTMENT, TRANSFER, PRODUCTION)

### 7. Excel Import
- Bulk import for: items, warehouses, UOM conversions, inventory adjustments, BOMs
- Flow: Upload -> Parse -> Preview/Validate -> Execute -> Results
- Templates available for download with instructions
