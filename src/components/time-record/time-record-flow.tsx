"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { RecordType, type Organization, type TimeRecord, type User, type WorkSchedule, type WorkScheduleDay } from "@prisma/client";
import { Camera, Clock3, LoaderCircle, MapPin, RotateCcw, ShieldCheck } from "lucide-react";

import { recordTypeLabels } from "@/lib/constants";
import { getDayWorkContext } from "@/lib/schedule";

type UserWithContext = User & {
  organization: Organization;
  schedule: (WorkSchedule & {
    weekdays: WorkScheduleDay[];
  }) | null;
  timeRecords: TimeRecord[];
};

type ResultState = {
  label: string;
  time: string;
  photoUrl: string | null;
} | null;

type SubmitErrorCode =
  | "PHOTO_UPLOAD_FAILED"
  | "GEOLOCATION_REQUIRED"
  | "DAY_OFF_BLOCKED"
  | "PHOTO_REQUIRED"
  | "MAX_RECORDS_REACHED"
  | "VALIDATION_ERROR"
  | "UNKNOWN_ERROR"
  | null;

function formatClock(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

async function compressImage(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const maxWidth = 1280;
  const scale = Math.min(1, maxWidth / imageBitmap.width);
  canvas.width = Math.round(imageBitmap.width * scale);
  canvas.height = Math.round(imageBitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    return file;
  }

  context.drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });

  if (!blob) {
    return file;
  }

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
    type: "image/jpeg",
  });
}

export function TimeRecordFlow({ user }: { user: UserWithContext }) {
  const searchParams = useSearchParams();
  const nextType = useMemo(() => {
    const sequence = [RecordType.ENTRY, RecordType.BREAK_OUT, RecordType.BREAK_IN, RecordType.EXIT];
    return sequence[user.timeRecords.length] ?? null;
  }, [user.timeRecords.length]);
  const todayContext = useMemo(() => getDayWorkContext(user.schedule?.weekdays ?? [], new Date()), [user.schedule?.weekdays]);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<SubmitErrorCode>(null);
  const [isPending, setIsPending] = useState(false);
  const [locationState, setLocationState] = useState("Ainda nao capturada.");
  const [now, setNow] = useState(() => new Date());
  const isSecureContextReady =
    typeof window !== "undefined" && (window.isSecureContext || window.location.hostname === "localhost");
  const [didAutoOpenCamera, setDidAutoOpenCamera] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (didAutoOpenCamera || searchParams.get("openCamera") !== "1") {
      return;
    }

    const input = document.getElementById("pointer-camera-input") as HTMLInputElement | null;
    if (!input) {
      return;
    }

    setDidAutoOpenCamera(true);
    const timer = window.setTimeout(() => {
      input.click();
    }, 120);

    return () => window.clearTimeout(timer);
  }, [didAutoOpenCamera, searchParams]);

  async function requestLocation() {
    if (!isSecureContextReady) {
      throw new Error("No celular, o registro de ponto precisa de um link HTTPS para liberar localização e câmera com segurança.");
    }

    if (!navigator.geolocation) {
      throw new Error("Seu navegador nao suporta geolocalizacao.");
    }

    setLocationState("Capturando localizacao...");

    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocationState("Localizacao pronta para envio.");
          resolve(position);
        },
        () => {
          setLocationState("Falha ao capturar localizacao.");
          reject(new Error("Nao foi possivel capturar sua localizacao."));
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        },
      );
    });
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      return;
    }

    const compressed = await compressImage(file);
    setSelectedFile(compressed);
    setPreviewUrl(URL.createObjectURL(compressed));
    setResult(null);
    setError(null);
    setErrorCode(null);
  }

  async function handleSubmit() {
    setError(null);
    setErrorCode(null);
    setResult(null);

    if (!selectedFile) {
      setError("Tire uma foto antes de continuar.");
      return;
    }

    setIsPending(true);

    try {
      const position = await requestLocation();
      const formData = new FormData();
      formData.append("photo", selectedFile);
      formData.append("latitude", String(position.coords.latitude));
      formData.append("longitude", String(position.coords.longitude));
      formData.append("accuracy", String(position.coords.accuracy));
      formData.append("geoCapturedAt", new Date(position.timestamp).toISOString());
      formData.append("clientTimestamp", new Date().toISOString());
      formData.append(
        "source",
        window.matchMedia("(display-mode: standalone)").matches ? "PWA" : "BROWSER",
      );

      const response = await fetch("/api/time-records", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        error?: string;
        code?: SubmitErrorCode;
        success?: boolean;
        label?: string;
        time?: string;
      };

      if (!response.ok) {
        setErrorCode(payload.code ?? "UNKNOWN_ERROR");
        throw new Error(payload.error ?? "Nao foi possivel registrar o ponto.");
      }

      setResult({
        label: payload.label ?? "Marcacao registrada",
        time: payload.time ?? "--:--",
        photoUrl: previewUrl,
      });
    } catch (submitError) {
      if (!errorCode && submitError instanceof Error && submitError.message.includes("HTTPS")) {
        setErrorCode("VALIDATION_ERROR");
      }
      setError(submitError instanceof Error ? submitError.message : "Erro inesperado.");
    } finally {
      setIsPending(false);
    }
  }

  const nextStatusLabel = nextType ? `Aguardando ${recordTypeLabels[nextType].toLowerCase()}` : "Jornada concluida";
  const dateLabel = useMemo(() => formatLongDate(now), [now]);
  const clockLabel = useMemo(() => formatClock(now), [now]);
  const canRecord = nextType && isSecureContextReady;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      {/* Header com Relógio */}
      <section className="rounded-[2.5rem] border border-black/5 bg-[#161616] p-6 text-white shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-white/50">Status Atual</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{nextStatusLabel}</h1>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
            <Clock3 className="size-5 text-highlight" />
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-center py-4">
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-highlight/10 blur-2xl animate-pulse" />
            <p className="relative text-[4.5rem] font-bold leading-none tracking-tighter text-white">
              {clockLabel}
            </p>
          </div>
          <p className="mt-4 text-base font-medium capitalize text-white/60">{dateLabel}</p>
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-white/5 p-4">
          <div className="flex h-2 w-2 rounded-full bg-highlight animate-pulse" />
          <p className="text-xs font-medium text-white/70">Horário oficial sincronizado com o servidor</p>
        </div>
      </section>

      {/* Alerta de Segurança/Contexto */}
      {!isSecureContextReady && (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex gap-3">
            <ShieldCheck className="size-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900">Acesso seguro necessário</p>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Para capturar foto e localização, utilize um link HTTPS ou instale o PWA no seu dispositivo.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Área de Registro / Preview */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-black/5 bg-white p-6 shadow-[0_20px_40px_rgba(0,0,0,0.04)]">
        <input 
          id="pointer-camera-input" 
          type="file" 
          accept="image/*" 
          capture="user" 
          className="hidden" 
          onChange={handleFileChange} 
        />

        {!previewUrl && !result ? (
          <div className="flex flex-col items-center py-4">
            <button
              type="button"
              onClick={() => document.getElementById("pointer-camera-input")?.click()}
              disabled={!canRecord}
              className="group relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-brand to-[#4a3aff] p-8 text-white shadow-[0_15px_35px_rgba(var(--brand-rgb,0,0,0),0.3)] transition-all duration-300 hover:scale-105 active:scale-95 disabled:scale-100 disabled:opacity-40"
            >
              <div className="absolute inset-0 rounded-full bg-brand animate-ping opacity-20 group-hover:hidden" />
              <div className="flex flex-col items-center gap-2">
                <Camera className="size-12 drop-shadow-md" />
                <span className="text-sm font-bold uppercase tracking-widest">Registrar</span>
              </div>
            </button>
            <p className="mt-8 text-center text-sm font-medium text-muted-foreground">
              Toque no botão acima para abrir a câmera <br /> e registrar sua foto.
            </p>
          </div>
        ) : previewUrl && !result ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[2rem] border-4 border-white shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Foto da batida" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <p className="text-sm font-medium text-white">Preview do registro</p>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white py-4 font-bold text-muted-foreground transition hover:bg-gray-50 active:scale-95"
              >
                <RotateCcw className="size-4" />
                Refazer
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-bold text-white shadow-lg transition hover:bg-brand-strong active:scale-95 disabled:opacity-50"
              >
                {isPending ? <LoaderCircle className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
                Confirmar
              </button>
            </div>
          </div>
        ) : result ? (
          <div className="py-2 animate-in slide-in-from-bottom-4 duration-500">
            <div className="rounded-[2rem] bg-emerald-50 px-6 py-8 text-center ring-1 ring-emerald-100">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-200">
                <ShieldCheck className="size-8" />
              </div>
              <h2 className="mt-6 text-2xl font-bold text-emerald-900">{result.label}</h2>
              <p className="mt-2 text-base font-medium text-emerald-700">Registrado com sucesso às {result.time}</p>
              
              {result.photoUrl && (
                <div className="mt-6 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={result.photoUrl} alt="Confirmado" className="h-40 w-40 rounded-3xl border-4 border-white object-cover shadow-md" />
                </div>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="mt-8 w-full rounded-2xl border border-emerald-200 bg-white py-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50"
              >
                Voltar ao Início
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Info Cards */}
      {!result && (
        <section className="grid gap-3">
          <div className="flex items-center gap-4 rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/5 text-brand">
              <MapPin className="size-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Localização Geográfica</p>
              <p className="text-xs font-medium text-muted-foreground">{locationState}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/5 text-brand">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Jornada de Trabalho</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {todayContext.isWorkingDay
                    ? `Sua jornada: ${todayContext.label} (${todayContext.expectedBreakMinutes}min de intervalo).`
                    : "Hoje é seu dia de folga. Registros só em carater excepcional."}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {error && !result && (
        <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-100">
          <p className="text-xs font-bold uppercase tracking-wider text-red-800">Erro no Registro</p>
          <p className="mt-1 text-sm font-medium text-red-700">{error}</p>
          {errorCode && (
            <p className="mt-2 text-xs text-red-600/70">Código do erro: {errorCode}</p>
          )}
        </div>
      )}
    </div>
  );
}

