import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiGet, apiPost } from "../api/api";

const ALL_BOOKS = [
  "DraftKings", "FanDuel", "BetMGM", "Caesars", "ESPN Bet",
  "Fanatics", "Bet365", "BetRivers", "Barstool", "WynnBET", "Hard Rock",
];

export function SportsbookSettings() {
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<{ graded: number; skipped: number; errors: number } | null>(null);

  useEffect(() => {
    apiGet<string[]>("/api/sports/preferences")
      .then(setSelected)
      .catch(() => setSelected(ALL_BOOKS))
      .finally(() => setLoading(false));
  }, []);

  function toggle(book: string) {
    setSelected((prev) =>
      prev.includes(book) ? prev.filter((b) => b !== book) : [...prev, book]
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await apiPost("/api/sports/preferences", { sportsbooks: selected });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function gradeNow() {
    setGrading(true);
    setGradeResult(null);
    try {
      const result = await apiPost<{ graded: number; skipped: number; errors: number }>(
        "/api/sports/grade", {}
      );
      setGradeResult(result);
    } catch {
      setGradeResult({ graded: 0, skipped: 0, errors: 1 });
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Auto-Grading */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">Auto-Grading</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pending bets are automatically graded every hour using live scores from SportsData.io.
            You can also trigger grading manually anytime.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={gradeNow}
              disabled={grading}
            >
              {grading ? (
                <><RefreshCw className="size-4 mr-2 animate-spin" />Grading…</>
              ) : (
                <><CheckCircle className="size-4 mr-2" />Grade Pending Bets Now</>
              )}
            </Button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Auto-grades every hour
            </div>
          </div>
          {gradeResult && (
            <div className={`rounded-lg px-4 py-3 text-sm border ${
              gradeResult.errors > 0
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-green-500/10 border-green-500/20 text-green-400"
            }`}>
              {gradeResult.errors > 0
                ? `Error grading bets. Try again later.`
                : gradeResult.graded === 0
                ? `No bets graded — ${gradeResult.skipped} pending games not final yet.`
                : `✓ ${gradeResult.graded} bet${gradeResult.graded !== 1 ? "s" : ""} graded. ${gradeResult.skipped > 0 ? `${gradeResult.skipped} still pending.` : ""}`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sportsbook Preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            My Sportsbooks
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              ({selected.length} selected)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which sportsbooks you use. Odds pages will show lines for your selected books.
          </p>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ALL_BOOKS.map((book) => {
                const active = selected.includes(book);
                return (
                  <button
                    key={book}
                    onClick={() => toggle(book)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                      active
                        ? "bg-red-600 border-red-600 text-white"
                        : "bg-card border-border text-muted-foreground hover:border-red-500/50"
                    }`}
                  >
                    {book}
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex items-center gap-3 pt-2">
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={save}
              disabled={saving || loading}
            >
              {saving ? "Saving…" : saved ? "✓ Saved" : "Save Preferences"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { setSelected(ALL_BOOKS); setSaved(false); }}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => { setSelected([]); setSaved(false); }}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
