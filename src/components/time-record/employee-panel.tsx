"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type TimeRecord } from "@prisma/client";
import { Camera, Clock3, LoaderCircle, CheckCircle2, RotateCcw, MapPin, ShieldCheck, AlertCircle, CalendarDays, ChevronUp, ArrowRightCircle, ArrowLeftCircle, Info, BellRing } from "lucide-react";
import { getOperationalConsentSections } from "@/lib/consent";
import { formatTime, buildTimelineLabel, getRealtimeAttendanceIssue } from "@/lib/time";
import { formatMinutes } from "@/lib/utils";

type WorkScheduleSnapshot = {
  lateToleranceMinutes: number;
  weekdays: Array<{
    weekday: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    isWorkingDay: boolean;
    startTime: string | null;
    endTime: string | null;
    breakMinMinutes: number;
    dailyWorkloadMinutes: number;
  }>;
};

type EmployeePanelProps = {
  nextStepLabel: string | null;
  timeRecords: TimeRecord[];
  workSchedule?: WorkScheduleSnapshot | null;
  webPushPublicKey?: string | null;
  recordHref?: string;
  deviceConsentActive?: boolean;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

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
  workSchedule,
  webPushPublicKey,
  deviceConsentActive = false,
}: EmployeePanelProps) {
  const [now, setNow] = useState(() => new Date());
  
  // Dashboard states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; time: string } | null>(null);
  const [locationState, setLocationState] = useState<"IDLE" | "CAPTURING" | "SUCCESS" | "ERROR">("IDLE");
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPending, setPushPending] = useState(false);
  const [consentActive, setConsentActive] = useState(deviceConsentActive);
  const [consentModalOpen, setConsentModalOpen] = useState(!deviceConsentActive);
  const [consentPending, setConsentPending] = useState(false);

  const [coords, setCoords] = useState<GeolocationPosition | null>(null);
  const locationPromiseRef = useRef<Promise<GeolocationPosition> | null>(null);
  const lastNotificationKeyRef = useRef<string | null>(null);

  async function reportClientFailure(input: {
    stage: string;
    code?: string;
    message?: string;
    details?: Record<string, unknown>;
  }) {
    try {
      await fetch("/api/time-records/failure", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
        keepalive: true,
      });
    } catch {
      // Falha de telemetria nunca deve quebrar o fluxo principal do registro.
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const todayLabel = useMemo(() => formatLongDate(now), [now]);
  const clockLabel = useMemo(() => formatClock(now), [now]);
  const canRecord = Boolean(nextStepLabel);
  const canUseNotifications = typeof window !== "undefined" && "Notification" in window;
  const canUsePush =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(webPushPublicKey);
  const attendanceIssue = useMemo(
    () => getRealtimeAttendanceIssue(timeRecords, workSchedule, now),
    [now, timeRecords, workSchedule],
  );

  useEffect(() => {
    setConsentActive(deviceConsentActive);
    setConsentModalOpen(!deviceConsentActive);
  }, [deviceConsentActive]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return;
    }

    setNotificationPermission(Notification.permission);
  }, []);

  useEffect(() => {
    if (!canUsePush || notificationPermission !== "granted") {
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        setPushEnabled(Boolean(subscription));
      })
      .catch(() => undefined);
  }, [canUsePush, notificationPermission]);

  useEffect(() => {
    if (!attendanceIssue || notificationPermission !== "granted" || typeof window === "undefined") {
      return;
    }

    const notificationKey = `${attendanceIssue.code}:${new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Sao_Paulo",
    }).format(now)}`;

    if (lastNotificationKeyRef.current === notificationKey) {
      return;
    }

    const storageKey = `pointer-reminder-${notificationKey}`;
    const lastShown = window.localStorage.getItem(storageKey);

    if (lastShown) {
      lastNotificationKeyRef.current = notificationKey;
      return;
    }

    lastNotificationKeyRef.current = notificationKey;
    window.localStorage.setItem(storageKey, String(Date.now()));

    navigator.serviceWorker?.ready
      .then((registration) =>
        registration.showNotification(`Pointer: ${attendanceIssue.title}`, {
          body: attendanceIssue.description,
          tag: notificationKey,
          icon: "/brand/logo-simples.png",
          badge: "/brand/logo-simples.png",
          data: { href: "/employee" },
        }),
      )
      .catch(() => undefined);
  }, [attendanceIssue, notificationPermission, now]);

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);

    if (permission !== "granted" || !canUsePush || !webPushPublicKey) {
      return;
    }

    try {
      setPushPending(true);
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(webPushPublicKey),
        });
      }

      const response = await fetch("/api/push/subscription", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        throw new Error("Nao foi possivel ativar os lembretes push.");
      }

      setPushEnabled(true);
    } catch {
      setError("Nao foi possivel ativar os lembretes do app neste dispositivo.");
    } finally {
      setPushPending(false);
    }
  }

  async function requestLocation(): Promise<GeolocationPosition> {
    if (locationPromiseRef.current) {
      return locationPromiseRef.current;
    }

    setLocationState("CAPTURING");
    setError(null);

    const locationPromise = new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        setLocationState("ERROR");
        locationPromiseRef.current = null;
        void reportClientFailure({
          stage: "geolocation_init",
          code: "UNSUPPORTED",
          message: "Geolocalizacao nao suportada pelo navegador.",
        });
        reject(new Error("Geolocalizacao nao suportada."));
        return;
      }

      const fallbackTimeout = window.setTimeout(() => {
        setLocationState("ERROR");
        setError("Nao foi possivel obter sua localizacao a tempo. Tente novamente em local com sinal melhor.");
        locationPromiseRef.current = null;
        void reportClientFailure({
          stage: "geolocation_timeout",
          code: "TIMEOUT",
          message: "Nao foi possivel obter sua localizacao a tempo.",
        });
        reject(new Error("Nao foi possivel obter sua localizacao a tempo. Tente novamente em local com sinal melhor."));
      }, 12000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.clearTimeout(fallbackTimeout);
          setLocationState("SUCCESS");
          setCoords(position);
          locationPromiseRef.current = null;
          resolve(position);
        },
        (err) => {
          window.clearTimeout(fallbackTimeout);
          console.warn("Geolocation falhou:", err);
          let msg = "Não foi possivel capturar sua localizacao.";
          if (err.code === 1) msg = "Permissao de localização negada pelo navegador/celular.";
          if (err.code === 2) msg = "Sinal de GPS/Rede indisponível no momento.";
          if (err.code === 3) msg = "Tempo limite excedido ao buscar sinal GPS.";

          setLocationState("ERROR");
          setError(msg);
          locationPromiseRef.current = null;
          void reportClientFailure({
            stage: "geolocation_error",
            code: `GEO_${err.code}`,
            message: msg,
            details: {
              geolocationCode: err.code,
            },
          });
          reject(new Error(msg));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });

    locationPromiseRef.current = locationPromise;
    return locationPromise;
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
      locationPromiseRef.current = null;
    } catch {
      setError("Erro ao processar imagem.");
      void reportClientFailure({
        stage: "image_processing",
        code: "IMAGE_PROCESSING_FAILED",
        message: "Erro ao processar imagem antes do envio.",
      });
    } finally {
      setIsPending(false);
    }
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    if (!consentActive) {
      setConsentModalOpen(true);
      setError("Antes de registrar ponto, confirme o termo de uso do celular no app.");
      return;
    }

    setIsPending(true);
    setError(null);

    try {
      const position = coords ?? await requestLocation();
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
        if (payload?.code === "UNKNOWN_ERROR") {
          void reportClientFailure({
            stage: "submit_response",
            code: payload?.code,
            message: payload?.error ?? "Erro desconhecido ao registrar ponto.",
          });
        }
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
      const message = err instanceof Error ? err.message : "Erro inesperado.";
      setError(message);
      if (!message.includes("localizacao") && !message.includes("GPS")) {
        void reportClientFailure({
          stage: "submit_runtime",
          code: "SUBMIT_FAILED",
          message,
        });
      }
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
    locationPromiseRef.current = null;
  }

  async function handleConsent(accepted: boolean) {
    setConsentPending(true);
    setError(null);

    try {
      const response = await fetch("/api/employee/device-consent", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ accepted }),
      });

      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel atualizar o consentimento.");
        return;
      }

      setConsentActive(accepted);
      setConsentModalOpen(!accepted);
      if (accepted) {
        setError(null);
      }
    } catch {
      setError("Nao foi possivel atualizar o consentimento.");
    } finally {
      setConsentPending(false);
    }
  }

  return (
    <section className="grid gap-5">
      {consentModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-muted">Consentimento</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
              Uso do celular para registrar ponto
            </h2>
            <p className="mt-3 text-sm text-muted">
              Para continuar usando o Pointer no seu aparelho, confirme o termo abaixo.
            </p>

            <div className="mt-5 max-h-[55vh] overflow-y-auto rounded-[1.25rem] border border-border bg-[#faf8f4] p-4">
              <div className="grid gap-4 text-sm leading-relaxed text-foreground">
                {getOperationalConsentSections().map((section) => (
                  <div key={section.title}>
                    <p className="font-semibold">{section.title}</p>
                    <ul className="mt-2 grid gap-2 text-muted-foreground">
                      {section.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="text-xs text-muted">
                  A autorização opcional de uso de imagem para divulgação pode ser revista depois em <strong>Mais</strong>.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={consentPending}
                onClick={() => handleConsent(true)}
                className="flex-1 rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
              >
                {consentPending ? "Confirmando..." : "Li e concordo"}
              </button>
              <button
                type="button"
                disabled={consentPending}
                onClick={() => setConsentModalOpen(false)}
                className="flex-1 rounded-[1rem] border border-border bg-white px-4 py-4 font-semibold text-foreground transition hover:bg-muted/20 disabled:opacity-60"
              >
                Agora nao
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
        <div className="animate-in fade-in zoom-in duration-300">
          <div className="overflow-hidden rounded-[2.2rem] border border-black/5 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.08)]">
            <div className="bg-[#171717] px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/18 text-emerald-400 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="size-6" />
                </div>
                <div>
                  <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/55">
                    Registro confirmado
                  </p>
                  <h2 className="mt-1 text-xl font-black tracking-tight text-white">{result.label}</h2>
                </div>
              </div>
            </div>

            <div className="px-6 py-8 text-center">
              <p className="text-[4.2rem] font-black leading-none tracking-[-0.06em] text-foreground tabular-nums">
                {result.time}
              </p>
              <p className="mt-4 text-sm font-medium text-muted-foreground">
                Horário validado pelo servidor
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f6f4ee] px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground/75">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Fechando automaticamente
              </div>
            </div>
          </div>
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
                   disabled={isPending || !consentActive}
                   className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#171717] text-white transition hover:bg-black active:scale-[0.98] disabled:opacity-50"
                >
                   {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                   <span className="text-sm font-bold tracking-wide">
                     {isPending ? "Confirmando..." : locationState === "CAPTURING" ? "Aguardando GPS..." : "Confirmar"}
                   </span>
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
                    {locationState === "CAPTURING"
                      ? "Capturando coordenadas GPS..."
                      : locationState === "SUCCESS"
                        ? "Coordenadas capturadas com sucesso."
                        : locationState === "ERROR"
                          ? "Falha ao capturar localizacao."
                          : "A localizacao sera validada ao confirmar."}
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
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.78rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/65">
                STATUS: <span className="font-black text-foreground">{canRecord ? `AGUARDANDO ${nextStepLabel?.toUpperCase()}` : "JORNADA CONCLUÍDA"}</span>
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

            {attendanceIssue ? (
              <div className={`mt-5 rounded-[1.5rem] border px-4 py-4 ${
                attendanceIssue.severity === "critical"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-amber-200 bg-amber-50 text-amber-800"
              }`}>
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-5 shrink-0" />
                  <div>
                    <p className="text-sm font-black">{attendanceIssue.title}</p>
                    <p className="mt-1 text-sm leading-relaxed">{attendanceIssue.description}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {notificationPermission !== "granted" || !pushEnabled ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-[1.25rem] border border-black/5 bg-[#faf8f4] px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-foreground">Lembretes do app</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ative notificações para receber alertas mesmo com o app fechado. No iPhone, instale o Pointer na Tela de Início.
                  </p>
                </div>
                {canUseNotifications && canUsePush ? (
                  <button
                    type="button"
                    onClick={enableNotifications}
                    disabled={pushPending}
                    className="inline-flex items-center gap-2 rounded-full bg-[#171717] px-4 py-2 text-xs font-bold text-white transition hover:bg-black disabled:opacity-60"
                  >
                    {pushPending ? <LoaderCircle className="size-4 animate-spin" /> : <BellRing className="size-4" />}
                    {pushPending ? "Ativando" : "Ativar"}
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">Indisponível</span>
                )}
              </div>
            ) : null}

            <label
              htmlFor={canRecord && !isPending && consentActive ? "unified-camera-input" : undefined}
              onClick={(event) => {
                if (!consentActive) {
                  event.preventDefault();
                  setConsentModalOpen(true);
                }
              }}
              className={`group relative mt-6 flex w-full flex-col items-center justify-center overflow-hidden rounded-[2.2rem] px-6 py-10 text-center transition-all duration-500 active:scale-[0.97] select-none ${
                canRecord 
                  ? "bg-gradient-to-br from-[#171717] to-[#2a2a2a] text-white shadow-[0_25px_60px_rgba(0,0,0,0.2)] hover:shadow-[0_30px_70px_rgba(0,0,0,0.25)]" 
                  : "bg-[#f0f0f0] text-muted-foreground/40 cursor-not-allowed"
              } ${isPending ? "pointer-events-none opacity-60" : "cursor-pointer"} ${!consentActive ? "ring-2 ring-brand/30" : ""}`}
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
                </div>
              </div>
            </label>

            {!consentActive ? (
              <p className="mt-3 text-center text-sm font-medium text-danger">
                Confirme o termo de uso do celular para liberar o registro de ponto neste aparelho.
              </p>
            ) : null}
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
                                    Intervalo de {formatMinutes(intervalMinutes)}
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
                            return intervalTotal > 0 ? formatMinutes(intervalTotal) : '--';
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
