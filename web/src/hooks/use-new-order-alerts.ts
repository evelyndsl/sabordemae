import { useCallback, useEffect, useRef, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import {
  isAudioReady,
  playNewOrderSound,
  unlockAudio,
} from "@/lib/alert-sound";
import { api } from "@/lib/api";
import { encontrarNovos } from "@/lib/novos-pedidos";
import type { PedidoAdmin } from "@/types/types";

const SOUND_KEY = "saborDeMae:somNovoPedido";
const POLL_MS = 20_000;
const MAX_ALERTS = 5;
/** Tempo que o aviso fica na tela antes de sumir sozinho. */
export const ALERT_VISIBLE_MS = 10_000;

function readSoundPref() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "0"; // ligado por padrão
  } catch {
    return true;
  }
}

/**
 * Consulta os pedidos a cada 20 s e, quando aparece um código novo, toca o som e guarda o aviso.
 * A primeira consulta só "memoriza" os pedidos que já existem (não toca nada).
 */
export function useNewOrderAlerts() {
  const [soundOn, setSoundOn] = useState(readSoundPref);
  const [locked, setLocked] = useState(() => !isAudioReady());
  const [alerts, setAlerts] = useState<PedidoAdmin[]>([]);
  const vistos = useRef<Set<string> | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  const pedidos = useFetch(() => api.pedidosAdmin(), [], POLL_MS);

  const clearTimer = useCallback((codigo: string) => {
    const t = timers.current.get(codigo);
    if (t !== undefined) clearTimeout(t);
    timers.current.delete(codigo);
  }, []);

  const dismiss = useCallback(
    (codigo: string) => {
      clearTimer(codigo);
      setAlerts((prev) => prev.filter((p) => p.codigo !== codigo));
    },
    [clearTimer],
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    setAlerts([]);
  }, []);

  // Ao sair do painel, nenhum timer fica pendente.
  useEffect(() => {
    const ativos = timers.current;
    return () => {
      ativos.forEach(clearTimeout);
      ativos.clear();
    };
  }, []);

  useEffect(() => {
    const lista = pedidos.data;
    if (!lista) return;

    if (vistos.current === null) {
      vistos.current = new Set(lista.map((p) => p.codigo));
      return;
    }

    const novos = encontrarNovos(vistos.current, lista);
    if (novos.length === 0) return;

    for (const p of novos) {
      vistos.current.add(p.codigo);
      // Cada aviso some sozinho depois de 10 s, contados a partir de quando ele chegou.
      timers.current.set(
        p.codigo,
        setTimeout(() => dismiss(p.codigo), ALERT_VISIBLE_MS),
      );
    }
    setAlerts((prev) => [...novos, ...prev].slice(0, MAX_ALERTS));
    if (soundOnRef.current) setLocked(!playNewOrderSound());
  }, [pedidos.data, dismiss]);

  // O primeiro clique ou tecla na página libera o áudio (regra dos navegadores).
  useEffect(() => {
    function liberar() {
      unlockAudio();
      setLocked(!isAudioReady());
    }
    window.addEventListener("pointerdown", liberar);
    window.addEventListener("keydown", liberar);
    return () => {
      window.removeEventListener("pointerdown", liberar);
      window.removeEventListener("keydown", liberar);
    };
  }, []);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "1" : "0");
    } catch {
      /* preferência vale só até recarregar */
    }
    if (next) {
      unlockAudio();
      setLocked(!playNewOrderSound(1)); // uma batida só, para confirmar
    }
  }, []);

  return { soundOn, locked, alerts, toggleSound, dismiss, dismissAll };
}
