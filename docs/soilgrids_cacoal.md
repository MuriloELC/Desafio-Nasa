# SoilGrids para o piloto CACOAL_R20

## Origem e interpretação

Em 15/11/2026, foram obtidas do [WCS oficial do ISRIC](https://docs.isric.org/globaldata/soilgrids/wcs.html) as previsões médias (`mean`) do [SoilGrids 2.0](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html) para 0–5 cm, resolução nominal de 250 m. O recorte cobre o círculo de 20 km de Cacoal e uma margem de 500 m. O script `scripts/soilgrids_cacoal.py` verificou 60/60 células em cada camada. Os GeoTIFFs e o manifesto detalhado ficam em `data/soilgrids/` (fora do Git).

| Camada WCS | Métrica na API | Unidade bruta | Conversão | Intervalo validado no recorte | SHA-256 do arquivo |
| --- | --- | --- | --- | --- | --- |
| `phh2o_0-5cm_mean` | `soil_ph` | pH × 10 | multiplicar por 0,1 → pH | 3,42–5,00 pH | `e951f9a0ba98fd985f7f9fdb5249db43841ea0c1d86e2eb5f3ab6c332efe0ad6` |
| `clay_0-5cm_mean` | `clay_pct` | g/kg | multiplicar por 0,1 → % | 15,90–28,11% | `08166f79d9c7bd434623e9f2aaa8e291d1b850b6cd4829a7780ff4c8254d00ad` |

As [unidades e fatores de conversão](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_01.html) vêm do ISRIC. Ambas são estimativas regionais de um modelo global, agregadas aqui por média espacial nas células de 5 km. **Não são medições do talhão**. A avaliação não recebe o pH SoilGrids automaticamente; o pH local só entra se o produtor informar uma análise de solo. O [ISRIC ressalta](https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_04.html) que a escala global não é apropriada para inferência direta em uma propriedade.

Consultas WCS usadas:

- [pH 0–5 cm](https://maps.isric.org/mapserv?map=%2Fmap%2Fphh2o.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=phh2o_0-5cm_mean&FORMAT=GEOTIFF_INT16&SUBSET=X%28-6858081%2C-6816669%29&SUBSET=Y%28-1294226%2C-1252755%29&SUBSETTINGCRS=http%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FEPSG%2F0%2F152160&OUTPUTCRS=http%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FEPSG%2F0%2F152160)
- [argila 0–5 cm](https://maps.isric.org/mapserv?map=%2Fmap%2Fclay.map&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&COVERAGEID=clay_0-5cm_mean&FORMAT=GEOTIFF_INT16&SUBSET=X%28-6858081%2C-6816669%29&SUBSET=Y%28-1294226%2C-1252755%29&SUBSETTINGCRS=http%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FEPSG%2F0%2F152160&OUTPUTCRS=http%3A%2F%2Fwww.opengis.net%2Fdef%2Fcrs%2FEPSG%2F0%2F152160)

Licença dos dados: CC BY 4.0. Citação recomendada pelo ISRIC: Poggio et al. (2021), *SoilGrids 2.0: producing soil information for the globe with quantified spatial uncertainty*, SOIL 7, 217–240.

## Obtenção e importação

```powershell
docker compose build etl
docker compose run --rm --entrypoint python etl scripts/soilgrids_cacoal.py
docker compose run --rm etl migrate
docker compose run --rm etl static-raster --file data/soilgrids/phh2o_0-5cm_mean_CACOAL_R20.tif --source SOILGRIDS --metric soil_ph --unit pH --scale 0.1 --depth-top 0 --depth-bottom 5
docker compose run --rm etl static-raster --file data/soilgrids/clay_0-5cm_mean_CACOAL_R20.tif --source SOILGRIDS --metric clay_pct --unit % --scale 0.1 --depth-top 0 --depth-bottom 5
```

O script valida projeção, resolução, intervalo de valores e cobertura das 60 células antes de gerar o manifesto. A importação usa o mecanismo existente de `static_properties` e armazena o raster original no Supabase Storage.

Após a importação, confira no banco que as duas métricas têm exatamente 60 células e valores na unidade convertida:

```sql
SELECT p.metric, count(*) AS cells, min(p.value) AS minimum, max(p.value) AS maximum,
       min(p.unit) AS unit, min(p.depth_top_cm) AS top_cm, max(p.depth_bottom_cm) AS bottom_cm
FROM agro.static_properties p
JOIN agro.grid_cells c USING (cell_id)
WHERE c.region_id = 'CACOAL_R20' AND c.level = 2 AND p.source_id = 'SOILGRIDS'
  AND p.metric IN ('soil_ph', 'clay_pct')
GROUP BY p.metric
ORDER BY p.metric;
```

Espere `60` células por métrica, profundidade `0–5 cm`, unidade `pH` ou `%` e intervalos próximos aos da tabela acima. Execute também `GET /api/consulta` para um ponto do círculo e confirme que as duas propriedades aparecem em `static` com fonte, resolução e qualidade `estimated`.

**Estado da execução em 15/11/2026:** migração `009_soilgrids_source.sql` aplicada e as duas camadas importadas no Supabase. A conferência retornou 60 células de `soil_ph` (3,42–5,00 pH) e 60 de `clay_pct` (15,90–28,11%), ambas em 0–5 cm. O gateway confirmou as duas propriedades em `GET /api/consulta`, com fonte `SOILGRIDS`, resolução `250 m` e qualidade `estimated`.
