// Seed script — sıfırdan test verisi oluşturur
// Çalıştır: node scripts/seed.mjs

const BASE = 'http://localhost:3001';
const COOKIE_FILE = process.env.COOKIE || 'kira_session';

// Cookie'yi oku (önceki login'den)
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': COOKIE,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// Cookie al
const loginRes = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
});
const setCookie = loginRes.headers.get('set-cookie') || '';
const COOKIE = setCookie.split(';')[0];
console.log('Login:', (await loginRes.json()).ok ? 'OK' : 'FAIL');

// ── 1. Mevcut veriyi temizle ───────────────────────────────

// Giderleri sil
const expenses = await api('GET', '/api/expenses');
if (Array.isArray(expenses)) {
  for (const e of expenses) {
    await api('DELETE', `/api/expenses/${e.id}`);
  }
  console.log(`${expenses.length} gider silindi`);
}

// Sözleşmeleri feshederek sil (charge'lar cascade silinir)
const contracts = await api('GET', '/api/contracts');
const contractList = Array.isArray(contracts) ? contracts : (contracts.contracts || []);
for (const c of contractList) {
  await api('POST', `/api/contracts/${c.id}/terminate`, {
    reason: 'Seed reset', terminationDate: new Date().toISOString().slice(0, 10),
  });
  await api('DELETE', `/api/contracts/${c.id}`);
}
console.log(`${contractList.length} sözleşme silindi`);

// Kiracıları sil
const tenants = await api('GET', '/api/tenants');
const tenantList = Array.isArray(tenants) ? tenants : (tenants.tenants || []);
for (const t of tenantList) {
  await api('DELETE', `/api/tenants/${t.id}`);
}
console.log(`${tenantList.length} kiracı silindi`);

// Daireleri sil
const units = await api('GET', '/api/units');
const unitList = Array.isArray(units) ? units : (units.units || []);
for (const u of unitList) {
  await api('DELETE', `/api/units/${u.id}`);
}
console.log(`${unitList.length} daire silindi`);

// Binaları sil
const props = await api('GET', '/api/properties');
const propList = Array.isArray(props) ? props : (props.properties || []);
for (const p of propList) {
  await api('DELETE', `/api/properties/${p.id}`);
}
console.log(`${propList.length} bina silindi`);

// Sahipleri sil
const owners = await api('GET', '/api/owners');
const ownerList = Array.isArray(owners) ? owners : (owners.owners || []);
for (const o of ownerList) {
  await api('DELETE', `/api/owners/${o.id}`);
}
console.log(`${ownerList.length} mülk sahibi silindi`);

console.log('\n── Veri temizlendi, oluşturuluyor...\n');

// ── 2. Mülk sahipleri ──────────────────────────────────────
const ownerData = [
  { name: 'Ahmet Yılmaz',  phone: '0 (520) 444 11 22', email: 'ahmet.yilmaz@ornek.com',  nationalId: '12345678901' },
  { name: 'Fatma Kaya',    phone: '0 (520) 444 33 44', email: 'fatma.kaya@ornek.com',    nationalId: '98765432109' },
  { name: 'Mehmet Demir',  phone: '0 (520) 444 55 66', email: 'mehmet.demir@ornek.com',  nationalId: '11223344556' },
];
const createdOwners = [];
for (const o of ownerData) {
  const r = await api('POST', '/api/owners', o);
  createdOwners.push(r);
  console.log('Sahip:', r.name, '→ id:', r.id);
}

// ── 3. Binalar ─────────────────────────────────────────────
const propertyData = [
  { title: 'Bağcılar Rezidans',   address: 'Bağcılar Mah. Atatürk Cad. No:12, İstanbul',          ownerId: createdOwners[0].id, floors: 6 },
  { title: 'Kadıköy Apartmanı',   address: 'Moda Cad. No:45, Kadıköy, İstanbul',                  ownerId: createdOwners[0].id, floors: 4 },
  { title: 'Ankara Plaza',        address: 'Kızılay Mah. İnkılap Sok. No:8, Çankaya, Ankara',     ownerId: createdOwners[1].id, floors: 8 },
  { title: 'İzmir Konutları',     address: 'Alsancak Mah. Kıbrıs Şehitleri Cad. No:33, İzmir',   ownerId: createdOwners[2].id, floors: 5 },
];
const createdProps = [];
for (const p of propertyData) {
  const r = await api('POST', '/api/properties', p);
  createdProps.push(r);
  console.log('Bina:', r.title, '→ id:', r.id);
}

// ── 4. Daireler ────────────────────────────────────────────
const unitData = [
  { propertyId: createdProps[0].id, unitNo: 'D-1', floor: 1, type: '2+1', area: 85,  status: 'occupied' },
  { propertyId: createdProps[0].id, unitNo: 'D-2', floor: 1, type: '3+1', area: 110, status: 'occupied' },
  { propertyId: createdProps[0].id, unitNo: 'D-3', floor: 2, type: '1+1', area: 60,  status: 'occupied' },
  { propertyId: createdProps[0].id, unitNo: 'D-4', floor: 2, type: '2+1', area: 85,  status: 'vacant'   },
  { propertyId: createdProps[1].id, unitNo: 'A-1', floor: 1, type: '2+1', area: 90,  status: 'occupied' },
  { propertyId: createdProps[1].id, unitNo: 'A-2', floor: 2, type: '3+1', area: 120, status: 'occupied' },
  { propertyId: createdProps[1].id, unitNo: 'A-3', floor: 3, type: '1+1', area: 55,  status: 'vacant'   },
  { propertyId: createdProps[2].id, unitNo: 'K-101', floor: 1, type: '2+1', area: 95,  status: 'occupied' },
  { propertyId: createdProps[2].id, unitNo: 'K-102', floor: 1, type: '2+1', area: 95,  status: 'occupied' },
  { propertyId: createdProps[3].id, unitNo: 'P-01',  floor: 1, type: '3+1', area: 130, status: 'occupied' },
];
const createdUnits = [];
for (const u of unitData) {
  const r = await api('POST', '/api/units', u);
  createdUnits.push(r);
  console.log('Daire:', r.unitNo, '→ id:', r.id);
}

// ── 5. Kiracılar ───────────────────────────────────────────
const tenantData = [
  { name: 'Ali Çelik',     phone: '0 (520) 444 10 01', email: 'ali.celik@ornek.com',     nationalId: '11122233344' },
  { name: 'Zeynep Arslan', phone: '0 (520) 444 10 02', email: 'zeynep.arslan@ornek.com', nationalId: '22233344455' },
  { name: 'Burak Şahin',   phone: '0 (520) 444 10 03', email: 'burak.sahin@ornek.com',   nationalId: '33344455566' },
  { name: 'Selin Koç',     phone: '0 (520) 444 10 04', email: 'selin.koc@ornek.com',     nationalId: '44455566677' },
  { name: 'Emre Yıldız',   phone: '0 (520) 444 10 05', email: 'emre.yildiz@ornek.com',   nationalId: '55566677788' },
  { name: 'Ayşe Doğan',    phone: '0 (520) 444 10 06', email: 'ayse.dogan@ornek.com',    nationalId: '66677788899' },
  { name: 'Murat Öztürk',  phone: '0 (520) 444 10 07', email: 'murat.ozturk@ornek.com',  nationalId: '77788899900' },
];
const createdTenants = [];
for (const t of tenantData) {
  const r = await api('POST', '/api/tenants', t);
  createdTenants.push(r);
  console.log('Kiracı:', r.name, '→ id:', r.id);
}

// ── 6. Sözleşmeler ─────────────────────────────────────────
// occupied unit index'leri: 0,1,2,4,5,7,8,9 (D-4 ve A-3 boş)
const contractDefs = [
  { unitId: createdUnits[0].id, tenantId: createdTenants[0].id, rentAmount: 9500,  paymentDay: 5,  depositAmount: 19000 },
  { unitId: createdUnits[1].id, tenantId: createdTenants[1].id, rentAmount: 13000, paymentDay: 1,  depositAmount: 26000 },
  { unitId: createdUnits[2].id, tenantId: createdTenants[2].id, rentAmount: 6500,  paymentDay: 10, depositAmount: 13000 },
  { unitId: createdUnits[4].id, tenantId: createdTenants[3].id, rentAmount: 10500, paymentDay: 3,  depositAmount: 21000 },
  { unitId: createdUnits[5].id, tenantId: createdTenants[4].id, rentAmount: 16000, paymentDay: 1,  depositAmount: 32000 },
  { unitId: createdUnits[7].id, tenantId: createdTenants[5].id, rentAmount: 11000, paymentDay: 5,  depositAmount: 22000 },
  { unitId: createdUnits[8].id, tenantId: createdTenants[6].id, rentAmount: 10500, paymentDay: 15, depositAmount: 21000 },
];
const createdContracts = [];
for (const c of contractDefs) {
  const r = await api('POST', '/api/contracts', {
    ...c,
    startDate: '2024-01-01',
    endDate:   '2027-12-31',
    currency:  'TRY',
  });
  createdContracts.push(r);
  console.log('Sözleşme → id:', r.id, 'birim:', r.unitId);
}

// ── 7. Alacaklar üret ──────────────────────────────────────
console.log('\nAlacaklar üretiliyor...');
for (const month of ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05']) {
  const r = await api('POST', '/api/charges?action=generate', { date: `${month}-15T12:00:00.000Z` });
  console.log(`${month}: ${r.created} alacak oluşturuldu`);
}

// ── 8. Ödemeler ekle ───────────────────────────────────────
console.log('\nÖdemeler ekleniyor...');
const allCharges = await api('GET', '/api/charges');
const chargeList = Array.isArray(allCharges) ? allCharges : [];

const jan = chargeList.filter(c => c.periodStart?.startsWith('2026-01'));
const feb = chargeList.filter(c => c.periodStart?.startsWith('2026-02'));
const mar = chargeList.filter(c => c.periodStart?.startsWith('2026-03'));
const apr = chargeList.filter(c => c.periodStart?.startsWith('2026-04'));

// Ocak-Mart: tam öde
for (const c of [...jan, ...feb, ...mar]) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Number(c.chargeAmount),
    paidAt: new Date().toISOString(),
    method: 'bank_transfer',
  });
}
console.log(`${jan.length + feb.length + mar.length} alacak tam ödendi (Oca-Mar)`);

// Nisan: ilk 4'ünü kısmi öde
for (const c of apr.slice(0, 4)) {
  await api('POST', `/api/charges/${c.id}/payments`, {
    amount: Math.floor(Number(c.chargeAmount) * 0.5),
    paidAt: new Date().toISOString(),
    method: 'cash',
  });
}
console.log(`${Math.min(4, apr.length)} alacak kısmi ödendi (Nis)`);

// Gecikmiş güncelle
await api('POST', '/api/charges?action=update-overdue', {});
console.log('Gecikme statüsü güncellendi');

// ── 9. Giderler ────────────────────────────────────────────
const expenseData = [
  { description: 'Asansör bakımı',      amount: 2500, date: '2026-03-10', category: 'maintenance', propertyId: createdProps[0].id },
  { description: 'Çatı onarımı',        amount: 8500, date: '2026-02-20', category: 'repair',      propertyId: createdProps[1].id },
  { description: 'Boya badana',         amount: 3200, date: '2026-04-05', category: 'repair',      propertyId: createdProps[2].id },
  { description: 'Yangın sigortası',    amount: 4800, date: '2026-05-01', category: 'insurance'                                   },
  { description: 'Bahçe düzenlemesi',   amount: 1800, date: '2026-04-15', category: 'maintenance', propertyId: createdProps[0].id },
];
for (const e of expenseData) {
  await api('POST', '/api/expenses', e);
}
console.log(`${expenseData.length} gider eklendi`);

console.log('\n✓ Seed tamamlandı!');
