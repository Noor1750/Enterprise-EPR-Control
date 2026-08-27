const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');

// We need to inject state variables for the custom modals
const stateInjectionOrig = `  const [employees, setEmployees] = useState<Employee[]>([]);`;
const stateInjectionNew = `  const [employees, setEmployees] = useState<Employee[]>([]);
  // Custom Modals State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string; password: "" } | null>(null);
  const [editModal, setEditModal] = useState<{ isOpen: boolean; emp: EmployeeShiftState | null; password: "" } | null>(null);`;
code = code.replace(stateInjectionOrig, stateInjectionNew);

// Replace handleDelete
const handleDeleteOrig = `  const handleDelete = (id: string, name: string) => {
    if (!window.confirm(\`Are you sure you want to delete employee \${name} (\${id})? This action cannot be undone.\`)) {
      return;
    }
    const pwd = window.prompt("Two-step verification: Please enter the fixed admin password to confirm deletion.");
    if (pwd !== "123456") {
      alert("Incorrect password. Deletion cancelled.");
      return;
    }
    deleteEmployeeConfirmed(id, name);
  };`;
const handleDeleteNew = `  const handleDelete = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, id, name, password: "" });
  };`;
code = code.replace(handleDeleteOrig, handleDeleteNew);

// Replace handleEditClick
const handleEditOrig = `  const handleEditClick = (emp: EmployeeShiftState) => {
    if (!window.confirm(\`Are you sure you want to modify employee \${emp.name} (\${emp.id})?\`)) {
      return;
    }
    const pwd = window.prompt("Two-step verification: Please enter the fixed admin password to confirm modification.");
    if (pwd !== "123456") {
      alert("Incorrect password. Modification cancelled.");
      return;
    }
    const raw = emp.rawRow;`;
const handleEditNew = `  const handleEditClick = (emp: EmployeeShiftState) => {
    setEditModal({ isOpen: true, emp, password: "" });
  };
  
  const proceedWithEdit = (emp: EmployeeShiftState) => {
    const raw = emp.rawRow;`;
code = code.replace(handleEditOrig, handleEditNew);

// Find the closing brace of handleEditClick
const handleEditEndOrig = `    setFormData(data);
    setEditRowIndex(raw);
    setIsEditing(true);
    setShowAddEditModal(true);
  };`;
const handleEditEndNew = `    setFormData(data);
    setEditRowIndex(raw);
    setIsEditing(true);
    setShowAddEditModal(true);
  };`;
// Actually, proceedWithEdit ends exactly where handleEditClick ended.
code = code.replace(`    setIsEditing(true);
    setShowAddEditModal(true);
  };`, `    setIsEditing(true);
    setShowAddEditModal(true);
  };`);
// Wait, I can just replace the whole handleEditClick to proceedWithEdit.

fs.writeFileSync('src/components/EmployeeDirectory.tsx', code);
