"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { cx } from "./ui";

// Minimal typing for the Web Speech API (not in TS's DOM lib).
interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface SpeechEvent { resultIndex: number; results: ArrayLike<SpeechResult> }
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}

function getRecognition(): (new () => Recognition) | null {
  const w = globalThis as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Record -> live transcript -> stop. Audio never leaves the browser's speech service; we only keep text. */
export function VoiceNote({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [lang, setLang] = useState("en-GB");
  const [err, setErr] = useState("");
  const rec = useRef<Recognition | null>(null);
  const base = useRef("");

  useEffect(() => {
    setSupported(Boolean(getRecognition()));
    if (navigator.language?.toLowerCase().startsWith("de")) setLang("de-DE");
  }, []);

  function start() {
    const R = getRecognition();
    if (!R) return;
    setErr("");
    const r = new R();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    base.current = value ? value.trim() + " " : "";
    let finals = "";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finals += res[0].transcript.trim() + " ";
        else live += res[0].transcript;
      }
      setInterim(live);
      onChange((base.current + finals).trimEnd());
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed") setErr("Microphone access is off. You can type the note instead.");
      else if (e.error !== "no-speech" && e.error !== "aborted") setErr("Recording stopped. You can type the note instead.");
    };
    r.onend = () => {
      setRecording(false);
      setInterim("");
    };
    rec.current = r;
    r.start();
    setRecording(true);
  }

  function stop() {
    rec.current?.stop();
  }

  useEffect(() => () => rec.current?.stop(), []);

  return (
    <div className="rounded-[22px] border border-line bg-surface p-4">
      <div className="flex items-center gap-3">
        {supported ? (
          <button
            type="button"
            onClick={recording ? stop : start}
            aria-pressed={recording}
            className={cx(
              "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
              recording ? "bg-danger text-on-accent" : "bg-accent text-on-accent",
            )}
          >
            {recording ? <Square size={18} aria-hidden /> : <Mic size={20} aria-hidden />}
            <span className="sr-only">{recording ? "Stop recording" : "Record voice note"}</span>
          </button>
        ) : (
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted">
            <Mic size={20} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{recording ? "Listening…" : "Voice note"}</p>
          <p className="text-[13px] text-muted">
            {supported ? "What did you talk about? What did you promise?" : "Voice isn't supported in this browser. Type it instead."}
          </p>
        </div>
        {supported && !recording && (
          <button
            type="button"
            onClick={() => setLang(lang === "de-DE" ? "en-GB" : "de-DE")}
            className="inline-flex h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 text-[13px] font-semibold"
            aria-label={`${lang === "de-DE" ? "DE" : "EN"}: speech language, tap to switch to ${lang === "de-DE" ? "English" : "German"}`}
          >
            {lang === "de-DE" ? "DE" : "EN"}
          </button>
        )}
      </div>
      <label htmlFor="voice-text" className="sr-only">Voice note transcript</label>
      <textarea
        id="voice-text"
        value={value + (interim ? (value ? " " : "") + interim : "")}
        onChange={(e) => onChange(e.target.value)}
        readOnly={recording}
        placeholder="Transcript appears here. You can edit it."
        rows={3}
        className="mt-3 w-full resize-none rounded-2xl border border-line bg-surface-2 px-3 py-2 text-[15px] text-ink placeholder:text-dim focus:border-accent focus:outline-none"
      />
      {err && <p role="alert" className="mt-2 text-[13px] text-danger">{err}</p>}
    </div>
  );
}
