#!/bin/bash
sed -i 's/3. Machine (Name) <span className="text-rose-500">\*<\/span>/3. Machine (Name) {!isNonMachineDept \&\& <span className="text-rose-500">\*<\/span>}/' src/components/breakdown/UserBreakdownEntry.tsx
sed -i 's/placeholder="-- Search Machine --"/placeholder={isNonMachineDept ? "N\/A" : "-- Search Machine --"}\n              disabled={isNonMachineDept}\n              required={!isNonMachineDept}/' src/components/breakdown/UserBreakdownEntry.tsx
sed -i 's/required={!isNonMachineDept}/required={!isNonMachineDept}/' src/components/breakdown/UserBreakdownEntry.tsx # Just replacing the old required

# For Machine No
sed -i 's/4. Machine No <span className="text-rose-500">\*<\/span>/4. Machine No {!isNonMachineDept \&\& <span className="text-rose-500">\*<\/span>}/' src/components/breakdown/UserBreakdownEntry.tsx
sed -i 's/placeholder="e.g. MC-RFI-01"/placeholder={isNonMachineDept ? "N\/A" : "e.g. MC-RFI-01"}\n              disabled={isNonMachineDept}\n              required={!isNonMachineDept}/' src/components/breakdown/UserBreakdownEntry.tsx
