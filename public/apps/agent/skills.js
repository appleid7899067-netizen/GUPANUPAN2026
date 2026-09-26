/* GUPAN Agent Skills — live data fetchers. Keyless + browser-safe (CORS open). */
"use strict";
(function (global) {
  const cache = new Map(); // url -> {at, data}

  async function fetchJSON(url, { timeout = 15000, cacheMs = 0 } = {}) {
    if (cacheMs > 0) {
      const hit = cache.get(url);
      if (hit && Date.now() - hit.at < cacheMs) return hit.data;
    }
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();
      if (cacheMs > 0) cache.set(url, { at: Date.now(), data });
      return data;
    } finally {
      clearTimeout(t);
    }
  }

  async function fetchText(url, { timeout = 20000 } = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeout);
    try {
      const r = await fetch(url, { signal: ctl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } finally {
      clearTimeout(t);
    }
  }

  const ok = (text) => ({ ok: true, text });
  const err = (text) => ({ ok: false, text });
  const fmt = (x, digits) => {
    const n = Number(x);
    if (!isFinite(n)) return "-";
    return n.toLocaleString("en-US", {
      maximumFractionDigits: digits != null ? digits : Math.abs(n) < 1 ? 6 : 2,
    });
  };

  const WX_TH = {
    0: "ท้องฟ้าแจ่มใส", 1: "แจ่มใสเป็นส่วนใหญ่", 2: "มีเมฆบางส่วน", 3: "เมฆมาก",
    45: "หมอก", 48: "หมอกน้ำแข็ง", 51: "ละอองฝนเบา", 53: "ละอองฝน", 55: "ละอองฝนหนัก",
    56: "ละอองฝนเยือกแข็งเบา", 57: "ละอองฝนเยือกแข็งหนัก", 61: "ฝนเบา", 63: "ฝนปานกลาง",
    65: "ฝนหนัก", 66: "ฝนเยือกแข็งเบา", 67: "ฝนเยือกแข็งหนัก", 71: "หิมะเบา",
    73: "หิมะ", 75: "หิมะหนัก", 77: "เกล็ดหิมะ", 80: "ฝนประปรายเบา", 81: "ฝนประปราย",
    82: "ฝนประปรายหนัก", 85: "หิมะประปราย", 86: "หิมะประปรายหนัก", 95: "พายุฝนฟ้าคะนอง",
    96: "พายุฝน+ลูกเห็บเบา", 99: "พายุฝน+ลูกเห็บหนัก",
  };
  const COINS = {
    btc: "bitcoin", eth: "ethereum", sol: "solana", doge: "dogecoin",
    xrp: "ripple", bnb: "binancecoin", ada: "cardano", trx: "tron",
    ton: "toncoin", link: "chainlink",
  };

  const defs = [
    {
      name: "datetime",
      desc: "วันเวลาปัจจุบัน (ไทย พ.ศ.)",
      args: "{}",
      async run() {
        const now = new Date();
        return ok(
          `วันเวลาปัจจุบัน: ${now.toLocaleString("th-TH", { dateStyle: "full", timeStyle: "medium" })}`,
        );
      },
    },
    {
      name: "calc",
      desc: "คำนวณเลข (+ - * / วงเล็บ ทศนิยม)",
      args: '{"expr":"(1200*7)/100"}',
      async run(a) {
        const expr = String((a && a.expr) || "").trim();
        if (!expr) return err("ไม่ได้ส่ง expr มา");
        if (expr.length > 100) return err("สูตรยาวเกินไป");
        if (!/^[0-9+\-*/().\s%]+$/.test(expr)) {
          return err("สูตรมีตัวอักษรที่ใช้ไม่ได้ (ใช้ได้แค่ 0-9 + - * / ( ) . % และช่องว่าง)");
        }
        try {
          const val = Function('"use strict";return (' + expr + ")")();
          if (typeof val !== "number" || !isFinite(val)) return err("คำนวณไม่ได้");
          return ok(`${expr} = ${Math.round(val * 10000) / 10000}`);
        } catch {
          return err("สูตรผิดรูปแบบ คำนวณไม่ได้");
        }
      },
    },
    {
      name: "wiki",
      desc: "ค้นหาสาระจาก Wikipedia (สด)",
      args: '{"query":"ภูเก็ต","lang":"th"}',
      async run(a) {
        const q = String((a && a.query) || "").trim();
        if (!q) return err("ไม่ได้ส่ง query มา");
        const lang = a && a.lang === "en" ? "en" : "th";
        const api = `https://${lang}.wikipedia.org/w/api.php?origin=*&format=json`;
        const os = await fetchJSON(
          `${api}&action=opensearch&search=${encodeURIComponent(q)}&limit=1`,
        );
        const title = os && os[1] && os[1][0];
        if (!title) return err(`ไม่พบบทความเกี่ยวกับ "${q}"`);
        const ex = await fetchJSON(
          `${api}&action=query&prop=extracts&exintro&explaintext&redirects=1&titles=${encodeURIComponent(title)}`,
        );
        const pages = (ex.query && ex.query.pages) || {};
        const page = Object.values(pages)[0] || {};
        const text = String(page.extract || "").slice(0, 1500);
        if (!text) return err(`พบบทความ "${title}" แต่ดึงเนื้อหาไม่ได้`);
        const url = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(title).replace(/ /g, "_"))}`;
        return ok(`Wikipedia "${title}": ${text}\nที่มา: ${url}`);
      },
    },
    {
      name: "weather",
      desc: "อากาศปัจจุบัน + สูง/ต่ำวันนี้ (สดจาก Open-Meteo)",
      args: '{"place":"ภูเก็ต"}',
      async run(a) {
        const place = String((a && a.place) || "").trim();
        if (!place) return err("ไม่ได้ส่ง place มา");
        const g = await fetchJSON(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=th&format=json`,
        );
        const loc = g.results && g.results[0];
        if (!loc) return err(`หาสถานที่ "${place}" ไม่เจอ ลองชื่อภาษาอังกฤษ`);
        const w = await fetchJSON(
          `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
        );
        const c = w.current || {};
        const d = w.daily || {};
        const desc = WX_TH[c.weather_code] || "ไม่ทราบสภาพอากาศ";
        const hi = d.temperature_2m_max && d.temperature_2m_max[0];
        const lo = d.temperature_2m_min && d.temperature_2m_min[0];
        return ok(
          `อากาศที่ ${loc.name}${loc.country ? " (" + loc.country + ")" : ""}: ${desc}, ${c.temperature_2m}°C, ชื้น ${c.relative_humidity_2m}%, ลม ${c.wind_speed_10m} กม./ชม. วันนี้สูงสุด ${hi}°C ต่ำสุด ${lo}°C`,
        );
      },
    },
    {
      name: "crypto",
      desc: "ราคาคริปโต USD+บาท เปลี่ยน 24 ชม. (สด)",
      args: '{"coins":"btc,eth"}',
      async run(a) {
        const syms = String((a && a.coins) || "btc,eth")
          .toLowerCase().split(/[,\s]+/).filter(Boolean).slice(0, 5);
        const ids = syms.map((s) => COINS[s]).filter(Boolean);
        if (!ids.length) return err("ไม่รู้จักเหรียญ (ใช้ btc eth sol doge xrp bnb ada trx ton link)");
        const p = await fetchJSON(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd,thb&include_24hr_change=true`,
          { cacheMs: 90000 },
        );
        const lines = syms.map((s) => {
          const d = p[COINS[s]];
          if (!d || d.usd == null) return null;
          const chg = d.usd_24h_change == null
            ? "-"
            : (d.usd_24h_change >= 0 ? "+" : "") + Math.round(d.usd_24h_change * 100) / 100 + "%";
          return `${s.toUpperCase()}: $${fmt(d.usd)} / ฿${fmt(d.thb)} (24h ${chg})`;
        }).filter(Boolean);
        if (!lines.length) return err("ดึงราคาคริปโตไม่ได้ (อาจโดนจำกัดเรท ลองใหม่ใน 1 นาที)");
        return ok("ราคาคริปโต (สด):\n" + lines.join("\n"));
      },
    },
    {
      name: "fx",
      desc: "อัตราแลกเปลี่ยนเทียบเงินบาท (สด)",
      args: '{"base":"THB"}',
      async run(a) {
        const base = String((a && a.base) || "THB").toUpperCase();
        if (!/^[A-Z]{3}$/.test(base)) return err("base ต้องเป็นรหัส 3 ตัว เช่น THB USD");
        const d = await fetchJSON(`https://open.er-api.com/v6/latest/${base}`, { cacheMs: 300000 });
        if (!d || d.result !== "success") return err("ดึงค่าเงินไม่ได้");
        const r = d.rates || {};
        const want = base === "THB"
          ? ["USD", "EUR", "JPY", "CNY", "GBP", "SGD", "MYR"]
          : ["THB", "USD", "EUR", "JPY"];
        const lines = want.filter((c) => r[c]).map((c) =>
          base === "THB" ? `1 ${c} = ฿${fmt(1 / r[c])}` : `1 ${base} = ${fmt(r[c])} ${c}`,
        );
        if (!lines.length) return err("ดึงค่าเงินไม่ได้");
        return ok(`อัตราแลกเปลี่ยน (ฐาน ${base}):\n` + lines.join("\n"));
      },
    },
    {
      name: "hn_news",
      desc: "ข่าวเทคยอดนิยม Hacker News ตอนนี้ (สด)",
      args: '{"limit":5}',
      async run(a) {
        const limit = Math.min(8, Math.max(1, Number((a && a.limit)) || 5));
        const ids = await fetchJSON("https://hacker-news.firebaseio.com/v0/topstories.json");
        if (!Array.isArray(ids)) return err("ดึงข่าวไม่ได้");
        const items = await Promise.all(
          ids.slice(0, limit).map((id) =>
            fetchJSON(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { timeout: 10000 }).catch(() => null),
          ),
        );
        const lines = items.filter(Boolean).map((it, i) =>
          `${i + 1}. ${it.title} (▲${it.score || 0})${it.url ? "\n   " + it.url : ""}`,
        );
        if (!lines.length) return err("ดึงข่าวไม่ได้");
        return ok("ข่าวเทคยอดนิยมตอนนี้:\n" + lines.join("\n"));
      },
    },
    {
      name: "fetch_url",
      desc: "ดึงเนื้อความเว็บเพจ (ตัดแท็ก เหลือตัวอักษร)",
      args: '{"url":"https://example.com"}',
      async run(a) {
        const url = String((a && a.url) || "").trim();
        if (!/^https?:\/\//i.test(url)) return err("url ต้องขึ้นต้น http(s)://");
        if (url.length > 500) return err("url ยาวเกินไป");
        const raw = await fetchText("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
        const text = raw
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ").trim().slice(0, 3000);
        if (!text) return err("ดึงเนื้อความไม่ได้ (เว็บอาจบล็อกบอท)");
        return ok(`เนื้อความจาก ${url}:\n${text}`);
      },
    },
  ];

  async function run(name, args) {
    const def = defs.find((d) => d.name === name);
    if (!def) return { ok: false, text: `ไม่มีสกิลชื่อ "${name}" (มี: ${defs.map((d) => d.name).join(", ")})` };
    try {
      const res = await def.run(args && typeof args === "object" ? args : {});
      return { ok: !!res.ok, text: String(res.text || "").slice(0, 4000) };
    } catch (e) {
      return { ok: false, text: `สกิล ${name} ล้มเหลว: ${(e && e.message) || "network error"}` };
    }
  }

  function prompt() {
    return (
      `ทักษะข้อมูลสดที่ใช้ได้ — เรียกด้วย <<<skill:ชื่อ {"arg":"ค่า"}>>> แล้วหยุดรอผล (รอบละไม่เกิน 3 สกิล สูงสุด 4 รอบ):\n` +
      defs.map((d) => `- ${d.name}: ${d.desc} ตัวอย่าง: ${d.args}`).join("\n") +
      `\nกฎ: เรียกสกิลเมื่อต้องการข้อมูลสด/คำนวณ/เวลาจริงเท่านั้น อย่าเดาข้อมูลที่เรียกมาได้ ตอบสุดท้ายเป็นภาษาไทยพร้อมระบุที่มา`
    );
  }

  global.AgentSkills = { defs, run, prompt };
})(typeof window !== "undefined" ? window : globalThis);
