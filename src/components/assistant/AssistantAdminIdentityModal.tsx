import React, { useState, useRef, useEffect } from 'react';
import { 
  AssistantProfile, 
  ASSISTANT_PROFILES, 
  AssistantProfileCustomization, 
  AssistantSettings 
} from '../../types/assistant';
import { 
  ShieldCheck, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Sparkles, 
  RotateCcw, 
  Check, 
  X, 
  AlertCircle, 
  User, 
  Briefcase,
  CheckCircle2
} from 'lucide-react';

interface AssistantAdminIdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AssistantSettings;
  onSaveCustomization: (profileId: string, customization: AssistantProfileCustomization | null) => void;
  activeProfile: AssistantProfile;
}

interface CuratedAvatar {
  id: string;
  name: string;
  category: 'Corporate' | 'Engineering' | 'Tech AI';
  url: string;
}

const CURATED_AVATARS: CuratedAvatar[] = [
  {
    id: 'exec-female-1',
    name: 'Executive Lead (Female)',
    category: 'Corporate',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'hr-female-2',
    name: 'Workforce Director (Female)',
    category: 'Corporate',
    url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'mgmt-female-3',
    name: 'Quality Assurance Lead (Female)',
    category: 'Corporate',
    url: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'corp-female-4',
    name: 'Operations VP (Female)',
    category: 'Corporate',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'engineer-male-1',
    name: 'Plant Engineer (Male)',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'ops-male-2',
    name: 'Continuous Improvement (Male)',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'director-male-3',
    name: 'General Manager (Male)',
    category: 'Corporate',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'tech-male-4',
    name: 'Automation Architect (Male)',
    category: 'Engineering',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'cyber-bot-1',
    name: 'Neural Co-Pilot 3D',
    category: 'Tech AI',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'hologram-bot-2',
    name: 'Quantum AI Node',
    category: 'Tech AI',
    url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'cyber-bot-3',
    name: 'Smart Industry Android',
    category: 'Tech AI',
    url: 'https://images.unsplash.com/photo-1617791160505-6f00504e3519?w=240&auto=format&fit=crop&q=80'
  },
  {
    id: 'energy-orb-4',
    name: 'Luminous Core Assistant',
    category: 'Tech AI',
    url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=240&auto=format&fit=crop&q=80'
  }
];

export const AssistantAdminIdentityModal: React.FC<AssistantAdminIdentityModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveCustomization,
  activeProfile
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string>(activeProfile.id);
  const [nameInput, setNameInput] = useState<string>('');
  const [titleInput, setTitleInput] = useState<string>('');
  const [avatarUrlInput, setAvatarUrlInput] = useState<string>('');
  const [photoSourceTab, setPhotoSourceTab] = useState<'presets' | 'upload' | 'url'>('presets');
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<'All' | 'Corporate' | 'Engineering' | 'Tech AI'>('All');
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get base profile being customized
  const targetBaseProfile = ASSISTANT_PROFILES.find(p => p.id === selectedProfileId) || activeProfile;

  // Initialize or update fields when target profile changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const override = settings.profileOverrides?.[selectedProfileId];
      setNameInput(override?.name || targetBaseProfile.name);
      setTitleInput(override?.title || targetBaseProfile.title);
      setAvatarUrlInput(override?.avatarUrl || targetBaseProfile.avatarUrl);
      setUploadError(null);
    }
  }, [isOpen, selectedProfileId, settings.profileOverrides]);

  if (!isOpen) return null;

  const currentOverride = settings.profileOverrides?.[selectedProfileId];
  const isCustomized = Boolean(currentOverride?.name || currentOverride?.avatarUrl || currentOverride?.title);

  // Handle file reading
  const processImageFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setAvatarUrlInput(result);
        setPhotoSourceTab('upload');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = () => {
    const trimmedName = nameInput.trim();
    const trimmedTitle = titleInput.trim();
    const trimmedAvatar = avatarUrlInput.trim();

    if (!trimmedName) {
      setUploadError('Assistant Name cannot be empty.');
      return;
    }

    // Check if values match factory default
    const isDefault = 
      trimmedName === targetBaseProfile.name && 
      trimmedTitle === targetBaseProfile.title && 
      trimmedAvatar === targetBaseProfile.avatarUrl;

    if (isDefault) {
      onSaveCustomization(selectedProfileId, null);
    } else {
      onSaveCustomization(selectedProfileId, {
        name: trimmedName,
        title: trimmedTitle || undefined,
        avatarUrl: trimmedAvatar || undefined
      });
    }

    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      onClose();
    }, 900);
  };

  const handleResetToDefault = () => {
    setNameInput(targetBaseProfile.name);
    setTitleInput(targetBaseProfile.title);
    setAvatarUrlInput(targetBaseProfile.avatarUrl);
    setUploadError(null);
    onSaveCustomization(selectedProfileId, null);

    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
    }, 1200);
  };

  const filteredPresets = CURATED_AVATARS.filter(a => 
    avatarCategoryFilter === 'All' ? true : a.category === avatarCategoryFilter
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        id="assistant-admin-identity-modal"
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  Virtual Assistant Identity & Photo
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Admin Authority
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Customize the Co-Pilot name, executive title, and profile portrait across all operations
              </p>
            </div>
          </div>
          <button
            type="button"
            id="close-assistant-admin-modal-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-950/70">
          {/* Target Persona Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Select Assistant Persona to Customize:</span>
              <span className="text-[11px] text-slate-400">
                Currently Active: <strong className="text-indigo-400">{activeProfile.name}</strong>
              </span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ASSISTANT_PROFILES.map((p) => {
                const isTarget = p.id === selectedProfileId;
                const hasCustom = Boolean(settings.profileOverrides?.[p.id]);
                const effectivePhoto = settings.profileOverrides?.[p.id]?.avatarUrl || p.avatarUrl;
                const effectiveName = settings.profileOverrides?.[p.id]?.name || p.name;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-2 rounded-xl border text-left flex flex-col items-center text-center gap-1.5 transition-all cursor-pointer relative ${
                      isTarget
                        ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500 text-white shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    {hasCustom && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" title="Customized" />
                    )}
                    <img
                      src={effectivePhoto}
                      alt={effectiveName}
                      referrerPolicy="no-referrer"
                      className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: p.auraColor }}
                    />
                    <div className="w-full">
                      <div className="text-xs font-bold truncate">{effectiveName}</div>
                      <div className="text-[10px] text-slate-400 truncate">{p.departmentFocus.split('&')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative shrink-0">
              <div 
                className="w-20 h-20 rounded-2xl overflow-hidden border-2 shadow-lg relative bg-slate-950"
                style={{ borderColor: targetBaseProfile.auraColor }}
              >
                <img
                  src={avatarUrlInput || targetBaseProfile.avatarUrl}
                  alt={nameInput}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback if broken image URL
                    (e.target as HTMLElement).setAttribute('src', targetBaseProfile.avatarUrl);
                  }}
                />
              </div>
              <span 
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow"
                style={{ backgroundColor: targetBaseProfile.auraColor }}
              >
                ✓
              </span>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h4 className="text-base font-bold text-white truncate">
                  {nameInput || targetBaseProfile.name}
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                  Online Co-Pilot
                </span>
                {isCustomized && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                    Custom Identity Active
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-400 font-medium mt-0.5">
                {titleInput || targetBaseProfile.title}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                Specialty: {targetBaseProfile.specialty}
              </p>
            </div>
          </div>

          {/* Form Fields: Name and Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="assistant-name-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Virtual Assistant Name:</span>
              </label>
              <input
                id="assistant-name-input"
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="e.g. Samia Rahman or SML AI Co-Pilot"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                maxLength={40}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Default: {targetBaseProfile.name}</span>
                <span>{nameInput.length}/40</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="assistant-title-input" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400" />
                <span>Executive Title / Role:</span>
              </label>
              <input
                id="assistant-title-input"
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                placeholder="e.g. Operations Co-Pilot & Plant Advisor"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                maxLength={60}
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Default: {targetBaseProfile.title}</span>
                <span>{titleInput.length}/60</span>
              </div>
            </div>
          </div>

          {/* Profile Photo Source Tabs */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                <span>Profile Photo Selection:</span>
              </span>

              <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  id="tab-photo-presets"
                  onClick={() => setPhotoSourceTab('presets')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    photoSourceTab === 'presets'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Curated Avatars</span>
                </button>
                <button
                  type="button"
                  id="tab-photo-upload"
                  onClick={() => setPhotoSourceTab('upload')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    photoSourceTab === 'upload'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  id="tab-photo-url"
                  onClick={() => setPhotoSourceTab('url')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                    photoSourceTab === 'url'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Image URL</span>
                </button>
              </div>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* TAB 1: CURATED AVATARS */}
            {photoSourceTab === 'presets' && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  {(['All', 'Corporate', 'Engineering', 'Tech AI'] as const).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setAvatarCategoryFilter(cat)}
                      className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition cursor-pointer ${
                        avatarCategoryFilter === cat
                          ? 'bg-slate-800 text-white border border-slate-700'
                          : 'text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
                  {filteredPresets.map(avatar => {
                    const isSelected = avatarUrlInput === avatar.url;
                    return (
                      <div
                        key={avatar.id}
                        onClick={() => setAvatarUrlInput(avatar.url)}
                        className={`group p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-indigo-950/70 border-indigo-500 ring-2 ring-indigo-500/50 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-850 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={avatar.url}
                            alt={avatar.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-cover border border-slate-700 group-hover:scale-105 transition-transform"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-indigo-600/30 rounded-xl flex items-center justify-center">
                              <Check className="w-5 h-5 text-white bg-indigo-600 rounded-full p-0.5 shadow" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-slate-300 leading-tight line-clamp-2">
                          {avatar.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: UPLOAD IMAGE (Drag & Drop + Click File Picker) */}
            {photoSourceTab === 'upload' && (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragOver
                      ? 'bg-indigo-950/50 border-indigo-400 text-indigo-300'
                      : 'bg-slate-900/80 hover:bg-slate-900 border-slate-700 hover:border-slate-600 text-slate-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-white">
                      Drag and drop your assistant photo here, or <span className="text-indigo-400 underline">browse device</span>
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Supports JPG, PNG, WebP, SVG (Max 5MB). Photo is securely stored locally in your browser.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
                  >
                    Select Image File
                  </button>
                </div>

                {avatarUrlInput.startsWith('data:image') && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={avatarUrlInput} 
                        alt="Uploaded preview" 
                        className="w-10 h-10 rounded-lg object-cover border border-indigo-500" 
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Custom Image Loaded</span>
                        </div>
                        <div className="text-[10px] text-slate-400">Ready to apply as virtual assistant photo</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAvatarUrlInput(targetBaseProfile.avatarUrl)}
                      className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded hover:bg-rose-950/40"
                    >
                      Clear Upload
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: IMAGE WEB URL */}
            {photoSourceTab === 'url' && (
              <div className="space-y-2">
                <label htmlFor="custom-avatar-url-input" className="text-xs font-medium text-slate-400">
                  Paste Direct Image URL (HTTPS link):
                </label>
                <div className="flex gap-2">
                  <input
                    id="custom-avatar-url-input"
                    type="url"
                    value={avatarUrlInput}
                    onChange={e => setAvatarUrlInput(e.target.value)}
                    placeholder="https://example.com/assistant-portrait.png"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {avatarUrlInput !== targetBaseProfile.avatarUrl && (
                    <button
                      type="button"
                      onClick={() => setAvatarUrlInput(targetBaseProfile.avatarUrl)}
                      className="px-3 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 rounded-xl hover:bg-slate-700"
                      title="Reset URL"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  Ensure the image URL is publicly accessible with CORS enabled (e.g. Unsplash, Cloudinary, AWS S3).
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            id="reset-assistant-identity-btn"
            onClick={handleResetToDefault}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
            title="Reset this assistant profile back to original default name and photo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="cancel-assistant-admin-btn"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="save-assistant-identity-btn"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{savedToast ? 'Saved!' : 'Save & Apply Identity'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
