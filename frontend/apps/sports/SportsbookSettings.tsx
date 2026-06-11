import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, ChevronRight, LogOut, User, Bell, Shield, BookOpen } from "lucide-react";
import { apiGet, apiPost, clearAccessToken } from "../api/api";

const ALL_BOOKS = [
  "DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet",
  "Fanatics", "Bet365", "BetRivers", "Barstool", "WynnBET", "Hard Rock",
];

const SB_COLORS: Record<string, string> = {
  DraftKings: "#53D338", FanDuel: "#1493FF", BetMGM: "#C9A84C",
  Caesars: "#0A8FFF", "ESPN Bet": "#FF6600", Fanatics: "#FF0060",
};

function sbColor(sb: string) { return SB_COLORS[sb] ?? "#8E8E93"; }

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93] px-1">{title}</p>
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Setting row ───────────────────────────────────────────────────────────────
function Row({ icon: Icon, label, sub, right, onClick, danger }: {
  icon?: React.ElementType;
  label: string; sub?: string;
  right?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={!onClick}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.04] last:border-0 ${
        onClick ? "active:bg-white/[0.04] transition-colors" : "cursor-default"
      }`}
    >
      {Icon && (
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${danger ? "bg-red-500/15" : "bg-white/[0.06]"}`}>
          <Icon className={`size-4 ${danger ? "text-red-400" : "text-[#8E8E93]"}`} />
        </div>
      )}
      <div className="flex-1 text-left min-w-0">
        <p className={`text-sm font-semibold ${danger ? "text-red-400" : "text-white"}`}>{label}</p>
        {sub && <p className="text-xs text-[#8E8E93] truncate">{sub}</p>}
      </div>
      {right ?? (onClick && !danger && <ChevronRight className="size-4 text-[#8E8E93] shrink-0" />)}
    </button>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative ${value ? "bg-[#E21111]" : "bg-[#3A3A3C]"}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export function SportsbookSettings() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ graded: number; skipped: number; errors: number } | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [autoGrade, setAutoGrade] = useState(true);

  useEffect(() => {
    apiGet<string[]>("/api/sports/preferences")
      .then(setSelected)
      .catch(() => setSelected(ALL_BOOKS))
      .finally(() => setLoading(false));
  }, []);

  function toggle(book: string) {
    setSelected((prev) => prev.includes(book) ? prev.filter((b) => b !== book) : [...prev, book]);
    setSaved(false);
  }

  async function save() {
    setSaving(true); setSaved(false);
    try { await apiPost("/api/sports/preferences", { sportsbooks: selected }); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    finally { setSaving(false); }
  }

  async function gradeNow() {
    setGrading(true); setGradeResult(null);
    try {
      const r = await apiPost<{ graded: number; skipped: number; errors: number }>("/api/sports/grade", {});
      setGradeResult(r);
    } catch { setGradeResult({ graded: 0, skipped: 0, errors: 1 }); }
    finally { setGrading(false); }
  }

  return (
    <div className="px-4 pt-10 pb-28 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Settings</h1>
        <p className="text-sm text-[#8E8E93] mt-0.5">Preferences & account</p>
      </div>

      {/* Profile card */}
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#E21111] to-[#FF6B35] flex items-center justify-center shrink-0">
          <span className="text-xl font-black text-white">A</span>
        </div>
        <div>
          <p className="font-bold text-white text-base">Arthur Manukyan</p>
          <p className="text-sm text-[#8E8E93]">Pro Member</p>
        </div>
        <div className="ml-auto">
          <span className="bg-[#E21111]/15 text-[#E21111] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full">PRO</span>
        </div>
      </div>

      {/* Auto-grading */}
      <Section title="Grading">
        <Row
          icon={CheckCircle}
          label="Auto-Grade Bets"
          sub="Settles pending bets automatically every hour"
          right={<Toggle value={autoGrade} onChange={setAutoGrade} />}
        />
        <div className="px-4 pb-4 pt-2 space-y-3">
          <button
            onClick={gradeNow}
            disabled={grading}
            className="w-full bg-[#E21111] hover:bg-[#c81010] disabled:opacity-60 text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition-colors"
          >
            {grading
              ? <><RefreshCw className="size-4 animate-spin" /> Grading…</>
              : <><CheckCircle className="size-4" /> Grade Pending Bets Now</>
            }
          </button>
          {gradeResult && (
            <div className={`rounded-xl px-3 py-2.5 text-sm font-medium border ${
              gradeResult.errors > 0
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}>
              {gradeResult.errors > 0
                ? "Error grading bets. Try again later."
                : gradeResult.graded === 0
                ? `No bets graded — ${gradeResult.skipped} game(s) not final yet.`
                : `✓ ${gradeResult.graded} bet${gradeResult.graded !== 1 ? "s" : ""} graded.${gradeResult.skipped > 0 ? ` ${gradeResult.skipped} still pending.` : ""}`
              }
            </div>
          )}
        </div>
      </Section>

      {/* My Sportsbooks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#8E8E93]">
            My Sportsbooks
          </p>
          <div className="flex gap-3">
            <button onClick={() => { setSelected(ALL_BOOKS); setSaved(false); }} className="text-[11px] text-[#8E8E93] font-semibold">All</button>
            <button onClick={() => { setSelected([]); setSaved(false); }} className="text-[11px] text-[#8E8E93] font-semibold">None</button>
          </div>
        </div>
        {loading ? (
          <div className="bg-[#1A1A1A] rounded-2xl p-4 flex flex-wrap gap-2 animate-pulse">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 w-24 bg-white/5 rounded-full" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {ALL_BOOKS.map((book) => {
              const active = selected.includes(book);
              const color = sbColor(book);
              return (
                <button
                  key={book}
                  onClick={() => toggle(book)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    active ? "border-transparent text-white" : "bg-[#1A1A1A] border-white/[0.08] text-[#8E8E93]"
                  }`}
                  style={active ? { background: `${color}22`, borderColor: `${color}55`, color } : {}}
                >
                  {book}
                </button>
              );
            })}
          </div>
        )}
        <button
          onClick={save}
          disabled={saving || loading}
          className="w-full bg-[#1A1A1A] border border-white/[0.08] hover:border-[#E21111]/40 text-white font-bold text-sm rounded-2xl py-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : `Save Preferences (${selected.length} selected)`}
        </button>
      </div>

      {/* Notifications */}
      <Section title="Notifications">
        <Row
          icon={Bell}
          label="Push Notifications"
          sub="Get alerts when bets settle"
          right={<Toggle value={notifications} onChange={setNotifications} />}
        />
      </Section>

      {/* About */}
      <Section title="About">
        <Row icon={BookOpen} label="How It Works" sub="Guide to tracking your bets" onClick={() => {}} />
        <Row icon={Shield} label="Privacy Policy" onClick={() => {}} />
        <div className="px-4 py-3 text-[11px] text-[#8E8E93]">
          BounceBackTracker v1.0 · Built for Arthur Sports Media
        </div>
      </Section>

      {/* Danger */}
      <Section title="Account">
        <Row icon={LogOut} label="Sign Out" danger onClick={() => { clearAccessToken(); window.location.href = "/"; }} />
      </Section>
    </div>
  );
}
