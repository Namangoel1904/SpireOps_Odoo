"use client"

import { useRef, useState, type ChangeEvent, type ReactNode } from "react"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Fuel,
  LoaderCircle,
  ReceiptText,
  Sparkles,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { OcrReceiptResult } from "@/lib/supabase/types"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FuelEntry = { litres: string; cost: string; date: string }
type OcrState = "idle" | "scanning" | "success" | "error"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_ENTRY: FuelEntry = { litres: "", cost: "", date: "" }
const inputClassName =
  "mt-2 h-11 w-full rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LogFuel(): ReactNode {
  const [entry, setEntry] = useState<FuelEntry>(EMPTY_ENTRY)
  const [ocrState, setOcrState] = useState<OcrState>("idle")
  const [ocrConfidence, setOcrConfidence] = useState<OcrReceiptResult["confidence"] | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function updateEntry(field: keyof FuelEntry, value: string): void {
    setEntry((current) => ({ ...current, [field]: value }))
    if (ocrState === "success") setOcrState("idle")
  }

  // ── Real OCR: sends image to POST /api/ocr-receipt ───────────────────────

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return

    setOcrState("scanning")
    setOcrError(null)

    const formData = new FormData()
    formData.append("image", file)

    try {
      const response = await fetch("/api/ocr-receipt", { method: "POST", body: formData })
      const json = await response.json() as { data: OcrReceiptResult | null; error: { message: string } | null }

      if (!response.ok || json.error || !json.data) {
        throw new Error(json.error?.message ?? "OCR failed. Try again.")
      }

      const result = json.data

      // Populate form fields with Gemini-extracted values
      setEntry({
        litres: result.litres != null ? String(result.litres) : "",
        cost: result.cost != null ? String(result.cost) : "",
        date: result.date ?? "",
      })

      setOcrConfidence(result.confidence)
      setOcrState("success")
    } catch (err) {
      const message = err instanceof Error ? err.message : "OCR failed. Try again."
      setOcrError(message)
      setOcrState("error")
    } finally {
      // Reset the file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  // ── Trigger hidden file input ─────────────────────────────────────────────

  function triggerFilePicker(): void {
    setOcrState("idle")
    setOcrError(null)
    fileInputRef.current?.click()
  }

  // ── Status labels ─────────────────────────────────────────────────────────

  const statusLabel =
    ocrState === "scanning"
      ? "Reading receipt details…"
      : ocrState === "success"
        ? "Receipt processed successfully"
        : ocrState === "error"
          ? "OCR failed — try again"
          : "Receipt ready to scan"

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <section className="mx-auto max-w-xl space-y-5">
      {/* Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-400">Driver workspace</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">Log fuel purchase</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Capture a receipt to keep vehicle costs accurate and trip-ready.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-[0_16px_36px_rgba(2,6,23,0.28)] sm:p-6">
        {/* Receipt scanner zone */}
        <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/70 p-5 text-center">
          <div className="relative mx-auto grid h-28 max-w-xs place-items-center overflow-hidden rounded-md border border-slate-800 bg-slate-900">
            <ReceiptText
              className={`h-9 w-9 ${ocrState === "error" ? "text-rose-400" : "text-slate-500"}`}
            />
            {ocrState === "scanning" && (
              <span className="scan-line" aria-hidden="true" />
            )}
            <span className="absolute bottom-3 text-[11px] font-medium text-slate-500">
              {statusLabel}
            </span>
          </div>

          {/* Hidden native file input — accepts camera or gallery on mobile */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            capture="environment"
            className="sr-only"
            aria-label="Upload receipt image"
            onChange={handleFileSelected}
          />

          <Button
            type="button"
            id="ocr-scan-btn"
            onClick={triggerFilePicker}
            disabled={ocrState === "scanning"}
            className="mt-5 h-11 w-full gap-2 bg-sky-400 font-semibold text-slate-950 hover:bg-sky-300"
          >
            <span className="grid h-6 w-6 place-items-center rounded bg-slate-950/10">
              {ocrState === "scanning" ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
            </span>
            {ocrState === "scanning" ? "Scanning receipt…" : "Scan Receipt (AI OCR)"}
          </Button>

          <p className="mt-3 text-xs text-slate-500">
            AI extracts values for review before you submit.
          </p>
        </div>

        {/* Form fields */}
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Litres
            <input
              id="fuel-litres"
              inputMode="decimal"
              value={entry.litres}
              onChange={(e) => updateEntry("litres", e.target.value)}
              className={inputClassName}
              placeholder="0.00"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            Total Cost <span className="normal-case text-slate-500">(₹)</span>
            <input
              id="fuel-cost"
              inputMode="decimal"
              value={entry.cost}
              onChange={(e) => updateEntry("cost", e.target.value)}
              className={inputClassName}
              placeholder="0.00"
            />
          </label>

          <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400 sm:col-span-2">
            Purchase Date
            <input
              id="fuel-date"
              type="date"
              value={entry.date}
              onChange={(e) => updateEntry("date", e.target.value)}
              className={inputClassName}
            />
          </label>
        </div>

        {/* OCR success banner */}
        {ocrState === "success" && (
          <div
            role="status"
            className="mt-5 flex items-start gap-3 rounded-md border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
            <div>
              <span>AI OCR autofilled the receipt fields. Please confirm before logging.</span>
              {ocrConfidence && (
                <span
                  className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    ocrConfidence === "high"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : ocrConfidence === "medium"
                        ? "bg-amber-500/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                  }`}
                >
                  {ocrConfidence} confidence
                </span>
              )}
            </div>
          </div>
        )}

        {/* OCR error banner */}
        {ocrState === "error" && ocrError && (
          <div
            role="alert"
            className="mt-5 flex items-start gap-3 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <span>{ocrError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-800 pt-5">
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <Fuel className="h-4 w-4" />
            Vehicle TR-077
          </span>
          <Button
            type="button"
            id="log-fuel-submit-btn"
            className="gap-2 bg-sky-400 text-slate-950 hover:bg-sky-300"
            disabled={!entry.litres || !entry.cost || !entry.date}
          >
            <CalendarDays className="h-4 w-4" />
            Log fuel
          </Button>
        </div>
      </div>
    </section>
  )
}
