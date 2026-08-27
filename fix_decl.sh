#!/bin/bash
# Remove the existing declarations
sed -i '/const NON_MACHINE_DEPTS =/d' src/components/breakdown/UserBreakdownEntry.tsx
sed -i '/const isNonMachineDept =/d' src/components/breakdown/UserBreakdownEntry.tsx

# Add them back early
sed -i 's/const \[department, setDepartment\] = useState('"'"''"'"');/const \[department, setDepartment\] = useState('"'"''"'"');\n  const NON_MACHINE_DEPTS = ['"'"'HR'"'"', '"'"'IT'"'"', '"'"'Maintenance'"'"'];\n  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);/' src/components/breakdown/UserBreakdownEntry.tsx

# Do the same for BreakdownModal.tsx
sed -i '/const NON_MACHINE_DEPTS =/d' src/components/breakdown/BreakdownModal.tsx
sed -i '/const isNonMachineDept =/d' src/components/breakdown/BreakdownModal.tsx
sed -i 's/const \[department, setDepartment\] = useState(initialRecord?.department || '"'"''"'"');/const \[department, setDepartment\] = useState(initialRecord?.department || '"'"''"'"');\n  const NON_MACHINE_DEPTS = ['"'"'HR'"'"', '"'"'IT'"'"', '"'"'Maintenance'"'"'];\n  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);/' src/components/breakdown/BreakdownModal.tsx
