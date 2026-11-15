# Agro Data Pipeline — Cacoal, raio de 20 km

Pipeline geoespacial para PostgreSQL/Supabase com PostGIS. Centro da sede de Cacoal, RO, nas coordenadas aproximadas **11,44° S, 61,45° W** do [mapa municipal do IBGE de 2022](https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_para_fins_de_levantamentos_estatisticos/censo_demografico_2022/mapas_municipais_estatisticos/RO/cacoal_1100049/cacoal_1100049_mme_a0.pdf). Área de estudo: círculo de **20 km de raio**, em UTM EPSG:32720, com **16 células de 10 km** e **60 subcélulas de 5 km**, recortadas pelo círculo. Histórico solicitado desde **01/01/2000**, dados diários e agregações mensais por views SQL. O recorte circular não corresponde ao limite administrativo do município.

## Estado das integrações

| Fonte | Estado no repositório | Observação |
|---|---|---|
| NASA POWER | Histórico de Cacoal carregado no Supabase | Quatro pontos representativos atendem 60 subcélulas; 274.472 observações no total desde 01/01/2000 |
| GPM IMERG Final V07 | Inventário concluído; carga histórica de Cacoal em andamento | 9.253 dias disponíveis entre 01/06/2000 e 30/09/2025; ZIP diário, banda `total.accum.tif` escalada por 0,1 mm |
| SoilGrids | Recortes pH e argila 0–5 cm importados e validados para 60/60 subcélulas | 120 propriedades estáticas no Supabase; veja [proveniência e comandos](docs/soilgrids_cacoal.md) |

Não há dados de P, K, Ca, Mg, drenagem de campo ou déficit hídrico calculado por este MVP; não inferir fertilidade ou déficit simplesmente de P−ET sem modelo do balanço hídrico.

A matriz de dados necessários e a pesquisa inicial das espécies estão em [critérios de recomendação](docs/criterios_recomendacao.md). As sugestões para uma propriedade só podem usar dados reais quando também houver informação local suficiente sobre solo e manejo.

O [relatório de verificação anterior](docs/verificacao_2026-11-14.md) registra a antiga área de 250 × 250 km, removida do banco na migração `004_cacoal.sql`.
O [relatório de Cacoal](docs/verificacao_cacoal_2026-11-14.md) registra a migração e o estado das novas cargas.

O esquema implantado, suas colunas e a origem de cada conjunto estão no [dicionário do banco](docs/dicionario_banco.md). O inventário técnico das métricas e métodos de ingestão permanece no [dicionário do pipeline](docs/dicionario_dados.md).

## Aplicação CEREJÁ

O frontend React em `frontend/` é a interface do piloto. O usuário informa um ponto no círculo de 20 km de Cacoal, consulta diagnóstico e calendário reais, completa os dados de campo e compara candidatas do backend. A consulta mostra o último valor por fonte e métrica carregado no banco, com data, resolução e lacunas. O calendário e o diagnóstico não exigem conta. “Minha Lavoura” usa Supabase Auth e a API privada existente.

```bash
docker compose build
docker compose run --rm etl migrate
docker compose run --rm --entrypoint python etl -m agro.catalog
docker compose run --rm --entrypoint python etl -m agro.catalog --apply
docker compose up --build web frontend gateway
```

Use primeiro um banco de teste. Em banco novo, execute também `docker compose run --rm etl init-grid` e carregue as séries desejadas. Sem `--apply`, a importação só mostra o diff. Abra **http://localhost:8000**: o gateway envia `/api/*` ao Python e as demais rotas ao React. O Python usa `DATABASE_URL` somente no servidor. A antiga interface Python fica interna como fallback. Para desenvolver sem Docker, rode o backend na porta 8000, o React com `npm run dev` em `frontend/` e configure um proxy `/api` local.

**Minha lavoura:** configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (ou `SUPABASE_ANON_KEY`) no servidor e habilite login por e-mail no Supabase Auth. Se o projeto exigir confirmação de e-mail, configure o endereço do site permitido no Supabase. O caderno de campo guarda talhões, ciclos, tarefas criadas pelo produtor e avaliações salvas explicitamente. A sessão do navegador é mantida em memória até sair ou fechar/recarregar a página. A conexão web precisa ler os dados CEREJÁ no schema `agro` e poder assumir `authenticated` para executar operações privadas sujeitas às políticas de acesso.

As rotas públicas são `GET /api/consulta?lat=...&lon=...&raio=20`, `GET /api/calendario` e `POST /api/recomendacoes`. O formato, o fluxo de revisão e os testes estão na [documentação do calendário](docs/calendario/plano_codex_calendario.md), no [guia de validação do site](docs/validacao_cereja.md) e no [roteiro da demo integrada](docs/demo_integrada.md).

## Preparação

1. Criar banco Supabase PostgreSQL com uma role que possa executar as migrações e escrever no schema `agro`.
2. Habilitar `postgis` no schema `extensions`, ou deixar `migrate` habilitar com papel autorizado.
3. Criar **bucket privado** `agro-rasters` em Supabase Storage. Usar service-role key **somente no ETL server-side**; nunca no navegador.
4. `cp .env.example .env`, preencher `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Para GPM Final também configurar credenciais PPS ou acesso já autorizado.
5. `docker compose build` e `docker compose run --rm etl init-grid`.
6. Conferir `docker compose run --rm etl validate` (níveis 1 e 2: 16/60 células, cerca de 1.256,5 km² em ambos).

Para o pooler de sessão do Supabase (`*.pooler.supabase.com:5432`), o usuário em `DATABASE_URL` deve ser `postgres.PROJECT_REF`. A senha é a senha **do banco**, diferente da chave `SUPABASE_SERVICE_ROLE_KEY`. Confira a [documentação de conexão do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) se receber `ENOIDENTIFIER` ou falha de autenticação.

## Carga de teste

```bash
docker compose run --rm etl power --start 2000-01-01 --end 2000-01-01
docker compose run --rm etl imerg --date 2024-01-01
```

Para a primeira execução, sugerimos **POWER primeiro**: sem autenticação, permite validar acesso à rede e esquema. O GPM depende de acesso PPS e de o produto Final daquele dia já ter sido publicado; se não estiver disponível, tente um dia histórico antigo ou produto Late (este último não está implementado).

## Carga histórica desde 2000

```bash
docker compose run --rm etl backfill --source power --start 2000-01-01 --end 2026-11-14
```

As cargas POWER são divididas por ano e aproveitam amostras deduplicadas; as do IMERG baixam diariamente. `ON CONFLICT DO UPDATE` torna a carga repetível. Execuções e erros são registrados em `agro.etl_runs`.

O IMERG Final V07 começa em **01/06/2000**. O [inventário 2000–2026](docs/imerg_availability_2000_2026-11-14.csv) registrou 9.253 dias disponíveis e 410 diretórios ausentes. O script de carga lê apenas a banda `total.accum.tif` via HTTP Range, exclui o valor ausente `29999`, grava médias por subcélula e remove o TIFF temporário. Por padrão, não envia milhares de ZIPs globais ao Storage. Os dias concluídos para `CACOAL_R20` em `agro.etl_runs` são pulados ao reiniciar.

```bash
docker compose run --rm --entrypoint python etl /app/scripts/map_imerg.py \
  --start 2000-06-01 --end 2026-11-14 \
  --seed /app/docs/imerg_availability_2020_2026-11-14.csv \
  --output /app/data/imerg_availability_2000_2026-11-14.csv
docker compose run --rm --entrypoint python etl /app/scripts/backfill_imerg.py \
  --manifest /app/data/imerg_availability_2000_2026-11-14.csv --workers 6
```

Para reduzir o tempo da primeira carga, o mesmo script aceita `--start` e `--end`; execute faixas de datas sem sobreposição em processos separados. Use `--failures-output` diferente para cada processo. A retomada consulta apenas execuções concluídas da região `CACOAL_R20`.

O inventário encontrou todos os dias de 01/06/2000 a 30/09/2025; de 01/10/2025 a 14/11/2026, os diretórios consultados não tinham GIS Final. Para precipitação recente, o POWER segue como fonte separada. O [manual GIS da NASA](https://gpm.nasa.gov/sites/default/files/2023-12/IMERG_GIS-GeoTIFF_ReadMe_6_27_23.pdf) documenta o valor ausente e a banda de acumulação.

```bash
docker compose run --rm --entrypoint python etl /app/scripts/verify_history.py \
  --manifest /app/data/imerg_availability_2000_2026-11-14.csv
```

## Rasters de propriedades estáticas

Arquivos são obtidos diretamente dos distribuidores oficiais, conforme termos e formatos específicos. Use GeoTIFF já recortado para a região (para evitar baixar rasters globais inteiros). O importador grava a média espacial por subcélula; a conversão de unidade **não é inferida**.

```bash
# Exemplo: escala do pH SoilGrids phh2o (valor bruto dividido por 10)
docker compose run --rm etl static-raster --file /app/data/soil_phh2o_0-5cm.tif --source SOILGRIDS --metric soil_ph --unit pH --scale 0.1 --depth-top 0 --depth-bottom 5
```

Confirme o fator de escala e o sistema de coordenadas na descrição do produto antes de importar. SoilGrids `clay`, `sand`, `silt` usam unidades nativas que precisam de conversão explícita para `%`, como `--scale 0.1` quando expressos em g/kg.

## Como ficam os dados

- `agro.source_samples` e `agro.sample_daily`: valores por amostra consultada (POWER), evitando repetir o dado climático por célula.
- `agro.cell_sample_map`: relação amostra → cada subcélula de 5 km.
- `agro.cell_daily`: valores agregados de rasters por subcélula, por produto e dia (IMERG).
- `agro.static_properties`: atributos de solo e relevo, opcionalmente por profundidade.
- `agro.raster_assets`: referência, SHA256 e tamanho dos arquivos brutos guardados no Storage.
- `agro.v_cell_daily`: observações por subcélula, com origem e método.
- `agro.v_cell_monthly`: soma de precipitação mensal, média das demais variáveis, `days_available` para avaliar meses incompletos.

A malha não aumenta a resolução nativa da fonte. A abordagem POWER usa coordenadas representativas de *bins* de 0,5°, não a grade real exposta pelo produtor: validar as coordenadas de origem retornadas na API antes de usos científicos mais estritos. IMERG aplica média dos pixels que intersectam a célula (método `all_touched`, não ponderação exata da área do pixel). Para rigor adicional, trocar por interseção ponderada por área. A referência de data é UTC. Meses incompletos **não devem ser tratados como acumulados completos**.

## Segurança e execução

- As tabelas estão em schema `agro` com permissão revogada de `anon` e `authenticated`.
- O navegador usa a API CEREJÁ. O schema `agro` continua privado e as tabelas de Minha lavoura usam políticas de isolamento por usuário.
- Banco gerenciado Supabase não fica dentro do Docker Compose; o container executa apenas ETL.
- Não expor `DATABASE_URL` nem `SUPABASE_SERVICE_ROLE_KEY` no cliente.
- Evitar executar GPM a cada minuto: o produto Final é liberado com latência; para dados recentes implementar Early/Late com lógica de substituição/versão.
- O Supabase Storage precisa ter capacidade e plano adequados para o histórico de ZIPs; é possível trocar o adapter de storage.

## Testes

```bash
docker compose run --rm --entrypoint pytest etl -q
```

Os testes incluídos são unitários e não comprovam acesso aos provedores nem ao Supabase. A gravação de raster requer credenciais de Supabase Storage, e falha explicitamente se estiverem ausentes. Consultas de verificação: `scripts/check.sql`.

## Fontes oficiais

- POWER Daily API: https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- IMERG Final GIS: https://gpm.nasa.gov/data/directory/imerg-final-run-pps-research-gis
- SoilGrids: https://files.isric.org/soilgrids/latest/data/
- Supabase PostGIS: https://supabase.com/docs/guides/database/extensions/postgis
