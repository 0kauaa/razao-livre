const path = require('path');
const fs = require('fs').promises;
const { getCollection } = require('../persistence/mongoClient');
const { readEntries } = require('../persistence/ledgerRepo');

const dataDir = path.join(__dirname, '..', '..', 'data');
const reportPath = path.join(dataDir, 'relatorio.json');
const txtPath = path.join(dataDir, 'relatorio.txt');

async function runPipeline() {
  const collection = await getCollection();
  const pipeline = [
    {
      $group: {
        _id: '$tipo',
        totalDebito: { $sum: '$debito' },
        totalCredito: { $sum: '$credito' },
        natureza: { $first: '$natureza' }
      }
    },
    {
      $project: {
        tipo: '$_id',
        totalDebito: 1,
        totalCredito: 1,
        saldo: { $abs: { $subtract: ['$totalDebito', '$totalCredito'] } },
        natureza: 1,
        _id: 0
      }
    }
  ];
  return collection.aggregate(pipeline).toArray();
}

function classifyType(type) {
  const map = {
    AC: 'ativo circulante',
    ANC: 'ativo não circulante',
    BE: 'bens',
    PC: 'passivo circulante',
    PNC: 'passivo não circulante',
    PL: 'patrimônio líquido',
    RE: 'receita',
    DE: 'despesa'
  };
  return map[type] || type;
}

function buildReportFromRows(rows) {
  const groups = { AC: [], ANC: [], BE: [], PC: [], PNC: [], PL: [], RE: [], DE: [] };
  rows.forEach((row) => {
    groups[row.tipo] = groups[row.tipo] || [];
    const saldo = row.natureza === 'C'
      ? (row.totalCredito || 0) - (row.totalDebito || 0)
      : (row.totalDebito || 0) - (row.totalCredito || 0);
    groups[row.tipo].push({
      tipo: row.tipo,
      nome: classifyType(row.tipo),
      totalDebito: row.totalDebito || 0,
      totalCredito: row.totalCredito || 0,
      saldo,
      natureza: row.natureza
    });
  });

  const subtotal = (items) => items.reduce((acc, item) => acc + item.saldo, 0);

  const totalAtivo = subtotal(groups.AC) + subtotal(groups.ANC) + subtotal(groups.BE);
  const totalPassivo = subtotal(groups.PC) + subtotal(groups.PNC);
  const totalPL = subtotal(groups.PL);
  const totalReceitas = subtotal(groups.RE);
  const totalDespesas = subtotal(groups.DE);
  const resultado = totalReceitas - totalDespesas;
  const totalPassivoPL = totalPassivo + totalPL + resultado;

  return {
    geracao: new Date().toISOString(),
    totalAtivo,
    totalPassivo,
    totalPL,
    totalReceitas,
    totalDespesas,
    resultado,
    totalPassivoPL,
    equilibrado: Math.abs(totalAtivo - totalPassivoPL) < 0.01,
    secoes: groups
  };
}

function fmtNumber(value) {
  return Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatReportAsTxt(report) {
  const titles = {
    AC: 'Ativo Circulante',
    ANC: 'Ativo Não Circulante',
    BE: 'Bens',
    PC: 'Passivo Circulante',
    PNC: 'Passivo Não Circulante',
    PL: 'Patrimônio Líquido',
    RE: 'Receitas',
    DE: 'Despesas'
  };

  const lines = [];
  lines.push('Relatório Contábil — Razão Livre');
  lines.push('Gerado em: ' + report.geracao);
  lines.push('');
  lines.push('Resumo:');
  lines.push('- Total do Ativo: R$ ' + fmtNumber(report.totalAtivo));
  lines.push('- Total do Passivo: R$ ' + fmtNumber(report.totalPassivo));
  lines.push('- Patrimônio Líquido: R$ ' + fmtNumber(report.totalPL));
  lines.push('- Total de Receitas: R$ ' + fmtNumber(report.totalReceitas));
  lines.push('- Total de Despesas: R$ ' + fmtNumber(report.totalDespesas));
  lines.push('- Resultado do Exercício: R$ ' + fmtNumber(report.resultado));
  lines.push('- Passivo + Patrimônio Líquido: R$ ' + fmtNumber(report.totalPassivoPL));
  lines.push('- Balanço equilibrado: ' + (report.equilibrado ? 'sim' : 'não'));
  lines.push('');
  lines.push('Seções detalhadas:');

  Object.keys(report.secoes).forEach((tipo) => {
    const items = report.secoes[tipo];
    if (!items || !items.length) return;
    lines.push('');
    lines.push(titles[tipo] || tipo + ':');
    items.forEach((item) => {
      lines.push('  - ' + item.nome + ' (' + item.tipo + ')');
      lines.push('      Débito: R$ ' + fmtNumber(item.totalDebito));
      lines.push('      Crédito: R$ ' + fmtNumber(item.totalCredito));
      lines.push('      Saldo: R$ ' + fmtNumber(item.saldo) + ' (' + (item.natureza === 'C' ? 'Credora' : 'Devedora') + ')');
    });
  });

  lines.push('');
  lines.push('Observação: este relatório apresenta os resultados do balanço patrimonial e seus grupos contábeis em formato de texto para leitura simplificada.');
  return lines.join('\n');
}

async function writeReportFile(report) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
}

async function writeReportTxt(report) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(txtPath, formatReportAsTxt(report), 'utf8');
}

async function buildReport() {
  try {
    const rows = await runPipeline();
    const report = buildReportFromRows(rows);
    await writeReportFile(report);
    await writeReportTxt(report);
    return report;
  } catch (error) {
    console.warn('não foi possível gerar relatório pelo pipeline do mongodb, usando arquivo local', error.message);
    const entries = await readEntries();
    const rows = entries.reduce((acc, entry) => {
      const row = acc.find((item) => item.tipo === entry.tipo);
      if (!row) {
        acc.push({
          tipo: entry.tipo,
          totalDebito: entry.debito || 0,
          totalCredito: entry.credito || 0,
          natureza: entry.natureza
        });
      } else {
        row.totalDebito += entry.debito || 0;
        row.totalCredito += entry.credito || 0;
      }
      return acc;
    }, []);
    const normalized = rows.map((row) => ({
      ...row,
      saldo: Math.abs((row.totalDebito || 0) - (row.totalCredito || 0))
    }));
    const report = buildReportFromRows(normalized);
    await writeReportFile(report);
    await writeReportTxt(report);
    return report;
  }
}

async function readReportFile() {
  try {
    const text = await fs.readFile(reportPath, 'utf8');
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readReportTxtFile() {
  try {
    return await fs.readFile(txtPath, 'utf8');
  } catch {
    const report = await readReportFile();
    if (!report) {
      const built = await buildReport();
      return formatReportAsTxt(built);
    }
    const text = formatReportAsTxt(report);
    await writeReportTxt(report);
    return text;
  }
}

module.exports = { buildReport, readReportFile, readReportTxtFile, formatReportAsTxt };
