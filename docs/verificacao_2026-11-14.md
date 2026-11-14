# Verificação de ingestão — 14/11/2026

> Registro histórico da antiga área de 250 × 250 km. As observações, a malha e o ZIP piloto aqui descritos foram removidos na migração `004_cacoal.sql` para o recorte de Cacoal. Este relatório não descreve o estado atual do banco.

Projeto Supabase: `desafio nasa` (`mzjdsbubxyrxcgnbylgs`).

- Migrações `001_schema`, `002_grid` e `003_views` aplicadas. O ETL também executou `migrate` pelo pooler de sessão com sucesso.
- Malha conferida no banco: 100 células principais, 400 subcélulas, 62.500 km² por nível.
- Mapeamento POWER: 30 pontos de origem ligados às 400 subcélulas. Reexecução de `init-grid` não duplicou linhas.
- Bucket `agro-rasters` criado como privado no Supabase Storage.
- NASA POWER: consulta real de 01/11/2025 gravada como piloto pelo conector e carga real de 02/11/2025 gravada pelo comando `etl power`. Cada dia tem 210 observações por amostra; a view diária cobre 400 subcélulas. A view mensal indica `days_available = 2` para as 2.800 combinações célula/métrica desse período. Novembro de 2025 continua incompleto.
- Testes locais no Docker: 6 aprovados, incluindo um GeoTIFF sintético para verificar a conversão de 0,1 mm por contagem no IMERG. Há avisos de depreciação do `shapely.ops.transform` nos testes da malha.
- IMERG Final V07B: autenticação PPS validada. O comando `etl imerg --date 2024-01-01` gravou 400 linhas em `agro.cell_daily`, todas com `valid_fraction = 1`. O ZIP de 10.639.049 bytes está no bucket privado e há um registro em `agro.raster_assets`; a execução terminou como `succeeded`.
- Disponibilidade PPS: os diretórios GIS de 01/11/2024, 01/01/2025 e 01/06/2025 responderam 200; os de 01/11/2025 e 01/01/2026 responderam 404. Essas datas não devem ser presumidas disponíveis no backfill.

Próximas validações: mapear a cobertura temporal do produto GIS no PPS antes do backfill, importar rasters de solo e conferir dados locais da propriedade. Dados de solo e umidade da propriedade ainda não foram incorporados à recomendação.
