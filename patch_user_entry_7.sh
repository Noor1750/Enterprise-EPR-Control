#!/bin/bash
sed -i 's/if (!machineName) {/if (!isNonMachineDept \&\& !machineName) {/' src/components/breakdown/UserBreakdownEntry.tsx
sed -i 's/if (!machineNo) {/if (!isNonMachineDept \&\& !machineNo) {/' src/components/breakdown/UserBreakdownEntry.tsx
