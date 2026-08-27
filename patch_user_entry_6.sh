#!/bin/bash
sed -i 's/searchPlaceholder="Search machine name or process..."/searchPlaceholder="Search machine name or process..."\n              required={!isNonMachineDept}/' src/components/breakdown/UserBreakdownEntry.tsx
sed -i 's/placeholder={isNonMachineDept ? "N\/A" : "e.g. MC-RFI-01"}/placeholder={isNonMachineDept ? "N\/A" : "e.g. MC-RFI-01"}\n              disabled={isNonMachineDept}\n              required={!isNonMachineDept}/' src/components/breakdown/UserBreakdownEntry.tsx
