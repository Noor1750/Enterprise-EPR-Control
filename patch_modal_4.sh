#!/bin/bash
sed -i 's/3. Machine (Name) <span className="text-rose-500">\*<\/span>/3. Machine (Name) {!isNonMachineDept \&\& <span className="text-rose-500">\*<\/span>}/' src/components/breakdown/BreakdownModal.tsx
sed -i 's/disabled={isReadOnly}/disabled={isReadOnly || isNonMachineDept}/' src/components/breakdown/BreakdownModal.tsx
sed -i 's/placeholder="-- Select Machine --"/placeholder={isNonMachineDept ? "N\/A" : "-- Select Machine --"}/' src/components/breakdown/BreakdownModal.tsx

sed -i 's/4. Machine No <span className="text-rose-500">\*<\/span>/4. Machine No {!isNonMachineDept \&\& <span className="text-rose-500">\*<\/span>}/' src/components/breakdown/BreakdownModal.tsx
sed -i 's/placeholder="e.g. MC-RFI-01"/placeholder={isNonMachineDept ? "N\/A" : "e.g. MC-RFI-01"}/' src/components/breakdown/BreakdownModal.tsx
