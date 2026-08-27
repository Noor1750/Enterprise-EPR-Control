import { useState } from 'react';
import { X, Plus, Trash2, Edit2, Save, Check, Settings, Package, Tag, Wrench, Shield } from 'lucide-react';
import { UserSecurityScope } from '../../lib/security';
import AdminDeleteConfirmModal from '../common/AdminDeleteConfirmModal';

interface BreakdownSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSettings: (settingsData: string[][]) => Promise<void>;
  currentSettingsRows: string[][];
  userSecurityScope?: UserSecurityScope;
}

export default function BreakdownSettingsModal({
  isOpen,
  onClose,
  onSaveSettings,
  currentSettingsRows,
  userSecurityScope
}: BreakdownSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'failureMode' | 'category' | 'activity' | 'sparePart' | 'uom'>('failureMode');
  const [settings, setSettings] = useState<string[][]>(currentSettingsRows);
  const [newItemValue, setNewItemValue] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemCost, setNewItemCost] = useState('0.00');
  const [isSaving, setIsSaving] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string[] | null>(null);

  if (!isOpen) return null;

  const canEdit = Boolean(userSecurityScope?.isAdmin || userSecurityScope?.isSuperuser || userSecurityScope?.isSupervisor);

  // Filter items by type
  const currentItems = settings.filter(r => {
    if (activeTab === 'failureMode') return r[0] === 'FailureMode';
    if (activeTab === 'category') return r[0] === 'Category';
    if (activeTab === 'activity') return r[0] === 'Activity';
    if (activeTab === 'sparePart') return r[0] === 'SparePart';
    if (activeTab === 'uom') return r[0] === 'UOM';
    return false;
  });

  const handleAddItem = () => {
    if (!newItemValue.trim()) return;

    let typeStr = 'FailureMode';
    if (activeTab === 'category') typeStr = 'Category';
    if (activeTab === 'activity') typeStr = 'Activity';
    if (activeTab === 'sparePart') typeStr = 'SparePart';
    if (activeTab === 'uom') typeStr = 'UOM';

    const newRow = [
      typeStr,
      newItemValue.trim(),
      activeTab === 'sparePart' ? (parseFloat(newItemCost) || 0).toFixed(2) : (newItemDescription.trim() || newItemValue.trim()),
      'Active'
    ];

    setSettings(prev => [...prev, newRow]);
    setNewItemValue('');
    setNewItemDescription('');
    setNewItemCost('0.00');
  };

  const handleDeleteItem = (indexInFiltered: number) => {
    const item = currentItems[indexInFiltered];
    if (!item) return;
    setItemToDelete(item);
  };

  const handleExecuteDeleteItem = () => {
    if (!itemToDelete) return;
    setSettings(prev => prev.filter(r => r !== itemToDelete));
    setItemToDelete(null);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings(settings);
      onClose();
    } catch (err) {
      console.error('Failed to save breakdown settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#1A2A3A] text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[#F87C6C]" />
            </div>
            <div>
              <h3 className="text-base font-bold">Breakdown & Maintenance Settings</h3>
              <p className="text-xs text-slate-300">Customize failure modes, categories, activities, spare parts catalog & units</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('failureMode')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'failureMode' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-3.5 h-3.5" /> Failure Modes ({settings.filter(r => r[0] === 'FailureMode').length})
          </button>
          <button
            onClick={() => setActiveTab('category')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'category' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" /> Categories ({settings.filter(r => r[0] === 'Category').length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'activity' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Check className="w-3.5 h-3.5" /> Activities ({settings.filter(r => r[0] === 'Activity').length})
          </button>
          <button
            onClick={() => setActiveTab('sparePart')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'sparePart' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-3.5 h-3.5" /> Spare Parts ({settings.filter(r => r[0] === 'SparePart').length})
          </button>
          <button
            onClick={() => setActiveTab('uom')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'uom' ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Units (UOM)
          </button>
        </div>

        {/* List & Add Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Add New Item */}
          {canEdit && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3">
              <input
                type="text"
                placeholder={activeTab === 'sparePart' ? 'Part / Service Name...' : 'Item Name...'}
                value={newItemValue}
                onChange={(e) => setNewItemValue(e.target.value)}
                className="flex-1 min-w-[180px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {activeTab === 'sparePart' ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Unit Cost"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-24 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Optional description..."
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className="flex-1 min-w-[180px] bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              )}
              <button
                onClick={handleAddItem}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>
          )}

          {/* Items List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 font-bold text-slate-600 uppercase text-[11px] border-b border-slate-200">
                  <th className="py-2.5 px-4">Name / Value</th>
                  <th className="py-2.5 px-4">{activeTab === 'sparePart' ? 'Default Cost ($)' : 'Description'}</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  {canEdit && <th className="py-2.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 italic">
                      No configuration items found in this section.
                    </td>
                  </tr>
                ) : (
                  currentItems.map((item, idx) => (
                    <tr key={`${item[0]}-${item[1]}-${idx}`} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-4 font-bold text-slate-900">{item[1]}</td>
                      <td className="py-2.5 px-4 text-slate-600 font-mono">
                        {activeTab === 'sparePart' ? `$${Number(item[2] || 0).toFixed(2)}` : item[2]}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                          {item[3] || 'Active'}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Changes will take effect across breakdown logs and reporting.
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            {canEdit && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#1ABB9C] hover:bg-[#159d83] rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            )}
          </div>
        </div>

      </div>

      {/* Admin Password Confirmation Modal */}
      <AdminDeleteConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Delete Breakdown Category / Item"
        itemName={itemToDelete ? `${itemToDelete[0]}: ${itemToDelete[1]}` : undefined}
        itemDetails={itemToDelete?.[2] ? `Details: ${itemToDelete[2]}` : undefined}
        warningMessage="This item will be removed from master breakdown settings. Please enter the Admin Deletion Password configured in Settings → ERP Settings."
        confirmButtonText="Verify & Delete Item"
        onConfirm={handleExecuteDeleteItem}
        onClose={() => setItemToDelete(null)}
      />
    </div>
  );
}

