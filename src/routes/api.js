const express = require('express');
const { persistEntries, readEntries } = require('../persistence/ledgerRepo');
const { buildReport, readReportFile, readReportTxtFile, formatReportAsTxt } = require('../services/reportService');

const router = express.Router();

router.get('/lancamentos', async (req, res) => {
  try {
    const entries = await readEntries();
    res.json(entries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao ler lançamentos' });
  }
});

router.put('/lancamentos', async (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'payload deve ser um array de lançamentos' });
    }
    const persisted = await persistEntries(entries);
    res.json({ status: 'ok', count: persisted.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao persistir lançamentos' });
  }
});

router.get('/report', async (req, res) => {
  try {
    const report = await buildReport();
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao gerar relatório' });
  }
});

router.get('/report/json', async (req, res) => {
  try {
    const report = await readReportFile();
    if (!report) {
      return res.status(404).json({ error: 'relatório json não encontrado' });
    }
    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao ler relatório json' });
  }
});

router.get('/report/json/download', async (req, res) => {
  try {
    const report = await buildReport();
    const json = JSON.stringify(report, null, 2);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.json"');
    res.send(json);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao gerar download do relatório json' });
  }
});

router.get('/report/txt', async (req, res) => {
  try {
    const text = await readReportTxtFile();
    if (!text) {
      return res.status(404).json({ error: 'relatório txt não encontrado' });
    }
    res.type('text/plain; charset=utf-8');
    res.send(text);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao ler relatório txt' });
  }
});

router.get('/report/txt/download', async (req, res) => {
  try {
    const report = await buildReport();
    const text = formatReportAsTxt(report);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.txt"');
    res.send(text);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'falha ao gerar download do relatório txt' });
  }
});

module.exports = router;
