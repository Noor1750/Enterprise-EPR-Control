import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "15mb" }));

  // Health check endpoint for Cloud Run / load balancers
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // AI Smart 5-Why & Risk Analysis Assistant for Gemba Walk
  app.post("/api/gemini/gemba-smart-assist", async (req, res) => {
    try {
      const { observation, locationAsset, category, imageData } = req.body;
      if (!observation && !locationAsset) {
        return res.status(400).json({ error: "Observation or Location is required" });
      }

      const ai = getAI();
      if (!ai) {
        return res.status(200).json({
          fallback: true,
          message: "GEMINI_API_KEY not configured, using smart lean heuristics."
        });
      }

      const prompt = `You are a world-class Toyota Production System (TPS) Lean Manufacturing and 5S Visual Management Master Assessor conducting a Gemba Walk.
Given this shop-floor observation and location, perform an expert 5-Why root cause analysis, classify risk/severity, and propose immediate and systemic countermeasures.

Location / Asset: "${locationAsset || 'Shop Floor Workstation'}"
Observation / Finding: "${observation}"
User Selected Category Hint: "${category || 'General 5S'}"

Return a strictly valid JSON object matching this exact structure:
{
  "category": "One of: 'Sort (1S)' | 'Set in Order (2S)' | 'Shine (3S)' | 'Standardize (4S)' | 'Sustain (5S)' | 'Safety & Hazard' | 'Visual Management' | 'Waste / Muda' | 'Ergonomics' | 'Equipment Condition'",
  "riskImpact": "Concise 1-2 sentence assessment of safety, operational delay, quality defect, or financial risk",
  "severity": "One of: 'Critical' | 'High' | 'Medium' | 'Low'",
  "fiveWhy": {
    "why1": "Why 1 (direct symptom)",
    "why2": "Why 2 (process or physical cause)",
    "why3": "Why 3 (underlying condition)",
    "why4": "Why 4 (procedural / standard gap)",
    "why5": "Why 5 (systemic / management policy root cause)",
    "rootCauseSummary": "Concise summary of true systemic root cause",
    "systemicCountermeasure": "Permanent standardized visual 5S countermeasure"
  },
  "rootCause": "Concise 5-Why root cause summary phrase",
  "immediateAction": "Immediate containment action to eliminate hazard or stop waste on the spot",
  "suggestedTargetDays": 3
}`;

      const contents: any[] = [prompt];
      if (imageData && typeof imageData === 'string' && imageData.startsWith('data:image/')) {
        const match = imageData.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          contents.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          responseMimeType: 'application/json'
        }
      });

      let parsed = {};
      try {
        let cleanText = (response.text || "").trim();
        if (cleanText.startsWith("```json")) {
          cleanText = cleanText.slice(7);
        } else if (cleanText.startsWith("```")) {
          cleanText = cleanText.slice(3);
        }
        if (cleanText.endsWith("```")) {
          cleanText = cleanText.slice(0, -3);
        }
        cleanText = cleanText.trim();
        parsed = cleanText ? JSON.parse(cleanText) : {};
      } catch (jsonErr) {
        console.warn("Could not parse AI response as JSON:", jsonErr);
        parsed = { fallback: true };
      }
      return res.json(parsed);
    } catch (err: any) {
      console.warn("Gemini Gemba Assist failed, returning fallback signal:", err?.message || err);
      return res.status(200).json({
        fallback: true,
        error: err?.message || "AI assist unavailable"
      });
    }
  });

  // Vite middleware for development / static serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
