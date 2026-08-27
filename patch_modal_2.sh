#!/bin/bash
sed -i "s/return availableMachines.map(m => {/return availableMachines\n      .filter(m => !(department \&\& department !== 'All' \&\& !isNonMachineDept \&\& m.department !== department))\n      .map(m => {/" src/components/breakdown/BreakdownModal.tsx
