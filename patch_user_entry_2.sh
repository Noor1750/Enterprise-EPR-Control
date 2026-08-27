#!/bin/bash
sed -i "s/    machinesList.forEach(m => {/    machinesList.forEach(m => {\n      const dept = m[1] || '';\n      if (department \&\& department !== 'All' \&\& !isNonMachineDept \&\& dept !== department) return;\n/" src/components/breakdown/UserBreakdownEntry.tsx
