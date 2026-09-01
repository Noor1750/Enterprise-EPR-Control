import React, { useRef, useState, useMemo } from 'react';
import { 
  Camera, Upload, X, Check, Clock, AlertTriangle, ShieldCheck, 
  Shirt, Footprints, HeartHandshake, User, Briefcase, Phone,
  MapPin, GraduationCap, Plus, Trash2, Copy
} from 'lucide-react';
import { 
  EmployeeFormData, 
  VOLUNTEER_ROLES, 
  TSHIRT_SIZES, 
  SHOE_SIZES, 
  SHOE_SIZE_MAPPINGS,
  EducationalQualification,
  compressImage 
} from './employeeTypes';
import { ShiftType, ShiftMode } from '../../lib/shiftEngine';
import { ShiftIcon } from '../common/ShiftBadge';
import { getBangladeshDistricts, getPoliceStationsForDistrict } from '../../lib/bangladeshLocations';
import { format } from 'date-fns';

interface EmployeeAddEditModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: EmployeeFormData;
  setFormData: React.Dispatch<React.SetStateAction<EmployeeFormData>>;
  supervisors: string[][];
  managers: string[][];
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function EmployeeAddEditModal({
  isOpen,
  isEditing,
  formData,
  setFormData,
  supervisors,
  managers,
  onClose,
  onSubmit
}: EmployeeAddEditModalProps) {
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [sameAsPresent, setSameAsPresent] = useState(false);

  // Education list local state
  const [newEduDegree, setNewEduDegree] = useState('');
  const [newEduInstitute, setNewEduInstitute] = useState('');
  const [newEduYear, setNewEduYear] = useState('');
  const [newEduResult, setNewEduResult] = useState('');

  // Bangladesh Location Master lists
  const bangladeshDistricts = useMemo(() => getBangladeshDistricts(), []);
  const presentThanas = useMemo(() => getPoliceStationsForDistrict(formData.presentDistrict), [formData.presentDistrict]);
  const permanentThanas = useMemo(() => getPoliceStationsForDistrict(formData.permanentDistrict), [formData.permanentDistrict]);

  // Parse existing education
  const educationItems: EducationalQualification[] = useMemo(() => {
    if (formData.educationList && formData.educationList.length > 0) {
      return formData.educationList;
    }
    if (formData.education) {
      try {
        const parsed = JSON.parse(formData.education);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Plain text fallback
        return [{ degree: formData.education, institute: '', passingYear: '', result: '' }];
      }
    }
    return [];
  }, [formData.education, formData.educationList]);

  if (!isOpen) return null;

  // Handle "Same as Present Address"
  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsPresent(checked);
    if (checked) {
      setFormData(prev => ({
        ...prev,
        permanentAddress: prev.presentAddress,
        permanentDistrict: prev.presentDistrict,
        permanentThana: prev.presentThana
      }));
    }
  };

  // Add education qualification
  const handleAddEducation = () => {
    if (!newEduDegree.trim()) {
      alert('Please enter a degree or certificate name.');
      return;
    }
    const updated = [
      ...educationItems,
      {
        degree: newEduDegree.trim(),
        institute: newEduInstitute.trim(),
        passingYear: newEduYear.trim(),
        result: newEduResult.trim()
      }
    ];
    setFormData(prev => ({
      ...prev,
      educationList: updated,
      education: JSON.stringify(updated)
    }));
    setNewEduDegree('');
    setNewEduInstitute('');
    setNewEduYear('');
    setNewEduResult('');
  };

  const handleRemoveEducation = (index: number) => {
    const updated = educationItems.filter((_, idx) => idx !== index);
    setFormData(prev => ({
      ...prev,
      educationList: updated,
      education: JSON.stringify(updated)
    }));
  };

  // Handle direct device photo selection
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    try {
      setIsCompressingPhoto(true);
      const compressedDataUrl = await compressImage(file);
      setFormData(prev => ({ ...prev, profilePicture: compressedDataUrl }));
    } catch (err) {
      console.error('Failed to process image:', err);
      alert('Failed to process the selected image.');
    } finally {
      setIsCompressingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  // Toggle volunteer roles (stored as comma-separated values)
  const currentVolunteerList = (formData.volunteer || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const toggleVolunteerRole = (roleId: string) => {
    let updated: string[];
    if (currentVolunteerList.includes(roleId)) {
      updated = currentVolunteerList.filter(r => r !== roleId);
    } else {
      updated = [...currentVolunteerList, roleId];
    }
    setFormData(prev => ({
      ...prev,
      volunteer: updated.join(', ')
    }));
  };

  // Handle status change: auto-prompt inactive date
  const handleStatusChange = (newStatus: 'Active' | 'Inactive') => {
    if (newStatus === 'Inactive') {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      setFormData(prev => ({
        ...prev,
        status: 'Inactive',
        inactiveDate: prev.inactiveDate || todayStr
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        status: 'Active',
        inactiveDate: ''
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {isEditing ? <User className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditing ? `Edit Employee Profile: ${formData.name}` : 'Add New Employee'}
              </h3>
              <p className="text-xs text-slate-500">
                Configure employee master record, photo, category, apparel sizes, and volunteer committees.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          
          {/* Section 1: Profile Photo & Basic Identity */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              
              {/* Photo Upload Box */}
              <div className="flex flex-col items-center shrink-0 space-y-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={photoInputRef} 
                  onChange={handlePhotoSelect} 
                  className="hidden" 
                />
                
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {formData.profilePicture ? (
                      <img 
                        src={formData.profilePicture} 
                        alt="Profile Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Camera className="w-6 h-6 mx-auto mb-1 text-slate-300" />
                        <span className="text-[10px] font-medium block">No Photo</span>
                      </div>
                    )}
                  </div>

                  {formData.profilePicture && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, profilePicture: '' }))}
                      title="Remove Photo"
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isCompressingPhoto}
                  onClick={() => photoInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[11px] font-semibold flex items-center shadow-sm transition"
                >
                  <Upload className="w-3 h-3 mr-1 text-slate-500" />
                  {isCompressingPhoto ? 'Processing...' : formData.profilePicture ? 'Change Photo' : 'Attach Photo'}
                </button>
                <span className="text-[10px] text-slate-400">Attach directly from device</span>
              </div>

              {/* Identity Fields */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Employee ID No *</label>
                  <input 
                    required 
                    readOnly={isEditing} 
                    value={formData.id} 
                    onChange={e => setFormData({ ...formData, id: e.target.value.trim() })} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-indigo-500 bg-white" 
                    placeholder="e.g. EMP-1001"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white" 
                    placeholder="e.g. Mohammed Al-Amin"
                  />
                </div>

                {/* Management vs Non-Management Selector */}
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Employee Category / Classification *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: 'Management' })}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${formData.category === 'Management' ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold ring-1 ring-purple-500' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">👔</span>
                        <div>
                          <div className="font-bold text-xs">Management</div>
                          <div className="text-[10px] text-slate-500 font-normal">Executive, Incharge, Admin, Officer</div>
                        </div>
                      </div>
                      {formData.category === 'Management' && <Check className="w-4 h-4 text-purple-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: 'Non-Management' })}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition ${formData.category === 'Non-Management' ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-500' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">👷</span>
                        <div>
                          <div className="font-bold text-xs">Non-Management</div>
                          <div className="text-[10px] text-slate-500 font-normal">Operator, Technician, Helper, Staff</div>
                        </div>
                      </div>
                      {formData.category === 'Non-Management' && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Department, Role & Hierarchy */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Department *</label>
              <input 
                required 
                value={formData.department} 
                onChange={e => setFormData({ ...formData, department: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                placeholder="e.g. Cutting, Sewing, RFID"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Designation</label>
              <input 
                value={formData.designation} 
                onChange={e => setFormData({ ...formData, designation: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                placeholder="e.g. Senior Operator"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Working Area (Section)</label>
              <input 
                value={formData.workingArea} 
                onChange={e => setFormData({ ...formData, workingArea: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" 
                placeholder="Floor 2, Line 5"
              />
            </div>
          </div>

          {/* Section 3: Status & Inactive Date Prompt */}
          <div className={`p-3.5 rounded-xl border transition-all ${formData.status === 'Inactive' ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Employment Status *</label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Active')}
                    className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center space-x-1 ${formData.status === 'Active' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>Active</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStatusChange('Inactive')}
                    className={`flex-1 py-2 text-xs font-bold transition flex items-center justify-center space-x-1 ${formData.status === 'Inactive' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                  >
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {formData.status === 'Inactive' ? (
                <>
                  <div>
                    <label className="block font-bold text-rose-800 mb-1 flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Inactive / Separation Date *</span>
                    </label>
                    <input 
                      type="date" 
                      required
                      value={formData.inactiveDate} 
                      onChange={e => setFormData({ ...formData, inactiveDate: e.target.value })} 
                      className="w-full px-3 py-2 border border-rose-300 bg-white rounded-lg text-rose-900 font-semibold focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-rose-800 mb-1">Reason / Separation Remarks</label>
                    <input 
                      type="text" 
                      value={formData.remarks} 
                      onChange={e => setFormData({ ...formData, remarks: e.target.value })} 
                      className="w-full px-3 py-2 border border-rose-300 bg-white rounded-lg focus:ring-2 focus:ring-rose-500"
                      placeholder="e.g. Resigned, Relocated, Retired"
                    />
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 flex items-center text-xs text-slate-500 pt-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mr-1.5 shrink-0" />
                  <span>Employee is actively on factory roster and participating in scheduled shift rotations.</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Apparel Sizes (T-Shirt Size & Shoe Size) */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
            <div className="flex items-center space-x-1.5 text-slate-800 font-bold mb-2">
              <Shirt className="w-4 h-4 text-indigo-600" />
              <span>Apparel & Uniform Sizing</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <Shirt className="w-3.5 h-3.5 text-slate-500" />
                  <span>T-Shirt Size</span>
                </label>
                <select
                  value={formData.tShirtSize}
                  onChange={e => setFormData({ ...formData, tShirtSize: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select T-Shirt Size...</option>
                  {TSHIRT_SIZES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center space-x-1">
                  <Footprints className="w-3.5 h-3.5 text-slate-500" />
                  <span>Safety Shoe Size (BD / EU)</span>
                </label>
                <select
                  value={formData.shoeSize}
                  onChange={e => setFormData({ ...formData, shoeSize: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Shoe Size...</option>
                  {SHOE_SIZE_MAPPINGS.map(opt => (
                    <option key={opt.eu} value={opt.eu}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Volunteer Committees (Checkboxes with Tick Marks) */}
          <div className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1.5 text-indigo-900 font-bold">
                <HeartHandshake className="w-4 h-4 text-indigo-600" />
                <span>Volunteer & Safety Committee Memberships</span>
              </div>
              <span className="text-[11px] text-indigo-600 font-semibold">
                {currentVolunteerList.length} Selected
              </span>
            </div>
            
            <p className="text-[11px] text-slate-500 mb-2.5">
              Select all committees and emergency teams this employee participates in:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {VOLUNTEER_ROLES.map((role) => {
                const isSelected = currentVolunteerList.includes(role.id);
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => toggleVolunteerRole(role.id)}
                    className={`p-2 rounded-lg border text-left flex items-center justify-between transition ${isSelected ? 'border-indigo-600 bg-indigo-100/70 text-indigo-900 font-bold ring-1 ring-indigo-500' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="flex items-center space-x-1.5 overflow-hidden">
                      <span className="text-sm shrink-0">{role.icon}</span>
                      <span className="text-[11px] truncate">{role.label}</span>
                    </div>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Shift & Rotation Settings */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Shift Schedule & Weekly Rotation Settings</span>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1.5">Shift Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['Day Shift', 'Night Shift', 'General'] as ShiftType[]).map((sh) => {
                  const isSelected = formData.shift === sh;
                  return (
                    <button
                      key={sh}
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        shift: sh,
                        rotationStartingShift: sh
                      })}
                      className={`p-2.5 rounded-xl border text-center font-bold transition flex flex-col items-center justify-center ${isSelected ? 'border-indigo-600 bg-indigo-50/90 text-indigo-900 ring-2 ring-indigo-500 shadow-xs' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'}`}
                    >
                      <ShiftIcon shift={sh} className="w-4.5 h-4.5 mb-1" />
                      <span className="text-xs">{sh}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Rotation Mode *</label>
                <select 
                  value={formData.shiftMode} 
                  onChange={e => setFormData({ ...formData, shiftMode: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="Automatic Rotation">Automatic Weekly Rotation (Sat-Thu)</option>
                  <option value="Manual Override">Manual Override (Fixed Shift)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Effective Date *</label>
                <input 
                  type="date" 
                  value={formData.effectiveDate} 
                  onChange={e => setFormData({ ...formData, effectiveDate: e.target.value })} 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 7: Hierarchy, Contact & Compensation */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Supervisor</label>
              <select 
                value={formData.supervisor} 
                onChange={e => setFormData({ ...formData, supervisor: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Supervisor...</option>
                {supervisors.map(s => (
                  <option key={s[0]} value={s[0]}>{s[0]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Manager</label>
              <select 
                value={formData.manager} 
                onChange={e => setFormData({ ...formData, manager: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Manager...</option>
                {managers.map(m => (
                  <option key={m[0]} value={m[0]}>{m[0]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date of Join</label>
              <input 
                type="date" 
                value={formData.dateOfJoin} 
                onChange={e => setFormData({ ...formData, dateOfJoin: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phone</label>
              <input 
                value={formData.phone} 
                onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
                placeholder="+8801..."
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Emergency Contact</label>
              <input 
                value={formData.emergency} 
                onChange={e => setFormData({ ...formData, emergency: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
                placeholder="+8801..."
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Blood Group</label>
              <select 
                value={formData.bloodGroup} 
                onChange={e => setFormData({ ...formData, bloodGroup: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">Select...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date of Birth</label>
              <input 
                type="date" 
                value={formData.dateOfBirth} 
                onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Salary</label>
              <input 
                type="number" 
                value={formData.salary} 
                onChange={e => setFormData({ ...formData, salary: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">OT Rate (/Hr)</label>
              <input 
                type="number" 
                step="0.01" 
                value={formData.overtimeRate} 
                onChange={e => setFormData({ ...formData, overtimeRate: e.target.value })} 
                className="w-full px-3 py-2 border border-slate-200 rounded-lg" 
              />
            </div>
          </div>

          {/* Section 8: Personal Information (Marital Status & NID) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
              <User className="w-4 h-4 text-indigo-600" />
              <span>Personal Details & Identity</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Marital Status</label>
                <select
                  value={formData.maritalStatus || ''}
                  onChange={e => setFormData({ ...formData, maritalStatus: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Status...</option>
                  <option value="Married">Married</option>
                  <option value="Unmarried">Unmarried (Single)</option>
                  <option value="Single">Single</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">National ID No. (NID)</label>
                <input
                  type="text"
                  value={formData.nationalId || ''}
                  onChange={e => setFormData({ ...formData, nationalId: e.target.value })}
                  placeholder="e.g. 19901234567890"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white font-mono focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 9: Present Address & Cascading Bangladesh Locations */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>Present Address</span>
              </div>
              <span className="text-[11px] text-slate-500">Current Residence</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Street / House / Road / Village</label>
                <input
                  type="text"
                  value={formData.presentAddress || ''}
                  onChange={e => setFormData({ ...formData, presentAddress: e.target.value })}
                  placeholder="e.g. House 14, Road 5, Block B, Tongi"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <select
                    value={formData.presentDistrict || ''}
                    onChange={e => {
                      const newDist = e.target.value;
                      const validThanas = getPoliceStationsForDistrict(newDist);
                      setFormData(prev => ({
                        ...prev,
                        presentDistrict: newDist,
                        presentThana: validThanas.length > 0 ? validThanas[0] : ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select District...</option>
                    {bangladeshDistricts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Police Station (Thana)</label>
                  <select
                    value={formData.presentThana || ''}
                    onChange={e => setFormData({ ...formData, presentThana: e.target.value })}
                    disabled={!formData.presentDistrict}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select Thana...</option>
                    {presentThanas.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 10: Permanent Address with "Same as Present" Option */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Permanent Address</span>
              </div>

              {/* Same as Present Address Toggle */}
              <label className="flex items-center space-x-2 text-xs font-semibold text-indigo-700 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                <input
                  type="checkbox"
                  checked={sameAsPresent}
                  onChange={e => handleToggleSameAddress(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span className="flex items-center gap-1">
                  <Copy className="w-3 h-3" /> Same as Present Address
                </span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Street / House / Road / Village</label>
                <input
                  type="text"
                  value={formData.permanentAddress || ''}
                  onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })}
                  placeholder="e.g. Village: Ramnagar, Post: Joydebpur"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <select
                    value={formData.permanentDistrict || ''}
                    onChange={e => {
                      const newDist = e.target.value;
                      const validThanas = getPoliceStationsForDistrict(newDist);
                      setFormData(prev => ({
                        ...prev,
                        permanentDistrict: newDist,
                        permanentThana: validThanas.length > 0 ? validThanas[0] : ''
                      }));
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select District...</option>
                    {bangladeshDistricts.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Police Station (Thana)</label>
                  <select
                    value={formData.permanentThana || ''}
                    onChange={e => setFormData({ ...formData, permanentThana: e.target.value })}
                    disabled={!formData.permanentDistrict}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">Select Thana...</option>
                    {permanentThanas.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 11: Educational Qualifications */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                <GraduationCap className="w-4 h-4 text-purple-600" />
                <span>Educational Qualifications</span>
              </div>
              <span className="text-[11px] text-purple-700 font-semibold">
                {educationItems.length} Added
              </span>
            </div>

            {/* List of existing qualifications */}
            {educationItems.length > 0 && (
              <div className="space-y-2">
                {educationItems.map((edu, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{edu.degree}</span>
                      {edu.institute && <span className="text-slate-600"> • {edu.institute}</span>}
                      {edu.passingYear && <span className="text-slate-500 font-mono"> ({edu.passingYear})</span>}
                      {edu.result && <span className="ml-1 text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">GPA/Div: {edu.result}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEducation(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded transition cursor-pointer"
                      title="Remove Qualification"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Qualification Inputs */}
            <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2.5">
              <div className="font-semibold text-slate-700 text-[11px]">Add Qualification:</div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Degree / Certificate (e.g. SSC, HSC, B.Sc)"
                  value={newEduDegree}
                  onChange={e => setNewEduDegree(e.target.value)}
                  className="sm:col-span-2 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  placeholder="Institute / Board"
                  value={newEduInstitute}
                  onChange={e => setNewEduInstitute(e.target.value)}
                  className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    placeholder="Year"
                    value={newEduYear}
                    onChange={e => setNewEduYear(e.target.value)}
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Result/GPA"
                    value={newEduResult}
                    onChange={e => setNewEduResult(e.target.value)}
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-sm transition"
            >
              {isEditing ? 'Update Employee' : 'Save Employee'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
