import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from './sheets';

export interface DeveloperProfile {
  name: string;
  rolePrefix: string; // e.g. "im john moore,"
  roleHighlight: string; // e.g. "a digital designer"
  bio: string;
  avatarUrl: string;
  email: string;
  phone: string;
  location: string;
  availability: string;
  githubUrl?: string;
  linkedinUrl?: string;
  dribbbleUrl?: string;
  websiteUrl?: string;
  yearsExperience?: number;
  completedProjects?: number;
  clientSatisfaction?: number;
}

export interface ExpertiseItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  iconName: string;
  tags: string[];
  accentColor?: string;
}

export const DEFAULT_EXPERTISE_ITEMS: ExpertiseItem[] = [
  {
    id: 'exp-1',
    title: 'UI/UX & Digital Product Design',
    subtitle: 'High-Fidelity Prototyping & Design Systems',
    description: 'Crafting pixel-perfect, accessible, and intuitive digital interfaces with robust design tokens, atomic components, and seamless responsive layouts.',
    iconName: 'Palette',
    tags: ['Figma', 'Design Systems', 'Responsive UI', 'Interaction Design'],
    accentColor: '#6342F5'
  },
  {
    id: 'exp-2',
    title: 'Full-Stack Architecture & Cloud',
    subtitle: 'Scalable Web Engines & Microservices',
    description: 'Architecting resilient full-stack systems with modern React, TypeScript, Node.js, and Google Cloud, ensuring sub-second response times.',
    iconName: 'Layers',
    tags: ['React', 'TypeScript', 'Node.js', 'Google Sheets API', 'Cloud Run'],
    accentColor: '#3B82F6'
  },
  {
    id: 'exp-3',
    title: 'Industrial Automation & RFID',
    subtitle: 'Hardware Integration & Serialization',
    description: 'Engineering enterprise RFID encoding lines, barcode verification modules, and real-time shop-floor operational dashboards.',
    iconName: 'Cpu',
    tags: ['RFID UHF', 'Automation', 'Barcode QA', 'Telemetry'],
    accentColor: '#10B981'
  },
  {
    id: 'exp-4',
    title: 'Operations & Lean 5S Systems',
    subtitle: 'Workflow Optimization & Productivity',
    description: 'Building continuous improvement audit frameworks, machine capacity calculators, and shift rotation algorithms to reduce bottlenecking.',
    iconName: 'Sparkles',
    tags: ['Kaizen', 'Lean 5S', 'Capacity Planning', 'Shift Engine'],
    accentColor: '#F59E0B'
  }
];

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfile = {
  name: 'John Moore',
  rolePrefix: 'im john moore,',
  roleHighlight: 'a digital designer',
  bio: 'Specializing in intuitive digital product experiences, modern design systems, and robust enterprise engineering. Building seamless digital interfaces that elevate operational efficiency.',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
  email: 'john.moore@brandfolio.design',
  phone: '+1 (555) 234-5678',
  location: 'San Francisco, CA / Global Remote',
  availability: 'Available for new projects',
  githubUrl: 'https://github.com',
  linkedinUrl: 'https://linkedin.com',
  dribbbleUrl: 'https://dribbble.com',
  websiteUrl: 'https://brandfolio.design',
  yearsExperience: 8,
  completedProjects: 45,
  clientSatisfaction: 99.8
};

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  completionDate: string;
  status: 'Live' | 'In Production' | 'Featured' | 'Archived';
  externalLink?: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_PORTFOLIO_ITEMS: PortfolioItem[] = [
  {
    id: 'PORT-001',
    title: 'Brandfolio Interactive Design System',
    description: 'Ultra-modern design system and digital portfolio showcasing responsive components, micro-interactions, and high-performance layouts.',
    category: 'Brand & UI/UX',
    imageUrl: 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80',
    completionDate: '2026-02-20',
    status: 'Featured',
    externalLink: 'https://brandfolio.design',
    displayOrder: 1,
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2026-02-20T00:00:00.000Z',
    updatedAt: '2026-02-20T00:00:00.000Z'
  },
  {
    id: 'PORT-002',
    title: 'Automated RFID Encoding & Validation Line',
    description: 'High-speed industrial RFID tag encoding, serialization, and barcode verification infrastructure achieving 99.98% audit accuracy.',
    category: 'RFID Solutions',
    imageUrl: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    completionDate: '2025-11-15',
    status: 'Featured',
    externalLink: '',
    displayOrder: 2,
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2025-11-15T00:00:00.000Z',
    updatedAt: '2025-11-15T00:00:00.000Z'
  },
  {
    id: 'PORT-003',
    title: 'High-Definition Jacquard Woven Label Weaving',
    description: 'Ultra-fine polyester and recycled yarn micro-weaving for global luxury fashion apparel branding.',
    category: 'Woven Branding',
    imageUrl: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=800&q=80',
    completionDate: '2025-08-20',
    status: 'Live',
    externalLink: '',
    displayOrder: 3,
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2025-08-20T00:00:00.000Z',
    updatedAt: '2025-08-20T00:00:00.000Z'
  },
  {
    id: 'PORT-004',
    title: 'FSC-Certified Offset Print & Sustainable Packaging',
    description: 'Eco-conscious hang tags, price stickers, and blister packaging produced with water-based non-toxic inks.',
    category: 'Offset & Packaging',
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=800&q=80',
    completionDate: '2026-01-10',
    status: 'Featured',
    externalLink: '',
    displayOrder: 4,
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2026-01-10T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z'
  },
  {
    id: 'PORT-005',
    title: 'Continuous Lean 5S & Kaizen Floor Overhaul',
    description: 'Factory-wide workstation reorganization minimizing transit delays and boosting operator ergonomic efficiency.',
    category: 'Operational Excellence',
    imageUrl: 'https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=80',
    completionDate: '2026-02-14',
    status: 'In Production',
    externalLink: '',
    displayOrder: 5,
    isActive: true,
    createdBy: 'Admin',
    createdAt: '2026-02-14T00:00:00.000Z',
    updatedAt: '2026-02-14T00:00:00.000Z'
  }
];

export interface ContactMessage {
  id: string;
  name: string;
  employeeId?: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  status: 'New' | 'Read' | 'Resolved';
  submittedAt: string;
}

const LOCAL_STORAGE_DEV_PROFILE_KEY = 'brandfolio_developer_profile_v2';

export function getDeveloperProfileFromStorage(): DeveloperProfile {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DEV_PROFILE_KEY);
    if (saved) {
      return { ...DEFAULT_DEVELOPER_PROFILE, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.warn('Could not read local developer profile:', e);
  }
  return DEFAULT_DEVELOPER_PROFILE;
}

export function saveDeveloperProfileToStorage(profile: DeveloperProfile): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_DEV_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('Could not save local developer profile:', e);
  }
}

export async function getPortfolioItems(spreadsheetId: string): Promise<PortfolioItem[]> {
  try {
    const raw = await getRange(spreadsheetId, 'PortfolioItems!A2:M');
    if (raw && raw.length > 0) {
      return raw.map(r => ({
        id: r[0] || '',
        title: r[1] || '',
        description: r[2] || '',
        category: r[3] || 'General',
        imageUrl: r[4] || '',
        completionDate: r[5] || '',
        status: (r[6] as any) || 'Live',
        externalLink: r[7] || '',
        displayOrder: parseInt(r[8], 10) || 1,
        isActive: r[9] !== 'false' && r[9] !== 'No',
        createdBy: r[10] || 'Admin',
        createdAt: r[11] || '',
        updatedAt: r[12] || ''
      })).filter(p => p.id && p.title).sort((a, b) => a.displayOrder - b.displayOrder);
    }
  } catch (err) {
    console.warn('Fallback to default portfolio:', err);
  }
  return DEFAULT_PORTFOLIO_ITEMS;
}

export async function savePortfolioItem(
  spreadsheetId: string,
  item: Omit<PortfolioItem, 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<boolean> {
  const isNew = !item.id;
  const id = item.id || `PORT-${Date.now()}`;
  const now = new Date().toISOString();

  const row = [
    id,
    item.title,
    item.description,
    item.category,
    item.imageUrl || '',
    item.completionDate,
    item.status,
    item.externalLink || '',
    item.displayOrder.toString(),
    item.isActive ? 'true' : 'false',
    item.createdBy || 'Admin',
    isNew ? now : '',
    now
  ];

  if (isNew) {
    await appendRow(spreadsheetId, 'PortfolioItems!A:M', [row]);
  } else {
    await updateRowByPrimaryKey(spreadsheetId, 'PortfolioItems', id, row);
  }
  return true;
}

export async function deletePortfolioItem(spreadsheetId: string, id: string): Promise<boolean> {
  await deleteRowByPrimaryKey(spreadsheetId, 'PortfolioItems', id);
  return true;
}

export async function saveContactMessage(
  spreadsheetId: string,
  msg: Omit<ContactMessage, 'id' | 'status' | 'submittedAt'>
): Promise<boolean> {
  const id = `MSG-${Date.now()}`;
  const now = new Date().toISOString();

  const row = [
    id,
    msg.name,
    msg.employeeId || '',
    msg.email,
    msg.phone,
    msg.subject,
    msg.message,
    'New',
    now
  ];

  await appendRow(spreadsheetId, 'ContactMessages!A:I', [row]);
  return true;
}

export async function getContactMessages(spreadsheetId: string): Promise<ContactMessage[]> {
  try {
    const raw = await getRange(spreadsheetId, 'ContactMessages!A2:I');
    if (raw && raw.length > 0) {
      return raw.map(r => ({
        id: r[0] || '',
        name: r[1] || '',
        employeeId: r[2] || '',
        email: r[3] || '',
        phone: r[4] || '',
        subject: r[5] || '',
        message: r[6] || '',
        status: (r[7] as any) || 'New',
        submittedAt: r[8] || ''
      })).filter(m => m.id);
    }
  } catch (err) {
    console.warn('Fallback empty messages:', err);
  }
  return [];
}
