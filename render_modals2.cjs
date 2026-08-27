const fs = require('fs');
let code = fs.readFileSync('src/components/EmployeeDirectory.tsx', 'utf8');

const modalsJSX = `
      {/* --- CUSTOM 2-STEP VERIFICATION MODALS --- */}
      {deleteModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-rose-50 flex justify-between items-center">
              <h3 className="font-bold text-rose-800">Confirm Deletion</h3>
              <button onClick={() => setDeleteModal(null)} className="text-rose-500 hover:bg-rose-100 p-1 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to permanently delete <strong>{deleteModal.name}</strong> ({deleteModal.id})? This action cannot be undone.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Two-Step Verification: Admin Password</label>
                <input 
                  type="password" 
                  value={deleteModal.password} 
                  onChange={e => setDeleteModal({ ...deleteModal, password: e.target.value as any })}
                  placeholder="Enter fixed password (123456)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setDeleteModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button 
                onClick={() => {
                  if (deleteModal.password !== '123456') {
                    showToast('Incorrect password. Deletion cancelled.');
                    return;
                  }
                  deleteEmployeeConfirmed(deleteModal.id, deleteModal.name);
                  setDeleteModal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal?.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-200 bg-indigo-50 flex justify-between items-center">
              <h3 className="font-bold text-indigo-800">Confirm Modification</h3>
              <button onClick={() => setEditModal(null)} className="text-indigo-500 hover:bg-indigo-100 p-1 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-slate-700">
                Are you sure you want to modify <strong>{editModal.emp?.name}</strong> ({editModal.emp?.id})?
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Two-Step Verification: Admin Password</label>
                <input 
                  type="password" 
                  value={editModal.password} 
                  onChange={e => setEditModal({ ...editModal, password: e.target.value as any })}
                  placeholder="Enter fixed password (123456)"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2">
              <button onClick={() => setEditModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium">Cancel</button>
              <button 
                onClick={() => {
                  if (editModal.password !== '123456') {
                    showToast('Incorrect password. Modification cancelled.');
                    return;
                  }
                  if (editModal.emp) proceedWithEdit(editModal.emp);
                  setEditModal(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
              >
                Confirm Edit
              </button>
            </div>
          </div>
        </div>
      )}
`;

const lastDivIndex = code.lastIndexOf('</div>');
code = code.substring(0, lastDivIndex) + modalsJSX + '\n    </div>\n' + code.substring(lastDivIndex + 6);

fs.writeFileSync('src/components/EmployeeDirectory.tsx', code);
