export type PreviewVerification = {
  ok: boolean;
  status: number | null;
  contentType: string;
  expectedType: string;
  errorMarkers: string[];
  evidence: string[];
  checkedUrl: string;
};

const ERROR_MARKERS = [
  "Cannot read properties of",
  "undefined is not",
  "SyntaxError",
  "ReferenceError",
  "TypeError:",
  "500 Internal",
  "Internal Server Error",
  "Build failed",
  "Failed to compile",
  "Module not found",
  "ChunkLoadError",
];

export async function verifyPreview(
  artifactUrl: string,
  expectedType = "text/html",
  fetchImpl: typeof fetch = fetch,
): Promise<PreviewVerification> {
  const evidence: string[] = [];
  const errors: string[] = [];

  try {
    const response = await fetchImpl(artifactUrl, {
      method: "GET",
      cache: "no-store",
      headers: { Accept: expectedType },
    });
    const contentType = response.headers.get("content-type") ?? "";
    const body = await response.text();
    for (const marker of ERROR_MARKERS) {
      if (body.includes(marker)) errors.push(marker);
    }

    if (response.status === 200) evidence.push("http_200");
    if (contentType.toLowerCase().includes(expectedType.toLowerCase())) evidence.push("content_type_ok");
    if (!errors.length) evidence.push("no_error_markers");

    return {
      ok: response.status === 200 &&
        contentType.toLowerCase().includes(expectedType.toLowerCase()) &&
        errors.length === 0,
      status: response.status,
      contentType,
      expectedType,
      errorMarkers: errors,
      evidence,
      checkedUrl: artifactUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      status: null,
      contentType: "",
      expectedType,
      errorMarkers: [message],
      evidence: ["preview_fetch_failed"],
      checkedUrl: artifactUrl,
    };
  }
}

export function verifyInlinePreviewHtml(html: string): PreviewVerification {
  const errors = ERROR_MARKERS.filter((marker) => html.includes(marker));
  const complete = /<!doctype html|<html[\s>]/i.test(html) &&
    /<body[\s>][\s\S]*<\/body>/i.test(html);
  const evidence = [
    ...(complete ? ["html_document"] : []),
    ...(errors.length ? [] : ["no_error_markers"]),
  ];
  return {
    ok: complete && errors.length === 0,
    status: 200,
    contentType: "text/html",
    expectedType: "text/html",
    errorMarkers: errors,
    evidence,
    checkedUrl: "inline://preview",
  };
}
