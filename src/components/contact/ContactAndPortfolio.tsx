import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Phone, Mail, Globe, MapPin, Send, CheckCircle2, 
  Sparkles, ExternalLink, Edit2, Shield, Eye, 
  RefreshCw, X, MessageSquare, Briefcase, ChevronRight,
  Camera, Upload, Link as LinkIcon, Check, Copy, Clock,
  Code2, Share2, MessageCircle, User as UserIcon, UserCheck, Star
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  saveContactMessage, getContactMessages, ContactMessage,
  DeveloperProfile, DEFAULT_DEVELOPER_PROFILE, getDeveloperProfileFromStorage,
  saveDeveloperProfileToStorage
} from '../../lib/portfolioEngine';
import { UserSecurityScope } from '../../lib/security';

interface ContactAndPortfolioProps {
  spreadsheetId: string;
  user?: User;
  userSecurityScope?: UserSecurityScope;
}

const AVATAR_PRESETS = [
  {
    name: 'Executive Studio (Default)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Modern Architect',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Digital Designer',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Creative Tech Lead',
    url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Engineering Director',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Product Innovator',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=80'
  }
];

export default function ContactAndPortfolio({ spreadsheetId, user, userSecurityScope }: ContactAndPortfolioProps) {
  // Developer Profile State
  const [devProfile, setDevProfile] = useState<DeveloperProfile>(getDeveloperProfileFromStorage);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState<DeveloperProfile>(devProfile);
  const [imageUploadType, setImageUploadType] = useState<'upload' | 'url' | 'presets'>('upload');
  const [imagePreview, setImagePreview] = useState(devProfile.avatarUrl);
  const [urlInput, setUrlInput] = useState(devProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState(userSecurityScope?.username || '');
  const [contactEmpId, setContactEmpId] = useState(userSecurityScope?.employeeId || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('Product Design & Engineering Support');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmittedSuccess, setContactSubmittedSuccess] = useState(false);

  const contactFormRef = useRef<HTMLDivElement>(null);
  const isAdmin = userSecurityScope?.role === 'Admin';

  const loadMessages = async () => {
    if (!isAdmin) return;
    setIsLoadingMessages(true);
    try {
      const msgs = await getContactMessages(spreadsheetId);
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to load contact messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadMessages();
    }
  }, [spreadsheetId, isAdmin]);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Scroll to contact form
  const scrollToContact = () => {
    contactFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Open profile edit modal
  const handleOpenProfileModal = () => {
    setEditProfileData(devProfile);
    setImagePreview(devProfile.avatarUrl);
    setUrlInput(devProfile.avatarUrl);
    setShowProfileModal(true);
  };

  // Handle Developer Profile Image Upload
  const handleProfileImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size exceeds 5MB. Please choose a smaller file.');
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setImagePreview(result);
        setEditProfileData(prev => ({ ...prev, avatarUrl: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Developer Profile
  const handleSaveDeveloperProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAvatar = imageUploadType === 'url' ? (urlInput || imagePreview) : imagePreview;
    const updated = { 
      ...editProfileData, 
      avatarUrl: finalAvatar 
    };
    setDevProfile(updated);
    saveDeveloperProfileToStorage(updated);
    setShowProfileModal(false);
  };

  // Submit Contact Form
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      alert('Please fill in required fields: Name, Email, and Message.');
      return;
    }

    setIsSubmittingContact(true);
    try {
      await saveContactMessage(spreadsheetId, {
        name: contactName.trim(),
        employeeId: contactEmpId.trim(),
        email: contactEmail.trim(),
        phone: contactPhone.trim(),
        subject: contactSubject.trim() || 'General Inquiry',
        message: contactMessage.trim()
      });

      setContactSubmittedSuccess(true);
      setContactSubject('Product Design & Engineering Support');
      setContactMessage('');
      setContactPhone('');
      if (isAdmin) loadMessages();
    } catch (err) {
      console.error('Failed to send contact inquiry:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSubmittingContact(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-900 pb-16 font-sans">
      
      {/* BRAND HEADER BAR */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#6342F5] to-[#8B5CF6] flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline">
                <span className="text-2xl font-black tracking-tight text-slate-900">brandfolio</span>
                <span className="text-2xl font-black text-[#6342F5]">.</span>
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 -mt-1">
                Developer Contact
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {isAdmin && (
              <button
                onClick={() => setShowInboxModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
                title="View Inquiries Inbox"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#6342F5]" />
                <span className="hidden sm:inline">Inquiries</span>
                {messages.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-[#6342F5] text-white text-[10px] font-black">
                    {messages.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleOpenProfileModal}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border border-slate-200"
              title="Customize Developer Photo & Contact Information"
            >
              <Camera className="w-3.5 h-3.5 text-[#6342F5]" />
              <span className="hidden sm:inline">Update Profile / Photo</span>
            </button>

            <button
              onClick={scrollToContact}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#6342F5] to-[#7C3AED] hover:from-[#5330E4] hover:to-[#6D28D9] text-white text-xs font-extrabold shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/35 transition cursor-pointer"
            >
              contact me
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
        
        {/* ========================================================================= */}
        {/* 1. HERO DEVELOPER SHOWCASE & PROFILE PHOTO (EXACT DESIGN MATCH)           */}
        {/* ========================================================================= */}
        <section className="relative bg-white rounded-3xl p-6 sm:p-12 lg:p-16 border border-slate-200/80 shadow-sm overflow-hidden">
          
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            
            {/* Left Column: Developer Information */}
            <div className="lg:col-span-6 space-y-6 z-10">
              
              {/* Purple highlight bar */}
              <div className="w-16 h-1.5 bg-[#6342F5] rounded-full" />

              {/* Main Headline */}
              <div className="space-y-1">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 lowercase leading-[1.08]">
                  {devProfile.rolePrefix || `im ${devProfile.name.toLowerCase()},`}
                </h1>
                <div className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08]">
                  <span>a </span>
                  <span className="text-[#6342F5] underline decoration-[#6342F5]/30 underline-offset-8">
                    {devProfile.roleHighlight || 'digital designer'}
                  </span>
                </div>
              </div>

              {/* Bio description */}
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-lg font-medium">
                {devProfile.bio}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={scrollToContact}
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-[#6342F5] to-[#7C3AED] hover:from-[#5330E4] hover:to-[#6D28D9] text-white text-sm font-black shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition duration-150 cursor-pointer"
                >
                  contact me
                </button>

                <button
                  onClick={handleOpenProfileModal}
                  className="px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 text-sm font-bold border border-slate-200 shadow-sm hover:shadow transition duration-150 cursor-pointer flex items-center gap-2"
                >
                  <Camera className="w-4 h-4 text-[#6342F5]" />
                  <span>update profile / photo</span>
                </button>
              </div>

              {/* Quick Status / Availability */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2 text-emerald-600 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{devProfile.availability || 'Available for new projects'}</span>
                </div>
                <div className="text-slate-300">•</div>
                <div className="text-slate-600 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{devProfile.location}</span>
                </div>
              </div>

            </div>

            {/* Right Column: Circular Profile Photo Frame */}
            <div className="lg:col-span-6 flex items-center justify-center relative">
              
              {/* Outer Orbital Decorative Ring */}
              <div className="w-[330px] sm:w-[420px] lg:w-[460px] h-[330px] sm:h-[420px] lg:h-[460px] rounded-full border border-purple-100 flex items-center justify-center relative">
                
                {/* Thick Vibrant Purple Framing Ring (Brand Signature Ring) */}
                <div className="w-[270px] sm:w-[350px] lg:w-[380px] h-[270px] sm:h-[350px] lg:h-[380px] rounded-full border-[16px] sm:border-[22px] border-[#6342F5] shadow-2xl shadow-indigo-500/30 flex items-center justify-center overflow-hidden bg-slate-100 relative group">
                  
                  {/* Developer Portrait Image */}
                  <img
                    src={devProfile.avatarUrl}
                    alt={devProfile.name}
                    className="w-full h-full object-cover object-top scale-105 group-hover:scale-110 transition duration-300"
                  />

                  {/* Hover Overlay: Change Image Button */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition duration-200 flex flex-col items-center justify-center gap-2 p-4 text-center backdrop-blur-xs">
                    <button
                      onClick={handleOpenProfileModal}
                      className="px-4 py-2 rounded-xl bg-white text-[#6342F5] text-xs font-black shadow-lg flex items-center gap-2 hover:scale-105 transition cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Change Image</span>
                    </button>
                    <span className="text-[11px] text-slate-200 font-medium">Upload File, URL or Presets</span>
                  </div>

                </div>

                {/* Floating Quick Action Edit Badge */}
                <button
                  onClick={handleOpenProfileModal}
                  className="absolute bottom-3 right-3 sm:bottom-6 sm:right-6 p-3 rounded-2xl bg-white border border-slate-200 shadow-xl text-[#6342F5] hover:bg-[#6342F5] hover:text-white transition group cursor-pointer"
                  title="Update Developer Photo & Details"
                >
                  <Edit2 className="w-5 h-5" />
                </button>

              </div>

            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* 2. DEVELOPER CONTACT INFORMATION CARDS                                    */}
        {/* ========================================================================= */}
        <section className="space-y-6">
          
          <div className="space-y-2">
            <div className="w-16 h-1.5 bg-[#6342F5] rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 lowercase">
              contact information
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-medium">
              Direct communication channels, studio location, working hours, and developer repositories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            
            {/* Email Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-[#6342F5]/10 text-[#6342F5] flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#6342F5] transition">
                    Direct Email
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Official Communication
                  </p>
                </div>
                <p className="text-xs text-slate-700 font-semibold break-all">
                  {devProfile.email}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`mailto:${devProfile.email}`}
                  className="text-xs font-bold text-[#6342F5] hover:underline flex items-center gap-1"
                >
                  <span>Send Mail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(devProfile.email, 'email')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Copy email address"
                >
                  {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Phone & WhatsApp Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-emerald-600 transition">
                    Phone & WhatsApp
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Voice & Direct Chat
                  </p>
                </div>
                <p className="text-xs text-slate-700 font-semibold">
                  {devProfile.phone}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <a
                  href={`tel:${devProfile.phone}`}
                  className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
                >
                  <span>Call Now</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => handleCopy(devProfile.phone, 'phone')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                  title="Copy phone number"
                >
                  {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Location & Timezone Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition">
                    Studio Location
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Office & Timezone
                  </p>
                </div>
                <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                  {devProfile.location}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] font-bold text-emerald-600 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Mon - Fri (9 AM - 6 PM)</span>
                </div>
              </div>
            </div>

            {/* Repositories & Profiles Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl transition-all duration-200 flex flex-col justify-between group">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-900/10 text-slate-900 flex items-center justify-center">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-[#6342F5] transition">
                    Online Channels
                  </h3>
                  <p className="text-xs font-bold text-slate-400 mt-0.5">
                    Profiles & Repositories
                  </p>
                </div>
                
                {/* Channel Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {devProfile.githubUrl && (
                    <a
                      href={devProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition"
                      title="Source Code Repository"
                    >
                      <Code2 className="w-4 h-4 text-[#6342F5]" />
                    </a>
                  )}
                  {devProfile.linkedinUrl && (
                    <a
                      href={devProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-blue-600 transition"
                      title="Professional Profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.dribbbleUrl && (
                    <a
                      href={devProfile.dribbbleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-pink-600 transition"
                      title="Design Showcase"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.websiteUrl && (
                    <a
                      href={devProfile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-emerald-600 transition"
                      title="Official Website"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400">Verified Developer</span>
                <UserCheck className="w-4 h-4 text-[#6342F5]" />
              </div>
            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* 3. DIRECT MESSAGE / INQUIRY MESSENGER                                     */}
        {/* ========================================================================= */}
        <section ref={contactFormRef} className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/80 shadow-sm space-y-8">
          
          <div className="space-y-2">
            <div className="w-16 h-1.5 bg-[#6342F5] rounded-full" />
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 lowercase">
              send direct message
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-xl font-medium">
              Send a note or technical inquiry directly to {devProfile.name}. We log every request and reply as soon as possible.
            </p>
          </div>

          <form onSubmit={handleContactSubmit} className="space-y-4 bg-slate-50/70 p-6 sm:p-8 rounded-3xl border border-slate-200">
            
            {contactSubmittedSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-3 animate-in fade-in">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <div className="font-bold">Thank you for your message!</div>
                  <div>Your inquiry has been delivered directly to {devProfile.name}.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#6342F5]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Email Address *</label>
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  placeholder="s.connor@enterprise.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#6342F5]/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone / WhatsApp</label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#6342F5]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Inquiry Topic</label>
                <select
                  value={contactSubject}
                  onChange={e => setContactSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                >
                  <option value="Product Design & Engineering Support">Product Design & Engineering Support</option>
                  <option value="System Feature Request">System Feature Request</option>
                  <option value="Bug Report or Performance Issue">Bug Report or Performance Issue</option>
                  <option value="Industrial RFID & Automation">Industrial RFID & Automation</option>
                  <option value="General Collaboration">General Collaboration</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Message / Inquiry Details *</label>
              <textarea
                rows={4}
                required
                value={contactMessage}
                onChange={e => setContactMessage(e.target.value)}
                placeholder={`Write your message or inquiry for ${devProfile.name}...`}
                className="w-full p-3.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-[#6342F5]/20 resize-none"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={isSubmittingContact}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#6342F5] to-[#7C3AED] hover:from-[#5330E4] hover:to-[#6D28D9] text-white text-xs font-black shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmittingContact ? 'Sending Message...' : 'Send Message to Developer'}</span>
              </button>

              <span className="text-[11px] text-slate-400 font-medium">
                🔒 Direct private channel to developer
              </span>
            </div>

          </form>

        </section>

      </main>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMIZE DEVELOPER PROFILE & IMAGE UPDATE OPTIONS                 */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#6342F5] text-white flex items-center justify-center shadow-md">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Developer Profile & Photo Options</h3>
                  <p className="text-xs text-slate-500">Update portrait image, hero headline, bio, and direct contact details.</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeveloperProfile} className="space-y-6">
              
              {/* IMAGE UPDATE SECTION */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-800">
                    Profile Photo Update Options
                  </label>
                  
                  {/* Mode Tabs */}
                  <div className="flex items-center bg-slate-200/80 p-1 rounded-xl text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setImageUploadType('upload')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadType('url')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'url' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadType('presets')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'presets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}
                    >
                      Presets
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  {/* Image Live Ring Preview */}
                  <div className="w-24 h-24 rounded-full border-4 border-[#6342F5] shadow-md overflow-hidden bg-slate-200 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-2">
                    
                    {/* MODE 1: FILE UPLOAD */}
                    {imageUploadType === 'upload' && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleProfileImageFileUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:border-[#6342F5] text-xs font-bold text-slate-700 flex items-center gap-2 shadow-xs transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#6342F5]" />
                          <span>Choose Image from Computer</span>
                        </button>
                        <p className="text-[10px] text-slate-400">
                          Supports PNG, JPG, WebP up to 5MB. Photo will be scaled and stored in high resolution.
                        </p>
                      </div>
                    )}

                    {/* MODE 2: IMAGE URL */}
                    {imageUploadType === 'url' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="url"
                            value={urlInput}
                            onChange={e => {
                              setUrlInput(e.target.value);
                              if (e.target.value.trim()) {
                                setImagePreview(e.target.value.trim());
                              }
                            }}
                            placeholder="https://example.com/portrait.jpg"
                            className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Enter any public image URL.
                        </p>
                      </div>
                    )}

                    {/* MODE 3: PRESETS */}
                    {imageUploadType === 'presets' && (
                      <div className="grid grid-cols-3 gap-2">
                        {AVATAR_PRESETS.map(preset => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setImagePreview(preset.url);
                              setUrlInput(preset.url);
                              setEditProfileData(prev => ({ ...prev, avatarUrl: preset.url }));
                            }}
                            className={`p-1.5 rounded-xl border text-left flex items-center gap-2 transition cursor-pointer ${
                              imagePreview === preset.url ? 'border-[#6342F5] bg-[#6342F5]/10 ring-1 ring-[#6342F5]' : 'border-slate-200 bg-white hover:bg-slate-50'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                            <span className="text-[10px] font-bold text-slate-700 truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
              </div>

              {/* PROFILE DETAILS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Developer Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileData.name}
                    onChange={e => setEditProfileData({ ...editProfileData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role Prefix (Hero Greeting)</label>
                  <input
                    type="text"
                    placeholder="e.g. im john moore,"
                    value={editProfileData.rolePrefix || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, rolePrefix: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role Highlight (Purple Text)</label>
                  <input
                    type="text"
                    placeholder="e.g. a digital designer"
                    value={editProfileData.roleHighlight || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, roleHighlight: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Availability Status</label>
                  <input
                    type="text"
                    value={editProfileData.availability || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, availability: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Direct Email</label>
                  <input
                    type="email"
                    required
                    value={editProfileData.email}
                    onChange={e => setEditProfileData({ ...editProfileData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Direct Phone</label>
                  <input
                    type="text"
                    value={editProfileData.phone}
                    onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Studio / Location</label>
                  <input
                    type="text"
                    value={editProfileData.location}
                    onChange={e => setEditProfileData({ ...editProfileData, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Developer Bio</label>
                  <textarea
                    rows={3}
                    value={editProfileData.bio}
                    onChange={e => setEditProfileData({ ...editProfileData, bio: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden resize-none"
                  />
                </div>

                {/* Social Channels */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Repository / GitHub URL</label>
                  <input
                    type="url"
                    value={editProfileData.githubUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editProfileData.linkedinUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Dribbble / Portfolio URL</label>
                  <input
                    type="url"
                    value={editProfileData.dribbbleUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, dribbbleUrl: e.target.value })}
                    placeholder="https://dribbble.com/..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Official Website URL</label>
                  <input
                    type="url"
                    value={editProfileData.websiteUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, websiteUrl: e.target.value })}
                    placeholder="https://brandfolio.design"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>

              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditProfileData(DEFAULT_DEVELOPER_PROFILE);
                    setImagePreview(DEFAULT_DEVELOPER_PROFILE.avatarUrl);
                    setUrlInput(DEFAULT_DEVELOPER_PROFILE.avatarUrl);
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition cursor-pointer"
                >
                  Reset to Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#6342F5] to-[#7C3AED] hover:from-[#5330E4] hover:to-[#6D28D9] text-white text-xs font-black shadow-md shadow-indigo-500/25 transition cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADMIN INBOX FOR DIRECT MESSAGES                                    */}
      {/* ========================================================================= */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[85vh] overflow-y-auto space-y-6">
            
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6342F5] text-white flex items-center justify-center shadow-md">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Developer Inquiries Inbox</h3>
                  <p className="text-xs text-slate-500">Messages and inquiries sent to the developer.</p>
                </div>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingMessages ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6342F5]" />
                <span className="text-xs">Loading received messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-700">No Messages Yet</div>
                <div className="text-[11px] text-slate-400">Direct inquiries will appear here.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-900">{msg.name} ({msg.email})</div>
                      <div className="text-slate-400 text-[10px]">{msg.submittedAt ? new Date(msg.submittedAt).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="text-xs font-semibold text-[#6342F5]">{msg.subject}</div>
                    <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-100">
                      {msg.message}
                    </p>
                    {msg.phone && (
                      <div className="text-[11px] text-slate-500 font-medium">
                        📞 Phone: {msg.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowInboxModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Close Inbox
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
