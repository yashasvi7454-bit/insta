import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Download, 
  Search, 
  Grid3X3, 
  Play, 
  Heart, 
  MessageCircle, 
  Loader2,
  ExternalLink,
  ChevronRight,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import axios from 'axios';
import confetti from 'canvas-confetti';
import { InstagramProfile, InstagramMedia, Category } from './types';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to format numbers
const formatNumber = (num: any) => {
  if (typeof num !== 'number') return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return (num || 0).toString();
};

export default function App() {
  const [profileUrl, setProfileUrl] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [error, setError] = useState<{ code: string, message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (profileUrl.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await axios.get(`/api/search-suggestions?q=${profileUrl}`);
        setSuggestions(res.data.users);
      } catch (e) {
        console.error("Failed to fetch suggestions");
      }
    };

    const timeout = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeout);
  }, [profileUrl]);

  const fetchProfile = async (username: string) => {
    setLoading(true);
    setShowSuggestions(false);
    setError(null);
    try {
      const response = await axios.post('/api/fetch-profile', { url: username });
      setProfile(response.data.profile);
      setMedia(response.data.media);
      setIsModalOpen(true);
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#EB455F', '#5F9DF7', '#FFFFFF']
      });
    } catch (err: any) {
      const errData = err.response?.data;
      setError({
        code: errData?.error || 'UNKNOWN_ERROR',
        message: errData?.message || 'Failed to connect to search service.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!profile || media.length === 0) return;
    setDownloadingAll(true);
    try {
      const response = await axios.post('/api/download-all', 
        { media, username: profile.username },
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${profile.username}_all_media.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download all failed', err);
    } finally {
      setDownloadingAll(false);
    }
  };

  const filteredMedia = activeCategory === 'All' 
    ? media 
    : media.filter(m => m.type === activeCategory);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-zinc-100 font-sans flex flex-col selection:bg-pink-600/30 overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-zinc-800 flex items-center justify-between px-8 bg-[#0B0B0E] z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-pink-600 to-purple-600 rounded-xl shadow-lg shadow-pink-600/20" />
          <span className="font-black text-2xl tracking-tighter uppercase whitespace-nowrap">Insta<span className="text-pink-600">Fetch</span></span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500">
          <span className="hover:text-white cursor-pointer transition-colors">Documentation</span>
          <span className="hover:text-white cursor-pointer transition-colors">API Status</span>
          <span className="text-white bg-zinc-800 px-3 py-1 rounded">V1.2 PRO</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center relative p-6">
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/5 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-2xl z-10 space-y-12">
          <div className="text-center space-y-4">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic"
            >
              Search <span className="text-zinc-800">Profiles.</span>
            </motion.h1>
            <p className="text-zinc-500 text-xs uppercase tracking-[0.4em] font-bold">Discover & Archive Visual Assets</p>
          </div>

          <div className="relative">
            <div className="relative group">
              <input 
                type="text"
                placeholder="Type name or username..."
                className="w-full bg-zinc-900/50 border-2 border-zinc-800 p-6 rounded-2xl text-xl md:text-2xl font-bold focus:outline-none focus:border-pink-600/50 transition-all placeholder:text-zinc-800 backdrop-blur-xl"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2">
                {loading ? <Loader2 className="animate-spin text-pink-600" size={32} /> : <Search size={32} className="text-zinc-800" />}
              </div>
            </div>

            {/* Suggestions View */}
            <AnimatePresence>
              {profileUrl.length >= 2 && suggestions.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="absolute top-[calc(100%+12px)] left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 divide-y divide-zinc-800/50"
                >
                  <div className="p-3 bg-zinc-800/20 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Global Search Results</div>
                  {suggestions.map((user) => (
                    <button
                      key={user.username}
                      onClick={() => fetchProfile(user.username)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors group"
                    >
                      <div className="relative">
                        <img src={user.avatar} className="w-12 h-12 rounded-full ring-2 ring-zinc-800 group-hover:ring-pink-600 transition-all object-cover" alt="" />
                        {user.isVerified && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-900"><div className="w-2 h-2 bg-white rounded-full" /></div>}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-black text-lg tracking-tight uppercase group-hover:text-pink-500 transition-colors">{user.username}</p>
                        <p className="text-zinc-600 text-xs font-semibold">{user.fullName}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg border border-zinc-800 flex items-center justify-center group-hover:bg-pink-600 group-hover:border-pink-600 transition-all">
                        <ChevronRight size={18} className="text-zinc-700 group-hover:text-white" />
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col gap-2"
            >
              <h3 className="font-black uppercase tracking-widest text-red-500 text-xs">Extraction Failed: {error.code}</h3>
              <p className="text-sm text-zinc-400">{error.message}</p>
            </motion.div>
          )}
        </div>
      </main>

      {/* Full Page Modal */}
      <AnimatePresence>
        {isModalOpen && profile && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[#0B0B0E] flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="h-16 border-b border-zinc-800 px-6 flex items-center justify-between bg-zinc-950/50 backdrop-blur-md">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-700 transition-colors">
                  <ChevronRight size={18} className="rotate-180" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">Back to Search</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Active Profile: <span className="text-white">{profile.username}</span></span>
              </div>

              <div className="flex items-center gap-3">
                <button 
                  onClick={handleDownloadAll}
                  disabled={downloadingAll}
                  className="bg-white text-black px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:grayscale transition-all disabled:opacity-50"
                >
                  {downloadingAll ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                  ZIP ALL MEDIA
                </button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Profile Bar */}
              <aside className="w-96 border-r border-zinc-800 p-10 flex flex-col gap-8 overflow-y-auto bg-zinc-950/40">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-40 h-40 rounded-full p-2 bg-gradient-to-tr from-pink-600 via-purple-600 to-blue-600">
                    <img src={profile.avatar} className="w-full h-full rounded-full border-4 border-[#0B0B0E] object-cover" alt="" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight uppercase italic">{profile.fullName}</h2>
                    <p className="text-pink-600 font-mono text-sm">@{profile.username}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 border-y border-zinc-800/50 py-8">
                  <div className="text-center">
                    <p className="font-black text-xl">{formatNumber(profile.postCount)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Assets</p>
                  </div>
                  <div className="text-center border-x border-zinc-800/50">
                    <p className="font-black text-xl">{formatNumber(profile.followers)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Reach</p>
                  </div>
                  <div className="text-center">
                    <p className="font-black text-xl">{formatNumber(profile.following)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">Connect</p>
                  </div>
                </div>

                <div className="space-y-3">
                   <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 underline decoration-pink-600/50 underline-offset-8 decoration-2 mb-4">Identity Meta</p>
                   <p className="text-sm text-zinc-400 leading-relaxed font-light whitespace-pre-wrap">{profile.bio}</p>
                </div>

                <div className="mt-auto pt-8 border-t border-zinc-800/50 space-y-4">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                      <span>Server Region</span>
                      <span className="text-zinc-400">ASIA-S1</span>
                   </div>
                   <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-2/3" />
                   </div>
                </div>
              </aside>

              {/* Feed Grid */}
              <div className="flex-1 flex flex-col bg-zinc-950/20">
                <div className="h-16 border-b border-zinc-800 flex items-center px-8 gap-10 sticky top-0 bg-[#0B0B0E]/80 backdrop-blur-md z-10">
                  {(['All', 'Post', 'Reel', 'Story'] as Category[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        "h-full relative text-[10px] font-bold uppercase tracking-[0.2em] transition-colors",
                        activeCategory === cat ? "text-white" : "text-zinc-600 hover:text-white"
                      )}
                    >
                      {cat}
                      {activeCategory === cat && (
                        <motion.div layoutId="modalTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1 p-8 overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredMedia.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative group aspect-[4/5] bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden"
                      >
                         <img src={item.url} className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700" alt="" />
                         <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur text-[8px] font-black uppercase tracking-tighter text-white border border-white/10 rounded">
                           {item.type}
                         </div>
                         <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center p-6 text-center gap-4">
                            <div className="flex gap-4 mb-2">
                               <div className="flex flex-col items-center"><Heart size={14} className="text-pink-600 mb-1" /> <span className="text-[10px] font-bold">{formatNumber(item.likes)}</span></div>
                               <div className="flex flex-col items-center"><MessageCircle size={14} className="text-blue-500 mb-1" /> <span className="text-[10px] font-bold">{formatNumber(item.comments)}</span></div>
                            </div>
                            <p className="text-[10px] text-zinc-500 line-clamp-2 italic">"{item.caption || "No caption provided."}"</p>
                            <div className="flex gap-2 w-full">
                               <a href={item.url} target="_blank" rel="noreferrer" className="flex-1 py-1.5 bg-white text-black text-[9px] font-bold uppercase tracking-widest rounded hover:bg-zinc-200 transition-colors text-center">Inspect</a>
                               <a href={item.videoUrl || item.url} download className="flex-1 py-1.5 border border-white text-white text-[9px] font-bold uppercase tracking-widest rounded hover:bg-white hover:text-black transition-all text-center">Save</a>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
