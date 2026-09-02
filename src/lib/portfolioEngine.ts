import { getRange, appendRow, updateRowByPrimaryKey, deleteRowByPrimaryKey } from './sheets';

export interface DeveloperProfile {
  name: string;
  rolePrefix: string; // e.g. "Hello, I'm"
  roleHighlight: string; // e.g. "Full Stack Developer"
  bio: string;
  avatarUrl: string;
  email: string;
  phone: string;
  location: string;
  availability: string;
  githubUrl?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  mediumUrl?: string;
  dribbbleUrl?: string;
  websiteUrl?: string;
  cvUrl?: string;
  yearsExperience?: number;
  completedProjects?: number;
  happyClients?: number;
  technologiesCount?: number;
  clientSatisfaction?: number;
}

export interface SkillCategory {
  category: string;
  iconName: string;
  skills: {
    name: string;
    level: number; // 1-100
    experience: string;
    icon?: string;
    featured?: boolean;
  }[];
}

export interface ExperienceTimelineItem {
  id: string;
  role: string;
  company: string;
  location: string;
  period: string;
  type: 'Full-time' | 'Contract' | 'Lead';
  description: string;
  achievements: string[];
  techStack: string[];
}

export interface BlogPostItem {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  author: string;
  content: string;
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

export const DEFAULT_DEVELOPER_PROFILE: DeveloperProfile = {
  name: 'Alex Morgan',
  rolePrefix: "Hello, I'm",
  roleHighlight: 'Full Stack Developer',
  bio: 'I build exceptional digital experiences that are fast, accessible, visually appealing and responsive. Let\'s build something amazing together!',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80',
  email: 'alex.morgan@devstudio.io',
  phone: '+1 (555) 349-8201',
  location: 'San Francisco, CA / Global Remote',
  availability: 'Available for new projects',
  githubUrl: 'https://github.com',
  linkedinUrl: 'https://linkedin.com',
  twitterUrl: 'https://x.com',
  mediumUrl: 'https://medium.com',
  dribbbleUrl: 'https://dribbble.com',
  websiteUrl: 'https://alexmorgan.dev',
  cvUrl: '#',
  yearsExperience: 5,
  completedProjects: 50,
  happyClients: 30,
  technologiesCount: 10,
  clientSatisfaction: 99.4
};

export const DEFAULT_SKILL_CATEGORIES: SkillCategory[] = [
  {
    category: 'Frontend Engineering',
    iconName: 'Layout',
    skills: [
      { name: 'React 19 / TypeScript', level: 98, experience: '5+ years', featured: true },
      { name: 'Tailwind CSS / PostCSS', level: 95, experience: '5+ years', featured: true },
      { name: 'Next.js & Modern SSR', level: 90, experience: '4+ years', featured: true },
      { name: 'Motion / Framer Motion', level: 92, experience: '3+ years', featured: true },
      { name: 'State Architecture (Zustand/Redux)', level: 88, experience: '4+ years' },
      { name: 'Responsive Web / Accessibility (a11y)', level: 96, experience: '5+ years' }
    ]
  },
  {
    category: 'Backend & Cloud Services',
    iconName: 'Server',
    skills: [
      { name: 'Node.js & Express.js', level: 94, experience: '5+ years', featured: true },
      { name: 'Google Cloud Platform (Cloud Run)', level: 90, experience: '4+ years', featured: true },
      { name: 'PostgreSQL & Cloud SQL', level: 88, experience: '4+ years', featured: true },
      { name: 'Firebase / Firestore & Auth', level: 95, experience: '5+ years', featured: true },
      { name: 'REST APIs & GraphQL', level: 92, experience: '5+ years' },
      { name: 'Docker & Microservices', level: 86, experience: '3+ years' }
    ]
  },
  {
    category: 'Industrial Systems & Automation',
    iconName: 'Cpu',
    skills: [
      { name: 'RFID UHF Hardware & Encoding', level: 92, experience: '3+ years', featured: true },
      { name: 'High-Speed Barcode QA & Verification', level: 94, experience: '4+ years', featured: true },
      { name: 'Lean 5S Audit & Kaizen Engines', level: 90, experience: '3+ years', featured: true },
      { name: 'Live Shop-Floor Telemetry & OEE', level: 88, experience: '3+ years' },
      { name: 'Automated Shift Scheduling VM', level: 96, experience: '4+ years' }
    ]
  },
  {
    category: 'UI/UX Design & Prototyping',
    iconName: 'Palette',
    skills: [
      { name: 'Figma Design Systems & Tokens', level: 95, experience: '5+ years', featured: true },
      { name: 'High-Fidelity Micro-interactions', level: 90, experience: '4+ years', featured: true },
      { name: 'Dark Mode & Mathematical Hierarchy', level: 98, experience: '5+ years', featured: true },
      { name: 'Wireframing & User Journey Mapping', level: 92, experience: '4+ years' },
      { name: 'Design-to-Code Automation', level: 94, experience: '4+ years' }
    ]
  }
];

export const DEFAULT_EXPERIENCES: ExperienceTimelineItem[] = [
  {
    id: 'exp-1',
    role: 'Lead Full Stack Architect & Design Systems Lead',
    company: 'Enterprise Digital Systems',
    location: 'San Francisco, CA (Remote)',
    period: '2024 - Present',
    type: 'Lead',
    description: 'Spearheaded full-stack cloud applications, industrial automation engines, and modern dark-mode design systems for enterprise operations.',
    achievements: [
      'Engineered sub-second reactive dashboards supporting 10,000+ daily operational records',
      'Designed a modular atomic UI library reducing frontend feature rollout cycle by 45%',
      'Integrated real-time Google Workspace and Cloud Run container infrastructure'
    ],
    techStack: ['React 19', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Google Cloud', 'Firestore']
  },
  {
    id: 'exp-2',
    role: 'Senior Full Stack & Automation Engineer',
    company: 'Apex Tech Solutions',
    location: 'Austin, TX',
    period: '2022 - 2024',
    type: 'Full-time',
    description: 'Designed and deployed real-time RFID serialization, inventory tracking systems, and high-performance business web applications.',
    achievements: [
      'Built automated barcode verification pipelines reaching 99.98% accuracy on factory lines',
      'Architected RESTful microservices and optimized PostgreSQL database queries by 60%',
      'Authored automated unit and end-to-end testing suites'
    ],
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Docker', 'RFID UHF', 'Express']
  },
  {
    id: 'exp-3',
    role: 'Frontend & UI/UX Developer',
    company: 'Creative Studio Labs',
    location: 'New York, NY',
    period: '2021 - 2022',
    type: 'Full-time',
    description: 'Developed immersive web interfaces, accessible client portals, and fluid interactive marketing experiences.',
    achievements: [
      'Delivered over 25 client web applications with 100% lighthouse accessibility scores',
      'Collaborated closely with product designers to implement pixel-perfect micro-animations'
    ],
    techStack: ['TypeScript', 'Next.js', 'Tailwind CSS', 'Figma', 'Motion']
  }
];

export const DEFAULT_BLOG_POSTS: BlogPostItem[] = [
  {
    id: 'blog-1',
    title: 'Architecting Enterprise Web Apps with Modern React & Google Workspace',
    category: 'Architecture',
    readTime: '6 min read',
    date: 'Aug 28, 2026',
    excerpt: 'How to build lightning-fast, reactive enterprise dashboards using React, TypeScript, and live bidirectional Google Sheets synchronization.',
    coverImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
    tags: ['React', 'TypeScript', 'Google Cloud', 'Sheets API'],
    author: 'Alex Morgan',
    content: 'Enterprise applications often require seamless interoperability between client-facing dashboards and existing spreadsheet workflows. By implementing resilient caching layers, optimistic UI updates, and atomic state synchronization, teams can achieve instantaneous UI feedback while keeping mission-critical spreadsheets 100% consistent.'
  },
  {
    id: 'blog-2',
    title: 'Industrial RFID Serialization: From Chip Encoding to Live Floor Auditing',
    category: 'Industrial IoT',
    readTime: '8 min read',
    date: 'Aug 14, 2026',
    excerpt: 'Deep dive into high-speed RFID UHF encoding lines, EPC Gen2 validation, and real-time defect prevention on the production floor.',
    coverImage: 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=80',
    tags: ['RFID UHF', 'Hardware', 'Automation', 'QA'],
    author: 'Alex Morgan',
    content: 'Industrial automation demands zero tolerance for duplicate EPC serialization or unreadable chips. Combining hardware verification antennas with custom telemetry dashboards enables immediate error quarantine and live operator feedback.'
  },
  {
    id: 'blog-3',
    title: 'The Art of Dark Mode: Contrast, Depth & Mathematical Hierarchy',
    category: 'UI/UX Design',
    readTime: '5 min read',
    date: 'Jul 22, 2026',
    excerpt: 'Why true dark mode is never pure black, and how to craft eye-safe, high-contrast digital interfaces with subtle luminosity layering.',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    tags: ['Design Systems', 'Dark Mode', 'Tailwind CSS', 'a11y'],
    author: 'Alex Morgan',
    content: 'Dark mode user interfaces require careful attention to luminance levels. Layering elevated surfaces with subtle lightness shifts (e.g. #090A10 canvas with #121524 containers) creates natural optical hierarchy without harsh borders.'
  }
];

export const DEFAULT_EXPERTISE_ITEMS: ExpertiseItem[] = [
  {
    id: 'exp-1',
    title: 'UI/UX & Digital Product Design',
    subtitle: 'High-Fidelity Prototyping & Design Systems',
    description: 'Crafting pixel-perfect, accessible, and intuitive digital interfaces with robust design tokens, atomic components, and seamless responsive layouts.',
    iconName: 'Palette',
    tags: ['Figma', 'Design Systems', 'Responsive UI', 'Interaction Design'],
    accentColor: '#6366F1'
  },
  {
    id: 'exp-2',
    title: 'Full-Stack Architecture & Cloud',
    subtitle: 'Scalable Web Engines & Microservices',
    description: 'Architecting resilient full-stack systems with modern React, TypeScript, Node.js, and Google Cloud, ensuring sub-second response times.',
    iconName: 'Layers',
    tags: ['React', 'TypeScript', 'Node.js', 'Google Sheets API', 'Cloud Run'],
    accentColor: '#8B5CF6'
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
