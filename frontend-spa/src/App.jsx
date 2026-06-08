import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
// bg: #0f0f0f  surface: #1a1a1a  border: #2a2a2a
// text: #f0ebe0  muted: #888  accent: #E21111

// ─── ICONS ───────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 16, className = '', fill = 'none', strokeWidth = 2 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" className={className}>
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);
const SearchIcon = ({ size, className }) => <Icon size={size} className={className} d={["M21 21l-4.35-4.35", "M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0"]} />;
const MenuIcon = ({ size, className }) => <Icon size={size} className={className} d={["M3 6h18", "M3 12h18", "M3 18h18"]} />;
const XIcon = ({ size, className }) => <Icon size={size} className={className} d={["M18 6L6 18", "M6 6l12 12"]} />;
const TrendingIcon = ({ size, className }) => <Icon size={size} className={className} d={["M23 6L13.5 15.5 8.5 10.5 1 18", "M17 6h6v6"]} />;
const StarIcon = ({ size, className, fill }) => <Icon size={size} className={className} fill={fill || 'none'} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />;
const ChevronRight = ({ size, className }) => <Icon size={size} className={className} d="M9 18l6-6-6-6" />;
const FireIcon = ({ size, className }) => <Icon size={size} className={className} d="M12 2c0 0-5 4-5 9a5 5 0 0 0 10 0c0-5-5-9-5-9z" />;
const UserIcon = ({ size, className }) => <Icon size={size} className={className} d={["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2", "M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"]} />;
const BellIcon = ({ size, className }) => <Icon size={size} className={className} d={["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"]} />;

// ─── ESPN API ─────────────────────────────────────────────────────────────────
const LEAGUES = [
  { key: 'nba', label: 'NBA', sport: 'basketball', color: '#C9082A' },
  { key: 'nfl', label: 'NFL', sport: 'football',   color: '#013369' },
  { key: 'mlb', label: 'MLB', sport: 'baseball',   color: '#002D72' },
  { key: 'nhl', label: 'NHL', sport: 'hockey',     color: '#000000' },
];
const espnUrl = (sport, league) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard`;

const fetchScores = async () => {
  const results = await Promise.allSettled(
    LEAGUES.map(l => fetch(espnUrl(l.sport, l.key)).then(r => r.json()))
  );
  return LEAGUES.flatMap((league, i) => {
    if (results[i].status !== 'fulfilled') return [];
    const events = results[i].value.events || [];
    return events.map(ev => {
      const comp = ev.competitions?.[0];
      const home = comp?.competitors?.find(c => c.homeAway === 'home');
      const away = comp?.competitors?.find(c => c.homeAway === 'away');
      const status = comp?.status;
      return {
        id: ev.id,
        league: league.key,
        leagueLabel: league.label,
        home: { name: home?.team?.abbreviation || '', logo: home?.team?.logo || '', score: home?.score || '0' },
        away: { name: away?.team?.abbreviation || '', logo: away?.team?.logo || '', score: away?.score || '0' },
        statusText: status?.type?.shortDetail || status?.displayClock || '',
        isLive: status?.type?.state === 'in',
        isFinal: status?.type?.completed === true,
      };
    });
  });
};

// ─── TICKER ───────────────────────────────────────────────────────────────────
const Ticker = ({ games }) => {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || games.length === 0) return;
    let pos = 0;
    const speed = 0.5;
    let raf;
    const tick = () => {
      pos -= speed;
      if (pos < -el.scrollWidth / 2) pos = 0;
      el.style.transform = `translateX(${pos}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [games]);

  if (games.length === 0) return null;
  const items = [...games, ...games];

  return (
    <div className="bg-[#E21111] overflow-hidden h-8 flex items-center">
      <div className="shrink-0 bg-black text-white text-[10px] font-black uppercase tracking-widest px-3 h-full flex items-center z-10">
        LIVE
      </div>
      <div className="overflow-hidden flex-1 relative">
        <div ref={ref} className="flex items-center gap-6 whitespace-nowrap will-change-transform">
          {items.map((g, i) => (
            <div key={i} className="flex items-center gap-2 text-white text-[11px] font-bold shrink-0">
              {g.isLive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              <span className="opacity-70">{g.leagueLabel}</span>
              <span>{g.away.name} {g.away.score}</span>
              <span className="opacity-40">–</span>
              <span>{g.home.name} {g.home.score}</span>
              <span className="opacity-60 text-[10px]">{g.isFinal ? 'FINAL' : g.statusText}</span>
              <span className="opacity-30 ml-2">|</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const Nav = ({ onSearch }) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const links = [
    ['NBA', '/league/nba'], ['NFL', '/league/nfl'],
    ['MLB', '/league/mlb'], ['NHL', '/league/nhl'],
    ['Scores', '/scores'], ['Best Bets', '/best-bets'],
  ];

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0a0a0a]/95 backdrop-blur-md shadow-2xl' : 'bg-[#0f0f0f]'} border-b border-[#2a2a2a]`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0 mr-4">
          <div className="w-7 h-7 bg-[#E21111] rounded flex items-center justify-center">
            <span className="text-white text-[10px] font-black">BBT</span>
          </div>
          <span className="text-[#f0ebe0] font-black text-sm uppercase tracking-widest hidden sm:block">
            BounceBack<span className="text-[#E21111]">Talk</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-1 flex-1">
          {links.map(([label, href]) => (
            <Link key={href} to={href}
              className="px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-[#888] hover:text-[#f0ebe0] hover:bg-white/5 rounded transition-all">
              {label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={onSearch}
            className="w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#f0ebe0] transition-colors">
            <SearchIcon size={16} />
          </button>
          <Link to="/login"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase tracking-widest text-[#888] hover:text-[#f0ebe0] hover:border-[#444] transition-all">
            <UserIcon size={12} /> Sign In
          </Link>
          <Link to="/register"
            className="px-3 py-1.5 bg-[#E21111] rounded text-[11px] font-black uppercase tracking-widest text-white hover:bg-red-700 transition-colors">
            Join
          </Link>
          <button onClick={() => setOpen(!open)} className="lg:hidden w-8 h-8 flex items-center justify-center text-[#888]">
            {open ? <XIcon size={18} /> : <MenuIcon size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-[#0f0f0f] border-t border-[#2a2a2a]">
          {links.map(([label, href]) => (
            <Link key={href} to={href} onClick={() => setOpen(false)}
              className="block px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-[#888] hover:text-[#f0ebe0] hover:bg-white/5 border-b border-[#1a1a1a] transition-all">
              {label}
            </Link>
          ))}
          <div className="p-4 flex gap-3">
            <Link to="/login" onClick={() => setOpen(false)}
              className="flex-1 text-center py-2.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase text-[#888]">
              Sign In
            </Link>
            <Link to="/register" onClick={() => setOpen(false)}
              className="flex-1 text-center py-2.5 bg-[#E21111] rounded text-[11px] font-black uppercase text-white">
              Join Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

// ─── SEARCH OVERLAY ───────────────────────────────────────────────────────────
const SearchOverlay = ({ onClose }) => {
  const [q, setQ] = useState('');
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  useEffect(() => {
    const fn = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  const suggestions = ['LeBron James', 'NBA Finals', 'Best Bets Today', 'Patrick Mahomes', 'Yankees vs Red Sox'];

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl">
        <div className="relative">
          <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search teams, players, games..."
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-12 pr-12 py-4 text-[#f0ebe0] text-lg placeholder:text-[#444] focus:outline-none focus:border-[#E21111] transition-colors" />
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#f0ebe0]">
            <XIcon size={18} />
          </button>
        </div>
        <div className="mt-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#555]">Trending Searches</div>
          {suggestions.map(s => (
            <button key={s} onClick={() => setQ(s)}
              className="w-full flex items-center gap-3 px-4 py-3 text-[#888] hover:text-[#f0ebe0] hover:bg-white/5 transition-all text-sm border-t border-[#2a2a2a] text-left">
              <TrendingIcon size={14} className="text-[#E21111] shrink-0" />
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── HERO ─────────────────────────────────────────────────────────────────────
const Hero = ({ games }) => {
  const featured = games.find(g => g.isLive) || games[0];
  return (
    <div className="relative overflow-hidden bg-[#0f0f0f]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#E21111]/10 via-transparent to-transparent" />
      <div className="max-w-7xl mx-auto px-4 pt-10 pb-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* Main hero article */}
          <Link to="/game/nba/featured" className="group block relative overflow-hidden rounded-2xl">
            <div className="aspect-[16/9] relative">
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1600&auto=format&fit=crop"
                alt="Featured game"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[#E21111] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live Analysis
                </span>
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">NBA Finals</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-[0.9] text-white mb-3 tracking-tight">
                Oklahoma City Thunder<br />
                <span className="text-[#E21111]">Dominate Game 3</span><br />
                In Historic Fashion
              </h1>
              <p className="text-white/60 text-sm max-w-lg line-clamp-2 leading-relaxed">
                Shai Gilgeous-Alexander drops 42 points as OKC seizes control of the series, leaving Indiana scrambling for answers.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[#E21111] text-[11px] font-black uppercase tracking-widest">
                Read Full Analysis <ChevronRight size={14} />
              </div>
            </div>
          </Link>

          {/* Right sidebar — live scores */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Live & Recent</h2>
              <Link to="/scores" className="text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:text-red-400">All Scores →</Link>
            </div>
            {games.length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-6 text-center text-[#555] text-sm">No games today</div>
            ) : (
              games.slice(0, 6).map(g => (
                <Link key={g.id} to={`/game/${g.league}/${g.id}`}
                  className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl p-3.5 transition-all group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#555]">{g.leagueLabel}</span>
                    {g.isLive
                      ? <span className="flex items-center gap-1 text-[#E21111] text-[9px] font-black uppercase"><span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse" />{g.statusText}</span>
                      : <span className="text-[#555] text-[9px] font-bold uppercase">{g.isFinal ? 'Final' : g.statusText}</span>
                    }
                  </div>
                  <div className="space-y-1.5">
                    {[g.away, g.home].map((team, ti) => (
                      <div key={ti} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {team.logo
                            ? <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                            : <div className="w-5 h-5 rounded-full bg-[#2a2a2a]" />
                          }
                          <span className="text-[#f0ebe0] text-xs font-bold">{team.name}</span>
                        </div>
                        <span className={`text-sm font-black ${g.isLive ? 'text-[#f0ebe0]' : 'text-[#888]'}`}>{team.score}</span>
                      </div>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── BEST BETS ────────────────────────────────────────────────────────────────
const BETS = [
  {
    id: 1, league: 'NBA', game: 'OKC vs IND', pick: 'Thunder -4.5',
    odds: '-110', confidence: 87, trend: '+12%',
    analysis: "OKC's home-court edge + SGA's playoff form makes this a must-fade. Indiana can't stop the pick-and-roll.",
    injuries: 'Haliburton Q (hamstring)', starters: 'SGA vs Haliburton',
  },
  {
    id: 2, league: 'MLB', game: 'NYY vs BOS', pick: 'Over 9.5',
    odds: '-105', confidence: 74, trend: '+5%',
    analysis: "Both bullpens are gassed. Yankee Stadium wind is out to right, and both starters sit under 5 innings lately.",
    injuries: 'Cole questionable', starters: 'Cole vs Sale',
  },
  {
    id: 3, league: 'NFL', game: 'KC vs LV', pick: 'Chiefs ML',
    odds: '-180', confidence: 92, trend: '+18%',
    analysis: 'Mahomes at home in June minicamp preview. Raiders have no answer for the Chiefs\' WR depth.',
    injuries: 'None reported', starters: 'Mahomes vs Minshew',
  },
];

const ConfidenceBar = ({ pct }) => (
  <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-1000"
      style={{
        width: `${pct}%`,
        background: pct >= 80 ? '#22c55e' : pct >= 65 ? '#eab308' : '#E21111'
      }} />
  </div>
);

const BestBets = () => (
  <section className="max-w-7xl mx-auto px-4 py-10">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-6 bg-[#E21111] rounded-full" />
        <h2 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0]">Today's Best Bets</h2>
        <span className="bg-[#E21111]/10 text-[#E21111] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border border-[#E21111]/20">
          AI Powered
        </span>
      </div>
      <Link to="/best-bets" className="text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:text-red-400">
        All Picks →
      </Link>
    </div>

    <div className="grid md:grid-cols-3 gap-4">
      {BETS.map(bet => (
        <Link key={bet.id} to={`/bet/${bet.id}`}
          className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#E21111]/40 rounded-2xl p-5 transition-all hover:-translate-y-0.5 group block">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-2 py-0.5 rounded-full">
              {bet.league}
            </span>
            <span className="text-[#f0ebe0] text-xs font-bold">{bet.game}</span>
          </div>

          <div className="mb-3">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[#f0ebe0] font-black text-lg">{bet.pick}</span>
              <span className="text-[#888] text-sm font-bold">{bet.odds}</span>
            </div>
            <div className="flex items-center gap-2 mb-1.5">
              <ConfidenceBar pct={bet.confidence} />
              <span className={`text-[10px] font-black shrink-0 ${bet.confidence >= 80 ? 'text-green-400' : bet.confidence >= 65 ? 'text-yellow-400' : 'text-[#E21111]'}`}>
                {bet.confidence}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-green-400 text-[10px] font-bold">
              <TrendingIcon size={11} /> {bet.trend} this week
            </div>
          </div>

          <p className="text-[#888] text-xs leading-relaxed line-clamp-2 mb-3">{bet.analysis}</p>

          <div className="border-t border-[#2a2a2a] pt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#555] uppercase font-bold tracking-wider">Injuries:</span>
              <span className="text-[#888]">{bet.injuries}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-[#555] uppercase font-bold tracking-wider">Starters:</span>
              <span className="text-[#888]">{bet.starters}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  </section>
);

// ─── TRENDING GAMES ───────────────────────────────────────────────────────────
const TRENDING = [
  { id: 't1', league: 'NBA', teams: 'OKC vs IND', label: 'NBA Finals Game 3', views: '142K', hot: true, img: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=400&auto=format&fit=crop' },
  { id: 't2', league: 'MLB', teams: 'NYY vs BOS', label: 'Rivalry Weekend', views: '89K', hot: true, img: 'https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?q=80&w=400&auto=format&fit=crop' },
  { id: 't3', league: 'NHL', teams: 'FLA vs EDM', label: 'Stanley Cup Finals', views: '67K', hot: false, img: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?q=80&w=400&auto=format&fit=crop' },
  { id: 't4', league: 'NFL', teams: 'KC vs LV', label: 'Preseason Buzz', views: '54K', hot: false, img: 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?q=80&w=400&auto=format&fit=crop' },
];

const TrendingGames = () => (
  <section className="max-w-7xl mx-auto px-4 py-10 border-t border-[#1a1a1a]">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-[#E21111] rounded-full" />
      <h2 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0]">Trending Now</h2>
      <FireIcon size={16} className="text-orange-400" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {TRENDING.map((g, i) => (
        <Link key={g.id} to={`/game/${g.league.toLowerCase()}/${g.id}`}
          className="group relative rounded-xl overflow-hidden block">
          <div className="aspect-[4/3] relative">
            <img src={g.img} alt={g.teams} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          </div>
          <div className="absolute inset-0 p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="bg-black/50 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-[#888] px-2 py-0.5 rounded-full">
                {g.league}
              </span>
              {g.hot && (
                <span className="bg-orange-500/80 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                  🔥 Hot
                </span>
              )}
            </div>
            <div>
              <div className="text-[#f0ebe0] font-black text-sm leading-tight mb-0.5">{g.teams}</div>
              <div className="text-white/50 text-[10px]">{g.views} views</div>
            </div>
          </div>
          <div className="absolute top-3 left-3 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-[9px] font-black text-white">
            {i + 1}
          </div>
        </Link>
      ))}
    </div>
  </section>
);

// ─── LEAGUE STRIP ─────────────────────────────────────────────────────────────
const LeagueStrip = () => (
  <section className="max-w-7xl mx-auto px-4 py-10 border-t border-[#1a1a1a]">
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1 h-6 bg-[#E21111] rounded-full" />
      <h2 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0]">Leagues</h2>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { key: 'nba', label: 'NBA', sub: 'Basketball', emoji: '🏀', color: '#C9082A', bg: '#1a0a0a' },
        { key: 'nfl', label: 'NFL', sub: 'Football', emoji: '🏈', color: '#013369', bg: '#0a0d1a' },
        { key: 'mlb', label: 'MLB', sub: 'Baseball', emoji: '⚾', color: '#002D72', bg: '#0a0d1a' },
        { key: 'nhl', label: 'NHL', sub: 'Hockey', emoji: '🏒', color: '#000', bg: '#141414' },
      ].map(l => (
        <Link key={l.key} to={`/league/${l.key}`}
          className="group bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl p-5 flex items-center gap-4 transition-all hover:-translate-y-0.5">
          <span className="text-3xl">{l.emoji}</span>
          <div>
            <div className="text-[#f0ebe0] font-black text-lg">{l.label}</div>
            <div className="text-[#555] text-xs font-bold uppercase tracking-wider">{l.sub}</div>
          </div>
          <ChevronRight size={16} className="ml-auto text-[#333] group-hover:text-[#E21111] transition-colors" />
        </Link>
      ))}
    </div>
  </section>
);

// ─── NEWSLETTER ───────────────────────────────────────────────────────────────
const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = e => {
    e.preventDefault();
    if (email) setDone(true);
  };

  return (
    <section className="border-t border-[#1a1a1a] py-16">
      <div className="max-w-xl mx-auto px-4 text-center">
        <div className="w-10 h-10 bg-[#E21111] rounded-xl flex items-center justify-center mx-auto mb-4">
          <BellIcon size={20} className="text-white" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-[#f0ebe0] mb-2">
          Get The Daily Drop
        </h2>
        <p className="text-[#555] text-sm mb-6 leading-relaxed">
          Best bets, injury news, and game previews — delivered every morning before tip-off.
        </p>
        {done ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-6 py-4 text-green-400 font-bold text-sm">
            ✓ You're in. Check your inbox.
          </div>
        ) : (
          <form onSubmit={submit} className="flex gap-2">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#444] focus:outline-none focus:border-[#E21111] transition-colors" />
            <button type="submit"
              className="bg-[#E21111] hover:bg-red-700 text-white font-black uppercase text-xs px-5 py-3 rounded-xl tracking-widest transition-colors shrink-0">
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
};

// ─── FOOTER ───────────────────────────────────────────────────────────────────
const Footer = () => (
  <footer className="bg-[#0a0a0a] border-t border-[#1a1a1a] py-10">
    <div className="max-w-7xl mx-auto px-4">
      <div className="grid md:grid-cols-4 gap-8 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-[#E21111] rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-black">BBT</span>
            </div>
            <span className="text-[#f0ebe0] font-black text-xs uppercase tracking-widest">BounceBackTalk</span>
          </div>
          <p className="text-[#444] text-xs leading-relaxed">
            Arthur Sports Media. The home of bold takes, live scores, and the best bets in the game.
          </p>
        </div>
        {[
          { title: 'Leagues', links: ['NBA', 'NFL', 'MLB', 'NHL'] },
          { title: 'Content', links: ['Best Bets', 'Game Previews', 'Scores', 'Trending'] },
          { title: 'Account', links: ['Sign In', 'Join Free', 'My Picks', 'Alerts'] },
        ].map(col => (
          <div key={col.title}>
            <div className="text-[#888] text-[9px] font-black uppercase tracking-widest mb-3">{col.title}</div>
            {col.links.map(l => (
              <div key={l}>
                <Link to="/" className="block text-[#444] hover:text-[#f0ebe0] text-xs py-1 transition-colors">{l}</Link>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-[#1a1a1a] pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
        <span className="text-[#333] text-xs">© 2026 Arthur Sports Media · BounceBackTalk</span>
        <span className="text-[#333] text-xs">For entertainment purposes only. Please gamble responsibly.</span>
      </div>
    </div>
  </footer>
);

// ─── MOBILE BOTTOM NAV ────────────────────────────────────────────────────────
const BottomNav = () => (
  <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0f0f0f]/95 backdrop-blur-md border-t border-[#2a2a2a]">
    <div className="grid grid-cols-5 h-14">
      {[
        { label: 'Home', icon: '🏠', href: '/' },
        { label: 'Scores', icon: '📊', href: '/scores' },
        { label: 'Bets', icon: '🎯', href: '/best-bets' },
        { label: 'Teams', icon: '🏆', href: '/league/nba' },
        { label: 'Profile', icon: '👤', href: '/login' },
      ].map(item => (
        <Link key={item.href} to={item.href}
          className="flex flex-col items-center justify-center gap-0.5 text-[#555] hover:text-[#f0ebe0] transition-colors active:text-[#E21111]">
          <span className="text-lg leading-none">{item.icon}</span>
          <span className="text-[9px] font-black uppercase tracking-wider">{item.label}</span>
        </Link>
      ))}
    </div>
  </div>
);

// ─── PLACEHOLDER PAGES ────────────────────────────────────────────────────────
const ComingSoon = ({ title }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center">
      <div className="text-[#E21111] text-6xl font-black mb-4">BBT</div>
      <h1 className="text-3xl font-black uppercase text-[#f0ebe0] mb-2">{title}</h1>
      <p className="text-[#555] mb-6">Coming up next →</p>
      <Link to="/" className="bg-[#E21111] text-white font-black uppercase text-xs px-6 py-3 rounded-xl tracking-widest hover:bg-red-700 transition-colors">
        Back to Home
      </Link>
    </div>
  </div>
);

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
const HomePage = () => {
  const [games, setGames] = useState([]);

  useEffect(() => {
    fetchScores().then(setGames).catch(() => {});
    const id = setInterval(() => fetchScores().then(setGames).catch(() => {}), 60000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <Ticker games={games} />
      <Hero games={games} />
      <BestBets />
      <TrendingGames />
      <LeagueStrip />
      <Newsletter />
    </>
  );
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <Router>
      <div className="min-h-screen bg-[#0f0f0f] text-[#f0ebe0]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <Nav onSearch={() => setSearchOpen(true)} />
        {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
        <main className="pb-20 lg:pb-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/scores" element={<ComingSoon title="Live Scores" />} />
            <Route path="/best-bets" element={<ComingSoon title="Best Bets" />} />
            <Route path="/league/:slug" element={<ComingSoon title="League Page" />} />
            <Route path="/game/:league/:id" element={<ComingSoon title="Game Preview" />} />
            <Route path="/team/:league/:id" element={<ComingSoon title="Team Page" />} />
            <Route path="/player/:id" element={<ComingSoon title="Player Profile" />} />
            <Route path="/login" element={<ComingSoon title="Sign In" />} />
            <Route path="/register" element={<ComingSoon title="Join BounceBackTalk" />} />
          </Routes>
        </main>
        <Footer />
        <BottomNav />
      </div>
    </Router>
  );
}
