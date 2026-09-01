export interface MachineMasterSettings {
  brandNames: string[];
  departments: string[];
  processNames: string[];
}

export const DEFAULT_MACHINE_MASTER_SETTINGS: MachineMasterSettings = {
  brandNames: [
    'Gallus',
    'Nilpeter',
    'Omet',
    'Konica Minolta',
    'Mark Andy',
    'HP Indigo',
    'Orthotec',
    'Weigang',
    'Heidelberg',
    'Bobst',
    'Komori'
  ],
  departments: [
    'Flexo Printing',
    'Digital Printing',
    'Offset Printing',
    'Rotary Screen',
    'Slitting & Inspection',
    'Finishing & Die-cut',
    'RFID',
    'Woven',
    'Cutting',
    'Sewing',
    'Packaging',
    'Maintenance',
    'Quality Assurance'
  ],
  processNames: [
    'Printing',
    'Slitting',
    'Die-cutting',
    'Inspection',
    'Lamination',
    'Foil Stamping',
    'Embossing',
    'Rewinding',
    'Packaging',
    'Encoding & Verification',
    'Weaving',
    'Lockstitch'
  ]
};

const STORAGE_KEY = 'erp_machine_master_settings';

export const getMachineMasterSettings = (): MachineMasterSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MACHINE_MASTER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      brandNames: Array.isArray(parsed.brandNames) && parsed.brandNames.length > 0 ? parsed.brandNames : DEFAULT_MACHINE_MASTER_SETTINGS.brandNames,
      departments: Array.isArray(parsed.departments) && parsed.departments.length > 0 ? parsed.departments : DEFAULT_MACHINE_MASTER_SETTINGS.departments,
      processNames: Array.isArray(parsed.processNames) && parsed.processNames.length > 0 ? parsed.processNames : DEFAULT_MACHINE_MASTER_SETTINGS.processNames
    };
  } catch (err) {
    console.error('Failed to load machine master settings:', err);
    return DEFAULT_MACHINE_MASTER_SETTINGS;
  }
};

export const saveMachineMasterSettings = (settings: MachineMasterSettings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('erp-machine-settings-updated', { detail: settings }));
  } catch (err) {
    console.error('Failed to save machine master settings:', err);
  }
};
