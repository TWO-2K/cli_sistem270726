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

export interface EventoLayout {
  agendamento: Agendamento;
  col: number;
  cols: number;
}

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
    const atribuidos: { ag: Agendamento; col: number }[] = [];
    for (const item of cluster) {
      let colocado = false;
      for (let c = 0; c < colunasFim.length; c++) {
        if (colunasFim[c] <= item.inicio) {
          colunasFim[c] = item.fim;
          atribuidos.push({ ag: item.ag, col: c });
          colocado = true;
          break;
        }
      }
      if (!colocado) {
        colunasFim.push(item.fim);
        atribuidos.push({ ag: item.ag, col: colunasFim.length - 1 });
      }
    }
    const cols = colunasFim.length;
    for (const a of atribuidos) {
      resultado.push({ agendamento: a.ag, col: a.col, cols });
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
