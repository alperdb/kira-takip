PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "owners" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "name"        TEXT    NOT NULL,
  "phone"       TEXT,
  "email"       TEXT,
  "national_id" TEXT,
  "address"     TEXT,
  "notes"       TEXT,
  "created_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "properties" (
  "id"         INTEGER PRIMARY KEY AUTOINCREMENT,
  "owner_id"   INTEGER NOT NULL,
  "title"      TEXT    NOT NULL,
  "address"    TEXT,
  "city"       TEXT,
  "district"   TEXT,
  "type"       TEXT    NOT NULL DEFAULT 'apartment',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("owner_id") REFERENCES "owners"("id")
);

CREATE TABLE IF NOT EXISTS "units" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "property_id" INTEGER NOT NULL,
  "unit_no"     TEXT    NOT NULL,
  "floor"       INTEGER,
  "type"        TEXT    NOT NULL DEFAULT 'residential',
  "gross_sqm"   REAL,
  "net_sqm"     REAL,
  "status"      TEXT    NOT NULL DEFAULT 'vacant',
  "created_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("property_id") REFERENCES "properties"("id")
);

CREATE TABLE IF NOT EXISTS "tenants" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "name"        TEXT    NOT NULL,
  "phone"       TEXT,
  "email"       TEXT,
  "national_id" TEXT,
  "address"     TEXT,
  "notes"       TEXT,
  "created_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "contracts" (
  "id"                 INTEGER PRIMARY KEY AUTOINCREMENT,
  "unit_id"            INTEGER NOT NULL,
  "tenant_id"          INTEGER NOT NULL,
  "start_date"         TEXT    NOT NULL,
  "end_date"           TEXT,
  "rent_amount"        REAL    NOT NULL,
  "currency"           TEXT    NOT NULL DEFAULT 'TRY',
  "payment_day"        INTEGER NOT NULL DEFAULT 1,
  "deposit_amount"     REAL    NOT NULL DEFAULT 0,
  "deposit_status"     TEXT    NOT NULL DEFAULT 'held',
  "deposit_date"       TEXT,
  "status"             TEXT    NOT NULL DEFAULT 'active',
  "termination_date"   TEXT,
  "termination_reason" TEXT,
  "created_at"         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("unit_id")    REFERENCES "units"("id"),
  FOREIGN KEY ("tenant_id")  REFERENCES "tenants"("id")
);

CREATE TABLE IF NOT EXISTS "contract_increases" (
  "id"             INTEGER PRIMARY KEY AUTOINCREMENT,
  "contract_id"    INTEGER NOT NULL,
  "effective_date" TEXT    NOT NULL,
  "old_amount"     REAL    NOT NULL,
  "new_amount"     REAL    NOT NULL,
  "reason"         TEXT    NOT NULL,
  "notes"          TEXT,
  "created_at"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
);

CREATE TABLE IF NOT EXISTS "rent_charges" (
  "id"            INTEGER PRIMARY KEY AUTOINCREMENT,
  "contract_id"   INTEGER NOT NULL,
  "unit_id"       INTEGER NOT NULL,
  "tenant_id"     INTEGER NOT NULL,
  "due_date"      TEXT    NOT NULL,
  "charge_amount" REAL    NOT NULL,
  "paid_amount"   REAL    NOT NULL DEFAULT 0,
  "period_start"  TEXT    NOT NULL,
  "period_end"    TEXT    NOT NULL,
  "status"        TEXT    NOT NULL DEFAULT 'pending',
  "notes"         TEXT,
  "created_at"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id"),
  FOREIGN KEY ("unit_id")     REFERENCES "units"("id"),
  FOREIGN KEY ("tenant_id")   REFERENCES "tenants"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "rent_charges_contract_id_period_start_key"
  ON "rent_charges"("contract_id", "period_start");

CREATE TABLE IF NOT EXISTS "payments" (
  "id"             INTEGER PRIMARY KEY AUTOINCREMENT,
  "rent_charge_id" INTEGER NOT NULL,
  "amount"         REAL    NOT NULL,
  "paid_at"        DATETIME NOT NULL,
  "method"         TEXT    NOT NULL DEFAULT 'cash',
  "reference_no"   TEXT,
  "notes"          TEXT,
  "created_at"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("rent_charge_id") REFERENCES "rent_charges"("id")
);

CREATE TABLE IF NOT EXISTS "deposit_transactions" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "contract_id" INTEGER NOT NULL,
  "type"        TEXT    NOT NULL,
  "amount"      REAL    NOT NULL,
  "date"        TEXT    NOT NULL,
  "notes"       TEXT,
  "created_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
);

CREATE TABLE IF NOT EXISTS "expenses" (
  "id"          INTEGER PRIMARY KEY AUTOINCREMENT,
  "property_id" INTEGER,
  "unit_id"     INTEGER,
  "category"    TEXT,
  "amount"      REAL    NOT NULL,
  "date"        TEXT    NOT NULL,
  "description" TEXT,
  "created_at"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("property_id") REFERENCES "properties"("id")
);
