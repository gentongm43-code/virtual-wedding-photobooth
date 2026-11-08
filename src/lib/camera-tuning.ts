export function tuneCameraTrack(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  if (!track || typeof track.getCapabilities !== "function") return;
  const caps = track.getCapabilities() as unknown as Record<string, unknown>;
  const advanced: Record<string, string> = {};
  for (const key of ["whiteBalanceMode", "exposureMode", "focusMode"]) {
    const modes = caps[key];
    if (Array.isArray(modes) && modes.includes("continuous")) advanced[key] = "continuous";
  }
  if (Object.keys(advanced).length) {
    void track.applyConstraints({ advanced: [advanced] } as MediaTrackConstraints).catch(() => undefined);
  }
}
