"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type TimeRecord, RecordType } from "@prisma/client";
import { Camera, Clock3, LoaderCircle, CheckCircle2, RotateCcw, MapPin, ShieldCheck, AlertCircle } from "lucide-react";
import { formatTime, buildTimelineLabel } from "@/lib/time";

type EmployeePanelProps = {
  nextStepLabel: string | null;
  timeRecords: TimeRecord[];
  recordHref?: string;
};

async function compressImage(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  canvas.width = Math.round(imageBitmap.width * scale);
  canvas.height = Math.round(imageBitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function EmployeePanel({
  nextStepLabel,
  timeRecords,
}: EmployeePanelProps) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  
  // Dashboard states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; time: string } | null>(null);
  const [locationState, setLocationState] = useState<"IDLE" | "CAPTURING" | "SUCCESS" | "ERROR">("IDLE");

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const todayLabel = useMemo(() => formatLongDate(now), [now]);
  const clockLabel = useMemo(() => formatClock(now), [now]);
  const canRecord = Boolean(nextStepLabel);

  async function requestLocation(): Promise<GeolocationPosition> {
    setLocationState("CAPTURING");
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocationState("ERROR");
        reject(new Error("Geolocalizacao nao suportada."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationState("SUCCESS");
          resolve(position);
        },
        (err) => {
          setLocationState("ERROR");
          reject(new Error("Nao foi possivel capturar sua localizacao."));
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
      );
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsPending(true);
      const compressed = await compressImage(file);
      setSelectedFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
      setError(null);
      setResult(null);
    } catch (err) {
      setError("Erro ao processar imagem.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    
    setIsPending(true);
    setError(null);

    try {
      const position = await requestLocation();
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("latitude", String(position.coords.latitude));
      formData.append("longitude", String(position.coords.longitude));
      formData.append("accuracy", String(position.coords.accuracy));
      formData.append("geoCapturedAt", new Date(position.timestamp).toISOString());
      formData.append("clientTimestamp", new Date().toISOString());
      formData.append("source", window.matchMedia("(display-mode: standalone)").matches ? "PWA" : "BROWSER");

      const response = await fetch("/api/time-records", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Erro ao registrar ponto.");
      }

      setResult({
        label: payload.label ?? "Sucesso",
        time: payload.time ?? "--:--",
      });

      // Auto redirect/reset after success
      setTimeout(() => {
        window.location.reload();
      }, 3500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setIsPending(false);
    }
  }

  function resetFlow() {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setResult(null);
    setLocationState("IDLE");
  }

  function triggerCamera() {
    if (!canRecord || isPending) return;
    document.getElementById("unified-camera-input")?.click();
  }

  return (
    <section className="grid gap-5">
      <input 
        id="unified-camera-input"
        type="file" 
        accept="image/*" 
        capture="user" 
        className="hidden" 
        onChange={handleFileChange}
      />

      {/* SUCCESS STATE */}
      {result ? (
        <div className="flex flex-col items-center justify-center rounded-[2.2rem] border border-black/5 bg-white p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-500">
           <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_20px_40px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="size-12" />
           </div>
           <h2 className="mt-8 text-3xl font-black tracking-tight text-foreground">{result.label}</h2>
           <p className="mt-2 text-5xl font-black text-emerald-600 tabular-nums">{result.time}</p>
           <p className="mt-8 text-sm font-bold text-muted-foreground/60 uppercase tracking-widest">
             Sincronizado com sucesso
           </p>
        </div>
      ) : previewUrl ? (
        /* PREVIEW / CONFIRM STATE */
        <div className="overflow-hidden rounded-[2.2rem] border border-black/5 bg-white shadow-2xl animate-in slide-in-from-bottom-5 duration-500">
           <div className="relative aspect-[3/4] w-full bg-black">
              <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between text-white">
                 <div className="flex flex-col gap-0.5">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest opacity-60">Status</p>
                    <p className="text-sm font-black uppercase tracking-tight">{nextStepLabel}</p>
                 </div>
                 <div className="rounded-full bg-brand/20 px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-brand ring-1 ring-brand/30">
                    Ao Vivo
                 </div>
              </div>
           </div>

           <div className="p-6">
              {error && (
                <div className="mb-6 flex items-center gap-3 rounded-[1.2rem] bg-red-50 p-4 text-red-600 ring-1 ring-red-100">
                   <AlertCircle className="size-5 shrink-0" />
                   <p className="text-xs font-bold leading-relaxed">{error}</p>
                </div>
              )}

              <div className="flex flex-col gap-4">
                 <button
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-[#171717] text-white transition hover:bg-black active:scale-[0.98] disabled:opacity-50"
                 >
                    {isPending ? <LoaderCircle className="size-6 animate-spin" /> : <CheckCircle2 className="size-6" />}
                    <span className="text-lg font-black tracking-tight">Confirmar Registro</span>
                 </button>

                 <button
                    onClick={resetFlow}
                    disabled={isPending}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#fafafa] text-muted-foreground transition hover:bg-gray-100 active:scale-[0.98] disabled:opacity-50"
                 >
                    <RotateCcw className="size-4" />
                    <span className="text-sm font-bold">Tirar outra foto</span>
                 </button>
              </div>

              <div className="mt-8 flex flex-col gap-4 border-t border-black/5 pt-6">
                 <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-muted-foreground ring-1 ring-black/5">
                       <MapPin className="size-5" />
                    </div>
                    <div>
                       <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground/50">Localizaçao</p>
                       <p className="text-xs font-bold text-foreground">
                          {locationState === "CAPTURING" ? "Capturando coordenadas..." : locationState === "SUCCESS" ? "GPS Sincronizado" : "Aguardando confirmaçao"}
                       </p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      ) : (
        /* STANDARD DASHBOARD STATE */
        <>
          <div className="rounded-[2.2rem] border border-black/5 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.2em] text-muted-foreground/60 line-clamp-1">
                {canRecord ? `Aguardando ${nextStepLabel?.toLowerCase()}` : "Relógio Sincronizado"}
              </p>
              <div className="flex h-2 w-2 rounded-full bg-brand animate-pulse" />
            </div>

            <div className="mt-6 flex flex-col items-center justify-center rounded-[1.8rem] bg-[#faf8f4] py-8 text-center ring-1 ring-black/5">
              <p className="text-[4.2rem] font-bold leading-none tracking-tighter text-foreground tabular-nums">
                {clockLabel}
              </p>
              <p className="mt-4 text-xs font-semibold capitalize tracking-wide text-muted-foreground/70">
                {todayLabel}
              </p>
            </div>

            <button
              type="button"
              onClick={triggerCamera}
              disabled={!canRecord || isPending}
              className={`group relative mt-6 flex w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] px-6 py-10 transition-all duration-500 active:scale-[0.97] ${
                canRecord 
                  ? "bg-gradient-to-br from-[#171717] to-[#2a2a2a] text-white shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.25)]" 
                  : "bg-[#f0f0f0] text-muted-foreground/40 cursor-not-allowed"
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent)] opacity-20 transition-opacity group-hover:opacity-40" />
              
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-700 ${
                  canRecord ? "bg-white/10 group-hover:bg-brand group-hover:scale-110" : "bg-gray-200"
                }`}>
                  {isPending ? <LoaderCircle className="size-8 animate-spin text-white" /> : <Camera className={`size-8 ${canRecord ? "text-highlight" : "text-gray-400"}`} />}
                </div>
                <div className="text-center">
                  <span className="block text-[1.6rem] font-black leading-tight tracking-tight">
                    {canRecord ? "Registrar ponto" : "Jornada concluida"}
                  </span>
                  {canRecord && (
                    <span className="mt-2 block text-[0.7rem] font-bold uppercase tracking-widest text-white/40 group-hover:text-white/80">
                      Clique para abrir a câmera agora
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          <section className="rounded-[2.2rem] border border-black/5 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between pb-4 border-b border-black/5">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-brand/5 text-brand">
                  <Clock3 className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-foreground uppercase">Marcações de hoje</h2>
                  <p className="text-[0.65rem] font-bold text-muted-foreground/60">{timeRecords.length} registro(s) realizados</p>
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-emerald-50 text-[0.6rem] font-bold text-emerald-600 uppercase tracking-wider">
                Sincronizado
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {timeRecords.length > 0 ? (
                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-brand/10">
                  {timeRecords.map((record) => (
                    <div key={record.id} className="relative flex items-center justify-between">
                      {/* Dot */}
                      <div className="absolute -left-[19.5px] h-2.5 w-2.5 rounded-full border-2 border-white bg-brand shadow-[0_0_0_2px_rgba(var(--brand-rgb,0,0,0),0.1)]" />
                      
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground/50">
                          {buildTimelineLabel(record.recordType)}
                        </p>
                        <p className="mt-0.5 text-lg font-black tabular-nums text-foreground">
                          {formatTime(record.serverTimestamp)}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2 rounded-xl bg-[#faf8f4] px-3 py-2 text-[0.6rem] font-bold text-muted-foreground/70 ring-1 ring-black/5">
                        <CheckCircle2 className="size-3 text-emerald-500" />
                        {record.recordType === RecordType.EXIT ? "Finalizado" : "Ok"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm font-medium text-muted-foreground/40 italic">Aguardando primeira marcação do dia...</p>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
