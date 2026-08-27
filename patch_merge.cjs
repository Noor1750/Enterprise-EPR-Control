const fs = require('fs');

let layout = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Remove the old Skill Matrix from sidebar
layout = layout.replace("    { id: 'skill', name: 'Skill Matrix', icon: Award, moduleName: 'Machine & Skills' },\n", "");

// Rename Skill Navigator to Skill Matrix & Navigator
layout = layout.replace("{ id: 'skill-dashboard', name: 'Skill Navigator', icon: Target, moduleName: 'All' }", "{ id: 'skill-dashboard', name: 'Skill Matrix', icon: Target, moduleName: 'Machine & Skills' }");

// Also remove the old case for 'skill' just to clean up (optional but good)
layout = layout.replace("      case 'skill': return <MachineCapacity spreadsheetId={spreadsheetId} view=\"skill\" userSecurityScope={userSecurityScope} />;\n", "");

// Update SkillMatrixDashboard props to receive userSecurityScope
layout = layout.replace("case 'skill-dashboard': return <SkillMatrixDashboard spreadsheetId={spreadsheetId} />;", "case 'skill-dashboard': return <SkillMatrixDashboard spreadsheetId={spreadsheetId} userSecurityScope={userSecurityScope} />;");

fs.writeFileSync('src/components/Layout.tsx', layout);

let dash = fs.readFileSync('src/components/SkillMatrixDashboard.tsx', 'utf8');

// Import MachineCapacity and UserSecurityScope
dash = dash.replace("import { Loader2", "import MachineCapacity from './MachineCapacity';\nimport { UserSecurityScope } from '../lib/security';\nimport { Loader2");

// Update props
dash = dash.replace("export default function SkillMatrixDashboard({ spreadsheetId }: { spreadsheetId: string }) {", "export default function SkillMatrixDashboard({ spreadsheetId, userSecurityScope }: { spreadsheetId: string, userSecurityScope?: UserSecurityScope }) {");

// Add tab
dash = dash.replace("{ id: 'reports', label: 'Reports' }", "{ id: 'reports', label: 'Reports' },\n    { id: 'manage', label: 'Manage Skills' }");

// Add tab content
const manageContent = `
        {activeTab === 'manage' && (
          <div className="-mx-8 -my-8 -mb-10 h-[calc(100vh-140px)]">
            <MachineCapacity spreadsheetId={spreadsheetId} view="skill" userSecurityScope={userSecurityScope} />
          </div>
        )}
`;

dash = dash.replace("      </div>\n    </div>\n  );\n}", manageContent + "      </div>\n    </div>\n  );\n}");

fs.writeFileSync('src/components/SkillMatrixDashboard.tsx', dash);
console.log("Merged");
