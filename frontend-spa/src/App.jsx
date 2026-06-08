import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useLocation } from 'react-router-dom';

// Inline SVG icons — no package dependency
const Trophy     = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5h4"/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M6 5h12v7a6 6 0 0 1-12 0V5Z"/></svg>;
const Menu       = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
const Search     = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const User       = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ChevronRight=({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
const Calendar   = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const Clock      = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const Share2     = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>;
const TrendingUp = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const Mail       = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
const Play       = ({size=16,className='',fill='none'}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const ArrowRight = ({size=16,className=''}) => <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

// --- Components ---



const AboutPage = () => (
  <div className="max-w-3xl mx-auto px-4 py-20 text-center">
    <h1 className="text-5xl font-black uppercase italic italic mb-8">About The Talk</h1>
    <p className="text-lg text-gray-600 leading-relaxed mb-8">
      BounceBackTalk is the premier destination for daily basketball insights and sports news. Founded by Arthur Sports Media, we focus on the stories that matter—the redemptions, the trades, and the buzzer-beaters.
    </p>
    <Link to="/" className="inline-block bg-[#E21111] text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-black transition-colors">
      Back to Headlines
    </Link>
  </div>
);

// Today's date in ESPN format (YYYYMMDD) — ensures ticker only shows today's games
const getTodayESPN = () => {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
};

// Sports config — ESPN endpoint for each league
const SPORTS = [
  { label: 'NBA',    slug: 'basketball/nba',  url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard' },
  { label: 'NFL',    slug: 'football/nfl',    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard' },
  { label: 'MLB',    slug: 'baseball/mlb',    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard' },
  { label: 'NHL',    slug: 'hockey/nhl',      url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard' },
  { label: 'Soccer', slug: 'soccer/usa.1',    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard' },
];
const SPORT_SLUG = Object.fromEntries(SPORTS.map(s => [s.label, s.slug]));

const parseESPN = (data, league) =>
  (data.events || []).map(event => {
    const comp = event.competitions[0];
    const away = comp.competitors.find(c => c.homeAway === 'away');
    const home = comp.competitors.find(c => c.homeAway === 'home');
    const status = comp.status;
    return {
      id: event.id,
      league,
      away: { name: away.team.shortDisplayName, abbr: away.team.abbreviation, logo: away.team.logo, score: away.score || '0' },
      home: { name: home.team.shortDisplayName, abbr: home.team.abbreviation, logo: home.team.logo, score: home.score || '0' },
      state: status.type.state,
      detail: status.type.shortDetail,
      completed: status.type.completed,
    };
  });

// Hook for a single sport
const useESPNScores = (url) => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setGames([]);
    const fetchScores = async () => {
      try {
        const res = await fetch(`${url}?dates=${getTodayESPN()}`);
        const data = await res.json();
        setGames(parseESPN(data, ''));
      } catch (e) {
        console.error('ESPN fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
    const id = setInterval(fetchScores, 60000);
    return () => clearInterval(id);
  }, [url]);
  return { games, loading };
};

// Hook that fetches ALL sports for the ticker
const useAllSportsScores = () => {
  const [games, setGames] = useState([]);
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          SPORTS.map(s => fetch(`${s.url}?dates=${getTodayESPN()}`).then(r => r.json()).then(d => parseESPN(d, s.label)))
        );
        setGames(results.flat());
      } catch (e) {
        console.error('ESPN all-sports error:', e);
      }
    };
    fetchAll();
    const id = setInterval(fetchAll, 60000);
    return () => clearInterval(id);
  }, []);
  return games;
};

const ScoresTicker = () => {
  const games = useAllSportsScores();

  if (games.length === 0) {
    return (
      <div className="bg-[#121212] border-b border-white/10 py-2 text-[10px] font-bold uppercase tracking-wider text-white text-center">
        <span className="animate-pulse text-[#E21111]">● Loading Live Scores...</span>
      </div>
    );
  }

  return (
    <div className="bg-[#121212] border-b border-white/10 overflow-hidden whitespace-nowrap py-2 text-[10px] font-bold uppercase tracking-wider text-white group/ticker">
      <div className="flex gap-8 items-center px-4"
        style={{ animation: 'ticker-scroll 60s linear infinite' }}
        onMouseEnter={e => e.currentTarget.style.animationPlayState = 'paused'}
        onMouseLeave={e => e.currentTarget.style.animationPlayState = 'running'}
      >
        {[...games, ...games].map((game, i) => (
          <Link
            key={i}
            to={`/game/${game.league}/${game.id}`}
            className="flex items-center gap-4 border-r border-white/10 pr-8 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
          >
            {/* League badge */}
            <span className="text-[8px] font-black text-[#E21111] min-w-[28px]">{game.league}</span>
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between gap-5 items-center">
                <span className="font-black">{game.away.abbr}</span>
                <span className={`font-mono text-xs ${parseInt(game.away.score) > parseInt(game.home.score) && game.state !== 'pre' ? 'text-[#E21111]' : ''}`}>
                  {game.state === 'pre' ? '–' : game.away.score}
                </span>
              </div>
              <div className="flex justify-between gap-5 items-center">
                <span className="font-black">{game.home.abbr}</span>
                <span className={`font-mono text-xs ${parseInt(game.home.score) > parseInt(game.away.score) && game.state !== 'pre' ? 'text-[#E21111]' : ''}`}>
                  {game.state === 'pre' ? '–' : game.home.score}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center min-w-[44px]">
              {game.completed ? (
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[8px] text-gray-400">FINAL</span>
              ) : game.state === 'in' ? (
                <>
                  <span className="text-[#E21111] text-[8px] font-black animate-pulse">● LIVE</span>
                  <span className="text-gray-400 text-[8px]">{game.detail}</span>
                </>
              ) : (
                <span className="text-gray-400 text-[8px] text-center leading-tight">{game.detail}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const Nav = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  // Close menu/search on route change
  React.useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location]);

  return (
    <nav className="bg-[#121212] text-white sticky top-0 z-50 shadow-xl">
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="text-2xl font-black uppercase tracking-tighter italic text-white group-hover:text-[#E21111] transition-colors">
                BounceBack<span className="text-[#E21111]">Talk</span>
              </div>
            </Link>
            <div className="hidden lg:flex gap-8 uppercase text-[11px] font-black tracking-widest">
              {[['Basketball','/category/basketball'],['NFL','/category/nfl'],['MLB','/category/mlb'],['Scores','/category/scores']].map(([label, path]) => (
                <Link key={label} to={path}
                  className={`relative py-1 transition-colors hover:text-[#E21111] ${location.pathname === path ? 'text-[#E21111] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#E21111]' : ''}`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setSearchOpen(s => !s); setMenuOpen(false); }}
              className={`p-2 rounded-lg transition-all ${searchOpen ? 'bg-[#E21111] text-white' : 'hover:bg-white/10'}`}
              aria-label="Search"
            >
              {searchOpen
                ? <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                : <Search size={18} />
              }
            </button>
            <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest">
              <User size={16} /> Sign In
            </button>
            <button
              onClick={() => { setMenuOpen(s => !s); setSearchOpen(false); }}
              className={`lg:hidden p-2 rounded-lg transition-all ${menuOpen ? 'bg-[#E21111]' : 'hover:bg-white/10'}`}
              aria-label="Menu"
            >
              {menuOpen
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                : <Menu size={20} />
              }
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="border-t border-white/10 bg-[#1a1a1a] px-4 py-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-w-2xl mx-auto flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-[#E21111] transition-colors">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search players, teams, stories..."
              className="flex-1 bg-transparent text-white text-sm font-medium outline-none placeholder:text-gray-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-center text-gray-500 text-xs font-bold uppercase tracking-widest mt-4">
              Showing results for "{searchQuery}"…
            </p>
          )}
        </div>
      )}

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#1a1a1a] animate-in fade-in slide-in-from-top-2 duration-200">
          {[['🏀 Basketball','/category/basketball'],['🏈 NFL','/category/nfl'],['⚾ MLB','/category/mlb'],['📊 Scores','/category/scores'],['👤 Sign In','/signin']].map(([label, path]) => (
            <Link key={label} to={path}
              className="flex items-center gap-3 px-6 py-4 text-sm font-black uppercase tracking-widest border-b border-white/5 hover:bg-white/5 hover:text-[#E21111] transition-all">
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

const FeaturedHero = () => (
  <Link to="/article/1" className="block relative group overflow-hidden mb-12 rounded-2xl shadow-2xl ring-1 ring-black/5">
    <div className="aspect-[16/9] md:aspect-[21/9] relative">
      <img 
        src="https://images.unsplash.com/photo-1504450758481-7338eba7524a?q=80&w=1600&auto=format&fit=crop" 
        alt="Featured" 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
      {/* Live badge */}
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <span className="flex items-center gap-1.5 bg-[#E21111] text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Featured
        </span>
      </div>
      <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full max-w-4xl">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-white/50 text-[10px] font-bold uppercase flex items-center gap-1.5 tracking-widest">
            <Clock size={11} /> 45 MIN AGO
          </span>
          <span className="w-1 h-1 rounded-full bg-white/30"></span>
          <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Basketball</span>
        </div>
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-black uppercase italic leading-[0.92] tracking-tighter text-white mb-4 drop-shadow-lg">
          The King's Ransom: Why the Lakers Are Betting on Redemption
        </h1>
        <p className="text-white/70 text-sm md:text-base max-w-2xl line-clamp-2 font-medium leading-relaxed">
          As the trade deadline looms, Rob Pelinka is making moves that could define the next decade of Los Angeles basketball history.
        </p>
        <div className="mt-5 flex items-center gap-2 text-[#E21111] text-[11px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          Read Story <ArrowRight size={14} />
        </div>
      </div>
    </div>
  </Link>
);

const NewsCard = ({ compact = false }) => (
  <div className={`group cursor-pointer ${
    compact 
      ? 'flex gap-3 mb-5 items-start' 
      : 'mb-8 flex flex-col md:flex-row gap-5 bg-white hover:bg-gray-50/80 p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300'
  }`}>
    {!compact && (
      <div className="w-full md:w-[42%] aspect-[16/9] overflow-hidden relative rounded-xl shadow-sm shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=800&auto=format&fit=crop" 
          alt="News"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm p-1.5 rounded-full text-white">
          <Play size={13} fill="white" />
        </div>
      </div>
    )}
    {compact && (
      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-gray-100">
        <img 
          src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=200&auto=format&fit=crop"
          alt="News"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    )}
    <div className={compact ? 'flex-1 min-w-0' : 'w-full md:flex-1'}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[9px] font-black uppercase text-[#E21111] tracking-widest bg-red-50 px-2 py-0.5 rounded-full">Breaking</span>
        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">2h ago</span>
      </div>
      <h3 className={`${
        compact ? 'text-[13px] leading-snug' : 'text-xl md:text-2xl leading-tight'
      } font-black uppercase italic tracking-tight group-hover:text-[#E21111] transition-colors line-clamp-2`}>
        New Trade Rumors Surface Ahead of Trade Deadline
      </h3>
      {!compact && (
        <p className="text-gray-400 text-sm mt-2.5 leading-relaxed line-clamp-2">
          Inside sources reveal that BounceBackTalk has obtained details on a potential three-team trade involving top stars.
        </p>
      )}
      {!compact && (
        <div className="flex items-center gap-2 mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-[#E21111] transition-colors">
          Read More <ArrowRight size={12} />
        </div>
      )}
    </div>
  </div>
);

const Sidebar = () => (
  <aside className="space-y-10">
    {/* Trending */}
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
        <h2 className="text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <TrendingUp size={15} className="text-[#E21111]" /> Trending
        </h2>
        <Link to="/trending" className="text-[10px] font-black uppercase text-[#E21111] hover:underline tracking-widest">See All</Link>
      </div>
      {[1, 2, 3, 4, 5].map(i => <NewsCard key={i} compact />)}
    </section>

    {/* Newsletter */}
    <section className="relative overflow-hidden bg-[#121212] text-white p-7 rounded-2xl shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#E21111]/10 rounded-full -translate-y-8 translate-x-8 blur-2xl pointer-events-none" />
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-[#E21111] rounded-xl flex items-center justify-center shadow-lg">
          <Mail size={18} className="text-white" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest leading-none">The Talk Daily</h2>
          <p className="text-[10px] text-gray-400 uppercase font-bold mt-0.5">50k+ Subscribers</p>
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-5 font-medium leading-relaxed">The only sports briefing you need. In your inbox every morning at 6AM EST.</p>
      <div className="space-y-2.5">
        <input
          type="email"
          placeholder="your@email.com"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#E21111] focus:ring-1 focus:ring-[#E21111] outline-none transition-all"
        />
        <button className="w-full bg-[#E21111] hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-[0.2em] py-3.5 rounded-xl transition-all shadow-lg shadow-red-900/30 active:scale-95">
          Join The Talk →
        </button>
      </div>
    </section>

    {/* Promo card */}
    <section className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-lg group cursor-pointer">
      <img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5">
        <span className="text-white/50 text-[9px] font-black uppercase tracking-widest mb-1.5">Sponsored</span>
        <h4 className="text-white text-base font-black uppercase italic leading-tight">Upgrade Your Court Game with New Gear</h4>
      </div>
    </section>
  </aside>
);

// --- Pages ---


const MobileBottomNav = () => {
  const location = useLocation();
  const isScores = location.pathname.includes('scores');

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-white/10 pb-safe"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-stretch h-16">
        <Link to="/" className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${!isScores ? 'text-[#E21111]' : 'text-gray-500'}`}>
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
        </Link>

        <Link to="/category/scores" className="flex-1 flex flex-col items-center justify-center gap-0.5 mx-2 -mt-3">
          <div className={`w-full mx-3 py-3 rounded-2xl flex flex-col items-center gap-0.5 shadow-xl ${isScores ? 'bg-white' : 'bg-[#E21111]'}`}>
            <svg className={`w-5 h-5 ${isScores ? 'text-[#E21111]' : 'text-white'}`} fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/>
            </svg>
            <span className={`text-[9px] font-black uppercase tracking-widest ${isScores ? 'text-[#E21111]' : 'text-white'}`}>Scores</span>
          </div>
        </Link>

        <Link to="/category/basketball" className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors text-gray-500 hover:text-[#E21111]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM6.5 9h3.27C9.29 10.27 9.06 11.6 9.01 13H6.5V9zm0 6h2.51c.05 1.4.28 2.73.76 4H6.5v-4zm5.5 5c-.94-1.08-1.5-2.4-1.73-4h3.46c-.23 1.6-.79 2.92-1.73 4zm-1.73-6c.05-1.4.33-2.73.79-4h1.88c.46 1.27.74 2.6.79 4h-3.46zm5.23 6H13.22c.48-1.27.71-2.6.76-4H17.5v4zm-2.26-6h2.51V9h-2.51c-.05 1.27-.28 2.6-.76 4h.76z"/>
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">NBA</span>
        </Link>

        <Link to="/category/mlb" className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors text-gray-500 hover:text-[#E21111]">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.9 4.33 3.56zm-6.93-4c.83 1.2 1.48 2.53 1.91 4h-3.82c.43-1.47 1.08-2.8 1.91-4zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.07c.96-1.66 2.49-2.93 4.33-3.56C8.8 5.55 8.34 6.75 8.02 8zM12 20c-.83-1.2-1.48-2.53-1.91-4h3.82c-.43 1.47-1.08 2.8-1.91 4zm2.34-6H9.66c-.09-.66-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.66-2.49 2.93-4.33 3.56zM17.74 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>
          </svg>
          <span className="text-[9px] font-black uppercase tracking-widest">MLB</span>
        </Link>
      </div>
    </nav>
  );
};

const HomePage = () => (
  <div className="max-w-7xl mx-auto px-4 py-8 md:py-12 pb-24 md:pb-12">

    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
      <div className="lg:col-span-8">
        <FeaturedHero />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-4 border-b-4 border-black">
          <h2 className="text-3xl font-black uppercase italic tracking-tighter">Latest Headlines</h2>
          <div className="flex flex-wrap gap-4 text-[11px] font-black uppercase tracking-widest text-gray-400">
            <button className="text-black border-b-2 border-[#E21111] pb-1">All Sports</button>
            <button className="hover:text-black">Basketball</button>
            <button className="hover:text-black">NFL</button>
            <button className="hover:text-black">MLB</button>
            <button className="hover:text-black">Soccer</button>
          </div>
        </div>
        {[1, 2, 3, 4, 5, 6].map(i => <NewsCard key={i} />)}
        <button className="w-full py-4 border-2 border-black text-[11px] font-black uppercase tracking-[0.3em] hover:bg-black hover:text-white transition-all mt-8">
          Load More News
        </button>
      </div>
      <div className="lg:col-span-4">
        <Sidebar />
      </div>
    </div>
  </div>
);

const CategoryPage = () => {
  const { slug } = useParams();
  if (slug === 'scores') return <ScoresPage />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center gap-4 mb-12">
        <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">{slug}</h1>
        <div className="h-2 flex-1 bg-black mt-2"></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <NewsCard key={i} />)}
        </div>
        <div className="lg:col-span-4">
          <Sidebar />
        </div>
      </div>
    </div>
  );
};

const GameCard = ({ game }) => {
  const awayWinning = parseInt(game.away.score) > parseInt(game.home.score);
  const homeWinning = parseInt(game.home.score) > parseInt(game.away.score);
  const isLive = game.state === 'in';
  const isDone = game.completed;
  const isPre  = game.state === 'pre';

  return (
    <Link to={`/game/${game.league}/${game.id}`} className="block overflow-hidden transition-all duration-300 bg-white shadow-lg rounded-2xl border border-gray-100 hover:-translate-y-1 hover:shadow-2xl">
      <div className="bg-[#121212] px-4 py-3 flex justify-between items-center">
        <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
          {game.league} · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
        {isDone ? (
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">FINAL</span>
        ) : isLive ? (
          <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[#E21111]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse"></span>
            LIVE · {game.detail}
          </span>
        ) : (
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{game.detail}</span>
        )}
      </div>
      <div className="p-5 space-y-4">
        <div className={`flex justify-between items-center ${isDone && !awayWinning ? 'opacity-40' : ''}`}>
          <div className="flex items-center gap-3">
            <img src={game.away.logo} alt={game.away.name} className="w-11 h-11 object-contain" onError={e => e.target.style.display='none'} />
            <div>
              <div className="text-sm font-black uppercase leading-none">{game.away.name}</div>
              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Away</div>
            </div>
          </div>
          <span className={`text-3xl font-black italic tracking-tighter ${awayWinning && !isPre ? 'text-[#E21111]' : ''}`}>
            {isPre ? '–' : game.away.score}
          </span>
        </div>
        <div className="border-t border-gray-100"></div>
        <div className={`flex justify-between items-center ${isDone && !homeWinning ? 'opacity-40' : ''}`}>
          <div className="flex items-center gap-3">
            <img src={game.home.logo} alt={game.home.name} className="w-11 h-11 object-contain" onError={e => e.target.style.display='none'} />
            <div>
              <div className="text-sm font-black uppercase leading-none">{game.home.name}</div>
              <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Home</div>
            </div>
          </div>
          <span className={`text-3xl font-black italic tracking-tighter ${homeWinning && !isPre ? 'text-[#E21111]' : ''}`}>
            {isPre ? '–' : game.home.score}
          </span>
        </div>
      </div>
    </Link>
  );
};

const ScoresPage = () => {
  const [activeSport, setActiveSport] = useState(SPORTS[0]);
  const { games, loading } = useESPNScores(activeSport.url);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b-4 border-black pb-4">
        <div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none">Scores</h1>
          <p className="text-[11px] font-black uppercase tracking-widest text-[#E21111] mt-2">
            Live Game Center · Updates every 60s
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {SPORTS.map(sport => (
            <button
              key={sport.label}
              onClick={() => setActiveSport(sport)}
              className={`px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                activeSport.label === sport.label
                  ? 'bg-[#E21111] text-white'
                  : 'text-gray-400 hover:text-black'
              }`}
            >
              {sport.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-[#E21111] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Fetching Live Scores...</p>
        </div>
      ) : games.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-2xl font-black uppercase italic text-gray-300 mb-2">No Games Today</p>
          <p className="text-sm text-gray-400">Check back on game day for live scores</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map(game => (
            <GameCard key={game.id} game={{ ...game, league: activeSport.label }} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Game Detail Page ---

const STAT_COLS = ['MIN','PTS','REB','AST','STL','BLK','TO','FG','3PT'];

const GameDetailPage = () => {
  const { league, id } = useParams();
  const slug = SPORT_SLUG[league];
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTeam, setActiveTeam] = useState(0);
  const [statGroup, setStatGroup] = useState(0);
  const [teamRosters, setTeamRosters] = useState([]);
  const [ppgMap, setPpgMap] = useState({});  // name → PPG from SportsData.io

  useEffect(() => {
    if (!slug) { setError('Unknown sport'); setLoading(false); return; }
    setLoading(true);
    setData(null);
    setActiveTeam(0);
    setStatGroup(0);
    setTeamRosters([]);
    fetch(`https://site.api.espn.com/apis/site/v2/sports/${slug}/summary?event=${id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [slug, id]);

  // Once we have the game data, fetch both team rosters (works year-round)
  useEffect(() => {
    if (!data || !slug) return;
    const competitors = data.header?.competitions?.[0]?.competitors ?? [];
    if (competitors.length === 0) return;
    Promise.all(
      competitors.map(c =>
        fetch(`https://site.api.espn.com/apis/site/v2/sports/${slug}/teams/${c.team.id}/roster`)
          .then(r => r.json())
          .then(d => ({ team: c.team, athletes: d.athletes ?? [] }))
          .catch(() => ({ team: c.team, athletes: [] }))
      )
    ).then(rosters => setTeamRosters(rosters));
  }, [data, slug]);

  // For NBA games: fetch real season PPG from SportsData.io
  useEffect(() => {
    if (league?.toUpperCase() !== 'NBA') return;
    const season = new Date().getFullYear();
    fetch(`https://api.sportsdata.io/v3/nba/stats/json/PlayerSeasonStats/${season}?key=cd48920d0d784a2199d1ceefa5183f6b`)
      .then(r => r.ok ? r.json() : [])
      .then(players => {
        const map = {};
        players.forEach(p => {
          if (p.Name && p.Games > 0) {
            // Points is a season total — divide by games for PPG
            const ppg = parseFloat(p.Points ?? 0) / p.Games;
            const key = p.Name.toLowerCase();
            // Keep highest PPG if player appears on multiple teams
            if (!map[key] || ppg > map[key]) map[key] = ppg;
          }
        });
        setPpgMap(map);
      })
      .catch(() => {});
  }, [league]);

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-32 text-center">
      <div className="w-12 h-12 border-4 border-[#E21111] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-[11px] font-black uppercase tracking-widest text-gray-500">Loading Game Data...</p>
    </div>
  );

  if (error || !data) return (
    <div className="max-w-4xl mx-auto px-4 py-32 text-center">
      <p className="text-2xl font-black uppercase italic text-gray-300 mb-4">Game Not Found</p>
      <Link to="/category/scores" className="inline-block bg-[#E21111] text-white px-8 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-black transition-colors">
        ← Back to Scores
      </Link>
    </div>
  );

  // Parse header
  const comp      = data.header?.competitions?.[0];
  const away      = comp?.competitors?.find(c => c.homeAway === 'away');
  const home      = comp?.competitors?.find(c => c.homeAway === 'home');
  const status    = comp?.status?.type;
  const isLive    = status?.state === 'in';
  const isDone    = status?.completed;
  const isPre     = status?.state === 'pre';

  const awayScore = away?.score ?? '–';
  const homeScore = home?.score ?? '–';
  const awayRecord = away?.record?.[0]?.summary ?? '';
  const homeRecord = home?.record?.[0]?.summary ?? '';

  // Linescores (periods)
  const awayLines = away?.linescores ?? [];
  const homeLines = home?.linescores ?? [];

  // Sport type from slug (e.g. "basketball/nba" → "basketball")
  const sport = slug?.split('/')?.[0];

  // Box score players — statGroup lets NFL switch Passing/Rushing/Receiving
  const bsPlayers = data.boxscore?.players ?? [];
  const statGroupNames = (bsPlayers[0]?.statistics ?? []).map(g =>
    (g.label ?? g.name ?? '').toUpperCase()
  );
  const teamStats = bsPlayers.map(tp => ({
    team: tp.team,
    names:    tp.statistics?.[statGroup]?.names    ?? [],
    athletes: tp.statistics?.[statGroup]?.athletes ?? [],
  }));

  // Rosters (pre-game lineups / full active roster)
  const rosterData = (data?.rosters ?? []).map(r => ({
    team: r.team,
    players: [...(r.roster ?? [])].sort((a, b) => (b.starter ? 1 : 0) - (a.starter ? 1 : 0)),
  }));

  // MLB: probable starters come from the competition competitors
  const probablePitchers = (comp?.competitors ?? [])
    .filter(c => c.probables?.[0]?.athlete)
    .map(c => ({
      ...c.probables[0].athlete,
      record: c.probables[0].record,
      statistics: c.probables[0].statistics ?? [],
      homeAway: c.homeAway,
      team: c.team,
    }));

  // Resolve column indices dynamically so it works for any sport
  const getStatIdx = (names, col) => names.indexOf(col);

  // Team leaders (top scorer per team)
  const getLeaders = (ts) => {
    if (!ts?.athletes?.length) return null;
    const ptsIdx = getStatIdx(ts.names, 'PTS');
    if (ptsIdx === -1) return null;
    return [...ts.athletes]
      .filter(a => a.stats?.length)
      .sort((a, b) => parseFloat(b.stats[ptsIdx] || 0) - parseFloat(a.stats[ptsIdx] || 0))
      .slice(0, 3);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Back */}
      <Link to="/category/scores" className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-[#E21111] transition-colors mb-8">
        ← Back to Scores
      </Link>

      {/* ── Scoreboard Header ── */}
      <div className="bg-[#121212] rounded-2xl shadow-2xl text-white p-8 mb-8">
        {/* Status badge */}
        <div className="text-center mb-6">
          {isLive ? (
            <span className="inline-flex items-center gap-2 bg-[#E21111]/20 text-[#E21111] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#E21111]/40">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse"></span>
              LIVE · {status?.shortDetail}
            </span>
          ) : isDone ? (
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">FINAL · {status?.shortDetail}</span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{status?.shortDetail}</span>
          )}
          <p className="text-[9px] text-gray-600 uppercase tracking-widest mt-1 font-bold">
            {league} · {data.gameInfo?.venue?.fullName ?? ''}
          </p>
        </div>

        {/* Teams + Score */}
        <div className="flex items-center justify-between gap-4">
          {/* Away */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <img src={away?.team?.logos?.[0]?.href ?? away?.team?.logo} alt={away?.team?.displayName} className="w-16 h-16 object-contain" onError={e => e.target.style.display='none'} />
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-tight leading-none">{away?.team?.shortDisplayName ?? away?.team?.displayName}</p>
              {awayRecord && <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{awayRecord}</p>}
            </div>
          </div>

          {/* Score */}
          <div className="text-center px-6">
            {isPre ? (
              <p className="text-4xl font-black text-gray-500 tracking-tighter">VS</p>
            ) : (
              <div className="flex items-center gap-4">
                <span className={`text-6xl font-black italic tracking-tighter leading-none ${!isPre && parseInt(awayScore) > parseInt(homeScore) ? 'text-white' : 'text-gray-500'}`}>{awayScore}</span>
                <span className="text-2xl text-gray-600 font-black">–</span>
                <span className={`text-6xl font-black italic tracking-tighter leading-none ${!isPre && parseInt(homeScore) > parseInt(awayScore) ? 'text-white' : 'text-gray-500'}`}>{homeScore}</span>
              </div>
            )}
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest mt-2">AWAY · HOME</p>
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-3 flex-1">
            <img src={home?.team?.logos?.[0]?.href ?? home?.team?.logo} alt={home?.team?.displayName} className="w-16 h-16 object-contain" onError={e => e.target.style.display='none'} />
            <div className="text-center">
              <p className="text-lg font-black uppercase tracking-tight leading-none">{home?.team?.shortDisplayName ?? home?.team?.displayName}</p>
              {homeRecord && <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">{homeRecord}</p>}
            </div>
          </div>
        </div>

        {/* Linescore table */}
        {awayLines.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-center text-xs font-bold">
              <thead>
                <tr className="text-gray-600 border-b border-white/10">
                  <th className="text-left pb-2 pr-4 font-black uppercase tracking-wider text-[9px]">Team</th>
                  {awayLines.map((_, i) => (
                    <th key={i} className="pb-2 px-3 font-black uppercase tracking-wider text-[9px]">
                      {awayLines.length <= 4 ? `Q${i+1}` : awayLines.length === 5 && i === 4 ? 'OT' : awayLines.length > 5 && i >= 4 ? `OT${i-3}` : `Q${i+1}`}
                    </th>
                  ))}
                  <th className="pb-2 px-4 font-black uppercase tracking-wider text-[9px] border-l border-white/10">T</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-white/5">
                  <td className="text-left py-2 pr-4 text-[10px] font-black uppercase tracking-wide">{away?.team?.abbreviation}</td>
                  {awayLines.map((ls, i) => <td key={i} className="py-2 px-3 text-gray-300">{ls.value}</td>)}
                  <td className="py-2 px-4 font-black text-white border-l border-white/10">{awayScore}</td>
                </tr>
                <tr>
                  <td className="text-left py-2 pr-4 text-[10px] font-black uppercase tracking-wide">{home?.team?.abbreviation}</td>
                  {homeLines.map((ls, i) => <td key={i} className="py-2 px-3 text-gray-300">{ls.value}</td>)}
                  <td className="py-2 px-4 font-black text-white border-l border-white/10">{homeScore}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Odds ── */}
      {sport === 'basketball' && (
        <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden`}>
          <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">🎲 Game Odds</span>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-auto">DraftKings · Consensus</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            {/* Spread */}
            <div className="p-5 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Spread</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <img src={away?.team?.logos?.[0]?.href ?? away?.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e=>e.target.style.display='none'} />
                  <span className="text-sm font-black text-gray-300">—</span>
                  <span className="text-[10px] font-bold text-gray-400">—</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <img src={home?.team?.logos?.[0]?.href ?? home?.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e=>e.target.style.display='none'} />
                  <span className="text-sm font-black text-gray-300">—</span>
                  <span className="text-[10px] font-bold text-gray-400">—</span>
                </div>
              </div>
            </div>
            {/* Moneyline */}
            <div className="p-5 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Moneyline</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <img src={away?.team?.logos?.[0]?.href ?? away?.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e=>e.target.style.display='none'} />
                  <span className="text-sm font-black text-gray-300">—</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <img src={home?.team?.logos?.[0]?.href ?? home?.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e=>e.target.style.display='none'} />
                  <span className="text-sm font-black text-gray-300">—</span>
                </div>
              </div>
            </div>
            {/* Total */}
            <div className="p-5 text-center">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Total</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-gray-500">O</span>
                  <span className="text-sm font-black text-gray-300">—</span>
                  <span className="text-[10px] font-bold text-gray-400">—</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-gray-500">U</span>
                  <span className="text-sm font-black text-gray-300">—</span>
                  <span className="text-[10px] font-bold text-gray-400">—</span>
                </div>
              </div>
            </div>
          </div>
          <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
            <p className="text-[9px] text-gray-400 font-bold text-center uppercase tracking-widest">Odds integration coming soon · Must be 21+ · Gambling Problem? Call 1-800-522-4700</p>
          </div>
        </div>
      )}

      {/* ── Box Score ── */}
      {teamStats.length > 0 && (
        <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 mb-8 overflow-hidden`}>
          {/* Stat-group tabs — NFL shows Passing / Rushing / Receiving etc. */}
          {statGroupNames.length > 1 && (
            <div className="flex gap-2 px-4 pt-4 pb-2 overflow-x-auto border-b border-gray-100">
              {statGroupNames.map((gName, gi) => (
                <button
                  key={gi}
                  onClick={() => { setStatGroup(gi); setActiveTeam(0); }}
                  className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors whitespace-nowrap ${statGroup === gi ? 'bg-[#E21111] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >{gName}</button>
              ))}
            </div>
          )}
          {/* Team tabs */}
          <div className="flex border-b border-gray-100">
            {teamStats.map((ts, i) => (
              <button
                key={i}
                onClick={() => setActiveTeam(i)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-[11px] font-black uppercase tracking-widest transition-colors ${
                  activeTeam === i ? 'bg-[#121212] text-white' : 'text-gray-400 hover:text-black'
                }`}
              >
                <img src={ts.team?.logos?.[0]?.href ?? ts.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e => e.target.style.display='none'} />
                {ts.team?.shortDisplayName ?? ts.team?.displayName}
              </button>
            ))}
          </div>

          {/* Stats table */}
          {teamStats[activeTeam] && (() => {
            const ts = teamStats[activeTeam];
            const cols = STAT_COLS.filter(c => ts.names.includes(c));
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-3 font-black uppercase tracking-wider text-[9px]">Player</th>
                      {cols.map(c => <th key={c} className="px-3 py-3 font-black uppercase tracking-wider text-[9px]">{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {ts.athletes.filter(a => a.stats?.length).map((a, i) => {
                      const isStarter = a.starter;
                      return (
                        <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isStarter ? '' : 'opacity-70'}`}>
                          <td className="px-4 py-3 font-bold text-[11px]">
                            <div className="flex items-center gap-2">
                              {a.athlete?.headshot?.href ? (
                                <img src={a.athlete.headshot.href} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 bg-gray-100" onError={e => e.target.style.display='none'} />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[8px] font-black text-gray-400">
                                  {a.athlete?.displayName?.charAt(0)}
                                </div>
                              )}
                              <div>
                                <p className="leading-none">{a.athlete?.displayName}</p>
                                {isStarter && <span className="text-[8px] font-black uppercase tracking-wider text-[#E21111]">Starter</span>}
                              </div>
                            </div>
                          </td>
                          {cols.map(c => {
                            const idx = getStatIdx(ts.names, c);
                            const val = idx >= 0 ? a.stats[idx] : '–';
                            const isPts = c === 'PTS';
                            return (
                              <td key={c} className={`px-3 py-3 text-center font-${isPts ? 'black' : 'medium'} ${isPts ? 'text-[#E21111]' : 'text-gray-700'}`}>
                                {val ?? '–'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Team Leaders ── */}
      {teamStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamStats.map((ts, i) => {
            const leaders = getLeaders(ts);
            if (!leaders?.length) return null;
            const ptsIdx = getStatIdx(ts.names, 'PTS');
            const rebIdx = getStatIdx(ts.names, 'REB');
            const astIdx = getStatIdx(ts.names, 'AST');
            return (
              <div key={i} className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6`}>
                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
                  <img src={ts.team?.logos?.[0]?.href ?? ts.team?.logo} alt="" className="w-7 h-7 object-contain" onError={e => e.target.style.display='none'} />
                  <h3 className="text-[11px] font-black uppercase tracking-widest">{ts.team?.displayName} Leaders</h3>
                </div>
                <div className="space-y-4">
                  {leaders.map((a, j) => (
                    <div key={j} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-black">{a.athlete?.displayName}</p>
                        <div className="flex gap-3 mt-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-400">
                          {rebIdx >= 0 && <span>{a.stats[rebIdx]} REB</span>}
                          {astIdx >= 0 && <span>{a.stats[astIdx]} AST</span>}
                        </div>
                      </div>
                      {ptsIdx >= 0 && (
                        <span className="text-3xl font-black italic text-[#E21111] tracking-tighter leading-none">
                          {a.stats[ptsIdx]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isPre && (
        <div className="mt-6 space-y-6">

          {/* ── MLB: Probable Starting Pitchers ── */}
          {sport === 'baseball' && probablePitchers.length > 0 && (
            <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-6`}>
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#E21111] mb-5">⚾ Probable Starting Pitchers</h3>
              <div className="grid grid-cols-2 gap-6">
                {probablePitchers.map((p, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                      {p.headshot?.href ? (
                        <img src={p.headshot.href} alt={p.displayName} className="w-16 h-16 rounded-full object-cover bg-gray-100" onError={e => e.target.style.display='none'} />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-xl font-black text-gray-300">{p.displayName?.charAt(0)}</div>
                      )}
                      <img src={p.team?.logos?.[0]?.href ?? p.team?.logo} alt="" className="absolute -bottom-1 -right-1 w-6 h-6 object-contain" onError={e => e.target.style.display='none'} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight leading-none">{p.displayName}</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                        {p.team?.shortDisplayName} · {p.homeAway === 'home' ? 'HOME' : 'AWAY'}
                      </p>
                      {p.statistics?.length > 0 && (
                        <div className="flex gap-4 mt-2">
                          {p.statistics.slice(0, 3).map((s, si) => (
                            <div key={si} className="text-center">
                              <p className="text-base font-black">{s.displayValue}</p>
                              <p className="text-[8px] font-bold uppercase text-gray-400">{s.abbreviation ?? s.name?.slice(0, 3)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── NBA / NFL / NHL: Projected Starters + Bench ── */}
          {rosterData.length > 0 && (
            <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden`}>
              {/* Section title */}
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                  {sport === 'basketball' ? '🏀 Projected Starters & Roster' : sport === 'football' ? '🏈 Team Rosters' : '🏒 Projected Lineup'}
                </span>
              </div>
              {/* Team selector tabs */}
              <div className="flex border-b border-gray-100">
                {rosterData.map((rd, i) => (
                  <button key={i} onClick={() => setActiveTeam(i)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTeam === i ? 'bg-[#121212] text-white' : 'text-gray-400 hover:text-black'}`}>
                    <img src={rd.team?.logos?.[0]?.href ?? rd.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e => e.target.style.display='none'} />
                    {rd.team?.shortDisplayName ?? rd.team?.displayName}
                  </button>
                ))}
              </div>

              {rosterData[activeTeam] && (() => {
                const rd = rosterData[activeTeam];
                const starters = rd.players.filter(p => p.starter);
                const bench    = rd.players.filter(p => !p.starter && !p.didNotPlay);
                const dnp      = rd.players.filter(p => p.didNotPlay);
                return (
                  <div>
                    {/* Starters */}
                    {starters.length > 0 && (
                      <>
                        <div className="px-5 pt-4 pb-1">
                          <span className="text-[9px] font-black uppercase tracking-widest text-[#E21111] border border-[#E21111]/30 bg-[#E21111]/5 px-2.5 py-0.5 rounded-full">
                            Starting {sport === 'basketball' ? '5' : sport === 'football' ? 'Lineup' : 'Lineup'}
                          </span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {starters.map((p, pi) => (
                            <div key={pi} className="flex items-center gap-3 px-5 py-3">
                              {p.athlete?.headshot?.href ? (
                                <img src={p.athlete.headshot.href} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0" onError={e => e.target.style.display='none'} />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs font-black text-gray-400">
                                  {p.athlete?.jersey ?? p.athlete?.displayName?.charAt(0) ?? '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-black truncate leading-tight">{p.athlete?.displayName}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                  {p.athlete?.position?.abbreviation}{p.athlete?.position?.abbreviation && p.athlete?.jersey ? ' · ' : ''}#{p.athlete?.jersey}
                                </p>
                              </div>
                              <span className="text-[10px] font-black text-gray-200 tabular-nums">#{p.athlete?.jersey}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Bench / Rest of roster */}
                    {bench.length > 0 && (
                      <>
                        <div className="px-5 pt-4 pb-1 border-t border-gray-100">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Bench / Roster</span>
                        </div>
                        <div className="divide-y divide-gray-50">
                          {bench.slice(0, 10).map((p, pi) => (
                            <div key={pi} className="flex items-center gap-3 px-5 py-2.5 opacity-70">
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-gray-400">
                                {p.athlete?.jersey ?? '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{p.athlete?.displayName}</p>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.athlete?.position?.abbreviation}</p>
                              </div>
                              <span className="text-[10px] font-black text-gray-300">#{p.athlete?.jersey}</span>
                            </div>
                          ))}
                          {bench.length > 10 && (
                            <p className="px-5 py-3 text-[10px] font-bold text-gray-400 text-center">+{bench.length - 10} more on the roster</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* DNP / Out */}
                    {dnp.length > 0 && (
                      <div className="border-t border-gray-100 px-5 py-4">
                        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Out / DNP</p>
                        <div className="flex flex-wrap gap-2">
                          {dnp.map((p, pi) => (
                            <span key={pi} className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full line-through">
                              {p.athlete?.displayName}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}



          {/* ── Full Team Roster — sorted by PPG (best scorers first), injured last ── */}
          {sport !== 'baseball' && teamRosters.length > 0 && (() => {
            const tr = teamRosters[activeTeam];
            if (!tr) return null;

            const raw = Array.isArray(tr.athletes)
              ? tr.athletes
              : tr.athletes.flatMap(g => g.items ?? []);

            // Look up real PPG from SportsData.io map (NBA only); fallback to salary
            const getSalary = (p) => p.contract?.salary ?? p.contracts?.[0]?.salary ?? 0;
            const getPPG = (p) => {
              const name = (p.displayName ?? p.fullName ?? '').toLowerCase();
              return ppgMap[name] ?? null;
            };

            const isInjured = (p) =>
              p.status?.type === 'injured' ||
              p.status?.abbreviation === 'OUT' ||
              p.status?.abbreviation === 'INJ';

            // Sort: active players by PPG desc (fallback salary), injured at the bottom
            const sorted = [...raw].sort((a, b) => {
              const aInj = isInjured(a) ? 1 : 0;
              const bInj = isInjured(b) ? 1 : 0;
              if (aInj !== bInj) return aInj - bInj;
              const aPPG = getPPG(a), bPPG = getPPG(b);
              if (aPPG !== null || bPPG !== null) {
                return (bPPG ?? 0) - (aPPG ?? 0);
              }
              return getSalary(b) - getSalary(a);
            });

            return (
              <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden`}>
                {/* Header */}
                <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                    {sport === 'basketball' ? '🏀 Roster' : sport === 'football' ? '🏈 Roster' : '🏒 Roster'}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-auto">
                    {league === 'nba' && Object.keys(ppgMap).length > 0 ? 'Sorted by PPG' : 'Sorted by Star Power'}
                  </span>
                </div>
                {/* Team tabs */}
                <div className="flex border-b border-gray-100">
                  {teamRosters.map((t, i) => (
                    <button key={i} onClick={() => setActiveTeam(i)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-[11px] font-black uppercase tracking-widest transition-colors ${activeTeam === i ? 'bg-[#121212] text-white' : 'text-gray-400 hover:text-black'}`}>
                      <img src={t.team?.logos?.[0]?.href ?? t.team?.logo} alt="" className="w-5 h-5 object-contain" onError={e=>e.target.style.display='none'} />
                      {t.team?.shortDisplayName ?? t.team?.displayName}
                    </button>
                  ))}
                </div>
                {/* Player list */}
                <div className="divide-y divide-gray-50 max-h-[560px] overflow-y-auto">
                  {sorted.map((p, pi) => {
                    const injured = isInjured(p);
                    return (
                      <div key={pi} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors ${injured ? 'opacity-50' : ''}`}>
                        {/* Rank number */}
                        <span className="text-[10px] font-black text-gray-300 w-4 text-center flex-shrink-0">{pi + 1}</span>
                        {/* Headshot */}
                        {p.headshot?.href ? (
                          <img src={p.headshot.href} alt="" className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0" onError={e=>e.target.style.display='none'} />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-xs font-black text-gray-400">
                            {p.jersey ?? '?'}
                          </div>
                        )}
                        {/* Name + position */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black truncate leading-tight">{p.displayName}</p>
                          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                            {p.position?.abbreviation ?? ''}
                            {p.position?.abbreviation && p.jersey ? ' · ' : ''}
                            #{p.jersey}
                          </p>
                        </div>
                        {/* PPG, Salary, or injury badge */}
                        {injured ? (
                          <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded-full flex-shrink-0">
                            {p.status?.shortDetail ?? 'Out'}
                          </span>
                        ) : getSalary(p) > 0 && getPPG(p) === null ? (
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-black tabular-nums">${(getSalary(p) / 1000000).toFixed(1)}M</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase">Salary</p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {sport === 'baseball' && probablePitchers.length === 0 && (
            <div className="py-16 text-center border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-2xl font-black uppercase italic text-gray-300 mb-2">Starting Pitcher TBD</p>
              <p className="text-sm text-gray-400">Probable pitchers will be announced closer to first pitch</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- Main App ---

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-[#121212]">
        <ScoresTicker />
        <Nav />
        
        <main className="min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/category/:slug" element={<CategoryPage />} />
            <Route path="/article/:id" element={<HomePage />} />
            <Route path="/about" element={<CategoryPage />} />
            <Route path="/game/:league/:id" element={<GameDetailPage />} />
          </Routes>
        </main>
        <MobileBottomNav />

        <footer className="bg-[#121212] text-white mt-32 py-20">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 border-b border-white/10 pb-16">
              <div className="md:col-span-2">
                <div className="text-4xl font-black uppercase tracking-tighter italic mb-6">
                  BounceBack<span className="text-[#E21111]">Talk</span>
                </div>
                <p className="text-gray-400 text-sm max-w-sm leading-relaxed font-medium">
                  The ultimate destination for basketball news and daily sports talk. Rebounding into the latest headlines every single day with precision and passion.
                </p>
                <div className="flex gap-4 mt-8">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-[#E21111] hover:border-[#E21111] transition-all cursor-pointer">
                      <Share2 size={16} />
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#E21111] mb-6">Explore</h5>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <li><Link to="/category/basketball" className="hover:text-white transition-colors">Basketball</Link></li>
                  <li><Link to="/category/nfl" className="hover:text-gray-500 hover:text-white transition-colors">NFL</Link></li>
                  <li><Link to="/category/mlb" className="hover:text-white transition-colors">MLB</Link></li>
                  <li><Link to="/category/scores" className="hover:text-white transition-colors">Live Scores</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-[11px] font-black uppercase tracking-[0.3em] text-[#E21111] mb-6">Company</h5>
                <ul className="space-y-4 text-sm font-bold uppercase tracking-widest text-gray-400">
                  <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                  <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                  <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                  <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                </ul>
              </div>
            </div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
              <p>© 2026 BOUNCEBACKTALK. ALL RIGHTS RESERVED.</p>
              <p>POWERED BY ARTHUR SPORTS MEDIA</p>
            </div>
          </div>
        </footer>


      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
        
        body {
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        .animate-scroll {
          display: flex;
          width: fit-content;
          animation: scroll 60s linear infinite;
        }

        .animate-scroll:hover {
          animation-play-state: paused;
        }

        .wireframe-mode * {
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: monospace !important;
        }
        
        .wireframe-mode img {
          filter: grayscale(100%) contrast(150%) brightness(1.2);
          opacity: 0.1;
        }

        .design-mode h1, .design-mode h2, .design-mode h3, .design-mode h4, .design-mode h5 {
          letter-spacing: -0.05em;
        }

        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        ::-webkit-scrollbar-thumb {
          background: #E21111;
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #b00d0d;
        }

        @media (max-width: 768px) {
          .animate-scroll {
            animation-duration: 30s;
          }
        }
      `}</style>
    </Router>
  );
}
