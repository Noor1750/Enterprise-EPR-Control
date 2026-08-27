const fs = require('fs');
let code = fs.readFileSync('src/components/shift/MachineAllocationsTab.tsx', 'utf8');

code = code.replace(
  `  allEmployees: string[][];
  onRefresh: () => Promise<void>;
}`,
  `  allEmployees: string[][];
  onRefresh: () => Promise<void>;
  userSecurityScope?: any;
}`
);

fs.writeFileSync('src/components/shift/MachineAllocationsTab.tsx', code);
