const fs = require('fs');

let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Add import
layout = layout.replace("import Dashboard from './Dashboard';", "import Dashboard from './Dashboard';\nimport SkillMatrixDashboard from './SkillMatrixDashboard';");

// Update navigation
layout = layout.replace(
  "{ id: 'dashboard', name: 'Dashboard', icon: Menu, moduleName: 'All' },",
  "{ id: 'skill-dashboard', name: 'Skill Navigator', icon: Target, moduleName: 'All' },\n    { id: 'dashboard', name: 'ERP Dashboard', icon: Menu, moduleName: 'All' },"
);

// Add to switch
layout = layout.replace(
  "case 'dashboard': return <Dashboard spreadsheetId={spreadsheetId} user={user} accessLevels={accessLevels} userSecurityScope={userSecurityScope} />;",
  "case 'skill-dashboard': return <SkillMatrixDashboard spreadsheetId={spreadsheetId} />;\n      case 'dashboard': return <Dashboard spreadsheetId={spreadsheetId} user={user} accessLevels={accessLevels} userSecurityScope={userSecurityScope} />;"
);

// Initial active module
layout = layout.replace(
  "const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');",
  "const [activeModule, setActiveModule] = useState<ModuleType | 'skill-dashboard'>('skill-dashboard');"
);

// also in activeModule === 'dashboard' rendering wrapper (line 230)
layout = layout.replace(
  "{activeModule === 'dashboard' ? (",
  "{(activeModule === 'dashboard' || activeModule === 'skill-dashboard') ? ("
);

fs.writeFileSync('src/components/Layout.tsx', layout);
console.log("Layout.tsx patched!");
