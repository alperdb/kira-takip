export type TemplateData = Record<string, string | number>;

export function fillTemplate(template: string, data: TemplateData): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in data ? String(data[key]) : match;
  });
}

// ─── App data types (minimal, matches Prisma shape) ──────────
export interface ContractBindingInput {
  tenant: {
    name: string;
    phone?: string | null;
    nationalId?: string | null;
    address?: string | null;
  };
  property: {
    title: string;
    address?: string | null;
    city?: string | null;
    owner?: {
      name: string;
      phone?: string | null;
      nationalId?: string | null;
      address?: string | null;
    } | null;
  };
  contract: {
    startDate: Date | string;
    endDate?: Date | string | null;
    rentAmount: number;
    currentRent?: number | null;
    currency?: string;
    paymentDay: number;
    depositAmount?: number;
    unitNo?: string;
    bankName?: string | null;
    iban?: string | null;
    accountHolder?: string | null;
  };
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtAmount(n: number, currency = 'TRY'): string {
  return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 0 }).format(n)
    + (currency === 'TRY' ? ' TL' : ` ${currency}`);
}

export function bindContractData(input: ContractBindingInput): TemplateData {
  const { tenant, property, contract } = input;
  const owner = property.owner;
  const rent  = contract.currentRent ?? contract.rentAmount;

  return {
    // Landlord
    landlordName:    owner?.name    ?? '',
    landlordTC:      owner?.nationalId ?? '',
    landlordAddress: owner?.address  ?? '',
    landlordPhone:   owner?.phone    ?? '',

    // Tenant
    tenantName:        tenant.name,
    tenantTC:          tenant.nationalId  ?? '',
    tenantCompany:     '',
    tenantWorkAddress: '',
    tenantAddress:     tenant.address     ?? '',
    tenantWorkPhone:   tenant.phone       ?? '',
    tenantHomeAddress: tenant.address     ?? '',

    // Property
    propertyAddress: [property.address, property.city].filter(Boolean).join(', '),

    // Contract
    contractStartDate:  fmtDate(contract.startDate),
    contractEndDate:    fmtDate(contract.endDate),
    rentAmount:         fmtAmount(rent, contract.currency),
    depositAmount:      fmtAmount(contract.depositAmount ?? 0, contract.currency),
    paymentDay:         String(contract.paymentDay),
    rentIncreaseDate:   '',

    // Bank
    bankName:      contract.bankName      ?? '',
    iban:          contract.iban          ?? '',
    accountHolder: contract.accountHolder ?? '',

    // Court
    courtCity: property.city ?? '',
  };
}
