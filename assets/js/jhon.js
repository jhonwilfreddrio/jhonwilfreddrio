/**
 * JHON — Jhon's Human-Oriented Navigator
 * Visitor-facing chat about Jhon Wilfred Drio.
 *
 * Two engines:
 *  1. Live model via the Netlify function at /.netlify/functions/jhon
 *     (used when the function is deployed and answers).
 *  2. Built-in knowledge engine over assets/data/jhon-profile.json
 *     (always available; used as the fallback on a static host).
 */
(function () {
  "use strict";

  var root = document.getElementById("jhon-chat");
  if (!root) return;

  var log = root.querySelector(".jhon-log");
  var form = root.querySelector(".jhon-form");
  var input = root.querySelector(".jhon-input");
  var sendBtn = root.querySelector(".jhon-send");
  var engineLabel = root.querySelector(".jhon-engine");
  var chips = Array.prototype.slice.call(root.querySelectorAll(".jhon-chip"));
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var profile = null;
  var history = [];          // [{role:'user'|'assistant', content:string}]
  var liveAvailable = null;  // null = unknown, true/false after first attempt
  var busy = false;

  /* ---------- helpers ---------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function scrollLog() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(role, text, meta) {
    var row = el("div", "jhon-msg jhon-msg--" + role);
    if (role === "assistant") {
      var av = el("div", "jhon-avatar", "J");
      av.setAttribute("aria-hidden", "true");
      row.appendChild(av);
    }
    var bubble = el("div", "jhon-bubble");
    text.split(/\n{2,}/).forEach(function (para) {
      var p = el("p");
      // very small markdown: **bold** and line breaks
      var parts = para.split(/(\*\*[^*]+\*\*)/g);
      parts.forEach(function (part) {
        if (/^\*\*[^*]+\*\*$/.test(part)) {
          p.appendChild(el("strong", null, part.slice(2, -2)));
        } else {
          part.split("\n").forEach(function (line, i) {
            if (i > 0) p.appendChild(document.createElement("br"));
            p.appendChild(document.createTextNode(line));
          });
        }
      });
      bubble.appendChild(p);
    });
    if (meta) bubble.appendChild(el("span", "jhon-meta", meta));
    row.appendChild(bubble);
    log.appendChild(row);
    scrollLog();
    return row;
  }

  function addTyping() {
    var row = el("div", "jhon-msg jhon-msg--assistant jhon-typing");
    var av = el("div", "jhon-avatar", "J");
    av.setAttribute("aria-hidden", "true");
    row.appendChild(av);
    var b = el("div", "jhon-bubble");
    for (var d = 0; d < 3; d++) b.appendChild(el("span", "jhon-dot"));
    row.appendChild(b);
    log.appendChild(row);
    scrollLog();
    return row;
  }

  function setEngine(label) {
    if (engineLabel) engineLabel.textContent = label;
  }

  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  /* ---------- built-in knowledge engine ---------- */

  function norm(s) {
    return (s || "").toLowerCase().replace(/[^a-z0-9\s\/\-\+\.]/g, " ").replace(/\s+/g, " ").trim();
  }

  // Keywords wrapped in spaces (" bir ") match whole words only.
  function has(q, words) {
    var padded = " " + q + " ";
    return words.some(function (w) { return padded.indexOf(w) !== -1; });
  }

  function system(id) {
    return profile.systems.filter(function (s) { return s.id === id; })[0];
  }

  function describeSystem(s) {
    var out = "**" + s.name + "** — " + s.status + ".\n\n" + s.summary;
    if (s.stack) out += "\n\nStack: " + s.stack + ".";
    if (s.metrics) out += "\n\nBy the numbers: " + s.metrics + ".";
    return out;
  }

  function listSystems() {
    return profile.systems.map(function (s) { return "• **" + s.name + "** — " + s.status; }).join("\n");
  }

  function localAnswer(question) {
    var q = norm(question);
    var p = profile;

    if (!q) return "Ask me anything about Jhon — his systems, KORA, skills, experience, or how to reach him.";

    if (has(q, ["who are you", "what are you", "your name", "jhon stand", "what is jhon", "what does jhon mean", "acronym"])) {
      return "I'm **JHON** — " + p.jhon.expansion + " (some days " + p.jhon.alias + "). " + p.jhon.role;
    }
    if (has(q, ["hello", "hi ", "hey", "good morning", "good afternoon", "good evening", "kumusta", "kamusta"]) && q.length < 30) {
      return "Hi! I'm JHON, " + p.jhon.expansion + ". Ask me about " + p.name.split(" ")[0] + "'s systems (ERP-lite, the BIR accounting module, HRIS, KORA, the dispatch board, the website), his skills, or how to contact him.";
    }
    if (has(q, ["thank", "salamat"])) {
      return "You're welcome! If you want to talk to the real Jhon, his email is " + p.email + ".";
    }
    if (has(q, ["kora"])) {
      var k = system("kora");
      if (has(q, ["command", "telegram", "what can", "do "])) {
        return describeSystem(k) + "\n\nYou can see her animated profile, duties, flowcharts, and changelog under **Work → KORA**.";
      }
      return describeSystem(k) + "\n\nHer full profile with flowcharts is under **Work**.";
    }
    if (has(q, ["hris", "payroll", "timekeeping", "attendance", "human resource", " hr ", "payslip"])) {
      return describeSystem(system("hris"));
    }
    if (has(q, ["accounting", " bir ", "bureau of internal", "invoice", "ledger", " books ", " tax ", " cas ", "computerized accounting", "landed cost", "audit log", "audit trail"])) {
      return describeSystem(system("accounting"));
    }
    if (has(q, [" erp", "inventory", "stock", "warehouse", "fefo", "orders", "shopee", "lazada", "tiktok", "marketplace", "finance board", "returns"])) {
      return describeSystem(system("erp"));
    }
    if (has(q, ["dispatch", "socket", "packing", "rider", "real-time", "realtime"])) {
      return describeSystem(system("dispatch"));
    }
    if (has(q, ["website", "web site", "kpicktradingcorp", "quotation", "quote", "seo", "aeo", "hostinger", "b2b"])) {
      return describeSystem(system("website"));
    }
    if (has(q, ["excel", "vba", "sudoku", "spreadsheet", "macro"])) {
      return describeSystem(system("excel"));
    }
    if (has(q, ["project", "portfolio", "what has he built", "what did he build", "what have you built", "systems", "built", "work on", "works on", "working on"])) {
      return "Jhon builds and runs the internal systems of " + p.company + ":\n\n" + listSystems() + "\n\nAsk about any of them by name, e.g. \"tell me about the accounting module\".";
    }
    if (has(q, ["skill", "stack", "tech", "technolog", "language", "tools", "framework", "good at", "expert"])) {
      var sk = p.skills;
      return "**Systems & automation:** " + sk.systems.join(", ") + ".\n\n**Data, controls & reporting:** " + sk.data.join(", ") + ".\n\n**Real-time & web:** " + sk.web.join(", ") + ".";
    }
    if (has(q, ["deploy", " ci ", " ci/cd", "github actions", "devops", "release", "backup", "rollback", "reliab", "engineering practice", "how does he ship"])) {
      return p.engineering;
    }
    if (has(q, ["experience", "career", "background", "history", "worked", "previous job", "job history", "resume", " cv "])) {
      return "Career so far:\n\n" + p.experience.map(function (e) {
        return "• **" + e.role + "** — " + e.org + " (" + e.period + "). " + e.summary;
      }).join("\n") + "\n\nThe full resume is downloadable from the Career Log section.";
    }
    if (has(q, ["education", "school", "university", "degree", "study", "studied", "graduate"])) {
      return p.education.degree + ", " + p.education.school + " (" + p.education.years + ").";
    }
    if (has(q, ["hire", "hiring", "available", "availability", "open to", "freelance", "contract", "full-time", "full time", "job", "recruit", "rate", "salary", "work with"])) {
      return "Yes — " + p.availability.toLowerCase() + ". He is currently " + p.title + " at " + p.company + " (since " + p.since + "). The fastest way to start a conversation is email: " + p.email + ". Rates and scope are discussed directly with him.";
    }
    if (has(q, ["contact", "email", "phone", "reach", "call", "message", "linkedin", "social", "instagram", "facebook"])) {
      return "Email: " + p.email + "\nPhone: " + p.phone + "\nLocation: " + p.location + "\n\nThere is also a contact form and a digital business card in the Contact section.";
    }
    if (has(q, ["company", "k-pick", "kpick", "employer", "where does he work", "who does he work"])) {
      return p.company + " — " + p.companyDescription + ". Jhon has been their " + p.title + " since " + p.since + ".";
    }
    if (has(q, ["where", "location", "based", "city", "country", "live", "philippines", "manila"])) {
      return "He is based in " + p.location + ".";
    }
    if (has(q, ["philosophy", "approach", "how does he think", "how do you work", "principle", "mindset", "why"])) {
      return "\"" + p.tagline + "\"\n\n" + p.philosophy;
    }
    if (has(q, ["who is jhon", "about jhon", "tell me about jhon", "who is he", "introduce", "about him", "summary", "overview", "jhon wilfred"])) {
      return p.name + " is a " + p.title + " at " + p.company + ", " + p.companyDescription + ". Since " + p.since + " he has built and operates six systems: ERP-lite, a BIR-ready accounting module, K-PICK HRIS, KORA, a real-time dispatch board, and the public B2B website.\n\n" + p.philosophy;
    }
    if (has(q, [" age ", "how old", "birthday", " born "])) {
      return "I only share what's published on the portfolio, and that isn't on it. You can ask him directly at " + p.email + ".";
    }
    if (has(q, [" ai ", " model", " llm", "ollama", "local ai", "codex", "claude", "chatgpt"])) {
      return "Jhon runs local AI on-premise: KORA answers questions through an Ollama-hosted Qwen model with an identity guard, and his development workflow uses local LLM workers as advisers that never get deployment authority. I'm JHON, a separate visitor-facing assistant that only knows this portfolio.";
    }
    return "I'm not sure about that one — I only know what's on this portfolio. Try asking about his **systems** (ERP-lite, accounting, HRIS, KORA, dispatch, website), his **skills**, his **experience**, or **how to contact him**.";
  }

  /* ---------- live engine (Netlify function) ---------- */

  function liveAnswer(question) {
    if (liveAvailable === false) return Promise.reject(new Error("live-disabled"));
    var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 25000) : null;
    return fetch("/.netlify/functions/jhon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history.slice(-12).concat([{ role: "user", content: question }]) }),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      if (timer) clearTimeout(timer);
      if (res.status === 404 || res.status === 501 || res.status === 503) {
        liveAvailable = false;
        throw new Error("live-unavailable");
      }
      if (!res.ok) throw new Error("live-error-" + res.status);
      return res.json();
    }).then(function (data) {
      if (!data || typeof data.reply !== "string" || !data.reply.trim()) throw new Error("live-empty");
      liveAvailable = true;
      return data.reply.trim();
    }).catch(function (err) {
      if (timer) clearTimeout(timer);
      // Abort, non-JSON (e.g. a catch-all HTML page) or transport failure:
      // stop retrying the live endpoint for this session.
      if (err && (err.name === "AbortError" || err.name === "SyntaxError" || err.name === "TypeError")) liveAvailable = false;
      throw err;
    });
  }

  /* ---------- conversation ---------- */

  function respond(question) {
    var typing = addTyping();
    var started = Date.now();

    function finish(text, engine) {
      var wait = reduceMotion ? 0 : Math.max(0, 500 - (Date.now() - started));
      setTimeout(function () {
        typing.remove();
        addMessage("assistant", text);
        history.push({ role: "user", content: question });
        history.push({ role: "assistant", content: text });
        setEngine(engine);
        setBusy(false);
        input.focus();
      }, wait);
    }

    liveAnswer(question).then(function (reply) {
      finish(reply, "live model · answers grounded in the published profile");
    }).catch(function () {
      var text;
      try {
        text = localAnswer(question);
      } catch (e) {
        text = "Sorry, I hit a snag answering that. Try asking about his systems, skills, or how to contact him.";
      }
      finish(text, "built-in knowledge engine · no data leaves your browser");
    });
  }

  function ask(question) {
    var text = (question || "").trim();
    if (!text || busy) return;
    if (!profile) {
      addMessage("assistant", "Give me a second — still loading Jhon's profile.");
      return;
    }
    setBusy(true);
    addMessage("user", text);
    input.value = "";
    respond(text);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    ask(input.value);
  });

  chips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      ask(chip.getAttribute("data-q") || chip.textContent);
    });
  });

  /* ---------- boot ---------- */

  fetch("assets/data/jhon-profile.json?v=20260907").then(function (r) { return r.json(); }).then(function (data) {
    profile = data;
    addMessage("assistant",
      "Hi, I'm **JHON** — " + data.jhon.expansion + ". I answer questions about " + data.name +
      ": what he builds, how KORA works, his skills, and how to reach him.\n\nTry one of the prompts below or type your own.");
  }).catch(function () {
    addMessage("assistant", "I couldn't load Jhon's profile right now. You can still reach him at jhonwilfreddrio@gmail.com.");
  });
})();
