# Plano de melhoria — riscos climáticos e disponibilidade hídrica

## 1. Objetivo

Evoluir o CEREJÁ com dois módulos integrados ao calendário agrícola e à consulta por coordenada:

1. **Calendário inteligente de riscos climáticos**: antecipar períodos de calor elevado, baixa umidade, sequência de dias secos e alteração do padrão de chuvas, comparando a situação recente com o histórico regional.
2. **Monitor de disponibilidade hídrica**: mostrar a duração da estiagem meteorológica e a chuva acumulada em 7, 15 e 30 dias, com origem, atualização e completude dos dados.

O produto deve diferenciar claramente três tipos de informação:

- **observado**: POWER e IMERG já gravados no banco;
- **previsto**: Meteomatics, após a integração ser implementada;
- **interpretado**: indicadores e alertas calculados pelo CEREJÁ com regra e versão identificáveis.

O monitor representa disponibilidade de chuva na região. Ele não deve ser chamado de umidade do solo, água disponível à planta ou balanço hídrico enquanto SMAP/GLDAS, solo, evapotranspiração e parâmetros do talhão não estiverem validados.

## 2. Estado atual e lacunas

A base atual já possui, por célula de 5 km, séries diárias de temperatura máxima e média, umidade relativa média e precipitação POWER. A precipitação IMERG está em carga histórica. O serviço já localiza coordenadas, utiliza pool de conexões e cache e calcula clima recente para o motor de recomendação.

Ainda faltam:

- integração, credenciais, extrator e armazenamento de previsões Meteomatics;
- umidade mínima diária observada; a métrica POWER atual é média diária;
- indicadores de chuva acumulada em 7 e 15 dias, sequência seca e comparação climatológica;
- regras versionadas de risco, avaliadas por responsável técnico;
- API e interface próprias para riscos e disponibilidade hídrica;
- rotina periódica de atualização, monitoramento de atraso e testes de completude.

## 3. Dados, regras e cálculos

### 3.1 Fontes e precedência

| Uso | Fonte preferencial | Alternativa | Regra |
|---|---|---|---|
| Temperatura e umidade observadas | POWER | nenhuma no MVP | Informar que a umidade disponível é média diária. |
| Chuva observada | IMERG Final | POWER | Usar IMERG somente quando a janela estiver completa; caso contrário, usar uma janela POWER completa. Nunca somar ou preencher uma fonte com a outra dentro do mesmo indicador. |
| Previsão de temperatura, umidade e chuva | Meteomatics | nenhuma | Manter `issued_at` e `valid_at`; substituir previsões antigas por uma rodada mais recente apenas na leitura, preservando auditoria. |
| Comparação histórica | mesma fonte do indicador recente | nenhuma | Comparar produtos iguais, unidades iguais e janelas com cobertura completa. |

Ausência de observação não equivale a zero de chuva. Uma lacuna deve produzir estado `sem_dados`, interromper a contagem confiável de dias secos e aparecer na interface.

### 3.2 Indicadores

Para cada célula e data de referência, calcular:

- `rain_7d_mm`, `rain_15d_mm`, `rain_30d_mm`: soma da chuva diária nas janelas inclusivas de 7, 15 e 30 dias;
- `dry_streak_days`: número de dias consecutivos, terminando na data de referência, com precipitação menor ou igual ao limite configurado;
- `days_since_meaningful_rain`: dias desde a última chuva acima do limite configurado;
- `temp_max_forecast_c`: máxima prevista por dia;
- `humidity_min_forecast_pct`: mínima prevista por dia;
- `rain_forecast_mm`: precipitação prevista por dia;
- `rain_anomaly_pct`: diferença percentual entre o acumulado recente e a mediana histórica da mesma janela;
- `rain_percentile`: posição do acumulado recente na distribuição histórica comparável;
- `dry_streak_historical_percentile`: posição da sequência seca atual perante sequências equivalentes do histórico.

O histórico comparável deve usar a mesma janela terminando em dias próximos do mesmo período do ano, com tolerância de 15 dias no calendário, apenas em anos completos. O resultado deve informar `baseline_start`, `baseline_end`, `years_used` e a fonte. Exigir no mínimo dez anos válidos; abaixo disso, retornar `sem_dados` em vez de classificar a anomalia.

Para chuva acumulada igual a zero na mediana histórica, não calcular percentual de anomalia; usar percentil e diferença absoluta em milímetros.

### 3.3 Regras de risco

Criar regras configuráveis e versionadas, sem limites escondidos no JavaScript ou no código da API. Cada regra deve conter indicador, operador, limite, duração mínima, severidade, região, cultura/fase opcional, fonte técnica, versão e estado `rascunho | validada | arquivada`.

Os limites para “calor elevado”, “baixa umidade”, “dia seco” e “mudança relevante de chuva” devem entrar inicialmente como rascunho e só gerar alertas públicos após revisão agronômica. A interface pode mostrar simulações de desenvolvimento com rótulo explícito. Uma avaliação deve gerar:

- estado `favoravel | atencao | alto_risco | sem_dados`;
- período de validade;
- indicadores que dispararam a regra;
- fonte e horário da previsão ou intervalo observado;
- regra e versão utilizadas;
- orientação curta, sem prometer dano ou produtividade.

Alertas compostos devem ser suportados, por exemplo calor elevado e baixa umidade previstos no mesmo dia, ou sequência seca acompanhada de chuva de 30 dias em percentil baixo.

## 4. Arquitetura e banco de dados

### 4.1 Integração Meteomatics

Implementar um extrator server-side com credenciais apenas no ambiente do ETL. Consultar pontos representativos deduplicados e mapear seus resultados às células, seguindo o padrão já usado por POWER.

Adicionar:

- fonte `METEOMATICS_FORECAST` em `agro.data_sources`;
- tabela `agro.forecast_hourly` com `sample_id`, `issued_at`, `valid_at`, `metric`, `value`, `unit` e `run_id`;
- chave única por amostra, rodada, validade e métrica;
- métricas normalizadas `temp_2m_c`, `humidity_2m_pct` e `precip_mm`;
- registro de cada execução em `agro.etl_runs`, incluindo período previsto, quantidade escrita e erro;
- retenção configurável das rodadas para auditoria e comparação posterior entre previsto e observado.

Executar a atualização em intervalo compatível com o plano contratado e a frequência do produto. A rotina deve ser idempotente, aceitar retomada e não apagar a última rodada válida quando a API falhar.

### 4.2 Indicadores derivados

Adicionar tabela `agro.climate_daily_indicators`, com uma linha por célula, data de referência e fonte de precipitação. Armazenar os acumulados, sequência seca, data da última chuva relevante, anomalia, percentil, completude, período da linha de base e versão do método.

Adicionar `agro.climate_risk_rules` para as regras versionadas e `agro.climate_alerts` para resultados persistidos por célula e rodada de previsão. O alerta deve guardar `evidence` em JSON, mas os campos usados para filtro — célula, início, fim, severidade, regra e rodada — devem ser colunas indexadas.

Índices mínimos:

- observações diárias por `sample_id, metric, observed_on DESC`;
- dados por célula por `cell_id, source_id, metric, observed_on DESC`;
- previsão por `sample_id, metric, issued_at DESC, valid_at`;
- indicadores por `cell_id, reference_date DESC`;
- alertas por `cell_id, starts_at, ends_at, severity`.

Calcular indicadores em lote após cada ingestão e previsão. A consulta web deve ler resultados prontos, evitando varrer o histórico a cada acesso. Reprocessar somente células e datas afetadas pela nova carga.

### 4.3 APIs

Criar os contratos:

- `GET /api/clima/monitor?lat=&lon=&data=`: localização, fonte selecionada, atualização, completude, sequência seca, última chuva relevante, acumulados de 7/15/30 dias e comparação histórica;
- `GET /api/clima/riscos?lat=&lon=&inicio=&fim=`: alertas observados e previstos, evidências, severidade e limitações;
- `GET /api/calendario` deve manter as janelas técnicas e receber uma seção adicional `climate_risks`, sem converter automaticamente risco em tarefa da lavoura.

Respostas devem incluir `status`, `source_id`, `observed_through` ou `issued_at`, `method_version` e `data_completeness`. Coordenadas fora de `CACOAL_R20`, datas inválidas e períodos sem cobertura devem retornar erros ou estados explícitos, nunca valores vazios tratados como zero.

Aplicar cache por célula, data e rodada da previsão. Invalidar o cache quando uma nova carga ou rodada for concluída. Registrar duração da localização, leitura dos indicadores e montagem da resposta para acompanhar a meta de desempenho.

## 5. Experiência no site

### 5.1 Calendário inteligente

Manter o calendário no padrão visual Farming Simulator: coluna fixa de evento/cultura, meses ou dias em colunas, barras horizontais, legenda e marcador da data atual.

Adicionar uma camada alternável **Riscos climáticos** com horizonte diário da previsão disponível. As linhas mínimas são:

- calor elevado;
- baixa umidade do ar;
- sequência seca;
- chuva abaixo ou acima do padrão.

As barras usam cor e também ícone/texto para acessibilidade. Ao selecionar uma barra, abrir detalhe com período, severidade, valores, fonte, atualização, comparação histórica, regra aplicada e limitação. A camada climática não deve alterar visualmente as janelas técnicas; deve aparecer sobreposta ou em grupo separado.

### 5.2 Monitor hídrico

Exibir no diagnóstico da coordenada:

- destaque “há N dias sem chuva relevante”, ou “não foi possível determinar”;
- cartões de chuva acumulada em 7, 15 e 30 dias;
- comparação de cada janela com a mediana e o percentil histórico;
- minigráfico diário dos últimos 30 dias;
- fonte escolhida, última data observada e cobertura da janela;
- aviso de que o indicador representa precipitação regional, não água disponível no solo.

No celular, priorizar sequência seca, acumulados e alertas ativos; o gráfico e a metodologia ficam expansíveis. Estados de carregamento, erro, dados defasados e `sem_dados` precisam de componentes próprios.

## 6. Etapas de desenvolvimento

### Etapa 1 — Fundação e validação

- Definir com responsável técnico os limites e orientações das regras.
- Criar migração das tabelas, índices e regras versionadas.
- Implementar e testar os cálculos históricos com POWER e IMERG.
- Gerar indicadores em lote e medir tempo de atualização e consulta.

**Entrega:** monitor observado de 7/15/30 dias, sequência seca e comparação histórica, ainda sem previsão.

### Etapa 2 — Previsão e riscos

- Integrar Meteomatics, normalizar unidades e registrar rodadas.
- Agregar previsão horária em máximas, mínimas e totais diários.
- Avaliar regras validadas e persistir alertas.
- Expor APIs de monitor e riscos com cache e observabilidade.

**Entrega:** riscos previstos com procedência, validade e degradação segura quando a fonte estiver indisponível.

### Etapa 3 — Interface e calendário

- Construir o monitor hídrico no diagnóstico.
- Adicionar a camada climática ao calendário Farming Simulator.
- Implementar detalhes, legendas, acessibilidade e responsividade.
- Integrar os riscos ao motor de recomendação apenas como evidência explicável; não bloquear uma cultura por uma única previsão.

**Entrega:** fluxo completo por coordenada, do dado ao alerta e à orientação de manejo.

### Etapa 4 — Operação e calibração

- Comparar previsões armazenadas com observações posteriores.
- Medir viés de chuva, temperatura e umidade por horizonte.
- Ajustar regras somente por nova versão auditável.
- Criar painel de atraso de ingestão, lacunas, falhas e latência da API.

## 7. Testes e critérios de aceite

- Acumulados de 7, 15 e 30 dias incluem exatamente a data de referência e a quantidade esperada de dias.
- Um dia ausente produz janela incompleta e nunca é contado como precipitação zero.
- A sequência seca atravessa meses e anos corretamente e para na primeira chuva acima do limite validado.
- IMERG e POWER nunca são combinados dentro do mesmo acumulado ou comparação.
- A comparação histórica usa a mesma fonte, a mesma duração e ao menos dez anos completos.
- Rodadas Meteomatics antigas permanecem auditáveis; a API seleciona a rodada mais recente válida.
- Previsão horária agrega máxima de temperatura, mínima de umidade e total de precipitação no fuso `America/Manaus`, documentando a conversão.
- Falha na Meteomatics mantém o histórico disponível, sinaliza previsão indisponível e não publica alertas vencidos como atuais.
- Cada alerta informa evidência, período, fonte, atualização, regra e versão.
- Usuários fora da região recebem resposta clara de indisponibilidade.
- A consulta do monitor com indicadores pré-calculados atende meta inicial de p95 menor que 500 ms no backend, sem contar latência de rede; medir antes e depois com cache frio e quente.
- A interface funciona com teclado, não depende apenas de cor e mantém a coluna de títulos visível em rolagem horizontal.
- O monitor não usa os termos “umidade do solo”, “reserva de água” ou “água disponível à planta” com apenas dados de precipitação.

## 8. Definição de pronto

A melhoria estará pronta quando as migrações forem reproduzíveis, as cargas forem idempotentes, os indicadores tiverem testes de borda, as regras públicas estiverem validadas, as APIs atenderem à meta de desempenho e o site mostrar riscos e disponibilidade de chuva com fonte, atualização, completude e limitações. A documentação do dicionário de dados deverá ser atualizada com novas tabelas, métricas, unidades, frequência, retenção e versão do método.
