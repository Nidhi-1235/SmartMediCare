import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { useSpeech } from "@/lib/speech";
import { isNative, nativePickPhoto, nativeTakePhoto } from "@/lib/native";

/**
 * Accessible capture flow: live rear-camera preview with a large capture button,
 * plus a gallery upload fallback. Returns a JPEG data URL.
 */
export function CameraCapture({
  onCapture,
  busy,
  label,
}: {
  onCapture: (dataUrl: string) => void;
  busy?: boolean;
  label: string;
}) {
  const { t } = useI18n();
  const { speak } = useSpeech();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  async function openCamera() {
    setError(null);
    // On Android (Capacitor shell) use the real native camera app.
    if (isNative()) {
      const photo = await nativeTakePhoto();
      if (photo) {
        onCapture(photo.dataUrl);
      } else {
        setError(t("scan.cameraError"));
        speak(t("scan.cameraError"));
      }
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      setOpen(true);
      speak(t("scan.cameraHelp"));
      // Attach after the video element renders.
      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch {
      stopStream();
      setOpen(false);
      setError(t("scan.cameraError"));
      speak(t("scan.cameraError"));
    }
  }

  function closeCamera() {
    stopStream();
    setOpen(false);
  }

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    closeCamera();
    onCapture(dataUrl);
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onCapture(String(reader.result));
    reader.onerror = () => setError(t("scan.cameraError"));
    reader.readAsDataURL(file);
  }

  return (
    <div className="mt-6">
      {open ? (
        <div className="overflow-hidden rounded-3xl border-2 border-border bg-card">
          <video
            ref={videoRef}
            playsInline
            muted
            aria-label={label}
            className="aspect-[3/4] w-full bg-black object-cover"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 p-3">
            <Button onClick={capture} disabled={busy} className="tap-target h-16 text-lg font-extrabold">
              <Camera aria-hidden="true" className="size-6" />
              {t("scan.capture")}
            </Button>
            <Button
              variant="outline"
              onClick={closeCamera}
              aria-label={t("scan.close")}
              className="tap-target h-16 w-16 border-2 p-0"
            >
              <X aria-hidden="true" className="size-6" />
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={openCamera}
          disabled={busy}
          aria-label={label}
          className="flex h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl text-2xl font-extrabold"
        >
          <Camera aria-hidden="true" className="size-14" />
          {t("scan.openCamera")}
        </Button>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />

      <Button
        type="button"
        variant="outline"
        onClick={async () => {
          if (isNative()) {
            const photo = await nativePickPhoto();
            if (photo) onCapture(photo.dataUrl);
            return;
          }
          fileRef.current?.click();
        }}
        disabled={busy}
        className="tap-target mt-3 w-full border-2 text-lg font-bold"
      >
        <ImageUp aria-hidden="true" className="size-6" />
        {t("scan.upload")}
      </Button>

      {error ? (
        <p role="alert" className="mt-3 rounded-2xl bg-destructive/10 px-4 py-3 text-base font-semibold text-foreground">
          {error}
        </p>
      ) : null}
    </div>
  );
}
