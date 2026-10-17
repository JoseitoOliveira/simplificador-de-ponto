/**
 * ============================================================================
 * MÓDULO DE INTERFACE DO USUÁRIO (UI.JS)
 * ============================================================================
 * Responsável pela manipulação do DOM, renderização dos cards de resumo,
 * tabela de lançamentos por exceção, gerenciamento de cópia para clipboard
 * e notificações de feedback visual.
 */

/**
 * Converte minutos inteiros em string formatada com sinal.
 * Ex: +103 -> "+01h 43m", -42 -> "-42m" ou "-00h 42m", 0 -> "00h 00m"
 * @param {number} totalMinutes 
 * @returns {string}
 */
export function formatDelta(totalMinutes) {
  if (isNaN(totalMinutes) || totalMinutes === 0) {
    return "00h 00m";
  }
  const sign = totalMinutes > 0 ? "+" : "-";
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  
  if (hours > 0) {
    return `${sign}${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
  }
  return `${sign}${String(minutes).padStart(2, '0')}m`;
}

/**
 * Converte minutos a partir da meia-noite (0..1439) em string "HH:mm"
 * @param {number} minutesFromMidnight 
 * @returns {string}
 */
export function formatMinutesToTime(minutesFromMidnight) {
  const m = Math.max(0, Math.min(1439, minutesFromMidnight));
  const hours = Math.floor(m / 60);
  const mins = m % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converte "HH:mm" em minutos inteiros a partir da meia-noite
 * @param {string} hhmm 
 * @returns {number}
 */
export function parseTimeToMinutes(hhmm) {
  if (!hhmm || typeof hhmm !== 'string' || !hhmm.includes(':')) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Exibe notificação temporária tipo Toast na tela.
 * @param {string} message 
 * @param {'success'|'error'|'info'|'warning'} [type='info']
 */
export function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast-item pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-lg max-w-sm text-xs font-medium';

  let borderBgClass = 'bg-white text-slate-800 border-slate-200';
  let iconName = 'info';
  let iconColor = 'text-blue-500';

  if (type === 'success') {
    borderBgClass = 'bg-emerald-50 text-emerald-900 border-emerald-200 shadow-emerald-500/10';
    iconName = 'check-circle-2';
    iconColor = 'text-emerald-600';
  } else if (type === 'error') {
    borderBgClass = 'bg-rose-50 text-rose-900 border-rose-200 shadow-rose-500/10';
    iconName = 'alert-triangle';
    iconColor = 'text-rose-600';
  } else if (type === 'warning') {
    borderBgClass = 'bg-amber-50 text-amber-900 border-amber-200 shadow-amber-500/10';
    iconName = 'alert-circle';
    iconColor = 'text-amber-600';
  }

  toast.className += ` ${borderBgClass}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-4 h-4 shrink-0 ${iconColor}"></i>
    <span class="flex-1">${message}</span>
  `;

  container.appendChild(toast);

  if (window.lucide) {
    window.lucide.createIcons({ root: toast });
  }

  // Auto remoção após 3.2 segundos
  setTimeout(() => {
    toast.classList.add('toast-fade-out');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3200);
}

// Alias de compatibilidade com especificações
export const showNotification = showToast;

/**
 * Controla o estado de carregamento e exibição de spinner na dropzone.
 * @param {boolean} isLoading 
 */
export function setLoadingState(isLoading) {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    if (isLoading) {
      spinner.classList.remove('hidden');
    } else {
      spinner.classList.add('hidden');
    }
  }
}

/**
 * Atualiza os indicadores textuais dos sliders na interface.
 * @param {object} config { thresholdMinutes: number, maxExitTime: string|number }
 */
export function updateSliderDisplays(config) {
  if (!config) return;

  const thresholdDisplay = document.getElementById('threshold-value');
  const maxExitDisplay = document.getElementById('max-exit-value');
  const sliderThreshold = document.getElementById('slider-threshold');
  const sliderMaxExit = document.getElementById('slider-max-exit');

  if (config.thresholdMinutes !== undefined) {
    if (thresholdDisplay) {
      thresholdDisplay.textContent = `±${config.thresholdMinutes} min`;
    }
    if (sliderThreshold && Number(sliderThreshold.value) !== config.thresholdMinutes) {
      sliderThreshold.value = config.thresholdMinutes;
    }
  }

  if (config.maxExitTime !== undefined) {
    let formattedTime = config.maxExitTime;
    let minutesValue = typeof config.maxExitTime === 'number' 
      ? config.maxExitTime 
      : parseTimeToMinutes(config.maxExitTime);

    if (typeof formattedTime === 'number') {
      formattedTime = formatMinutesToTime(formattedTime);
    }

    if (maxExitDisplay) {
      maxExitDisplay.textContent = formattedTime;
    }
    if (sliderMaxExit && Number(sliderMaxExit.value) !== minutesValue) {
      sliderMaxExit.value = minutesValue;
    }
  }
}

/**
 * Copia o texto para a área de transferência com feedback visual e fallback
 * @param {HTMLElement} buttonElement 
 * @param {string} textToCopy 
 */
export function setupClipboardCopy(buttonElement, textToCopy) {
  if (!buttonElement) return;

  buttonElement.addEventListener('click', async (e) => {
    e.stopPropagation();

    let success = false;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        success = true;
      } catch (err) {
        success = false;
      }
    }

    // Fallback caso a API nativa falhe ou não esteja disponível
    if (!success) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        success = false;
      }
    }

    if (success) {
      buttonElement.classList.add('copied');
      buttonElement.innerHTML = `
        <i data-lucide="check" class="w-3.5 h-3.5"></i>
        <span class="sr-only">Copiado</span>
      `;
      if (window.lucide) {
        window.lucide.createIcons({ root: buttonElement });
      }

      showToast(`Horário ${textToCopy} copiado!`, 'success');

      setTimeout(() => {
        buttonElement.classList.remove('copied');
        buttonElement.innerHTML = `
          <i data-lucide="copy" class="w-3.5 h-3.5"></i>
          <span class="sr-only">Copiar</span>
        `;
        if (window.lucide) {
          window.lucide.createIcons({ root: buttonElement });
        }
      }, 2000);
    } else {
      showToast(`Não foi possível copiar ${textToCopy} automaticamente.`, 'error');
    }
  });
}

/**
 * Renderiza os 3 Cards de Resumo e Métricas de Impacto no DOM.
 * @param {object} summaryData 
 * @param {object} periodInfo 
 */
export function renderSummaryCards(summaryData, periodInfo) {
  const periodEl = document.getElementById('summary-period');
  const workdaysEl = document.getElementById('summary-workdays');
  const balanceEl = document.getElementById('summary-balance');
  const balanceBadgeEl = document.getElementById('summary-balance-badge');
  const balanceIconBoxEl = document.getElementById('summary-balance-icon-box');
  const origExceptionsEl = document.getElementById('summary-orig-exceptions');
  const simpExceptionsEl = document.getElementById('summary-simp-exceptions');
  const reductionBadgeEl = document.getElementById('summary-reduction-badge');
  const printPeriodInfo = document.getElementById('print-period-info');

  // 1. Período e Dias Úteis
  if (periodInfo) {
    const rawPeriod = periodInfo.rawPeriodStr || `${periodInfo.startDate || ''} a ${periodInfo.endDate || ''}`;
    if (periodEl) periodEl.textContent = rawPeriod;
    if (printPeriodInfo) printPeriodInfo.textContent = `Período: ${rawPeriod}`;

    let totalDays = 0;
    if (typeof periodInfo.totalWorkDays === 'number') {
      totalDays = periodInfo.totalWorkDays;
    } else if (Array.isArray(periodInfo.days)) {
      totalDays = periodInfo.days.filter(d => !d.isSpecial).length;
    }

    if (workdaysEl) {
      workdaysEl.textContent = `${totalDays} dias úteis apurados`;
    }
  }

  // 2. Saldo Consolidado do Período
  if (summaryData) {
    // Destaque principal exibe o Banco de Horas Final do extrato
    const bhMinutes = periodInfo?.bancoDeHorasMinutes ?? summaryData?.totalOriginalBalanceMinutes ?? 0;
    const formattedBh = formatDelta(bhMinutes);

    if (balanceEl) {
      balanceEl.textContent = formattedBh;
      balanceEl.className = 'text-xl font-black font-mono tracking-tight';

      if (bhMinutes > 0) {
        balanceEl.classList.add('text-emerald-600');
        if (balanceBadgeEl) {
          balanceBadgeEl.textContent = 'Positivo / Banco de Horas';
          balanceBadgeEl.className = 'text-2xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800';
        }
        if (balanceIconBoxEl) {
          balanceIconBoxEl.className = 'w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0';
        }
      } else if (bhMinutes < 0) {
        balanceEl.classList.add('text-rose-600');
        if (balanceBadgeEl) {
          balanceBadgeEl.textContent = 'Negativo / Débito';
          balanceBadgeEl.className = 'text-2xs font-semibold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800';
        }
        if (balanceIconBoxEl) {
          balanceIconBoxEl.className = 'w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0';
        }
      } else {
        balanceEl.classList.add('text-slate-600');
        if (balanceBadgeEl) {
          balanceBadgeEl.textContent = 'Zerado / Em dia';
          balanceBadgeEl.className = 'text-2xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700';
        }
      }
    }

    // Subtítulo do Card 2 com saldo do ciclo e desvio
    const balanceDescEl = document.getElementById('summary-balance-desc');
    if (balanceDescEl) {
      const cycleBalance = summaryData.totalOptimizedBalanceMinutes ?? 0;
      const expectedCycle = periodInfo?.periodBalanceMinutes ?? summaryData.totalOriginalBalanceMinutes ?? 0;
      const diff = Math.abs(cycleBalance - expectedCycle);
      balanceDescEl.textContent = `Saldo do ciclo: ${formatDelta(cycleBalance)} (Desvio: ${diff}m)`;
    }

    // 3. Métricas de Impacto e Redução de Cliques
    const origCount = summaryData.originalExceptionCount ?? 0;
    const simpCount = summaryData.simplifiedExceptionCount ?? 0;
    const reduction = summaryData.reductionPercentage ?? (origCount > 0 ? Math.round(((origCount - simpCount) / origCount) * 100) : 0);

    if (origExceptionsEl) origExceptionsEl.textContent = origCount;
    if (simpExceptionsEl) simpExceptionsEl.textContent = simpCount;
    if (reductionBadgeEl) {
      reductionBadgeEl.textContent = `-${Math.max(0, reduction)}% cliques`;
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

/**
 * Atualiza os contadores numéricos na barra de abas de filtros.
 * @param {number} exceptionsCount 
 * @param {number} totalCount 
 */
export function updateFilterCounters(exceptionsCount, totalCount) {
  const badgeExceptions = document.getElementById('badge-count-exceptions');
  const badgeAll = document.getElementById('badge-count-all');

  if (badgeExceptions) badgeExceptions.textContent = exceptionsCount;
  if (badgeAll) badgeAll.textContent = totalCount;
}

/**
 * Renderiza a Tabela de Lançamento por Exceção.
 * @param {Array<object>|object} daysList Lista de dias normalizados/otimizados ou objeto { workDays, specialDays }
 * @param {'only_exceptions'|'all'} [filterMode='only_exceptions']
 */
export function renderTable(daysList, filterMode = 'only_exceptions') {
  const emptyState = document.getElementById('table-empty-state');
  const tableContainer = document.getElementById('table-container');
  const tbody = document.getElementById('table-body');
  const btnOnlyExceptions = document.getElementById('filter-only-exceptions');
  const btnAll = document.getElementById('filter-all');

  if (!tbody) return;

  // Normalização do parâmetro de entrada
  let allDays = [];
  if (Array.isArray(daysList)) {
    allDays = daysList;
  } else if (daysList && typeof daysList === 'object') {
    allDays = [
      ...(daysList.workDays || []),
      ...(daysList.specialDays || [])
    ];
  }

  // Ordena por data (data ISO se existir, mantendo ordem cronológica)
  allDays.sort((a, b) => {
    if (a.dateISO && b.dateISO) return a.dateISO.localeCompare(b.dateISO);
    return 0;
  });

  // Atualiza estado visual das abas de filtro
  if (filterMode === 'only_exceptions') {
    if (btnOnlyExceptions) {
      btnOnlyExceptions.className = 'filter-tab-btn active px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-blue-600 shadow-xs flex items-center gap-2';
    }
    if (btnAll) {
      btnAll.className = 'filter-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 hover:text-slate-900 flex items-center gap-2';
    }
  } else {
    if (btnOnlyExceptions) {
      btnOnlyExceptions.className = 'filter-tab-btn px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all text-slate-600 hover:text-slate-900 flex items-center gap-2';
    }
    if (btnAll) {
      btnAll.className = 'filter-tab-btn active px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-blue-600 shadow-xs flex items-center gap-2';
    }
  }

  if (allDays.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (tableContainer) tableContainer.classList.add('hidden');
    updateFilterCounters(0, 0);
    return;
  }

  // Identifica quais dias são exceções que exigem intervenção humana no app corporativo
  const isExceptionDay = (day) => {
    if (day.simplifiedAction === 'extra_work') return true;
    if (day.simplifiedAction === 'modify_exit') return true;
    if (day.simplifiedAction === 'half_day') return true;
    if (day.simplifiedAction === 'special_action') return true;
    if (day.isSpecial) {
      const reason = (day.specialReason || '').toLowerCase();
      // Faltas sem abono exigem exclusão de batidas ou lançamento de falta
      if (reason.includes('falta') && !reason.includes('abonada')) return true;
      if (day.punches && day.punches.length === 0 && day.originalBalanceMinutes < 0) return true;
    }
    return false;
  };

  const exceptionDaysCount = allDays.filter(isExceptionDay).length;
  updateFilterCounters(exceptionDaysCount, allDays.length);

  // Filtragem dos dias de acordo com o modo
  const visibleDays = filterMode === 'only_exceptions'
    ? allDays.filter(isExceptionDay)
    : allDays;

  // Se nenhum dia corresponder ao filtro ativo
  if (visibleDays.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="py-12 text-center text-slate-500">
          <div class="flex flex-col items-center justify-center">
            <i data-lucide="check-circle" class="w-8 h-8 text-emerald-500 mb-2"></i>
            <p class="font-medium text-slate-700">Nenhuma exceção a ser lançada!</p>
            <p class="text-2xs text-slate-400 mt-0.5">Todos os dias do ciclo foram absorvidos pelo horário padrão contratual.</p>
          </div>
        </td>
      </tr>
    `;
    if (emptyState) emptyState.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons({ root: tbody });
    return;
  }

  // Horários contratuais padrão configurados na tela
  const e1Default = document.getElementById('config-e1')?.value || '08:00';
  const s1Default = document.getElementById('config-s1')?.value || '12:00';
  const e2Default = document.getElementById('config-e2')?.value || '13:00';
  const s2Default = document.getElementById('config-s2')?.value || '17:00';

  const makeNormalBadge = (time) => `
    <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-medium text-slate-700 bg-slate-100 border border-slate-200 shadow-2xs">
      ${time}
    </span>
  `;

  const makeCancelledBadge = (time) => `
    <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-semibold text-rose-700 bg-rose-50 border border-rose-300 shadow-2xs line-through" title="Cancelar esta batida no sistema da empresa">
      ${time}
    </span>
  `;

  const makeSuggestedBadge = (time) => `
    <button 
      type="button" 
      class="copy-btn inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-300 hover:bg-blue-100 hover:border-blue-400 transition-all shadow-2xs cursor-pointer"
      data-copy-time="${time}"
      title="Clique para copiar ${time}"
    >
      <span>${time}</span>
      <i data-lucide="copy" class="w-3 h-3 text-blue-500 shrink-0"></i>
      <span class="sr-only">Copiar</span>
    </button>
  `;

  // Montagem do HTML das linhas
  let html = '';
  visibleDays.forEach((day) => {
    const isException = isExceptionDay(day);
    const isSpecial = Boolean(day.isSpecial);
    const rowClass = isSpecial 
      ? 'table-row-special' 
      : isException 
        ? 'table-row-exception' 
        : 'table-row-standard';

    // 1. Data e dia da semana
    const dayOfWeek = day.dayOfWeek || (day.dateStr ? day.dateStr.split(',')[0] : '');
    const dateFormatted = day.dateStr || day.dateISO || '';

    // 2. Batidas Reais no PDF (Renderizadas como balões com borda azul)
    let punchesHtml = '';
    const badgeItems = [];
    if (Array.isArray(day.punches) && day.punches.length > 0) {
      day.punches.forEach(p => {
        const timeStr = typeof p === 'string' ? p : p.time;
        badgeItems.push(`<span class="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 shadow-2xs">${timeStr}</span>`);
      });
    }

    if (day.partialHolidayNote) {
      badgeItems.push(`<span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-semibold bg-sky-50 text-sky-700 border border-sky-200 shadow-2xs">${day.partialHolidayNote}</span>`);
    }

    if (day.hasMissingPunch) {
      badgeItems.push(`<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs" title="Batida em aberto no Ponto Fácil">⚠️ Batida incompleta (???)</span>`);
    }

    if (badgeItems.length > 0) {
      punchesHtml = `<div class="flex flex-wrap items-center gap-1.5">${badgeItems.join('')}</div>`;
    } else if (isSpecial) {
      punchesHtml = `<span class="text-xs text-slate-500 italic">${day.specialReason || 'Nenhum ponto registrado'}</span>`;
    } else {
      punchesHtml = `<span class="text-xs text-slate-400 italic">Sem registros</span>`;
    }

    // 3. Saldo Original
    const origDelta = formatDelta(day.originalBalanceMinutes || 0);
    const origMinutes = day.originalBalanceMinutes || 0;
    let origBadgeClass = 'bg-slate-100 text-slate-600';
    if (origMinutes > 0) origBadgeClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (origMinutes < 0) origBadgeClass = 'bg-rose-50 text-rose-700 border border-rose-200';

    // 4. Batida Sugerida (Substitui Ação Recomendada, Batida S2 e Copiar)
    let suggestedHtml = '';

    if (day.simplifiedAction === 'extra_work') {
      const punchesButtons = (day.punches || []).map(p => {
        const timeStr = typeof p === 'string' ? p : p.time;
        return makeSuggestedBadge(timeStr);
      }).join('');
      const isFeriado = (day.specialReason || '').toLowerCase().includes('feriado');
      const tagText = isFeriado ? 'Trabalho em Feriado' : 'Fim de Semana';
      const tagClass = isFeriado
        ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
        : 'bg-purple-50 text-purple-700 border-purple-200';

      suggestedHtml = `
        <div class="flex flex-wrap items-center gap-1.5">
          ${punchesButtons}
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold ${tagClass} border shadow-2xs">
            ${tagText}
          </span>
        </div>
      `;
    } else if (day.simplifiedAction === 'modify_exit') {
      suggestedHtml = `
        <div class="flex flex-wrap items-center gap-1.5">
          ${makeNormalBadge(e1Default)}
          ${makeNormalBadge(s1Default)}
          ${makeNormalBadge(e2Default)}
          ${makeCancelledBadge(s2Default)}
          ${makeSuggestedBadge(day.suggestedPunchS2)}
        </div>
      `;
    } else if (day.simplifiedAction === 'half_day') {
      suggestedHtml = `
        <div class="flex flex-wrap items-center gap-1.5">
          ${makeNormalBadge(e1Default)}
          ${makeNormalBadge(s1Default)}
          ${makeCancelledBadge(e2Default)}
          ${makeCancelledBadge(s2Default)}
          <span class="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Meio Período
          </span>
        </div>
      `;
    } else if (isSpecial) {
      const isFeriado = (day.specialReason || '').toLowerCase().includes('feriado');
      if (isFeriado) {
        suggestedHtml = `
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200">
            <i data-lucide="calendar" class="w-3.5 h-3.5 text-sky-600"></i>
            Feriado / Sem Expediente
          </span>
        `;
      } else {
        // Falta integral
        suggestedHtml = `
          <div class="flex flex-wrap items-center gap-1.5">
            ${makeCancelledBadge(e1Default)}
            ${makeCancelledBadge(s1Default)}
            ${makeCancelledBadge(e2Default)}
            ${makeCancelledBadge(s2Default)}
            <span class="inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
              Falta Integral
            </span>
          </div>
        `;
      }
    } else {
      // keep_standard
      suggestedHtml = `
        <div class="flex flex-wrap items-center gap-1.5">
          ${makeNormalBadge(e1Default)}
          ${makeNormalBadge(s1Default)}
          ${makeNormalBadge(e2Default)}
          ${makeNormalBadge(s2Default)}
        </div>
      `;
    }

    html += `
      <tr class="${rowClass} transition-colors border-b border-slate-100">
        <td class="py-3 px-4 whitespace-nowrap">
          <div class="flex items-center gap-2">
            <span class="px-1.5 py-0.5 text-2xs font-mono font-semibold uppercase rounded bg-slate-200/80 text-slate-700">
              ${dayOfWeek}
            </span>
            <span class="font-medium text-slate-800">${dateFormatted}</span>
          </div>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          ${punchesHtml}
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2 py-0.5 rounded text-2xs font-mono font-bold ${origBadgeClass}">
            ${origDelta}
          </span>
        </td>
        <td class="py-3 px-4 whitespace-nowrap">
          ${suggestedHtml}
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  if (emptyState) emptyState.classList.add('hidden');
  if (tableContainer) tableContainer.classList.remove('hidden');

  // Inicializa os ícones Lucide da tabela
  if (window.lucide) {
    window.lucide.createIcons({ root: tbody });
  }

  // Vincula a cópia nos botões gerados
  const copyButtons = tbody.querySelectorAll('.copy-btn');
  copyButtons.forEach((btn) => {
    const time = btn.getAttribute('data-copy-time');
    if (time) {
      setupClipboardCopy(btn, time);
    }
  });
}

// Anexa ao escopo global para facilitar integração com outros módulos e scripts legados
if (typeof window !== 'undefined') {
  window.PontoUI = {
    renderSummaryCards,
    renderTable,
    setupClipboardCopy,
    updateSliderDisplays,
    updateFilterCounters,
    setLoadingState,
    showToast,
    showNotification,
    formatDelta,
    formatMinutesToTime,
    parseTimeToMinutes
  };
}
