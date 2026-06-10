import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Upload, Loader2, CheckCircle, X, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { apiGet } from "../api/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { betsApi, type BetStatus, type CreateBetPayload, type OcrResult } from "./bets";

const SPORTSBOOKS = [
  "DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet",
  "Fanatics", "Bet365", "BetRivers", "Barstool", "WynnBET", "Hard Rock", "Other",
];

const SPORTS_OPTIONS = ["NBA", "NFL", "MLB", "NHL", "NCAAF", "NCAAB"];

function fmtOddsNum(n: number | null): string {
  if (n == null) return "—";
  return n > 0 ? `+${n}` : String(n);
}

function LiveOddsPanel() {
  const [open, setOpen] = useState(false);
  const [sport, setSport] = useState("NBA");
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<any[]>(`/api/sports/odds?sport=${sport}`)
      .then((data) => setGames(Array.isArray(data) ? data.slice(0, 8) : []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [open, sport]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="size-4 text-red-400" />
            Today's Lines
          </CardTitle>
          {open ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {open && (
        <CardContent className="pt-0 space-y-3">
          {/* Sport picker */}
          <div className="flex gap-1.5 flex-wrap">
            {SPORTS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setSport(s)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  sport === s ? "bg-red-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {/* Games */}
          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
              <Loader2 className="size-3 animate-spin" /> Loading odds…
            </div>
          ) : games.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No {sport} games today.</p>
          ) : (
            <div className="space-y-2">
              {games.map((g: any, i: number) => (
                <div key={g.gameId ?? i} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{g.awayTeam} @ {g.homeTeam}</p>
                    <p className="text-muted-foreground">{g.status === "Final" ? "Final" : g.status === "InProgress" ? "🔴 Live" : "Scheduled"}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-right shrink-0 ml-3">
                    <div>
                      <p className="text-muted-foreground">Spread</p>
                      <p className="text-foreground">{g.spread != null ? (g.spread > 0 ? `+${g.spread}` : g.spread) : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total</p>
                      <p className="text-foreground">{g.overUnder ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ML</p>
                      <p className="text-foreground">{fmtOddsNum(g.homeMoneyline)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

interface Leg {
  sport: string;
  league: string;
  game: string;
  betType: string;
  pick: string;
  line: string;
  odds: string;
}

function emptyLeg(): Leg {
  return { sport: "", league: "", game: "", betType: "", pick: "", line: "", odds: "" };
}

interface OcrPreviewProps {
  result: OcrResult;
  onConfirm: (data: CreateBetPayload) => void;
  onDiscard: () => void;
}

const STATUS_OPTIONS: BetStatus[] = ["PENDING", "WON", "LOST", "PUSH", "VOID"];

function OcrPreview({ result, onConfirm, onDiscard }: OcrPreviewProps) {
  const [sportsbook, setSportsbook] = useState(result.sportsbook ?? "");
  const [stake, setStake] = useState(String(result.stake ?? ""));
  const [odds, setOdds] = useState(String(result.odds ?? ""));
  const [payout, setPayout] = useState(String(result.payout ?? ""));
  const [status, setStatus] = useState<BetStatus>(result.status ?? "PENDING");
  const [betDate, setBetDate] = useState(result.betDate ?? new Date().toISOString().slice(0, 10));

  function handleConfirm() {
    onConfirm({
      type: (result.legs?.length ?? 0) > 1 ? "PARLAY" : "STRAIGHT",
      sportsbook: sportsbook || undefined,
      stake: Number(stake),
      odds: Number(odds),
      payout: Number(payout),
      status,
      betDate,
      legs: result.legs?.map((l) => ({
        pick: l.pick,
        odds: l.odds,
        betType: l.betType,
        game: l.game,
        result: l.result,
      })),
    });
  }

  const statusColor = status === "WON" ? "text-green-400" : status === "LOST" ? "text-red-400" : status === "PUSH" ? "text-yellow-400" : "text-blue-400";

  return (
    <Card className="border-green-500/40 bg-green-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-green-400" />
            <CardTitle className="text-sm text-green-300">OCR extracted — confirm details</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onDiscard} className="size-7">
            <X className="size-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Sportsbook</Label>
            <Input value={sportsbook} onChange={(e) => setSportsbook(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Bet Date</Label>
            <Input type="date" value={betDate} onChange={(e) => setBetDate(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BetStatus)}>
              <SelectTrigger className={`mt-1 h-8 text-sm font-semibold ${statusColor}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs">Stake ($)</Label>
            <Input type="number" value={stake} onChange={(e) => setStake(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Odds</Label>
            <Input type="number" value={odds} onChange={(e) => setOdds(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Payout ($)</Label>
            <Input type="number" value={payout} onChange={(e) => setPayout(e.target.value)} className="mt-1 h-8 text-sm" />
          </div>
        </div>
        {result.legs && result.legs.length > 0 && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Detected legs ({result.legs.length})</Label>
            {result.legs.map((leg, i) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-muted rounded px-2 py-1.5">
                <span className="text-muted-foreground">#{i + 1}</span>
                <span className="font-medium flex-1">{leg.pick ?? "—"}</span>
                {leg.result && (
                  <span className={`text-xs font-semibold ${leg.result === "WON" ? "text-green-400" : leg.result === "LOST" ? "text-red-400" : "text-yellow-400"}`}>
                    {leg.result}
                  </span>
                )}
                {leg.odds != null && <Badge variant="outline" className="text-xs">{leg.odds > 0 ? `+${leg.odds}` : leg.odds}</Badge>}
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleConfirm}>
            Save Bet
          </Button>
          <Button size="sm" variant="outline" onClick={onDiscard}>
            Edit manually
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

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

  // OCR
  const fileRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrError, setOcrError] = useState("");

  function updateLeg(i: number, field: keyof Leg, value: string) {
    setLegs((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  function removeLeg(i: number) {
    setLegs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    setOcrError("");
    setOcrResult(null);
    try {
      const result = await betsApi.ocr(file);
      // If the API key is missing, result will have error: 'NO_API_KEY'
      if ((result as any).error === 'NO_API_KEY') {
        setOcrError("OCR is not configured yet (no API key). Fill in the form manually below.");
      } else if ((result as any).error) {
        const code = (result as any).error;
        if (code === 'HTTP_401') {
          setOcrError("Session expired — please log out and log back in, then try again.");
        } else {
          setOcrError(`Couldn't parse this screenshot (${code}). Try a clearer image or fill in manually.`);
        }
      } else if (!result.stake && !result.odds && (!result.legs || result.legs.length === 0)) {
        setOcrError("Couldn't find bet details in this image. Fill in the form manually below.");
      } else {
        setOcrResult(result);
      }
    } catch {
      setOcrError("Upload failed. Try again or fill in the form manually.");
    } finally {
      setOcrLoading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleOcrConfirm(data: CreateBetPayload) {
    setSaving(true);
    setError("");
    try {
      await betsApi.create(data);
      setSuccess(true);
      setTimeout(() => { window.location.href = "/history"; }, 1200);
    } catch {
      setError("Failed to save. Try again.");
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: CreateBetPayload = {
        type: betType,
        sportsbook: sportsbook || undefined,
        stake: Number(stake),
        odds: Number(odds),
        payout: Number(payout),
        notes: notes || undefined,
        legs: betType === "PARLAY"
          ? legs.map((l) => ({
              sport: l.sport || undefined,
              league: l.league || undefined,
              game: l.game || undefined,
              betType: l.betType || undefined,
              pick: l.pick || undefined,
              line: l.line || undefined,
              odds: l.odds ? Number(l.odds) : undefined,
            }))
          : [
              {
                pick: legs[0]?.pick || undefined,
                line: legs[0]?.line || undefined,
                odds: odds ? Number(odds) : undefined,
                betType: legs[0]?.betType || undefined,
                sport: legs[0]?.sport || undefined,
                game: legs[0]?.game || undefined,
              },
            ],
      };
      await betsApi.create(payload);
      setSuccess(true);
      setTimeout(() => { window.location.href = "/history"; }, 1200);
    } catch {
      setError("Failed to save. Please check your inputs.");
      setSaving(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <CheckCircle className="size-10 text-green-400" />
        <p className="text-lg font-semibold text-foreground">Bet saved!</p>
        <p className="text-sm text-muted-foreground">Redirecting to history…</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Add Bet</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manual entry or upload a screenshot</p>
      </div>

      {/* Screenshot upload */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Upload Screenshot</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-red-500/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            {ocrLoading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-6 text-red-400 animate-spin" />
                <p className="text-sm text-muted-foreground">Reading your bet slip… this takes ~30–60 seconds</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="size-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drop a bet slip screenshot to auto-fill
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          {ocrError && <p className="text-xs text-red-400 mt-2">{ocrError}</p>}
        </CardContent>
      </Card>

      {/* OCR preview */}
      {ocrResult && (
        <OcrPreview
          result={ocrResult}
          onConfirm={handleOcrConfirm}
          onDiscard={() => setOcrResult(null)}
        />
      )}

      {/* Live Odds Panel */}
      <LiveOddsPanel />

      {/* Manual form */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Manual Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Bet type */}
            <div className="flex gap-2">
              {(["STRAIGHT", "PARLAY"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setBetType(t);
                    setLegs(t === "PARLAY" ? [emptyLeg(), emptyLeg()] : [emptyLeg()]);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    betType === t
                      ? "bg-red-600 text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "STRAIGHT" ? "Straight" : "Parlay"}
                </button>
              ))}
            </div>

            {/* Core fields */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="col-span-2 sm:col-span-1">
                <Label className="text-xs">Sportsbook</Label>
                <Select value={sportsbook} onValueChange={setSportsbook}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTSBOOKS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Stake ($) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={stake}
                  onChange={(e) => setStake(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Odds *</Label>
                <Input
                  required
                  type="number"
                  placeholder="-110"
                  value={odds}
                  onChange={(e) => setOdds(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Payout ($) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="47.73"
                  value={payout}
                  onChange={(e) => setPayout(e.target.value)}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            {/* Legs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                  {betType === "PARLAY" ? `Legs (${legs.length})` : "Pick"}
                </Label>
                {betType === "PARLAY" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-red-400 hover:text-red-300"
                    onClick={() => setLegs((p) => [...p, emptyLeg()])}
                  >
                    <Plus className="size-3 mr-1" /> Add leg
                  </Button>
                )}
              </div>

              {legs.map((leg, i) => (
                <div key={i} className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                  {betType === "PARLAY" && (
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-muted-foreground">Leg {i + 1}</span>
                      {legs.length > 2 && (
                        <button type="button" onClick={() => removeLeg(i)}>
                          <Trash2 className="size-3.5 text-muted-foreground hover:text-red-400" />
                        </button>
                      )}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div>
                      <Label className="text-xs">Pick</Label>
                      <Input
                        placeholder="Team / Player"
                        value={leg.pick}
                        onChange={(e) => updateLeg(i, "pick", e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Line</Label>
                      <Input
                        placeholder="-3.5 / O 224.5"
                        value={leg.line}
                        onChange={(e) => updateLeg(i, "line", e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Bet Type</Label>
                      <Input
                        placeholder="Spread / ML / Total"
                        value={leg.betType}
                        onChange={(e) => updateLeg(i, "betType", e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Sport</Label>
                      <Input
                        placeholder="NBA"
                        value={leg.sport}
                        onChange={(e) => updateLeg(i, "sport", e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Game</Label>
                      <Input
                        placeholder="OKC vs IND"
                        value={leg.game}
                        onChange={(e) => updateLeg(i, "game", e.target.value)}
                        className="mt-1 h-8 text-sm"
                      />
                    </div>
                    {betType === "PARLAY" && (
                      <div>
                        <Label className="text-xs">Leg Odds</Label>
                        <Input
                          type="number"
                          placeholder="-110"
                          value={leg.odds}
                          onChange={(e) => updateLeg(i, "odds", e.target.value)}
                          className="mt-1 h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this bet…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 text-sm resize-none"
                rows={2}
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Button
                type="submit"
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <><Loader2 className="size-4 mr-2 animate-spin" /> Saving…</> : "Save Bet"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href="/dashboard">Cancel</a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
