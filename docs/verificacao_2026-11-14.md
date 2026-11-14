# Verificação de ingestão — 14/11/2026

Projeto Supabase: `desafio nasa` (`mzjdsbubxyrxcgnbylgs`).

- Migrações `001_schema`, `002_grid` e `003_views` aplicadas. O ETL também executou `migrate` pelo pooler de sessão com sucesso.
- Malha conferida no banco: 100 células principais, 400 subcélulas, 62.500 km² por nível.
- Mapeamento POWER: 30 pontos de origem ligados às 400 subcélulas. Reexecução de `init-grid` não duplicou linhas.
- Bucket `agro-rasters` criado como privado no Supabase Storage.
- NASA POWER: consulta real de 01/11/2025 gravada como piloto pelo conector e carga real de 02/11/2025 gravada pelo comando `etl power`. Cada dia tem 210 observações por amostra; a view diária cobre 400 subcélulas. A view mensal indica `days_available = 2` para as 2.800 combinações célula/métrica desse período. Novembro de 2025 continua incompleto.
- Testes locais no Docker: 6 aprovados, incluindo um GeoTIFF sintético para verificar a conversão de 0,1 mm por contagem no IMERG. Há avisos de depreciação do `shapely.ops.transform` nos testes da malha.
- IMERG Final: a pasta oficial respondeu HTTP 401 sem credenciais PPS. Nenhuma precipitação IMERG foi gravada; o bucket não substitui o acesso ao produto.

Próximas validações: executar uma carga IMERG de um dia histórico com acesso PPS, conferir o ZIP e o GeoTIFF contra a documentação NASA, verificar `valid_fraction` e o objeto no Storage, e só então planejar o backfill. Dados de solo e umidade da propriedade ainda não foram incorporados à recomendação.
