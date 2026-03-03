-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('apartment', 'villa', 'commercial', 'mixed');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('residential', 'commercial', 'parking', 'storage');

-- CreateEnum
CREATE TYPE "UnitStatus" AS ENUM ('vacant', 'occupied', 'maintenance');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('TRY', 'USD', 'EUR');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('held', 'returned', 'partial_returned', 'applied_to_debt', 'forfeited');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('active', 'terminated', 'expired', 'pending');

-- CreateEnum
CREATE TYPE "IncreaseReason" AS ENUM ('annual', 'cpi', 'manual', 'renewal');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('pending', 'partial', 'paid', 'overdue', 'waived');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank', 'eft', 'check', 'other');

-- CreateEnum
CREATE TYPE "DepositTransactionType" AS ENUM ('collected', 'refunded', 'partial_refund', 'applied_to_debt', 'forfeited');

-- CreateTable
CREATE TABLE "owners" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "national_id" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "owners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "properties" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "district" TEXT,
    "type" "PropertyType" NOT NULL DEFAULT 'apartment',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "properties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER NOT NULL,
    "unit_no" TEXT NOT NULL,
    "floor" INTEGER,
    "type" "UnitType" NOT NULL DEFAULT 'residential',
    "gross_sqm" DECIMAL(8,2),
    "net_sqm" DECIMAL(8,2),
    "status" "UnitStatus" NOT NULL DEFAULT 'vacant',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenants" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "national_id" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" SERIAL NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "rent_amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'TRY',
    "payment_day" INTEGER NOT NULL DEFAULT 1,
    "deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_status" "DepositStatus" NOT NULL DEFAULT 'held',
    "deposit_date" DATE,
    "status" "ContractStatus" NOT NULL DEFAULT 'active',
    "termination_date" DATE,
    "termination_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_increases" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "effective_date" DATE NOT NULL,
    "old_amount" DECIMAL(12,2) NOT NULL,
    "new_amount" DECIMAL(12,2) NOT NULL,
    "reason" "IncreaseReason" NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contract_increases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rent_charges" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "tenant_id" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "charge_amount" DECIMAL(12,2) NOT NULL,
    "paid_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rent_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "rent_charge_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'cash',
    "reference_no" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_transactions" (
    "id" SERIAL NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "type" "DepositTransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "property_id" INTEGER,
    "unit_id" INTEGER,
    "category" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rent_charges_contract_id_period_start_key" ON "rent_charges"("contract_id", "period_start");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "owners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_increases" ADD CONSTRAINT "contract_increases_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rent_charges" ADD CONSTRAINT "rent_charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rent_charge_id_fkey" FOREIGN KEY ("rent_charge_id") REFERENCES "rent_charges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_transactions" ADD CONSTRAINT "deposit_transactions_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
