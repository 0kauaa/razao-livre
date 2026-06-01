var LL=[];
var BACKEND_URL = '/api';

/* ── navegação ─────────────────────────────────────── */
function goTo(n){
  if(n>0&&LL.length===0){toast('Adicione pelo menos 1 lançamento primeiro!','w');return;}
  document.querySelectorAll('.scr').forEach(function(s,i){s.classList.toggle('active',i===n);});
  document.querySelectorAll('.nb').forEach(function(b,i){b.classList.remove('active','done');if(i===n)b.classList.add('active');if(i<n)b.classList.add('done');});
  if(n===1)renderRaz();
  if(n===2)renderBal();
  if(n===3)renderBP();
}

function syncServer(){
  if(!window.fetch) return;
  fetch(BACKEND_URL+'/lancamentos',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(LL)})
    .then(function(res){
      if(!res.ok){return res.json().then(function(data){throw new Error(data.error||'erro de servidor');});}
      return res.json();
    })
    .catch(function(err){
      console.error('erro ao persistir no servidor',err);
      toast('falha ao persistir no mongodb local','e');
    });
}

function normalizeEntryIds(entries){
  return entries.map(function(entry){
    var id = entry._id;
    if (id && typeof id !== 'string' && id.toString) {
      id = id.toString();
    }
    return Object.assign({}, entry, { _id: id });
  });
}

function loadEntries(){
  if(!window.fetch) return;
  fetch(BACKEND_URL+'/lancamentos')
    .then(function(res){
      if(!res.ok){return res.json().then(function(data){throw new Error(data.error||'erro de servidor');});}
      return res.json();
    })
    .then(function(data){
      if(Array.isArray(data)){
        LL = normalizeEntryIds(data);
      } else {
        LL = [];
      }
      renderEnt();
    })
    .catch(function(err){
      console.warn('não foi possível carregar lançamentos do servidor',err);
      toast('Não foi possível carregar lançamentos do MongoDB','w');
      renderEnt();
    });
}

function downloadReportJson(){
  window.location = BACKEND_URL + '/report/json/download';
}

function downloadReportTxt(){
  window.location = BACKEND_URL + '/report/txt/download';
}

function openReport(){
  var body=document.getElementById('moBody');
  body.innerHTML='<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px;"><button class="btn bo bsm" onclick="downloadReportJson()">Baixar JSON</button><button class="btn bo bsm" onclick="downloadReportTxt()">Baixar TXT</button></div>';
  body.innerHTML+='<div class="ib igo">carregando relatório json...</div>';
  document.getElementById('moOv').classList.add('open');
  fetch(BACKEND_URL+'/report')
    .then(function(res){if(!res.ok){throw new Error('não foi possível carregar o relatório');}return res.json();})
    .then(function(data){
      var html=body.innerHTML;
      html+='<div class="ib igo">relatório json gerado pelo pipeline mongodb local</div>';
      html+='<div class="stl">balanço patrimonial formatado</div>';
      html+='<div class="report-summary">';
      html+='<div class="br"><span>ativo total</span><span>R$ '+fmt(data.totalAtivo)+'</span></div>';
      html+='<div class="br"><span>passivo total</span><span>R$ '+fmt(data.totalPassivo)+'</span></div>';
      html+='<div class="br"><span>patrimônio líquido</span><span>R$ '+fmt(data.totalPL)+'</span></div>';
      html+='<div class="br"><span>resultado</span><span>R$ '+fmt(data.resultado)+'</span></div>';
      html+='<div class="br"><span>passivo + pl</span><span>R$ '+fmt(data.totalPassivoPL)+'</span></div>';
      html+='<div class="br"><span>equilibrado</span><span>'+ (data.equilibrado ? 'sim' : 'não') +'</span></div>';
      html+='</div>';
      html+='<div class="stl">json do relatório</div>';
      html+='<pre class="ms">'+JSON.stringify(data,null,2)+'</pre>';
      body.innerHTML=html;
    })
    .catch(function(err){
      console.error(err);
      body.innerHTML='<div class="ib bda">não foi possível ler o relatório json. veja o console para detalhes.</div>';
    });
}

/* ── utilitários ─────────────────────────────────────────── */
function fmt(v){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function pv(v){return parseFloat(v)||0;}
function toast(msg,t){
  var el=document.getElementById('toastEl');
  el.textContent=msg;
  el.style.background=t==='w'?'var(--go)':t==='e'?'var(--da)':'var(--ac)';
  el.classList.add('show');
  setTimeout(function(){el.classList.remove('show');},2800);
}
function toggleConn(btn){
  var c=document.getElementById('connCard');
  var open=c.style.display==='block';
  c.style.display=open?'none':'block';
  btn.textContent=open?'▸ MongoDB':'▾ MongoDB';
}

/* ── tipos de conta ─────────────────────────────────────────── */
var TIPOS={
  'AC': {label:'Ativo Circulante',    cls:'t-ac',  nat:'D', grupo:'ativo'},
  'ANC':{label:'Ativo Não Circ.',     cls:'t-anc', nat:'D', grupo:'ativo'},
  'PC': {label:'Passivo Circulante',  cls:'t-pc',  nat:'C', grupo:'passivo'},
  'PNC':{label:'Passivo Não Circ.',   cls:'t-pnc', nat:'C', grupo:'passivo'},
  'PL': {label:'Patrimônio Líquido',  cls:'t-pl',  nat:'C', grupo:'pl'},
  'RE': {label:'Receita',             cls:'t-re',  nat:'C', grupo:'resultado'},
  'DE': {label:'Despesa',             cls:'t-de',  nat:'D', grupo:'resultado'},
  'BE': {label:'Bens',                cls:'t-be',  nat:'D', grupo:'ativo'}
};

/* ── adicionar lançamento ──────────────────────────── */
function addL(){
  var cn=document.getElementById('fCn').value.trim();
  var db=pv(document.getElementById('fDb').value);
  var cr=pv(document.getElementById('fCr').value);
  if(!cn){toast('Informe o nome da conta','w');return;}
  if(db===0&&cr===0){toast('Informe débito ou crédito','w');return;}
  var dt=document.getElementById('fDt').value||new Date().toISOString().slice(0,10);
  var tp=document.getElementById('fTp').value;
  var nt=document.getElementById('fNt').value;
  LL.push({
    _id:Date.now().toString(36)+Math.random().toString(36).slice(2,4),
    data:dt,conta:cn,tipo:tp,natureza:nt,debito:db,credito:cr,
    descricao:document.getElementById('fDs').value.trim(),
    periodo:dt.slice(0,7),
    saldo:{debito:db,credito:cr,liquido:db-cr},
    movimentacoes:[{data:dt,debito:db,credito:cr}]
  });
  ['fCn','fDb','fCr','fDs'].forEach(function(id){document.getElementById(id).value='';});
  renderEnt();
  syncServer();
  toast('Lançamento adicionado!');
}

function removeL(id){LL=LL.filter(function(l){return l._id!==id;});renderEnt();syncServer();}
function clearAll(){LL=[];renderEnt();syncServer();toast('Lançamentos removidos.');}

function renderEnt(){
  document.getElementById('cntLbl').textContent='('+LL.length+')';
  var c=document.getElementById('entDiv');
  if(!LL.length){c.innerHTML='<div class="es"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg><p>Nenhum lançamento.</p></div>';
    return;
  }
  var h='<table class="et"><thead><tr><th>Data</th><th>Conta</th><th>Tipo</th><th>Nat.</th><th style="text-align:right">Débito</th><th style="text-align:right">Crédito</th><th>Descrição</th><th></th></tr></thead><tbody>';
  LL.forEach(function(l){
    var t=TIPOS[l.tipo]||{label:l.tipo,cls:'t-ac'};
    h+='<tr><td class="db">'+l.data+'</td><td style="font-weight:500">'+l.conta+'</td><td><span class="tb '+t.cls+'">'+t.label+'</span></td><td style="font-size:12px;color:var(--tx3)">'+l.natureza+'</td><td class="ac-cell dc">'+(l.debito>0?'R$ '+fmt(l.debito):'—')+'</td><td class="ac-cell cc">'+(l.credito>0?'R$ '+fmt(l.credito):'—')+'</td><td style="font-size:13px;color:var(--tx2)">'+(l.descricao||'—')+'</td><td><button class="btn bda" onclick="removeL(\''+l._id+'\')">✕</button></td></tr>';
  });
  h+='</tbody></table>';
  c.innerHTML=h;
}

/* ── contas agregadas ──────────────────────────────── */
function getContas(){
  var m={};
  LL.forEach(function(l){
    var k=l.conta+'|'+l.tipo;
    if(!m[k])m[k]={conta:l.conta,tipo:l.tipo,natureza:l.natureza,tD:0,tC:0,ent:[]};
    m[k].tD+=l.debito;m[k].tC+=l.credito;
    m[k].ent.push(l);
  });
  return m;
}

/* ── razonete ──────────────────────────────────────── */
function renderRaz(){
  var m=getContas();
  var h='<div class="rg">';
  Object.keys(m).forEach(function(k){
    var info=m[k];
    var t=TIPOS[info.tipo]||{label:info.tipo,cls:'t-ac'};
    var tD=info.tD,tC=info.tC;
    var saldo=Math.abs(tD-tC);
    var dev=tD>=tC;
    var byD={};
    info.ent.forEach(function(e){
      if(!byD[e.data])byD[e.data]={d:0,c:0};
      byD[e.data].d+=e.debito;byD[e.data].c+=e.credito;
    });
    h+='<div class="rc"><div class="rh"><span class="rn">'+info.conta+'</span><span class="tb '+t.cls+'">'+t.label+'</span></div>';
    h+='<div class="rcols"><div class="rch">Débito</div><div class="rch">Crédito</div></div>';
    Object.keys(byD).forEach(function(d){var v=byD[d];h+='<div class="rrow"><div class="rd" title="'+d+'">'+(v.d>0?fmt(v.d):'')+'</div><div class="rcc" title="'+d+'">'+(v.c>0?fmt(v.c):'')+'</div></div>';});
    h+='<div class="rtot"><span class="rtd">'+fmt(tD)+'</span><span class="rtc">'+fmt(tC)+'</span></div>';
    h+='<div class="rs '+(dev?'sd':'scr2')+'">Saldo '+(dev?'devedor':'credor')+': R$ '+fmt(saldo)+'</div>';
    h+='</div>';
  });
  h+='</div>';
  document.getElementById('razDiv').innerHTML=h;
}

/* ── balancete ─────────────────────────────────────── */
function renderBal(){
  var m=getContas();
  var tD=0,tC=0;
  var h='<div class="card"><table class="bt"><thead><tr><th>Conta</th><th>Tipo</th><th>Natureza</th><th class="nr">Débito</th><th class="nr">Crédito</th><th class="nr">Saldo</th></tr></thead><tbody>';
  Object.keys(m).forEach(function(k){
    var info=m[k];var t=TIPOS[info.tipo]||{label:info.tipo,cls:'t-ac'};
    var saldo=Math.abs(info.tD-info.tC);
    tD+=info.tD;tC+=info.tC;
    var dev=info.tD>=info.tC;
    h+='<tr><td style="font-weight:500">'+info.conta+'</td><td><span class="tb '+t.cls+'">'+t.label+'</span></td><td style="font-size:12px;color:var(--tx3)">'+info.natureza+'</td><td class="nc vm">'+(info.tD>0?'R$ '+fmt(info.tD):'—')+'</td><td class="nc vd">'+(info.tC>0?'R$ '+fmt(info.tC):'—')+'</td><td class="nc '+(dev?'vb':'vd')+'">R$ '+fmt(saldo)+'</td></tr>';
  });
  h+='<tr class="tr"><td colspan="3">TOTAL GERAL</td><td class="nc vm">R$ '+fmt(tD)+'</td><td class="nc vd">R$ '+fmt(tC)+'</td><td class="nc">—</td></tr></tbody></table>';
  var eq=Math.abs(tD-tC)<0.01;
  h+='<div class="bck '+(eq?'bok':'ber')+'"><div class="cdot '+(eq?'cdok':'cder')+'"></div>'+(eq?'✓ Balancete equilibrado — Total Débitos = Total Créditos (R$ '+fmt(tD)+')':'⚠ Diferença de R$ '+fmt(Math.abs(tD-tC))+' — verifique se todos os lançamentos possuem partida dobrada.')+'</div></div>';
  document.getElementById('balDiv').innerHTML=h;
}

/* ── balanço patrimonial ───────────────────────────── */
function renderBP(){
  var m=getContas();
  var grupos={AC:{},ANC:{},BE:{},PC:{},PNC:{},PL:{},RE:{},DE:{}};
  Object.keys(m).forEach(function(k){
    var info=m[k];
    var saldo=info.tD>=info.tC?(info.tD-info.tC):(info.tC-info.tD);
    if(grupos[info.tipo]!==undefined)grupos[info.tipo][info.conta]=saldo;
  });
  function sumG(g){return Object.values(g).reduce(function(s,v){return s+v;},0);}
  function rows(g,klass){
    var h='';
    Object.keys(g).forEach(function(n){
      h+='<div class="br"><span>'+n+'</span><span class="bval '+(klass||'')+'">R$ '+fmt(g[n])+'</span></div>';
    });
    return h;
  }
  function section(title,g,klass){
    if(!Object.keys(g).length)return'';
    return'<div class="bgt">'+title+'</div>'+rows(g,klass)+'<div class="bsubt"><span>Subtotal</span><span class="bval">R$ '+fmt(sumG(g))+'</span></div>';
  }

  var tAtivo=sumG(grupos.AC)+sumG(grupos.ANC)+sumG(grupos.BE);
  var tPassivo=sumG(grupos.PC)+sumG(grupos.PNC);
  var tPL=sumG(grupos.PL);
  var tRE=sumG(grupos.RE);
  var tDE=sumG(grupos.DE);
  var resultado=tRE-tDE;
  var tPassivoPL=tPassivo+tPL+resultado;

  var ativoH=section('Ativo Circulante',grupos.AC,'vb')
             +section('Ativo Não Circulante',grupos.ANC,'vb')
             +section('Bens',grupos.BE,'vb');
  ativoH+='<div class="btot"><span>TOTAL DO ATIVO</span><span style="font-family:\'DM Mono\',monospace">R$ '+fmt(tAtivo)+'</span></div>';

  var passH=section('Passivo Circulante',grupos.PC,'vm')
            +section('Passivo Não Circulante',grupos.PNC,'vm')
            +section('Patrimônio Líquido',grupos.PL,'vd');

  if(tRE>0||tDE>0){
    passH+='<div class="bgt">Resultado do Exercício</div>';
    if(Object.keys(grupos.RE).length){passH+='<div class="br"><span>Receitas</span><span class="bval vd">R$ '+fmt(tRE)+'</span></div>';}    
    if(Object.keys(grupos.DE).length){passH+='<div class="br"><span>(−) Despesas</span><span class="bval vm">R$ '+fmt(tDE)+'</span></div>';}    
    passH+='<div class="bsubt"><span>'+(resultado>=0?'Lucro Líquido':'Prejuízo Líquido')+'</span><span class="bval '+(resultado>=0?'vd':'vm')+'">R$ '+fmt(Math.abs(resultado))+'</span></div>';
  }
  passH+='<div class="btot"><span>TOTAL PASSIVO + PL</span><span style="font-family:\'DM Mono\',monospace">R$ '+fmt(tPassivoPL)+'</span></div>';

  var eq=Math.abs(tAtivo-tPassivoPL)<0.01;
  var saudeMensagem='';

  if(eq){
    var alertas=[];
    var pontos=[];

    var temResultado=tRE>0||tDE>0;
    var margem=tRE>0?((resultado/tRE)*100):null;
    var endividamento=tAtivo>0?((tPassivo/tAtivo)*100):null;
    var imobilizacao=tAtivo>0?(((sumG(grupos.ANC)+sumG(grupos.BE))/tAtivo)*100):null;
    var liquidezCorrente=(sumG(grupos.PC)>0)?(sumG(grupos.AC)/sumG(grupos.PC)):null;
    var plPositivo=tPL>0;

    if(temResultado){
      if(resultado>0){
        pontos.push('lucro líquido de <strong>R$ '+fmt(resultado)+'</strong>'+(margem!==null?' (margem de '+margem.toFixed(1)+'%)':''));
      } else if(resultado<0){
        alertas.push('⚠ <strong>Prejuízo de R$ '+fmt(Math.abs(resultado))+'</strong> no período — as despesas superaram as receitas. Avalie a redução de custos ou o aumento de receitas.');
      } else {
        alertas.push('ℹ Resultado nulo: receitas e despesas se cancelaram. A empresa não gerou lucro nem prejuízo.');
      }
    }

    if(endividamento!==null){
      if(endividamento===0){
        pontos.push('sem dívidas com terceiros — empresa totalmente financiada por capital próprio');
      } else if(endividamento<30){
        pontos.push('endividamento baixo de <strong>'+endividamento.toFixed(1)+'%</strong> do ativo');
      } else if(endividamento<60){
        alertas.push('📌 Endividamento de <strong>'+endividamento.toFixed(1)+'%</strong> do ativo — nível moderado. Monitore o crescimento das obrigações em relação ao patrimônio.');
      } else {
        alertas.push('🔴 Endividamento elevado de <strong>'+endividamento.toFixed(1)+'%</strong> do ativo. Mais da metade dos recursos vem de terceiros, o que aumenta o risco financeiro. Considere reforçar o capital próprio ou amortizar dívidas.');
      }
    }

    if(liquidezCorrente!==null){
      if(liquidezCorrente>=2){
        pontos.push('liquidez corrente de <strong>'+liquidezCorrente.toFixed(2)+'</strong> — ótima capacidade de pagamento de curto prazo');
      } else if(liquidezCorrente>=1){
        alertas.push('📌 Liquidez corrente de <strong>'+liquidezCorrente.toFixed(2)+'</strong> — o ativo circulante cobre o passivo circulante, mas com margem estreita. Mantenha o controle do fluxo de caixa.');
      } else {
        alertas.push('🔴 Liquidez corrente de <strong>'+liquidezCorrente.toFixed(2)+'</strong> — o ativo circulante não cobre o passivo de curto prazo. Existe risco de dificuldade para honrar obrigações imediatas.');
      }
    }

    if(imobilizacao!==null&&imobilizacao>0){
      if(imobilizacao>70){
        alertas.push('📌 <strong>'+imobilizacao.toFixed(1)+'%</strong> do ativo está imobilizado em bens e não circulante. Alta concentração em ativos de baixa liquidez pode limitar a capacidade de resposta a imprevistos.');
      } else if(imobilizacao>40){
        alertas.push('ℹ <strong>'+imobilizacao.toFixed(1)+'%</strong> do ativo em imobilizado — nível relevante. Avalie se a estrutura de ativos está adequada ao perfil operacional da empresa.');
      }
    }

    if(!plPositivo&&tPL!==0){
      alertas.push('🔴 <strong>Patrimônio Líquido negativo</strong> — as obrigações superam os ativos próprios. A empresa está tecnicamente insolvente. Ação corretiva urgente é necessária.');
    }

    var temAlertas=alertas.length>0;
    var temPontos=pontos.length>0;
    var bg=temAlertas?(alertas.some(function(a){return a.indexOf('🔴')===0;})?'var(--dal)':'var(--gol)'):'#EAF3DE';
    var bord=temAlertas?(alertas.some(function(a){return a.indexOf('🔴')===0;})?'rgba(163,45,45,.2)':'rgba(186,117,23,.2)'):'rgba(43,77,58,.2)';
    var cor=temAlertas?(alertas.some(function(a){return a.indexOf('🔴')===0;})?'var(--da)':'var(--go)'):'var(--act)';
    var icone=temAlertas?(alertas.some(function(a){return a.indexOf('🔴')===0;})?'⚠️':'📊'):'💚';
    var titulo=temAlertas?(alertas.some(function(a){return a.indexOf('🔴')===0;})?'Atenção: pontos críticos identificados.':'Balanço equilibrado com pontos de atenção.'):'Saúde financeira positiva!';

    var corpo='<strong>'+titulo+'</strong> ';
    if(temPontos) corpo+='Destaques positivos: '+pontos.join('; ')+'. ';
    if(!temResultado&&!temAlertas&&!temPontos) corpo+='O balanço está formalmente equilibrado. Insira lançamentos de receita e despesa para uma análise financeira completa.';
    if(temAlertas) corpo+='<br><br>'+alertas.join('<br>');

    saudeMensagem='<div style="margin-top:.75rem;padding:12px 16px;border-radius:var(--r);background:'+bg+';border:1px solid '+bord+';color:'+cor+';font-size:13px;display:flex;align-items:flex-start;gap:10px">'
      +'<span style="font-size:20px;flex-shrink:0">'+icone+'</span>'
      +'<div>'+corpo+'</div></div>';

  } else {
    var totalDebBruto=0, totalCredBruto=0;
    LL.forEach(function(l){totalDebBruto+=l.debito;totalCredBruto+=l.credito;});
    var diffPartidas=Math.abs(totalDebBruto-totalCredBruto);
    var diffBalanco=Math.abs(tAtivo-tPassivoPL);

    var contrasNatureza=[];
    var naturezaEsperada={AC:'D',ANC:'D',BE:'D',PC:'C',PNC:'C',PL:'C',RE:'C',DE:'D'};
    Object.keys(m).forEach(function(k){
      var info=m[k];
      var natEsp=naturezaEsperada[info.tipo];
      if(!natEsp)return;
      var saldoDevedor=info.tD>info.tC;
      if((natEsp==='D'&&!saldoDevedor&&info.tC>info.tD)||(natEsp==='C'&&saldoDevedor&&info.tD>info.tC)){
        contrasNatureza.push(info.conta+' ('+( (TIPOS[info.tipo]||{label:info.tipo}).label )+')');
      }
    });

    var diagnostico='';
    var passos=[];

    if(diffPartidas>0.01){
      diagnostico='Os lançamentos possuem <strong>R$ '+fmt(totalDebBruto)+'</strong> em débitos e <strong>R$ '+fmt(totalCredBruto)+'</strong> em créditos — uma diferença de <strong>R$ '+fmt(diffPartidas)+'</strong>. '
        +'Isso indica que pelo menos um lançamento está sem a contrapartida correta (partida dobrada incompleta).';
      passos.push('No <strong>Livro Razão</strong>, localize lançamentos que tenham apenas débito ou apenas crédito, ou cujos valores não se correspondem.');
      passos.push('Cada lançamento deve respeitar a equação: <em>Total Débitos = Total Créditos</em>. Corrija o valor ou adicione a contrapartida faltante.');
      if(contrasNatureza.length>0){
        passos.push('As seguintes contas estão com saldo contrário à sua natureza, o que pode indicar valor digitado no campo errado: <strong>'+contrasNatureza.join(', ')+'</strong>.');
      }
    } else {
      diagnostico='Os totais de débito e crédito dos lançamentos estão iguais (R$ '+fmt(totalDebBruto)+'), '
        +'mas o balanço ainda apresenta diferença de <strong>R$ '+fmt(diffBalanco)+'</strong>. '
        +'Isso indica que uma ou mais contas estão classificadas no <strong>tipo errado</strong> — o valor está correto, mas foi alocado no grupo errado do balanço.';
      passos.push('Verifique o <strong>Tipo de Conta</strong> de cada lançamento no Livro Razão. Uma conta de Passivo classificada como Ativo, por exemplo, infla um lado e reduz o outro.');
      passos.push('Referência rápida: <em>Ativo Circulante / Não Circulante / Bens</em> → lado esquerdo; <em>Passivo Circulante / Não Circulante, Patrimônio Líquido, Receitas e Despesas</em> → lado direito.');
      if(contrasNatureza.length>0){
        passos.push('Contas com saldo contrário à natureza esperada — provável erro de tipo ou de campo: <strong>'+contrasNatureza.join(', ')+'</strong>.');
      }
    }

    var passosHtml=passos.map(function(p,i){return'<strong>'+(i+1)+'.</strong> '+p;}).join('<br>');
    saudeMensagem='<div style="margin-top:.75rem;padding:12px 16px;border-radius:var(--r);background:var(--dal);border:1px solid rgba(163,45,45,.2);color:var(--da);font-size:13px;display:flex;align-items:flex-start;gap:10px">'
      +'<span style="font-size:20px;flex-shrink:0">🔍</span>'
      +'<div><strong>Como corrigir o desequilíbrio?</strong> '+diagnostico+'<br><br>'+passosHtml+'</div></div>';
  }
  var h='<div class="bg"><div class="bs"><div class="bsh hativo">ATIVO</div>'+ativoH+'</div><div class="bs"><div class="bsh hpassivo">PASSIVO E PATRIMÔNIO LÍQUIDO</div>'+passH+'</div></div>';
  h+='<div class="beq '+(eq?'eqok':'eqer')+'">'+(eq?'<div>✓ Balanço equilibrado</div><div class="eqnum">R$ '+fmt(tAtivo)+'</div><div>Ativo = Passivo + PL</div>':'<div>⚠ Diferença de R$ '+fmt(Math.abs(tAtivo-tPassivoPL))+'</div><div style="font-size:12px">Verifique se todos os lançamentos possuem as duas partidas (débito e crédito).</div>')+'</div>';
  h+=saudeMensagem;
  document.getElementById('bpDiv').innerHTML=h;
}

/* ── exemplo (partidas dobradas corretas) ──────────── */
function loadExample(){
  if(LL.length>0){LL=[];}
  var d='2025-01-';
  function mk(id,data,cn,tp,nt,db,cr,ds){
    return{_id:id,data:data,conta:cn,tipo:tp,natureza:nt,debito:db,credito:cr,descricao:ds,periodo:data.slice(0,7),saldo:{debito:db,credito:cr,liquido:db-cr},movimentacoes:[{data:data,debito:db,credito:cr,descricao:ds}]};
  }
  LL=[
    mk('01',d+'01','Capital Social',    'PL', 'C',      0, 650000,'Integralização de capital'),
    mk('02',d+'01','Banco',             'AC', 'D', 292500,      0,'Integralização — depósito'),
    mk('03',d+'01','Caixa',             'AC', 'D', 162500,      0,'Integralização — caixa'),
    mk('04',d+'01','Imóvel',            'ANC','D',  97500,      0,'Integralização — imóvel'),
    mk('05',d+'01','Instalações',       'ANC','D',  32500,      0,'Integralização — instalações'),
    mk('06',d+'01','Móveis',            'ANC','D',  52000,      0,'Integralização — móveis'),
    mk('07',d+'01','Máquinas',          'ANC','D',  13000,      0,'Integralização — máquinas'),
    mk('08',d+'02','Mercadoria',        'AC', 'D', 350000,      0,'Compra de estoque'),
    mk('09',d+'02','Banco',             'AC', 'D',      0, 245000,'Pagamento fornecedor'),
    mk('10',d+'02','Fornecedor',        'PC', 'C',      0, 105000,'Saldo a pagar — estoque'),
    mk('11',d+'05','Carros',            'BE', 'D', 126000,      0,'Compra de veículos'),
    mk('12',d+'05','Caixa',             'AC', 'D',      0,   1000,'Pagamento entrada veículo'),
    mk('13',d+'05','Banco',             'AC', 'D',      0,  19000,'Pagamento veículos'),
    mk('14',d+'05','Duplicata a Pagar', 'PC', 'C',      0, 106000,'Financiamento veículos'),
    mk('15',d+'20','Receita de Vendas', 'RE', 'C',      0, 185000,'Vendas do período'),
    mk('16',d+'20','Caixa',             'AC', 'D',  32950,      0,'Recebimento à vista'),
    mk('17',d+'20','Duplicata a Receber','AC','D', 152050,      0,'Vendas a prazo'),
    mk('18',d+'30','Duplicata a Pagar', 'PC', 'C',  74200,      0,'Pagamento 70% da duplicata'),
    mk('19',d+'30','Banco',             'AC', 'D',      0,  74200,'Pagamento duplicata — saída banco'),
    mk('20',d+'31','Despesas Gerais',   'DE', 'D',   7500,      0,'Despesas operacionais'),
    mk('21',d+'31','Banco',             'AC', 'D',      0,   7500,'Pagamento despesas')
  ];
  renderEnt();
  syncServer();
  toast('Exemplo 1 carregado — 21 lançamentos em partidas dobradas!');
}

/* ── exemplo 2 — balanço equilibrado (loja modelo ltda) ── */
function loadExample2(){
  if(LL.length>0){LL=[];}
  var d='2025-03-';
  function mk(id,data,cn,tp,nt,db,cr,ds){
    return{_id:id,data:data,conta:cn,tipo:tp,natureza:nt,debito:db,credito:cr,descricao:ds,periodo:data.slice(0,7),saldo:{debito:db,credito:cr,liquido:db-cr},movimentacoes:[{data:data,debito:db,credito:cr,descricao:ds}]};
  }
  LL=[
    mk('e01',d+'01','Capital Social',      'PL', 'C',      0,300000,'Integralização de capital'),
    mk('e02',d+'01','Banco',               'AC', 'D', 200000,      0,'Integralização — depósito'),
    mk('e03',d+'01','Caixa',               'AC', 'D', 100000,      0,'Integralização — caixa'),
    mk('e04',d+'05','Mercadoria',          'AC', 'D',  80000,      0,'Compra de estoque'),
    mk('e05',d+'05','Fornecedor',          'PC', 'C',      0,  80000,'Estoque a prazo'),
    mk('e06',d+'10','Equipamentos',        'ANC','D',  50000,      0,'Aquisição de equipamentos'),
    mk('e07',d+'10','Móveis',              'ANC','D',  10000,      0,'Aquisição de móveis'),
    mk('e08',d+'10','Banco',               'AC', 'D',      0,  60000,'Pagamento equipamentos'),
    mk('e09',d+'20','Receita de Vendas',   'RE', 'C',      0, 150000,'Vendas do período'),
    mk('e10',d+'20','Caixa',               'AC', 'D',  60000,      0,'Recebimento à vista'),
    mk('e11',d+'20','Duplicata a Receber', 'AC', 'D',  90000,      0,'Vendas a prazo'),
    mk('e12',d+'25','Fornecedor',          'PC', 'D',  40000,      0,'Pagamento parcial fornecedor'),
    mk('e13',d+'25','Banco',               'AC', 'D',      0,  40000,'Saída banco — fornecedor'),
    mk('e14',d+'31','Despesas Gerais',     'DE', 'D',  10000,      0,'Despesas operacionais'),
    mk('e15',d+'31','Caixa',               'AC', 'D',      0,  10000,'Pagamento despesas — caixa')
  ];
  renderEnt();
  syncServer();
  toast('Exemplo 2 carregado — balanço equilibrado em R$ 520.000!');
}

/* ── script mongodb ────────────────────────────────── */
function openScript(){
  var db=document.getElementById('mDb').value||'balancos';
  var col=document.getElementById('mCol').value||'lancamentos';
  var docs=LL.length>0?JSON.stringify(LL,null,2):gerarDocsExemplo();
  var body=document.getElementById('moBody');
  body.innerHTML='<div class="ib igo">ℹ Execute no MongoSH (mongosh) ou aba Mongosh do Compass. Copie cada parte pelo botão.</div>'
    +'<div class="stl">Parte 1 — Modelagem e Carga (insertMany)</div>'
    +'<pre class="ms" id="pt1">use("'+db+'")\n\n// Coleção principal (req 1: 10+ documentos)\n// Objeto embutido: campo "saldo" (req 2)\n// Array: campo "movimentacoes" (req 3)\n// Campos exclusivos em alguns docs (req 4 — flexibilidade NoSQL)\ndb.'+col+'.insertMany('+docs+')</pre>'
    +'<button class="btn bo bsm" onclick="cpById(\'pt1\')">Copiar Parte 1</button>'
    +'<div class="stl">Parte 2 — Consultas (find)</div>'
    +'<pre class="ms" id="pt2">// 1. Busca por Igualdade — contas do tipo Ativo Circulante\ndb.'+col+'.find({ "tipo": "AC" })\n\n// 2. Filtro de Intervalo — débitos acima de R$ 50.000\ndb.'+col+'.find({ "debito": { $gt: 50000 } })\n\n// 3. Busca em Array — lançamentos com movimento na data\ndb.'+col+'.find({ "movimentacoes.data": "2025-01-01" })\n\n// 4. Busca Parcial (Regex) — contas com "caixa" no nome\ndb.'+col+'.find({ "conta": /caixa/i })\n\n// 5. Projeção Específica — conta e saldo.liquido, sem _id\ndb.'+col+'.find(\n  {},\n  { "conta": 1, "saldo": 1, "_id": 0 }\n)</pre>'
    +'<button class="btn bo bsm" onclick="cpById(\'pt2\')">Copiar Parte 2</button>'
    +'<div class="stl">Estrutura do Documento (Schema)</div>'
    +'<pre class="ms">{\n  "_id": "01",\n  "data": "2025-01-01",\n  "conta": "Banco",\n  "tipo": "AC",          // AC | ANC | PC | PNC | PL | RE | DE | BE\n  "natureza": "D",        // D = Devedora, C = Credora\n  "debito": 292500,\n  "credito": 0,\n  "descricao": "...",\n  "periodo": "2025-01",\n  "saldo": {             // objeto embutido (requisito 2)\n    "debito": 292500,\n    "credito": 0,\n    "liquido": 292500\n  },\n  "movimentacoes": [     // array (requisito 3)\n    { "data": "2025-01-01", "debito": 292500, "credito": 0, "descricao": "..." }\n  ],\n  // campos exclusivos (flexibilidade NoSQL — requisito 4):\n  // "vencimentos": ["2025-02-05"]  — apenas Duplicata a Pagar\n  // "clientes": ["Cliente A"]     — apenas Duplicata a Receber\n  // "quantidade": 2               — apenas Carros/Bens\n}</pre>'
    +'<button class="btn bo bsm" onclick="cpAll()">Copiar Script Completo</button>';
  document.getElementById('moOv').classList.add('open');
}

function gerarDocsExemplo(){
  var ex=[
    {_id:"01",data:"2025-01-01",conta:"Capital Social",tipo:"PL",natureza:"C",debito:0,credito:650000,descricao:"Integralização",periodo:"2025-01",saldo:{debito:0,credito:650000,liquido:-650000},movimentacoes:[{data:"2025-01-01",debito:0,credito:650000}]},
    {_id:"02",data:"2025-01-01",conta:"Banco",tipo:"AC",natureza:"D",debito:292500,credito:0,descricao:"Integralização",periodo:"2025-01",saldo:{debito:292500,credito:0,liquido:292500},movimentacoes:[{data:"2025-01-01",debito:292500,credito:0}]},
    {_id:"03",data:"2025-01-01",conta:"Caixa",tipo:"AC",natureza:"D",debito:162500,credito:0,descricao:"Integralização",periodo:"2025-01",saldo:{debito:162500,credito:0,liquido:162500},movimentacoes:[{data:"2025-01-01",debito:162500,credito:0}]},
    {_id:"04",data:"2025-01-01",conta:"Imovel",tipo:"ANC",natureza:"D",debito:97500,credito:0,descricao:"Integralização",periodo:"2025-01",saldo:{debito:97500,credito:0,liquido:97500},movimentacoes:[{data:"2025-01-01",debito:97500,credito:0}]},
    {_id:"05",data:"2025-01-02",conta:"Mercadoria",tipo:"AC",natureza:"D",debito:350000,credito:0,descricao:"Compra estoque",periodo:"2025-01",saldo:{debito:350000,credito:0,liquido:350000},movimentacoes:[{data:"2025-01-02",debito:350000,credito:0}]},
    {_id:"06",data:"2025-01-02",conta:"Banco",tipo:"AC",natureza:"D",debito:0,credito:245000,descricao:"Pagamento fornecedor",periodo:"2025-01",saldo:{debito:0,credito:245000,liquido:-245000},movimentacoes:[{data:"2025-01-02",debito:0,credito:245000}]},
    {_id:"07",data:"2025-01-02",conta:"Fornecedor",tipo:"PC",natureza:"C",debito:0,credito:105000,descricao:"Saldo a pagar",periodo:"2025-01",saldo:{debito:0,credito:105000,liquido:-105000},movimentacoes:[{data:"2025-01-02",debito:0,credito:105000}],prazo_pagamento:"30 dias"},
    {_id:"08",data:"2025-01-05",conta:"Carros",tipo:"BE",natureza:"D",debito:126000,credito:0,descricao:"Compra veiculos",periodo:"2025-01",saldo:{debito:126000,credito:0,liquido:126000},movimentacoes:[{data:"2025-01-05",debito:126000,credito:0}],quantidade:2},
    {_id:"09",data:"2025-01-05",conta:"Duplicata a Pagar",tipo:"PC",natureza:"C",debito:0,credito:106000,descricao:"Financiamento veiculos",periodo:"2025-01",saldo:{debito:0,credito:106000,liquido:-106000},movimentacoes:[{data:"2025-01-05",debito:0,credito:106000}],vencimentos:["2025-02-05","2025-03-05","2025-04-05"]},
    {_id:"10",data:"2025-01-20",conta:"Receita de Vendas",tipo:"RE",natureza:"C",debito:0,credito:185000,descricao:"Vendas do periodo",periodo:"2025-01",saldo:{debito:0,credito:185000,liquido:-185000},movimentacoes:[{data:"2025-01-20",debito:0,credito:185000}]},
    {_id:"11",data:"2025-01-20",conta:"Caixa",tipo:"AC",natureza:"D",debito:32950,credito:0,descricao:"Venda a vista",periodo:"2025-01",saldo:{debito:32950,credito:0,liquido:32950},movimentacoes:[{data:"2025-01-20",debito:32950,credito:0}]},
    {_id:"12",data:"2025-01-20",conta:"Duplicata a Receber",tipo:"AC",natureza:"D",debito:152050,credito:0,descricao:"Vendas a prazo",periodo:"2025-01",saldo:{debito:152050,credito:0,liquido:152050},movimentacoes:[{data:"2025-01-20",debito:152050,credito:0}],clientes:["Cliente A","Cliente B"]},
    {_id:"13",data:"2025-01-31",conta:"Despesas Gerais",tipo:"DE",natureza:"D",debito:7500,credito:0,descricao:"Despesas operacionais",periodo:"2025-01",saldo:{debito:7500,credito:0,liquido:7500},movimentacoes:[{data:"2025-01-31",debito:7500,credito:0}]}
  ];
  return JSON.stringify(ex,null,2);
}

function cpById(id){var el=document.getElementById(id);if(!el)return;navigator.clipboard.writeText(el.innerText).then(function(){toast('Copiado!');});}
function cpAll(){var ps=document.querySelectorAll('pre.ms');var t=Array.from(ps).map(function(p){return p.innerText;}).join('\n\n// ──────────────────\n\n');navigator.clipboard.writeText(t).then(function(){toast('Script completo copiado!');});}
function closeMo(){document.getElementById('moOv').classList.remove('open');}

document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('fDt').valueAsDate = new Date();
  loadEntries();
});
