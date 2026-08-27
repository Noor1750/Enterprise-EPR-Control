#!/bin/bash
sed -i 's/const activeExisting = (machineName ? activeUnsolvedBreakdowns.get(machineName.trim().toLowerCase()) : null) ||/const activeExisting = isNonMachineDept ? null : ((machineName ? activeUnsolvedBreakdowns.get(machineName.trim().toLowerCase()) : null) ||/' src/components/breakdown/UserBreakdownEntry.tsx
