export type TrackingData = {
  cl: string;
  s: string;
  l: string;
  u?: string;
};

export function encodeTrackingToken(data: TrackingData): string {
  return Buffer.from(JSON.stringify(data)).toString("base64url");
}

export function decodeTrackingToken(token: string): TrackingData | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64url").toString("utf-8"));
    if (typeof parsed.cl === "string" && typeof parsed.s === "string" && typeof parsed.l === "string") {
      return parsed as TrackingData;
    }
    return null;
  } catch {
    return null;
  }
}
