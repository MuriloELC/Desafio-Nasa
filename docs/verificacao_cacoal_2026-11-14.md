# Verificação da migração para Cacoal — 14/11/2026

Projeto Supabase: `desafio nasa` (`mzjdsbubxyrxcgnbylgs`). Região ativa: `CACOAL_R20`.

## Área e limpeza

- Centro adotado: latitude -11,44, longitude -61,45, coordenadas aproximadas da sede no [mapa municipal estatístico do IBGE (2022)](https://geoftp.ibge.gov.br/cartas_e_mapas/mapas_para_fins_de_levantamentos_estatisticos/censo_demografico_2022/mapas_municipais_estatisticos/RO/cacoal_1100049/cacoal_1100049_mme_a0.pdf). O círculo não representa o limite administrativo de Cacoal.
- A migração `004_cacoal.sql` substituiu a antiga `RO_250` por um círculo de raio de 20 km em EPSG:32720. Consulta ao Supabase confirmou **1 região**, **16 células principais de 10 km** e **60 subcélulas de 5 km**, recortadas no círculo. A soma da área por nível é **1.256,511 km²**.
- A carga IMERG da região antiga foi parada. Após a migração, as tabelas `sample_daily`, `cell_daily`, `raster_assets` e `etl_runs` tinham zero registros; as 30 amostras antigas e a malha antiga foram removidas. O ZIP piloto antigo também foi excluído pelo Storage API, e os arquivos temporários de raster da região antiga foram removidos do volume local.
- `init-grid` registrou **4 pontos POWER** para as 60 subcélulas de Cacoal.

## Carga desde 2000

- NASA [POWER Daily API](https://power.larc.nasa.gov/docs/services/api/temporal/daily/): carga anual de 01/01/2000 a 14/11/2026 concluída sem falha. A consulta verificou **274.472 linhas** em `agro.sample_daily`; seis métricas têm 39.252 linhas cada de 01/01/2000 a 12/11/2026. A radiação solar tem 38.960 linhas, até 31/08/2026. Os dias finais sem valor são ausência na resposta da fonte, não zeros.
- NASA [IMERG V07 Final](https://gpm.nasa.gov/data/news/imerg-v07-final-run-retrospective-processing-completed): começa em junho de 2000. O [inventário PPS](imerg_availability_2000_2026-11-14.csv) mapeou **9.663 datas** de 01/06/2000 a 14/11/2026: **9.253 disponíveis** (até 30/09/2025) e **410 diretórios ausentes** (01/10/2025 a 14/11/2026). Não houve respostas classificadas como erro no mapeamento.
- O piloto IMERG de **01/06/2000** gravou **60 linhas** em `agro.cell_daily` e arquivou o ZIP bruto no bucket privado `agro-rasters`. Um teste do filtro de período gravou também 01/01/2010. A carga histórica restante foi iniciada em quatro containers destacados, com faixas exclusivas 2000–2006, 2007–2012, 2013–2018 e 2019–2025. A retomada usa `agro.etl_runs.region_id = 'CACOAL_R20'`. Ela não estava concluída ao fechar este registro.

## Testes e limites

- `docker compose run --rm --entrypoint pytest etl -q`: **8 aprovados**, incluindo malha circular e média IMERG para células de borda. A migração e o piloto foram verificados contra o Supabase real.
- A subcélula de 5 km é menor que a resolução nominal de IMERG (~0,1°) e a amostragem meteorológica POWER. Células vizinhas podem receber os mesmos pixels ou a mesma amostra; a malha não cria informação adicional. A média espacial usa pixels tocados, sem ponderação exata da fração de área.
- Para verificar o fim da carga IMERG, execute `scripts/verify_history.py` com o inventário de 2000. O script compara dias disponíveis, execuções concluídas e quantidade esperada de 60 células por dia.
