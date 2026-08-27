#!/bin/bash
sed -i "s/if (!machineName) return 'Please select a Machine.';/if (!isNonMachineDept \&\& !machineName) return 'Please select a Machine.';/" src/components/breakdown/BreakdownModal.tsx
