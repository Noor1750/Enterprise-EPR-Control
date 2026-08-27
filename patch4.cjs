const fs = require('fs');
const path = './src/components/MachineCapacity.tsx';
let code = fs.readFileSync(path, 'utf8');

const target = `            <div className="col-span-1 md:col-span-3 lg:col-span-4 flex gap-3 justify-end mt-6 pt-6 border-t border-gray-100">`;
const replacement = `            <div className="col-span-1 md:col-span-3 lg:col-span-4 mt-6">
              <h4 className="text-sm font-bold text-gray-800 border-b pb-2 mb-4">Machine Lifecycle & Identification</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Model Number</label>
                  <input placeholder="Model" value={mForm.modelNumber} onChange={e => setMForm({...mForm, modelNumber: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Serial Number</label>
                  <input required placeholder="Serial No." value={mForm.serialNumber} onChange={e => setMForm({...mForm, serialNumber: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Tag</label>
                  <input placeholder="Asset Tag" value={mForm.assetTag} onChange={e => setMForm({...mForm, assetTag: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Onboard Date</label>
                  <input required type="date" value={mForm.onboardDate} onChange={e => setMForm({...mForm, onboardDate: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Obsolete Date</label>
                  <input type="date" value={mForm.obsoleteDate} onChange={e => setMForm({...mForm, obsoleteDate: e.target.value})} className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#1ECA98] outline-none" />
                </div>
                <div className="md:col-span-3 lg:col-span-5 flex gap-4 mt-2">
                  <div className="flex-1 bg-blue-50 p-3 rounded-lg border border-blue-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800">Machine Age</span>
                    <span className="text-sm font-black text-blue-900">{calculateMachineAge(mForm.onboardDate, new Date().toISOString())?.formatted || 'Not Available'}</span>
                  </div>
                  <div className="flex-1 bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-600">Status</span>
                    <span className={\`text-sm font-black \${getMachineStatus(mForm.onboardDate, mForm.obsoleteDate, new Date().toISOString()) === 'Active' ? 'text-emerald-600' : 'text-red-600'}\`}>
                      {getMachineStatus(mForm.onboardDate, mForm.obsoleteDate, new Date().toISOString())}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-1 md:col-span-3 lg:col-span-4 flex gap-3 justify-end mt-6 pt-6 border-t border-gray-100">`;

code = code.replace(target, replacement);
fs.writeFileSync(path, code);
