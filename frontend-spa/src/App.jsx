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

// ─── SPORTSDATA.IO API ────────────────────────────────────────────────────────
const SPORTS_KEY = 'cd48920d0d784a2199d1ceefa5183f6b';
const SPORTS_BASE = 'https://api.sportsdata.io/v3';

// Some SportsData keys differ from ESPN CDN slugs
const ESPN_SLUG = {
  nba: { GSW: 'gs', NYK: 'ny', NOP: 'no', SAS: 'sa', WAS: 'wsh' },
  nfl: { LAR: 'lar', GBP: 'gb', KCC: 'kc' },
  mlb: { CWS: 'chw', SDP: 'sd', SFG: 'sf', KCR: 'kc', TBR: 'tb', WSN: 'was' },
};
const espnLogo = (league, key) => {
  const slug = (ESPN_SLUG[league]?.[key] || key).toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/${league}/500/${slug}.png`;
};

const normTeam = (league, t) => ({
  id: t.Key.toLowerCase(),
  name: `${t.City} ${t.Name}`,
  abbr: t.Key,
  logo: espnLogo(league, t.Key),
  record: '—', conf: t.Conference || t.League || '', division: t.Division || '',
  standing: '—', color: `#${t.PrimaryColor || '333'}`, headCoach: t.HeadCoach || '',
});

const ordinal = n => ['1st','2nd','3rd'][n-1] || `${n}th`;

const mergeStandings = (teams, standings) => {
  const map = {};
  standings.forEach(s => { map[s.Key] = s; });
  return teams.map(t => {
    const s = map[t.abbr];
    if (!s) return t;
    const w = s.Wins ?? 0, l = s.Losses ?? 0;
    const streak = s.StreakDescription || (s.Streak > 0 ? `W${s.Streak}` : s.Streak < 0 ? `L${Math.abs(s.Streak)}` : '');
    const divRank = s.DivisionRank || s.LeagueRank || 0;
    return { ...t,
      record: `${w}-${l}`,
      standing: divRank ? ordinal(divRank) : '—',
      streak, wins: w, losses: l,
      pct: s.Percentage ? s.Percentage.toFixed(3) : '—',
      gb: s.GamesBack != null ? (s.GamesBack === 0 ? '—' : s.GamesBack) : '—',
      ppg: s.PointsPerGameFor, oppPpg: s.PointsPerGameAgainst,
    };
  });
};

const fetchLeagueData = async (league) => {
  if (league === 'nhl') return null; // no API access for NHL
  const season = 2026;
  const [teamsRes, standRes] = await Promise.allSettled([
    fetch(`${SPORTS_BASE}/${league}/scores/json/AllTeams?key=${SPORTS_KEY}`).then(r => r.json()),
    fetch(`${SPORTS_BASE}/${league}/scores/json/Standings/${season}?key=${SPORTS_KEY}`).then(r => r.json()),
  ]);
  let teams = [];
  if (teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value)) {
    teams = teamsRes.value
      .filter(t => t.PrimaryColor && t.City && t.City.length > 3)
      .map(t => normTeam(league, t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  let rawStandings = [];
  if (standRes.status === 'fulfilled' && Array.isArray(standRes.value) && standRes.value.length > 0) {
    rawStandings = standRes.value;
    teams = mergeStandings(teams, rawStandings);
  }
  return { teams, rawStandings };
};

// Group standings by division for display
const groupStandings = (teams, rawStandings, league) => {
  if (!rawStandings?.length) return [];
  const map = {};
  rawStandings.forEach(s => { map[s.Key] = s; });
  const grouped = {};
  teams.forEach(t => {
    const s = map[t.abbr];
    if (!s) return;
    let groupKey = '';
    if (league === 'nba') groupKey = s.Conference;
    else if (league === 'nfl') groupKey = `${s.Conference} ${s.Division}`;
    else groupKey = `${s.League} ${s.Division}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];
    grouped[groupKey].push({ ...t, divRank: s.DivisionRank || s.LeagueRank || 99 });
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([conf, ts]) => ({ conf, teams: ts.sort((a, b) => a.divRank - b.divRank) }));
};

const fetchTeamRoster = async (league, teamKey) => {
  if (league === 'nhl') return [];
  try {
    const res = await fetch(`${SPORTS_BASE}/${league}/scores/json/Players/${teamKey.toUpperCase()}?key=${SPORTS_KEY}`);
    const data = await res.json();
    return Array.isArray(data) ? data.filter(p => p.Status === 'Active') : [];
  } catch { return []; }
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

// ─── SCORES PAGE ─────────────────────────────────────────────────────────────
const ScoresPage = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeLeague, setActiveLeague] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = () => {
    fetchScores().then(g => {
      setGames(g);
      setLastUpdated(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const tabs = [{ key: 'all', label: 'All' }, ...LEAGUES.map(l => ({ key: l.key, label: l.label }))];
  const filtered = activeLeague === 'all' ? games : games.filter(g => g.league === activeLeague);
  const live = filtered.filter(g => g.isLive);
  const final = filtered.filter(g => g.isFinal);
  const upcoming = filtered.filter(g => !g.isLive && !g.isFinal);

  const GameCard = ({ g }) => (
    <Link to={`/game/${g.league}/${g.id}`}
      className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl p-4 transition-all group block">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-2 py-0.5 rounded-full">{g.leagueLabel}</span>
        {g.isLive
          ? <span className="flex items-center gap-1.5 text-[#E21111] text-[10px] font-black uppercase">
              <span className="w-2 h-2 rounded-full bg-[#E21111] animate-pulse" />{g.statusText}
            </span>
          : <span className="text-[#555] text-[10px] font-bold uppercase">{g.isFinal ? 'Final' : g.statusText}</span>
        }
      </div>
      <div className="space-y-3">
        {[g.away, g.home].map((team, ti) => (
          <div key={ti} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {team.logo
                ? <img src={team.logo} alt={team.name} className="w-8 h-8 object-contain" />
                : <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[10px] font-black text-[#555]">{team.name?.[0]}</div>
              }
              <span className="text-[#f0ebe0] font-bold text-sm">{team.name}</span>
            </div>
            <span className={`text-xl font-black tabular-nums ${g.isLive ? 'text-[#f0ebe0]' : 'text-[#666]'}`}>{team.score}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-[#2a2a2a] flex items-center justify-between">
        <span className="text-[#555] text-[10px]">View Game Preview</span>
        <ChevronRight size={12} className="text-[#333] group-hover:text-[#E21111] transition-colors" />
      </div>
    </Link>
  );

  const Section = ({ title, dot, games: list }) => list.length === 0 ? null : (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">{title} <span className="text-[#555]">({list.length})</span></h3>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {list.map(g => <GameCard key={g.id} g={g} />)}
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight text-[#f0ebe0]">Scores</h1>
          {lastUpdated && (
            <p className="text-[#555] text-xs mt-1">
              Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Auto-refreshes every 30s
            </p>
          )}
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#888] hover:text-[#f0ebe0] text-xs font-bold uppercase tracking-wider transition-all hover:border-[#3a3a3a]">
          ↻ Refresh
        </button>
      </div>

      {/* League tabs */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveLeague(t.key)}
            className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${
              activeLeague === t.key
                ? 'bg-[#E21111] text-white'
                : 'bg-[#1a1a1a] text-[#888] hover:text-[#f0ebe0] border border-[#2a2a2a]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-[#1a1a1a] rounded-2xl p-4 animate-pulse">
              <div className="h-3 bg-[#2a2a2a] rounded w-16 mb-4" />
              <div className="space-y-3">
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#2a2a2a]" /><div className="h-3 bg-[#2a2a2a] rounded w-20" /></div>
                <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-[#2a2a2a]" /><div className="h-3 bg-[#2a2a2a] rounded w-20" /></div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🏟️</div>
          <h2 className="text-xl font-black uppercase text-[#f0ebe0] mb-2">No Games Today</h2>
          <p className="text-[#555] text-sm">Check back later for live scores.</p>
        </div>
      ) : (
        <>
          <Section title="Live Now" dot="bg-[#E21111] animate-pulse" games={live} />
          <Section title="Upcoming" dot="bg-[#555]" games={upcoming} />
          <Section title="Final" dot="bg-green-500" games={final} />
        </>
      )}
    </div>
  );
};

// ─── BEST BETS PAGE ───────────────────────────────────────────────────────────
const ALL_BETS = [
  {
    id: 1, league: 'NBA', game: 'OKC vs IND', pick: 'Thunder -4.5', odds: '-110',
    confidence: 87, trend: '+12%', value: 'HIGH',
    analysis: "OKC's home-court edge combined with SGA's playoff form makes this a must-play. Indiana's defense has no answer for the Thunder pick-and-roll — they've allowed 118+ in 4 of their last 5 road games.",
    injuries: 'Haliburton Q (hamstring)', starters: 'SGA vs Haliburton',
    record: '18-7 last 25', time: '8:30 PM ET',
  },
  {
    id: 2, league: 'MLB', game: 'NYY vs BOS', pick: 'Over 9.5', odds: '-105',
    confidence: 74, trend: '+5%', value: 'MED',
    analysis: "Both bullpens are gassed after back-to-back extra-inning games. Yankee Stadium wind is blowing out to right field today, and both starters are sitting under 5 innings average over their last 3 starts.",
    injuries: 'Cole Q (elbow)', starters: 'Cole vs Sale',
    record: '14-9 last 23', time: '7:05 PM ET',
  },
  {
    id: 3, league: 'NFL', game: 'KC vs LV', pick: 'Chiefs ML', odds: '-180',
    confidence: 92, trend: '+18%', value: 'HIGH',
    analysis: "Mahomes at home is a different animal. Raiders have no answer for the Chiefs WR depth post-free agency. KC's defense has held opponents under 17 in 3 straight. Fade the Raiders until proven otherwise.",
    injuries: 'None reported', starters: 'Mahomes vs Minshew',
    record: '22-5 last 27', time: '4:25 PM ET',
  },
  {
    id: 4, league: 'NHL', game: 'FLA vs EDM', pick: 'Florida ML', odds: '+120',
    confidence: 68, trend: '+8%', value: 'VALUE',
    analysis: "Florida has home-ice advantage and Bobrovsky has been lights-out in elimination spots (.934 SV%). Edmonton's power play has been neutralized by the Panthers' penalty kill unit — 1-for-12 this series.",
    injuries: 'McDavid limited (upper body)', starters: 'Bobrovsky vs Skinner',
    record: '11-6 last 17', time: '8:00 PM ET',
  },
  {
    id: 5, league: 'NBA', game: 'OKC vs IND', pick: 'SGA Over 32.5 pts', odds: '-115',
    confidence: 81, trend: '+9%', value: 'HIGH',
    analysis: "SGA has gone over this line in 6 of his last 7 playoff games. Indiana's perimeter defense ranks 28th in the league, and SGA averages 36.2 when Haliburton is less than 100%. The juice is worth the squeeze.",
    injuries: 'Haliburton Q (hamstring)', starters: 'SGA focused matchup',
    record: '16-5 last 21', time: '8:30 PM ET',
  },
  {
    id: 6, league: 'MLB', game: 'LAD vs SF', pick: 'Dodgers -1.5', odds: '+105',
    confidence: 71, trend: '+3%', value: 'VALUE',
    analysis: "Ohtani is at full health and has a 1.84 ERA over his last 4 starts at home. Giants' offense ranks 26th vs. left-handed pitching. The run line plus positive juice is a gift.",
    injuries: 'None key', starters: 'Ohtani vs Webb',
    record: '13-7 last 20', time: '10:10 PM ET',
  },
];

const BestBetsPage = () => {
  const [activeLeague, setActiveLeague] = useState('all');
  const [sortBy, setSortBy] = useState('confidence');
  const [expandedId, setExpandedId] = useState(null);

  const tabs = [{ key: 'all', label: 'All' }, ...LEAGUES.map(l => ({ key: l.key, label: l.label }))];
  const filtered = (activeLeague === 'all' ? ALL_BETS : ALL_BETS.filter(b => b.league.toLowerCase() === activeLeague))
    .sort((a, b) => sortBy === 'confidence' ? b.confidence - a.confidence : 0);

  const valueColor = v => v === 'HIGH' ? 'text-green-400 bg-green-400/10 border-green-400/20'
    : v === 'VALUE' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    : 'text-blue-400 bg-blue-400/10 border-blue-400/20';

  const confColor = c => c >= 80 ? 'text-green-400' : c >= 65 ? 'text-yellow-400' : 'text-[#E21111]';
  const confBg = c => c >= 80 ? 'bg-green-400' : c >= 65 ? 'bg-yellow-400' : 'bg-[#E21111]';

  const overall = Math.round(filtered.reduce((s, b) => s + b.confidence, 0) / (filtered.length || 1));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 bg-[#E21111] rounded-full" />
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#f0ebe0]">Today's Best Bets</h1>
          </div>
          <p className="text-[#555] text-sm pl-4">AI-powered picks · Updated {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        {/* Summary stats */}
        <div className="flex items-center gap-3">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-[#f0ebe0]">{filtered.length}</div>
            <div className="text-[#555] text-[9px] font-black uppercase tracking-widest">Picks</div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-center">
            <div className={`text-2xl font-black ${confColor(overall)}`}>{overall}%</div>
            <div className="text-[#555] text-[9px] font-black uppercase tracking-widest">Avg Conf.</div>
          </div>
          <div className="bg-green-400/10 border border-green-400/20 rounded-xl px-4 py-3 text-center">
            <div className="text-2xl font-black text-green-400">68%</div>
            <div className="text-[#555] text-[9px] font-black uppercase tracking-widest">Win Rate</div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
        <span className="text-yellow-400 text-lg">⚠️</span>
        <p className="text-[#555] text-xs leading-relaxed">For entertainment purposes only. Please gamble responsibly. Must be 21+ in applicable states.</p>
      </div>

      {/* League filter + sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveLeague(t.key)}
              className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${
                activeLeague === t.key ? 'bg-[#E21111] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-[#f0ebe0] border border-[#2a2a2a]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#888] text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-[#E21111] shrink-0">
          <option value="confidence">Sort: Confidence</option>
          <option value="default">Sort: Default</option>
        </select>
      </div>

      {/* Bet cards */}
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(bet => (
          <div key={bet.id}
            className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#E21111]/30 rounded-2xl overflow-hidden transition-all">

            {/* Card header */}
            <div className="bg-gradient-to-r from-[#1f1f1f] to-[#1a1a1a] px-5 pt-5 pb-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-2 py-0.5 rounded-full">{bet.league}</span>
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${valueColor(bet.value)}`}>{bet.value} VALUE</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[#888] text-xs mb-1">{bet.game} · {bet.time}</div>
                  <div className="text-[#f0ebe0] font-black text-xl leading-tight">{bet.pick}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[#555] text-[9px] uppercase font-bold mb-0.5">Odds</div>
                  <div className="text-[#f0ebe0] font-black text-lg">{bet.odds}</div>
                </div>
              </div>
            </div>

            {/* Confidence */}
            <div className="px-5 py-4 border-b border-[#2a2a2a]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#555]">Confidence</span>
                <span className={`font-black text-sm ${confColor(bet.confidence)}`}>{bet.confidence}%</span>
              </div>
              <div className="w-full bg-[#2a2a2a] rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${confBg(bet.confidence)}`}
                  style={{ width: `${bet.confidence}%` }} />
              </div>
              <div className="flex items-center gap-1 mt-2 text-green-400 text-[10px] font-bold">
                <TrendingIcon size={11} /> {bet.trend} this week · Record: {bet.record}
              </div>
            </div>

            {/* Analysis */}
            <div className="px-5 py-4">
              <p className={`text-[#888] text-xs leading-relaxed ${expandedId === bet.id ? '' : 'line-clamp-3'}`}>
                {bet.analysis}
              </p>
              {bet.analysis.length > 120 && (
                <button onClick={() => setExpandedId(expandedId === bet.id ? null : bet.id)}
                  className="text-[#E21111] text-[10px] font-black uppercase tracking-wider mt-1 hover:text-red-400">
                  {expandedId === bet.id ? 'Show less ↑' : 'Read more ↓'}
                </button>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#555] uppercase font-black tracking-wider shrink-0 w-16">Injuries</span>
                  <span className="text-[#888]">{bet.injuries}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#555] uppercase font-black tracking-wider shrink-0 w-16">Starters</span>
                  <span className="text-[#888]">{bet.starters}</span>
                </div>
              </div>

              <Link to={`/game/${bet.league.toLowerCase()}/${bet.id}`}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[#E21111]/10 hover:bg-[#E21111] border border-[#E21111]/30 hover:border-[#E21111] rounded-xl py-2.5 text-[#E21111] hover:text-white text-[11px] font-black uppercase tracking-widest transition-all">
                Full Game Preview <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Newsletter CTA */}
      <div className="mt-12 bg-gradient-to-r from-[#E21111]/10 to-transparent border border-[#E21111]/20 rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6">
        <div className="flex-1">
          <h3 className="text-lg font-black uppercase text-[#f0ebe0] mb-1">Get Picks Before They Drop</h3>
          <p className="text-[#555] text-sm">Tomorrow's best bets in your inbox every morning at 9AM. Free forever.</p>
        </div>
        <Link to="/" className="shrink-0 bg-[#E21111] hover:bg-red-700 text-white font-black uppercase text-xs px-6 py-3 rounded-xl tracking-widest transition-colors">
          Subscribe Free →
        </Link>
      </div>
    </div>
  );
};

// ─── GAME PREVIEW PAGE ───────────────────────────────────────────────────────
const GamePreviewPage = () => {
  const { league, id } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('preview');

  useEffect(() => {
    const leagueObj = LEAGUES.find(l => l.key === league);
    if (!leagueObj) { setLoading(false); return; }
    fetch(espnUrl(leagueObj.sport, league))
      .then(r => r.json())
      .then(data => {
        const ev = data.events?.find(e => e.id === id) || data.events?.[0];
        if (!ev) { setLoading(false); return; }
        const comp = ev.competitions?.[0];
        const home = comp?.competitors?.find(c => c.homeAway === 'home');
        const away = comp?.competitors?.find(c => c.homeAway === 'away');
        setGame({
          id: ev.id,
          name: ev.name,
          league: leagueObj.label,
          venue: comp?.venue?.fullName || 'TBD',
          city: comp?.venue?.address?.city || '',
          date: ev.date,
          status: comp?.status,
          home: {
            name: home?.team?.displayName || home?.team?.abbreviation || '',
            abbr: home?.team?.abbreviation || '',
            logo: home?.team?.logo || '',
            score: home?.score || '0',
            record: home?.records?.[0]?.summary || '',
            color: home?.team?.color ? `#${home.team.color}` : '#333',
          },
          away: {
            name: away?.team?.displayName || away?.team?.abbreviation || '',
            abbr: away?.team?.abbreviation || '',
            logo: away?.team?.logo || '',
            score: away?.score || '0',
            record: away?.records?.[0]?.summary || '',
            color: away?.team?.color ? `#${away.team.color}` : '#333',
          },
          isLive: comp?.status?.type?.state === 'in',
          isFinal: comp?.status?.type?.completed === true,
          statusText: comp?.status?.type?.shortDetail || '',
        });
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [league, id]);

  // Static enrichment data
  const preview = {
    prediction: { winner: game?.home?.abbr || 'HOME', confidence: 72, spread: '-3.5' },
    aiAnalysis: `This matchup hinges on which team controls the pace. The home side has been dominant in their last 5 home games, averaging 118 points while holding opponents to 104. Watch the second quarter — that's where this game will be decided. Key factor: if the away team's star player is less than 100%, the line moves significantly.`,
    keyFactors: [
      { label: 'Home Court Advantage', impact: 'HIGH', desc: '8-2 at home this postseason' },
      { label: 'Rest Differential', impact: 'MED', desc: 'Home had 2 extra days rest' },
      { label: 'Injury Report', impact: 'HIGH', desc: 'Star player questionable' },
      { label: 'Head to Head', impact: 'MED', desc: 'Home leads series 2-1' },
    ],
    injuries: [
      { team: 'HOME', player: 'Star PG', status: 'Questionable', detail: 'Hamstring tightness' },
      { team: 'AWAY', player: 'Starting SF', status: 'Probable', detail: 'Ankle soreness' },
    ],
    starters: {
      home: ['PG: Player A', 'SG: Player B', 'SF: Player C', 'PF: Player D', 'C: Player E'],
      away: ['PG: Player F', 'SG: Player G', 'SF: Player H', 'PF: Player I', 'C: Player J'],
    },
    recentForm: {
      home: ['W', 'W', 'L', 'W', 'W'],
      away: ['W', 'L', 'W', 'L', 'W'],
    },
    h2h: [
      { date: 'May 15', result: 'Home 112 – Away 108' },
      { date: 'May 12', result: 'Away 119 – Home 115' },
      { date: 'May 10', result: 'Home 124 – Away 110' },
    ],
    odds: { spread: '-3.5 (-110)', total: '224.5 (-110/-110)', moneyline: '-165 / +140' },
  };

  const tabs = ['preview', 'odds', 'starters', 'h2h'];

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="bg-[#1a1a1a] rounded-2xl h-48 animate-pulse mb-6" />
      <div className="grid md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="bg-[#1a1a1a] rounded-2xl h-32 animate-pulse" />)}
      </div>
    </div>
  );

  if (!game) return (
    <div className="min-h-screen flex items-center justify-center text-center">
      <div>
        <div className="text-5xl mb-4">🏟️</div>
        <h2 className="text-2xl font-black uppercase text-[#f0ebe0] mb-2">Game Not Found</h2>
        <Link to="/scores" className="text-[#E21111] font-bold text-sm hover:underline">← Back to Scores</Link>
      </div>
    </div>
  );

  const impactColor = i => i === 'HIGH' ? 'text-[#E21111] bg-[#E21111]/10 border-[#E21111]/20'
    : i === 'MED' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    : 'text-green-400 bg-green-400/10 border-green-400/20';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#555] text-xs mb-6">
        <Link to="/" className="hover:text-[#f0ebe0]">Home</Link>
        <span>/</span>
        <Link to="/scores" className="hover:text-[#f0ebe0]">Scores</Link>
        <span>/</span>
        <span className="text-[#888]">{game.away.abbr} vs {game.home.abbr}</span>
      </div>

      {/* Scoreboard hero */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-[#1a1a1a] to-[#111]">
        <div className="absolute inset-0 bg-gradient-to-r from-[#E21111]/5 via-transparent to-[#E21111]/5" />
        <div className="relative px-6 py-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-3 py-1 rounded-full">{game.league}</span>
            {game.isLive
              ? <span className="flex items-center gap-1.5 text-[#E21111] text-[10px] font-black uppercase bg-[#E21111]/10 px-3 py-1 rounded-full border border-[#E21111]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse" /> LIVE · {game.statusText}
                </span>
              : <span className="text-[#555] text-[10px] font-bold uppercase bg-[#2a2a2a] px-3 py-1 rounded-full">
                  {game.isFinal ? 'Final' : game.statusText}
                </span>
            }
          </div>

          {/* Teams + Score */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-2xl mx-auto">
            {/* Away */}
            <div className="flex flex-col items-center gap-3">
              {game.away.logo
                ? <img src={game.away.logo} alt={game.away.name} className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg" />
                : <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xl font-black">{game.away.abbr?.[0]}</div>
              }
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-sm md:text-base">{game.away.abbr}</div>
                <div className="text-[#555] text-[10px]">{game.away.record}</div>
              </div>
            </div>

            {/* Score */}
            <div className="text-center px-4">
              {(game.isLive || game.isFinal) ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-6xl font-black tabular-nums text-[#f0ebe0]">{game.away.score}</span>
                  <span className="text-[#333] text-2xl font-black">–</span>
                  <span className="text-4xl md:text-6xl font-black tabular-nums text-[#f0ebe0]">{game.home.score}</span>
                </div>
              ) : (
                <div className="text-[#888] font-black text-lg">VS</div>
              )}
              <div className="text-[#555] text-[10px] mt-2">{game.venue}{game.city ? `, ${game.city}` : ''}</div>
            </div>

            {/* Home */}
            <div className="flex flex-col items-center gap-3">
              {game.home.logo
                ? <img src={game.home.logo} alt={game.home.name} className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg" />
                : <div className="w-16 h-16 rounded-full bg-[#2a2a2a] flex items-center justify-center text-xl font-black">{game.home.abbr?.[0]}</div>
              }
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-sm md:text-base">{game.home.abbr}</div>
                <div className="text-[#555] text-[10px]">{game.home.record}</div>
              </div>
            </div>
          </div>

          {/* Quick odds */}
          <div className="mt-6 flex items-center justify-center gap-6 text-center">
            {[['Spread', preview.odds.spread], ['Total', preview.odds.total], ['Moneyline', preview.odds.moneyline]].map(([l, v]) => (
              <div key={l}>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-0.5">{l}</div>
                <div className="text-[#f0ebe0] font-bold text-xs">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a] pb-0">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
              activeTab === t ? 'text-[#f0ebe0] border-[#E21111]' : 'text-[#555] border-transparent hover:text-[#888]'
            }`}>
            {t === 'h2h' ? 'Head to Head' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* AI Analysis */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-5 bg-[#E21111] rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">AI Game Analysis</h3>
              <span className="text-[9px] bg-[#E21111]/10 text-[#E21111] border border-[#E21111]/20 px-2 py-0.5 rounded-full font-black uppercase">AI</span>
            </div>
            <p className="text-[#888] text-sm leading-relaxed">{preview.aiAnalysis}</p>
            <div className="mt-4 flex items-center gap-3 p-3 bg-[#2a2a2a]/50 rounded-xl">
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-lg">{preview.prediction.winner}</div>
                <div className="text-[#555] text-[9px] uppercase font-bold">Predicted Winner</div>
              </div>
              <div className="w-px h-8 bg-[#3a3a3a]" />
              <div className="text-center">
                <div className="text-green-400 font-black text-lg">{preview.prediction.confidence}%</div>
                <div className="text-[#555] text-[9px] uppercase font-bold">Confidence</div>
              </div>
              <div className="w-px h-8 bg-[#3a3a3a]" />
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-lg">{preview.prediction.spread}</div>
                <div className="text-[#555] text-[9px] uppercase font-bold">Predicted Spread</div>
              </div>
            </div>
          </div>

          {/* Key Factors */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#E21111] rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Key Factors</h3>
            </div>
            <div className="space-y-3">
              {preview.keyFactors.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${impactColor(f.impact)}`}>{f.impact}</span>
                  <div className="flex-1">
                    <div className="text-[#f0ebe0] text-xs font-bold">{f.label}</div>
                    <div className="text-[#555] text-[10px]">{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Form + Injuries side by side */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Recent Form</h3>
              </div>
              {[['home', game.home], ['away', game.away]].map(([side, team]) => (
                <div key={side} className="flex items-center justify-between mb-3 last:mb-0">
                  <span className="text-[#888] text-xs font-bold w-12">{team.abbr}</span>
                  <div className="flex items-center gap-1.5">
                    {preview.recentForm[side].map((r, i) => (
                      <span key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black ${r === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-[#E21111]/20 text-[#E21111]'}`}>{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Injury Report</h3>
              </div>
              {preview.injuries.map((inj, i) => (
                <div key={i} className="flex items-center gap-3 mb-3 last:mb-0">
                  <span className="text-[9px] font-black uppercase bg-[#2a2a2a] px-2 py-0.5 rounded-full text-[#555] shrink-0">{inj.team}</span>
                  <div className="flex-1">
                    <div className="text-[#f0ebe0] text-xs font-bold">{inj.player}</div>
                    <div className="text-[#555] text-[10px]">{inj.detail}</div>
                  </div>
                  <span className={`text-[9px] font-black uppercase shrink-0 ${inj.status === 'Questionable' ? 'text-yellow-400' : 'text-green-400'}`}>{inj.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Best Bet CTA */}
          <Link to="/best-bets" className="flex items-center justify-between bg-gradient-to-r from-[#E21111]/10 to-transparent border border-[#E21111]/20 rounded-2xl p-5 hover:border-[#E21111]/40 transition-all group">
            <div>
              <div className="text-[#f0ebe0] font-black text-sm mb-0.5">View Best Bet for This Game</div>
              <div className="text-[#555] text-xs">AI confidence pick with full analysis</div>
            </div>
            <ChevronRight size={20} className="text-[#E21111] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {activeTab === 'odds' && (
        <div className="space-y-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#E21111] rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Current Lines</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[['Spread', preview.odds.spread], ['Total', preview.odds.total], ['Moneyline', preview.odds.moneyline]].map(([label, val]) => (
                <div key={label} className="bg-[#2a2a2a]/50 rounded-xl p-4 text-center">
                  <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-2">{label}</div>
                  <div className="text-[#f0ebe0] font-black text-base">{val}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#1a1a1a] border border-[#E21111]/20 rounded-2xl p-5 flex items-center gap-4">
            <div className="text-3xl">🎯</div>
            <div>
              <div className="text-[#f0ebe0] font-black text-sm mb-1">Our Best Pick for This Game</div>
              <div className="text-[#888] text-xs">72% confidence · {game.home.abbr} -3.5 (-110)</div>
            </div>
            <Link to="/best-bets" className="ml-auto shrink-0 bg-[#E21111] text-white font-black uppercase text-[10px] px-4 py-2 rounded-xl tracking-widest hover:bg-red-700 transition-colors">
              See Pick
            </Link>
          </div>
        </div>
      )}

      {activeTab === 'starters' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[['away', game.away], ['home', game.home]].map(([side, team]) => (
            <div key={side} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                {team.logo && <img src={team.logo} alt={team.abbr} className="w-8 h-8 object-contain" />}
                <div>
                  <div className="text-[#f0ebe0] font-black text-sm">{team.name}</div>
                  <div className="text-[#555] text-[10px]">{team.record}</div>
                </div>
              </div>
              <div className="space-y-2">
                {preview.starters[side].map((p, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-[#2a2a2a] last:border-0">
                    <div className="w-5 h-5 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[9px] font-black text-[#555]">{i + 1}</div>
                    <span className="text-[#888] text-xs">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'h2h' && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-[#E21111] rounded-full" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Head to Head — Recent Meetings</h3>
          </div>
          <div className="space-y-3">
            {preview.h2h.map((g, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-[#2a2a2a] last:border-0">
                <span className="text-[#555] text-xs w-16">{g.date}</span>
                <span className="text-[#f0ebe0] text-sm font-bold">{g.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── TEAM PAGE ───────────────────────────────────────────────────────────────
// ─── NHL DATA (hardcoded — API key doesn't cover NHL) ────────────────────────
const NHL_TEAMS = [
  { id: 'bos', name: 'Boston Bruins', abbr: 'BOS', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png', record: '47-20-15', conf: 'Eastern', division: 'Atlantic', standing: '2nd', color: '#FFB81C', wins: 47, losses: 20, pct: '.698', gb: '5', streak: 'W2' },
  { id: 'buf', name: 'Buffalo Sabres', abbr: 'BUF', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/buf.png', record: '38-35-9', conf: 'Eastern', division: 'Atlantic', standing: '5th', color: '#002654', wins: 38, losses: 35, pct: '.524', gb: '14', streak: 'L2' },
  { id: 'det', name: 'Detroit Red Wings', abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/det.png', record: '35-38-9', conf: 'Eastern', division: 'Atlantic', standing: '7th', color: '#CE1126', wins: 35, losses: 38, pct: '.482', gb: '17', streak: 'L1' },
  { id: 'fla', name: 'Florida Panthers', abbr: 'FLA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png', record: '52-21-9', conf: 'Eastern', division: 'Atlantic', standing: '1st', color: '#C8102E', wins: 52, losses: 21, pct: '.704', gb: '—', streak: 'W3' },
  { id: 'mtr', name: 'Montréal Canadiens', abbr: 'MTL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/mtr.png', record: '30-43-9', conf: 'Eastern', division: 'Atlantic', standing: '8th', color: '#AF1E2D', wins: 30, losses: 43, pct: '.421', gb: '22', streak: 'W1' },
  { id: 'ott', name: 'Ottawa Senators', abbr: 'OTT', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ott.png', record: '37-35-10', conf: 'Eastern', division: 'Atlantic', standing: '6th', color: '#C52032', wins: 37, losses: 35, pct: '.512', gb: '15', streak: 'W1' },
  { id: 'tb', name: 'Tampa Bay Lightning', abbr: 'TB', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tb.png', record: '46-28-8', conf: 'Eastern', division: 'Atlantic', standing: '3rd', color: '#002868', wins: 46, losses: 28, pct: '.610', gb: '6', streak: 'W1' },
  { id: 'tor', name: 'Toronto Maple Leafs', abbr: 'TOR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png', record: '44-30-8', conf: 'Eastern', division: 'Atlantic', standing: '4th', color: '#003E7E', wins: 44, losses: 30, pct: '.585', gb: '8', streak: 'L2' },
  { id: 'car', name: 'Carolina Hurricanes', abbr: 'CAR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/car.png', record: '50-24-8', conf: 'Eastern', division: 'Metropolitan', standing: '1st', color: '#CE1126', wins: 50, losses: 24, pct: '.659', gb: '—', streak: 'W2' },
  { id: 'cbj', name: 'Columbus Blue Jackets', abbr: 'CBJ', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/cbj.png', record: '27-45-10', conf: 'Eastern', division: 'Metropolitan', standing: '8th', color: '#002654', wins: 27, losses: 45, pct: '.390', gb: '23', streak: 'L4' },
  { id: 'nj', name: 'New Jersey Devils', abbr: 'NJD', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nj.png', record: '44-29-9', conf: 'Eastern', division: 'Metropolitan', standing: '2nd', color: '#CE1126', wins: 44, losses: 29, pct: '.585', gb: '6', streak: 'W3' },
  { id: 'nyi', name: 'New York Islanders', abbr: 'NYI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nyi.png', record: '36-35-11', conf: 'Eastern', division: 'Metropolitan', standing: '6th', color: '#00539B', wins: 36, losses: 35, pct: '.506', gb: '14', streak: 'W1' },
  { id: 'nyr', name: 'New York Rangers', abbr: 'NYR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png', record: '55-21-6', conf: 'Eastern', division: 'Metropolitan', standing: '1st', color: '#0038A8', wins: 55, losses: 21, pct: '.720', gb: '—', streak: 'W4' },
  { id: 'phi', name: 'Philadelphia Flyers', abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/phi.png', record: '33-38-11', conf: 'Eastern', division: 'Metropolitan', standing: '7th', color: '#F74902', wins: 33, losses: 38, pct: '.476', gb: '22', streak: 'L1' },
  { id: 'pit', name: 'Pittsburgh Penguins', abbr: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/pit.png', record: '37-33-12', conf: 'Eastern', division: 'Metropolitan', standing: '5th', color: '#FCB514', wins: 37, losses: 33, pct: '.524', gb: '18', streak: 'W2' },
  { id: 'wsh', name: 'Washington Capitals', abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/wsh.png', record: '45-27-10', conf: 'Eastern', division: 'Metropolitan', standing: '3rd', color: '#C8102E', wins: 45, losses: 27, pct: '.610', gb: '10', streak: 'W1' },
  { id: 'ari', name: 'Utah Hockey Club', abbr: 'UTA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ari.png', record: '36-38-8', conf: 'Western', division: 'Central', standing: '5th', color: '#69B3E7', wins: 36, losses: 38, pct: '.488', gb: '16', streak: 'L1' },
  { id: 'chi', name: 'Chicago Blackhawks', abbr: 'CHI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/chi.png', record: '23-50-9', conf: 'Western', division: 'Central', standing: '8th', color: '#CF0A2C', wins: 23, losses: 50, pct: '.335', gb: '29', streak: 'L3' },
  { id: 'col', name: 'Colorado Avalanche', abbr: 'COL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/col.png', record: '50-23-9', conf: 'Western', division: 'Central', standing: '2nd', color: '#6F263D', wins: 50, losses: 23, pct: '.671', gb: '2', streak: 'W2' },
  { id: 'dal', name: 'Dallas Stars', abbr: 'DAL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/dal.png', record: '52-22-8', conf: 'Western', division: 'Central', standing: '1st', color: '#006847', wins: 52, losses: 22, pct: '.695', gb: '—', streak: 'W5' },
  { id: 'min', name: 'Minnesota Wild', abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/min.png', record: '39-33-10', conf: 'Western', division: 'Central', standing: '4th', color: '#154734', wins: 39, losses: 33, pct: '.537', gb: '13', streak: 'W1' },
  { id: 'nsh', name: 'Nashville Predators', abbr: 'NSH', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nsh.png', record: '32-40-10', conf: 'Western', division: 'Central', standing: '6th', color: '#FFB81C', wins: 32, losses: 40, pct: '.457', gb: '20', streak: 'L2' },
  { id: 'stl', name: 'St. Louis Blues', abbr: 'STL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/stl.png', record: '42-31-9', conf: 'Western', division: 'Central', standing: '3rd', color: '#002F87', wins: 42, losses: 31, pct: '.567', gb: '10', streak: 'W1' },
  { id: 'wpg', name: 'Winnipeg Jets', abbr: 'WPG', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/wpg.png', record: '52-24-6', conf: 'Western', division: 'Central', standing: '1st', color: '#041E42', wins: 52, losses: 24, pct: '.683', gb: '—', streak: 'W3' },
  { id: 'ana', name: 'Anaheim Ducks', abbr: 'ANA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ana.png', record: '27-47-8', conf: 'Western', division: 'Pacific', standing: '7th', color: '#FC4C02', wins: 27, losses: 47, pct: '.378', gb: '25', streak: 'L2' },
  { id: 'cgy', name: 'Calgary Flames', abbr: 'CGY', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/cgy.png', record: '38-35-9', conf: 'Western', division: 'Pacific', standing: '5th', color: '#C8102E', wins: 38, losses: 35, pct: '.524', gb: '14', streak: 'W1' },
  { id: 'edm', name: 'Edmonton Oilers', abbr: 'EDM', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png', record: '49-27-6', conf: 'Western', division: 'Pacific', standing: '2nd', color: '#FF4C00', wins: 49, losses: 27, pct: '.634', gb: '3', streak: 'W6' },
  { id: 'la', name: 'Los Angeles Kings', abbr: 'LAK', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/la.png', record: '44-30-8', conf: 'Western', division: 'Pacific', standing: '3rd', color: '#111111', wins: 44, losses: 30, pct: '.585', gb: '8', streak: 'W1' },
  { id: 'sj', name: 'San Jose Sharks', abbr: 'SJS', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/sj.png', record: '19-55-8', conf: 'Western', division: 'Pacific', standing: '8th', color: '#006D75', wins: 19, losses: 55, pct: '.280', gb: '33', streak: 'L5' },
  { id: 'sea', name: 'Seattle Kraken', abbr: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png', record: '34-41-7', conf: 'Western', division: 'Pacific', standing: '6th', color: '#001628', wins: 34, losses: 41, pct: '.463', gb: '18', streak: 'L1' },
  { id: 'van', name: 'Vancouver Canucks', abbr: 'VAN', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/van.png', record: '50-25-7', conf: 'Western', division: 'Pacific', standing: '1st', color: '#001F5B', wins: 50, losses: 25, pct: '.659', gb: '—', streak: 'W2' },
  { id: 'vgk', name: 'Vegas Golden Knights', abbr: 'VGK', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png', record: '45-29-8', conf: 'Western', division: 'Pacific', standing: '4th', color: '#B4975A', wins: 45, losses: 29, pct: '.598', gb: '5', streak: 'L1' },
];

// For NHL: group by division for standings display
const NHL_STANDINGS = ['Eastern - Atlantic','Eastern - Metropolitan','Western - Central','Western - Pacific'].map(key => {
  const [conf, div] = key.split(' - ');
  return { conf: `${conf} · ${div}`, teams: NHL_TEAMS.filter(t => t.conf === conf && t.division === div).sort((a,b) => a.wins < b.wins ? 1 : -1) };
});

// ─── TEAM_DATA removed — all teams now loaded live via fetchLeagueData ──────────
// NHL teams still use the NHL_TEAMS constant above
// eslint-disable-next-line no-unused-vars
const _TEAM_DATA_REMOVED = {
  nba: [
    { id: 'atl', name: 'Atlanta Hawks', abbr: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png', record: '36-46', conf: 'Eastern', standing: '9th', color: '#E03A3E' },
    { id: 'bos', name: 'Boston Celtics', abbr: 'BOS', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png', record: '61-21', conf: 'Eastern', standing: '1st', color: '#007A33' },
    { id: 'bkn', name: 'Brooklyn Nets', abbr: 'BKN', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png', record: '22-60', conf: 'Eastern', standing: '14th', color: '#000000' },
    { id: 'cha', name: 'Charlotte Hornets', abbr: 'CHA', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png', record: '21-61', conf: 'Eastern', standing: '15th', color: '#1D1160' },
    { id: 'chi', name: 'Chicago Bulls', abbr: 'CHI', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png', record: '39-43', conf: 'Eastern', standing: '7th', color: '#CE1141' },
    { id: 'cle', name: 'Cleveland Cavaliers', abbr: 'CLE', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png', record: '48-34', conf: 'Eastern', standing: '5th', color: '#860038' },
    { id: 'dal', name: 'Dallas Mavericks', abbr: 'DAL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png', record: '40-42', conf: 'Western', standing: '9th', color: '#00538C' },
    { id: 'den', name: 'Denver Nuggets', abbr: 'DEN', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png', record: '54-28', conf: 'Western', standing: '2nd', color: '#0E2240' },
    { id: 'det', name: 'Detroit Pistons', abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png', record: '28-54', conf: 'Eastern', standing: '12th', color: '#C8102E' },
    { id: 'gs', name: 'Golden State Warriors', abbr: 'GSW', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gs.png', record: '46-36', conf: 'Western', standing: '6th', color: '#1D428A' },
    { id: 'hou', name: 'Houston Rockets', abbr: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png', record: '52-30', conf: 'Western', standing: '4th', color: '#CE1141' },
    { id: 'ind', name: 'Indiana Pacers', abbr: 'IND', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png', record: '50-32', conf: 'Eastern', standing: '4th', color: '#002D62' },
    { id: 'lac', name: 'LA Clippers', abbr: 'LAC', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png', record: '42-40', conf: 'Western', standing: '8th', color: '#C8102E' },
    { id: 'lal', name: 'LA Lakers', abbr: 'LAL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', record: '45-37', conf: 'Western', standing: '5th', color: '#552583' },
    { id: 'mem', name: 'Memphis Grizzlies', abbr: 'MEM', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png', record: '27-55', conf: 'Western', standing: '13th', color: '#5D76A9' },
    { id: 'mia', name: 'Miami Heat', abbr: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png', record: '44-38', conf: 'Eastern', standing: '6th', color: '#98002E' },
    { id: 'mil', name: 'Milwaukee Bucks', abbr: 'MIL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png', record: '49-33', conf: 'Eastern', standing: '3rd', color: '#00471B' },
    { id: 'min', name: 'Minnesota Timberwolves', abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png', record: '53-29', conf: 'Western', standing: '3rd', color: '#0C2340' },
    { id: 'no', name: 'New Orleans Pelicans', abbr: 'NOP', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/no.png', record: '25-57', conf: 'Western', standing: '14th', color: '#0C2340' },
    { id: 'ny', name: 'New York Knicks', abbr: 'NYK', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png', record: '51-31', conf: 'Eastern', standing: '2nd', color: '#006BB6' },
    { id: 'okc', name: 'Oklahoma City Thunder', abbr: 'OKC', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png', record: '57-25', conf: 'Western', standing: '1st', color: '#007AC1' },
    { id: 'orl', name: 'Orlando Magic', abbr: 'ORL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png', record: '47-35', conf: 'Eastern', standing: '7th', color: '#0077C0' },
    { id: 'phi', name: 'Philadelphia 76ers', abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png', record: '24-58', conf: 'Eastern', standing: '13th', color: '#006BB6' },
    { id: 'phx', name: 'Phoenix Suns', abbr: 'PHX', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png', record: '36-46', conf: 'Western', standing: '10th', color: '#1D1160' },
    { id: 'por', name: 'Portland Trail Blazers', abbr: 'POR', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png', record: '20-62', conf: 'Western', standing: '15th', color: '#E03A3E' },
    { id: 'sac', name: 'Sacramento Kings', abbr: 'SAC', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png', record: '43-39', conf: 'Western', standing: '7th', color: '#5A2D81' },
    { id: 'sa', name: 'San Antonio Spurs', abbr: 'SAS', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png', record: '22-60', conf: 'Western', standing: '14th', color: '#C4CED4' },
    { id: 'tor', name: 'Toronto Raptors', abbr: 'TOR', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png', record: '30-52', conf: 'Eastern', standing: '11th', color: '#CE1141' },
    { id: 'utah', name: 'Utah Jazz', abbr: 'UTA', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/utah.png', record: '19-63', conf: 'Western', standing: '15th', color: '#002B5C' },
    { id: 'wsh', name: 'Washington Wizards', abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/wsh.png', record: '18-64', conf: 'Eastern', standing: '15th', color: '#002B5C' },
  ],
  nfl: [
    { id: 'buf', name: 'Buffalo Bills', abbr: 'BUF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png', record: '11-6', conf: 'AFC East', standing: '2nd', color: '#00338D' },
    { id: 'mia', name: 'Miami Dolphins', abbr: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/mia.png', record: '9-8', conf: 'AFC East', standing: '3rd', color: '#008E97' },
    { id: 'ne', name: 'New England Patriots', abbr: 'NE', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ne.png', record: '4-13', conf: 'AFC East', standing: '4th', color: '#002244' },
    { id: 'nyj', name: 'New York Jets', abbr: 'NYJ', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png', record: '5-12', conf: 'AFC East', standing: '3rd', color: '#125740' },
    { id: 'bal', name: 'Baltimore Ravens', abbr: 'BAL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png', record: '13-4', conf: 'AFC North', standing: '1st', color: '#241773' },
    { id: 'cin', name: 'Cincinnati Bengals', abbr: 'CIN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png', record: '9-8', conf: 'AFC North', standing: '2nd', color: '#FB4F14' },
    { id: 'cle', name: 'Cleveland Browns', abbr: 'CLE', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png', record: '3-14', conf: 'AFC North', standing: '4th', color: '#311D00' },
    { id: 'pit', name: 'Pittsburgh Steelers', abbr: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png', record: '10-7', conf: 'AFC North', standing: '3rd', color: '#FFB612' },
    { id: 'hou', name: 'Houston Texans', abbr: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png', record: '10-7', conf: 'AFC South', standing: '1st', color: '#03202F' },
    { id: 'ind', name: 'Indianapolis Colts', abbr: 'IND', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ind.png', record: '9-8', conf: 'AFC South', standing: '2nd', color: '#002C5F' },
    { id: 'jax', name: 'Jacksonville Jaguars', abbr: 'JAX', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/jax.png', record: '4-13', conf: 'AFC South', standing: '4th', color: '#006778' },
    { id: 'ten', name: 'Tennessee Titans', abbr: 'TEN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ten.png', record: '3-14', conf: 'AFC South', standing: '4th', color: '#0C2340' },
    { id: 'den', name: 'Denver Broncos', abbr: 'DEN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png', record: '10-7', conf: 'AFC West', standing: '2nd', color: '#FB4F14' },
    { id: 'kc', name: 'Kansas City Chiefs', abbr: 'KC', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png', record: '15-2', conf: 'AFC West', standing: '1st', color: '#E31837' },
    { id: 'lv', name: 'Las Vegas Raiders', abbr: 'LV', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png', record: '4-13', conf: 'AFC West', standing: '3rd', color: '#000000' },
    { id: 'lac', name: 'LA Chargers', abbr: 'LAC', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png', record: '11-6', conf: 'AFC West', standing: '2nd', color: '#0080C6' },
    { id: 'dal', name: 'Dallas Cowboys', abbr: 'DAL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png', record: '10-7', conf: 'NFC East', standing: '2nd', color: '#003594' },
    { id: 'nyg', name: 'New York Giants', abbr: 'NYG', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png', record: '3-14', conf: 'NFC East', standing: '4th', color: '#0B2265' },
    { id: 'phi', name: 'Philadelphia Eagles', abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png', record: '14-3', conf: 'NFC East', standing: '1st', color: '#004C54' },
    { id: 'wsh', name: 'Washington Commanders', abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/wsh.png', record: '12-5', conf: 'NFC East', standing: '2nd', color: '#5A1414' },
    { id: 'chi', name: 'Chicago Bears', abbr: 'CHI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png', record: '5-12', conf: 'NFC North', standing: '4th', color: '#0B162A' },
    { id: 'det', name: 'Detroit Lions', abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png', record: '15-2', conf: 'NFC North', standing: '1st', color: '#0076B6' },
    { id: 'gb', name: 'Green Bay Packers', abbr: 'GB', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/gb.png', record: '11-6', conf: 'NFC North', standing: '2nd', color: '#203731' },
    { id: 'min', name: 'Minnesota Vikings', abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png', record: '14-3', conf: 'NFC North', standing: '1st', color: '#4F2683' },
    { id: 'atl', name: 'Atlanta Falcons', abbr: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png', record: '8-9', conf: 'NFC South', standing: '2nd', color: '#A71930' },
    { id: 'car', name: 'Carolina Panthers', abbr: 'CAR', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/car.png', record: '5-12', conf: 'NFC South', standing: '3rd', color: '#0085CA' },
    { id: 'no', name: 'New Orleans Saints', abbr: 'NO', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/no.png', record: '9-8', conf: 'NFC South', standing: '1st', color: '#D3BC8D' },
    { id: 'tb', name: 'Tampa Bay Buccaneers', abbr: 'TB', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/tb.png', record: '10-7', conf: 'NFC South', standing: '1st', color: '#D50A0A' },
    { id: 'ari', name: 'Arizona Cardinals', abbr: 'ARI', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/ari.png', record: '8-9', conf: 'NFC West', standing: '3rd', color: '#97233F' },
    { id: 'lar', name: 'LA Rams', abbr: 'LAR', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lar.png', record: '10-7', conf: 'NFC West', standing: '2nd', color: '#003594' },
    { id: 'sea', name: 'Seattle Seahawks', abbr: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sea.png', record: '10-7', conf: 'NFC West', standing: '2nd', color: '#002244' },
    { id: 'sf', name: 'San Francisco 49ers', abbr: 'SF', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png', record: '12-5', conf: 'NFC West', standing: '1st', color: '#AA0000' },
  ],
  mlb: [
    { id: 'bal', name: 'Baltimore Orioles', abbr: 'BAL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bal.png', record: '40-27', conf: 'AL East', standing: '2nd', color: '#DF4601' },
    { id: 'bos', name: 'Boston Red Sox', abbr: 'BOS', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/bos.png', record: '35-32', conf: 'AL East', standing: '3rd', color: '#BD3039' },
    { id: 'nyy', name: 'New York Yankees', abbr: 'NYY', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nyy.png', record: '45-22', conf: 'AL East', standing: '1st', color: '#003087' },
    { id: 'tb', name: 'Tampa Bay Rays', abbr: 'TB', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tb.png', record: '30-37', conf: 'AL East', standing: '4th', color: '#092C5C' },
    { id: 'tor', name: 'Toronto Blue Jays', abbr: 'TOR', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tor.png', record: '28-39', conf: 'AL East', standing: '5th', color: '#134A8E' },
    { id: 'chw', name: 'Chicago White Sox', abbr: 'CWS', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chw.png', record: '20-47', conf: 'AL Central', standing: '5th', color: '#27251F' },
    { id: 'cle', name: 'Cleveland Guardians', abbr: 'CLE', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cle.png', record: '36-31', conf: 'AL Central', standing: '2nd', color: '#00385D' },
    { id: 'det', name: 'Detroit Tigers', abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/det.png', record: '33-34', conf: 'AL Central', standing: '3rd', color: '#0C2340' },
    { id: 'kc', name: 'Kansas City Royals', abbr: 'KC', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/kc.png', record: '38-29', conf: 'AL Central', standing: '1st', color: '#004687' },
    { id: 'min', name: 'Minnesota Twins', abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/min.png', record: '34-33', conf: 'AL Central', standing: '4th', color: '#002B5C' },
    { id: 'hou', name: 'Houston Astros', abbr: 'HOU', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/hou.png', record: '38-29', conf: 'AL West', standing: '2nd', color: '#002D62' },
    { id: 'laa', name: 'Los Angeles Angels', abbr: 'LAA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/laa.png', record: '29-38', conf: 'AL West', standing: '4th', color: '#BA0021' },
    { id: 'oak', name: "Oakland Athletics", abbr: 'OAK', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/oak.png', record: '26-41', conf: 'AL West', standing: '5th', color: '#003831' },
    { id: 'sea', name: 'Seattle Mariners', abbr: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sea.png', record: '40-27', conf: 'AL West', standing: '1st', color: '#0C2C56' },
    { id: 'tex', name: 'Texas Rangers', abbr: 'TEX', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/tex.png', record: '31-36', conf: 'AL West', standing: '3rd', color: '#003278' },
    { id: 'atl', name: 'Atlanta Braves', abbr: 'ATL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/atl.png', record: '40-27', conf: 'NL East', standing: '1st', color: '#CE1141' },
    { id: 'mia', name: 'Miami Marlins', abbr: 'MIA', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mia.png', record: '22-45', conf: 'NL East', standing: '5th', color: '#00A3E0' },
    { id: 'nym', name: 'New York Mets', abbr: 'NYM', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/nym.png', record: '37-30', conf: 'NL East', standing: '2nd', color: '#002D72' },
    { id: 'phi', name: 'Philadelphia Phillies', abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/phi.png', record: '36-31', conf: 'NL East', standing: '3rd', color: '#E81828' },
    { id: 'was', name: 'Washington Nationals', abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/was.png', record: '29-38', conf: 'NL East', standing: '4th', color: '#AB0003' },
    { id: 'chc', name: 'Chicago Cubs', abbr: 'CHC', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/chc.png', record: '36-31', conf: 'NL Central', standing: '2nd', color: '#0E3386' },
    { id: 'cin', name: 'Cincinnati Reds', abbr: 'CIN', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/cin.png', record: '33-34', conf: 'NL Central', standing: '3rd', color: '#C6011F' },
    { id: 'mil', name: 'Milwaukee Brewers', abbr: 'MIL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/mil.png', record: '39-28', conf: 'NL Central', standing: '1st', color: '#12284B' },
    { id: 'pit', name: 'Pittsburgh Pirates', abbr: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/pit.png', record: '28-39', conf: 'NL Central', standing: '4th', color: '#27251F' },
    { id: 'stl', name: 'St. Louis Cardinals', abbr: 'STL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/stl.png', record: '30-37', conf: 'NL Central', standing: '5th', color: '#C41E3A' },
    { id: 'ari', name: 'Arizona Diamondbacks', abbr: 'ARI', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/ari.png', record: '37-30', conf: 'NL West', standing: '2nd', color: '#A71930' },
    { id: 'col', name: 'Colorado Rockies', abbr: 'COL', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/col.png', record: '22-45', conf: 'NL West', standing: '5th', color: '#333366' },
    { id: 'lad', name: 'Los Angeles Dodgers', abbr: 'LAD', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/lad.png', record: '43-24', conf: 'NL West', standing: '1st', color: '#005A9C' },
    { id: 'sd', name: 'San Diego Padres', abbr: 'SD', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sd.png', record: '35-32', conf: 'NL West', standing: '3rd', color: '#2F241D' },
    { id: 'sf', name: 'San Francisco Giants', abbr: 'SF', logo: 'https://a.espncdn.com/i/teamlogos/mlb/500/sf.png', record: '32-35', conf: 'NL West', standing: '4th', color: '#FD5A1E' },
  ],
  nhl: [
    { id: 'bos', name: 'Boston Bruins', abbr: 'BOS', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/bos.png', record: '47-20-15', conf: 'Eastern', standing: '2nd', color: '#FFB81C' },
    { id: 'buf', name: 'Buffalo Sabres', abbr: 'BUF', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/buf.png', record: '38-35-9', conf: 'Eastern', standing: '5th', color: '#002654' },
    { id: 'det', name: 'Detroit Red Wings', abbr: 'DET', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/det.png', record: '35-38-9', conf: 'Eastern', standing: '7th', color: '#CE1126' },
    { id: 'fla', name: 'Florida Panthers', abbr: 'FLA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/fla.png', record: '52-21-9', conf: 'Eastern', standing: '1st', color: '#C8102E' },
    { id: 'mtr', name: 'Montréal Canadiens', abbr: 'MTL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/mtr.png', record: '30-43-9', conf: 'Eastern', standing: '8th', color: '#AF1E2D' },
    { id: 'ott', name: 'Ottawa Senators', abbr: 'OTT', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ott.png', record: '37-35-10', conf: 'Eastern', standing: '6th', color: '#C52032' },
    { id: 'tb', name: 'Tampa Bay Lightning', abbr: 'TB', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tb.png', record: '46-28-8', conf: 'Eastern', standing: '3rd', color: '#002868' },
    { id: 'tor', name: 'Toronto Maple Leafs', abbr: 'TOR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/tor.png', record: '44-30-8', conf: 'Eastern', standing: '4th', color: '#003E7E' },
    { id: 'car', name: 'Carolina Hurricanes', abbr: 'CAR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/car.png', record: '50-24-8', conf: 'Eastern', standing: '1st', color: '#CE1126' },
    { id: 'cbj', name: 'Columbus Blue Jackets', abbr: 'CBJ', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/cbj.png', record: '27-45-10', conf: 'Eastern', standing: '8th', color: '#002654' },
    { id: 'nj', name: 'New Jersey Devils', abbr: 'NJD', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nj.png', record: '44-29-9', conf: 'Eastern', standing: '2nd', color: '#CE1126' },
    { id: 'nyi', name: 'New York Islanders', abbr: 'NYI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nyi.png', record: '36-35-11', conf: 'Eastern', standing: '6th', color: '#00539B' },
    { id: 'nyr', name: 'New York Rangers', abbr: 'NYR', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nyr.png', record: '55-21-6', conf: 'Eastern', standing: '1st', color: '#0038A8' },
    { id: 'phi', name: 'Philadelphia Flyers', abbr: 'PHI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/phi.png', record: '33-38-11', conf: 'Eastern', standing: '7th', color: '#F74902' },
    { id: 'pit', name: 'Pittsburgh Penguins', abbr: 'PIT', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/pit.png', record: '37-33-12', conf: 'Eastern', standing: '5th', color: '#FCB514' },
    { id: 'wsh', name: 'Washington Capitals', abbr: 'WSH', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/wsh.png', record: '45-27-10', conf: 'Eastern', standing: '3rd', color: '#C8102E' },
    { id: 'ari', name: 'Utah Hockey Club', abbr: 'UTA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ari.png', record: '36-38-8', conf: 'Western', standing: '7th', color: '#69B3E7' },
    { id: 'chi', name: 'Chicago Blackhawks', abbr: 'CHI', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/chi.png', record: '23-50-9', conf: 'Western', standing: '8th', color: '#CF0A2C' },
    { id: 'col', name: 'Colorado Avalanche', abbr: 'COL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/col.png', record: '50-23-9', conf: 'Western', standing: '1st', color: '#6F263D' },
    { id: 'dal', name: 'Dallas Stars', abbr: 'DAL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/dal.png', record: '52-22-8', conf: 'Western', standing: '1st', color: '#006847' },
    { id: 'min', name: 'Minnesota Wild', abbr: 'MIN', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/min.png', record: '39-33-10', conf: 'Western', standing: '5th', color: '#154734' },
    { id: 'nsh', name: 'Nashville Predators', abbr: 'NSH', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/nsh.png', record: '32-40-10', conf: 'Western', standing: '7th', color: '#FFB81C' },
    { id: 'stl', name: 'St. Louis Blues', abbr: 'STL', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/stl.png', record: '42-31-9', conf: 'Western', standing: '3rd', color: '#002F87' },
    { id: 'wpg', name: 'Winnipeg Jets', abbr: 'WPG', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/wpg.png', record: '52-24-6', conf: 'Western', standing: '1st', color: '#041E42' },
    { id: 'ana', name: 'Anaheim Ducks', abbr: 'ANA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/ana.png', record: '27-47-8', conf: 'Western', standing: '8th', color: '#FC4C02' },
    { id: 'cgy', name: 'Calgary Flames', abbr: 'CGY', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/cgy.png', record: '38-35-9', conf: 'Western', standing: '5th', color: '#C8102E' },
    { id: 'edm', name: 'Edmonton Oilers', abbr: 'EDM', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/edm.png', record: '49-27-6', conf: 'Western', standing: '2nd', color: '#FF4C00' },
    { id: 'la', name: 'Los Angeles Kings', abbr: 'LAK', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/la.png', record: '44-30-8', conf: 'Western', standing: '3rd', color: '#111111' },
    { id: 'sj', name: 'San Jose Sharks', abbr: 'SJS', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/sj.png', record: '19-55-8', conf: 'Western', standing: '8th', color: '#006D75' },
    { id: 'sea', name: 'Seattle Kraken', abbr: 'SEA', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/sea.png', record: '34-41-7', conf: 'Western', standing: '7th', color: '#001628' },
    { id: 'van', name: 'Vancouver Canucks', abbr: 'VAN', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/van.png', record: '50-25-7', conf: 'Western', standing: '1st', color: '#001F5B' },
    { id: 'vgk', name: 'Vegas Golden Knights', abbr: 'VGK', logo: 'https://a.espncdn.com/i/teamlogos/nhl/500/vgk.png', record: '45-29-8', conf: 'Western', standing: '4th', color: '#B4975A' },
  ],
};

// LEAGUE_STANDINGS removed — NBA/NFL/MLB standings now fetched live from SportsData.io
// NHL standings are in NHL_STANDINGS constant above
const LEAGUE_STANDINGS = {
  nba: [
    { conf: 'Eastern', teams: [
      { pos: 1, name: 'Boston Celtics', abbr: 'BOS', w: 61, l: 21, pct: '.744', gb: '—', streak: 'W3' },
      { pos: 2, name: 'New York Knicks', abbr: 'NYK', w: 51, l: 31, pct: '.622', gb: '10', streak: 'L1' },
      { pos: 3, name: 'Milwaukee Bucks', abbr: 'MIL', w: 49, l: 33, pct: '.598', gb: '12', streak: 'W2' },
      { pos: 4, name: 'Indiana Pacers', abbr: 'IND', w: 50, l: 32, pct: '.610', gb: '11', streak: 'W1' },
    ]},
    { conf: 'Western', teams: [
      { pos: 1, name: 'OKC Thunder', abbr: 'OKC', w: 57, l: 25, pct: '.695', gb: '—', streak: 'W5' },
      { pos: 2, name: 'Denver Nuggets', abbr: 'DEN', w: 54, l: 28, pct: '.659', gb: '3', streak: 'W2' },
      { pos: 3, name: 'Minnesota Timberwolves', abbr: 'MIN', w: 53, l: 29, pct: '.646', gb: '4', streak: 'L2' },
      { pos: 4, name: 'LA Lakers', abbr: 'LAL', w: 45, l: 37, pct: '.549', gb: '12', streak: 'W1' },
    ]},
  ],
  nfl: [
    { conf: 'AFC', teams: [
      { pos: 1, name: 'Kansas City Chiefs', abbr: 'KC', w: 15, l: 2, pct: '.882', gb: '—', streak: 'W8' },
      { pos: 2, name: 'Baltimore Ravens', abbr: 'BAL', w: 13, l: 4, pct: '.765', gb: '2', streak: 'W3' },
      { pos: 3, name: 'Buffalo Bills', abbr: 'BUF', w: 11, l: 6, pct: '.647', gb: '4', streak: 'W1' },
      { pos: 4, name: 'Miami Dolphins', abbr: 'MIA', w: 9, l: 8, pct: '.529', gb: '6', streak: 'L2' },
    ]},
    { conf: 'NFC', teams: [
      { pos: 1, name: 'San Francisco 49ers', abbr: 'SF', w: 12, l: 5, pct: '.706', gb: '—', streak: 'W2' },
      { pos: 2, name: 'Philadelphia Eagles', abbr: 'PHI', w: 11, l: 6, pct: '.647', gb: '1', streak: 'W4' },
      { pos: 3, name: 'Detroit Lions', abbr: 'DET', w: 12, l: 5, pct: '.706', gb: '—', streak: 'L1' },
      { pos: 4, name: 'Dallas Cowboys', abbr: 'DAL', w: 10, l: 7, pct: '.588', gb: '2', streak: 'W1' },
    ]},
  ],
  mlb: [
    { conf: 'AL East', teams: [
      { pos: 1, name: 'New York Yankees', abbr: 'NYY', w: 45, l: 22, pct: '.672', gb: '—', streak: 'W2' },
      { pos: 2, name: 'Baltimore Orioles', abbr: 'BAL', w: 40, l: 27, pct: '.597', gb: '5', streak: 'W1' },
      { pos: 3, name: 'Boston Red Sox', abbr: 'BOS', w: 35, l: 32, pct: '.522', gb: '10', streak: 'L3' },
    ]},
    { conf: 'NL West', teams: [
      { pos: 1, name: 'Los Angeles Dodgers', abbr: 'LAD', w: 43, l: 24, pct: '.642', gb: '—', streak: 'W4' },
      { pos: 2, name: 'San Diego Padres', abbr: 'SD', w: 37, l: 30, pct: '.552', gb: '6', streak: 'W2' },
      { pos: 3, name: 'San Francisco Giants', abbr: 'SF', w: 33, l: 34, pct: '.493', gb: '10', streak: 'L1' },
    ]},
  ],
  nhl: [
    { conf: 'Eastern', teams: [
      { pos: 1, name: 'Florida Panthers', abbr: 'FLA', w: 52, l: 21, pct: '.704', gb: '—', streak: 'W3' },
      { pos: 2, name: 'Tampa Bay Lightning', abbr: 'TB', w: 46, l: 28, pct: '.621', gb: '6', streak: 'W1' },
      { pos: 3, name: 'Toronto Maple Leafs', abbr: 'TOR', w: 44, l: 30, pct: '.595', gb: '8', streak: 'L2' },
    ]},
    { conf: 'Western', teams: [
      { pos: 1, name: 'Edmonton Oilers', abbr: 'EDM', w: 49, l: 27, pct: '.645', gb: '—', streak: 'W6' },
      { pos: 2, name: 'Colorado Avalanche', abbr: 'COL', w: 50, l: 23, pct: '.676', gb: '—', streak: 'W2' },
      { pos: 3, name: 'Vegas Golden Knights', abbr: 'VGK', w: 45, l: 29, pct: '.608', gb: '4', streak: 'L1' },
    ]},
  ],
};

// League landing page — live data from SportsData.io (NHL uses hardcoded data)
const LeaguePage = () => {
  const { slug } = useParams();
  const league = slug?.toLowerCase();
  const label = LEAGUES.find(l => l.key === league)?.label || league?.toUpperCase();
  const [activeTab, setActiveTab] = useState('teams');
  const [teams, setTeams] = useState([]);
  const [standingGroups, setStandingGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const emojis = { nba: '🏀', nfl: '🏈', mlb: '⚾', nhl: '🏒' };

  useEffect(() => {
    setLoading(true);
    if (league === 'nhl') {
      setTeams(NHL_TEAMS);
      setStandingGroups(NHL_STANDINGS);
      setLoading(false);
      return;
    }
    fetchLeagueData(league)
      .then(data => {
        if (!data) return;
        setTeams(data.teams);
        setStandingGroups(groupStandings(data.teams, data.rawStandings, league));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [league]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <span className="text-5xl">{emojis[league] || '🏆'}</span>
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tight text-[#f0ebe0]">{label}</h1>
          <p className="text-[#555] text-sm">Teams · Standings · Scores — Live Data</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 border-b border-[#2a2a2a]">
        {['teams', 'standings'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
              activeTab === t ? 'text-[#f0ebe0] border-[#E21111]' : 'text-[#555] border-transparent hover:text-[#888]'
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-8 h-8 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
          <div className="text-[#555] text-xs font-black uppercase tracking-widest">Loading {label} data...</div>
        </div>
      )}

      {/* Teams grid */}
      {!loading && activeTab === 'teams' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teams.map(team => (
            <Link key={team.id} to={`/team/${league}/${team.id}`}
              className="bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl p-4 flex items-center gap-4 transition-all group hover:-translate-y-0.5">
              <div className="w-12 h-12 shrink-0 flex items-center justify-center">
                <img src={team.logo} alt={team.abbr} className="w-12 h-12 object-contain"
                  onError={e => { e.target.style.display='none'; }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#f0ebe0] font-black text-sm truncate">{team.name}</div>
                <div className="text-[#555] text-[10px] mt-0.5">
                  {[team.division || team.conf, team.standing !== '—' && team.standing, team.record].filter(Boolean).join(' · ')}
                </div>
              </div>
              <ChevronRight size={14} className="text-[#333] group-hover:text-[#E21111] transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Standings */}
      {!loading && activeTab === 'standings' && (
        <div className="space-y-6">
          {standingGroups.length === 0 ? (
            <div className="text-center py-20 text-[#555]">
              <div className="text-5xl mb-4">📋</div>
              <div className="font-black uppercase tracking-widest text-sm">Standings not available</div>
              <div className="text-xs mt-2 opacity-60">Season may not have started yet</div>
            </div>
          ) : standingGroups.map(div => (
            <div key={div.conf}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">{div.conf}</h3>
              </div>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_3rem] gap-2 px-4 py-2 border-b border-[#2a2a2a] text-[9px] font-black uppercase tracking-widest text-[#444]">
                  <span>#</span><span>Team</span><span className="text-center">W</span><span className="text-center">L</span>
                  <span className="text-center">PCT</span><span className="text-center">GB</span><span className="text-center">STK</span>
                </div>
                {div.teams.map((t, i) => (
                  <Link key={t.abbr || i} to={`/team/${league}/${t.id || t.abbr?.toLowerCase()}`}
                    className="grid grid-cols-[2rem_1fr_3rem_3rem_3rem_3rem_3rem] gap-2 px-4 py-3 border-b border-[#2a2a2a] last:border-0 hover:bg-white/5 transition-colors items-center">
                    <span className="text-[#555] text-xs font-black">{i + 1}</span>
                    <span className="text-[#f0ebe0] text-xs font-bold truncate">{t.name}</span>
                    <span className="text-[#f0ebe0] text-xs font-black text-center">{t.wins ?? '—'}</span>
                    <span className="text-[#888] text-xs text-center">{t.losses ?? '—'}</span>
                    <span className="text-[#888] text-xs text-center">{t.pct ?? '—'}</span>
                    <span className="text-[#555] text-xs text-center">{t.gb ?? '—'}</span>
                    <span className={`text-[10px] font-black text-center ${(t.streak || '').startsWith('W') ? 'text-green-400' : 'text-[#E21111]'}`}>
                      {t.streak || '—'}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Individual team page
// ── per-sport helpers ──────────────────────────────────────────────────────────
const POS_COLOR = pos => {
  if (!pos) return 'text-[#555]';
  if (['QB','PG','SP','GK'].includes(pos)) return 'text-blue-400';
  if (['WR','SG','CF','LF','RF'].includes(pos)) return 'text-green-400';
  if (['TE','PF','C','1B','2B','3B','SS'].includes(pos)) return 'text-yellow-400';
  if (['RP','P','DH'].includes(pos)) return 'text-purple-400';
  return 'text-[#888]';
};

const playerStat = (league, p) => {
  if (league === 'nba') {
    const pts = p.PointsPerGame != null ? p.PointsPerGame.toFixed(1) : null;
    const reb = p.ReboundsPerGame != null ? p.ReboundsPerGame.toFixed(1) : null;
    const ast = p.AssistsPerGame != null ? p.AssistsPerGame.toFixed(1) : null;
    if (pts) return `${pts} PPG · ${reb ?? '—'} REB · ${ast ?? '—'} AST`;
  }
  if (league === 'mlb') {
    const isPitcher = ['SP','RP','P'].includes(p.Position);
    if (isPitcher && p.EarnedRunAverage != null) return `${p.EarnedRunAverage.toFixed(2)} ERA`;
    if (!isPitcher && p.BattingAverage != null) {
      const avg = `.${String(Math.round(p.BattingAverage * 1000)).padStart(3, '0')}`;
      return `${avg} AVG${p.HomeRuns != null ? ` · ${p.HomeRuns} HR` : ''}`;
    }
  }
  if (league === 'nfl') {
    if (p.Position === 'QB' && p.PassingYards != null) return `${p.PassingYards} PASS YDS`;
    if (['RB','FB'].includes(p.Position) && p.RushingYards != null) return `${p.RushingYards} RUSH YDS`;
    if (['WR','TE'].includes(p.Position) && p.ReceivingYards != null) return `${p.ReceivingYards} REC YDS`;
  }
  return null;
};

const fetchTeamSchedule = async (league, teamKey) => {
  if (league === 'nhl') return [];
  try {
    const season = league === 'nfl' ? '2026REG' : '2026';
    const res = await fetch(`${SPORTS_BASE}/${league}/scores/json/GamesByTeam/${season}/${teamKey.toUpperCase()}?key=${SPORTS_KEY}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch { return []; }
};

const TeamPage = () => {
  const { league, id } = useParams();
  const leagueObj = LEAGUES.find(l => l.key === league);

  const [team, setTeam]           = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [todayGames, setTodayGames] = useState([]);

  // Roster state
  const [roster, setRoster]             = useState([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterLoaded, setRosterLoaded]   = useState(false);
  const [rosterFilter, setRosterFilter]   = useState('ALL');

  // Schedule state
  const [schedule, setSchedule]         = useState([]);
  const [schedLoading, setSchedLoading] = useState(false);
  const [schedLoaded, setSchedLoaded]   = useState(false);

  // ── Load team info ──────────────────────────────────────────────────────────
  useEffect(() => {
    setTeamLoading(true);
    if (league === 'nhl') {
      const found = NHL_TEAMS.find(t => t.id === id);
      setTeam(found || null);
      setTeamLoading(false);
      return;
    }
    fetchLeagueData(league)
      .then(data => {
        if (!data) return;
        setTeam(data.teams.find(t => t.id === id) || null);
      })
      .catch(() => {})
      .finally(() => setTeamLoading(false));
  }, [league, id]);

  // ── Today's ESPN scores for "game banner" ──────────────────────────────────
  useEffect(() => {
    fetchScores().then(all => setTodayGames(all.filter(g => g.league === league))).catch(() => {});
  }, [league]);

  // ── Lazy-load roster when tab first opened ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'roster' || rosterLoaded || league === 'nhl') return;
    setRosterLoading(true);
    fetchTeamRoster(league, id)
      .then(data => { setRoster(data); setRosterLoaded(true); })
      .catch(() => {})
      .finally(() => setRosterLoading(false));
  }, [activeTab, league, id, rosterLoaded]);

  // ── Lazy-load schedule when tab first opened ───────────────────────────────
  useEffect(() => {
    if (activeTab !== 'schedule' || schedLoaded) return;
    setSchedLoading(true);
    fetchTeamSchedule(league, id)
      .then(data => { setSchedule(data); setSchedLoaded(true); })
      .catch(() => {})
      .finally(() => setSchedLoading(false));
  }, [activeTab, league, id, schedLoaded]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const todayGame = todayGames.find(g =>
    g.home.name === team?.abbr || g.away.name === team?.abbr
  );

  const overviewStats = !team ? [] : (() => {
    const base = [
      ['Record',  team.record  || '—'],
      ['Standing',team.standing|| '—'],
      ['W%',      team.pct     || '—'],
      ['Streak',  team.streak  || '—'],
    ];
    const scored  = team.ppg    != null ? team.ppg.toFixed(1)    : '—';
    const allowed = team.oppPpg != null ? team.oppPpg.toFixed(1) : '—';
    if (league === 'mlb') return [...base, ['R/G', scored], ['Opp R/G', allowed]];
    if (league === 'nhl') return [...base, ['GF/G', scored], ['GA/G',   allowed]];
    if (league === 'nfl') return [...base, ['PTS/G', scored], ['Opp PTS', allowed]];
    return [...base, ['PPG', scored], ['OPP PPG', allowed]];
  })();

  const recentForm = (() => {
    if (!team?.streak) return [];
    const s = team.streak;
    if (!s || s === '—') return [];
    const dir = s[0]; const n = parseInt(s.slice(1)) || 0;
    return Array.from({ length: Math.min(n, 5) }, () => dir)
      .concat(Array.from({ length: Math.max(0, 5 - n) }, () => dir === 'W' ? 'L' : 'W'))
      .slice(0, 5);
  })();

  // Roster position groups
  const posGroups = (() => {
    if (!roster.length) return [];
    const all = [...new Set(roster.map(p => p.Position).filter(Boolean))].sort();
    return ['ALL', ...all];
  })();

  const filteredRoster = rosterFilter === 'ALL'
    ? roster
    : roster.filter(p => p.Position === rosterFilter);

  // Schedule display helpers
  const fmtDate = d => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  const completed = schedule.filter(g => g.Status === 'Final' || g.Status === 'F').slice(-8);
  const upcoming  = schedule.filter(g => g.Status === 'Scheduled').slice(0, 8);

  // ── Loading / not-found states ─────────────────────────────────────────────
  if (teamLoading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
      <div className="text-[#555] text-xs font-black uppercase tracking-widest">Loading team...</div>
    </div>
  );

  if (!team) return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">🏟️</div>
        <h2 className="text-2xl font-black uppercase text-[#f0ebe0] mb-3">Team Not Found</h2>
        <Link to={`/league/${league}`} className="text-[#E21111] font-bold text-sm hover:underline">
          ← Back to {leagueObj?.label}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#555] text-xs mb-6">
        <Link to="/" className="hover:text-[#f0ebe0]">Home</Link>
        <span>/</span>
        <Link to={`/league/${league}`} className="hover:text-[#f0ebe0]">{leagueObj?.label}</Link>
        <span>/</span>
        <span className="text-[#888]">{team.name}</span>
      </div>

      {/* ── Team Hero ── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-[#1a1a1a] border border-[#2a2a2a]">
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ background: `linear-gradient(135deg, ${team.color || '#E21111'}, transparent)` }} />
        <div className="relative p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6">
          <img src={team.logo} alt={team.name}
            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl shrink-0"
            onError={e => { e.target.style.display = 'none'; }} />

          <div className="flex-1 text-center md:text-left">
            <div className="text-[#555] text-[10px] font-black uppercase tracking-widest mb-1">
              {leagueObj?.label}{team.conf ? ` · ${team.conf}` : ''}{team.division ? ` · ${team.division}` : ''}
            </div>
            <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#f0ebe0] mb-3">{team.name}</h1>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              {team.record !== '—' && (
                <>
                  <div className="text-center">
                    <div className="text-[#f0ebe0] font-black text-xl">{team.record}</div>
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest">Record</div>
                  </div>
                  <div className="w-px h-8 bg-[#2a2a2a]" />
                </>
              )}
              {team.standing !== '—' && (
                <>
                  <div className="text-center">
                    <div className="text-[#f0ebe0] font-black text-xl">{team.standing}</div>
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest">Div. Rank</div>
                  </div>
                  <div className="w-px h-8 bg-[#2a2a2a]" />
                </>
              )}
              {recentForm.length > 0 && (
                <div className="flex items-center gap-1.5">
                  {recentForm.map((r, i) => (
                    <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black
                      ${r === 'W' ? 'bg-green-500/20 text-green-400' : 'bg-[#E21111]/20 text-[#E21111]'}`}>{r}</span>
                  ))}
                  <div className="text-[#555] text-[9px] font-black uppercase tracking-widest ml-1">Streak</div>
                </div>
              )}
            </div>
          </div>

          <Link to="/register"
            className="shrink-0 flex items-center gap-2 bg-[#E21111] hover:bg-red-700 text-white font-black uppercase text-xs px-5 py-2.5 rounded-xl tracking-widest transition-colors">
            <BellIcon size={13} /> Follow
          </Link>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a]">
        {['overview', 'schedule', 'roster'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px
              ${activeTab === t ? 'text-[#f0ebe0] border-[#E21111]' : 'text-[#555] border-transparent hover:text-[#888]'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW ══ */}
      {activeTab === 'overview' && (
        <div className="space-y-4">

          {/* Season stats grid */}
          {overviewStats.length > 0 && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Season Stats</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {overviewStats.map(([label, val]) => (
                  <div key={label} className="bg-[#2a2a2a]/50 rounded-xl p-3 text-center">
                    <div className="text-[#f0ebe0] font-black text-lg">{val}</div>
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-wider">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's game banner */}
          {todayGame && (
            <Link to={`/game/${league}/${todayGame.id}`}
              className="flex items-center gap-4 bg-gradient-to-r from-[#E21111]/10 to-transparent border border-[#E21111]/20 rounded-2xl p-5 hover:border-[#E21111]/40 transition-all group">
              <div className="text-3xl">🏟️</div>
              <div className="flex-1">
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-0.5">
                  {todayGame.isLive ? '🔴 LIVE NOW' : todayGame.isFinal ? 'FINAL · TODAY' : 'GAME TODAY'}
                </div>
                <div className="text-[#f0ebe0] font-black text-sm">
                  {todayGame.away.name} {(todayGame.isLive || todayGame.isFinal) ? todayGame.away.score : ''} @ {todayGame.home.name} {(todayGame.isLive || todayGame.isFinal) ? todayGame.home.score : ''}
                </div>
                {todayGame.statusText && (
                  <div className="text-[#888] text-xs mt-0.5">{todayGame.statusText}</div>
                )}
              </div>
              <ChevronRight size={18} className="text-[#E21111] group-hover:translate-x-1 transition-transform" />
            </Link>
          )}

          {/* Quick roster preview — top 6 players */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Key Players</h3>
              </div>
              <button onClick={() => setActiveTab('roster')}
                className="text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:text-red-400 transition-colors">
                Full Roster →
              </button>
            </div>
            {league === 'nhl' ? (
              <div className="text-[#555] text-xs text-center py-4">Roster data not available for NHL</div>
            ) : (
              <RosterPreview league={league} teamId={id} />
            )}
          </div>

        </div>
      )}

      {/* ══ SCHEDULE ══ */}
      {activeTab === 'schedule' && (
        <div className="space-y-4">
          {schedLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
              <div className="text-[#555] text-xs font-black uppercase tracking-widest">Loading schedule...</div>
            </div>
          ) : (
            <>
              {completed.length > 0 && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#E21111] rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Recent Results</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[#2a2a2a]">
                    {completed.map((g, i) => {
                      const isHome   = g.HomeTeam === id.toUpperCase();
                      const oppKey   = isHome ? g.AwayTeam : g.HomeTeam;
                      const myScore  = isHome ? g.HomeTeamScore : g.AwayTeamScore;
                      const oppScore = isHome ? g.AwayTeamScore : g.HomeTeamScore;
                      const won      = myScore > oppScore;
                      return (
                        <div key={g.GameID || i} className="grid grid-cols-[4rem_3rem_1fr_6rem] gap-3 px-5 py-3.5 items-center hover:bg-white/5 transition-colors">
                          <span className="text-[#555] text-xs">{fmtDate(g.DateTime || g.Day)}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-center ${isHome ? 'bg-[#2a2a2a] text-[#888]' : 'text-[#555]'}`}>
                            {isHome ? 'HOME' : 'AWAY'}
                          </span>
                          <div className="flex items-center gap-2">
                            <img src={espnLogo(league, oppKey)} alt={oppKey}
                              className="w-5 h-5 object-contain" onError={e => { e.target.style.display='none'; }} />
                            <span className="text-[#f0ebe0] text-xs font-bold">{oppKey}</span>
                          </div>
                          <span className={`text-xs font-black ${won ? 'text-green-400' : 'text-[#E21111]'}`}>
                            {won ? 'W' : 'L'} {myScore}–{oppScore}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {upcoming.length > 0 && (
                <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#2a2a2a]">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#E21111] rounded-full" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#888]">Upcoming</span>
                    </div>
                  </div>
                  <div className="divide-y divide-[#2a2a2a]">
                    {upcoming.map((g, i) => {
                      const isHome = g.HomeTeam === id.toUpperCase();
                      const oppKey = isHome ? g.AwayTeam : g.HomeTeam;
                      return (
                        <div key={g.GameID || i} className="grid grid-cols-[4rem_3rem_1fr_6rem] gap-3 px-5 py-3.5 items-center opacity-70">
                          <span className="text-[#555] text-xs">{fmtDate(g.DateTime || g.Day)}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full text-center ${isHome ? 'bg-[#2a2a2a] text-[#888]' : 'text-[#555]'}`}>
                            {isHome ? 'HOME' : 'AWAY'}
                          </span>
                          <div className="flex items-center gap-2">
                            <img src={espnLogo(league, oppKey)} alt={oppKey}
                              className="w-5 h-5 object-contain" onError={e => { e.target.style.display='none'; }} />
                            <span className="text-[#f0ebe0] text-xs font-bold">{oppKey}</span>
                          </div>
                          <span className="text-[#555] text-xs">TBD</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!schedLoading && completed.length === 0 && upcoming.length === 0 && (
                <div className="text-center py-16 text-[#555]">
                  <div className="text-4xl mb-3">📅</div>
                  <div className="font-black uppercase tracking-widest text-sm">No schedule data available</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ ROSTER ══ */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {league === 'nhl' ? (
            <div className="text-center py-16 text-[#555]">
              <div className="text-4xl mb-3">🏒</div>
              <div className="font-black uppercase tracking-widest text-sm">NHL roster data not available</div>
              <div className="text-xs mt-2 opacity-60">Live roster requires an NHL API subscription</div>
            </div>
          ) : rosterLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-7 h-7 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
              <div className="text-[#555] text-xs font-black uppercase tracking-widest">Loading roster...</div>
            </div>
          ) : roster.length === 0 ? (
            <div className="text-center py-16 text-[#555]">
              <div className="text-4xl mb-3">👤</div>
              <div className="font-black uppercase tracking-widest text-sm">No roster data available</div>
            </div>
          ) : (
            <>
              {/* Position filter pills */}
              {posGroups.length > 2 && (
                <div className="flex flex-wrap gap-2">
                  {posGroups.map(pos => (
                    <button key={pos} onClick={() => setRosterFilter(pos)}
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest transition-all
                        ${rosterFilter === pos
                          ? 'bg-[#E21111] text-white'
                          : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] hover:text-[#888]'}`}>
                      {pos}
                    </button>
                  ))}
                </div>
              )}

              {/* Player list */}
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                <div className="grid grid-cols-[2rem_1fr_3rem_1fr] gap-4 px-5 py-2.5 border-b border-[#2a2a2a] text-[9px] font-black uppercase tracking-widest text-[#444]">
                  <span>#</span><span>Player</span><span>Pos</span><span>Stats</span>
                </div>
                <div className="divide-y divide-[#2a2a2a]">
                  {filteredRoster.map((p, i) => {
                    const statLine = playerStat(league, p);
                    const name = `${p.FirstName || ''} ${p.LastName || ''}`.trim();
                    return (
                      <div key={p.PlayerID || i}
                        className="grid grid-cols-[2rem_1fr_3rem_1fr] gap-4 px-5 py-3 items-center hover:bg-white/5 transition-colors">
                        <span className="text-[#444] text-xs font-black">{p.Jersey || '—'}</span>
                        <span className="text-[#f0ebe0] text-sm font-bold truncate">{name}</span>
                        <span className={`text-[10px] font-black ${POS_COLOR(p.Position)}`}>{p.Position || '—'}</span>
                        <span className="text-[#555] text-xs">{statLine || (p.Experience != null ? `${p.Experience}Y exp` : '—')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Mini roster preview shown on overview tab (fetches separately to avoid blocking)
const RosterPreview = ({ league, teamId }) => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTeamRoster(league, teamId)
      .then(data => setPlayers(data.slice(0, 6)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [league, teamId]);

  if (loading) return (
    <div className="flex items-center justify-center py-6">
      <div className="w-5 h-5 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!players.length) return <div className="text-[#555] text-xs text-center py-4">No player data available</div>;

  return (
    <div className="divide-y divide-[#2a2a2a]">
      {players.map((p, i) => {
        const statLine = playerStat(league, p);
        const name = `${p.FirstName || ''} ${p.LastName || ''}`.trim();
        return (
          <div key={p.PlayerID || i} className="flex items-center gap-3 py-2.5">
            <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center text-[10px] font-black text-[#555] shrink-0">
              {p.Jersey || i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#f0ebe0] text-sm font-bold truncate">{name}</div>
              {statLine && <div className="text-[#555] text-[10px]">{statLine}</div>}
            </div>
            <span className={`text-[10px] font-black ${POS_COLOR(p.Position)}`}>{p.Position || '—'}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    if (!email || !password) { setError('Please fill in all fields.'); return; }
    // Placeholder — no backend yet
    setError('Sign-in backend coming soon. Stay tuned!');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-[#E21111] font-black text-3xl tracking-tight">BOUNCE<span className="text-[#f0ebe0]">BACK</span></span>
            <span className="text-[#555] text-xs font-black uppercase tracking-widest block mt-0.5">Talk</span>
          </Link>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <h1 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0] mb-1">Sign In</h1>
          <p className="text-[#555] text-xs mb-6">Access your picks, followed teams, and alerts.</p>

          {error && (
            <div className="bg-[#E21111]/10 border border-[#E21111]/20 rounded-xl px-4 py-3 text-[#E21111] text-xs font-bold mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>
            <button type="submit"
              className="w-full bg-[#E21111] hover:bg-red-700 text-white font-black uppercase text-xs py-3.5 rounded-xl tracking-widest transition-colors mt-2">
              Sign In
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-[#555] text-xs">Don't have an account? </span>
            <Link to="/register" className="text-[#E21111] text-xs font-black hover:underline">Join BBT</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── REGISTER PAGE ────────────────────────────────────────────────────────────
const RegisterPage = () => {
  const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '' });
  const [leagues, setLeagues] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const update = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const toggleLeague = key => setLeagues(l => l.includes(key) ? l.filter(x => x !== key) : [...l, key]);

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('Please fill in all required fields.'); return; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
    setSubmitted(true);
  };

  if (submitted) return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏆</div>
        <h2 className="text-2xl font-black uppercase text-[#f0ebe0] mb-2">You're In, {form.name.split(' ')[0]}!</h2>
        <p className="text-[#555] text-sm mb-6">Account creation backend is coming soon — we'll notify you at <span className="text-[#f0ebe0]">{form.email}</span> when it launches.</p>
        <Link to="/" className="bg-[#E21111] text-white font-black uppercase text-xs px-6 py-3 rounded-xl tracking-widest hover:bg-red-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <span className="text-[#E21111] font-black text-3xl tracking-tight">BOUNCE<span className="text-[#f0ebe0]">BACK</span></span>
            <span className="text-[#555] text-xs font-black uppercase tracking-widest block mt-0.5">Talk</span>
          </Link>
        </div>

        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <h1 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0] mb-1">Join BounceBackTalk</h1>
          <p className="text-[#555] text-xs mb-6">Follow teams, track picks, get alerts.</p>

          {error && (
            <div className="bg-[#E21111]/10 border border-[#E21111]/20 rounded-xl px-4 py-3 text-[#E21111] text-xs font-bold mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Full Name *</label>
              <input value={form.name} onChange={update('name')} placeholder="LeBron James"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Email *</label>
              <input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Password *</label>
              <input type="password" value={form.password} onChange={update('password')} placeholder="••••••••"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Confirm Password *</label>
              <input type="password" value={form.confirm} onChange={update('confirm')} placeholder="••••••••"
                className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder:text-[#333] focus:outline-none focus:border-[#E21111] transition-colors" />
            </div>

            {/* Favorite leagues */}
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-2">Follow Leagues</label>
              <div className="flex gap-2 flex-wrap">
                {[{key:'nba',emoji:'🏀'},{key:'nfl',emoji:'🏈'},{key:'mlb',emoji:'⚾'},{key:'nhl',emoji:'🏒'}].map(l => (
                  <button type="button" key={l.key} onClick={() => toggleLeague(l.key)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all
                      ${leagues.includes(l.key)
                        ? 'bg-[#E21111] border-[#E21111] text-white'
                        : 'bg-[#0f0f0f] border-[#2a2a2a] text-[#555] hover:text-[#888]'}`}>
                    {l.emoji} {l.key.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <button type="submit"
              className="w-full bg-[#E21111] hover:bg-red-700 text-white font-black uppercase text-xs py-3.5 rounded-xl tracking-widest transition-colors mt-2">
              Create Account
            </button>
          </form>

          <div className="mt-5 text-center">
            <span className="text-[#555] text-xs">Already have an account? </span>
            <Link to="/login" className="text-[#E21111] text-xs font-black hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PLAYER PROFILE PAGE ──────────────────────────────────────────────────────
const fetchPlayerById = async (playerId) => {
  // Try each league until we find the player
  for (const league of ['nba', 'nfl', 'mlb']) {
    try {
      const res = await fetch(`${SPORTS_BASE}/${league}/scores/json/Player/${playerId}?key=${SPORTS_KEY}`);
      if (!res.ok) continue;
      const p = await res.json();
      if (p && p.PlayerID) return { player: p, league };
    } catch { continue; }
  }
  return null;
};

const PlayerPage = () => {
  const { id } = useParams();
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchPlayerById(id)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="w-8 h-8 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
      <div className="text-[#555] text-xs font-black uppercase tracking-widest">Loading player...</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-[60vh] flex items-center justify-center text-center px-4">
      <div>
        <div className="text-5xl mb-4">👤</div>
        <h2 className="text-2xl font-black uppercase text-[#f0ebe0] mb-2">Player Not Found</h2>
        <Link to="/" className="text-[#E21111] font-bold text-sm hover:underline">← Back to Home</Link>
      </div>
    </div>
  );

  const { player: p, league } = data;
  const name = `${p.FirstName || ''} ${p.LastName || ''}`.trim();
  const teamLogo = p.Team ? espnLogo(league, p.Team) : null;
  const leagueObj = LEAGUES.find(l => l.key === league);

  // Build stat rows based on sport
  const statRows = (() => {
    if (league === 'nba') return [
      ['Points Per Game',   p.PointsPerGame?.toFixed(1)],
      ['Rebounds Per Game', p.ReboundsPerGame?.toFixed(1)],
      ['Assists Per Game',  p.AssistsPerGame?.toFixed(1)],
      ['FG%',               p.FieldGoalsPercentage != null ? (p.FieldGoalsPercentage * 100).toFixed(1) + '%' : null],
      ['3P%',               p.ThreePointersPercentage != null ? (p.ThreePointersPercentage * 100).toFixed(1) + '%' : null],
      ['Minutes',           p.MinutesPerGame?.toFixed(1)],
    ].filter(([, v]) => v != null);

    if (league === 'nfl') return [
      ['Passing Yards',   p.PassingYards],
      ['Rushing Yards',   p.RushingYards],
      ['Receiving Yards', p.ReceivingYards],
      ['Touchdowns',      (p.PassingTouchdowns ?? 0) + (p.RushingTouchdowns ?? 0) + (p.ReceivingTouchdowns ?? 0) || null],
      ['Interceptions',   p.Interceptions],
      ['Sacks',           p.Sacks],
    ].filter(([, v]) => v != null && v !== 0);

    if (league === 'mlb') {
      const isPitcher = ['SP','RP','P'].includes(p.Position);
      if (isPitcher) return [
        ['ERA',    p.EarnedRunAverage?.toFixed(2)],
        ['WHIP',   p.WalksPlusHitsPerInningsPitched?.toFixed(2)],
        ['Wins',   p.Wins],
        ['Losses', p.Losses],
        ['Strikeouts', p.PitchingStrikeouts],
        ['Innings', p.InningsPitchedDecimal?.toFixed(1)],
      ].filter(([, v]) => v != null);
      return [
        ['Batting Avg', p.BattingAverage != null ? `.${String(Math.round(p.BattingAverage * 1000)).padStart(3,'0')}` : null],
        ['Home Runs',   p.HomeRuns],
        ['RBI',         p.RunsBattedIn],
        ['OBP',         p.OnBasePercentage?.toFixed(3)],
        ['Runs',        p.Runs],
        ['Stolen Bases',p.StolenBases],
      ].filter(([, v]) => v != null);
    }
    return [];
  })();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#555] text-xs mb-6">
        <Link to="/" className="hover:text-[#f0ebe0]">Home</Link>
        <span>/</span>
        {p.Team && <><Link to={`/team/${league}/${p.Team?.toLowerCase()}`} className="hover:text-[#f0ebe0]">{p.Team}</Link><span>/</span></>}
        <span className="text-[#888]">{name}</span>
      </div>

      {/* Player hero */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 md:p-8 mb-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Jersey number */}
          <div className="w-20 h-20 rounded-2xl bg-[#E21111]/10 border border-[#E21111]/20 flex items-center justify-center shrink-0">
            <span className="text-[#E21111] font-black text-3xl">{p.Jersey || '#'}</span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="text-[#555] text-[10px] font-black uppercase tracking-widest mb-1">
              {leagueObj?.label}{p.Position ? ` · ${p.Position}` : ''}
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-[#f0ebe0] mb-2">{name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              {teamLogo && (
                <div className="flex items-center gap-2 bg-[#2a2a2a]/60 rounded-xl px-3 py-1.5">
                  <img src={teamLogo} alt={p.Team} className="w-5 h-5 object-contain"
                    onError={e => { e.target.style.display='none'; }} />
                  <Link to={`/team/${league}/${p.Team?.toLowerCase()}`}
                    className="text-[#f0ebe0] text-xs font-black hover:text-[#E21111] transition-colors">{p.Team}</Link>
                </div>
              )}
              {p.Experience != null && (
                <span className="text-[#555] text-xs">{p.Experience === 0 ? 'Rookie' : `${p.Experience}Y Pro`}</span>
              )}
              {p.BirthCity && (
                <span className="text-[#555] text-xs">📍 {p.BirthCity}{p.BirthState ? `, ${p.BirthState}` : ''}</span>
              )}
              {p.College && (
                <span className="text-[#555] text-xs">🎓 {p.College}</span>
              )}
            </div>
          </div>

          <div className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase border
            ${p.Status === 'Active' ? 'text-green-400 bg-green-400/10 border-green-400/20'
            : p.Status === 'Injured' ? 'text-[#E21111] bg-[#E21111]/10 border-[#E21111]/20'
            : 'text-[#888] bg-[#2a2a2a] border-[#333]'}`}>
            {p.Status || 'Unknown'}
          </div>
        </div>
      </div>

      {/* Stats */}
      {statRows.length > 0 && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-[#E21111] rounded-full" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Season Stats</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {statRows.map(([label, val]) => (
              <div key={label} className="bg-[#2a2a2a]/50 rounded-xl p-3 text-center">
                <div className="text-[#f0ebe0] font-black text-xl">{val}</div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Physical info */}
      {(p.Height || p.Weight || p.BirthDate) && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-[#E21111] rounded-full" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Info</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {p.Height && (
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black">{p.Height}</div>
                <div className="text-[#555] text-[9px] uppercase tracking-widest">Height</div>
              </div>
            )}
            {p.Weight && (
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black">{p.Weight} lbs</div>
                <div className="text-[#555] text-[9px] uppercase tracking-widest">Weight</div>
              </div>
            )}
            {p.BirthDate && (
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black">{new Date(p.BirthDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div className="text-[#555] text-[9px] uppercase tracking-widest">Born</div>
              </div>
            )}
            {p.DraftYear && (
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black">{p.DraftYear} Rd {p.DraftRound}</div>
                <div className="text-[#555] text-[9px] uppercase tracking-widest">Draft</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
            <Route path="/scores" element={<ScoresPage />} />
            <Route path="/best-bets" element={<BestBetsPage />} />
            <Route path="/league/:slug" element={<LeaguePage />} />
            <Route path="/game/:league/:id" element={<GamePreviewPage />} />
            <Route path="/team/:league/:id" element={<TeamPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Routes>
        </main>
        <Footer />
        <BottomNav />
      </div>
    </Router>
  );
}
