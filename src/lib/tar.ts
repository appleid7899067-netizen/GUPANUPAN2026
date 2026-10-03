/**
 * ═══ อ่านไฟล์ .tar (ustar · GNU longname · pax) แบบไม่พึ่งไลบรารี ═══════
 *
 * ใช้กับ tarball จาก `codeload.github.com` ซึ่งเป็น gzip+tar มาตรฐาน
 * ฝั่งเซิร์ฟเวอร์คลาย gzip ด้วย `node:zlib` แล้วส่งบัฟเฟอร์ดิบเข้ามาที่นี่
 * (โมดูลนี้เป็น TypeScript ล้วน ไม่แตะ node:zlib หรือ API ของเบราว์เซอร์
 * จึงเทสต์ได้ตรง ๆ ด้วย node --test)
 *
 * รองรับ: typeflag `0`/`\0` (ไฟล์ปกติ) · `x`/`g` (pax headers, อ่าน path=)
 * · `L` (GNU longname) · ข้ามไดเรกทอรี/ลิงก์/รายการที่เกินเพดาน
 */

export interface TarEntry {
  path: string;
  bytes: Uint8Array;
}

export interface UntarResult {
  entries: TarEntry[];
  /** true เมื่อหยุดกลางทางเพราะชนเพดาน (จำนวนไฟล์/ขนาดรวม) */
  truncated: boolean;
}

export interface UntarOptions {
  /** จำนวนไฟล์สูงสุดที่เก็บ (ค่าเริ่มต้น 5,000) */
  maxEntries?: number;
  /** ขนาดรวมสูงสุดของเนื้อไฟล์ (ค่าเริ่มต้น 120 MB) */
  maxTotalBytes?: number;
}

const BLOCK = 512;

/** อ่านสตริง ASCII/UTF-8 แบบตัด NUL ท้ายฟิลด์ */
function readString(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.subarray(start, start + length);
  let end = slice.length;
  while (end > 0 && slice[end - 1] === 0) end -= 1;
  let text = "";
  for (let i = 0; i < end; i += 1) text += String.fromCharCode(slice[i]);
  return text;
}

/** ฟิลด์ตัวเลขแบบ octal เป็น NUL/space และรองรับ base-256 (GNU) */
function readNumber(bytes: Uint8Array, start: number, length: number): number {
  const first = bytes[start];
  if (first !== undefined && (first & 0x80) !== 0) {
    // base-256: บิตสูงสุดของไบต์แรกคือ flag ที่เหลือคือ big-endian
    let value = 0;
    for (let i = start + 1; i < start + length; i += 1) {
      value = value * 256 + bytes[i];
    }
    return value;
  }
  const raw = readString(bytes, start, length).trim();
  if (!raw) return 0;
  const value = parseInt(raw, 8);
  return Number.isFinite(value) ? value : 0;
}

function isZeroBlock(bytes: Uint8Array, offset: number): boolean {
  for (let i = offset; i < offset + BLOCK; i += 1) if (bytes[i] !== 0) return false;
  return true;
}

/** อ่านค่า `path=` จากเนื้อ pax header (บรรทัด "len key=value\n") */
function paxPath(text: string): string {
  let path = "";
  let offset = 0;
  while (offset < text.length) {
    const space = text.indexOf(" ", offset);
    if (space < 0) break;
    const length = Number.parseInt(text.slice(offset, space), 10);
    if (!Number.isFinite(length) || length <= 0) break;
    const record = text.slice(space + 1, offset + length);
    const eq = record.indexOf("=");
    if (eq > 0 && record.slice(0, eq) === "path") {
      path = record.slice(eq + 1).replace(/\n$/, "");
    }
    offset += length;
  }
  return path;
}

/** ข้อความ UTF-8 จากบั๊กเก็ต (ใช้กับ pax/GNU longname) */
function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder === "function") {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

/**
 * แตก tar จากบัฟเฟอร์ที่คลาย gzip แล้ว
 * เนื้อไฟล์ถูกคัดลอก (slice) เพื่อให้บัฟเฟอร์ต้นทางถูก GC ได้
 */
export function untar(bytes: Uint8Array, options: UntarOptions = {}): UntarResult {
  const maxEntries = options.maxEntries ?? 5_000;
  const maxTotalBytes = options.maxTotalBytes ?? 120 * 1024 * 1024;
  const entries: TarEntry[] = [];
  let total = 0;
  let truncated = false;
  let offset = 0;
  /** ชื่อที่จะใช้กับรายการถัดไป (มาจาก pax `path=` หรือ GNU longname) */
  let pendingName = "";

  while (offset + BLOCK <= bytes.length) {
    if (isZeroBlock(bytes, offset)) break;
    const header = bytes.subarray(offset, offset + BLOCK);
    const typeflag = String.fromCharCode(header[156] || 0x30);
    const size = readNumber(header, 124, 12);
    const contentStart = offset + BLOCK;
    const contentEnd = contentStart + size;
    if (size < 0 || contentEnd > bytes.length) {
      truncated = true;
      break;
    }

    if (typeflag === "x" || typeflag === "g") {
      const text = decodeUtf8(bytes.subarray(contentStart, contentEnd));
      const path = paxPath(text);
      if (path && typeflag === "x") pendingName = path;
      offset = contentStart + Math.ceil(size / BLOCK) * BLOCK;
      continue;
    }
    if (typeflag === "L") {
      pendingName = decodeUtf8(
        bytes.subarray(contentStart, contentEnd),
      ).replace(/\0.*$/, "").replace(/\n$/, "");
      offset = contentStart + Math.ceil(size / BLOCK) * BLOCK;
      continue;
    }

    const name = readString(header, 0, 100);
    const prefix = readString(header, 345, 155);
    const path = pendingName || (prefix ? `${prefix}/${name}` : name);
    pendingName = "";

    if (typeflag === "0" || typeflag === "\0" || typeflag === "7") {
      if (entries.length >= maxEntries || total + size > maxTotalBytes) {
        truncated = true;
        break;
      }
      entries.push({ path, bytes: bytes.slice(contentStart, contentEnd) });
      total += size;
    }

    offset = contentStart + Math.ceil(size / BLOCK) * BLOCK;
  }

  return { entries, truncated };
}

/** ตัดชื่อโฟลเดอร์ชั้นบนสุดของ tarball GitHub (`repo-ref/…`) ออก */
export function stripArchiveRoot(path: string): string {
  const slash = path.indexOf("/");
  return slash < 0 ? "" : path.slice(slash + 1);
}
