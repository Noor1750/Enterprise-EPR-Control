#!/bin/bash
sed -i '/searchPlaceholder="Search machine name or process..."/{n;d}' src/components/breakdown/UserBreakdownEntry.tsx
sed -i '/disabled={isNonMachineDept}/{n;d}' src/components/breakdown/UserBreakdownEntry.tsx
