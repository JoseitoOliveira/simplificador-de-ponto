/**
 * ============================================================================
 * ORQUESTRADOR CENTRAL DA APLICAÇÃO (APP.JS) - TASK-05
 * ============================================================================
 * Gerencia o estado reativo global (appState), os eventos de upload e drag & drop,
 * o ciclo de parsing e otimização por exceção e a renderização sincronizada da UI.
 */

// Importações dos módulos da aplicação com suporte a ES Modules
import { parsePontoFacilPDF } from './parser.js';
import { 
  optimizePunches, 
  DEFAULT_CONFIG, 
  parseTimeToMinutes, 
  formatMinutesToTime 
} from './optimizer.js';
import { 
  renderSummaryCards, 
  renderTable, 
  updateSliderDisplays, 
  showToast, 
  setLoadingState 
} from './ui.js';

// Fallback defensivo para objetos no escopo global (caso scripts sejam carregados via tag <script>)
const parser = typeof parsePontoFacilPDF === 'function' ? parsePontoFacilPDF : window.PontoParser?.parsePontoFacilPDF;
const optimizer = typeof optimizePunches === 'function' ? optimizePunches : window.PontoOptimizer?.optimizePunches;
const uiRenderSummary = typeof renderSummaryCards === 'function' ? renderSummaryCards : window.PontoUI?.renderSummaryCards;
const uiRenderTable = typeof renderTable === 'function' ? renderTable : window.PontoUI?.renderTable;
const uiUpdateSliders = typeof updateSliderDisplays === 'function' ? updateSliderDisplays : window.PontoUI?.updateSliderDisplays;
const uiShowToast = typeof showToast === 'function' ? showToast : window.PontoUI?.showToast;
const uiSetLoading = typeof setLoadingState === 'function' ? setLoadingState : window.PontoUI?.setLoadingState;

/**
 * Estado Global da Aplicação
 */
export const appState = {
  periodData: null,         // Dados brutos e normalizados extraídos do PDF
  optimizationResult: null, // Resultado detalhado do cálculo de otimização
  config: {
    thresholdMinutes: 30,
    maxExitTime: "20:00",
    standardSchedule: {
      e1: "08:00",
      s1: "12:00",
      e2: "13:00",
      s2: "17:00",
      dailyMinutes: 480
    }
  },
  currentFilter: 'only_exceptions' // 'only_exceptions' | 'all'
};

/**
 * Recalcula o plano de ponto por exceção e atualiza a UI.
 * Pode ser chamado de forma reativa a cada movimentação de slider ou alteração de horário.
 */
export function recalculateAndRender() {
  if (!appState.periodData || !Array.isArray(appState.periodData.days)) {
    return;
  }

  try {
    // 1. Executa a otimização matemática com tolerância zero a desvios
    const result = optimizer(appState.periodData.days, appState.config);
    appState.optimizationResult = result;

    // 2. Atualiza os cards de resumo e impacto passando result.summary íntegro
    uiRenderSummary(result.summary, appState.periodData);

    // 3. Alerta o usuário caso o teto de saída tenha sido fisicamente excedido
    if (result.summary?.ceilingExceededWarning) {
      uiShowToast(
        'Atenção: O volume de horas extras superou o teto diário configurado. Saídas foram estendidas para preservar o saldo exato.',
        'warning'
      );
    }

    // 4. Renderiza a tabela respeitando o filtro ativo
    uiRenderTable(result.allDays || result.workDays, appState.currentFilter);

  } catch (error) {
    console.error('Erro durante o recálculo da otimização:', error);
    uiShowToast('Ocorreu um erro ao recalcular a simplificação de ponto.', 'error');
  }
}

/**
 * Processa um arquivo PDF (File ou Blob) selecionado ou arrastado.
 * @param {File|Blob} file 
 */
export async function handlePdfUpload(file) {
  if (!file) return;

  // Validação do tipo de arquivo (extensão .pdf ou MIME application/pdf)
  const isPdf = file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    uiShowToast('Por favor, selecione um arquivo no formato PDF válido.', 'warning');
    return;
  }

  uiSetLoading(true);

  try {
    // Leitura assíncrona 100% no cliente (Zero Backend)
    const periodData = await parser(file);

    if (!periodData || !Array.isArray(periodData.days) || periodData.days.length === 0) {
      throw new Error('Nenhum registro de ponto ou data foi encontrado no arquivo.');
    }

    appState.periodData = periodData;

    // Atualiza a visualização do arquivo carregado na dropzone
    updateDropzoneFileView(file);

    // Força o filtro padrão "Apenas Exceções" conforme especificação
    appState.currentFilter = 'only_exceptions';

    // Recalcula e renderiza os dados
    recalculateAndRender();

    uiShowToast('Extrato do Ponto Fácil processado com sucesso!', 'success');
  } catch (error) {
    console.error('Falha no processamento do extrato PDF:', error);
    uiShowToast(
      'Não foi possível interpretar o extrato. Verifique se o PDF é um relatório válido do Ponto Fácil.',
      'error'
    );
  } finally {
    uiSetLoading(false);
  }
}

/**
 * Atualiza o bloco visual da Dropzone exibindo nome e tamanho do arquivo carregado.
 * @param {File} file 
 */
function updateDropzoneFileView(file) {
  const defaultContent = document.getElementById('dropzone-default-content');
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const fileSize = document.getElementById('file-size');

  if (file && fileName && fileSize) {
    fileName.textContent = file.name || 'extrato.pdf';
    
    // Formata o tamanho em KB ou MB
    if (file.size) {
      const sizeKb = Math.round(file.size / 1024);
      fileSize.textContent = sizeKb >= 1024 
        ? `${(sizeKb / 1024).toFixed(1)} MB` 
        : `${sizeKb} KB`;
    } else {
      fileSize.textContent = 'Arquivo local';
    }

    if (defaultContent) defaultContent.classList.add('hidden');
    if (fileInfo) fileInfo.classList.remove('hidden');
  }
}

/**
 * Reseta a dropzone para o estado inicial pronto para novo arquivo.
 */
function resetDropzoneFileView() {
  const defaultContent = document.getElementById('dropzone-default-content');
  const fileInfo = document.getElementById('file-info');
  const fileInput = document.getElementById('pdf-input');

  if (fileInput) fileInput.value = '';
  if (defaultContent) defaultContent.classList.remove('hidden');
  if (fileInfo) fileInfo.classList.add('hidden');
}

/**
 * Inicialização dos Listeners de Eventos de Upload (Drag & Drop e Input File)
 */
function setupUploadEventListeners() {
  const dropzone = document.getElementById('dropzone');
  const pdfInput = document.getElementById('pdf-input');
  const btnReplaceFile = document.getElementById('btn-replace-file');

  if (!dropzone || !pdfInput) return;

  // Clique na dropzone dispara o seletor nativo de arquivos
  dropzone.addEventListener('click', (e) => {
    // Evita loop se o clique veio do próprio input ou do botão de troca
    if (e.target === pdfInput || e.target.closest('#btn-replace-file')) return;
    pdfInput.click();
  });

  // Botão "Trocar por outro extrato"
  if (btnReplaceFile) {
    btnReplaceFile.addEventListener('click', (e) => {
      e.stopPropagation();
      pdfInput.click();
    });
  }

  // Mudança no input file
  pdfInput.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await handlePdfUpload(file);
    }
  });

  // Previne comportamento padrão em eventos de Drag & Drop
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  // Adiciona feedback visual ao arrastar sobre a dropzone
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.add('dragover');
    });
  });

  // Remove feedback visual ao sair da dropzone
  ['dragleave', 'drop'].forEach((eventName) => {
    dropzone.addEventListener(eventName, () => {
      dropzone.classList.remove('dragover');
    });
  });

  // Evento de soltar o arquivo (Drop)
  dropzone.addEventListener('drop', async (e) => {
    const dt = e.dataTransfer;
    const file = dt?.files?.[0];
    if (file) {
      await handlePdfUpload(file);
    }
  });
}

/**
 * Inicialização dos Sliders e Inputs de Configuração
 */
function setupConfigEventListeners() {
  const sliderThreshold = document.getElementById('slider-threshold');
  const thresholdDisplay = document.getElementById('threshold-value');
  const sliderMaxExit = document.getElementById('slider-max-exit');
  const maxExitDisplay = document.getElementById('max-exit-value');

  const configE1 = document.getElementById('config-e1');
  const configS1 = document.getElementById('config-s1');
  const configE2 = document.getElementById('config-e2');
  const configS2 = document.getElementById('config-s2');

  const btnOptimize = document.getElementById('btn-optimize');

  // Slider de Threshold (0 a 60 minutos)
  if (sliderThreshold) {
    sliderThreshold.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10) || 0;
      appState.config.thresholdMinutes = val;
      if (thresholdDisplay) {
        thresholdDisplay.textContent = `±${val} min`;
      }
      recalculateAndRender();
    });
  }

  // Slider de Horário Máximo de Saída (minutos a partir da meia-noite, ex: 1200 = 20:00)
  if (sliderMaxExit) {
    sliderMaxExit.addEventListener('input', (e) => {
      const mins = parseInt(e.target.value, 10) || 1200;
      const formatted = formatMinutesToTime(mins);
      appState.config.maxExitTime = formatted;
      if (maxExitDisplay) {
        maxExitDisplay.textContent = formatted;
      }
      recalculateAndRender();
    });
  }

  // Inputs de Horários Contratuais Padrão
  const updateSchedule = () => {
    if (configE1) appState.config.standardSchedule.e1 = configE1.value || "08:00";
    if (configS1) appState.config.standardSchedule.s1 = configS1.value || "12:00";
    if (configE2) appState.config.standardSchedule.e2 = configE2.value || "13:00";
    if (configS2) appState.config.standardSchedule.s2 = configS2.value || "17:00";

    // Recalcula a jornada diária padrão em minutos
    const e1 = parseTimeToMinutes(appState.config.standardSchedule.e1);
    const s1 = parseTimeToMinutes(appState.config.standardSchedule.s1);
    const e2 = parseTimeToMinutes(appState.config.standardSchedule.e2);
    const s2 = parseTimeToMinutes(appState.config.standardSchedule.s2);
    const dailyMins = Math.max(0, (s1 - e1)) + Math.max(0, (s2 - e2));
    appState.config.standardSchedule.dailyMinutes = dailyMins || 480;

    recalculateAndRender();
  };

  [configE1, configS1, configE2, configS2].forEach((input) => {
    if (input) {
      input.addEventListener('change', updateSchedule);
    }
  });

  // Botão Primário "Simplificar Ponto"
  if (btnOptimize) {
    btnOptimize.addEventListener('click', () => {
      if (!appState.periodData) {
        uiShowToast('Por favor, carregue um extrato em PDF antes de simplificar.', 'warning');
        return;
      }

      // Garante que o filtro padrão seja "Apenas Exceções"
      appState.currentFilter = 'only_exceptions';
      recalculateAndRender();

      // Scroll suave até a tabela de resultados
      const filterBar = document.getElementById('filter-bar');
      if (filterBar) {
        filterBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      uiShowToast('Ponto recalculado com sucesso!', 'success');
    });
  }
}

/**
 * Inicialização dos Botões de Alternância de Filtros da Tabela
 */
function setupFilterEventListeners() {
  const filterOnlyExceptions = document.getElementById('filter-only-exceptions');
  const filterAll = document.getElementById('filter-all');

  if (filterOnlyExceptions) {
    filterOnlyExceptions.addEventListener('click', () => {
      if (appState.currentFilter === 'only_exceptions') return;
      appState.currentFilter = 'only_exceptions';
      if (appState.optimizationResult) {
        uiRenderTable(
          appState.optimizationResult.allDays || appState.optimizationResult.workDays,
          appState.currentFilter
        );
      }
    });
  }

  if (filterAll) {
    filterAll.addEventListener('click', () => {
      if (appState.currentFilter === 'all') return;
      appState.currentFilter = 'all';
      if (appState.optimizationResult) {
        uiRenderTable(
          appState.optimizationResult.allDays || appState.optimizationResult.workDays,
          appState.currentFilter
        );
      }
    });
  }
}

/**
 * Adiciona facilidade para carregar a amostra de teste real inclusa no projeto
 */
function setupSampleDataLoader() {
  // Cria um botão sutil de demonstração no cabeçalho ou dropzone caso queira testar com 1 clique
  const dropzone = document.getElementById('dropzone-default-content');
  if (dropzone && !document.getElementById('btn-load-sample')) {
    const sampleLink = document.createElement('button');
    sampleLink.type = 'button';
    sampleLink.id = 'btn-load-sample';
    sampleLink.className = 'mt-3 text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2 flex items-center gap-1 cursor-pointer transition-colors';
    sampleLink.innerHTML = '<i data-lucide="play-circle" class="w-3.5 h-3.5"></i> Testar com extrato de amostra (16 set - 15 out)';

    sampleLink.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        uiSetLoading(true);
        const response = await fetch('./data/16 set. 2026 - 15 out. 2026.pdf');
        if (!response.ok) {
          throw new Error(`Falha ao obter amostra: HTTP ${response.status}`);
        }
        const blob = await response.blob();
        const sampleFile = new File([blob], '16 set. 2026 - 15 out. 2026.pdf', { type: 'application/pdf' });
        await handlePdfUpload(sampleFile);
      } catch (err) {
        console.warn('Não foi possível carregar a amostra via fetch (possível restrição de file:// protocol):', err);
        uiShowToast('Para usar o arquivo de teste, arraste o PDF da pasta data/ até a área de upload.', 'info');
      } finally {
        uiSetLoading(false);
      }
    });

    dropzone.appendChild(sampleLink);
    if (window.lucide) {
      window.lucide.createIcons({ root: sampleLink });
    }
  }
}

/**
 * Ponto de Entrada da Aplicação (DOMContentLoaded)
 */
export function initApp() {
  // Sincroniza sliders e displays iniciais com appState.config
  uiUpdateSliders(appState.config);

  // Registra os ouvintes de eventos
  setupUploadEventListeners();
  setupConfigEventListeners();
  setupFilterEventListeners();
  setupSampleDataLoader();

  // Renderiza ícones Lucide
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Auto-inicialização quando o DOM estiver pronto
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
}

// Expõe appState e funções globalmente para inspeção e testes automatizados
if (typeof window !== 'undefined') {
  window.appState = appState;
  window.recalculateAndRender = recalculateAndRender;
  window.handlePdfUpload = handlePdfUpload;
}
