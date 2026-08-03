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
export const MIN_COL_PX = 120;

// Brasil não observa horário de verão desde 2019; America/Sao_Paulo é sempre UTC-3.
// Por isso o offset abaixo é fixo, sem precisar de Intl/tz database para converter.
const OFFSET_MS_SAO_PAULO = 3 * 60 * 60 * 1000;

// Extrai ano/mês/dia/hora/minuto de um instante como se estivessem em America/Sao_Paulo,
// independente do fuso horário do processo (servidor ou navegador) que executa o código.
export function componentesEmSaoPaulo(date: Date) {
  const deslocado = new Date(date.getTime() - OFFSET_MS_SAO_PAULO);
  return {
    ano: deslocado.getUTCFullYear(),
    mes: deslocado.getUTCMonth() + 1,
    dia: deslocado.getUTCDate(),
    hora: deslocado.getUTCHours(),
    minuto: deslocado.getUTCMinutes(),
  };
}

// Constrói o instante (UTC) correspondente a um horário de parede em America/Sao_Paulo.
export function instanteSaoPaulo(
  ano: number,
  mes: number,
  dia: number,
  hora = 0,
  minuto = 0,
  segundo = 0,
  ms = 0,
) {
  return new Date(
    Date.UTC(ano, mes - 1, dia, hora, minuto, segundo, ms) + OFFSET_MS_SAO_PAULO,
  );
}

export function diaDaSemanaEmSaoPaulo(ano: number, mes: number, dia: number) {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

export function parseDataParam(data: string | undefined) {
  if (data) {
    const [ano, mes, dia] = data.split("-").map(Number);
    if (ano && mes && dia) {
      return instanteSaoPaulo(ano, mes, dia);
    }
  }
  const agora = componentesEmSaoPaulo(new Date());
  return instanteSaoPaulo(agora.ano, agora.mes, agora.dia);
}

export function formatDataParam(date: Date) {
  const { ano, mes, dia } = componentesEmSaoPaulo(date);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export function inicioDoDia(date: Date) {
  const { ano, mes, dia } = componentesEmSaoPaulo(date);
  return instanteSaoPaulo(ano, mes, dia, 0, 0, 0, 0);
}

export function fimDoDia(date: Date) {
  const { ano, mes, dia } = componentesEmSaoPaulo(date);
  return instanteSaoPaulo(ano, mes, dia, 23, 59, 59, 999);
}

export function inicioDaSemana(date: Date) {
  const { ano, mes, dia } = componentesEmSaoPaulo(date);
  return addDias(
    instanteSaoPaulo(ano, mes, dia),
    -diaDaSemanaEmSaoPaulo(ano, mes, dia),
  );
}

export function addDias(date: Date, dias: number) {
  const { ano, mes, dia } = componentesEmSaoPaulo(date);
  const base = new Date(Date.UTC(ano, mes - 1, dia));
  base.setUTCDate(base.getUTCDate() + dias);
  return instanteSaoPaulo(
    base.getUTCFullYear(),
    base.getUTCMonth() + 1,
    base.getUTCDate(),
  );
}

export function ehMesmoDia(a: Date, b: Date) {
  const ca = componentesEmSaoPaulo(a);
  const cb = componentesEmSaoPaulo(b);
  return ca.ano === cb.ano && ca.mes === cb.mes && ca.dia === cb.dia;
}

export function formatRangeLabel(view: "semana" | "dia", ref: Date) {
  const TIMEZONE = "America/Sao_Paulo";
  if (view === "dia") {
    return ref.toLocaleDateString("pt-BR", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
    });
  }
  const inicio = inicioDaSemana(ref);
  const fim = addDias(inicio, 6);
  const { mes: mesInicio, dia: diaInicio } = componentesEmSaoPaulo(inicio);
  const { mes: mesFim, dia: diaFim } = componentesEmSaoPaulo(fim);
  const inicioMes = inicio.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    month: "long",
  });
  const fimMes = fim.toLocaleDateString("pt-BR", {
    timeZone: TIMEZONE,
    month: "long",
  });
  if (mesInicio === mesFim) {
    return `${diaInicio} – ${diaFim} de ${fimMes}`;
  }
  return `${diaInicio} de ${inicioMes} – ${diaFim} de ${fimMes}`;
}

export function parseHora(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function horarioDoDia(horario: HorarioDia[], dia: Date) {
  const { ano, mes, dia: numDia } = componentesEmSaoPaulo(dia);
  return horario[diaDaSemanaEmSaoPaulo(ano, mes, numDia)];
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
