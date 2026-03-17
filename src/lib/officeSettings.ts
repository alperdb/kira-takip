import fs   from 'fs';
import path from 'path';

export type OfficeSettings = {
  officeName:  string;
  managerName: string;
  phone:       string;
  email:       string;
  address:     string;
};

const DEFAULTS: OfficeSettings = {
  officeName:  '',
  managerName: '',
  phone:       '',
  email:       '',
  address:     '',
};

function getSettingsPath(): string {
  const url    = process.env.DATABASE_URL ?? '';
  const dbPath = url.replace(/^file:/, '');
  const abs    = path.isAbsolute(dbPath) ? dbPath : path.resolve(process.cwd(), dbPath);
  return path.join(path.dirname(abs), 'app-settings.json');
}

export function readOfficeSettings(): OfficeSettings {
  try {
    const p = getSettingsPath();
    if (!fs.existsSync(p)) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(p, 'utf-8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeOfficeSettings(data: Partial<OfficeSettings>): OfficeSettings {
  const updated = { ...readOfficeSettings(), ...data };
  const p = getSettingsPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}
