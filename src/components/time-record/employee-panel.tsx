"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type TimeRecord, RecordType } from "@prisma/client";
import { Camera, Clock3, LoaderCircle, CheckCircle2, RotateCcw, MapPin, ShieldCheck, AlertCircle, CalendarDays, ChevronUp, ArrowRightCircle, ArrowLeftCircle, Info } from "lucide-react";
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

  const [coords, setCoords] = useState<GeolocationPosition | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  // Dispara localização imediatamente ao abrir a tela de preview (como era na segunda página)
  useEffect(() => {
    if (previewUrl && !coords && locationState === "IDLE") {
      requestLocation().then(setCoords).catch((err) => {
        // setError handled inside requestLocation via state
      });
    }
  }, [previewUrl, coords, locationState]);

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
          console.warn("Geolocation falhou:", err);
          let msg = "Não foi possivel capturar sua localizacao.";
          if (err.code === 1) msg = "Permissao de localização negada pelo navegador/celular.";
          if (err.code === 2) msg = "Sinal de GPS/Rede indisponível no momento.";
          if (err.code === 3) msg = "Tempo limite excedido ao buscar sinal GPS.";

          setLocationState("ERROR");
          setError(msg);
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 }
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
      setLocationState("IDLE");
      setCoords(null);
    } catch (err) {
      setError("Erro ao processar imagem.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    
    if (locationState === "CAPTURING") {
       setError("Aguarde a captura da localização antes de confirmar.");
       return;
    }

    if (locationState === "ERROR" || !coords) {
       setError("Não foi possível confirmar. A localização é obrigatória.");
       return;
    }

    setIsPending(true);
    setError(null);

    try {
      const position = coords;
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
    setCoords(null);
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
        /* PREVIEW / CONFIRM STATE (ANEXO 2 UI) */
        <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-500">
           {/* DARK HEADER */}
           <div className="rounded-[2.2rem] bg-[#111111] p-6 text-white shadow-[0_20px_50px_rgba(0,0,0,0.2)]">
             <div className="flex items-center justify-between">
               <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-white/50">Status Atual</p>
               <div className="grid size-8 place-items-center rounded-full bg-white/10 text-brand">
                 <Clock3 className="size-4" />
               </div>
             </div>
             
             <h2 className="mt-2 text-xl font-black leading-tight tracking-tight text-white pr-4">
               {canRecord ? `Aguardando ${nextStepLabel?.toLowerCase()}` : "Relógio Sincronizado"}
             </h2>

             <div className="mt-8 flex flex-col items-center justify-center rounded-[1.8rem] bg-white/5 py-6 ring-1 ring-white/10">
               <p className="text-[3.5rem] font-bold leading-none tracking-tighter text-white tabular-nums">
                 {clockLabel}
               </p>
               <p className="mt-2 text-xs font-bold capitalize tracking-wide text-white/60">
                 {todayLabel}
               </p>
             </div>

             <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 ring-1 ring-white/10">
               <div className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
               <p className="text-[0.65rem] font-semibold text-white/50">Horário oficial sincronizado com o servidor</p>
             </div>
           </div>

           {/* ERROR ALERT */}
           {error && (
             <div className="flex items-center gap-3 rounded-[1.2rem] bg-red-50 p-4 text-red-600 ring-1 ring-red-100 mb-2">
                <AlertCircle className="size-5 shrink-0" />
                <p className="text-xs font-bold leading-relaxed">{error}</p>
             </div>
           )}

           {/* PHOTO PREVIEW CARD */}
           <div className="rounded-[2.2rem] bg-white p-4 shadow-xl">
             <div className="relative overflow-hidden rounded-[1.4rem] aspect-[3/4] bg-[#111]">
                <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 bg-black/90 px-5 py-4">
                  <p className="text-xs font-bold text-white tracking-wide">Preview do registro</p>
                </div>
             </div>

             <div className="mt-4 flex gap-3">
                <button
                   onClick={resetFlow}
                   disabled={isPending}
                   className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-black/5 text-foreground transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
                >
                   <RotateCcw className="size-4" />
                   <span className="text-sm font-bold">Refazer</span>
                </button>
                <button
                   onClick={handleSubmit}
                   disabled={isPending}
                   className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171717] text-white transition hover:bg-black active:scale-[0.98] disabled:opacity-50"
                >
                   {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                   <span className="text-sm font-bold tracking-wide">Confirmar</span>
                </button>
             </div>
           </div>

           {/* LOCATION CARD */}
           <div className="flex items-center gap-4 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf8f4] text-muted-foreground ring-1 ring-black/5">
                 <MapPin className="size-5" />
              </div>
              <div>
                 <p className="text-sm font-black text-foreground tracking-tight">Localização Geográfica</p>
                 <p className="text-[0.65rem] font-bold text-muted-foreground/60">
                    {locationState === "CAPTURING" ? "Capturando coordenadas GPS..." : locationState === "SUCCESS" ? "Coordenadas capturadas com sucesso." : "Geolocalização pendente ou bloqueada."}
                 </p>
              </div>
           </div>

           {/* SCHEDULE CARD */}
           <div className="flex items-center gap-4 rounded-[1.5rem] bg-white p-5 shadow-sm ring-1 ring-black/5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#faf8f4] text-muted-foreground ring-1 ring-black/5">
                 <ShieldCheck className="size-5" />
              </div>
              <div>
                 <p className="text-sm font-black text-foreground tracking-tight">Jornada de Trabalho</p>
                 <p className="text-[0.65rem] font-bold text-muted-foreground/60 leading-tight">
                    Auditoria de horário, IP local e dispositivo serão registrados para compliance.
                 </p>
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

          <section className="rounded-[2.2rem] border border-black/5 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-black/5">
              <div className="flex items-center gap-2 text-brand font-black text-sm">
                <CalendarDays className="size-5" />
                <h2>Marcações de hoje</h2>
              </div>
              <ChevronUp className="size-5 text-muted-foreground/40" />
            </div>

            <div className="p-6">
              {timeRecords.length > 0 ? (
                <div className="space-y-6">
                  <div className="relative pl-7 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-black/5">
                    {timeRecords.map((record, idx) => {
                      const isEntry = record.recordType === 'ENTRY' || record.recordType === 'BREAK_IN';
                      const isExit = record.recordType === 'BREAK_OUT' || record.recordType === 'EXIT';
                      
                      let intervalMinutes = null;
                      if (record.recordType === 'BREAK_OUT' && timeRecords[idx + 1]) {
                        intervalMinutes = Math.floor((timeRecords[idx + 1].serverTimestamp.getTime() - record.serverTimestamp.getTime()) / 60000);
                      }

                      return (
                        <div key={record.id} className="relative flex flex-col gap-6">
                           <div className="flex items-center justify-between">
                             {/* Icon Marker */}
                             <div className="absolute -left-[27px] flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white">
                                {isEntry ? (
                                   <ArrowRightCircle className="size-5 text-emerald-500 shadow-sm rounded-full" />
                                ) : (
                                   <ArrowLeftCircle className="size-5 text-red-500 shadow-sm rounded-full opacity-80" />
                                )}
                             </div>
                             
                             <div>
                               <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground/60">
                                 {buildTimelineLabel(record.recordType)}
                               </p>
                               <p className="mt-0.5 text-xl font-black tabular-nums text-foreground">
                                 {formatTime(record.serverTimestamp)}
                               </p>
                             </div>
                             
                             <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-[0.65rem] font-bold text-muted-foreground/70 ring-1 ring-black/5 shadow-sm">
                               <CheckCircle2 className="size-3.5 text-emerald-500" />
                               {record.recordType === 'EXIT' ? "Finalizado" : "Sincronizado"}
                             </div>
                           </div>

                           {/* INTERVAL DISPLAY */}
                           {intervalMinutes !== null && (
                              <div className="flex items-center relative -ml-1">
                                 <div className="rounded-full bg-white px-3 py-1.5 border border-black/5 shadow-sm text-[0.65rem] font-bold text-muted-foreground/60 tracking-wider">
                                    Intervalo de {intervalMinutes} min
                                 </div>
                              </div>
                           )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 space-y-4 pt-6 border-t border-black/5">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-muted-foreground/70">
                           <span className="text-xs font-semibold">Total de horas hoje</span>
                           <Info className="size-3" />
                        </div>
                        <span className="text-sm font-black tabular-nums">
                          {(() => {
                            let total = 0;
                            let entryTime = null;
                            for (const r of timeRecords) {
                              if (r.recordType === 'ENTRY' || r.recordType === 'BREAK_IN') entryTime = r.serverTimestamp;
                              if ((r.recordType === 'BREAK_OUT' || r.recordType === 'EXIT') && entryTime) {
                                total += Math.floor((r.serverTimestamp.getTime() - entryTime.getTime()) / 60000);
                                entryTime = null;
                              }
                            }
                            return `${Math.floor(total/60)}h ${total%60}min`;
                          })()}
                        </span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground/70">Intervalos</span>
                        <span className="text-sm font-bold tabular-nums text-foreground/80">
                          {(() => {
                            let intervalTotal = 0;
                            let exitTime = null;
                            for (const r of timeRecords) {
                              if (r.recordType === 'BREAK_OUT') exitTime = r.serverTimestamp;
                              if (r.recordType === 'BREAK_IN' && exitTime) {
                                intervalTotal += Math.floor((r.serverTimestamp.getTime() - exitTime.getTime()) / 60000);
                                exitTime = null;
                              }
                            }
                            return intervalTotal > 0 ? `${intervalTotal}min` : '--';
                          })()}
                        </span>
                     </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-2xl">
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
