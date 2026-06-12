
function todayPacificDate() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

import { useState, useRef, useEffect } from "react";
import {
  Camera, Upload, Loader2, CheckCircle, X, Plus, Trash2,
  TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { apiGet } from "../api/api";
import { betsApi, type BetStatus, type CreateBetPayload, type OcrResult } from "./bets";

const SPORTSBOOKS = [
  "DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet",
  "Fanatics", "Bet365", "BetRivers", "Barstool", "WynnBET", "Hard Rock", "Other",
];
const SPORTS_OPTIONS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];
const STATUS_OPTIONS: BetStatus[] = ["PENDING", "WON", "LOST", "PUSH", "VOID"];
const STATUS_COLORS: Record<string, string> = {
  WON: "text-green-400", LOST: "text-red-400",
  PENDING: "text-amber-400", PUSH: "text-blue-400", VOID: "text-[#8E8E93]",
};
const SB_COLORS: Record<string, string> = {
  DraftKings: "#53D338", FanDuel: "#1493FF", BetMGM: "#C9A84C",
  Caesars: "#0A8FFF", "ESPN Bet": "#FF6600", Fanatics: "#FF0060",
};

interface Leg { sport: string; game: string; betType: string; pick: string; line: string; odds: string; }
function emptyLeg(): Leg { return { sport: "", game: "", betType: "", pick: "", line: "", odds: "" }; }

// ── Pill selector ──────────────────────────────────────────────────────────────
function Pills<T extends string>({ options, value, onChange, color = "#E21111" }: {
  options: { label: string; value: T }[];
  value: T; onChange: (v: T) => void; color?: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
            value === o.value ? "text-white" : "bg-[#1A1A1A] text-[#8E8E93] border border-white/[0.06]"
          }`}
          style={value === o.value ? { background: color } : {}}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Dark input ─────────────────────────────────────────────────────────────────
function DInput({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">{label}</p>}
      <input
        {...props}
        className={`w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#3A3A3A] outline-none focus:border-[#E21111]/50 transition-colors ${props.className ?? ""}`}
      />
    </div>
  );
}

// ── Dark select ────────────────────────────────────────────────────────────────
function DSelect({ label, value, onChange, options, placeholder }: {
  label?: string; value: string; placeholder?: string;
  onChange: (v: string) => void; options: string[];
}) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">{label}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#1A1A1A] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-[#E21111]/50 transition-colors appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ── Today's Lines panel ────────────────────────────────────────────────────────
function TodaysLines() {
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState("NBA");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<any[]>(`/api/sports/odds?sport=${sport}`)
      .then((d) => setGames(Array.isArray(d) ? d.slice(0, 8) : []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [open, sport]);

  return (
    <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <TrendingUp className="size-4 text-[#E21111]" /> Today's Lines
        </span>
        {open ? <ChevronUp className="size-4 text-[#8E8E93]" /> : <ChevronDown className="size-4 text-[#8E8E93]" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06]">
          <div className="flex gap-2 pt-3 overflow-x-auto scrollbar-none">
            {SPORTS_OPTIONS.map((s) => (
              <button key={s} type="button" onClick={() => setSport(s)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  sport === s ? "bg-[#E21111] text-white" : "bg-[#2C2C2E] text-[#8E8E93]"
                }`}
              >{s}</button>
            ))}
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-3 text-xs text-[#8E8E93]">
              <Loader2 className="size-3 animate-spin" /> Loading…
            </div>
          ) : games.length === 0 ? (
            <p className="text-xs text-[#8E8E93] py-2">No {sport} games today.</p>
          ) : (
            <div className="space-y-2">
              {games.map((g: any, i: number) => (
                <div key={g.gameId ?? i} className="flex items-center justify-between text-xs border-b border-white/[0.04] pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{g.awayTeam} @ {g.homeTeam}</p>
                    <p className="text-[#8E8E93]">
                      {g.status === "Final" ? "Final"
                        : g.status === "InProgress" ? <span className="text-red-400">● Live</span>
                        : "Scheduled"}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right shrink-0 ml-3">
                    <div><p className="text-[#8E8E93]">Sprd</p><p className="text-white font-mono">{g.spread != null ? (g.spread > 0 ? `+${g.spread}` : g.spread) : "—"}</p></div>
                    <div><p className="text-[#8E8E93]">O/U</p><p className="text-white font-mono">{g.overUnder ?? "—"}</p></div>
                    <div><p className="text-[#8E8E93]">ML</p><p className="text-white font-mono">{g.homeMoneyline != null ? (g.homeMoneyline > 0 ? `+${g.homeMoneyline}` : g.homeMoneyline) : "—"}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── OCR Preview ────────────────────────────────────────────────────────────────
function OcrPreview({ result, onConfirm, onDiscard }: {
  result: OcrResult; onConfirm: (d: CreateBetPayload) => void; onDiscard: () => void;
}) {
  const [sportsbook, setSportsbook] = useState(result.sportsbook ?? "");
  const [stake, setStake] = useState(String(result.stake ?? ""));
  const [odds, setOdds] = useState(String(result.odds ?? ""));
  const [payout, setPayout] = useState(String(result.payout ?? ""));
  const [status, setStatus] = useState<BetStatus>(result.status ?? "PENDING");
  const [betDate, setBetDate] = useState(result.betDate ?? todayPacificDate());

  function confirm() {
    onConfirm({
      type: (result.legs?.length ?? 0) > 1 ? "PARLAY" : "STRAIGHT",
      sportsbook: sportsbook || undefined,
      stake: Number(stake), odds: Number(odds), payout: Number(payout),
      status, betDate,
      legs: result.legs?.map((l) => ({
        pick: l.pick,
        odds: l.odds,
        betType: l.betType,
        game: l.game,
        sport: l.sport,
        league: l.league,
        line: l.line,
      })),
    });
  }

  return (
    <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="size-4 text-green-400" />
          <p className="text-sm font-semibold text-green-300">Bet slip scanned — confirm details</p>
        </div>
        <button type="button" onClick={onDiscard} className="p-1 rounded-full hover:bg-white/10">
          <X className="size-4 text-[#8E8E93]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DInput label="Sportsbook" value={sportsbook} onChange={(e) => setSportsbook((e.target as HTMLInputElement).value)} placeholder="DraftKings" />
        <DInput label="Bet Date" type="date" value={betDate} onChange={(e) => setBetDate((e.target as HTMLInputElement).value)} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <DInput label="Stake ($)" type="number" step="0.01" value={stake} onChange={(e) => setStake((e.target as HTMLInputElement).value)} placeholder="25.00" />
        <DInput label="Odds" type="number" value={odds} onChange={(e) => setOdds((e.target as HTMLInputElement).value)} placeholder="-110" />
        <DInput label="Payout ($)" type="number" step="0.01" value={payout} onChange={(e) => setPayout((e.target as HTMLInputElement).value)} placeholder="47.73" />
      </div>
      <DSelect label="Status" value={status} onChange={(v) => setStatus(v as BetStatus)} options={STATUS_OPTIONS} />

      {result.legs && result.legs.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">{result.legs.length} legs detected</p>
          {result.legs.map((leg, i) => (
            <div key={i} className="flex items-center gap-2 bg-[#1A1A1A] rounded-xl px-3 py-2.5 text-sm">
              <span className="text-[#8E8E93] w-4 text-xs">{i + 1}.</span>
              <span className="flex-1 text-white font-medium truncate">{leg.pick ?? "—"}</span>
              {leg.odds != null && <span className="font-mono text-[#8E8E93] text-xs">{leg.odds > 0 ? `+${leg.odds}` : leg.odds}</span>}
              {leg.result && (
                <span className={`text-[10px] font-bold uppercase ${STATUS_COLORS[leg.result] ?? ""}`}>{leg.result}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="button" onClick={confirm}
          className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold text-sm rounded-xl py-3 transition-colors"
        >
          Save Bet
        </button>
        <button type="button" onClick={onDiscard}
          className="px-5 bg-[#1A1A1A] border border-white/[0.06] text-[#8E8E93] text-sm rounded-xl py-3"
        >
          Edit
        </button>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function AddBet() {
  const [betType, setBetType] = useState<"STRAIGHT" | "PARLAY">("STRAIGHT");
  const [sportsbook, setSportsbook] = useState("");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [payout, setPayout] = useState("");
  const [notes, setNotes] = useState("");
  const [legs, setLegs] = useState<Leg[]>([emptyLeg()]);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState("");

  function updateLeg(i: number, field: keyof Leg, value: string) {
    setLegs((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }
  function removeLeg(i: number) { setLegs((prev) => prev.filter((_, idx) => idx !== i)); }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true); setOcrError(""); setOcrResult(null);
    try {
      const result = await betsApi.ocr(file);
      if ((result as any).error === "NO_API_KEY") {
        setOcrError("OCR not configured — fill in manually below.");
      } else if ((result as any).error) {
        setOcrError("Couldn't read this image. Fill in manually below.");
      } else if (!result.stake && !result.odds && (!result.legs || result.legs.length === 0)) {
        setOcrError("No bet details found. Try a clearer screenshot.");
      } else {
        setOcrResult(result);
      }
    } catch { setOcrError("Upload failed. Try again."); }
    finally { setOcrLoading(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function handleOcrConfirm(data: CreateBetPayload) {
    setSaving(true);
    try { await betsApi.create(data); setSuccess(true); setTimeout(() => { window.location.href = "/history"; }, 1200); }
    catch { setError("Failed to save."); setSaving(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    try {
      const payload: CreateBetPayload = {
        type: betType,
        sportsbook: sportsbook || undefined,
        stake: Number(stake), odds: Number(odds), payout: Number(payout),
        notes: notes || undefined,
        legs: betType === "PARLAY"
          ? legs.map((l) => ({ sport: l.sport || undefined, game: l.game || undefined, betType: l.betType || undefined, pick: l.pick || undefined, line: l.line || undefined, odds: l.odds ? Number(l.odds) : undefined }))
          : [{ pick: legs[0]?.pick || undefined, line: legs[0]?.line || undefined, odds: odds ? Number(odds) : undefined, betType: legs[0]?.betType || undefined, sport: legs[0]?.sport || undefined, game: legs[0]?.game || undefined }],
      };
      await betsApi.create(payload);
      setSuccess(true);
      setTimeout(() => { window.location.href = "/history"; }, 1200);
    } catch { setError("Failed to save. Check your inputs."); setSaving(false); }
  }

  // ── Success state ───────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
          <CheckCircle className="size-10 text-green-400" />
        </div>
        <p className="text-xl font-black text-white">Bet Saved!</p>
        <p className="text-sm text-[#8E8E93]">Heading to your bets…</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-10 pb-28 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Add Bet</h1>
        <p className="text-sm text-[#8E8E93] mt-0.5">Scan a slip or enter manually</p>
      </div>

      {/* Scan zone */}
      {!ocrResult && (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={ocrLoading}
          className="w-full relative overflow-hidden rounded-3xl border-2 border-dashed border-white/10 bg-[#1A1A1A] p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {ocrLoading ? (
            <>
              <div className="w-16 h-16 rounded-full bg-[#E21111]/15 flex items-center justify-center">
                <Loader2 className="size-8 text-[#E21111] animate-spin" />
              </div>
              <p className="text-white font-semibold">Reading slip…</p>
              <p className="text-[#8E8E93] text-xs">This takes ~30–60 seconds</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#E21111]/15 flex items-center justify-center">
                <Camera className="size-8 text-[#E21111]" />
              </div>
              <p className="text-white font-bold text-lg">Scan Bet Slip</p>
              <p className="text-[#8E8E93] text-sm">Upload a screenshot to auto-fill</p>
              <div className="flex items-center gap-1.5 mt-1">
                <Upload className="size-3.5 text-[#8E8E93]" />
                <span className="text-[11px] text-[#8E8E93]">PNG · JPG · WEBP</span>
              </div>
            </>
          )}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      {ocrError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm text-red-400">
          {ocrError}
        </div>
      )}

      {/* OCR preview */}
      {ocrResult && (
        <OcrPreview result={ocrResult} onConfirm={handleOcrConfirm} onDiscard={() => setOcrResult(null)} />
      )}

      {/* Today's lines */}
      <TodaysLines />

      {/* Manual form */}
      <div className="bg-[#1A1A1A] border border-white/[0.06] rounded-2xl p-4 space-y-5">
        <p className="text-sm font-bold text-white">Manual Entry</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Bet type toggle */}
          <Pills
            options={[{ label: "Straight", value: "STRAIGHT" }, { label: "Parlay", value: "PARLAY" }]}
            value={betType}
            onChange={(v) => { setBetType(v); setLegs(v === "PARLAY" ? [emptyLeg(), emptyLeg()] : [emptyLeg()]); }}
          />

          {/* Core fields */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <DSelect label="Sportsbook" value={sportsbook} onChange={setSportsbook} options={SPORTSBOOKS} placeholder="Select sportsbook…" />
            </div>
            <DInput label="Stake ($)" type="number" step="0.01" min="0" required placeholder="25.00" value={stake} onChange={(e) => setStake((e.target as HTMLInputElement).value)} />
            <DInput label="Odds" type="number" required placeholder="-110" value={odds} onChange={(e) => setOdds((e.target as HTMLInputElement).value)} />
            <div className="col-span-2">
              <DInput label="Payout ($)" type="number" step="0.01" min="0" required placeholder="47.73" value={payout} onChange={(e) => setPayout((e.target as HTMLInputElement).value)} />
            </div>
          </div>

          {/* Legs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                {betType === "PARLAY" ? `Legs (${legs.length})` : "Pick"}
              </p>
              {betType === "PARLAY" && (
                <button type="button" onClick={() => setLegs((p) => [...p, emptyLeg()])}
                  className="flex items-center gap-1 text-[#E21111] text-xs font-semibold"
                >
                  <Plus className="size-3.5" /> Add leg
                </button>
              )}
            </div>

            {legs.map((leg, i) => (
              <div key={i} className="bg-[#111] border border-white/[0.06] rounded-xl p-3 space-y-2.5">
                {betType === "PARLAY" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#8E8E93]">Leg {i + 1}</span>
                    {legs.length > 2 && (
                      <button type="button" onClick={() => removeLeg(i)}>
                        <Trash2 className="size-3.5 text-[#8E8E93] hover:text-red-400" />
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <DInput label="Pick" placeholder="Lakers -4.5 / LeBron Over 27.5" value={leg.pick} onChange={(e) => updateLeg(i, "pick", (e.target as HTMLInputElement).value)} />
                  </div>
                  <DInput label="Line" placeholder="-4.5 / O 224.5" value={leg.line} onChange={(e) => updateLeg(i, "line", (e.target as HTMLInputElement).value)} />
                  <DInput label="Sport" placeholder="NBA" value={leg.sport} onChange={(e) => updateLeg(i, "sport", (e.target as HTMLInputElement).value)} />
                  <DInput label="Game" placeholder="LAL vs BOS" value={leg.game} onChange={(e) => updateLeg(i, "game", (e.target as HTMLInputElement).value)} />
                  <DInput label="Bet Type" placeholder="Spread / ML / Total" value={leg.betType} onChange={(e) => updateLeg(i, "betType", (e.target as HTMLInputElement).value)} />
                  {betType === "PARLAY" && (
                    <div className="col-span-2">
                      <DInput label="Leg Odds" type="number" placeholder="-110" value={leg.odds} onChange={(e) => updateLeg(i, "odds", (e.target as HTMLInputElement).value)} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">Notes (optional)</p>
            <textarea
              placeholder="Any context about this bet…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full bg-[#111] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-[#3A3A3A] outline-none focus:border-[#E21111]/50 resize-none transition-colors"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#E21111] hover:bg-[#c81010] disabled:opacity-60 text-white font-bold text-base rounded-2xl py-4 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save Bet"}
          </button>
        </form>
      </div>
    </div>
  );
}
