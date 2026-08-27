const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');

// We will use standard string manipulation to patch it.
// Replace handleDelete
const handleDeleteOrig = `
  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(\`Are you sure you want to delete employee \${name} (\${id})? This action cannot be undone.\`)) {
      return;
    }
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      showToast(\`Employee \${name} deleted.\`);
      loadData(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete employee: ' + err.message);
    }
  };
`;

const handleDeleteNew = `
  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(\`Are you sure you want to delete employee \${name} (\${id})? This action cannot be undone.\`)) {
      return;
    }
    const pwd = window.prompt("Two-step verification: Please enter the fixed admin password to confirm deletion.");
    if (pwd !== "123456") {
      alert("Incorrect password. Deletion cancelled.");
      return;
    }
    deleteEmployeeConfirmed(id, name);
  };

  const deleteEmployeeConfirmed = async (id: string, name: string) => {
    try {
      await deleteRowByPrimaryKey(spreadsheetId, 'Employees', id);
      showToast(\`Employee \${name} deleted.\`);
      loadData(false);
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete employee: ' + err.message);
    }
  };
`;

code = code.replace(handleDeleteOrig, handleDeleteNew);

const handleEditOrig = `
  const handleEditClick = (emp: EmployeeShiftState) => {
    const raw = emp.rawRow;
`;

const handleEditNew = `
  const handleEditClick = (emp: EmployeeShiftState) => {
    if (!window.confirm(\`Are you sure you want to modify employee \${emp.name} (\${emp.id})?\`)) {
      return;
    }
    const pwd = window.prompt("Two-step verification: Please enter the fixed admin password to confirm modification.");
    if (pwd !== "123456") {
      alert("Incorrect password. Modification cancelled.");
      return;
    }
    const raw = emp.rawRow;
`;

code = code.replace(handleEditOrig, handleEditNew);

const handleSubmitOrig = `
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct 26 columns row
`;

const handleSubmitNew = `
  const handleEmployeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isEditing) {
      const exists = employees.some(emp => emp.id.trim().toLowerCase() === formData.id.trim().toLowerCase());
      if (exists) {
        alert("Employee ID already exists. Duplicate IDs are not allowed.");
        return;
      }
    }
    
    // Construct 26 columns row
`;

code = code.replace(handleSubmitOrig, handleSubmitNew);

fs.writeFileSync('src/components/EmployeeDirectory.tsx', code);
