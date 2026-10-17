/**
 * js/optimizer.js
 * 
 * Algoritmo de Otimização, Pool de Horas e Threshold para Ponto por Exceção.
 * Implementa o motor puro de cálculo para simplificação de batidas corporativas
 * garantindo 100% de precisão matemática e tolerância zero a desvios no saldo total.
 */

/**
 * Configuração padrão do otimizador.
 */
export const DEFAULT_CONFIG = {
  thresholdMinutes: 30,
  maxExitTime: "20:00",
  standardSchedule: {
    e1: "08:00",
    s1: "12:00",
    e2: "13:00",
    s2: "17:00",
    dailyMinutes: 480
  }
};

/**
 * Converte string no formato "HH:mm" ou "+HH:mm" / "-HH:mm" em total de minutos a partir da meia-noite.
 * @param {string} timeStr - Ex: "08:00", "17:00", "20:00"
 * @returns {number} Minutos inteiros
 */
export function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const trimmed = timeStr.trim();
  const isNegative = trimmed.startsWith('-');
  const clean = trimmed.replace(/^[+-]/, '').trim();
  const parts = clean.split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10) || 0;
  const mins = parseInt(parts[1], 10) || 0;
  const total = hours * 60 + mins;
  return isNegative ? -total : total;
}

/**
 * Converte minutos a partir da meia-noite em string no formato "HH:mm".
 * Realiza clamp entre 00:00 e 23:59.
 * @param {number} totalMinutes - Ex: 1027 -> "17:07"
 * @returns {string} Horário formatado "HH:mm"
 */
export function formatMinutesToTime(totalMinutes) {
  if (typeof totalMinutes !== 'number' || isNaN(totalMinutes)) return "00:00";
  const clamped = Math.max(0, Math.min(Math.round(totalMinutes), 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const mins = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Formata um delta em minutos com sinal explícito e preenchimento de zeros.
 * @param {number} minutes - Ex: +103 -> "+01h 43m", -54 -> "-00h 54m", 0 -> "+00h 00m"
 * @returns {string} Delta formatado
 */
export function formatDelta(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes)) return "+00h 00m";
  const rounded = Math.round(minutes);
  const sign = rounded < 0 ? '-' : '+';
  const abs = Math.abs(rounded);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  return `${sign}${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
}

/**
 * Classifica dias especiais (faltas, feriados e trabalho em feriado/fim de semana).
 * @param {Object} day - Objeto do dia
 * @returns {Object} Ação, instruções e saldo ajustado
 */
function classifySpecialDay(day) {
  const type = day.specialType;
  const reason = (day.specialReason || '').toLowerCase();
  const isAbsence = type === 'absence' || (reason.includes('falta') && !reason.includes('abonada'));
  const isExtraWork = type === 'extra_work';

  if (isAbsence) {
    return {
      simplifiedAction: 'special_action',
      instruction: 'No app da empresa: Lançar como Falta Integral / Remover batidas pré-preenchidas',
      reason: day.specialReason || 'Falta sem abono / dia todo',
      suggestedPunchS2: null,
      adjustedBalance: day.originalBalanceMinutes !== undefined ? day.originalBalanceMinutes : -480
    };
  }

  if (isExtraWork) {
    return {
      simplifiedAction: 'extra_work',
      instruction: 'No app da empresa: Lançar as batidas reais registradas no PDF',
      reason: day.specialReason || 'Trabalho em Feriado / Fim de Semana',
      suggestedPunchS2: null,
      adjustedBalance: day.originalBalanceMinutes !== undefined ? day.originalBalanceMinutes : 0
    };
  }

  // Feriado ou dia sem expediente
  return {
    simplifiedAction: 'keep_standard',
    instruction: 'Feriado / Sem intervenção necessária',
    reason: day.specialReason || 'Feriado / Sem expediente',
    suggestedPunchS2: null,
    adjustedBalance: 0
  };
}

/**
 * Aloca o pool de minutos nos dias elegíveis respeitando teto e piso, com transbordo em cascata para dias absorvidos.
 * @param {Array} eligibleDays - Dias candidatos a exceção
 * @param {number} poolMinutes - Saldo a ser rateado
 * @param {number} maxAllowedBalance - Saldo máximo permitido (maxExitMinutes - s2Base)
 * @param {number} minAllowedBalance - Saldo mínimo permitido ((e2Base + 15) - s2Base)
 * @param {Array} absorbedDays - Dias absorvidos pelo threshold
 * @param {Array} workDays - Todos os dias úteis
 * @param {number} s2Base - Saída 2 padrão em minutos
 * @param {number} e2Base - Entrada 2 padrão em minutos
 * @returns {{ ceilingExceededWarning: boolean }}
 */
function distributePoolAcrossEligibles(eligibleDays, poolMinutes, maxAllowedBalance, minAllowedBalance, absorbedDays, workDays, s2Base, e2Base) {
  const count = eligibleDays.length;
  let ceilingExceededWarning = false;
  if (count === 0) return { ceilingExceededWarning };

  // Rateio inicial do pool entre os dias elegíveis
  const deltaPerDay = Math.trunc(poolMinutes / count);
  let remainder = poolMinutes % count;
  let pendingOverflow = 0;

  for (let i = 0; i < count; i++) {
    const day = eligibleDays[i];
    let allocated = deltaPerDay;
    if (remainder !== 0) {
      const sign = remainder > 0 ? 1 : -1;
      allocated += sign;
      remainder -= sign;
    }

    const targetBalance = (day.originalBalanceMinutes || 0) + allocated;
    if (targetBalance > maxAllowedBalance) {
      pendingOverflow += (targetBalance - maxAllowedBalance);
      day.adjustedBalance = maxAllowedBalance;
    } else if (targetBalance < minAllowedBalance) {
      pendingOverflow += (targetBalance - minAllowedBalance); // déficit negativo
      day.adjustedBalance = minAllowedBalance;
    } else {
      day.adjustedBalance = targetBalance;
    }
  }

  // Redistribuição do excedente (overflow) positivo entre os dias elegíveis com folga abaixo do teto
  let safetyLoop = 0;
  while (pendingOverflow > 0 && safetyLoop < 100) {
    safetyLoop++;
    const availableDays = eligibleDays.filter(d => d.adjustedBalance < maxAllowedBalance);
    if (availableDays.length === 0) break;

    const availableCount = availableDays.length;
    const perDay = Math.trunc(pendingOverflow / availableCount);
    const extra = pendingOverflow % availableCount;

    if (perDay === 0) {
      for (let j = 0; j < extra && pendingOverflow > 0; j++) {
        if (availableDays[j].adjustedBalance < maxAllowedBalance) {
          availableDays[j].adjustedBalance += 1;
          pendingOverflow -= 1;
        }
      }
      break;
    } else {
      for (let j = 0; j < availableCount && pendingOverflow > 0; j++) {
        const d = availableDays[j];
        const room = maxAllowedBalance - d.adjustedBalance;
        const give = Math.min(room, perDay + (j < extra ? 1 : 0), pendingOverflow);
        d.adjustedBalance += give;
        pendingOverflow -= give;
      }
    }
  }

  // Redistribuição do déficit (overflow negativo) entre os dias elegíveis com folga acima do piso
  safetyLoop = 0;
  while (pendingOverflow < 0 && safetyLoop < 100) {
    safetyLoop++;
    const availableDays = eligibleDays.filter(d => d.adjustedBalance > minAllowedBalance);
    if (availableDays.length === 0) break;

    const availableCount = availableDays.length;
    const absOverflow = Math.abs(pendingOverflow);
    const perDay = Math.trunc(absOverflow / availableCount);
    const extra = absOverflow % availableCount;

    if (perDay === 0) {
      for (let j = 0; j < extra && pendingOverflow < 0; j++) {
        if (availableDays[j].adjustedBalance > minAllowedBalance) {
          availableDays[j].adjustedBalance -= 1;
          pendingOverflow += 1;
        }
      }
      break;
    } else {
      for (let j = 0; j < availableCount && pendingOverflow < 0; j++) {
        const d = availableDays[j];
        const room = d.adjustedBalance - minAllowedBalance;
        const take = Math.min(room, perDay + (j < extra ? 1 : 0), Math.abs(pendingOverflow));
        d.adjustedBalance -= take;
        pendingOverflow += take;
      }
    }
  }

  // Transbordo em Cascata para dias absorvidos (absorbedDays)
  // Se ainda houver pendingOverflow > 0: recruta progressivamente dias absorvidos
  // ordenados pelos maiores saldos originais positivos (mais próximos do threshold)
  if (pendingOverflow > 0 && absorbedDays && absorbedDays.length > 0) {
    const sortedAbsorbed = [...absorbedDays].sort((a, b) => (b.originalBalanceMinutes || 0) - (a.originalBalanceMinutes || 0));
    for (const cand of sortedAbsorbed) {
      if (pendingOverflow <= 0) break;
      cand.simplifiedAction = 'modify_exit';
      const room = maxAllowedBalance - (cand.adjustedBalance || 0);
      if (room > 0) {
        const take = Math.min(room, pendingOverflow);
        cand.adjustedBalance = (cand.adjustedBalance || 0) + take;
        pendingOverflow -= take;
      }
    }
  }

  // Se ainda houver pendingOverflow < 0: recruta progressivamente dias absorvidos
  // ordenados pelos menores saldos originais / mais negativos
  if (pendingOverflow < 0 && absorbedDays && absorbedDays.length > 0) {
    const sortedAbsorbed = [...absorbedDays].sort((a, b) => (a.originalBalanceMinutes || 0) - (b.originalBalanceMinutes || 0));
    for (const cand of sortedAbsorbed) {
      if (pendingOverflow >= 0) break;
      cand.simplifiedAction = 'modify_exit';
      const room = (cand.adjustedBalance || 0) - minAllowedBalance;
      if (room > 0) {
        const take = Math.min(room, Math.abs(pendingOverflow));
        cand.adjustedBalance = (cand.adjustedBalance || 0) - take;
        pendingOverflow += take;
      }
    }
  }

  // Caso extremo: mesmo utilizando 100% dos dias úteis ainda há saldo insaturável
  if (pendingOverflow > 0) {
    ceilingExceededWarning = true;
    const candidates = workDays.filter(d => d.simplifiedAction !== 'half_day');
    const targetGroup = candidates.length > 0 ? candidates : workDays;
    const maxPhysicalBalance = 1439 - s2Base; // Limite físico 23:59
    while (pendingOverflow > 0) {
      const withRoom = targetGroup.filter(d => d.adjustedBalance < maxPhysicalBalance);
      if (withRoom.length === 0) break;
      let allocatedAny = false;
      for (const d of withRoom) {
        if (pendingOverflow <= 0) break;
        d.adjustedBalance += 1;
        pendingOverflow -= 1;
        allocatedAny = true;
      }
      if (!allocatedAny) break;
    }
  } else if (pendingOverflow < 0) {
    ceilingExceededWarning = true;
    const candidates = workDays.filter(d => d.simplifiedAction !== 'half_day');
    const targetGroup = candidates.length > 0 ? candidates : workDays;
    const minPhysicalBalance = (e2Base + 1) - s2Base;
    while (pendingOverflow < 0) {
      const withRoom = targetGroup.filter(d => d.adjustedBalance > minPhysicalBalance);
      if (withRoom.length === 0) break;
      let allocatedAny = false;
      for (const d of withRoom) {
        if (pendingOverflow >= 0) break;
        d.adjustedBalance -= 1;
        pendingOverflow += 1;
        allocatedAny = true;
      }
      if (!allocatedAny) break;
    }
  }

  return { ceilingExceededWarning };
}

/**
 * Aloca o pool no menor número de dias (1 ou 2) quando nenhum dia ultrapassou o threshold.
 * @param {Array} workDays - Todos os dias úteis
 * @param {number} poolMinutes - Saldo acumulado do pool
 * @param {number} maxAllowedBalance - Saldo máximo diário permitido
 * @param {number} minAllowedBalance - Saldo mínimo diário permitido
 * @returns {{ ceilingExceededWarning: boolean }}
 */
function allocatePoolToMinimumDays(workDays, poolMinutes, maxAllowedBalance, minAllowedBalance) {
  if (workDays.length === 0 || poolMinutes === 0) return { ceilingExceededWarning: false };

  let remaining = poolMinutes;
  let ceilingExceededWarning = false;

  // Aloca a partir do último dia útil do período (ordem decrescente)
  for (let i = workDays.length - 1; i >= 0 && remaining !== 0; i--) {
    const day = workDays[i];

    if (remaining > 0) {
      const room = maxAllowedBalance - (day.adjustedBalance || 0);
      if (room > 0) {
        const allocation = Math.min(remaining, room);
        day.adjustedBalance = (day.adjustedBalance || 0) + allocation;
        remaining -= allocation;
      }
    } else {
      const room = (day.adjustedBalance || 0) - minAllowedBalance;
      if (room > 0) {
        const allocation = Math.min(Math.abs(remaining), room);
        day.adjustedBalance = (day.adjustedBalance || 0) - allocation;
        remaining += allocation;
      }
    }

    day.simplifiedAction = day.adjustedBalance !== 0 ? 'modify_exit' : 'keep_standard';
  }

  if (remaining !== 0) {
    ceilingExceededWarning = true;
    const target = workDays.find(d => d.simplifiedAction !== 'half_day') || workDays[workDays.length - 1];
    if (target) {
      target.adjustedBalance += remaining;
      target.simplifiedAction = target.adjustedBalance !== 0 ? 'modify_exit' : 'keep_standard';
    }
  }

  return { ceilingExceededWarning };
}

/**
 * Função principal de otimização de ponto por exceção.
 * @param {Array} days - Lista de dias normalizados do extrato (ParsedDay[])
 * @param {Object} [config] - Configurações de threshold, horários contratuais e teto de saída
 * @returns {Object} OptimizationResult contendo workDays, specialDays, allDays e summary
 */
export function optimizePunches(days, config = {}) {
  // Mescla com configurações padrão
  const finalConfig = {
    thresholdMinutes: config?.thresholdMinutes !== undefined ? config.thresholdMinutes : DEFAULT_CONFIG.thresholdMinutes,
    maxExitTime: config?.maxExitTime || DEFAULT_CONFIG.maxExitTime,
    standardSchedule: {
      ...DEFAULT_CONFIG.standardSchedule,
      ...(config?.standardSchedule || {})
    }
  };

  const { thresholdMinutes, maxExitTime, standardSchedule } = finalConfig;
  const s2Base = parseTimeToMinutes(standardSchedule.s2);
  const e2Base = parseTimeToMinutes(standardSchedule.e2);
  const maxExitMinutes = parseTimeToMinutes(maxExitTime);
  const maxAllowedBalance = maxExitMinutes - s2Base;
  const minAllowedBalance = (e2Base + 15) - s2Base; // Piso para saída S2 >= 13:15

  // Lista para preservar a ordem cronológica completa
  const allDays = [];
  const workDays = [];
  const specialDays = [];

  // Etapa 1: Segregação de dias especiais e dias normais de trabalho
  for (const day of (days || [])) {
    const clonedDay = {
      ...day,
      punches: day.punches ? [...day.punches] : [],
      adjustedBalance: 0,
      suggestedPunchS2: standardSchedule.s2,
      instruction: '',
      reason: ''
    };

    allDays.push(clonedDay);

    if (clonedDay.isSpecial) {
      const specialInfo = classifySpecialDay(clonedDay);
      Object.assign(clonedDay, specialInfo);
      specialDays.push(clonedDay);
    } else {
      clonedDay.simplifiedAction = 'keep_standard';
      workDays.push(clonedDay);
    }
  }

  // Etapa 2: Classificação dos dias normais (Meio Período, Absorvidos e Elegíveis)
  let poolMinutes = 0;
  const eligibleDays = [];
  const absorbedDays = [];
  const halfDays = [];
  const halfDayBalance = -Math.round(standardSchedule.dailyMinutes / 2); // Normalmente -240 min (-4h)

  for (const day of workDays) {
    const delta = day.originalBalanceMinutes || 0;
    
    // Verifica batidas do dia para checar se é exclusivamente matutino
    const punchMins = (day.punches || []).map(p => {
      if (typeof p === 'string') return parseTimeToMinutes(p);
      if (p.minutesFromMidnight !== undefined) return p.minutesFromMidnight;
      return parseTimeToMinutes(p.time);
    });
    const maxPunch = punchMins.length > 0 ? Math.max(...punchMins) : 0;
    const isExclusivelyMorning = punchMins.length >= 2 && maxPunch <= (e2Base + 15);
    const wouldExitBeforeAfternoon = (s2Base + delta) <= e2Base;

    if (!day.partialHolidayNote && (isExclusivelyMorning || wouldExitBeforeAfternoon)) {
      // Caso Meio Período: no sistema da empresa registra apenas 08:00 e 12:00 (saldo -240m)
      halfDays.push(day);
      day.simplifiedAction = 'half_day';
      day.adjustedBalance = halfDayBalance;
      day.suggestedPunchS2 = null;
      day.instruction = `No app da empresa: Cancele as batidas das ${standardSchedule.e2} e ${standardSchedule.s2} (mantenha apenas ${standardSchedule.e1} e ${standardSchedule.s1})`;
      day.reason = `Meio período matutino (saldo contratual: ${formatDelta(halfDayBalance)})`;

      // A diferença entre o saldo real e -240m vai para o pool de compensação
      const residue = delta - halfDayBalance;
      poolMinutes += residue;
    } else if (Math.abs(delta) <= thresholdMinutes) {
      // Dia Absorvido: no sistema da empresa permanece o padrão contratual (saldo 0)
      absorbedDays.push(day);
      poolMinutes += delta;
      day.simplifiedAction = 'keep_standard';
      day.adjustedBalance = 0;
      day.suggestedPunchS2 = standardSchedule.s2;
      day.instruction = 'Manter horários contratuais padrão (sem alteração)';
      day.reason = delta === 0
        ? 'Horário padrão exato (saldo 0)'
        : `Variação de ${formatDelta(delta)} absorvida pelo threshold (≤ ${thresholdMinutes}m)`;
    } else {
      // Dia que fura o threshold: obrigatoriamente terá exceção
      eligibleDays.push(day);
      day.simplifiedAction = 'modify_exit';
      day.adjustedBalance = delta;
    }
  }

  // Etapa 3 & 4: Distribuição do Pool e Transbordo em Cascata
  let distributionResult = { ceilingExceededWarning: false };
  if (eligibleDays.length > 0) {
    distributionResult = distributePoolAcrossEligibles(
      eligibleDays,
      poolMinutes,
      maxAllowedBalance,
      minAllowedBalance,
      absorbedDays,
      workDays,
      s2Base,
      e2Base
    );
  } else {
    // Etapa 5: Caso nenhum dia fure o threshold
    if (poolMinutes !== 0 && workDays.length > 0) {
      const candidates = workDays.filter(d => d.simplifiedAction !== 'half_day');
      distributionResult = allocatePoolToMinimumDays(
        candidates.length > 0 ? candidates : workDays,
        poolMinutes,
        maxAllowedBalance,
        minAllowedBalance
      );
    }
  }

  // Etapa 6: Normalização pós-rateio, batida única S2 e montagem das instruções textuais
  for (const day of workDays) {
    if (day.simplifiedAction === 'modify_exit') {
      if (day.adjustedBalance === 0) {
        day.simplifiedAction = 'keep_standard';
        day.suggestedPunchS2 = standardSchedule.s2;
        day.instruction = 'Manter horários contratuais padrão (sem alteração)';
        day.reason = 'Horário padrão exato (saldo 0)';
      } else {
        const adjustedS2Minutes = s2Base + day.adjustedBalance;
        day.suggestedPunchS2 = formatMinutesToTime(adjustedS2Minutes);
        day.instruction = `No app da empresa: Cancele a batida das ${standardSchedule.s2} e lance saída às ${day.suggestedPunchS2}`;
        day.reason = `Ajustar Saída 2 para ${day.suggestedPunchS2} (Saldo: ${formatDelta(day.adjustedBalance)})`;
      }
    } else if (day.simplifiedAction === 'half_day') {
      day.suggestedPunchS2 = null;
      if (!day.instruction) {
        day.instruction = `No app da empresa: Cancele as batidas das ${standardSchedule.e2} e ${standardSchedule.s2} (mantenha apenas ${standardSchedule.e1} e ${standardSchedule.s1})`;
      }
    } else {
      day.suggestedPunchS2 = standardSchedule.s2;
      if (!day.instruction) {
        day.instruction = 'Manter horários contratuais padrão (sem alteração)';
      }
      if (!day.reason) {
        day.reason = 'Horário padrão exato (saldo 0)';
      }
    }
  }

  // Etapa 7: Verificação da Invariante Matemática e Resumo
  const workOriginalSum = workDays.reduce((sum, d) => sum + (d.originalBalanceMinutes || 0), 0);
  let workOptimizedSum = workDays.reduce((sum, d) => sum + (d.adjustedBalance || 0), 0);

  // Verificação estrita de tolerância zero
  if (workOriginalSum !== workOptimizedSum && workDays.length > 0) {
    const diff = workOriginalSum - workOptimizedSum;
    const target = workDays.find(d => d.simplifiedAction === 'modify_exit' && (d.adjustedBalance + diff) <= maxAllowedBalance && (d.adjustedBalance + diff) >= minAllowedBalance)
      || workDays.find(d => d.simplifiedAction === 'modify_exit')
      || workDays.find(d => d.simplifiedAction !== 'half_day')
      || workDays[workDays.length - 1];
    if (target) {
      target.adjustedBalance += diff;
      workOptimizedSum += diff;
      if (target.adjustedBalance === 0) {
        target.simplifiedAction = 'keep_standard';
        target.suggestedPunchS2 = standardSchedule.s2;
        target.instruction = 'Manter horários contratuais padrão (sem alteração)';
        target.reason = 'Horário padrão exato (saldo 0)';
      } else if (target.simplifiedAction !== 'half_day') {
        target.simplifiedAction = 'modify_exit';
        const adjustedMinutes = s2Base + target.adjustedBalance;
        target.suggestedPunchS2 = formatMinutesToTime(adjustedMinutes);
        target.instruction = `No app da empresa: Cancele a batida das ${standardSchedule.s2} e lance saída às ${target.suggestedPunchS2}`;
        target.reason = `Ajustar Saída 2 para ${target.suggestedPunchS2} (Saldo: ${formatDelta(target.adjustedBalance)})`;
      }
    }
  }

  const totalOriginalBalanceMinutes = (days || []).reduce((sum, d) => sum + (d.originalBalanceMinutes || 0), 0);
  const totalOptimizedBalanceMinutes = allDays.reduce((sum, d) => sum + (d.adjustedBalance || 0), 0);

  const originalExceptionCount = workDays.filter(d => (d.originalBalanceMinutes || 0) !== 0).length;
  const simplifiedExceptionCount = workDays.filter(d => d.simplifiedAction === 'modify_exit' || d.simplifiedAction === 'half_day').length;
  const extraWorkDaysCount = specialDays.filter(d => d.simplifiedAction === 'extra_work').length;
  const reductionPercentage = originalExceptionCount > 0
    ? Math.round(((originalExceptionCount - simplifiedExceptionCount) / originalExceptionCount) * 100)
    : 0;

  return {
    workDays,
    specialDays,
    allDays,
    summary: {
      totalOriginalBalanceMinutes,
      totalOptimizedBalanceMinutes,
      workDaysOriginalBalanceMinutes: workOriginalSum,
      workDaysOptimizedBalanceMinutes: workOptimizedSum,
      originalExceptionCount,
      simplifiedExceptionCount,
      extraWorkDaysCount,
      reductionPercentage,
      poolMinutes,
      absorbedDaysCount: absorbedDays.length,
      halfDaysCount: halfDays.length,
      eligibleDaysCount: eligibleDays.length,
      workDaysCount: workDays.length,
      specialDaysCount: specialDays.length,
      ceilingExceededWarning: Boolean(distributionResult.ceilingExceededWarning)
    }
  };
}

// Anexa globalmente para compatibilidade em ambientes vanilla script
if (typeof window !== 'undefined') {
  window.PontoOptimizer = {
    DEFAULT_CONFIG,
    parseTimeToMinutes,
    formatMinutesToTime,
    formatDelta,
    optimizePunches
  };
}
