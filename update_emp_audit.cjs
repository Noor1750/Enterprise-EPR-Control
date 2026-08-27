const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');

// Add import if needed
if (!code.includes('recordSecurityAuditLog')) {
  code = code.replace(
    `import { UserSecurityScope, filterAuthorizedEmployees } from '../lib/security';`,
    `import { UserSecurityScope, filterAuthorizedEmployees, recordSecurityAuditLog } from '../lib/security';`
  );
}

// Log delete
const deleteConfirmedOrig = `      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      showToast(\`Employee \${name} deleted.\`);`;
const deleteConfirmedNew = `      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      recordSecurityAuditLog({
        adminEmail: userSecurityScope?.employeeName || user.email || 'Admin',
        targetUser: name,
        role: 'Employee',
        module: 'Employee Directory',
        actionType: 'DELETE',
        previousPermission: id,
        newPermission: 'DELETED',
        source: 'Directory',
        reason: 'Employee physically removed from the system'
      });
      showToast(\`Employee \${name} deleted.\`);`;
code = code.replace(deleteConfirmedOrig, deleteConfirmedNew);

// Log update
const updateOrig = `        await updateRowByPrimaryKey(spreadsheetId, 'Employees', formData.id, values);
        showToast(\`Employee \${formData.name} updated successfully.\`);`;
const updateNew = `        await updateRowByPrimaryKey(spreadsheetId, 'Employees', formData.id, values);
        recordSecurityAuditLog({
          adminEmail: userSecurityScope?.employeeName || user.email || 'Admin',
          targetUser: formData.name,
          role: formData.designation || 'Employee',
          module: 'Employee Directory',
          actionType: 'UPDATE',
          previousPermission: 'Various',
          newPermission: 'Updated Values',
          source: 'Directory',
          reason: 'Employee profile modified'
        });
        showToast(\`Employee \${formData.name} updated successfully.\`);`;
code = code.replace(updateOrig, updateNew);

// Log create
const createOrig = `        await appendRow(spreadsheetId, 'Employees!A:Z', [values]);
        
        // Also log initial shift history`;
const createNew = `        await appendRow(spreadsheetId, 'Employees!A:Z', [values]);
        
        recordSecurityAuditLog({
          adminEmail: userSecurityScope?.employeeName || user.email || 'Admin',
          targetUser: formData.name,
          role: formData.designation || 'Employee',
          module: 'Employee Directory',
          actionType: 'CREATE',
          previousPermission: 'None',
          newPermission: 'Active',
          source: 'Directory',
          reason: 'New employee onboarded'
        });
        
        // Also log initial shift history`;
code = code.replace(createOrig, createNew);

fs.writeFileSync('src/components/EmployeeDirectory.tsx', code);
