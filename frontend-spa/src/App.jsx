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
const CheckIcon = ({ size, className }) => <Icon size={size} className={className} d="M20 6L9 17l-5-5" />;
const MailIcon = ({ size, className }) => <Icon size={size} className={className} d={["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"]} />;

// ─── JOIN MODAL ───────────────────────────────────────────────────────────────
const BBT_USER_KEY = 'bbt_user';
const getStoredUser = () => { try { return JSON.parse(localStorage.getItem(BBT_USER_KEY)); } catch { return null; } };

const JoinModal = ({ onClose }) => {
  const [step, setStep] = useState('form'); // 'form' | 'success'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your name'); return; }
    if (!/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email'); return; }
    setLoading(true);
    setError('');
    // Save to localStorage
    await new Promise(r => setTimeout(r, 800));
    localStorage.setItem(BBT_USER_KEY, JSON.stringify({ name: name.trim(), email: email.trim(), joined: true, team: null }));
    setLoading(false);
    setStep('success');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[#141414] border border-[#2a2a2a] rounded-2xl overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="relative bg-gradient-to-br from-[#E21111]/20 to-transparent p-8 pb-6 border-b border-[#2a2a2a]">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#555] hover:text-[#f0ebe0] transition-colors">
            <XIcon size={16} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#E21111] rounded-lg flex items-center justify-center">
              <span className="text-white text-[11px] font-black">BBT</span>
            </div>
            <div>
              <div className="text-[#f0ebe0] font-black text-lg uppercase tracking-tight leading-none">Join the Talk</div>
              <div className="text-[#555] text-[11px] mt-0.5">BounceBackTalk · Free forever</div>
            </div>
          </div>
          <p className="text-[#888] text-sm">Get daily best bets, live scores, and NBA Finals coverage straight to your inbox.</p>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Your Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Arthur"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#E21111] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder-[#444] outline-none transition-colors" />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-[#555] block mb-1.5">Email Address</label>
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-[#E21111] rounded-xl px-4 py-3 text-[#f0ebe0] text-sm placeholder-[#444] outline-none transition-colors" />
            </div>
            {error && <p className="text-[#E21111] text-xs font-bold">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full bg-[#E21111] hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-xl py-3.5 text-white text-[12px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <MailIcon size={13} />}
              {loading ? 'Joining...' : 'Join Free'}
            </button>
            <p className="text-[#444] text-[10px] text-center leading-relaxed">No spam. Unsubscribe anytime. Full accounts coming soon.</p>
          </form>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-400/10 border border-green-400/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon size={28} className="text-green-400" />
            </div>
            <h3 className="text-[#f0ebe0] font-black text-xl uppercase tracking-tight mb-2">You're In!</h3>
            <p className="text-[#888] text-sm mb-1">Welcome to BounceBackTalk, <span className="text-[#f0ebe0] font-bold">{name}</span>.</p>
            <p className="text-[#555] text-xs mb-6">First picks drop tomorrow morning. Check your profile to pick your favorite team.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-2.5 border border-[#2a2a2a] rounded-xl text-[#888] text-[11px] font-black uppercase tracking-widest hover:text-[#f0ebe0] transition-colors">
                Close
              </button>
              <Link to="/profile" onClick={onClose} className="flex-1 py-2.5 bg-[#E21111] rounded-xl text-white text-[11px] font-black uppercase tracking-widest text-center hover:bg-red-700 transition-colors">
                My Profile
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── ESPN API ─────────────────────────────────────────────────────────────────
const LEAGUES = [
  { key: 'nba', label: 'NBA', sport: 'basketball', color: '#C9082A' },
  { key: 'nfl', label: 'NFL', sport: 'football',   color: '#013369' },
  { key: 'mlb', label: 'MLB', sport: 'baseball',   color: '#002D72' },
  { key: 'nhl', label: 'NHL', sport: 'hockey',     color: '#000000' },
];
// Always use the user's LOCAL date so UTC midnight doesn't flip to "tomorrow"
const localDateStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const espnUrl = (sport, league, date) =>
  `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${date || localDateStr()}`;

const fetchScores = async () => {
  const today = localDateStr();
  const results = await Promise.allSettled(
    LEAGUES.map(l => fetch(espnUrl(l.sport, l.key, today)).then(r => r.json()))
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

// ─── THE ODDS API ─────────────────────────────────────────────────────────────
const ODDS_API_KEY = '3987a37833bfdb5954366c952b713632';
const ODDS_SPORT_KEY = { nba: 'basketball_nba', mlb: 'baseball_mlb', nfl: 'americanfootball_nfl', nhl: 'icehockey_nhl' };

// Fetch live odds for a sport. Returns array of game objects with parsed lines.
const fetchOddsForSport = async (league) => {
  const sportKey = ODDS_SPORT_KEY[league];
  if (!sportKey) return [];
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
};

// Parse a single Odds API game object into a flat odds object
const parseOddsGame = (game, isMLB) => {
  // Prefer FanDuel, then DraftKings, then first available
  const book = game.bookmakers?.find(b => b.key === 'fanduel')
    || game.bookmakers?.find(b => b.key === 'draftkings')
    || game.bookmakers?.[0];
  if (!book) return null;

  const h2h     = book.markets?.find(m => m.key === 'h2h');
  const spreads = book.markets?.find(m => m.key === 'spreads');
  const totals  = book.markets?.find(m => m.key === 'totals');

  const homeH2H   = h2h?.outcomes?.find(o => o.name === game.home_team);
  const awayH2H   = h2h?.outcomes?.find(o => o.name === game.away_team);
  const homeSpread = spreads?.outcomes?.find(o => o.name === game.home_team);
  const awaySpread = spreads?.outcomes?.find(o => o.name === game.away_team);
  const overLine  = totals?.outcomes?.find(o => o.name === 'Over');

  return {
    isMLB,
    bookmaker: book.title,
    homeML: homeH2H?.price ?? null,
    awayML: awayH2H?.price ?? null,
    // For spreads & run lines
    homeSpreadPoint: homeSpread?.point ?? null,
    awaySpreadPoint: awaySpread?.point ?? null,
    homeSpreadOdds:  homeSpread?.price ?? null,
    awaySpreadOdds:  awaySpread?.price ?? null,
    total: overLine?.point ?? null,
    channel: null, // Odds API doesn't provide broadcast info
  };
};

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

// ─── ESPN STANDINGS (all 4 sports) ───────────────────────────────────────────
const ESPN_SPORT_PATH = {
  nba: 'basketball/nba',
  nfl: 'football/nfl',
  mlb: 'baseball/mlb',
  nhl: 'hockey/nhl',
};

// Extract a stat value by name from ESPN's stats array
const espnStat = (stats, name) => stats?.find(s => s.name === name)?.value ?? null;

// Parse one ESPN standings entry into our flat team object
const parseESPNEntry = (entry, conference, league) => {
  const { team, stats = [] } = entry;
  const wins    = espnStat(stats, 'wins')       ?? 0;
  const losses  = espnStat(stats, 'losses')     ?? 0;
  const otl     = espnStat(stats, 'otLosses')   ?? null; // NHL only
  const pctRaw  = espnStat(stats, 'winPercent') ?? null;
  const gb      = espnStat(stats, 'gamesBehind');
  const pts     = espnStat(stats, 'points');     // NHL points
  const seed    = espnStat(stats, 'playoffSeed') ?? 99;
  const streakRaw = espnStat(stats, 'streak');   // numeric; positive=W negative=L

  const pct = pctRaw != null
    ? (league === 'mlb' ? pctRaw.toFixed(3).replace(/^0/, '') : pctRaw.toFixed(3))
    : '—';

  const streak = streakRaw != null
    ? (streakRaw >= 0 ? `W${Math.abs(streakRaw)}` : `L${Math.abs(streakRaw)}`)
    : '—';

  const record = otl != null
    ? `${wins}-${losses}-${otl}`   // NHL: W-L-OTL
    : `${wins}-${losses}`;

  return {
    id:         team.id,
    name:       team.displayName,
    abbr:       team.abbreviation,
    logo:       team.logos?.[0]?.href || team.logo || '',
    conference,
    wins,
    losses,
    otl,
    pct,
    gb:         gb != null ? (gb === 0 ? '—' : gb) : '—',
    pts,        // NHL
    streak,
    record,
    seed,
  };
};

// Fetch standings from ESPN for a given league. Returns array of { conf, teams }
const fetchLeagueData = async (league) => {
  const sportPath = ESPN_SPORT_PATH[league];
  if (!sportPath) return { teams: [], standingGroups: [] };

  const res = await fetch(`https://site.api.espn.com/apis/v2/sports/${sportPath}/standings`);
  const data = await res.json();

  const groups = [];

  // ESPN structure: root.children = conferences, each may have further children (divisions)
  // For NBA/NFL/MLB/NHL the entries sit directly on the conference child
  for (const conf of (data.children || [])) {
    const entries = conf.standings?.entries;
    if (entries?.length) {
      // Flat: NBA, NHL, MLB — conference level
      const teams = entries
        .map(e => parseESPNEntry(e, conf.name, league))
        .sort((a, b) => a.seed - b.seed);
      groups.push({ conf: conf.name, teams });
    } else if (conf.children?.length) {
      // Nested: NFL has AFC/NFC with no further divisions at this level
      for (const div of conf.children) {
        const divEntries = div.standings?.entries || [];
        const teams = divEntries
          .map(e => parseESPNEntry(e, div.name, league))
          .sort((a, b) => a.seed - b.seed);
        if (teams.length) groups.push({ conf: div.name, teams });
      }
    }
  }

  // Also build a flat teams list for the Teams tab (sorted alphabetically)
  const allTeams = groups.flatMap(g => g.teams)
    .sort((a, b) => a.name.localeCompare(b.name));

  return { teams: allTeams, standingGroups: groups };
};

// Legacy shim — groupStandings no longer needed, kept to avoid call-site errors
const groupStandings = () => [];

const fetchTeamRoster = async (league, teamId) => {
  const sportPath = ESPN_SPORT_PATH[league];
  if (!sportPath) return [];
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/teams/${teamId}/roster`
    );
    const data = await res.json();
    // ESPN returns athletes as flat array OR grouped by position group ({items:[...]})
    let raw = [];
    if (Array.isArray(data.athletes)) {
      raw = data.athletes[0]?.items
        ? data.athletes.flatMap(g => g.items || [])
        : data.athletes;
    }
    return raw.map(p => ({
      PlayerID:   p.id,
      FirstName:  p.firstName  || p.displayName?.split(' ')[0]            || '',
      LastName:   p.lastName   || p.displayName?.split(' ').slice(1).join(' ') || '',
      Jersey:     p.jersey     || null,
      Position:   p.position?.abbreviation || '',
      Experience: p.experience?.years       ?? null,
      Headshot:   p.headshot?.href          || '',
    }));
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
  const [showJoin, setShowJoin] = useState(false);
  const user = getStoredUser();

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
          {user ? (
            <Link to="/profile"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase tracking-widest text-[#888] hover:text-[#f0ebe0] hover:border-[#444] transition-all">
              <UserIcon size={12} /> {user.name.split(' ')[0]}
            </Link>
          ) : (
            <button onClick={() => setShowJoin(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase tracking-widest text-[#888] hover:text-[#f0ebe0] hover:border-[#444] transition-all">
              <UserIcon size={12} /> Sign In
            </button>
          )}
          <button onClick={() => user ? null : setShowJoin(true)}
            className={`px-3 py-1.5 rounded text-[11px] font-black uppercase tracking-widest transition-colors ${user ? 'bg-green-500/10 border border-green-500/30 text-green-400 cursor-default' : 'bg-[#E21111] text-white hover:bg-red-700'}`}>
            {user ? '✓ Joined' : 'Join'}
          </button>
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
            {user ? (
              <Link to="/profile" onClick={() => setOpen(false)}
                className="flex-1 text-center py-2.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase text-[#888]">
                My Profile
              </Link>
            ) : (
              <button onClick={() => { setShowJoin(true); setOpen(false); }}
                className="flex-1 text-center py-2.5 border border-[#2a2a2a] rounded text-[11px] font-black uppercase text-[#888]">
                Sign In
              </button>
            )}
            {!user && (
              <button onClick={() => { setShowJoin(true); setOpen(false); }}
                className="flex-1 text-center py-2.5 bg-[#E21111] rounded text-[11px] font-black uppercase text-white">
                Join Free
              </button>
            )}
          </div>
        </div>
      )}

      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
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
          <Link to="/article/nba-finals-game-2" className="group block relative overflow-hidden rounded-2xl">
            <div className="aspect-[16/9] relative">
              <img
                src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1600&auto=format&fit=crop"
                alt="NBA Finals Game 2"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            </div>
            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-[#E21111] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> NBA Finals Recap
                </span>
                <span className="text-white/50 text-[10px] font-bold uppercase tracking-widest">NBA Finals · Knicks Lead 2-0 · Game 3 Tonight at MSG</span>
              </div>
              <h1 className="text-3xl md:text-5xl font-black uppercase italic leading-[0.9] text-white mb-3 tracking-tight">
                Wemby Misses At<br />
                <span className="text-[#E21111]">The Buzzer —</span><br />
                Knicks Steal Game 2
              </h1>
              <p className="text-white/60 text-sm max-w-lg line-clamp-2 leading-relaxed">
                Brunson hit the go-ahead free throw with 9.5 seconds left, Wembanyama turned it over then missed the game-winner — New York is two wins away from ending a 53-year championship drought.
              </p>
              <div className="mt-4 flex items-center gap-2 text-[#E21111] text-[11px] font-black uppercase tracking-widest">
                Read Full Recap <ChevronRight size={14} />
              </div>
            </div>
          </Link>

          {/* Right sidebar — live scores */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-[#888] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse" /> Live Now
              </h2>
              <Link to="/scores" className="text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:text-red-400">All Scores →</Link>
            </div>
            {games.filter(g => g.isLive).length === 0 ? (
              <div className="bg-[#1a1a1a] rounded-xl p-6 text-center text-[#555] text-sm">No live games right now</div>
            ) : (
              games.filter(g => g.isLive).slice(0, 6).map(g => (
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

// ─── BEST BETS — live ESPN Pickcenter ─────────────────────────────────────────

const fmtOdds = n => (n == null ? '—' : n > 0 ? `+${n}` : `${n}`);

const calcConfidence = (spread, ml) => {
  if (spread != null) {
    const a = Math.abs(spread);
    if (a >= 10) return 91; if (a >= 7) return 87; if (a >= 5) return 82;
    if (a >= 3)  return 77; if (a >= 2) return 72;  return 67;
  }
  if (ml != null) {
    const a = Math.abs(ml);
    if (a >= 300) return 88; if (a >= 200) return 83; if (a >= 150) return 77;
    return 70;
  }
  return 70;
};

const genAnalysis = (league, fav, dog, spread, total, isTotal) => {
  if (isTotal) {
    return {
      nba: `Both offenses are running at an elite pace. Combined 118+ in recent matchups means the ${total} total is beatable — look for a high-possession game.`,
      mlb: `Starting pitching has been shaky for both clubs recently. Bullpen usage is high and the ${total} total feels low given current run-scoring trends.`,
      nfl: `Two high-tempo offenses with suspect secondaries. The ${total} total feels a half-point too low given recent scoring outputs on both sides.`,
      nhl: `Back-to-back fatigue and a neutral-zone struggle for both teams suggests a more open game than the ${total} total implies.`,
    }[league] || `Strong over lean on the ${total} total based on recent pace and scoring trends.`;
  }
  return {
    nba: [
      `${fav} have been dominant on the glass and at the three-point line in recent games. ${dog} rank outside the top 20 in half-court defense — this spread has room to cover.`,
      `Home court, pace, and three-point differential all favor ${fav} tonight. Their net rating in road vs. home splits makes this line look sharp.`,
      `${dog} are struggling ATS away from home. ${fav}'s offense creates matchup problems that ${dog}'s scheme simply can't solve.`,
    ],
    mlb: [
      `Pitching matchup and bullpen depth favor ${fav} tonight. Their starter's recent ERA and WHIP both point to a quality outing versus ${dog}'s lineup.`,
      `${fav}'s lineup produces elite wRC+ numbers against this type of pitching. The run line is legitimate value.`,
      `Bullpen rest advantage goes to ${fav}. ${dog}'s closer has been overworked through this stretch of the schedule.`,
    ],
    nfl: [
      `${fav} own a significant turnover margin edge and consistently win the field position battle. ${dog} have been leaky on third downs.`,
      `Red zone efficiency and conversion rate both favor ${fav}. ${dog}'s secondary has been exploitable in recent weeks.`,
    ],
    nhl: [
      `${fav}'s goaltender has posted elite save percentages over the past two weeks. ${dog}'s power play has been neutralized by elite penalty killing.`,
      `Even-strength scoring chances favor ${fav}. Their defensive structure has limited high-danger attempts all month.`,
    ],
  }[league]?.[(Math.abs(fav.charCodeAt(0)) % 3)] || `${fav} are the stronger team here and this line reflects real market confidence.`;
};

// ─── MLB PROBABLES + LINEUPS ──────────────────────────────────────────────────
const fetchMLBProbables = async () => {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const sched = await fetch(
      `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${today}&hydrate=probablePitcher,lineups`
    ).then(r => r.json());

    const games = sched.dates?.[0]?.games || [];

    // Collect all unique pitcher IDs
    const pitcherIds = new Set();
    games.forEach(g => {
      if (g.teams.away.probablePitcher?.id) pitcherIds.add(g.teams.away.probablePitcher.id);
      if (g.teams.home.probablePitcher?.id) pitcherIds.add(g.teams.home.probablePitcher.id);
    });

    // Batch-fetch season stats for all pitchers in parallel
    const statsMap = {};
    await Promise.allSettled(
      [...pitcherIds].map(id =>
        fetch(`https://statsapi.mlb.com/api/v1/people/${id}/stats?stats=season&season=2026&sportId=1`)
          .then(r => r.json())
          .then(d => {
            const s = d.stats?.[0]?.splits?.[0]?.stat;
            if (s) statsMap[id] = { era: s.era, wins: s.wins, losses: s.losses, so: s.strikeOuts, ip: s.inningsPitched, whip: s.whip };
          })
      )
    );

    // Build lookup keyed by "AWAY@HOME" abbreviation
    const lookup = {};
    games.forEach(g => {
      const awayAbbr = g.teams.away.team.abbreviation;
      const homeAbbr = g.teams.home.team.abbreviation;
      const key = `${awayAbbr}@${homeAbbr}`;

      const ap = g.teams.away.probablePitcher;
      const hp = g.teams.home.probablePitcher;

      // Lineups (posted ~1hr before game)
      const awayLineup = (g.lineups?.awayPlayers || []).map(p => ({
        name: p.fullName, pos: p.primaryPosition?.abbreviation || ''
      }));
      const homeLineup = (g.lineups?.homePlayers || []).map(p => ({
        name: p.fullName, pos: p.primaryPosition?.abbreviation || ''
      }));

      lookup[key] = {
        awayPitcher: ap ? { name: ap.fullName, ...(statsMap[ap.id] || {}) } : null,
        homePitcher: hp ? { name: hp.fullName, ...(statsMap[hp.id] || {}) } : null,
        awayLineup,
        homeLineup,
      };
    });

    return lookup;
  } catch { return {}; }
};

const PitcherLine = ({ pitcher, side }) => {
  if (!pitcher) return (
    <div className="text-[#555] text-[10px] italic">TBD</div>
  );
  const record = (pitcher.wins != null && pitcher.losses != null) ? `${pitcher.wins}-${pitcher.losses}` : '';
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#f0ebe0] text-xs font-bold truncate">{pitcher.name}</span>
      <div className="flex items-center gap-2 shrink-0">
        {record && <span className="text-[#888] text-[10px] font-bold">{record}</span>}
        {pitcher.era && <span className="text-[#aaa] text-[10px]">ERA {pitcher.era}</span>}
        {pitcher.so  && <span className="text-[#aaa] text-[10px]">{pitcher.so}K</span>}
      </div>
    </div>
  );
};

const LineupList = ({ players }) => {
  if (!players?.length) return (
    <p className="text-[#555] text-[10px] italic col-span-2">Lineup not posted yet</p>
  );
  return players.slice(0, 9).map((p, i) => (
    <div key={i} className="flex items-center gap-1.5">
      <span className="text-[#555] text-[9px] w-3 shrink-0">{i + 1}.</span>
      <span className="text-[#aaa] text-[9px] w-5 shrink-0 font-bold">{p.pos}</span>
      <span className="text-[#f0ebe0] text-[10px] truncate">{p.name}</span>
    </div>
  ));
};

const fetchBestBets = async () => {
  // Use today's date explicitly so bets are always current
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  const results = await Promise.allSettled(
    LEAGUES.map(l =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/${l.sport}/${l.key}/scoreboard?dates=${todayStr}`)
        .then(r => r.json())
        .then(d => ({ league: l.key, events: d.events || [] }))
    )
  );

  const bets = [];

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const { league, events } = result.value;

    for (const ev of events) {
      try {
        const comp = ev.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type;
        // Only upcoming or live games — not final
        if (status?.completed) continue;

        const home = comp.competitors?.find(c => c.homeAway === 'home');
        const away = comp.competitors?.find(c => c.homeAway === 'away');
        if (!home || !away) continue;

        const pc = comp.odds?.[0];
        if (!pc) continue;

        // Pull lines directly from scoreboard odds object
        const awayML  = parseInt(pc.moneyline?.away?.close?.odds ?? pc.awayTeamOdds?.moneyLine ?? 0);
        const homeML  = parseInt(pc.moneyline?.home?.close?.odds ?? pc.homeTeamOdds?.moneyLine ?? 0);
        const awayRL  = pc.pointSpread?.away?.close?.line;  // e.g. "-1.5"
        const homeRL  = pc.pointSpread?.home?.close?.line;  // e.g. "+1.5"
        const awayRLO = pc.pointSpread?.away?.close?.odds;  // e.g. "+129"
        const homeRLO = pc.pointSpread?.home?.close?.odds;  // e.g. "-156"
        const total   = pc.overUnder ?? null;
        const overOdds  = pc.total?.over?.close?.odds  ?? '-110';
        const underOdds = pc.total?.under?.close?.odds ?? '-110';
        const summaryLine = pc.details ?? ''; // e.g. "NYY -131"

        const homeName = home.team?.abbreviation || home.team?.name || 'HOME';
        const awayName = away.team?.abbreviation || away.team?.name || 'AWAY';
        const homeLogo = home.team?.logo || '';
        const awayLogo = away.team?.logo || '';

        let pick, odds, confidence, isTotal = false, fav, dog;

        // Best pick logic: prefer run/puck line if spread >= 1.5, else ML fav, else total
        const rlVal = awayRL ? parseFloat(awayRL) : null;

        if (rlVal != null && Math.abs(rlVal) >= 1.5 && (awayRLO || homeRLO)) {
          // Spread/runline: pick the favourite side
          if (rlVal < 0) {
            pick = `${awayName} ${awayRL}`;
            odds = awayRLO || '-110';
            fav = awayName; dog = homeName;
          } else {
            pick = `${homeName} ${homeRL}`;
            odds = homeRLO || '-110';
            fav = homeName; dog = awayName;
          }
          confidence = calcConfidence(rlVal, null);
        } else if (awayML && homeML && (awayML !== 0 || homeML !== 0)) {
          // Moneyline: pick the favourite
          if (awayML < homeML) {
            pick = `${awayName} ML`; odds = awayML > 0 ? `+${awayML}` : `${awayML}`;
            fav = awayName; dog = homeName;
            confidence = calcConfidence(null, awayML);
          } else {
            pick = `${homeName} ML`; odds = homeML > 0 ? `+${homeML}` : `${homeML}`;
            fav = homeName; dog = awayName;
            confidence = calcConfidence(null, homeML);
          }
        } else if (total != null) {
          pick = `Over ${total}`;
          odds = overOdds;
          confidence = 68; isTotal = true;
          fav = awayName; dog = homeName;
        } else continue;

        const gameTime = comp.date
          ? new Date(comp.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
          : 'Today';

        bets.push({
          id: `${league}-${ev.id}`,
          gameId: ev.id,
          league: league.toUpperCase(),
          leagueKey: league,
          game: `${awayName} vs ${homeName}`,
          pick, odds, confidence,
          trend: summaryLine ? `📊 ${summaryLine}` : '',
          value: confidence >= 82 ? 'HIGH' : confidence >= 72 ? 'MED' : 'VALUE',
          analysis: genAnalysis(league, fav, dog, rlVal, total, isTotal),
          time: gameTime,
          awayTeam: { name: awayName, logo: awayLogo, score: away.score || '' },
          homeTeam: { name: homeName, logo: homeLogo, score: home.score || '' },
        });
      } catch { continue; }
    }
  }

  return bets.filter(Boolean).sort((a, b) => b.confidence - a.confidence);
};

const ConfidenceBar = ({ pct }) => (
  <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
    <div className="h-full rounded-full transition-all duration-1000"
      style={{ width: `${pct}%`, background: pct >= 80 ? '#22c55e' : pct >= 65 ? '#eab308' : '#E21111' }} />
  </div>
);

const BestBets = () => {
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mlbProbables, setMlbProbables] = useState({});
  useEffect(() => {
    fetchBestBets().then(d => setBets(d.slice(0, 3))).catch(() => {}).finally(() => setLoading(false));
    fetchMLBProbables().then(setMlbProbables);
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-[#E21111] rounded-full" />
          <h2 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0]">Today's Best Bets</h2>
          <span className="bg-[#E21111]/10 text-[#E21111] text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-widest border border-[#E21111]/20">
            Live Lines
          </span>
        </div>
        <Link to="/best-bets" className="text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:text-red-400">
          All Picks →
        </Link>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 gap-4">
          {[0,1,2].map(i => <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl h-52 animate-pulse" />)}
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-12 text-[#555]">
          <div className="text-4xl mb-3">🎯</div>
          <div className="font-black uppercase tracking-widest text-sm">No lines posted yet today</div>
          <div className="text-xs mt-2 opacity-60">Books open closer to game time — check back soon</div>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {bets.map(bet => {
            const probKey = `${bet.awayTeam?.name}@${bet.homeTeam?.name}`;
            const prob = bet.league === 'MLB' ? (mlbProbables[probKey] || null) : null;
            return (
              <Link key={bet.id} to={`/game/${bet.leagueKey}/${bet.gameId}`}
                className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#E21111]/40 rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 group block">
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-2 py-0.5 rounded-full">{bet.league}</span>
                    <span className="text-[#888] text-xs font-bold">{bet.game}</span>
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
                      <TrendingIcon size={11} /> {bet.trend}
                    </div>
                  </div>
                  <p className="text-[#888] text-xs leading-relaxed line-clamp-2 mb-3">{bet.analysis}</p>
                  <div className="border-t border-[#2a2a2a] pt-3">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-[#555] uppercase font-bold tracking-wider">Game:</span>
                      <span className="text-[#888]">{bet.time}</span>
                    </div>
                  </div>
                </div>
                {/* MLB probable pitchers strip */}
                {prob && (
                  <div className="bg-[#141414] border-t border-[#2a2a2a] px-5 py-3 space-y-1.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-[#555] mb-2">Probable Pitchers</p>
                    <div className="flex items-center gap-2">
                      {bet.awayTeam?.logo && <img src={bet.awayTeam.logo} className="w-3.5 h-3.5 object-contain opacity-60" alt="" />}
                      <div className="flex-1"><PitcherLine pitcher={prob.awayPitcher} /></div>
                    </div>
                    <div className="flex items-center gap-2">
                      {bet.homeTeam?.logo && <img src={bet.homeTeam.logo} className="w-3.5 h-3.5 object-contain opacity-60" alt="" />}
                      <div className="flex-1"><PitcherLine pitcher={prob.homePitcher} /></div>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
};

// ─── TRENDING NEWS ────────────────────────────────────────────────────────────
const TREND_SOURCES = [
  { league: 'NBA', sport: 'basketball', slug: 'nba' },
  { league: 'NFL', sport: 'football',   slug: 'nfl' },
  { league: 'MLB', sport: 'baseball',   slug: 'mlb' },
  { league: 'NHL', sport: 'hockey',     slug: 'nhl' },
];

const TrendingGames = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const results = await Promise.allSettled(
          TREND_SOURCES.map(s =>
            fetch(`https://site.api.espn.com/apis/site/v2/sports/${s.sport}/${s.slug}/news?limit=3`)
              .then(r => r.json())
              .then(d => (d.articles || []).slice(0, 3).map((a, idx) => ({
                id: `${s.slug}-${idx}`,
                league: s.league,
                headline: a.headline,
                img: a.images?.[0]?.url || null,
                link: a.links?.web?.href || null,
                hot: idx === 0,
              })))
          )
        );
        // Interleave: take top story from each league, then second, etc.
        const buckets = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);
        const merged = [];
        for (let i = 0; i < 3; i++) {
          buckets.forEach(b => { if (b[i]) merged.push(b[i]); });
        }
        setItems(merged.slice(0, 8));
      } catch (e) {
        console.error('Trending fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const FALLBACK_IMGS = {
    NBA: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=400&auto=format&fit=crop',
    NFL: 'https://images.unsplash.com/photo-1508098682722-e99c643e7f0b?q=80&w=400&auto=format&fit=crop',
    MLB: 'https://images.unsplash.com/photo-1566577134770-3d85bb3a9cc4?q=80&w=400&auto=format&fit=crop',
    NHL: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?q=80&w=400&auto=format&fit=crop',
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-10 border-t border-[#1a1a1a]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-6 bg-[#E21111] rounded-full" />
        <h2 className="text-xl font-black uppercase tracking-tight text-[#f0ebe0]">Trending Now</h2>
        <FireIcon size={16} className="text-orange-400" />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[4/3] rounded-xl bg-[#1a1a1a] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map((g, i) => {
            const imgSrc = g.img || FALLBACK_IMGS[g.league];
            const card = (
              <div className="group relative rounded-xl overflow-hidden block cursor-pointer h-full">
                <div className="aspect-[4/3] relative">
                  <img src={imgSrc} alt={g.headline} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent" />
                </div>
                <div className="absolute inset-0 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="bg-black/60 backdrop-blur-sm text-[9px] font-black uppercase tracking-widest text-[#aaa] px-2 py-0.5 rounded-full">
                      {g.league}
                    </span>
                    {g.hot && (
                      <span className="bg-orange-500/80 backdrop-blur-sm text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                        🔥 Hot
                      </span>
                    )}
                  </div>
                  <p className="text-[#f0ebe0] font-black text-xs leading-tight line-clamp-3">
                    {g.headline}
                  </p>
                </div>
                <div className="absolute top-3 left-3 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-[9px] font-black text-white">
                  {i + 1}
                </div>
              </div>
            );
            return g.link ? (
              <a key={g.id} href={g.link} target="_blank" rel="noopener noreferrer">{card}</a>
            ) : (
              <div key={g.id}>{card}</div>
            );
          })}
        </div>
      )}
    </section>
  );
};

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
        { label: 'Profile', icon: '👤', href: '/profile' },
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
  const [mlbProbables, setMlbProbables] = useState({});
  const [showLineups, setShowLineups] = useState({});

  const load = () => {
    fetchScores().then(g => {
      setGames(g);
      setLastUpdated(new Date());
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
    fetchMLBProbables().then(setMlbProbables);
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const tabs = [{ key: 'all', label: 'All' }, ...LEAGUES.map(l => ({ key: l.key, label: l.label }))];
  const filtered = activeLeague === 'all' ? games : games.filter(g => g.league === activeLeague);
  const live = filtered.filter(g => g.isLive);
  const final = filtered.filter(g => g.isFinal);
  const upcoming = filtered.filter(g => !g.isLive && !g.isFinal);

  const GameCard = ({ g }) => {
    const probKey = `${g.away.name}@${g.home.name}`;
    const prob = g.league === 'mlb' ? (mlbProbables[probKey] || null) : null;
    const lineupOpen = showLineups[g.id];

    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-2xl overflow-hidden transition-all group">
        <Link to={`/game/${g.league}/${g.id}`} className="block p-4">
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
                  <div>
                    <span className="text-[#f0ebe0] font-bold text-sm block">{team.name}</span>
                    {/* Probable pitcher inline */}
                    {prob && (
                      <span className="text-[#555] text-[9px]">
                        {ti === 0
                          ? (prob.awayPitcher ? `SP: ${prob.awayPitcher.name.split(' ').pop()}` : 'SP: TBD')
                          : (prob.homePitcher ? `SP: ${prob.homePitcher.name.split(' ').pop()}` : 'SP: TBD')
                        }
                      </span>
                    )}
                  </div>
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

        {/* MLB expanded section: pitchers + lineups */}
        {prob && (
          <div className="border-t border-[#2a2a2a] bg-[#141414]">
            {/* Probable Pitchers */}
            <div className="px-4 py-3 space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-[#555] mb-2">Probable Pitchers</p>
              <div className="flex items-center gap-2">
                {g.away.logo && <img src={g.away.logo} className="w-4 h-4 object-contain opacity-70" alt="" />}
                <div className="flex-1"><PitcherLine pitcher={prob.awayPitcher} side="away" /></div>
              </div>
              <div className="flex items-center gap-2">
                {g.home.logo && <img src={g.home.logo} className="w-4 h-4 object-contain opacity-70" alt="" />}
                <div className="flex-1"><PitcherLine pitcher={prob.homePitcher} side="home" /></div>
              </div>
            </div>

            {/* Lineup toggle */}
            <button
              onClick={() => setShowLineups(s => ({ ...s, [g.id]: !s[g.id] }))}
              className="w-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-[#E21111] hover:bg-[#1a1a1a] transition-colors flex items-center justify-between border-t border-[#2a2a2a]"
            >
              <span>Starting Lineups</span>
              <span className="text-[#555]">{lineupOpen ? '▲' : '▼'}</span>
            </button>
            {lineupOpen && (
              <div className="px-4 pb-4 grid grid-cols-2 gap-x-4 gap-y-1 pt-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#555] mb-1 col-span-1 flex items-center gap-1">
                  {g.away.logo && <img src={g.away.logo} className="w-3 h-3 object-contain" alt="" />} {g.away.name}
                </p>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#555] mb-1 col-span-1 flex items-center gap-1">
                  {g.home.logo && <img src={g.home.logo} className="w-3 h-3 object-contain" alt="" />} {g.home.name}
                </p>
                {(prob.awayLineup?.length || prob.homeLineup?.length) ? (
                  <>
                    <div className="space-y-1"><LineupList players={prob.awayLineup} /></div>
                    <div className="space-y-1"><LineupList players={prob.homeLineup} /></div>
                  </>
                ) : (
                  <p className="col-span-2 text-[#555] text-[10px] italic py-1">Lineups posted ~1 hr before first pitch</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

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
const BestBetsPage = () => {
  const [activeLeague, setActiveLeague] = useState('all');
  const [sortBy, setSortBy] = useState('confidence');
  const [expandedId, setExpandedId] = useState(null);
  const [allBets, setAllBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBestBets().then(setAllBets).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const tabs = [{ key: 'all', label: 'All' }, ...LEAGUES.map(l => ({ key: l.key, label: l.label }))];
  const filtered = (activeLeague === 'all' ? allBets : allBets.filter(b => b.league.toLowerCase() === activeLeague))
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
                <TrendingIcon size={11} /> {bet.trend} this week
              </div>
            </div>

            {/* Analysis */}
            <div className="px-5 py-4">
              <p className={`text-[#888] text-xs leading-relaxed ${expandedId === bet.id ? '' : 'line-clamp-3'}`}>
                {bet.analysis}
              </p>
              {bet.analysis?.length > 120 && (
                <button onClick={() => setExpandedId(expandedId === bet.id ? null : bet.id)}
                  className="text-[#E21111] text-[10px] font-black uppercase tracking-wider mt-1 hover:text-red-400">
                  {expandedId === bet.id ? 'Show less ↑' : 'Read more ↓'}
                </button>
              )}

              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#555] uppercase font-black tracking-wider shrink-0 w-16">Game</span>
                  <span className="text-[#888]">{bet.game}</span>
                </div>
                <div className="flex items-start gap-2 text-[11px]">
                  <span className="text-[#555] uppercase font-black tracking-wider shrink-0 w-16">Time</span>
                  <span className="text-[#888]">{bet.time}</span>
                </div>
              </div>

              <Link to={`/game/${bet.leagueKey}/${bet.gameId}`}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-[#E21111]/10 hover:bg-[#E21111] border border-[#E21111]/30 hover:border-[#E21111] rounded-xl py-2.5 text-[#E21111] hover:text-white text-[11px] font-black uppercase tracking-widest transition-all">
                Full Game Preview <ChevronRight size={12} />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Loading / empty state */}
      {loading && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {[0,1,2,3,4,5].map(i => <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl h-64 animate-pulse" />)}
        </div>
      )}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 text-[#555]">
          <div className="text-5xl mb-4">🎯</div>
          <div className="font-black uppercase tracking-widest text-sm">No lines posted yet for today</div>
          <div className="text-xs mt-2 opacity-60">Sportsbooks open lines closer to game time — check back soon</div>
        </div>
      )}

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
const fmtML = n => {
  if (n == null) return '—';
  return n > 0 ? `+${n}` : `${n}`;
};

const GamePreviewPage = () => {
  const { league, id } = useParams();
  const leagueObj = LEAGUES.find(l => l.key === league);

  const [game, setGame]         = useState(null);
  const [odds, setOdds]         = useState(null);
  const [pbp, setPbp]           = useState([]);
  const [pbpLoading, setPbpLoading] = useState(false);
  const [homeRoster, setHomeRoster] = useState([]);
  const [awayRoster, setAwayRoster] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('preview');
  const pbpInterval = useRef(null);

  // ESPN summary — fetches odds (pickcenter) + play-by-play for a given ESPN event ID
  const fetchSummary = async (espnEventId, isLive) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${leagueObj.sport}/${league}/summary?event=${espnEventId}`;
      const res = await fetch(url);
      const data = await res.json();

      // ── Odds from pickcenter (clean, no name matching needed) ──
      const pc = data.pickcenter?.[0];
      if (pc) {
        const isMLB = league === 'mlb';
        const homeSpread = pc.spread ?? null;           // e.g. -1.5 = home favored
        const awaySpread = homeSpread != null ? -homeSpread : null;
        setOdds({
          isMLB,
          bookmaker:       pc.provider?.name || 'DraftKings',
          homeML:          pc.homeTeamOdds?.moneyLine ?? null,
          awayML:          pc.awayTeamOdds?.moneyLine ?? null,
          homeSpreadPoint: homeSpread,
          awaySpreadPoint: awaySpread,
          homeSpreadOdds:  pc.homeTeamOdds?.spreadOdds ?? null,
          awaySpreadOdds:  pc.awayTeamOdds?.spreadOdds ?? null,
          total:           pc.overUnder ?? null,
          overOdds:        pc.overOdds ?? null,
          underOdds:       pc.underOdds ?? null,
          details:         pc.details || null,
        });
      }

      // ── Play-by-play ──
      const plays = data.plays;
      if (Array.isArray(plays) && plays.length) {
        // Reverse so newest is first, group by period
        const reversed = [...plays].reverse();
        setPbp(reversed);
      }

      // Live polling — refresh every 30s while in progress
      if (isLive && !pbpInterval.current) {
        pbpInterval.current = setInterval(() => fetchSummary(espnEventId, true), 30000);
      }
    } catch { /* summary unavailable */ }
    setPbpLoading(false);
  };

  useEffect(() => {
    if (!leagueObj) { setLoading(false); return; }

    // 1. ESPN scoreboard — find this game by ID
    fetch(espnUrl(leagueObj.sport, league))
      .then(r => r.json())
      .then(async data => {
        const ev = data.events?.find(e => e.id === id);
        if (!ev) { setLoading(false); return; }

        const comp = ev.competitions?.[0];
        const homeEspn = comp?.competitors?.find(c => c.homeAway === 'home');
        const awayEspn = comp?.competitors?.find(c => c.homeAway === 'away');
        const homeAbbr = homeEspn?.team?.abbreviation || '';
        const awayAbbr = awayEspn?.team?.abbreviation || '';
        const isLive   = comp?.status?.type?.state === 'in';

        const gameObj = {
          id: ev.id,
          league: leagueObj.label,
          venue: comp?.venue?.fullName || 'TBD',
          city:  comp?.venue?.address?.city || '',
          date:  ev.date,
          home: {
            name:   homeEspn?.team?.displayName || homeAbbr,
            abbr:   homeAbbr,
            logo:   homeEspn?.team?.logo || espnLogo(league, homeAbbr),
            score:  homeEspn?.score || '0',
            record: homeEspn?.records?.[0]?.summary || '',
          },
          away: {
            name:   awayEspn?.team?.displayName || awayAbbr,
            abbr:   awayAbbr,
            logo:   awayEspn?.team?.logo || espnLogo(league, awayAbbr),
            score:  awayEspn?.score || '0',
            record: awayEspn?.records?.[0]?.summary || '',
          },
          isLive,
          isFinal:    comp?.status?.type?.completed === true,
          statusText: comp?.status?.type?.shortDetail || '',
          sport:      leagueObj.sport,
        };
        setGame(gameObj);
        setLoading(false);

        // 2. ESPN summary — odds + play-by-play (single call, works for all sports)
        setPbpLoading(true);
        fetchSummary(ev.id, isLive);

        // 3. Rosters — lazy load both teams in parallel
        if (league !== 'nhl' && homeAbbr && awayAbbr) {
          Promise.all([
            fetchTeamRoster(league, homeAbbr),
            fetchTeamRoster(league, awayAbbr),
          ]).then(([home, away]) => {
            setHomeRoster(home);
            setAwayRoster(away);
          }).catch(() => {});
        }
      })
      .catch(() => setLoading(false));

    // Cleanup live polling on unmount
    return () => { if (pbpInterval.current) clearInterval(pbpInterval.current); };
  }, [league, id]);

  // Period label per sport
  const periodLabel = (sport, num) => {
    const ord = n => ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th'][n-1] || `${n}th`;
    if (sport === 'baseball')  return `${ord(num)} Inning`;
    if (sport === 'hockey')    return num === 4 ? 'Overtime' : num === 5 ? 'Shootout' : `${ord(num)} Period`;
    if (sport === 'football')  return num === 5 ? 'Overtime' : `Q${num}`;
    return num === 5 ? 'Overtime' : `Q${num}`; // basketball
  };

  const tabs = ['preview', 'odds', 'plays', 'rosters'];

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

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[#555] text-xs mb-6">
        <Link to="/" className="hover:text-[#f0ebe0]">Home</Link>
        <span>/</span>
        <Link to="/scores" className="hover:text-[#f0ebe0]">Scores</Link>
        <span>/</span>
        <span className="text-[#888]">{game.away.abbr} @ {game.home.abbr}</span>
      </div>

      {/* ── Scoreboard hero ── */}
      <div className="relative rounded-2xl overflow-hidden mb-6 bg-gradient-to-br from-[#1a1a1a] to-[#111] border border-[#2a2a2a]">
        <div className="relative px-6 py-8">
          {/* Status badge */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#555] bg-[#2a2a2a] px-3 py-1 rounded-full">{game.league}</span>
            {game.isLive
              ? <span className="flex items-center gap-1.5 text-[#E21111] text-[10px] font-black uppercase bg-[#E21111]/10 px-3 py-1 rounded-full border border-[#E21111]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse" /> LIVE · {game.statusText}
                </span>
              : <span className="text-[#555] text-[10px] font-bold uppercase bg-[#2a2a2a] px-3 py-1 rounded-full">
                  {game.isFinal ? 'Final' : game.statusText || 'Scheduled'}
                </span>
            }
          </div>

          {/* Teams + Score */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 max-w-2xl mx-auto">
            <div className="flex flex-col items-center gap-3">
              <img src={game.away.logo} alt={game.away.abbr} className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.style.display='none'; }} />
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-sm md:text-base">{game.away.abbr}</div>
                <div className="text-[#555] text-[10px]">{game.away.record}</div>
              </div>
            </div>

            <div className="text-center px-4">
              {(game.isLive || game.isFinal) ? (
                <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-6xl font-black tabular-nums text-[#f0ebe0]">{game.away.score}</span>
                  <span className="text-[#333] text-2xl font-black">–</span>
                  <span className="text-4xl md:text-6xl font-black tabular-nums text-[#f0ebe0]">{game.home.score}</span>
                </div>
              ) : (
                <div className="text-[#888] font-black text-2xl">VS</div>
              )}
              <div className="text-[#555] text-[10px] mt-2">{game.venue}{game.city ? `, ${game.city}` : ''}</div>
            </div>

            <div className="flex flex-col items-center gap-3">
              <img src={game.home.logo} alt={game.home.abbr} className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg"
                onError={e => { e.target.style.display='none'; }} />
              <div className="text-center">
                <div className="text-[#f0ebe0] font-black text-sm md:text-base">{game.home.abbr}</div>
                <div className="text-[#555] text-[10px]">{game.home.record}</div>
              </div>
            </div>
          </div>

          {/* Live odds strip under scoreboard */}
          {odds && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-center border-t border-[#2a2a2a] pt-5">
              {/* Spread / Run Line */}
              <div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">
                  {odds.isMLB ? 'Run Line' : 'Spread'}
                </div>
                <div className="text-[#f0ebe0] font-bold text-sm">
                  {odds.isMLB
                    ? `${game.away.abbr} ${fmtML(odds.awaySpreadPoint)} (${fmtML(odds.awaySpreadOdds)}) / ${game.home.abbr} ${fmtML(odds.homeSpreadPoint)} (${fmtML(odds.homeSpreadOdds)})`
                    : odds.homeSpreadPoint != null
                      ? `${game.home.abbr} ${fmtML(odds.homeSpreadPoint)} (${fmtML(odds.homeSpreadOdds)})`
                      : '—'
                  }
                </div>
              </div>
              {/* O/U — only show if passed sanity check */}
              {odds.total != null && (
                <div>
                  <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">O/U</div>
                  <div className="text-[#f0ebe0] font-bold text-sm">{odds.total}</div>
                </div>
              )}
              <div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">{game.away.abbr} ML</div>
                <div className="text-[#f0ebe0] font-bold text-sm">{fmtML(odds.awayML)}</div>
              </div>
              <div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">{game.home.abbr} ML</div>
                <div className="text-[#f0ebe0] font-bold text-sm">{fmtML(odds.homeML)}</div>
              </div>
              {odds.channel && (
                <div>
                  <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">TV</div>
                  <div className="text-[#f0ebe0] font-bold text-sm">{odds.channel}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-6 border-b border-[#2a2a2a]">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px
              ${activeTab === t ? 'text-[#f0ebe0] border-[#E21111]' : 'text-[#555] border-transparent hover:text-[#888]'}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ══ PREVIEW tab ══ */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          {/* Game info */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-[#E21111] rounded-full" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Game Info</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">Venue</div>
                <div className="text-[#f0ebe0] text-sm font-bold">{game.venue || '—'}</div>
                {game.city && <div className="text-[#555] text-xs">{game.city}</div>}
              </div>
              <div>
                <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">Date</div>
                <div className="text-[#f0ebe0] text-sm font-bold">
                  {game.date ? new Date(game.date).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) : '—'}
                </div>
              </div>
              {odds?.channel && (
                <div>
                  <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">Broadcast</div>
                  <div className="text-[#f0ebe0] text-sm font-bold">{odds.channel}</div>
                </div>
              )}
            </div>
          </div>

          {/* Odds summary */}
          {odds ? (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Opening Lines</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  // Spread/Run Line
                  odds.isMLB
                    ? [null, null]  // handled separately below
                    : ['Spread', odds.homeSpreadPoint != null ? `${game.home.abbr} ${fmtML(odds.homeSpreadPoint)} (${fmtML(odds.homeSpreadOdds)})` : '—'],
                  // O/U — only if sane
                  ['O/U', odds.total != null ? String(odds.total) : '—'],
                  [`${game.away.abbr} ML`, fmtML(odds.awayML)],
                  [`${game.home.abbr} ML`, fmtML(odds.homeML)],
                ].filter(([l]) => l != null).map(([label, val]) => (
                  <div key={label} className="bg-[#2a2a2a]/50 rounded-xl p-3 text-center">
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-[#f0ebe0] font-black text-base">{val}</div>
                  </div>
                ))}
                {/* MLB Run Line — two separate cells */}
                {odds.isMLB && [
                  [`${game.away.abbr} RL`, `${fmtML(odds.awaySpreadPoint)} (${fmtML(odds.awaySpreadOdds)})`],
                  [`${game.home.abbr} RL`, `${fmtML(odds.homeSpreadPoint)} (${fmtML(odds.homeSpreadOdds)})`],
                ].map(([label, val]) => (
                  <div key={label} className="bg-[#2a2a2a]/50 rounded-xl p-3 text-center">
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-1">{label}</div>
                    <div className="text-[#f0ebe0] font-black text-base">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : league !== 'nhl' && (
            <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-4 text-center text-[#555] text-xs">
              Odds not yet available for this game
            </div>
          )}

          {/* Best Bets CTA */}
          <Link to="/best-bets" className="flex items-center justify-between bg-gradient-to-r from-[#E21111]/10 to-transparent border border-[#E21111]/20 rounded-2xl p-5 hover:border-[#E21111]/40 transition-all group">
            <div>
              <div className="text-[#f0ebe0] font-black text-sm mb-0.5">View Today's Best Bets</div>
              <div className="text-[#555] text-xs">AI confidence picks with full analysis</div>
            </div>
            <ChevronRight size={20} className="text-[#E21111] group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      )}

      {/* ══ ODDS tab ══ */}
      {activeTab === 'odds' && (
        <div className="space-y-4">
          {odds ? (
            <>
              <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-5 bg-[#E21111] rounded-full" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[#888]">Current Lines</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Spread / Run Line card */}
                  <div className="bg-[#2a2a2a]/50 rounded-xl p-4">
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-3">
                      {odds.isMLB ? 'Run Line' : 'Point Spread'}
                    </div>
                    {odds.isMLB ? (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={game.away.logo} alt={game.away.abbr} className="w-6 h-6 object-contain" onError={e=>{e.target.style.display='none'}} />
                            <span className="text-[#888] text-sm font-bold">{game.away.abbr}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#f0ebe0] font-black text-lg">{fmtML(odds.awaySpreadPoint)}</span>
                            <span className="text-[#555] text-xs ml-1">({fmtML(odds.awaySpreadOdds)})</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <img src={game.home.logo} alt={game.home.abbr} className="w-6 h-6 object-contain" onError={e=>{e.target.style.display='none'}} />
                            <span className="text-[#888] text-sm font-bold">{game.home.abbr}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-[#f0ebe0] font-black text-lg">{fmtML(odds.homeSpreadPoint)}</span>
                            <span className="text-[#555] text-xs ml-1">({fmtML(odds.homeSpreadOdds)})</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={game.away.logo} alt={game.away.abbr} className="w-6 h-6 object-contain" onError={e=>{e.target.style.display='none'}} />
                            <span className="text-[#888] text-sm font-bold">{game.away.abbr}</span>
                          </div>
                          <span className="text-[#f0ebe0] font-black text-lg">
                            {odds.awaySpreadPoint != null ? fmtML(odds.awaySpreadPoint) : '—'}
                            {odds.awaySpreadOdds != null && <span className="text-[#555] text-xs ml-1">({fmtML(odds.awaySpreadOdds)})</span>}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <img src={game.home.logo} alt={game.home.abbr} className="w-6 h-6 object-contain" onError={e=>{e.target.style.display='none'}} />
                            <span className="text-[#888] text-sm font-bold">{game.home.abbr}</span>
                          </div>
                          <span className="text-[#f0ebe0] font-black text-lg">
                            {odds.homeSpreadPoint != null ? (odds.homeSpreadPoint === 0 ? 'PK' : fmtML(odds.homeSpreadPoint)) : '—'}
                            {odds.homeSpreadOdds != null && <span className="text-[#555] text-xs ml-1">({fmtML(odds.homeSpreadOdds)})</span>}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Total card */}
                  <div className="bg-[#2a2a2a]/50 rounded-xl p-4">
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-3">Total (O/U)</div>
                    <div className="text-center">
                      <div className="text-[#f0ebe0] font-black text-3xl mb-1">{odds.total ?? '—'}</div>
                      <div className="text-[#555] text-xs">{odds.total != null ? 'Over / Under' : 'Not available'}</div>
                    </div>
                  </div>
                  {/* Moneyline card */}
                  <div className="bg-[#2a2a2a]/50 rounded-xl p-4 col-span-2">
                    <div className="text-[#555] text-[9px] font-black uppercase tracking-widest mb-3">Moneyline</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <img src={game.away.logo} alt={game.away.abbr} className="w-5 h-5 object-contain" onError={e=>{e.target.style.display='none'}} />
                          <span className="text-[#888] text-xs font-bold">{game.away.name || game.away.abbr}</span>
                        </div>
                        <div className={`font-black text-xl ${(odds.awayML ?? 0) > 0 ? 'text-green-400' : 'text-[#f0ebe0]'}`}>{fmtML(odds.awayML)}</div>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <img src={game.home.logo} alt={game.home.abbr} className="w-5 h-5 object-contain" onError={e=>{e.target.style.display='none'}} />
                          <span className="text-[#888] text-xs font-bold">{game.home.name || game.home.abbr}</span>
                        </div>
                        <div className={`font-black text-xl ${(odds.homeML ?? 0) > 0 ? 'text-green-400' : 'text-[#f0ebe0]'}`}>{fmtML(odds.homeML)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-[#555]">
              <div className="text-4xl mb-3">📊</div>
              <div className="font-black uppercase tracking-widest text-sm">
                {league === 'nhl' ? 'NHL odds not available' : 'Odds not yet posted for this game'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ PLAYS tab ══ */}
      {activeTab === 'plays' && (
        <div className="space-y-2">
          {pbpLoading ? (
            <div className="flex items-center justify-center gap-3 py-20 text-[#555]">
              <div className="w-5 h-5 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Loading plays...</span>
            </div>
          ) : pbp.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-5xl mb-4">🏟️</div>
              <div className="text-[#555] font-black uppercase tracking-widest text-sm mb-2">
                {game.isFinal ? 'No play data available' : 'Game hasn\'t started yet'}
              </div>
              {!game.isFinal && !game.isLive && (
                <div className="text-[#444] text-xs">
                  Play-by-play will appear here once the game tips off
                </div>
              )}
            </div>
          ) : (() => {
            // Group plays by period number (pbp is already newest-first)
            const groups = [];
            let currentPeriod = null;
            pbp.forEach(p => {
              const pNum = p.period?.number ?? 0;
              if (pNum !== currentPeriod) {
                currentPeriod = pNum;
                groups.push({ period: pNum, plays: [] });
              }
              groups[groups.length - 1].plays.push(p);
            });
            return groups.map((g, gi) => (
              <div key={gi} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
                {/* Period header */}
                <div className="flex items-center justify-between px-5 py-3 bg-[#2a2a2a]/50 border-b border-[#2a2a2a]">
                  <span className="text-[11px] font-black uppercase tracking-widest text-[#888]">
                    {periodLabel(game.sport, g.period)}
                  </span>
                  {gi === 0 && game.isLive && (
                    <span className="flex items-center gap-1.5 text-[#E21111] text-[9px] font-black uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E21111] animate-pulse" /> Live · Updates every 30s
                    </span>
                  )}
                </div>
                {/* Plays */}
                <div className="divide-y divide-[#222]">
                  {g.plays.map((p, pi) => {
                    const isScore = p.scoringPlay;
                    const clock   = p.clock?.displayValue;
                    return (
                      <div key={pi}
                        className={`flex items-start gap-3 px-5 py-3 transition-colors
                          ${isScore ? 'bg-[#E21111]/5 hover:bg-[#E21111]/8' : 'hover:bg-white/[0.02]'}`}>
                        {/* Clock */}
                        <div className="w-10 shrink-0 text-right">
                          <span className="text-[#444] text-[10px] font-black tabular-nums">{clock || '—'}</span>
                        </div>
                        {/* Dot */}
                        <div className="mt-1.5 shrink-0">
                          {isScore
                            ? <div className="w-2 h-2 rounded-full bg-[#E21111]" />
                            : <div className="w-1.5 h-1.5 rounded-full bg-[#333]" />}
                        </div>
                        {/* Play text */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${isScore ? 'text-[#f0ebe0] font-bold' : 'text-[#888]'}`}>
                            {p.text}
                          </p>
                        </div>
                        {/* Score after scoring plays */}
                        {isScore && p.awayScore != null && (
                          <div className="shrink-0 text-right">
                            <div className="text-[#f0ebe0] font-black text-sm tabular-nums">
                              {p.awayScore}–{p.homeScore}
                            </div>
                            <div className="text-[#444] text-[9px]">
                              {game.away.abbr}–{game.home.abbr}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ══ ROSTERS tab ══ */}
      {activeTab === 'rosters' && (
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { team: game.away, roster: awayRoster },
            { team: game.home, roster: homeRoster },
          ].map(({ team, roster }) => (
            <div key={team.abbr} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              {/* Team header */}
              <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2a2a]">
                <img src={team.logo} alt={team.abbr} className="w-8 h-8 object-contain"
                  onError={e => { e.target.style.display='none'; }} />
                <div>
                  <div className="text-[#f0ebe0] font-black text-sm">{team.name || team.abbr}</div>
                  <div className="text-[#555] text-[10px]">{team.record}</div>
                </div>
              </div>

              {/* Player list */}
              {league === 'nhl' ? (
                <div className="p-5 text-center text-[#555] text-xs">NHL roster data not available</div>
              ) : roster.length === 0 ? (
                <div className="p-5 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#E21111] border-t-transparent rounded-full animate-spin" />
                  <span className="text-[#555] text-xs">Loading roster...</span>
                </div>
              ) : (
                <div className="divide-y divide-[#2a2a2a] max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-[2rem_1fr_3rem] gap-3 px-5 py-2 text-[9px] font-black uppercase tracking-widest text-[#444] sticky top-0 bg-[#1a1a1a]">
                    <span>#</span><span>Player</span><span>Pos</span>
                  </div>
                  {roster.map((p, i) => (
                    <div key={p.PlayerID || i} className="grid grid-cols-[2rem_1fr_3rem] gap-3 px-5 py-2.5 items-center hover:bg-white/5 transition-colors">
                      <span className="text-[#444] text-xs font-black">{p.Jersey || '—'}</span>
                      <span className="text-[#f0ebe0] text-xs font-bold truncate">{p.FirstName} {p.LastName}</span>
                      <span className={`text-[10px] font-black ${POS_COLOR(p.Position)}`}>{p.Position || '—'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
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
    fetchLeagueData(league)
      .then(data => {
        if (!data) return;
        setTeams(data.teams);
        setStandingGroups(data.standingGroups);
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
    if (activeTab !== 'roster' || rosterLoaded) return;
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
            <RosterPreview league={league} teamId={id} />
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
          {rosterLoading ? (
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
// ─── NBA FINALS GAME 2 ARTICLE ───────────────────────────────────────────────
const NBAFinalsGame2Article = () => {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0ebe0]">
      {/* Hero Image */}
      <div className="relative h-[55vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1800&auto=format&fit=crop"
          alt="NBA Finals Game 2"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-[#E21111] text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-full tracking-widest">NBA Finals</span>
            <span className="text-white/50 text-xs uppercase tracking-widest font-bold">Game 2 Recap · June 5, 2026</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic leading-[0.9] text-white tracking-tight">
            Wemby Turns It Over,<br />
            <span className="text-[#E21111]">Misses The Buzzer —</span><br />
            Knicks Take 2-0 Lead
          </h1>
        </div>
      </div>

      {/* Article Body */}
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Byline */}
        <div className="flex items-center gap-4 pb-8 mb-8 border-b border-[#2a2a2a]">
          <div className="w-10 h-10 rounded-full bg-[#E21111] flex items-center justify-center text-white font-black text-sm">BB</div>
          <div>
            <p className="text-[#f0ebe0] font-bold text-sm">BounceBackTalk Staff</p>
            <p className="text-[#888] text-xs">June 5, 2026 · San Antonio, TX</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-[#888] text-xs font-bold uppercase tracking-widest">
            <span className="bg-[#1a1a1a] px-3 py-1.5 rounded-full">Frost Bank Center</span>
            <span className="bg-[#1a1a1a] px-3 py-1.5 rounded-full">19,014 fans</span>
          </div>
        </div>

        {/* Final Score Box */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="https://a.espncdn.com/i/teamlogos/nba/500/ny.png" className="w-14 h-14" alt="Knicks" />
            <div>
              <p className="text-[#888] text-xs uppercase tracking-widest font-bold mb-1">New York Knicks</p>
              <p className="text-5xl font-black text-[#f0ebe0]">105</p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-[#555] text-xs uppercase tracking-widest font-bold mb-1">Final</p>
            <p className="text-[#888] text-sm font-bold">NY leads series</p>
            <p className="text-[#E21111] text-xl font-black">2-0</p>
          </div>
          <div className="flex items-center gap-4 flex-row-reverse">
            <img src="https://a.espncdn.com/i/teamlogos/nba/500/sa.png" className="w-14 h-14" alt="Spurs" />
            <div className="text-right">
              <p className="text-[#888] text-xs uppercase tracking-widest font-bold mb-1">San Antonio Spurs</p>
              <p className="text-5xl font-black text-[#f0ebe0]">104</p>
            </div>
          </div>
        </div>

        {/* Quarter breakdown */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5 mb-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#555] text-xs uppercase tracking-widest font-bold">
                <td className="pb-3 pr-4">Team</td>
                <td className="pb-3 text-center px-3">Q1</td>
                <td className="pb-3 text-center px-3">Q2</td>
                <td className="pb-3 text-center px-3">Q3</td>
                <td className="pb-3 text-center px-3">Q4</td>
                <td className="pb-3 text-center pl-3 text-[#f0ebe0] font-black">FINAL</td>
              </tr>
            </thead>
            <tbody>
              <tr className="text-[#f0ebe0] font-bold">
                <td className="py-2 pr-4 flex items-center gap-2"><img src="https://a.espncdn.com/i/teamlogos/nba/500/ny.png" className="w-5 h-5" alt="" /> NYK</td>
                <td className="py-2 text-center px-3">25</td>
                <td className="py-2 text-center px-3">31</td>
                <td className="py-2 text-center px-3">28</td>
                <td className="py-2 text-center px-3">21</td>
                <td className="py-2 text-center pl-3 text-[#E21111] font-black text-base">105</td>
              </tr>
              <tr className="text-[#f0ebe0] font-bold">
                <td className="py-2 pr-4 flex items-center gap-2"><img src="https://a.espncdn.com/i/teamlogos/nba/500/sa.png" className="w-5 h-5" alt="" /> SAS</td>
                <td className="py-2 text-center px-3">34</td>
                <td className="py-2 text-center px-3">18</td>
                <td className="py-2 text-center px-3">23</td>
                <td className="py-2 text-center px-3">29</td>
                <td className="py-2 text-center pl-3 font-black text-base">104</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lede */}
        <p className="text-xl md:text-2xl font-bold leading-relaxed text-[#f0ebe0] mb-8 border-l-4 border-[#E21111] pl-6">
          53 years. That's how long New York has been waiting. And right now, the Knicks are two wins away from ending every single second of it.
        </p>

        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          Let's be honest — nobody expected this to go down the way it did. San Antonio was the better team for three quarters. Frost Bank Center was rocking. Wembanyama had that look in his eyes like he was about to close this thing out on his own. And then the fourth quarter happened, and the Knicks did what this Knicks team does: they made you believe they were finished, and then they weren't.
        </p>

        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          Brunson drew the foul when it mattered most. Hit both free throws. Wemby had his shot to answer and the ball rimmed out. Final: 105-104 New York. Series: 2-0 Knicks. The city of San Antonio went silent, and somewhere in Manhattan, people started making plans for Monday night.
        </p>

        {/* Pull Quote */}
        <blockquote className="my-10 bg-[#1a1a1a] border-l-4 border-[#E21111] rounded-r-xl p-6">
          <p className="text-[#f0ebe0] text-xl font-black italic leading-snug mb-3">"We've been in this situation before. Nobody panicked."</p>
          <cite className="text-[#888] text-sm font-bold uppercase tracking-widest not-italic">— Jalen Brunson, after Game 2</cite>
        </blockquote>

        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          KAT was a problem all night — 21 and 13, physical, making San Antonio pay every time they tried to sag off. Bridges knocked down big shots when the Knicks needed breathing room. This isn't a one-man team anymore, and that's exactly why they're dangerous. Wembanyama dropped 29, and it still wasn't enough. That should scare every Spurs fan reading this.
        </p>

        {/* Stats Grid */}
        <div className="my-10">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-[#888] mb-4">Game Leaders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { team: 'NYK', name: 'Karl-Anthony Towns', line: '21 PTS · 13 REB · 3 AST', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' },
              { team: 'NYK', name: 'Jalen Brunson', line: '20 PTS · 8 AST · 6 REB', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' },
              { team: 'NYK', name: 'Mikal Bridges', line: '20 PTS · 5 REB · 4 AST', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' },
              { team: 'SAS', name: 'Victor Wembanyama', line: '29 PTS · 8 REB · 4 BLK', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png' },
              { team: 'SAS', name: "De'Aaron Fox", line: '20 PTS · 7 AST · 3 STL', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png' },
            ].map(p => (
              <div key={p.name} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center gap-4">
                <img src={p.logo} className="w-8 h-8 opacity-70" alt={p.team} />
                <div>
                  <p className="text-[#f0ebe0] font-black text-sm">{p.name}</p>
                  <p className="text-[#888] text-xs font-bold tracking-wide">{p.line}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          Here's the thing about Wemby: he's 22. This is his first Finals. He just gave you 29 points on the road in a one-possession game and his team still lost. That's not on him. The Spurs need Pop's ghost to show up and figure out how to stop a Knicks offense that has been picking apart every defense thrown at it since mid-April.
        </p>

        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          The turnover at the end — that's the play that'll haunt San Antonio. Not the missed buzzer shot, not the defensive breakdown in the second half. The turnover. You had the lead. You had home court. And the ball ended up out of bounds with 9.5 seconds left. That's a championship-changing mistake, and everybody in that building knew it the second it happened.
        </p>

        {/* Divider */}
        <div className="border-t border-[#2a2a2a] my-10" />

        <h2 className="text-2xl font-black uppercase italic text-[#f0ebe0] mb-4">Where This Series Goes Next</h2>
        <p className="text-[#bbb] leading-relaxed text-base mb-6">
          Game 3 is at Madison Square Garden, and if you think that building is going to be loud, you haven't been to MSG in June with the Knicks two wins from a title. The energy in that city right now is something else. Tickets are going for insane money. The whole country is tuned in.
        </p>
        <p className="text-[#bbb] leading-relaxed text-base mb-8">
          San Antonio needs a win badly — not just for the series, but for the narrative. You can't let this become a sweep conversation. Wembanyama needs a statement performance, Fox needs to be Fox, and someone off the bench needs to give them 15 quiet points the Knicks don't see coming. Otherwise? Start planning the parade route on Fifth Avenue.
        </p>

        {/* Back link */}
        <Link to="/" className="inline-flex items-center gap-2 text-[#E21111] text-[11px] font-black uppercase tracking-widest hover:text-red-400 transition-colors">
          <ChevronRight size={12} className="rotate-180" /> Back to Home
        </Link>
      </div>
    </div>
  );
};

// ─── PROFILE PAGE ─────────────────────────────────────────────────────────────
const NBA_TEAMS = [
  { abbr: 'ATL', name: 'Hawks',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/atl.png' },
  { abbr: 'BOS', name: 'Celtics',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bos.png' },
  { abbr: 'BKN', name: 'Nets',         logo: 'https://a.espncdn.com/i/teamlogos/nba/500/bkn.png' },
  { abbr: 'CHA', name: 'Hornets',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cha.png' },
  { abbr: 'CHI', name: 'Bulls',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/chi.png' },
  { abbr: 'CLE', name: 'Cavaliers',    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/cle.png' },
  { abbr: 'DAL', name: 'Mavericks',    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/dal.png' },
  { abbr: 'DEN', name: 'Nuggets',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/den.png' },
  { abbr: 'DET', name: 'Pistons',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/det.png' },
  { abbr: 'GSW', name: 'Warriors',     logo: 'https://a.espncdn.com/i/teamlogos/nba/500/gs.png' },
  { abbr: 'HOU', name: 'Rockets',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/hou.png' },
  { abbr: 'IND', name: 'Pacers',       logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ind.png' },
  { abbr: 'LAC', name: 'Clippers',     logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lac.png' },
  { abbr: 'LAL', name: 'Lakers',       logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png' },
  { abbr: 'MEM', name: 'Grizzlies',    logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mem.png' },
  { abbr: 'MIA', name: 'Heat',         logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mia.png' },
  { abbr: 'MIL', name: 'Bucks',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/mil.png' },
  { abbr: 'MIN', name: 'Timberwolves', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/min.png' },
  { abbr: 'NOP', name: 'Pelicans',     logo: 'https://a.espncdn.com/i/teamlogos/nba/500/no.png' },
  { abbr: 'NYK', name: 'Knicks',       logo: 'https://a.espncdn.com/i/teamlogos/nba/500/ny.png' },
  { abbr: 'OKC', name: 'Thunder',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/okc.png' },
  { abbr: 'ORL', name: 'Magic',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/orl.png' },
  { abbr: 'PHI', name: '76ers',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phi.png' },
  { abbr: 'PHX', name: 'Suns',         logo: 'https://a.espncdn.com/i/teamlogos/nba/500/phx.png' },
  { abbr: 'POR', name: 'Trail Blazers',logo: 'https://a.espncdn.com/i/teamlogos/nba/500/por.png' },
  { abbr: 'SAC', name: 'Kings',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sac.png' },
  { abbr: 'SAS', name: 'Spurs',        logo: 'https://a.espncdn.com/i/teamlogos/nba/500/sa.png' },
  { abbr: 'TOR', name: 'Raptors',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/tor.png' },
  { abbr: 'UTA', name: 'Jazz',         logo: 'https://a.espncdn.com/i/teamlogos/nba/500/utah.png' },
  { abbr: 'WAS', name: 'Wizards',      logo: 'https://a.espncdn.com/i/teamlogos/nba/500/wsh.png' },
];

const ProfilePage = () => {
  const [user, setUser] = useState(getStoredUser());
  const [showJoin, setShowJoin] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectTeam = (abbr) => {
    const updated = { ...user, team: abbr };
    localStorage.setItem(BBT_USER_KEY, JSON.stringify(updated));
    setUser(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLeave = () => {
    localStorage.removeItem(BBT_USER_KEY);
    setUser(null);
  };

  if (!user) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-6">
          <UserIcon size={32} className="text-[#444]" />
        </div>
        <h1 className="text-[#f0ebe0] font-black text-2xl uppercase tracking-tight mb-2">No Profile Yet</h1>
        <p className="text-[#555] text-sm mb-6">Join BounceBackTalk to save your favorite team, track picks, and get daily best bets in your inbox.</p>
        <button onClick={() => setShowJoin(true)}
          className="px-8 py-3.5 bg-[#E21111] hover:bg-red-700 rounded-xl text-white text-[12px] font-black uppercase tracking-widest transition-colors">
          Join Free
        </button>
        {showJoin && <JoinModal onClose={() => { setShowJoin(false); setUser(getStoredUser()); }} />}
      </div>
    </div>
  );

  const favTeam = NBA_TEAMS.find(t => t.abbr === user.team);
  const initials = user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Hero banner */}
      <div className="bg-gradient-to-br from-[#E21111]/15 via-[#1a1a1a] to-[#0f0f0f] border-b border-[#2a2a2a]">
        <div className="max-w-3xl mx-auto px-4 py-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-[#E21111] rounded-2xl flex items-center justify-center shrink-0">
            <span className="text-white text-2xl font-black">{initials}</span>
          </div>
          <div className="text-center sm:text-left">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#E21111] mb-1">Member</div>
            <h1 className="text-[#f0ebe0] font-black text-3xl uppercase tracking-tight leading-none mb-1">{user.name}</h1>
            <p className="text-[#555] text-sm">{user.email}</p>
            {favTeam && (
              <div className="mt-3 inline-flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full px-3 py-1.5">
                <img src={favTeam.logo} className="w-4 h-4 object-contain" alt={favTeam.name} />
                <span className="text-[#888] text-[10px] font-black uppercase tracking-wider">{favTeam.name} fan</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

        {/* Favorite team */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[#f0ebe0] font-black text-base uppercase tracking-tight">Favorite NBA Team</h2>
              <p className="text-[#555] text-xs mt-0.5">Your picks feed will be tailored around this team</p>
            </div>
            {saved && (
              <span className="flex items-center gap-1 text-green-400 text-[10px] font-black uppercase tracking-wider">
                <CheckIcon size={12} /> Saved
              </span>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
            {NBA_TEAMS.map(t => (
              <button key={t.abbr} onClick={() => selectTeam(t.abbr)}
                title={t.name}
                className={`aspect-square rounded-xl flex items-center justify-center p-2 transition-all border ${
                  user.team === t.abbr
                    ? 'border-[#E21111] bg-[#E21111]/10'
                    : 'border-[#2a2a2a] bg-[#141414] hover:border-[#444]'
                }`}>
                <img src={t.logo} className="w-full h-full object-contain" alt={t.name} />
              </button>
            ))}
          </div>
        </div>

        {/* What's coming */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-[#f0ebe0] font-black text-base uppercase tracking-tight mb-1">Coming Soon</h2>
          <p className="text-[#555] text-xs mb-5">Full accounts are on the way. Here's what's dropping next:</p>
          <div className="space-y-3">
            {[
              { icon: '🎯', label: 'Pick Tracker', desc: 'Save today\'s best bets and track your record over time' },
              { icon: '🔔', label: 'Game Alerts',  desc: 'Get notified when your team\'s game goes live' },
              { icon: '📰', label: 'Saved Articles', desc: 'Bookmark any article or game preview to read later' },
              { icon: '📊', label: 'Stats Dashboard', desc: 'Your personal win rate, ROI, and betting trends' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-4 py-3 border-t border-[#252525] first:border-0">
                <span className="text-2xl leading-none mt-0.5">{f.icon}</span>
                <div>
                  <div className="text-[#f0ebe0] font-black text-sm">{f.label}</div>
                  <div className="text-[#555] text-xs mt-0.5">{f.desc}</div>
                </div>
                <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-[#444] bg-[#252525] px-2 py-1 rounded-full shrink-0">Soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="border border-[#2a2a2a] rounded-2xl p-6">
          <h2 className="text-[#f0ebe0] font-black text-sm uppercase tracking-tight mb-3">Account</h2>
          <button onClick={handleLeave}
            className="text-[#555] hover:text-[#E21111] text-xs font-bold uppercase tracking-wider transition-colors">
            Leave the waitlist
          </button>
        </div>

      </div>
    </div>
  );
};

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
      <Ticker games={games.filter(g => g.isLive)} />
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
            <Route path="/article/nba-finals-game-2" element={<NBAFinalsGame2Article />} />
            <Route path="/profile" element={<ProfilePage />} />
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
