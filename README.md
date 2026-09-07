# jhonwilfreddrio — portfolio

Static portfolio deployed on Netlify (`publish = "."`).

## Sections

- **Work** — system leaps log, case files (ERP-lite, Accounting / BIR CAS, K-PICK HRIS, KORA, Shopee Dispatch), Excel VBA, web, and the **KORA** profile block (`#kora`): animated sprite from the Codex pet atlas, duties, flowcharts, guardrails, changelog.
- **JHON** — Jhon's Human-Oriented Navigator, a visitor chat that answers questions about Jhon from `assets/data/jhon-profile.json`.

## JHON engines

1. **Built-in knowledge engine** (`assets/js/jhon.js`) — keyword matching over the profile, runs in the browser, no key, no data leaves the page. Always available.
2. **Live LLM** (`netlify/functions/jhon.mjs`) — a hosted model grounded in the same profile JSON. It turns on automatically when one of these environment variables exists on the Netlify site (first match wins):

| Env var | Provider | Default model | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | OpenAI | `gpt-4.1-mini` | pay-as-you-go, cents per month at portfolio traffic |
| `GROQ_API_KEY` | Groq | `llama-3.3-70b-versatile` | free tier at console.groq.com |
| `GEMINI_API_KEY` | Google Gemini | `gemini-2.0-flash` | free tier at aistudio.google.com |
| `OPENROUTER_API_KEY` | OpenRouter | `openai/gpt-4o-mini` | many models, some free |

Optional: `JHON_PROVIDER` forces one provider when several keys exist; `JHON_MODEL` overrides the model name.

To enable: Netlify → Site configuration → Environment variables → add the key → redeploy. Without any key the function returns 503 and the page silently uses engine 1. The chat header shows which engine answered.

## Updating facts

Edit `assets/data/jhon-profile.json` (both engines read it) and the relevant HTML, then bump the `?v=` query on `style.css`, `main.js`, and `jhon.js` in `index.html` so browsers refetch.

## Local preview

```
python -m http.server 8765
```

Open `http://127.0.0.1:8765/index.html`. The Netlify function is not served locally by this command; the chat falls back to the built-in engine.
