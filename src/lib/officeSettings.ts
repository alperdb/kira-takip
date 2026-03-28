import fs   from 'fs';
import path from 'path';
import { getUserDbPath } from '@/lib/user-db';

export type OfficeSettings = {
  officeName:   string;
  managerName:  string;
  phone:        string;
  email:        string;
  address:      string;
  currency:     string;   // display symbol: '₺', '$', '€'
  currencyCode: string;   // ISO code: 'TRY', 'USD', 'EUR'
};

const DEFAULTS: OfficeSettings = {
  officeName:   '',
  managerName:  '',
  phone:        '',
  email:        '',
  address:      '',
  currency:     '₺',
  currencyCode: 'TRY',
};

function getSettingsPath(userId: number): string {
  const dbPath = getUserDbPath(userId);
  return path.join(path.dirname(dbPath), `settings-${userId}.json`);
}

export function readOfficeSettings(userId: number): OfficeSettings {
  try {
    const p = getSettingsPath(userId);
    if (!fs.existsSync(p)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(p, 'utf-8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeOfficeSettings(userId: number, data: Partial<OfficeSettings>): OfficeSettings {
  const updated = { ...readOfficeSettings(userId), ...data };
  const p = getSettingsPath(userId);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
