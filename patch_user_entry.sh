#!/bin/bash
sed -i "s/const machineOptions = useMemo(() => {/const NON_MACHINE_DEPTS = ['HR', 'IT', 'Maintenance'];\n  const isNonMachineDept = NON_MACHINE_DEPTS.includes(department);\n\n  const machineOptions = useMemo(() => {/" src/components/breakdown/UserBreakdownEntry.tsx
