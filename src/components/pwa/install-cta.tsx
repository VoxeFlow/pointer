"use client";

import { useState } from "react";
import { Download, Share2, X } from "lucide-react";

import { useInstallPrompt } from "@/hooks/use-install-prompt";

export function InstallCTA({ standaloneOnly = true }: { standaloneOnly?: boolean }) {
  const { deferredPrompt, dismissed, dismiss, installed, platform, isSafari } = useInstallPrompt();
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (installed && standaloneOnly) {
    return null;
  }

  if (dismissed && standaloneOnly) {
    return null;
  }

  async function handleInstall() {
    if (showIosTutorial) {
      setShowIosSteps(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
  }

  const showAndroidPrompt = platform === "android" && Boolean(deferredPrompt);
  const showIosTutorial = platform === "ios" && isSafari && !installed;

  if (!showAndroidPrompt && !showIosTutorial && standaloneOnly) {
    return null;
  }

  return (
    <section className="glass rounded-[1.75rem] border border-black/5 bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-highlight">Instalar app</p>
          <h2 className="mt-2 text-xl font-semibold">
            {showAndroidPrompt ? "Instalar Pointer" : "Colocar na tela inicial"}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {showAndroidPrompt
              ? "Tenha acesso rápido direto da tela inicial."
              : "No iPhone, o botão abaixo abre um guia curto para adicionar o app à tela inicial."}
          </p>
        </div>

        {standaloneOnly ? (
          <button onClick={dismiss} className="rounded-full border border-border p-2 text-muted" aria-label="Dispensar">
            <X className="size-4" />
          </button>
        ) : null}
      </div>

        {showAndroidPrompt ? (
          <button
            onClick={handleInstall}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong"
          >
            <Download className="size-4" />
            Instalar app
        </button>
        ) : null}

      {showIosTutorial ? (
        <>
          <button
            onClick={handleInstall}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-brand px-4 py-4 font-semibold text-white transition hover:bg-brand-strong"
          >
            <Share2 className="size-4" />
            Ver como instalar
          </button>

          {showIosSteps ? (
            <div className="mt-4 grid gap-3 rounded-[1.4rem] border border-border bg-[#faf8f4] p-4">
              <p className="text-sm font-semibold">No iPhone, faça assim:</p>
              {[
                "Toque no botão Compartilhar do Safari.",
                "Escolha Adicionar à Tela de Início.",
                "Confirme para abrir o Pointer como app.",
              ].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-[1rem] border border-border/70 bg-white p-3">
                  <div className="grid size-8 place-items-center rounded-full bg-[#f5efe1] font-semibold text-brand">
                    {index === 0 ? <Share2 className="size-4" /> : index + 1}
                  </div>
                  <p className="text-sm text-muted">{step}</p>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
