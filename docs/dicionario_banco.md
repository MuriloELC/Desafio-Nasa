# Dicionário de dados do banco CEREJÁ

**Banco consultado:** Supabase `desafio nasa` (`mzjdsbubxyrxcgnbylgs`)

**Data da consulta:** 15/11/2026
**Escopo:** tabelas do schema `agro`, tabelas `public.cereja_*` e views analíticas do projeto.

Os nomes e tipos abaixo foram lidos do catálogo PostgreSQL implantado. Como o banco ainda não possui comentários de coluna, as descrições funcionais foram derivadas das migrações e do código da aplicação. `geometry` usa SRID 32720 (UTM 20S). Campos `user_id` referenciam a identidade do Supabase Auth e são protegidos por RLS.

## Fonte dos dados por tabela

| Nome da tabela/view | Fonte dos dados | Forma de obtenção |
|---|---|---|
| `agro.regions` | Definição do piloto CEREJÁ para Cacoal | Região `CACOAL_R20` gerada pelo projeto como círculo de 20 km centrado em Cacoal. |
| `agro.grid_cells` | Malha produzida pelo próprio pipeline | Células de 10 km e 5 km calculadas em PostGIS a partir de `agro.regions`. |
| `agro.cereja_municipalities` | [IBGE — API de Malhas Geográficas v3](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3) | Limites municipais intermediários transformados para EPSG:32720; a migração registra o SHA-256 do arquivo de origem. |
| `agro.data_sources` | Catálogo interno baseado nas páginas oficiais dos provedores | Metadados das três fontes em uso: NASA POWER, NASA GPM IMERG e ISRIC SoilGrids. |
| `agro.etl_runs` | Sistema CEREJÁ | Auditoria gerada automaticamente pelos comandos de ingestão. |
| `agro.raster_assets` | Arquivos oficiais baixados pelo ETL | Metadados e hashes dos objetos gravados no Supabase Storage. |
| `agro.schema_migrations` | Sistema CEREJÁ | Registro automático das migrações SQL aplicadas. |
| `agro.source_samples` | Plano de amostragem CEREJÁ sobre a [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) | Coordenadas representativas deduplicadas antes das consultas à API. |
| `agro.cell_sample_map` | Sistema CEREJÁ | Mapeamento espacial calculado entre amostras POWER e células da malha. |
| `agro.sample_daily` | [NASA POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) | Temperatura, umidade, vento, radiação solar e precipitação diária consultadas por coordenada. |
| `agro.cell_daily` | [NASA GPM IMERG Final Run GIS](https://gpm.nasa.gov/data/directory/imerg-final-run-pps-research-gis) | Precipitação diária obtida do GeoTIFF `total.accum.tif` e agregada por célula. |
| `agro.static_properties` | [ISRIC SoilGrids 2.0 WCS](https://docs.isric.org/globaldata/soilgrids/wcs.html) | pH em água e argila média, profundidade 0–5 cm, recortados e agregados por célula. A estrutura também aceita outros rasters estáticos cadastrados. |
| `agro.cereja_sources` | Publicações técnicas da [Embrapa Rondônia](https://www.embrapa.br/rondonia) | Referências bibliográficas cadastradas com título, URL e versão. |
| `agro.cereja_cultures` | Catálogo agronômico do projeto e publicações registradas em `agro.cereja_sources` | Culturas de café e espécies de entrelinha importadas do catálogo revisado do projeto. |
| `agro.cereja_requirements` | Publicações registradas em `agro.cereja_sources` | Faixas ambientais extraídas do catálogo, versionadas e liberadas somente após revisão. |
| `agro.cereja_rules` | Publicações registradas em `agro.cereja_sources`, principalmente Embrapa | Regras de calendário e manejo transcritas com fonte, página, versão e estado editorial. |
| `public.cereja_plots` | Produtor autenticado | Nome e coordenadas informados explicitamente no caderno de campo. |
| `public.cereja_cycles` | Produtor autenticado + catálogo `agro.cereja_cultures` | Ciclos registrados pelo usuário; cultura e tipo são validados contra o catálogo. |
| `public.cereja_tasks` | Produtor autenticado | Tarefas planejadas, realizadas ou canceladas no caderno de campo. |
| `public.cereja_assessments` | Produtor + motor de recomendação CEREJÁ | Contexto informado pelo usuário combinado com séries ambientais, catálogo e regras vigentes. |
| `agro.v_cell_daily` | Derivada de `sample_daily`, `source_samples`, `cell_sample_map` e `cell_daily` | View que reúne observações diárias sem remover a identificação da fonte. |
| `agro.v_cell_monthly` | Derivada de `agro.v_cell_daily` | View mensal: soma precipitação e calcula média para as demais métricas. |

Para cada observação ambiental, a procedência detalhada é identificada por `source_id`; a descrição do produto, versão, URL e resolução fica em `agro.data_sources`. Para regras e requisitos agronômicos, a referência fica em `source_id`/`source_detail` e é resolvida por `agro.cereja_sources`.

## Geografia e malha

| Nome da tabela | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `agro.regions` | `region_id` | `text` | Identificador único da região de estudo, como `CACOAL_R20`. |
| `agro.regions` | `description` | `text` | Nome e descrição legível da região. |
| `agro.regions` | `center` | `geometry(Point,32720)` | Ponto central da região em coordenadas UTM. |
| `agro.regions` | `geom` | `geometry(Polygon,32720)` | Polígono que delimita a região de estudo. |
| `agro.regions` | `epsg` | `integer` | Código EPSG usado pelas geometrias; padrão 32720. |
| `agro.regions` | `created_at` | `timestamp with time zone` | Data e hora de criação da região. |
| `agro.grid_cells` | `cell_id` | `text` | Identificador único da célula da malha. |
| `agro.grid_cells` | `region_id` | `text` | Região à qual a célula pertence. |
| `agro.grid_cells` | `parent_id` | `text` | Célula de nível superior; nulo para células sem pai. |
| `agro.grid_cells` | `level` | `smallint` | Nível da malha: 1 para 10 km e 2 para 5 km. |
| `agro.grid_cells` | `row_index` | `smallint` | Índice da linha da célula na grade. |
| `agro.grid_cells` | `col_index` | `smallint` | Índice da coluna da célula na grade. |
| `agro.grid_cells` | `geom` | `geometry(Polygon,32720)` | Polígono da célula em coordenadas UTM. |
| `agro.cereja_municipalities` | `ibge` | `text` | Código IBGE de sete dígitos do município. |
| `agro.cereja_municipalities` | `geom` | `geometry(MultiPolygon,32720)` | Limite municipal simplificado usado para selecionar regras locais. |

## Fontes, ingestão e arquivos

| Nome da tabela | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `agro.data_sources` | `source_id` | `text` | Código único da fonte de dados, como `POWER`, `IMERG_FINAL` ou `SOILGRIDS`. |
| `agro.data_sources` | `provider` | `text` | Organização responsável pelo produto. |
| `agro.data_sources` | `product` | `text` | Nome do produto ou conjunto de dados. |
| `agro.data_sources` | `version` | `text` | Versão declarada do produto. |
| `agro.data_sources` | `url` | `text` | Endereço da documentação ou página oficial da fonte. |
| `agro.data_sources` | `native_resolution` | `text` | Resolução espacial nativa informada pela fonte. |
| `agro.data_sources` | `description` | `text` | Observações sobre o produto e seu uso no projeto. |
| `agro.data_sources` | `created_at` | `timestamp with time zone` | Data e hora de cadastro da fonte. |
| `agro.etl_runs` | `run_id` | `bigint` | Identificador único da execução do ETL. |
| `agro.etl_runs` | `command` | `text` | Operação executada, como carga POWER, IMERG ou raster estático. |
| `agro.etl_runs` | `source_id` | `text` | Fonte de dados processada pela execução. |
| `agro.etl_runs` | `period_start` | `date` | Primeira data do período solicitado. |
| `agro.etl_runs` | `period_end` | `date` | Última data do período solicitado. |
| `agro.etl_runs` | `status` | `text` | Estado da execução: `running`, `succeeded` ou `failed`. |
| `agro.etl_runs` | `records_written` | `integer` | Quantidade de registros inseridos ou atualizados. |
| `agro.etl_runs` | `error` | `text` | Mensagem de erro quando a execução falha. |
| `agro.etl_runs` | `started_at` | `timestamp with time zone` | Data e hora de início da execução. |
| `agro.etl_runs` | `ended_at` | `timestamp with time zone` | Data e hora de término da execução. |
| `agro.etl_runs` | `region_id` | `text` | Região processada pela execução. |
| `agro.raster_assets` | `asset_id` | `bigint` | Identificador único do arquivo armazenado. |
| `agro.raster_assets` | `source_id` | `text` | Fonte à qual o arquivo pertence. |
| `agro.raster_assets` | `observed_on` | `date` | Data observada pelo produto, quando aplicável. |
| `agro.raster_assets` | `object_key` | `text` | Caminho do objeto no bucket privado do Supabase Storage. |
| `agro.raster_assets` | `sha256` | `text` | Hash SHA-256 usado para verificar a integridade do arquivo. |
| `agro.raster_assets` | `bytes` | `bigint` | Tamanho do arquivo em bytes. |
| `agro.raster_assets` | `format` | `text` | Formato do arquivo armazenado. |
| `agro.raster_assets` | `created_at` | `timestamp with time zone` | Data e hora de registro do arquivo. |
| `agro.schema_migrations` | `filename` | `text` | Nome único do arquivo de migração aplicado. |
| `agro.schema_migrations` | `applied_at` | `timestamp with time zone` | Data e hora em que a migração foi aplicada. |

## Amostras e observações ambientais

| Nome da tabela | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `agro.source_samples` | `sample_id` | `bigint` | Identificador interno do ponto consultado na fonte. |
| `agro.source_samples` | `source_id` | `text` | Fonte de dados do ponto amostral. |
| `agro.source_samples` | `native_key` | `text` | Chave da amostra usada para deduplicação dentro da fonte. |
| `agro.source_samples` | `lon` | `double precision` | Longitude do ponto em graus WGS84. |
| `agro.source_samples` | `lat` | `double precision` | Latitude do ponto em graus WGS84. |
| `agro.cell_sample_map` | `cell_id` | `text` | Célula da malha que recebe os dados da amostra. |
| `agro.cell_sample_map` | `sample_id` | `bigint` | Amostra associada à célula. |
| `agro.cell_sample_map` | `weight` | `double precision` | Peso aplicado ao valor da amostra ao projetá-lo na célula. |
| `agro.sample_daily` | `sample_id` | `bigint` | Ponto de origem da observação diária. |
| `agro.sample_daily` | `observed_on` | `date` | Data da observação. |
| `agro.sample_daily` | `metric` | `text` | Código da variável, como temperatura, umidade ou precipitação POWER. |
| `agro.sample_daily` | `value` | `double precision` | Valor diário na unidade indicada. |
| `agro.sample_daily` | `unit` | `text` | Unidade de medida do valor. |
| `agro.sample_daily` | `quality` | `text` | Rótulo de qualidade atribuído pelo ETL. |
| `agro.sample_daily` | `run_id` | `bigint` | Execução do ETL que gravou ou atualizou a observação. |
| `agro.cell_daily` | `cell_id` | `text` | Célula de 5 km à qual a observação foi agregada. |
| `agro.cell_daily` | `source_id` | `text` | Produto raster de origem, atualmente usado pelo IMERG. |
| `agro.cell_daily` | `observed_on` | `date` | Data da observação diária. |
| `agro.cell_daily` | `metric` | `text` | Código da variável observada. |
| `agro.cell_daily` | `value` | `double precision` | Valor agregado para a célula. |
| `agro.cell_daily` | `unit` | `text` | Unidade de medida do valor. |
| `agro.cell_daily` | `quality` | `text` | Rótulo de qualidade atribuído pelo ETL. |
| `agro.cell_daily` | `valid_fraction` | `double precision` | Fração entre 0 e 1 dos pixels tocados que continham dados válidos. |
| `agro.cell_daily` | `run_id` | `bigint` | Execução do ETL que gravou ou atualizou a observação. |
| `agro.static_properties` | `cell_id` | `text` | Célula de 5 km à qual a propriedade está associada. |
| `agro.static_properties` | `source_id` | `text` | Fonte da propriedade estática, como `SOILGRIDS`. |
| `agro.static_properties` | `metric` | `text` | Código da propriedade, como `soil_ph` ou `clay_pct`. |
| `agro.static_properties` | `depth_top_cm` | `integer` | Limite superior da camada do solo, em centímetros. |
| `agro.static_properties` | `depth_bottom_cm` | `integer` | Limite inferior da camada do solo, em centímetros. |
| `agro.static_properties` | `value` | `double precision` | Média dos pixels válidos após aplicação do fator de escala. |
| `agro.static_properties` | `unit` | `text` | Unidade do valor, como `pH` ou `%`. |
| `agro.static_properties` | `quality` | `text` | Rótulo de qualidade; SoilGrids é armazenado como `estimated`. |
| `agro.static_properties` | `run_id` | `bigint` | Execução do ETL que importou a propriedade. |

## Catálogo agronômico e calendário

| Nome da tabela | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `agro.cereja_sources` | `source_id` | `text` | Identificador único da publicação agronômica. |
| `agro.cereja_sources` | `title` | `text` | Título da publicação ou referência técnica. |
| `agro.cereja_sources` | `url` | `text` | Endereço HTTPS da publicação. |
| `agro.cereja_sources` | `version` | `text` | Edição, versão ou identificação bibliográfica da fonte. |
| `agro.cereja_cultures` | `culture_id` | `text` | Identificador único da cultura. |
| `agro.cereja_cultures` | `name` | `text` | Nome comum apresentado ao usuário. |
| `agro.cereja_cultures` | `scientific_name` | `text` | Nome científico da espécie. |
| `agro.cereja_cultures` | `kind` | `text` | Categoria da cultura: `cafe` ou `entrelinha`. |
| `agro.cereja_cultures` | `catalog_species` | `boolean` | Indica se a cultura de entrelinha está habilitada como candidata do catálogo. |
| `agro.cereja_cultures` | `life_cycle` | `text` | Descrição do ciclo de vida da cultura. |
| `agro.cereja_cultures` | `notes` | `jsonb` | Metadados e observações adicionais da cultura. |
| `agro.cereja_cultures` | `import_version` | `text` | Versão do arquivo ou processo que importou o registro. |
| `agro.cereja_requirements` | `culture_id` | `text` | Cultura à qual o requisito ambiental se aplica. |
| `agro.cereja_requirements` | `metric` | `text` | Variável avaliada: temperatura, chuva ou pH, entre outras admitidas. |
| `agro.cereja_requirements` | `band` | `text` | Faixa do requisito: `optimal` ou `tolerated`. |
| `agro.cereja_requirements` | `unit` | `text` | Unidade correspondente à métrica. |
| `agro.cereja_requirements` | `minimum` | `double precision` | Limite mínimo da faixa; pode ser nulo. |
| `agro.cereja_requirements` | `maximum` | `double precision` | Limite máximo da faixa; pode ser nulo. |
| `agro.cereja_requirements` | `version` | `text` | Versão do requisito. |
| `agro.cereja_requirements` | `source_id` | `text` | Referência agronômica que sustenta o requisito. |
| `agro.cereja_requirements` | `source_detail` | `text` | Página, seção ou detalhe da evidência na fonte. |
| `agro.cereja_requirements` | `reviewed` | `boolean` | Indica se o requisito foi revisado e liberado para o motor. |
| `agro.cereja_requirements` | `reviewed_at` | `timestamp with time zone` | Data e hora da revisão do requisito. |
| `agro.cereja_requirements` | `reviewed_by` | `text` | Responsável pela revisão que liberou o requisito. |
| `agro.cereja_requirements` | `evidence_confidence` | `text` | Confiança documental inicial: `baixa`, `media` ou `alta`. |
| `agro.cereja_requirements` | `derivation` | `text` | Transcrição, consolidação ou aproximação usada para obter a faixa. |
| `agro.cereja_rules` | `rule_id` | `text` | Identificador lógico da regra agronômica. |
| `agro.cereja_rules` | `version` | `integer` | Versão numérica da regra. |
| `agro.cereja_rules` | `culture_id` | `text` | Cultura à qual a regra se aplica. |
| `agro.cereja_rules` | `activity` | `text` | Atividade orientada, como plantio, corte, roçada ou monitoramento. |
| `agro.cereja_rules` | `kind` | `text` | Tipo da regra: `sazonal`, `apos_plantio` ou `condicional`. |
| `agro.cereja_rules` | `uf` | `text` | Unidade federativa de aplicação da regra. |
| `agro.cereja_rules` | `municipality` | `text` | Código IBGE do município quando a regra é local. |
| `agro.cereja_rules` | `phase` | `text` | Fase do café à qual a regra se aplica. |
| `agro.cereja_rules` | `water` | `text` | Regime hídrico aplicável: ambos, sequeiro ou irrigado. |
| `agro.cereja_rules` | `start_month` | `integer` | Mês inicial da janela sazonal. |
| `agro.cereja_rules` | `end_month` | `integer` | Mês final da janela sazonal. |
| `agro.cereja_rules` | `start_day` | `integer` | Primeiro dia relativo ao plantio em regras pós-plantio. |
| `agro.cereja_rules` | `end_day` | `integer` | Último dia relativo ao plantio em regras pós-plantio. |
| `agro.cereja_rules` | `orientation` | `text` | Texto de orientação exibido ao produtor. |
| `agro.cereja_rules` | `source_id` | `text` | Referência técnica que sustenta a regra. |
| `agro.cereja_rules` | `source_detail` | `text` | Página ou trecho específico da referência. |
| `agro.cereja_rules` | `status` | `text` | Situação editorial: `rascunho`, `validada` ou `arquivada`. |
| `agro.cereja_rules` | `checks` | `jsonb` | Lista de verificações condicionais aplicadas aos dados do talhão. |
| `agro.cereja_rules` | `validated_by` | `text` | Responsável pela validação da regra. |
| `agro.cereja_rules` | `validated_at` | `timestamp with time zone` | Data e hora da validação da regra. |
| `agro.cereja_rules` | `evidence_confidence` | `text` | Confiança documental inicial: `baixa`, `media` ou `alta`. |
| `agro.cereja_rules` | `derivation` | `text` | Notas sobre extrapolação ou aproximação da regra. |

## Caderno de campo privado

| Nome da tabela | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `public.cereja_plots` | `id` | `uuid` | Identificador único do talhão. |
| `public.cereja_plots` | `user_id` | `uuid` | Usuário proprietário do talhão, derivado do Supabase Auth. |
| `public.cereja_plots` | `name` | `text` | Nome dado pelo produtor ao talhão. |
| `public.cereja_plots` | `lat` | `double precision` | Latitude do ponto representativo do talhão. |
| `public.cereja_plots` | `lon` | `double precision` | Longitude do ponto representativo do talhão. |
| `public.cereja_plots` | `created_at` | `timestamp with time zone` | Data e hora de criação do talhão. |
| `public.cereja_cycles` | `id` | `uuid` | Identificador único do ciclo de cultivo. |
| `public.cereja_cycles` | `user_id` | `uuid` | Usuário proprietário do ciclo. |
| `public.cereja_cycles` | `plot_id` | `uuid` | Talhão onde o ciclo ocorre. |
| `public.cereja_cycles` | `culture_id` | `text` | Cultura registrada no ciclo. |
| `public.cereja_cycles` | `kind` | `text` | Categoria da cultura: café ou entrelinha. |
| `public.cereja_cycles` | `parent_id` | `uuid` | Ciclo de café ao qual uma cultura de entrelinha está vinculada. |
| `public.cereja_cycles` | `parent_kind` | `text` | Campo gerado como `cafe`, usado para validar o vínculo com o ciclo pai. |
| `public.cereja_cycles` | `planted_on` | `date` | Data de plantio ou início do ciclo. |
| `public.cereja_cycles` | `ended_on` | `date` | Data de encerramento do ciclo. |
| `public.cereja_cycles` | `created_at` | `timestamp with time zone` | Data e hora de criação do registro. |
| `public.cereja_tasks` | `id` | `uuid` | Identificador único da tarefa de manejo. |
| `public.cereja_tasks` | `user_id` | `uuid` | Usuário proprietário da tarefa. |
| `public.cereja_tasks` | `plot_id` | `uuid` | Talhão ao qual a tarefa pertence. |
| `public.cereja_tasks` | `cycle_id` | `uuid` | Ciclo relacionado à tarefa, quando informado. |
| `public.cereja_tasks` | `title` | `text` | Título ou descrição curta da tarefa. |
| `public.cereja_tasks` | `planned_on` | `date` | Data prevista para execução. |
| `public.cereja_tasks` | `done_on` | `date` | Data efetiva de execução; preenchida apenas quando realizada. |
| `public.cereja_tasks` | `state` | `text` | Estado da tarefa: `planejada`, `realizada` ou `cancelada`. |
| `public.cereja_tasks` | `created_at` | `timestamp with time zone` | Data e hora de criação da tarefa. |
| `public.cereja_assessments` | `id` | `uuid` | Identificador único da avaliação salva. |
| `public.cereja_assessments` | `user_id` | `uuid` | Usuário proprietário da avaliação. |
| `public.cereja_assessments` | `plot_id` | `uuid` | Talhão avaliado. |
| `public.cereja_assessments` | `reference_date` | `date` | Data de referência usada pelo motor de recomendação. |
| `public.cereja_assessments` | `method_version` | `text` | Versão do método que produziu o resultado. |
| `public.cereja_assessments` | `result` | `jsonb` | Resultado completo da avaliação, incluindo candidatas, razões e cobertura. |
| `public.cereja_assessments` | `created_at` | `timestamp with time zone` | Data e hora em que a avaliação foi salva. |

## Views de consulta

| Nome da tabela/view | Nome da coluna | Tipo | Descrição |
|---|---|---|---|
| `agro.v_cell_daily` | `cell_id` | `text` | Célula de nível 2 da observação consolidada. |
| `agro.v_cell_daily` | `source_id` | `text` | Fonte original, preservada na consolidação. |
| `agro.v_cell_daily` | `observed_on` | `date` | Data da observação. |
| `agro.v_cell_daily` | `metric` | `text` | Código da variável observada. |
| `agro.v_cell_daily` | `value` | `double precision` | Valor diário ponderado ou agregado. |
| `agro.v_cell_daily` | `unit` | `text` | Unidade do valor. |
| `agro.v_cell_daily` | `quality` | `text` | Rótulo de qualidade da observação original. |
| `agro.v_cell_daily` | `method` | `text` | Método de espacialização: `sample` ou `zonal_mean`. |
| `agro.v_cell_monthly` | `cell_id` | `text` | Célula de nível 2 da agregação mensal. |
| `agro.v_cell_monthly` | `source_id` | `text` | Fonte preservada na agregação. |
| `agro.v_cell_monthly` | `month` | `date` | Primeiro dia do mês de referência. |
| `agro.v_cell_monthly` | `metric` | `text` | Código da variável agregada. |
| `agro.v_cell_monthly` | `unit` | `text` | Unidade do valor agregado. |
| `agro.v_cell_monthly` | `days_available` | `bigint` | Quantidade de observações diárias disponíveis no mês. |
| `agro.v_cell_monthly` | `value` | `double precision` | Soma da precipitação ou média das demais métricas. |
| `agro.v_cell_monthly` | `aggregation` | `text` | Operação aplicada: `sum` ou `mean`. |

## Observações de interpretação

- `NULL` representa informação ausente ou não aplicável; não deve ser interpretado como zero.
- POWER e IMERG permanecem separados por `source_id` e nunca devem ser somados entre si.
- Um total mensal só é completo quando `days_available` corresponde ao número esperado de dias.
- `static_properties` contém estimativas regionais. O pH SoilGrids não substitui análise laboratorial do talhão.
- As tabelas `public.cereja_*` possuem políticas RLS; cada usuário acessa somente seus próprios registros.
