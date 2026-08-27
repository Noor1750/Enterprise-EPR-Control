#!/bin/bash
sed -i 's/const \[department, setDepartment\] = useState<string>('"'"''"'"');/const \[department, setDepartment\] = useState<string>('"'"''"'"');\n  const NON_MACHINE_DEPTS = ['"'"'HR'"'"', '"'"'IT'"'"', '"'"'Maintenance'"'"'];\n  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);/' src/components/breakdown/UserBreakdownEntry.tsx
