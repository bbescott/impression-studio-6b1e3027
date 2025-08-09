import { useEffect, useRef, useState } from "react";

const ensureMeta = (name: string, content: string) => {
  const existing = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (existing) existing.content = content; else {
    const m = document.createElement("meta");
    m.setAttribute("name", name);
    m.setAttribute("content", content);
    document.head.appendChild(m);
  }
};

const ensureCanonical = (href: string) => {
  let link = document.querySelector("link[rel=canonical]") as HTMLLinkElement | null;
  if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
  link.href = href;
};

const Interview = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    document.title = "Interview | Impression Studio";
    ensureMeta("description", "Full-bleed selfie camera view for your interview.");
    ensureCanonical(window.location.origin + "/interview");
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!active) return;
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e) {
        // silently fail; user can navigate back to setup
        console.error("Interview camera error", e);
      }
    })();
    return () => { active = false; if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  return (
    <div className="min-h-screen w-full bg-background">
      <main className="relative h-dvh w-full">
        <video ref={videoRef} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
        {/* Intentionally no UI overlays to keep it distraction-free */}
      </main>
    </div>
  );
};

export default Interview;
