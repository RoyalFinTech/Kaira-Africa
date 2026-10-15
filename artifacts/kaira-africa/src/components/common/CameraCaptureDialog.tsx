import { useEffect, useRef, useState } from "react";
import { Camera, Check, LoaderCircle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void | Promise<void>;
  title?: string;
  description?: string;
};

export function CameraCaptureDialog({
  open, onOpenChange, onCapture, title = "Take a photo",
  description = "Allow camera access, centre the subject, then capture the image.",
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCameraError(null);
    setCameraReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("This browser cannot open a live camera. Allow camera access in a secure browser, or use Upload from device.");
      return;
    }
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 1280 } },
      audio: false,
    }).then((stream) => {
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        void video.play().catch(() => setCameraError("The camera opened, but the preview could not start. Check browser camera permission and try again."));
      }
    }).catch((error: unknown) => {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setCameraError("Camera permission was denied. Allow camera access for this site in your browser settings, then try again.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setCameraError("No compatible camera was found on this device. You can still upload a photo from your device.");
      } else if (name === "NotReadableError" || name === "AbortError") {
        setCameraError("The camera may already be in use by another app. Close other camera apps and try again.");
      } else {
        setCameraError("We could not open your camera. Check device permission and try again, or upload a photo instead.");
      }
    });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
    };
  }, [open]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || capturing) return;
    setCapturing(true);
    try {
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare this photo. Please try again.");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("The camera photo could not be encoded.")),
        "image/jpeg", 0.88,
      ));
      const file = new File([blob], `kaira-camera-${Date.now()}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
      onOpenChange(false);
      await onCapture(file);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "The photo could not be captured. Please try again.");
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Camera className="h-5 w-5 text-primary" />{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="overflow-hidden rounded-xl border bg-slate-950">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onPlaying={() => { setCameraReady(true); setCameraError(null); }}
            aria-label="Live camera preview"
            className="max-h-[55vh] min-h-64 w-full object-contain"
          />
          {!cameraReady && (
            <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center text-white">
              {cameraError ? <Camera className="h-9 w-9 text-white/60" /> : <LoaderCircle className="h-8 w-8 animate-spin text-white/80" />}
              <p className="max-w-sm text-sm leading-6 text-white/80">{cameraError || "Connecting to your camera… Please allow access if your browser asks."}</p>
              {cameraError && <Button type="button" variant="secondary" onClick={() => { setCameraError(null); onOpenChange(false); }}><X className="mr-2 h-4 w-4" />Close camera</Button>}
            </div>
          )}
        </div>
        {cameraError && cameraReady && <p role="alert" className="text-sm text-destructive">{cameraError}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}><X className="mr-2 h-4 w-4" />Cancel</Button>
          <Button type="button" onClick={capture} disabled={!cameraReady || capturing}>
            {capturing ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {capturing ? "Capturing…" : "Capture photo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
