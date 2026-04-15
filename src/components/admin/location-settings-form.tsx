"use client";

import dynamic from "next/dynamic";
import { Loader2, LocateFixed } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { buildMapUrl, formatLocationLabel } from "@/lib/location-display";

const WorksiteMapPicker = dynamic(
  () => import("@/components/admin/worksite-map-picker").then((module) => module.WorksiteMapPicker),
  { ssr: false },
);

type LocationSettingsFormProps = {
  enforceWorksiteRadius: boolean;
  worksiteAddress: string | null;
  worksiteRadiusMeters: number;
  worksiteLatitude: string | null;
  worksiteLongitude: string | null;
};

export function LocationSettingsForm({
  enforceWorksiteRadius,
  worksiteAddress,
  worksiteRadiusMeters,
  worksiteLatitude,
  worksiteLongitude,
}: LocationSettingsFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPending, setSearchPending] = useState(false);
  const [addressValue, setAddressValue] = useState(worksiteAddress ?? "");
  const [latitudeValue, setLatitudeValue] = useState(worksiteLatitude ?? "");
  const [longitudeValue, setLongitudeValue] = useState(worksiteLongitude ?? "");

  const mapUrl = useMemo(() => buildMapUrl(latitudeValue, longitudeValue), [latitudeValue, longitudeValue]);
  const locationLabel = formatLocationLabel(addressValue);
  const numericLatitude = latitudeValue ? Number(latitudeValue) : Number.NaN;
  const numericLongitude = longitudeValue ? Number(longitudeValue) : Number.NaN;
  const hasMapPosition = !Number.isNaN(numericLatitude) && !Number.isNaN(numericLongitude);

  async function handleLocateAddress() {
    if (addressValue.trim().length < 4) {
      setError("Informe um endereco mais completo para localizar no mapa.");
      return;
    }

    setSearchPending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/location-search?q=${encodeURIComponent(addressValue.trim())}`);
      const body = (await response.json()) as {
        suggestion?: { latitude: number; longitude: number } | null;
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "Nao foi possivel localizar o endereco no mapa.");
        return;
      }

      if (!body.suggestion) {
        setError("Nao encontramos esse endereco no mapa. Revise o texto e tente novamente.");
        return;
      }

      setLatitudeValue(String(body.suggestion.latitude));
      setLongitudeValue(String(body.suggestion.longitude));
    } catch {
      setError("Nao foi possivel localizar o endereco no mapa.");
    } finally {
      setSearchPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const body = (await response.json()) as { error?: string };
    setPending(false);

    if (!response.ok) {
      setError(body.error ?? "Nao foi possivel salvar a area permitida.");
      return;
    }

    router.refresh();
  }

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      <label className="flex items-center gap-3 rounded-[1rem] border border-border bg-white/70 px-4 py-3">
        <input type="checkbox" name="enforceWorksiteRadius" defaultChecked={enforceWorksiteRadius} />
        <span className="text-sm font-semibold">Bloquear registro fora da area permitida</span>
      </label>

      <div className="grid gap-4 sm:grid-cols-[1.8fr_0.8fr]">
        <label className="grid gap-2">
          <span className="text-sm font-semibold">Endereco base da empresa</span>
          <div className="relative">
            <input
              type="text"
              name="worksiteAddress"
              value={addressValue}
              onChange={(event) => {
                setAddressValue(event.target.value);
                setLatitudeValue("");
                setLongitudeValue("");
                setError(null);
              }}
              placeholder="Rua, numero, bairro, cidade, UF"
              autoComplete="off"
              className="w-full rounded-[1rem] border border-border bg-white/80 px-4 py-3"
            />
          </div>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-semibold">Raio permitido (m)</span>
          <input
            type="number"
            name="worksiteRadiusMeters"
            min="30"
            max="5000"
            step="10"
            defaultValue={worksiteRadiusMeters}
            className="rounded-[1rem] border border-border bg-white/80 px-4 py-3"
          />
        </label>
      </div>
      <input type="hidden" name="worksiteLatitude" value={latitudeValue} />
      <input type="hidden" name="worksiteLongitude" value={longitudeValue} />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleLocateAddress}
          disabled={searchPending}
          className="inline-flex items-center gap-2 rounded-[1rem] border border-border bg-white px-4 py-3 text-sm font-semibold transition hover:bg-muted/20 disabled:opacity-60"
        >
          {searchPending ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
          {searchPending ? "Localizando..." : "Localizar endereco no mapa"}
        </button>
        <p className="text-xs text-muted">
          Depois de localizar, arraste o marcador para o ponto exato da empresa.
        </p>
      </div>

      {hasMapPosition ? (
        <div className="grid gap-3">
          <WorksiteMapPicker
            latitude={numericLatitude}
            longitude={numericLongitude}
            onPositionChange={(latitude, longitude) => {
              setLatitudeValue(String(latitude));
              setLongitudeValue(String(longitude));
            }}
          />
          <div className="flex items-center justify-between gap-3 rounded-[1rem] border border-border bg-white/80 px-4 py-3 text-sm text-muted">
            <span>{locationLabel ?? "Endereco selecionado"}</span>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-foreground underline underline-offset-4"
              >
                Abrir no mapa
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="rounded-[1rem] border border-border bg-white/70 px-4 py-3 text-sm text-muted">
          <p>Nenhum ponto confirmado ainda. Localize o endereco e ajuste o marcador no mapa antes de salvar.</p>
        </div>
      )}

      {error ? <p className="rounded-[1rem] bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-[1rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong disabled:opacity-60"
      >
        {pending ? "Salvando area..." : "Salvar area permitida"}
      </button>
    </form>
  );
}
