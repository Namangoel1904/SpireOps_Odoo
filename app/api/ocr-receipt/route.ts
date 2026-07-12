// =============================================================================
// SpireOps — POST /api/ocr-receipt
// Accepts a fuel receipt image, sends it to Google Gemini (multimodal),
// and returns structured JSON for the fuel log form auto-fill.
//
// Request:  multipart/form-data { image: File }
// Response: { data: OcrReceiptResult } | { error: ... }
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import type { OcrReceiptResult, ApiResponse } from '@/lib/supabase/types'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

// ---------------------------------------------------------------------------
// Strict Gemini system prompt — structured extraction, no hallucination
// ---------------------------------------------------------------------------

const OCR_SYSTEM_PROMPT = `You are a precise OCR data extraction engine for fuel station receipts. 
Your ONLY job is to extract specific fields from the receipt image and return them as valid JSON.

STRICT RULES:
1. Return ONLY a raw JSON object — no markdown, no code fences, no explanation text.
2. If a field is not clearly visible or legible in the image, set it to null.
3. NEVER guess or hallucinate values. Accuracy is critical for financial records.
4. For 'date', convert any date format to ISO 8601: YYYY-MM-DD.
5. For 'cost' and 'litres', return numeric values only (no currency symbols, no commas).
6. For 'cost_per_litre', calculate if both total cost and litres are available; otherwise null.
7. 'confidence' reflects your certainty about the extracted data overall.
8. 'raw_text' should contain all text you can read from the receipt.

Return this exact JSON schema:
{
  "litres": <number | null>,
  "cost": <number | null>,
  "date": <"YYYY-MM-DD" | null>,
  "currency": <"INR" | "USD" | "EUR" | "GBP" | null>,
  "station": <"fuel station name string" | null>,
  "cost_per_litre": <number | null>,
  "confidence": <"high" | "medium" | "low">,
  "raw_text": <"all readable text from the receipt">
}`

// ---------------------------------------------------------------------------
// Route Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse<OcrReceiptResult>>> {
  // ── 1. Validate Gemini API key ──────────────────────────────────────────
  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    console.error('[OCR] GEMINI_API_KEY is not configured.')
    return NextResponse.json(
      { data: null, error: { code: 'SERVER_CONFIG_ERROR', message: 'OCR service is not configured.' } },
      { status: 503 }
    )
  }

  // ── 2. Parse multipart form data ────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'INVALID_REQUEST', message: 'Request must be multipart/form-data.' } },
      { status: 400 }
    )
  }

  const imageFile = formData.get('image') as File | null
  if (!imageFile) {
    return NextResponse.json(
      { data: null, error: { code: 'MISSING_FILE', message: 'No image file provided. Send the image as form field "image".' } },
      { status: 400 }
    )
  }

  // ── 3. Validate file type and size ──────────────────────────────────────
  if (!ALLOWED_MIME_TYPES.includes(imageFile.type)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'INVALID_FILE_TYPE',
          message: `File type "${imageFile.type}" is not supported. Accepted: ${ALLOWED_MIME_TYPES.join(', ')}.`,
        },
      },
      { status: 415 }
    )
  }

  if (imageFile.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'FILE_TOO_LARGE',
          message: `Image must be under 5 MB. Received: ${(imageFile.size / 1024 / 1024).toFixed(2)} MB.`,
        },
      },
      { status: 413 }
    )
  }

  // ── 4. Convert image to base64 for Gemini ──────────────────────────────
  let base64Image: string
  try {
    const arrayBuffer = await imageFile.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    base64Image = Buffer.from(uint8Array).toString('base64')
  } catch (err) {
    console.error('[OCR] Failed to read image file:', err)
    return NextResponse.json(
      { data: null, error: { code: 'FILE_READ_ERROR', message: 'Failed to process the uploaded image.' } },
      { status: 500 }
    )
  }

  // ── 5. Call Gemini API ──────────────────────────────────────────────────
  let geminiResponse: Response
  try {
    geminiResponse = await fetch(`${GEMINI_API_URL}?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: OCR_SYSTEM_PROMPT }],
        },
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: imageFile.type,
                  data: base64Image,
                },
              },
              {
                text: 'Extract all fuel receipt data from this image and return it as JSON according to the schema.',
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,          // Zero temperature = deterministic, factual extraction
          topP: 0.95,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json', // Force JSON output mode
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      }),
    })
  } catch (err) {
    console.error('[OCR] Gemini API network error:', err)
    return NextResponse.json(
      { data: null, error: { code: 'GEMINI_NETWORK_ERROR', message: 'Failed to reach the OCR service. Check your internet connection.' } },
      { status: 502 }
    )
  }

  // ── 6. Handle Gemini API errors ─────────────────────────────────────────
  if (!geminiResponse.ok) {
    const errorBody = await geminiResponse.text().catch(() => 'Unknown error')
    console.error('[OCR] Gemini API error:', geminiResponse.status, errorBody)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'GEMINI_API_ERROR',
          message: 'OCR service returned an error.',
          details: `HTTP ${geminiResponse.status}`,
        },
      },
      { status: 502 }
    )
  }

  // ── 7. Parse and validate Gemini response ───────────────────────────────
  let geminiBody: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
    }>
    promptFeedback?: { blockReason?: string }
  }

  try {
    geminiBody = await geminiResponse.json()
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'GEMINI_PARSE_ERROR', message: 'Unexpected response from OCR service.' } },
      { status: 502 }
    )
  }

  // Check for content filtering block
  if (geminiBody.promptFeedback?.blockReason) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'CONTENT_BLOCKED',
          message: `Image was blocked by the safety filter: ${geminiBody.promptFeedback.blockReason}`,
        },
      },
      { status: 422 }
    )
  }

  const rawText = geminiBody.candidates?.[0]?.content?.parts?.[0]?.text
  if (!rawText) {
    return NextResponse.json(
      { data: null, error: { code: 'EMPTY_RESPONSE', message: 'OCR service returned no data. The image may be too blurry or not a fuel receipt.' } },
      { status: 422 }
    )
  }

  // ── 8. Parse the structured JSON from Gemini ────────────────────────────
  let extractedData: OcrReceiptResult
  try {
    // Strip any accidental markdown fences (safety net)
    const cleanJson = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    // Validate and coerce types
    extractedData = {
      litres: typeof parsed.litres === 'number' ? Math.round(parsed.litres * 100) / 100 : null,
      cost: typeof parsed.cost === 'number' ? Math.round(parsed.cost * 100) / 100 : null,
      date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date)
        ? parsed.date
        : null,
      currency: typeof parsed.currency === 'string' ? parsed.currency : null,
      station: typeof parsed.station === 'string' ? parsed.station : null,
      cost_per_litre: typeof parsed.cost_per_litre === 'number'
        ? Math.round(parsed.cost_per_litre * 10000) / 10000
        : null,
      confidence: ['high', 'medium', 'low'].includes(parsed.confidence)
        ? parsed.confidence
        : 'low',
      raw_text: typeof parsed.raw_text === 'string' ? parsed.raw_text : rawText,
    }
  } catch (err) {
    console.error('[OCR] Failed to parse Gemini JSON output:', rawText, err)
    return NextResponse.json(
      {
        data: null,
        error: {
          code: 'JSON_PARSE_ERROR',
          message: 'OCR returned data in an unexpected format.',
          details: rawText.slice(0, 200),
        },
      },
      { status: 422 }
    )
  }

  // ── 9. Success ──────────────────────────────────────────────────────────
  return NextResponse.json({ data: extractedData, error: null }, { status: 200 })
}

// ---------------------------------------------------------------------------
// Block all other HTTP methods
// ---------------------------------------------------------------------------

export async function GET() {
  return NextResponse.json(
    { data: null, error: { code: 'METHOD_NOT_ALLOWED', message: 'Use POST with a multipart/form-data image.' } },
    { status: 405 }
  )
}
