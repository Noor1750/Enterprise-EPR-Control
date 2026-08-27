#!/bin/bash
sed -i 's/if (isEditing) return null; \/\/ When editing existing record, allowed/if (isEditing) return null;\n    if (isNonMachineDept) return null;/' src/components/breakdown/BreakdownModal.tsx
