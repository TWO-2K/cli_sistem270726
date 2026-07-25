import type { Agendamento, HorarioDia } from "@/lib/types/db";

export const DIAS_SEMANA = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

export const GRID_START_HORA = 7;
export const GRID_END_HORA = 21;
export const HORA_ALTURA_PX = 64;

export function parseDataParam(data: string | undefined) {
  if (data) {
    const [ano, mes, dia] = data.split("-").map(Number);
    if (ano && mes && dia) {
      return new Date(ano, mes - 1, dia);
    }
  }
  return new Date();
}

export function formatDataParam(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function inicioDoDia(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function fimDoDia(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function inicioDaSemana(date: Date) {
  const d = inicioDoDia(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDias(date: Date, dias: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + dias);
  return d;
}

export function ehMesmoDia(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatRangeLabel(view: "semana" | "dia", ref: Date) {
  if (view === "dia") {
    return ref.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
  const inicio = inicioDaSemana(ref);
  const fim = addDias(inicio, 6);
  const inicioMes = inicio.toLocaleDateString("pt-BR", { month: "long" });
  const fimMes = fim.toLocaleDateString("pt-BR", { month: "long" });
  if (inicio.getMonth() === fim.getMonth()) {
    return `${inicio.getDate()} – ${fim.getDate()} de ${fimMes}`;
  }
  return `${inicio.getDate()} de ${inicioMes} – ${fim.getDate()} de ${fimMes}`;
}

export function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function horarioDoDia(horario: HorarioDia[], dia: Date) {
  return horario[dia.getDay()];
}

export function limitesGrid(horario: HorarioDia[], dias: Date[]) {
  const ativos = dias.map((d) => horarioDoDia(horario, d)).filter((h) => h?.ativo);
  if (ativos.length === 0) {
    return { inicio: GRID_START_HORA, fim: GRID_END_HORA };
  }
  const inicioMin = Math.min(...ativos.map((h) => parseHora(h.inicio)));
  const fimMin = Math.max(...ativos.map((h) => parseHora(h.fim)));
  return {
    inicio: Math.floor(inicioMin / 60),
    fim: Math.max(Math.ceil(fimMin / 60), Math.floor(inicioMin / 60) + 1),
  };
}

export function horaDentroDoExpediente(horario: HorarioDia, hora: number) {
  if (!horario?.ativo) return false;
  const minutos = hora * 60;
  return minutos >= parseHora(horario.inicio) && minutos < parseHora(horario.fim);
}

export const SNAP_MINUTOS = 15;

export function snapMinutos(minutos: number, incremento: number = SNAP_MINUTOS) {
  return Math.round(minutos / incremento) * incremento;
}

export function periodoDentroDoExpediente(
  horario: HorarioDia | undefined,
  inicioMinutos: number,
  duracaoMinutos: number,
) {
  if (!horario?.ativo) return false;
  const fimMinutos = inicioMinutos + duracaoMinutos;
  return (
    inicioMinutos >= parseHora(horario.inicio) &&
    fimMinutos <= parseHora(horario.fim)
  );
}

export const PROFISSIONAL_CORES = [
  "#0ea5e9",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#ef4444",
  "#14b8a6",
  "#eab308",
  "#ec4899",
];

export function corDoProfissional(
  profissionalId: string,
  ordemProfissionais: string[],
): string | undefined {
  const index = ordemProfissionais.indexOf(profissionalId);
  if (index === -1) return undefined;
  return PROFISSIONAL_CORES[index % PROFISSIONAL_CORES.length];
}

export const MAX_COLS_VISIVEIS = 3;

export type EventoLayout =
  | { tipo: "evento"; agendamento: Agendamento; col: number; cols: number }
  | {
      tipo: "resumo";
      agendamentos: Agendamento[];
      col: number;
      cols: number;
      inicioMs: number;
      fimMs: number;
    };

export function layoutEventosDoDia(agendamentos: Agendamento[]): EventoLayout[] {
  const ordenados = [...agendamentos].sort(
    (a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime(),
  );

  const resultado: EventoLayout[] = [];
  let cluster: { ag: Agendamento; inicio: number; fim: number }[] = [];
  let clusterFim = -Infinity;

  function flush() {
    if (cluster.length === 0) return;
    const colunasFim: number[] = [];
    const atribuidos: { item: (typeof cluster)[number]; col: number }[] = [];
    for (const item of cluster) {
      let colocado = false;
      for (let c = 0; c < colunasFim.length; c++) {
        if (colunasFim[c] <= item.inicio) {
          colunasFim[c] = item.fim;
          atribuidos.push({ item, col: c });
          colocado = true;
          break;
        }
      }
      if (!colocado) {
        colunasFim.push(item.fim);
        atribuidos.push({ item, col: colunasFim.length - 1 });
      }
    }
    const totalCols = colunasFim.length;

    if (totalCols <= MAX_COLS_VISIVEIS) {
      for (const a of atribuidos) {
        resultado.push({
          tipo: "evento",
          agendamento: a.item.ag,
          col: a.col,
          cols: totalCols,
        });
      }
    } else {
      const visiveis = atribuidos.filter((a) => a.col < MAX_COLS_VISIVEIS - 1);
      const ocultos = atribuidos.filter((a) => a.col >= MAX_COLS_VISIVEIS - 1);
      for (const a of visiveis) {
        resultado.push({
          tipo: "evento",
          agendamento: a.item.ag,
          col: a.col,
          cols: MAX_COLS_VISIVEIS,
        });
      }
      if (ocultos.length > 0) {
        resultado.push({
          tipo: "resumo",
          agendamentos: ocultos.map((a) => a.item.ag),
          col: MAX_COLS_VISIVEIS - 1,
          cols: MAX_COLS_VISIVEIS,
          inicioMs: Math.min(...ocultos.map((a) => a.item.inicio)),
          fimMs: Math.max(...ocultos.map((a) => a.item.fim)),
        });
      }
    }
    cluster = [];
  }

  for (const ag of ordenados) {
    const inicio = new Date(ag.data_hora).getTime();
    const fim = inicio + ag.duracao_minutos * 60_000;
    if (cluster.length > 0 && inicio >= clusterFim) {
      flush();
      clusterFim = -Infinity;
    }
    cluster.push({ ag, inicio, fim });
    clusterFim = Math.max(clusterFim, fim);
  }
  flush();

  return resultado;
}
