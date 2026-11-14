# Agro Data Pipeline — Rondônia 250 × 250 km

Pipeline geoespacial para PostgreSQL/Supabase com PostGIS. Centro `12°22'45.8"S 60°57'38.2"W` (lon -60.960611111, lat -12.379388889). Malha UTM EPSG:32720: **100 células principais de 25 km** e **400 subcélulas de 12,5 km**. Histórico desde **2020-01-01**, dados diários e agregações mensais por views SQL.

## Estado das integrações

| Fonte | Estado no repositório | Observação |
|---|---|---|
| NASA POWER | Extrator validado com carga real no Supabase | Consulta por pontos representativos, agrupa subcélulas por amostra |
| GPM IMERG Final V07 | Extrator validado com um dia histórico; requer acesso PPS para novas cargas | ZIP diário GIS, banda `total.accum.tif` escalada por 0.1 mm; agregação de pixels |
| SoilGrids | Importador GeoTIFF implementado | Arquivo precisa ser obtido/recortado pelo operador; conversão de unidades explícita |
| SRTM | Importador GeoTIFF implementado | Arquivo precisa ser obtido/recortado pelo operador |
| GLDAS, SMAP, FAO HWSD | Catalogadas, **não extraídas automaticamente nesta versão** | Requer adaptação de produto e validação de variáveis, sem dados simulados |

Não há dados de P, K, Ca, Mg, drenagem de campo ou déficit hídrico calculado por este MVP; não inferir fertilidade ou déficit simplesmente de P−ET sem modelo do balanço hídrico.

O [rascunho CEREJÁ](CEREJA_MVP_COBERTURAS_FINAL.html) usa valores demonstrativos. A matriz de dados necessários e a pesquisa inicial das espécies estão em [critérios de recomendação](docs/criterios_recomendacao.md). As sugestões para uma propriedade só poderão usar dados reais quando também houver informação local suficiente sobre solo e manejo.

Resultados do teste de ingestão no Supabase em 14/11/2026: [verificação de ingestão](docs/verificacao_2026-11-14.md).

## Preparação

1. Criar banco Supabase PostgreSQL com uma role que possa executar as migrações e escrever no schema `agro`.
2. Habilitar `postgis` no schema `extensions`, ou deixar `migrate` habilitar com papel autorizado.
3. Criar **bucket privado** `agro-rasters` em Supabase Storage. Usar service-role key **somente no ETL server-side**; nunca no navegador.
4. `cp .env.example .env`, preencher `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Para GPM Final também configurar credenciais PPS ou acesso já autorizado.
5. `docker compose build` e `docker compose run --rm etl init-grid`.
6. Conferir `docker compose run --rm etl validate` (níveis 1 e 2: 100/400 células, 62.500 km² em ambos).

Para o pooler de sessão do Supabase (`*.pooler.supabase.com:5432`), o usuário em `DATABASE_URL` deve ser `postgres.PROJECT_REF`. A senha é a senha **do banco**, diferente da chave `SUPABASE_SERVICE_ROLE_KEY`. Confira a [documentação de conexão do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres) se receber `ENOIDENTIFIER` ou falha de autenticação.

## Carga de teste de 01/11/2026

```bash
docker compose run --rm etl power --start 2026-11-01 --end 2026-11-01
docker compose run --rm etl imerg --date 2026-11-01
```

Para a primeira execução, sugerimos **POWER primeiro**: sem autenticação, permite validar acesso à rede e esquema. O GPM depende de acesso PPS e de o produto Final daquele dia já ter sido publicado; se não estiver disponível, tente um dia histórico antigo ou produto Late (este último não está implementado).

## Carga histórica desde 2020

```bash
docker compose run --rm etl backfill --source power --start 2020-01-01 --end 2026-11-14
```

As cargas POWER são divididas por ano e aproveitam amostras deduplicadas; as do IMERG baixam diariamente. `ON CONFLICT DO UPDATE` torna a carga repetível. Execuções e erros são registrados em `agro.etl_runs`.

Para uma carga IMERG longa, use o [inventário diário de disponibilidade](docs/imerg_availability_2020_2026-11-14.csv) e o script retomável. Ele lê apenas a banda `total.accum.tif` via HTTP Range, exclui o valor ausente `29999`, grava as médias no banco e remove o TIFF temporário. Por padrão, não envia milhares de ZIPs globais ao Storage; o dia piloto de 01/01/2024 permanece arquivado. Os dias concluídos em `agro.etl_runs` são pulados ao reiniciar.

```bash
docker compose run --rm --entrypoint python etl /app/scripts/backfill_imerg.py \
  --manifest /app/docs/imerg_availability_2020_2026-11-14.csv --workers 6
```

O inventário encontrou 2.100 dias de IMERG Final GIS: todos os dias de 2020 a 2024 e 01/01 a 30/09/2025. De 01/10/2025 a 14/11/2026, os diretórios consultados não tinham o produto GIS Final. Para precipitação recente, o POWER segue como fonte separada; não o misture com IMERG na mesma série sem regra explícita. O [manual GIS da NASA](https://gpm.nasa.gov/sites/default/files/2023-12/IMERG_GIS-GeoTIFF_ReadMe_6_27_23.pdf) documenta o valor ausente e a banda de acumulação.

```bash
docker compose run --rm --entrypoint python etl /app/scripts/verify_history.py \
  --manifest /app/docs/imerg_availability_2020_2026-11-14.csv
```

## Rasters de propriedades estáticas

Arquivos são obtidos diretamente dos distribuidores oficiais, conforme termos e formatos específicos. Use GeoTIFF já recortado para a região (para evitar baixar rasters globais inteiros). O importador grava a média espacial por subcélula; a conversão de unidade **não é inferida**.

```bash
# Exemplo: escala do pH SoilGrids phh2o (valor bruto dividido por 10)
docker compose run --rm etl static-raster --file /app/data/soil_phh2o_0-5cm.tif --source SOILGRIDS --metric soil_ph --unit pH --scale 0.1 --depth-top 0 --depth-bottom 5
# Altitude SRTM já em metros
docker compose run --rm etl static-raster --file /app/data/srtm_clip.tif --source SRTM --metric elevation_m --unit m
```

Confirme o fator de escala e o sistema de coordenadas na descrição do produto antes de importar. SoilGrids `clay`, `sand`, `silt` usam unidades nativas que precisam de conversão explícita para `%`, como `--scale 0.1` quando expressos em g/kg. SRTM não fornece declividade neste importador; ela requer processamento adicional do raster de elevação.

## Como ficam os dados

- `agro.source_samples` e `agro.sample_daily`: valores por amostra consultada (POWER), evitando repetir o dado climático por célula.
- `agro.cell_sample_map`: relação amostra → cada subcélula de 12,5 km.
- `agro.cell_daily`: valores agregados de rasters por subcélula, por produto e dia (IMERG).
- `agro.static_properties`: atributos de solo e relevo, opcionalmente por profundidade.
- `agro.raster_assets`: referência, SHA256 e tamanho dos arquivos brutos guardados no Storage.
- `agro.v_cell_daily`: observações por subcélula, com origem e método.
- `agro.v_cell_monthly`: soma de precipitação mensal, média das demais variáveis, `days_available` para avaliar meses incompletos.

A malha não aumenta a resolução nativa da fonte. A abordagem POWER usa coordenadas representativas de *bins* de 0,5°, não a grade real exposta pelo produtor: validar as coordenadas de origem retornadas na API antes de usos científicos mais estritos. IMERG aplica média dos pixels que intersectam a célula (método `all_touched`, não ponderação exata da área do pixel). Para rigor adicional, trocar por interseção ponderada por área. A referência de data é UTC. Meses incompletos **não devem ser tratados como acumulados completos**.

## Segurança e execução

- As tabelas estão em schema `agro` com permissão revogada de `anon` e `authenticated`.
- A aplicação frontend precisará de views/RPCs com segurança e permissões controladas, criadas em etapa separada.
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
