#!/bin/bash
sed -i 's/required/required={!isNonMachineDept}/' src/components/breakdown/BreakdownModal.tsx
