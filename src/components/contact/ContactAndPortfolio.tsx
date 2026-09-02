import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Phone, Mail, Globe, MapPin, Send, CheckCircle2, 
  Sparkles, ExternalLink, Edit2, Shield, Eye, 
  RefreshCw, X, MessageSquare, Briefcase, ChevronRight,
  Camera, Upload, Link as LinkIcon, Check, Copy, Clock,
  Code2, Share2, MessageCircle, User as UserIcon, UserCheck, Star,
  Download, ArrowRight, LayoutGrid, CheckCircle, Award, Users,
  Layers, Palette, Server, Cpu, FileText, Calendar, Terminal,
  Sliders, ThumbsUp, FolderGit2
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  saveContactMessage, getContactMessages, ContactMessage,
  DeveloperProfile, DEFAULT_DEVELOPER_PROFILE, getDeveloperProfileFromStorage,
  saveDeveloperProfileToStorage, DEFAULT_SKILL_CATEGORIES, DEFAULT_EXPERIENCES,
  DEFAULT_BLOG_POSTS, DEFAULT_PORTFOLIO_ITEMS, PortfolioItem, BlogPostItem,
  DEFAULT_EXPERTISE_ITEMS
} from '../../lib/portfolioEngine';
import { UserSecurityScope } from '../../lib/security';

interface ContactAndPortfolioProps {
  spreadsheetId: string;
  user?: User;
  userSecurityScope?: UserSecurityScope;
}

const AVATAR_PRESETS = [
  {
    name: 'Developer with Glasses (Default)',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Tech Lead / Architect',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Full Stack Engineer',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Senior Systems Designer',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Cloud & AI Engineer',
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80'
  },
  {
    name: 'Software Director',
    url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=900&q=80'
  }
];

type ActiveTab = 'home' | 'about' | 'skills' | 'projects' | 'blog' | 'contact';

export default function ContactAndPortfolio({ spreadsheetId, user, userSecurityScope }: ContactAndPortfolioProps) {
  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  // Developer Profile State
  const [devProfile, setDevProfile] = useState<DeveloperProfile>(getDeveloperProfileFromStorage);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editProfileData, setEditProfileData] = useState<DeveloperProfile>(devProfile);
  const [imageUploadType, setImageUploadType] = useState<'upload' | 'url' | 'presets'>('presets');
  const [imagePreview, setImagePreview] = useState(devProfile.avatarUrl);
  const [urlInput, setUrlInput] = useState(devProfile.avatarUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Modals
  const [showHireModal, setShowHireModal] = useState(false);
  const [showCvModal, setShowCvModal] = useState(false);
  const [selectedBlogPost, setSelectedBlogPost] = useState<BlogPostItem | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioItem | null>(null);

  // Project Category Filter
  const [projectCategory, setProjectCategory] = useState<string>('All');

  // Messages State
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showInboxModal, setShowInboxModal] = useState(false);

  // Contact Form State
  const [contactName, setContactName] = useState(userSecurityScope?.username || '');
  const [contactEmpId, setContactEmpId] = useState(userSecurityScope?.employeeId || '');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [contactSubject, setContactSubject] = useState('Full Stack & Cloud Architecture');
  const [contactMessage, setContactMessage] = useState('');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSubmittedSuccess, setContactSubmittedSuccess] = useState(false);

  // Hire Form State
  const [hireProjectType, setHireProjectType] = useState('Full-Stack Web App');
  const [hireBudget, setHireBudget] = useState('$5k - $10k');
  const [hireTimeline, setHireTimeline] = useState('1-2 Months');
  const [hireMessage, setHireMessage] = useState('');
  const [isSubmittingHire, setIsSubmittingHire] = useState(false);
  const [hireSuccess, setHireSuccess] = useState(false);

  const contactSectionRef = useRef<HTMLDivElement>(null);
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

  // Scroll or navigate to contact
  const handleNavigateToContact = () => {
    setActiveTab('contact');
    setTimeout(() => {
      contactSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
      setContactSubject('Full Stack & Cloud Architecture');
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

  // Submit Hire Form
  const handleHireSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingHire(true);
    try {
      await saveContactMessage(spreadsheetId, {
        name: contactName.trim() || (userSecurityScope?.username || 'Client Inquiry'),
        employeeId: contactEmpId.trim(),
        email: contactEmail.trim() || (user?.email || 'client@enterprise.com'),
        phone: contactPhone.trim(),
        subject: `[HIRE INQUIRY] ${hireProjectType} (${hireBudget}, ${hireTimeline})`,
        message: `Project Type: ${hireProjectType}\nBudget Range: ${hireBudget}\nEstimated Timeline: ${hireTimeline}\n\nProject Scope:\n${hireMessage}`
      });
      setHireSuccess(true);
      if (isAdmin) loadMessages();
    } catch (err) {
      console.error('Failed to send hire inquiry:', err);
    } finally {
      setIsSubmittingHire(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    if (projectCategory === 'All') return DEFAULT_PORTFOLIO_ITEMS;
    return DEFAULT_PORTFOLIO_ITEMS.filter(p => p.category.toLowerCase().includes(projectCategory.toLowerCase()));
  }, [projectCategory]);

  return (
    <div className="min-h-screen bg-[#090A10] text-slate-100 pb-20 font-sans selection:bg-[#6366F1]/30 selection:text-white">
      
      {/* ========================================================================= */}
      {/* NAVBAR / HEADER (EXACT MATCH TO ATTACHED SCREENSHOT)                       */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-[#090A10]/90 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left Brand / Name: </> Alex Morgan */}
          <div 
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="text-[#6366F1] font-mono text-xl font-bold tracking-tighter group-hover:scale-110 transition-transform">
              {'</>'}
            </span>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white group-hover:text-slate-200 transition-colors">
              {devProfile.name}
            </span>
          </div>

          {/* Center Nav Links: Home, About, Skills, Projects, Blog, Contact */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            {(['home', 'about', 'skills', 'projects', 'blog', 'contact'] as ActiveTab[]).map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative py-1.5 capitalize transition-colors duration-150 cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#6366F1] shadow-sm shadow-[#6366F1]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action: Download CV & Modals */}
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowInboxModal(true)}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-800 transition cursor-pointer"
                title="View Inquiries Inbox"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#6366F1]" />
                <span className="hidden lg:inline">Inquiries</span>
                {messages.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-[#6366F1] text-white text-[10px] font-bold">
                    {messages.length}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={handleOpenProfileModal}
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
              title="Edit Developer Profile / Photo"
            >
              <Camera className="w-4 h-4 text-[#8B5CF6]" />
            </button>

            {/* Download CV Pill Button (Screenshot Match) */}
            <button
              onClick={() => setShowCvModal(true)}
              className="px-5 py-2 rounded-full border border-slate-700/80 hover:border-[#6366F1] bg-slate-900/60 hover:bg-slate-800/80 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition duration-150 cursor-pointer group"
            >
              <span>Download CV</span>
              <Download className="w-3.5 h-3.5 text-slate-300 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>

        </div>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 py-2.5 px-2 bg-[#090A10]/95 text-xs font-medium">
          {(['home', 'about', 'skills', 'projects', 'blog', 'contact'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`capitalize px-2 py-1 rounded-lg ${
                activeTab === tab ? 'text-[#6366F1] font-bold bg-[#6366F1]/10' : 'text-slate-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN CONTAINER                                                            */}
      {/* ========================================================================= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 space-y-12 sm:space-y-16">
        
        {/* ========================================================================= */}
        {/* HERO SECTION (EXACT LAYOUT & COLOR MATCH TO ATTACHED IMAGE)               */}
        {/* ========================================================================= */}
        <section className="relative pt-4 sm:pt-8 pb-4">
          
          {/* Ambient Purple Background Glows */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#6366F1]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Greeting, Name, Role, Bio, Buttons, Socials */}
            <div className="lg:col-span-6 space-y-6 sm:space-y-7 z-10">
              
              {/* 👋 Hello, I'm Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121524] border border-slate-800 text-xs font-medium text-slate-300">
                <span>👋</span>
                <span>{devProfile.rolePrefix || "Hello, I'm"}</span>
              </div>

              {/* Huge Developer Name */}
              <div className="space-y-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                  {devProfile.name.split(' ')[0]}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#6366F1] via-[#8B5CF6] to-[#A855F7]">
                    {devProfile.name.split(' ').slice(1).join(' ') || 'Morgan'}
                  </span>
                </h1>
                <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-200 tracking-tight">
                  {devProfile.roleHighlight || 'Full Stack Developer'}
                </div>
              </div>

              {/* Bio Paragraph */}
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
                {devProfile.bio}
              </p>

              {/* Action Buttons: Hire Me & View Projects */}
              <div className="flex flex-wrap items-center gap-4 pt-1">
                {/* Hire Me -> Button */}
                <button
                  onClick={() => setShowHireModal(true)}
                  className="px-6 sm:px-7 py-3 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/40 hover:-translate-y-0.5 transition duration-150 cursor-pointer"
                >
                  <span>Hire Me</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* View Projects [Grid] Button */}
                <button
                  onClick={() => setActiveTab('projects')}
                  className="px-5 sm:px-6 py-3 rounded-xl bg-[#121524] hover:bg-[#1A1E33] border border-slate-800 hover:border-slate-700 text-slate-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition duration-150 cursor-pointer"
                >
                  <span>View Projects</span>
                  <LayoutGrid className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Social Channels: Follow me on GitHub, LinkedIn, Twitter, Medium, etc. */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/80 text-xs">
                <span className="text-slate-400 font-medium">Follow me on</span>
                <div className="flex items-center gap-2.5">
                  {devProfile.githubUrl && (
                    <a
                      href={devProfile.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                      title="GitHub Profile"
                    >
                      <FolderGit2 className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.linkedinUrl && (
                    <a
                      href={devProfile.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                      title="LinkedIn Profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.twitterUrl && (
                    <a
                      href={devProfile.twitterUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                      title="Twitter / X"
                    >
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.mediumUrl && (
                    <a
                      href={devProfile.mediumUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                      title="Medium Articles"
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                  {devProfile.websiteUrl && (
                    <a
                      href={devProfile.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                      title="Personal Website"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Developer Portrait with Purple Circular Aura & Floating Glass Badges */}
            <div className="lg:col-span-6 flex items-center justify-center relative">
              
              {/* Dot matrix pattern in background behind circle */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                <div className="w-80 h-80 grid grid-cols-8 gap-3">
                  {Array.from({ length: 64 }).map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-slate-400" />
                  ))}
                </div>
              </div>

              {/* Main Portrait Frame Container */}
              <div className="relative w-[320px] sm:w-[400px] lg:w-[430px] h-[360px] sm:h-[440px] lg:h-[470px] flex items-end justify-center">
                
                {/* Purple / Indigo Solid Circular Aura Backdrop (Screenshot Match) */}
                <div className="absolute top-6 sm:top-10 w-[270px] sm:w-[340px] lg:w-[370px] h-[270px] sm:h-[340px] lg:h-[370px] rounded-full bg-gradient-to-tr from-[#5B4DF5] to-[#8C52FF] shadow-2xl shadow-indigo-600/30" />

                {/* Developer Image (Layered in front of the purple circle) */}
                <div className="relative z-10 w-[280px] sm:w-[350px] lg:w-[380px] h-[340px] sm:h-[420px] lg:h-[450px] overflow-hidden rounded-b-3xl flex items-end justify-center group">
                  <img
                    src={devProfile.avatarUrl}
                    alt={devProfile.name}
                    className="w-full h-full object-cover object-top scale-105 group-hover:scale-108 transition-transform duration-300"
                  />
                  {/* Quick Edit Overlay */}
                  <button
                    onClick={handleOpenProfileModal}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition duration-200 cursor-pointer border border-white/10"
                    title="Change Photo"
                  >
                    <Camera className="w-4 h-4 text-[#A855F7]" />
                  </button>
                </div>

                {/* FLOATING GLASS CARD 1 (TOP-LEFT): 5+ Years Experience (Screenshot Match) */}
                <div className="absolute top-16 -left-2 sm:-left-6 z-20 p-3.5 sm:p-4 rounded-2xl bg-[#111422]/80 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-black/40 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-[#6366F1]/20 text-[#818CF8]">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-base sm:text-lg font-black text-[#818CF8] leading-none">
                      {devProfile.yearsExperience || 5}+
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1">
                      Years<br className="hidden sm:inline" /> Experience
                    </div>
                  </div>
                </div>

                {/* FLOATING GLASS CARD 2 (BOTTOM-RIGHT): 50+ Projects Completed (Screenshot Match) */}
                <div className="absolute bottom-12 -right-2 sm:-right-6 z-20 p-3.5 sm:p-4 rounded-2xl bg-[#111422]/80 backdrop-blur-md border border-slate-700/60 shadow-xl shadow-black/40 flex items-center gap-3">
                  <div>
                    <div className="text-base sm:text-lg font-black text-[#818CF8] leading-none">
                      {devProfile.completedProjects || 50}+
                    </div>
                    <div className="text-[11px] font-medium text-slate-300 mt-1">
                      Projects<br className="hidden sm:inline" /> Completed
                    </div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                </div>

              </div>

            </div>

          </div>

        </section>

        {/* ========================================================================= */}
        {/* STATS RIBBON BAR (EXACT MATCH TO ATTACHED SCREENSHOT)                     */}
        {/* ========================================================================= */}
        <section className="bg-[#111422] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-800/60">
            
            {/* Stat 1: Years Experience */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-4 first:pt-0 first:px-0">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1F36] text-[#818CF8] flex items-center justify-center font-mono font-bold text-lg shrink-0 border border-slate-800">
                {'</>'}
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {devProfile.yearsExperience || 5}+
                </div>
                <div className="text-xs font-medium text-slate-400">
                  Years Experience
                </div>
              </div>
            </div>

            {/* Stat 2: Projects Completed */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-6">
              <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-900/40">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {devProfile.completedProjects || 50}+
                </div>
                <div className="text-xs font-medium text-slate-400">
                  Projects Completed
                </div>
              </div>
            </div>

            {/* Stat 3: Happy Clients */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 flex items-center justify-center shrink-0 border border-amber-900/40">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {devProfile.happyClients || 30}+
                </div>
                <div className="text-xs font-medium text-slate-400">
                  Happy Clients
                </div>
              </div>
            </div>

            {/* Stat 4: Technologies */}
            <div className="flex items-center gap-4 pt-4 sm:pt-0 sm:px-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-950/40 text-rose-400 flex items-center justify-center shrink-0 border border-rose-900/40">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-white">
                  {devProfile.technologiesCount || 10}+
                </div>
                <div className="text-xs font-medium text-slate-400">
                  Technologies
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ========================================================================= */}
        {/* TAB 1: HOME (FEATURED HIGHLIGHTS & ARCHITECTURE)                          */}
        {/* ========================================================================= */}
        {activeTab === 'home' && (
          <div className="space-y-16 animate-in fade-in duration-300">
            
            {/* Core Expertise Cards */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest mb-1">
                    Specialized Domains
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Engineering & Design Pillars
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('skills')}
                  className="text-xs font-semibold text-[#818CF8] hover:text-white flex items-center gap-1 transition"
                >
                  <span>View All Skills</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {DEFAULT_EXPERTISE_ITEMS.map((item, idx) => (
                  <div 
                    key={item.id}
                    className="p-6 rounded-3xl bg-[#111422] border border-slate-800/80 hover:border-slate-700 transition duration-200 space-y-4 group"
                  >
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                      style={{ backgroundColor: `${item.accentColor || '#6366F1'}25`, color: item.accentColor || '#818CF8' }}
                    >
                      {idx === 0 && <Palette className="w-6 h-6" />}
                      {idx === 1 && <Layers className="w-6 h-6" />}
                      {idx === 2 && <Cpu className="w-6 h-6" />}
                      {idx === 3 && <Sparkles className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition">
                        {item.title}
                      </h3>
                      <div className="text-xs font-medium text-slate-400 mt-1">
                        {item.subtitle}
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {item.tags.map(t => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-[#181C30] text-[10px] font-medium text-slate-300 border border-slate-800">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Projects Preview */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest mb-1">
                    Portfolio Spotlights
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    Featured Systems & Deployments
                  </h2>
                </div>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-xs font-semibold text-[#818CF8] hover:text-white flex items-center gap-1 transition"
                >
                  <span>Explore Portfolio</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {DEFAULT_PORTFOLIO_ITEMS.slice(0, 3).map(proj => (
                  <div
                    key={proj.id}
                    onClick={() => setSelectedProject(proj)}
                    className="rounded-3xl bg-[#111422] border border-slate-800/80 overflow-hidden hover:border-slate-700 transition duration-200 group cursor-pointer flex flex-col"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <img
                        src={proj.imageUrl}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                        {proj.category}
                      </div>
                    </div>
                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition">
                          {proj.title}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {proj.description}
                        </p>
                      </div>
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-medium text-[#818CF8]">
                        <span>View Project Details</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Let's Talk CTA Banner */}
            <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-[#121524] via-[#1B1E38] to-[#121524] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="space-y-2">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  Have a project in mind?
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 max-w-md">
                  Let's design and architect a resilient, high-speed solution tailored to your operational needs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHireModal(true)}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  Start a Project
                </button>
                <button
                  onClick={handleNavigateToContact}
                  className="px-6 py-3 rounded-xl bg-[#121524] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Contact Me
                </button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ABOUT (BIOGRAPHY, TIMELINE, PHILOSOPHY)                            */}
        {/* ========================================================================= */}
        {activeTab === 'about' && (
          <div className="space-y-12 animate-in fade-in duration-300">
            
            {/* Story & Philosophy */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              <div className="lg:col-span-7 space-y-6">
                <div className="space-y-2">
                  <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                    Biography & Vision
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    About {devProfile.name}
                  </h2>
                </div>

                <div className="space-y-4 text-slate-300 text-sm leading-relaxed">
                  <p>
                    I am a Full Stack Developer and Systems Architect with 5+ years of production experience building high-performance web applications, industrial automation engines, and bespoke enterprise platforms.
                  </p>
                  <p>
                    My core engineering ethos revolves around <strong>performance, accessibility, and architectural simplicity</strong>. Whether engineering real-time RFID serialization telemetry or crafting fluid design systems, I focus on delivering reliable software that empowers teams.
                  </p>
                  <p>
                    I specialize in combining modern frontend frameworks like React 19, TypeScript, and Tailwind CSS with resilient cloud runtimes, Cloud SQL, and Google Workspace integrations to create sub-second responsive workflows.
                  </p>
                </div>

                {/* Core Values / Philosophy Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                  <div className="p-4 rounded-2xl bg-[#111422] border border-slate-800 space-y-2">
                    <div className="p-2 w-fit rounded-xl bg-[#6366F1]/20 text-[#818CF8]">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Mathematical Polish</div>
                    <div className="text-[11px] text-slate-400">Strict optical balance, clean typography, and zero-compromise UX.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#111422] border border-slate-800 space-y-2">
                    <div className="p-2 w-fit rounded-xl bg-emerald-500/20 text-emerald-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Sub-Second Speed</div>
                    <div className="text-[11px] text-slate-400">Optimistic state updates and minimal latency for high data throughput.</div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#111422] border border-slate-800 space-y-2">
                    <div className="p-2 w-fit rounded-xl bg-amber-500/20 text-amber-400">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="text-xs font-bold text-white">Enterprise Resilient</div>
                    <div className="text-[11px] text-slate-400">Fault-tolerant cloud architecture and robust role-based security.</div>
                  </div>
                </div>
              </div>

              {/* Quick Info & Developer Details */}
              <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-[#111422] border border-slate-800 space-y-6">
                <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-4">
                  Quick Details
                </h3>

                <div className="space-y-4 text-xs">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Full Name</span>
                    <span className="font-semibold text-white">{devProfile.name}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Primary Role</span>
                    <span className="font-semibold text-[#818CF8]">{devProfile.roleHighlight}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Location</span>
                    <span className="font-semibold text-white">{devProfile.location}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Availability</span>
                    <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {devProfile.availability}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Email</span>
                    <span className="font-semibold text-slate-200">{devProfile.email}</span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400">Phone</span>
                    <span className="font-semibold text-slate-200">{devProfile.phone}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowCvModal(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Curriculum Vitae</span>
                </button>
              </div>

            </div>

            {/* Experience Timeline */}
            <div className="space-y-8 pt-6 border-t border-slate-800/80">
              <div>
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                  Career Progression
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Work Experience
                </h2>
              </div>

              <div className="space-y-6">
                {DEFAULT_EXPERIENCES.map((exp, idx) => (
                  <div
                    key={exp.id}
                    className="p-6 sm:p-8 rounded-3xl bg-[#111422] border border-slate-800/80 space-y-4 relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold text-white">{exp.role}</h3>
                        <div className="text-xs font-semibold text-[#818CF8] mt-0.5">
                          {exp.company} • <span className="text-slate-400 font-normal">{exp.location}</span>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A1F36] border border-slate-700 text-xs font-medium text-slate-300 w-fit">
                        <Calendar className="w-3.5 h-3.5 text-[#818CF8]" />
                        <span>{exp.period}</span>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {exp.description}
                    </p>

                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Key Achievements:
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {exp.achievements.map((ach, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{ach}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {exp.techStack.map(tech => (
                        <span key={tech} className="px-2.5 py-1 rounded-lg bg-[#181C30] text-[11px] font-medium text-slate-300 border border-slate-800">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SKILLS & PROFICIENCY                                               */}
        {/* ========================================================================= */}
        {activeTab === 'skills' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                Technical Capabilities
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Skills & Tech Stack
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-xl">
                Comprehensive overview of languages, frameworks, cloud services, and industrial automation capabilities.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {DEFAULT_SKILL_CATEGORIES.map(cat => (
                <div
                  key={cat.category}
                  className="p-6 sm:p-8 rounded-3xl bg-[#111422] border border-slate-800/80 space-y-6"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-[#6366F1]/20 text-[#818CF8]">
                      {cat.iconName === 'Layout' && <LayoutGrid className="w-5 h-5" />}
                      {cat.iconName === 'Server' && <Server className="w-5 h-5" />}
                      {cat.iconName === 'Cpu' && <Cpu className="w-5 h-5" />}
                      {cat.iconName === 'Palette' && <Palette className="w-5 h-5" />}
                    </div>
                    <h3 className="text-lg font-bold text-white">
                      {cat.category}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {cat.skills.map(skill => (
                      <div key={skill.name} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-200 flex items-center gap-1.5">
                            {skill.name}
                            {skill.featured && (
                              <span className="px-1.5 py-0.2 rounded-sm bg-[#6366F1]/20 text-[#818CF8] text-[9px] font-bold">
                                Core
                              </span>
                            )}
                          </span>
                          <span className="text-slate-400 font-mono text-[11px]">{skill.experience}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#181C30] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#5B4DF5] to-[#8B5CF6]"
                            style={{ width: `${skill.level}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Tools & Workflow Badges */}
            <div className="p-6 sm:p-8 rounded-3xl bg-[#111422] border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white">
                Developer Toolchain & Workflow
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {[
                  'Git & GitHub Actions', 'Docker Containers', 'Vite & esbuild', 'Postman / REST',
                  'Figma / Dev Mode', 'Google Cloud Run', 'Firestore Security Rules', 'Tailwind CSS v4',
                  'Drizzle ORM', 'Linux Shell & Bash', 'TypeScript Strict Mode', 'ESLint / Prettier',
                  'Kaizen & 5S Auditing', 'RFID Tag Encoding (EPC Gen2)'
                ].map(tool => (
                  <span
                    key={tool}
                    className="px-3 py-1.5 rounded-xl bg-[#181C30] border border-slate-800 text-xs font-medium text-slate-300"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: PROJECTS / PORTFOLIO                                               */}
        {/* ========================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                  Featured Works
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Portfolio Projects
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                  Enterprise systems, high-speed RFID solutions, and interactive digital experiences.
                </p>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#111422] p-1.5 rounded-2xl border border-slate-800">
                {['All', 'Brand', 'RFID', 'Woven', 'Offset', 'Operational'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setProjectCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                      projectCategory === cat
                        ? 'bg-[#6366F1] text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj)}
                  className="rounded-3xl bg-[#111422] border border-slate-800/80 overflow-hidden hover:border-slate-700 transition duration-200 group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-52 overflow-hidden relative">
                      <img
                        src={proj.imageUrl}
                        alt={proj.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                        {proj.category}
                      </div>
                      <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#6366F1] text-[10px] font-extrabold text-white shadow-md">
                        {proj.status}
                      </div>
                    </div>
                    
                    <div className="p-6 space-y-2.5">
                      <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {proj.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-[#818CF8]">
                      <span>Explore Case Study</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: BLOG / INSIGHTS                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'blog' && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div>
              <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                Technical Articles
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Insights & Architecture
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
                Engineering deep-dives into modern web development, industrial RFID systems, and UI craftsmanship.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {DEFAULT_BLOG_POSTS.map(post => (
                <div
                  key={post.id}
                  onClick={() => setSelectedBlogPost(post)}
                  className="rounded-3xl bg-[#111422] border border-slate-800/80 overflow-hidden hover:border-slate-700 transition duration-200 group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="h-48 overflow-hidden relative">
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] font-bold text-white border border-white/10">
                        {post.category}
                      </div>
                    </div>

                    <div className="p-6 space-y-3">
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                        <span>{post.date}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition leading-snug">
                        {post.title}
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                  </div>

                  <div className="p-6 pt-0">
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-[#818CF8]">
                      <span>Read Full Article</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: CONTACT & DIRECT MESSAGES                                          */}
        {/* ========================================================================= */}
        {activeTab === 'contact' && (
          <div ref={contactSectionRef} className="space-y-12 animate-in fade-in duration-300">
            
            <div className="space-y-2">
              <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-widest">
                Get In Touch
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Developer Contact Information
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                Have a question, feature request, or project in mind? Reach out directly using the verified channels below.
              </p>
            </div>

            {/* Direct Contact Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Email Card */}
              <div className="bg-[#111422] rounded-3xl p-6 border border-slate-800/80 shadow-xs hover:border-slate-700 transition flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#6366F1]/20 text-[#818CF8] flex items-center justify-center">
                    <Mail className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition">
                      Direct Email
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Official Communication
                    </p>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold break-all">
                    {devProfile.email}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={`mailto:${devProfile.email}`}
                    className="text-xs font-bold text-[#818CF8] hover:underline flex items-center gap-1"
                  >
                    <span>Send Mail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleCopy(devProfile.email, 'email')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Copy email address"
                  >
                    {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone Card */}
              <div className="bg-[#111422] rounded-3xl p-6 border border-slate-800/80 shadow-xs hover:border-slate-700 transition flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Phone className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-400 transition">
                      Phone & WhatsApp
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Voice & Direct Chat
                    </p>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold">
                    {devProfile.phone}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={`tel:${devProfile.phone}`}
                    className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>Call Now</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleCopy(devProfile.phone, 'phone')}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                    title="Copy phone number"
                  >
                    {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Location Card */}
              <div className="bg-[#111422] rounded-3xl p-6 border border-slate-800/80 shadow-xs hover:border-slate-700 transition flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition">
                      Studio Location
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Office & Timezone
                    </p>
                  </div>
                  <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                    {devProfile.location}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Mon - Fri (9 AM - 6 PM)</span>
                  </div>
                </div>
              </div>

              {/* Online Channels Card */}
              <div className="bg-[#111422] rounded-3xl p-6 border border-slate-800/80 shadow-xs hover:border-slate-700 transition flex flex-col justify-between group">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-200 flex items-center justify-center">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-[#818CF8] transition">
                      Online Profiles
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Repositories & Channels
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5">
                    {devProfile.githubUrl && (
                      <a
                        href={devProfile.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#181C30] hover:bg-slate-800 text-slate-300 hover:text-white transition"
                        title="GitHub"
                      >
                        <FolderGit2 className="w-4 h-4" />
                      </a>
                    )}
                    {devProfile.linkedinUrl && (
                      <a
                        href={devProfile.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#181C30] hover:bg-slate-800 text-blue-400 transition"
                        title="LinkedIn"
                      >
                        <Share2 className="w-4 h-4" />
                      </a>
                    )}
                    {devProfile.twitterUrl && (
                      <a
                        href={devProfile.twitterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#181C30] hover:bg-slate-800 text-sky-400 transition"
                        title="Twitter"
                      >
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                    {devProfile.websiteUrl && (
                      <a
                        href={devProfile.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-[#181C30] hover:bg-slate-800 text-emerald-400 transition"
                        title="Website"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400">Verified Identity</span>
                  <UserCheck className="w-4 h-4 text-[#818CF8]" />
                </div>
              </div>

            </div>

            {/* Direct Message Form (Dark Mode) */}
            <div className="bg-[#111422] rounded-3xl p-6 sm:p-10 border border-slate-800 space-y-6">
              
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Send a Direct Message
                </h3>
                <p className="text-xs sm:text-sm text-slate-400">
                  Fill out the form below to transmit an inquiry directly to {devProfile.name}.
                </p>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                
                {contactSubmittedSuccess && (
                  <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3 animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-bold">Thank you for your message!</div>
                      <div>Your inquiry has been successfully recorded and sent to {devProfile.name}.</div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full px-4 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={contactEmail}
                      onChange={e => setContactEmail(e.target.value)}
                      placeholder="s.connor@enterprise.com"
                      className="w-full px-4 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]/40"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Phone / WhatsApp</label>
                    <input
                      type="text"
                      value={contactPhone}
                      onChange={e => setContactPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-4 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]/40"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Inquiry Topic</label>
                    <select
                      value={contactSubject}
                      onChange={e => setContactSubject(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-xs text-white focus:outline-hidden"
                    >
                      <option value="Full Stack & Cloud Architecture">Full Stack & Cloud Architecture</option>
                      <option value="Industrial RFID & Serialization">Industrial RFID & Serialization</option>
                      <option value="UI/UX & Design System Modernization">UI/UX & Design System Modernization</option>
                      <option value="Operational 5S & Kaizen Dashboards">Operational 5S & Kaizen Dashboards</option>
                      <option value="General Consultation">General Consultation</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">Message / Project Scope *</label>
                  <textarea
                    rows={4}
                    required
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder={`Describe your requirements or inquiry for ${devProfile.name}...`}
                    className="w-full p-4 bg-[#181C30] border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#6366F1]/40 resize-none"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingContact}
                    className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmittingContact ? 'Sending Message...' : 'Send Message'}</span>
                  </button>

                  <span className="text-[11px] text-slate-400 font-medium">
                    🔒 Secure, direct transmission to developer
                  </span>
                </div>

              </form>

            </div>

          </div>
        )}

      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: HIRE ME PROJECT INQUIRY                                          */}
      {/* ========================================================================= */}
      {showHireModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-wider">
                  Project Inquiry
                </div>
                <h3 className="text-xl font-bold text-white">Hire {devProfile.name}</h3>
              </div>
              <button
                onClick={() => { setShowHireModal(false); setHireSuccess(false); }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {hireSuccess ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white">Inquiry Received!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Thank you for reaching out. {devProfile.name} will review your project parameters and respond within 24 hours.
                </p>
                <button
                  onClick={() => { setShowHireModal(false); setHireSuccess(false); }}
                  className="px-6 py-2 rounded-xl bg-slate-800 text-xs font-semibold text-white mt-4"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleHireSubmit} className="space-y-4 text-xs">
                
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Project Type</label>
                  <select
                    value={hireProjectType}
                    onChange={e => setHireProjectType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  >
                    <option value="Full-Stack Web App">Full-Stack Web App (React / Node / Cloud)</option>
                    <option value="Industrial Automation & RFID">Industrial Automation & RFID Engineering</option>
                    <option value="Enterprise Design System">Enterprise Design System & UI/UX</option>
                    <option value="Lean 5S & Kaizen Dashboard">Lean 5S & Kaizen Productivity Tool</option>
                    <option value="Technical Consultation">Technical Consultation / Code Review</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Budget Range</label>
                    <select
                      value={hireBudget}
                      onChange={e => setHireBudget(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                    >
                      <option value="< $5,000">&lt; $5,000</option>
                      <option value="$5k - $10k">$5,000 - $10,000</option>
                      <option value="$10k - $25k">$10,000 - $25,000</option>
                      <option value="$25k+">$25,000+</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-300">Timeline</label>
                    <select
                      value={hireTimeline}
                      onChange={e => setHireTimeline(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                    >
                      <option value="Urgent (1-2 Weeks)">Urgent (1-2 Weeks)</option>
                      <option value="1-2 Months">1 - 2 Months</option>
                      <option value="3+ Months">3+ Months</option>
                      <option value="Flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-300">Project Details & Objectives *</label>
                  <textarea
                    rows={4}
                    required
                    value={hireMessage}
                    onChange={e => setHireMessage(e.target.value)}
                    placeholder="Briefly describe your goals, required features, and deliverables..."
                    className="w-full p-3 bg-[#181C30] border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-hidden resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowHireModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingHire}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white font-bold shadow-md transition disabled:opacity-50"
                  >
                    {isSubmittingHire ? 'Transmitting...' : 'Submit Inquiry'}
                  </button>
                </div>

              </form>
            )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CURRICULUM VITAE (DOWNLOAD / PRINT CV)                           */}
      {/* ========================================================================= */}
      {showCvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-wider">
                  Curriculum Vitae
                </div>
                <h3 className="text-xl font-bold text-white">{devProfile.name} - Resume</h3>
              </div>
              <button
                onClick={() => setShowCvModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* CV Summary Content */}
            <div className="space-y-6 text-xs leading-relaxed">
              
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#181C30] border border-slate-800">
                <img
                  src={devProfile.avatarUrl}
                  alt={devProfile.name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div>
                  <h4 className="text-base font-bold text-white">{devProfile.name}</h4>
                  <div className="text-[#818CF8] font-semibold">{devProfile.roleHighlight}</div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{devProfile.email} • {devProfile.phone}</div>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Executive Profile</h5>
                <p className="text-slate-300">{devProfile.bio}</p>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Core Competencies</h5>
                <div className="flex flex-wrap gap-1.5">
                  {['React 19', 'TypeScript', 'Node.js', 'Google Cloud', 'Firestore', 'Tailwind CSS', 'RFID Systems', 'Lean 5S', 'Figma', 'System Architecture'].map(c => (
                    <span key={c} className="px-2.5 py-1 rounded-md bg-[#181C30] text-slate-200 border border-slate-800 text-[11px]">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Professional Experience</h5>
                <div className="space-y-3">
                  {DEFAULT_EXPERIENCES.map(exp => (
                    <div key={exp.id} className="p-3 rounded-xl bg-[#181C30] border border-slate-800/60">
                      <div className="font-bold text-white">{exp.role} - <span className="text-[#818CF8]">{exp.company}</span></div>
                      <div className="text-[11px] text-slate-400">{exp.period}</div>
                      <p className="text-slate-300 mt-1">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">PDF Version Ready for Print</span>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold flex items-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Print / Save CV PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BLOG POST VIEWER                                                 */}
      {/* ========================================================================= */}
      {selectedBlogPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-wider">
                  {selectedBlogPost.category} • {selectedBlogPost.readTime}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedBlogPost.title}</h3>
              </div>
              <button
                onClick={() => setSelectedBlogPost(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-56 rounded-2xl overflow-hidden">
              <img
                src={selectedBlogPost.coverImage}
                alt={selectedBlogPost.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <p>{selectedBlogPost.excerpt}</p>
              <p>{selectedBlogPost.content}</p>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-2">
              {selectedBlogPost.tags.map(tag => (
                <span key={tag} className="px-2.5 py-1 rounded-md bg-[#181C30] text-slate-300 text-xs border border-slate-800">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedBlogPost(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
              >
                Close Article
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PROJECT CASE STUDY VIEWER                                        */}
      {/* ========================================================================= */}
      {selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="text-[#6366F1] font-mono text-xs font-bold uppercase tracking-wider">
                  {selectedProject.category} • Status: {selectedProject.status}
                </div>
                <h3 className="text-xl font-bold text-white">{selectedProject.title}</h3>
              </div>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="h-60 rounded-2xl overflow-hidden">
              <img
                src={selectedProject.imageUrl}
                alt={selectedProject.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <h4 className="font-bold text-white text-sm">System Overview & Architecture</h4>
              <p>{selectedProject.description}</p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedProject(null);
                  setShowHireModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-[#6366F1] hover:bg-[#4F46E5] text-white text-xs font-bold transition cursor-pointer"
              >
                Inquire Similar Solution
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CUSTOMIZE DEVELOPER PROFILE & PHOTO OPTIONS                      */}
      {/* ========================================================================= */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[90vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6366F1] text-white flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Customize Developer Profile</h3>
                  <p className="text-xs text-slate-400">Update portrait, greeting, role, bio, metrics, and channels.</p>
                </div>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDeveloperProfile} className="space-y-6 text-xs">
              
              {/* IMAGE UPDATE SECTION */}
              <div className="p-4 rounded-2xl bg-[#181C30] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                    Profile Photo Source
                  </label>
                  
                  <div className="flex items-center bg-[#111422] p-1 rounded-xl text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setImageUploadType('presets')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'presets' ? 'bg-[#6366F1] text-white' : 'text-slate-400'}`}
                    >
                      Presets
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadType('upload')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'upload' ? 'bg-[#6366F1] text-white' : 'text-slate-400'}`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageUploadType('url')}
                      className={`px-3 py-1 rounded-lg transition cursor-pointer ${imageUploadType === 'url' ? 'bg-[#6366F1] text-white' : 'text-slate-400'}`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-full border-2 border-[#6366F1] overflow-hidden bg-slate-800 shrink-0">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>

                  <div className="flex-1 space-y-2">
                    {imageUploadType === 'presets' && (
                      <div className="grid grid-cols-2 gap-2">
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
                              imagePreview === preset.url ? 'border-[#6366F1] bg-[#6366F1]/20' : 'border-slate-800 bg-[#111422]'
                            }`}
                          >
                            <img src={preset.url} alt={preset.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
                            <span className="text-[10px] font-semibold text-slate-200 truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

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
                          className="px-4 py-2 rounded-xl bg-[#111422] border border-slate-700 hover:border-[#6366F1] font-semibold text-slate-200 flex items-center gap-2 transition cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#6366F1]" />
                          <span>Select Image File</span>
                        </button>
                        <p className="text-[10px] text-slate-400">PNG, JPG, WebP supported.</p>
                      </div>
                    )}

                    {imageUploadType === 'url' && (
                      <div className="space-y-1.5">
                        <input
                          type="url"
                          value={urlInput}
                          onChange={e => {
                            setUrlInput(e.target.value);
                            if (e.target.value.trim()) setImagePreview(e.target.value.trim());
                          }}
                          placeholder="https://example.com/photo.jpg"
                          className="w-full px-3 py-1.5 bg-[#111422] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* CORE FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Developer Name</label>
                  <input
                    type="text"
                    required
                    value={editProfileData.name}
                    onChange={e => setEditProfileData({ ...editProfileData, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Greeting Prefix (Hero)</label>
                  <input
                    type="text"
                    value={editProfileData.rolePrefix || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, rolePrefix: e.target.value })}
                    placeholder="Hello, I'm"
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Role Subtitle</label>
                  <input
                    type="text"
                    value={editProfileData.roleHighlight || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, roleHighlight: e.target.value })}
                    placeholder="Full Stack Developer"
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Years Experience</label>
                  <input
                    type="number"
                    value={editProfileData.yearsExperience || 5}
                    onChange={e => setEditProfileData({ ...editProfileData, yearsExperience: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-300">Developer Bio / Summary</label>
                  <textarea
                    rows={3}
                    value={editProfileData.bio}
                    onChange={e => setEditProfileData({ ...editProfileData, bio: e.target.value })}
                    className="w-full p-3 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Direct Email</label>
                  <input
                    type="email"
                    required
                    value={editProfileData.email}
                    onChange={e => setEditProfileData({ ...editProfileData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Direct Phone</label>
                  <input
                    type="text"
                    value={editProfileData.phone}
                    onChange={e => setEditProfileData({ ...editProfileData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-300">Studio / Location</label>
                  <input
                    type="text"
                    value={editProfileData.location}
                    onChange={e => setEditProfileData({ ...editProfileData, location: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                {/* Social Channels */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">GitHub Repository URL</label>
                  <input
                    type="url"
                    value={editProfileData.githubUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, githubUrl: e.target.value })}
                    placeholder="https://github.com/..."
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">LinkedIn URL</label>
                  <input
                    type="url"
                    value={editProfileData.linkedinUrl || ''}
                    onChange={e => setEditProfileData({ ...editProfileData, linkedinUrl: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    className="w-full px-3.5 py-2 bg-[#181C30] border border-slate-800 rounded-xl text-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditProfileData(DEFAULT_DEVELOPER_PROFILE);
                    setImagePreview(DEFAULT_DEVELOPER_PROFILE.avatarUrl);
                    setUrlInput(DEFAULT_DEVELOPER_PROFILE.avatarUrl);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  Reset Defaults
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#5B4DF5] to-[#7C3AED] hover:from-[#4E3EE8] hover:to-[#6D28D9] text-white font-bold shadow-md transition cursor-pointer"
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
      {/* MODAL 6: ADMIN INBOX FOR DIRECT MESSAGES                                  */}
      {/* ========================================================================= */}
      {showInboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111422] rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-800 max-h-[85vh] overflow-y-auto space-y-6 text-slate-100">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#6366F1] text-white flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Developer Inquiries Inbox</h3>
                  <p className="text-xs text-slate-400">Direct inquiries received through portfolio and contact form.</p>
                </div>
              </div>
              <button
                onClick={() => setShowInboxModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingMessages ? (
              <div className="py-12 text-center text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#6366F1]" />
                <span className="text-xs">Loading received messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-[#181C30] rounded-2xl border border-dashed border-slate-800">
                <MessageSquare className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <div className="text-xs font-bold text-slate-300">No Inquiries Logged Yet</div>
                <div className="text-[11px] text-slate-500">New contact submissions will appear here.</div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className="p-4 rounded-2xl bg-[#181C30] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-white">{msg.name} ({msg.email})</div>
                      <div className="text-slate-400 text-[10px]">{msg.submittedAt ? new Date(msg.submittedAt).toLocaleDateString() : ''}</div>
                    </div>
                    <div className="text-xs font-semibold text-[#818CF8]">{msg.subject}</div>
                    <p className="text-xs text-slate-300 bg-[#111422] p-3 rounded-xl border border-slate-800/80 whitespace-pre-wrap">
                      {msg.message}
                    </p>
                    {msg.phone && (
                      <div className="text-[11px] text-slate-400">
                        📞 Phone: {msg.phone}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowInboxModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
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
