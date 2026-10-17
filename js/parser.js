/**
 * Módulo de Extração e Normalização de Extrato PDF do Ponto Fácil (v4.x)
 * 
 * Processamento 100% no cliente (client-side) utilizando a biblioteca pdf.js (pdfjsLib).
 * Compatível tanto como módulo ES6 (import/export) quanto via script tag global (window.PontoParser).
 */

// Mapeamento de meses em português (abreviações e nomes por extenso)
export const MONTH_MAP = {
  jan: '01', janeiro: '01',
  fev: '02', fevereiro: '02',
  mar: '03', marco: '03', 'março': '03',
  abr: '04', abril: '04',
  mai: '05', maio: '05',
  jun: '06', junho: '06',
  jul: '07', julho: '07',
  ago: '08', agosto: '08',
  set: '09', setembro: '09',
  out: '10', outubro: '10',
  nov: '11', novembro: '11',
  dez: '12', dezembro: '12'
};

// Expressões regulares para extração do extrato
export const PATTERNS = {
  // Captura o cabeçalho de data: ex: "qua., 16 set. 2026"
  dateHeader: /^([a-zçãéíóú]{3,4}\.?,?\s+\d{1,2}\s+[a-zçãéíóú]{3}\.?\s+\d{4})/i,
  // Captura batidas de ponto: ex: "09:10"
  timePunch: /^([01]\d|2[0-3]):([0-5]\d)$/,
  // Captura saldos: ex: "+ 00h 07m", "- 00h 54m", "+01h 43m"
  balanceLine: /^([+-])\s*(\d{1,2})h\s*(\d{2})m$/i,
  // Captura eventos especiais
  specialEvent: /(falta sem abono|falta abonada|feriado|nenhum ponto registrado)/i,
  // Captura feriado parcial ou abono parcial: ex: "Feriado / + 04h 45m" ou "Falta abonada / - 02h 00m"
  partialHoliday: /(?:feriado|falta abonada)\s*\/\s*[+-]\s*\d{1,2}h\s*\d{2}m/i,
  // Captura intervalo de datas no cabeçalho: ex: "16/set./2026 - 15/out./2026" ou "16/09/2026 - 15/10/2026"
  periodRange: /(\d{1,2})[\/\s]+([a-zçãéíóú]+|\d{1,2})\.?[\/\s]+(\d{4})\s*-\s*(\d{1,2})[\/\s]+([a-zçãéíóú]+|\d{1,2})\.?[\/\s]+(\d{4})/i
};

/**
 * Converte string de saldo "[+-] HHh MMm" em minutos inteiros com sinal.
 * Ex: "+ 00h 07m" -> 7
 * Ex: "- 00h 54m" -> -54
 * Ex: "+ 01h 43m" -> 103
 * @param {string} str 
 * @returns {number|null}
 */
export function parseBalanceMinutes(str) {
  if (!str) return null;
  const match = str.trim().match(PATTERNS.balanceLine);
  if (!match) return null;
  const sign = match[1] === '-' ? -1 : 1;
  const hours = parseInt(match[2], 10);
  const minutes = parseInt(match[3], 10);
  return sign * (hours * 60 + minutes);
}

/**
 * Converte "HH:mm" em minutos a partir da meia-noite (00:00).
 * Ex: "08:30" -> 510
 * @param {string} hhmm 
 * @returns {number}
 */
export function parseTimeToMinutes(hhmm) {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Converte minutos a partir da meia-noite em string "HH:mm".
 * Ex: 510 -> "08:30"
 * @param {number} totalMinutes 
 * @returns {string}
 */
export function formatMinutesToTime(totalMinutes) {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(norm / 60);
  const m = norm % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Formata minutos com sinal legível: ex: +7 -> "+07m", +103 -> "+01h 43m", -54 -> "-54m"
 * @param {number} minutes 
 * @returns {string}
 */
export function formatDelta(minutes) {
  const sign = minutes < 0 ? '-' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) {
    return `${sign}${String(m).padStart(2, '0')}m`;
  }
  return `${sign}${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Converte uma data no formato "qua., 16 set. 2026" para data ISO "2026-09-16"
 * e extrai o dia da semana normalizado e flag de fim de semana.
 * @param {string} dateStr 
 * @returns {{ dateISO: string, dayOfWeek: string, isWeekend: boolean, day: string, month: string, year: string }}
 */
export function parseDateISO(dateStr) {
  const match = dateStr.trim().match(/^([a-zçãéíóú]{3,4}\.?),?\s+(\d{1,2})\s+([a-zçãéíóú]{3})\.?\s+(\d{4})/i);
  if (!match) return null;
  const dowRaw = match[1];
  const day = match[2].padStart(2, '0');
  const monKey = match[3].toLowerCase();
  const year = match[4];
  const month = MONTH_MAP[monKey] || '01';
  const dayOfWeek = dowRaw.endsWith('.') ? dowRaw : `${dowRaw}.`;
  const isWeekend = /^s[aá]b\.?|dom\.?$/i.test(dayOfWeek);
  return {
    dateISO: `${year}-${month}-${day}`,
    dayOfWeek,
    isWeekend,
    day,
    month,
    year
  };
}

/**
 * Obtém a instância global do pdfjsLib
 */
function getPdfjsLib() {
  const lib = (typeof window !== 'undefined' && window.pdfjsLib) ||
              (typeof globalThis !== 'undefined' && globalThis.pdfjsLib) ||
              (typeof pdfjsLib !== 'undefined' ? pdfjsLib : null);

  if (!lib) {
    throw new Error('Biblioteca pdf.js (pdfjsLib) não encontrada no ambiente global.');
  }

  // Define o worker padrão da CDN se ainda não foi configurado
  if (lib.GlobalWorkerOptions && !lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  return lib;
}

/**
 * Função principal do parser: extrai e normaliza os dados do extrato PDF do Ponto Fácil.
 * 
 * @param {ArrayBuffer|Uint8Array|File|Blob} pdfData 
 * @returns {Promise<PeriodData>}
 */
export async function parsePontoFacilPDF(pdfData) {
  if (!pdfData) {
    throw new Error('Nenhum dado de PDF fornecido para o parser.');
  }

  const lib = getPdfjsLib();

  // Converte File/Blob para Uint8Array se necessário
  let dataBytes;
  if (typeof File !== 'undefined' && pdfData instanceof File) {
    const arrayBuffer = await pdfData.arrayBuffer();
    dataBytes = new Uint8Array(arrayBuffer);
  } else if (typeof Blob !== 'undefined' && pdfData instanceof Blob) {
    const arrayBuffer = await pdfData.arrayBuffer();
    dataBytes = new Uint8Array(arrayBuffer);
  } else if (pdfData instanceof ArrayBuffer) {
    dataBytes = new Uint8Array(pdfData);
  } else if (pdfData instanceof Uint8Array) {
    dataBytes = pdfData;
  } else if (pdfData && pdfData.buffer instanceof ArrayBuffer) {
    dataBytes = new Uint8Array(pdfData.buffer);
  } else {
    dataBytes = pdfData;
  }

  // Carrega o documento PDF
  const loadingTask = lib.getDocument({ data: dataBytes });
  const pdfDoc = await loadingTask.promise;

  // Extrai os tokens de texto de todas as páginas em sequência
  const rawTokens = [];
  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    for (const item of textContent.items) {
      const str = item.str ? item.str.trim() : '';
      if (str) {
        rawTokens.push(str);
      }
    }
  }

  // Pré-processamento: concatena tokens de data multi-token divididos pelo pdf.js (ex: "dom., 08 mar." seguido de "2026")
  const datePrefixNoYearRegex = /^([a-zçãéíóú]{3,4}\.?,?\s+\d{1,2}\s+[a-zçãéíóú]{3}\.?)$/i;
  const allTokens = [];
  for (let i = 0; i < rawTokens.length; i++) {
    const t = rawTokens[i];
    if (i + 1 < rawTokens.length && datePrefixNoYearRegex.test(t) && /^\d{4}\b/.test(rawTokens[i + 1])) {
      const yearMatch = rawTokens[i + 1].match(/^(\d{4})(.*)$/);
      allTokens.push(`${t} ${yearMatch[1]}`);
      const remainder = yearMatch[2].trim();
      if (remainder) {
        rawTokens[i + 1] = remainder;
      } else {
        i++;
      }
    } else {
      allTokens.push(t);
    }
  }

  // Estado do parser
  let periodRange = null;
  const daysMap = new Map(); // dateISO -> ParsedDay
  let currentDay = null;
  // resumoStep: 0 = inativo, 1 = saldo do dia, 2 = saldo do período, 3 = banco de horas
  let resumoStep = 0;

  let idx = 0;
  while (idx < allTokens.length) {
    const token = allTokens[idx];

    // 1. Captura intervalo do período no cabeçalho do documento (ex: "16/set./2026 - 15/out./2026")
    if (!periodRange) {
      const pMatch = token.match(PATTERNS.periodRange);
      if (pMatch) {
        const [_, d1, m1, y1, d2, m2, y2] = pMatch;
        const m1ISO = (MONTH_MAP[m1.toLowerCase()] || m1).padStart(2, '0');
        const m2ISO = (MONTH_MAP[m2.toLowerCase()] || m2).padStart(2, '0');
        periodRange = {
          startDate: `${y1}-${m1ISO}-${d1.padStart(2, '0')}`,
          endDate: `${y2}-${m2ISO}-${d2.padStart(2, '0')}`,
          rawPeriodStr: `${d1} ${m1}. ${y1} a ${d2} ${m2}. ${y2}`
        };
        idx++;
        continue;
      }
    }

    // 2. Reconhecimento de cabeçalho de data (ex: "qua., 16 set. 2026")
    const dateMatch = token.match(PATTERNS.dateHeader);
    if (dateMatch) {
      const fullDateStr = dateMatch[1];
      const parsedDate = parseDateISO(fullDateStr);

      if (parsedDate) {
        const { dateISO, dayOfWeek, isWeekend } = parsedDate;

        // Se a data já foi registrada anteriormente (ex: dia 30/set dividido entre páginas 1 e 2),
        // recupera o registro existente para mesclar batidas e atualizar saldos
        if (daysMap.has(dateISO)) {
          currentDay = daysMap.get(dateISO);
        } else {
          currentDay = {
            dateStr: fullDateStr,
            dateISO,
            dayOfWeek,
            isWeekend: Boolean(isWeekend),
            punches: [],
            originalBalanceMinutes: 0,
            periodBalanceMinutes: 0,
            bancoDeHorasMinutes: 0,
            isSpecial: false,
            specialType: null,
            specialReason: null,
            partialHolidayNote: null,
            hasMissingPunch: false,
            _rawSpecial: null
          };
          daysMap.set(dateISO, currentDay);
        }

        resumoStep = 0;

        // Se o token continha texto além da data, reprocessa o restante no próximo ciclo
        const remainder = token.slice(dateMatch[0].length).trim();
        if (remainder) {
          allTokens.splice(idx + 1, 0, remainder);
        }

        idx++;
        continue;
      }
    }

    // 3. Reconhecimento de batida incompleta indicada por "???"
    if (token.includes('???') && currentDay) {
      currentDay.hasMissingPunch = true;
      idx++;
      continue;
    }

    // 4. Reconhecimento de feriado parcial ou abono parcial (ex: "Feriado / + 04h 45m" ou "Falta abonada / - 02h 00m")
    const partialMatch = token.match(PATTERNS.partialHoliday);
    if (partialMatch && currentDay) {
      currentDay.partialHolidayNote = token.trim();
      idx++;
      continue;
    }

    // 5. Reconhecimento de eventos especiais integrais (faltas e feriados)
    const specialMatch = token.match(PATTERNS.specialEvent);
    if (specialMatch && currentDay) {
      const eventText = specialMatch[1].toLowerCase();
      if (eventText.includes('falta sem abono')) {
        currentDay._rawSpecial = 'absence';
      } else if (eventText.includes('falta abonada')) {
        currentDay._rawSpecial = 'falta_abonada';
      } else {
        currentDay._rawSpecial = 'holiday';
      }
      idx++;
      continue;
    }

    // 6. Reconhecimento da seção "Resumo:"
    if (token === 'Resumo:' || token.startsWith('Resumo:')) {
      resumoStep = 1;
      const remainder = token.replace(/^Resumo:\s*/, '').trim();
      if (remainder) {
        allTokens.splice(idx + 1, 0, remainder);
      }
      idx++;
      continue;
    }

    // 7. Captura dos valores do Resumo (Saldo do dia, Saldo do período, Banco de horas)
    if (resumoStep > 0 && currentDay) {
      const balanceMins = parseBalanceMinutes(token);
      if (balanceMins !== null) {
        if (resumoStep === 1) {
          currentDay.originalBalanceMinutes = balanceMins;
          resumoStep = 2;
        } else if (resumoStep === 2) {
          currentDay.periodBalanceMinutes = balanceMins;
          resumoStep = 3;
        } else if (resumoStep === 3) {
          currentDay.bancoDeHorasMinutes = balanceMins;
          resumoStep = 0; // Concluído o bloco de resumo
        }
        idx++;
        continue;
      } else {
        // Se encontrou algo que não é saldo, cancela o estado de resumo
        resumoStep = 0;
      }
    }

    // 8. Reconhecimento de batidas de ponto ("HH:mm")
    const timeMatch = token.match(PATTERNS.timePunch);
    if (timeMatch && currentDay) {
      const timeStr = timeMatch[0];
      const minutesFromMidnight = parseTimeToMinutes(timeStr);
      const punchType = currentDay.punches.length % 2 === 0 ? 'entrada' : 'saida';

      currentDay.punches.push({
        type: punchType,
        time: timeStr,
        minutesFromMidnight
      });

      idx++;
      continue;
    }

    idx++;
  }

  const daysList = Array.from(daysMap.values());

  // Pós-processamento e refinamento da classificação de eventos e batidas
  for (const day of daysList) {
    if (day.punches.length % 2 !== 0) {
      day.hasMissingPunch = true;
    }

    if (day.partialHolidayNote) {
      // Feriado parcial / abono parcial: dia útil normal para otimização pelo saldo líquido do Resumo
      day.isSpecial = false;
      day.specialType = null;
      day.specialReason = null;
    } else if (day._rawSpecial === 'absence') {
      day.isSpecial = true;
      day.specialType = 'absence';
      day.specialReason = 'Falta sem abono / dia todo';
      if (day.originalBalanceMinutes === 0 && day.punches.length === 0) {
        day.originalBalanceMinutes = -480;
      }
    } else if (day._rawSpecial === 'holiday') {
      day.isSpecial = true;
      if (day.punches.length > 0) {
        day.specialType = 'extra_work';
        day.specialReason = 'Trabalho em Feriado';
      } else {
        day.specialType = 'holiday';
        day.specialReason = 'Feriado / Sem expediente';
      }
    } else if (day._rawSpecial === 'falta_abonada') {
      day.isSpecial = true;
      day.specialType = 'holiday';
      day.specialReason = 'Falta abonada / dia todo';
    } else if (day.isWeekend && day.punches.length > 0) {
      day.isSpecial = true;
      day.specialType = 'extra_work';
      day.specialReason = 'Trabalho em Fim de Semana';
    } else if (day.isWeekend && day.punches.length === 0) {
      day.isSpecial = true;
      day.specialType = 'holiday';
      day.specialReason = 'Fim de Semana / Sem expediente';
    } else {
      day.isSpecial = false;
      day.specialType = null;
      day.specialReason = null;
    }

    delete day._rawSpecial;
  }

  const lastDay = daysList.length > 0 ? daysList[daysList.length - 1] : null;

  // Garante datas de início e fim
  const finalStartDate = periodRange?.startDate || (daysList[0]?.dateISO || '');
  const finalEndDate = periodRange?.endDate || (lastDay?.dateISO || '');
  const finalRawPeriodStr = periodRange?.rawPeriodStr || (
    daysList.length > 0 ? `${daysList[0].dateStr} a ${lastDay.dateStr}` : ''
  );

  // No Ponto Fácil:
  // - bancoDeHorasMinutes: Saldo geral consolidado do banco de horas no último dia (ex: +01h 43m = +103 min)
  // - periodBalanceMinutes: Saldo do período apurado (soma das jornadas trabalhadas menos a carga esperada = -25h 52m = -1552 min)
  // Conforme a especificação e Task 02, totalOriginalBalanceMinutes representa o banco de horas final acumulado (+103 min).
  const finalBancoDeHoras = lastDay ? lastDay.bancoDeHorasMinutes : 0;
  const finalPeriodBalance = lastDay ? lastDay.periodBalanceMinutes : 0;

  const result = {
    startDate: finalStartDate,
    endDate: finalEndDate,
    rawPeriodStr: finalRawPeriodStr,
    totalOriginalBalanceMinutes: finalBancoDeHoras,
    bancoDeHorasMinutes: finalBancoDeHoras,
    periodBalanceMinutes: finalPeriodBalance,
    days: daysList
  };

  return result;
}

// Compatibilidade para execução via script tag no navegador (objeto global window.PontoParser)
if (typeof window !== 'undefined') {
  window.PontoParser = {
    parsePontoFacilPDF,
    parseBalanceMinutes,
    parseTimeToMinutes,
    formatMinutesToTime,
    formatDelta,
    parseDateISO,
    MONTH_MAP,
    PATTERNS
  };
}

export default parsePontoFacilPDF;
