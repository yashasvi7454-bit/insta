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
const formatNumber = (num: number) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
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

  const fetchProfile = async (inputUrl?: string) => {
    const targetUrl = inputUrl || profileUrl;
    if (!targetUrl.trim()) return;

    setLoading(true);
    setShowSuggestions(false);
    setError(null);
    try {
      const response = await axios.post('/api/fetch-profile', { url: targetUrl });
      setProfile(response.data.profile);
      setMedia(response.data.media);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
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
      alert('Failed to generate ZIP archive.');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handleSuggestionClick = (username: string) => {
    setProfileUrl(username);
    fetchProfile(username);
  };

  const filteredMedia = activeCategory === 'All' 
    ? media 
    : media.filter(m => m.type === activeCategory);

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-zinc-100 font-sans flex flex-col selection:bg-pink-600/30">
      {/* Header Navigation */}
      <header className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#0B0B0E]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-tr from-orange-500 via-pink-500 to-purple-600 rounded-lg shrink-0"></div>
          <span className="font-bold text-xl tracking-tight uppercase whitespace-nowrap">InstaFetch<span className="text-zinc-500 font-normal">PRO</span></span>
        </div>
        
        <div className="flex-1 max-w-xl px-4 md:px-10 relative">
          <form onSubmit={(e) => { e.preventDefault(); fetchProfile(); }} className="relative flex items-center group">
            <input 
              type="text" 
              placeholder="Enter username or paste link..." 
              className="w-full bg-zinc-900 border border-zinc-800 py-2.5 px-4 rounded-md text-sm focus:outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-600"
              value={profileUrl}
              onChange={(e) => setProfileUrl(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
            />
            <button 
              type="submit"
              disabled={loading}
              className="absolute right-2 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs font-semibold disabled:opacity-50 transition-colors uppercase tracking-widest"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : 'SEARCH'}
            </button>
          </form>

          {/* Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-14 left-4 right-4 md:left-10 md:right-10 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50"
              >
                {suggestions.map((user) => (
                  <button
                    key={user.username}
                    onClick={() => handleSuggestionClick(user.username)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors text-left border-b border-zinc-800/50 last:border-none"
                  >
                    <img src={user.avatar} className="w-8 h-8 rounded-full bg-zinc-800 object-cover" alt="" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm truncate">{user.username}</span>
                        {user.isVerified && <div className="w-3 h-3 bg-blue-500 rounded-full flex items-center justify-center text-[8px]">✓</div>}
                      </div>
                      <p className="text-zinc-500 text-xs truncate">{user.fullName}</p>
                    </div>
                    <ChevronRight size={14} className="text-zinc-700" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button 
          onClick={handleDownloadAll}
          disabled={downloadingAll || !profile}
          className="bg-white text-black px-4 md:px-6 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50 shrink-0"
        >
          {downloadingAll ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
          <span className="hidden sm:inline">DOWNLOAD ALL</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden" onClick={() => setShowSuggestions(false)}>
        {/* Sidebar: Profile Details */}
        <aside className={cn(
          "w-80 border-r border-zinc-800 bg-zinc-950/30 p-6 flex flex-col gap-6 overflow-y-auto hidden lg:flex transition-all",
          !profile && "hidden"
        )}>
          {profile && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col gap-6 h-full"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 mb-4 shadow-xl shadow-pink-500/10">
                  <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-[#0B0B0E] overflow-hidden">
                    <img src={profile.avatar} className="w-full h-full object-cover" alt="" />
                  </div>
                </div>
                <h2 className="text-xl font-bold uppercase tracking-wide">{profile.fullName}</h2>
                <p className="text-zinc-500 text-sm">@{profile.username}</p>
                
                <div className="flex gap-4 mt-4 w-full justify-center border-y border-zinc-800/50 py-4">
                  <div className="text-center">
                    <p className="font-bold">{formatNumber(profile.postCount)}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Posts</p>
                  </div>
                  <div className="text-center px-4 border-x border-zinc-800/50">
                    <p className="font-bold">{formatNumber(profile.followers)}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold">{formatNumber(profile.following)}</p>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Following</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2 font-bold underline decoration-pink-600 decoration-2 underline-offset-4">Biography</p>
                <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">{profile.bio}</p>
              </div>

              {(profile as any).isSimulated && (
                <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg flex flex-col gap-1">
                   <p className="text-[10px] text-orange-500 font-bold uppercase tracking-widest">Simulator Active</p>
                   <p className="text-xs text-zinc-400">Showing simulated content because: {(profile as any).simReason}</p>
                </div>
              )}

              <div className="mt-auto space-y-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Fetch Session Details</p>
                <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    className="h-full bg-pink-600" 
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>{media.length} items loaded</span>
                  <span>SSL Optimized</span>
                </div>
              </div>
            </motion.div>
          )}
        </aside>

        {/* Main Content: Category Tabs & Grid */}
        <main className="flex-1 flex flex-col bg-[#0B0B0E]">
          {error && (
            <div className="m-6 p-6 bg-red-500/10 border border-red-500/20 text-red-100 rounded-xl flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-500 text-black rounded-lg flex items-center justify-center font-bold font-mono">!</div>
                <h3 className="font-bold uppercase tracking-tight text-red-500">{error.code.replace(/_/g, ' ')}</h3>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{error.message}</p>
              {error.code === 'PRIVATE_ACCOUNT' && (
                <p className="text-xs text-zinc-500 mt-2 px-3 py-2 bg-black/30 rounded border border-zinc-800">Note: Private accounts cannot be accessed via public search agents. The user must be public.</p>
              )}
            </div>
          )}

          {!profile && !loading && !error && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 to-transparent">
              <div className="w-16 h-16 border-2 border-zinc-800 rounded-2xl flex items-center justify-center mb-6 text-zinc-700">
                <Layers size={32} />
              </div>
              <h1 className="text-4xl font-bold uppercase tracking-tighter mb-4 italic">Insta<span className="text-zinc-700">Fetch</span> Controller</h1>
              <p className="text-zinc-500 max-w-sm text-xs uppercase tracking-widest leading-loose">Enter an active Instagram username to index and organize all published visual assets.</p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 border-t-2 border-pink-500 rounded-full animate-spin"></div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 font-bold ml-1">Indexing Assets...</span>
            </div>
          )}

          {profile && (
            <>
              <div className="h-14 border-b border-zinc-800 flex items-center px-6 gap-8 bg-zinc-950/20 backdrop-blur-sm sticky top-16 z-40">
                {(['All', 'Post', 'Reel', 'Story'] as Category[]).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "h-full px-2 text-[10px] font-bold uppercase tracking-widest transition-all relative",
                      activeCategory === cat ? "text-white" : "text-zinc-500 hover:text-white"
                    )}
                  >
                    {cat}
                    {activeCategory === cat && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-pink-600"
                      />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {filteredMedia.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative group bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 aspect-square"
                    >
                      <div className="absolute top-2 right-2 z-10 bg-black/60 backdrop-blur p-1 rounded-md text-white pointer-events-none">
                        {item.isVideo ? <Play size={14} fill="currentColor" /> : <Grid3X3 size={14} />}
                      </div>
                      <img src={item.url} className="w-full h-full object-cover grayscale-[0.2] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" alt="" />
                      
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-sm">
                        <div className="flex gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                           <div className="flex items-center gap-1.5"><Heart size={12} className="text-pink-600" /> {formatNumber(item.likes)}</div>
                           <div className="flex items-center gap-1.5"><MessageCircle size={12} className="text-blue-500" /> {formatNumber(item.comments)}</div>
                        </div>
                        <button className="w-32 py-2 bg-white text-black text-[10px] font-bold rounded uppercase tracking-widest hover:bg-zinc-200 transition-colors">
                          <a href={item.url} target="_blank" rel="noreferrer" className="block w-full">View Detail</a>
                        </button>
                        <button className="w-32 py-2 border border-white text-white text-[10px] font-bold rounded uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                          <a href={item.videoUrl || item.url} download className="block w-full">Download</a>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              
              {/* Footer Controls */}
              <div className="h-12 border-t border-zinc-800 px-6 flex items-center justify-between text-[10px] text-zinc-500 uppercase tracking-widest bg-zinc-950/40">
                <div className="flex gap-4">
                  <span>Items: {media.length}</span>
                  <span className="text-zinc-700">|</span>
                  <span className="hidden sm:inline">Active Filter: {activeCategory}</span>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" checked readOnly className="accent-pink-600" /> 
                    <span className="group-hover:text-zinc-300">High Res Sync</span>
                  </label>
                  <div className="text-zinc-200 font-bold bg-zinc-800 px-3 py-1 rounded cursor-pointer hover:bg-zinc-700 transition-colors">
                    PRO ARCHIVE v1.0
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
