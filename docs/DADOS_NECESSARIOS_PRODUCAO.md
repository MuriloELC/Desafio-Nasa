# Dados necessários para produção

Este documento separa o que vem do produtor, o que vem de fonte externa, o que é derivado e o que precisa ser confirmado em campo.

## 1. Dados respondidos pelo produtor

| Campo                         | Formato                                                  | Obrigatório | Regra que altera                   |
| ----------------------------- | -------------------------------------------------------- | ----------: | ---------------------------------- |
| `farm_name`                   | texto curto                                              |         não | identificação                      |
| `municipality_ibge_code`      | código IBGE de RO                                        |         sim | busca e validação espacial         |
| `plot_geometry`               | `GeoJSON Polygon`, EPSG:4326                             |         sim | consulta espacial                  |
| `coffee_species`              | `canephora`, `arabica`, `unknown`                        |         sim | catálogo/regras agronômicas        |
| `coffee_age_band`             | `<1`, `1_3`, `3_8`, `>8`, `unknown`                      |         sim | risco de competição e espaço livre |
| `row_spacing_m`               | número decimal                                           |         sim | viabilidade operacional            |
| `irrigation`                  | `none`, `drip`, `sprinkler`, `other`, `unknown`          |         sim | ressalva hídrica                   |
| `current_interrow_management` | `exposed`, `spontaneous_mowed`, `planted_cover`, `other` |         sim | cenário-base                       |
| `soil_exposure`               | `low`, `medium`, `high`, `unknown`                       |         sim | prioridade de proteção             |
| `primary_goal`                | `water`, `erosion`, `biomass`, `structure`, `simplicity` |         sim | ordenação das alternativas         |
| `management_capacity`         | `low`, `medium`, `high`                                  |         sim | complexidade compatível            |
| `known_nematodes`             | espécie/laudo/data ou `unknown`                          |         não | exclusão de espécies incompatíveis |
| `soil_analysis_id`            | referência do laudo                                      |         não | confirmação química/física         |

O chat não deve pedir chuva, temperatura ou “umidade do solo estimada”; essas informações vêm de fontes ou instrumentos. Também não deve pedir ao produtor para inferir risco agronômico.

## 2. Geometria e metadados espaciais

Persistir:

- `geometry` em GeoJSON;
- `centroid_lat`, `centroid_lon`;
- `area_ha` calculada geodesicamente;
- `geometry_source` (`producer_drawn`, `car`, `shapefile`);
- `geometry_updated_at`;
- consentimento para persistir coordenadas exatas.

O mapa do MVP usa coordenadas de ilustração. Produção exige mapa real, validação de polígono e proteção de dados de localização.

## 3. Fontes NASA

### NASA POWER / GPM IMERG

Dados necessários:

- precipitação diária em `mm/day`;
- temperatura média/mínima/máxima em `°C`;
- período solicitado e data de atualização;
- centro/grade utilizada;
- flags de qualidade e ausência.

Derivados permitidos:

- chuva acumulada por período;
- duração da sequência seca, com limiar documentado;
- concentração sazonal da chuva;
- anomalia contra climatologia definida;
- janela candidata de estabelecimento.

IMERG tem resolução aproximada de 0,1° (~10 km). Não apresentar como pluviômetro do talhão.

### NASA SMAP L4

Dados necessários:

- umidade superficial em `m³/m³`;
- produto/versão;
- timestamp e grade;
- incerteza/qualidade.

Uso permitido: qualificar contexto hídrico regional e tendência. Não calcular necessidade de irrigação sem solo, raiz, evapotranspiração, sistema e medição local. Resolução aproximada: 9 km.

### NASA NEX-GDDP-CMIP6

Dados necessários:

- modelo climático e SSP;
- variável, unidade e período-base;
- janela futura;
- conjunto de modelos, nunca um único número isolado;
- percentis/intervalo entre modelos.

Uso permitido: priorização de adaptação de longo prazo. Não usar projeção de ~25 km como previsão do talhão ou para definir espécie sozinha.

## 4. Dados agronômicos

Cada estratégia/espécie precisa de ficha versionada:

- nome comum e científico;
- função principal;
- ciclo e persistência;
- exigência hídrica relativa;
- porte e agressividade;
- compatibilidade com idade/espaçamento;
- frequência de manejo;
- produção de biomassa em condições documentadas;
- riscos de competição;
- relação com nematoides/pragas/doenças por espécie;
- região e sistema de café da evidência;
- fonte, ano, página e nível de confiança;
- disponibilidade regional de sementes, quando confirmada.

Não extrapolar automaticamente resultado de Arábica no Cerrado para Canéfora em Rondônia.

## 5. Dados de campo/laboratório

Necessários para avançar além de triagem:

- textura e classe do solo;
- matéria orgânica medida;
- compactação/infiltração quando disponíveis;
- fertilidade e pH;
- declividade;
- cobertura real por foto/classificação validada;
- histórico de nematoides;
- umidade por sensor, quando houver;
- operações, custo e disponibilidade de implementos.

## 6. Saída rastreável do motor

Para cada alternativa persistir:

```text
strategy_id
suitability_category
triggered_rule_ids[]
evidence_ids[]
benefits[]
risks[]
tradeoffs[]
prerequisites[]
excluded_because[]
ruleset_version
calculated_at
```

Categorias públicas: `faz sentido estudar`, `adequada com ressalvas`, `pouco adequada`, `dados insuficientes`. Scores internos, se existirem, não podem ser apresentados sem definição, calibração e validação.

## 7. O que não deve ser prometido

- diagnóstico do solo por satélite;
- precisão dentro da linha do café;
- dose de semente/adubo/defensivo sem modelo validado;
- produtividade ou economia garantida;
- “melhor cobertura” universal;
- recomendação fitossanitária sem laudo e fonte;
- dados em tempo real quando forem cache, climatologia ou simulação.

## 8. Fontes-base

- [NASA POWER — Temporal APIs](https://power.larc.nasa.gov/docs/services/api/temporal/)
- [NASA POWER — Metodologia](https://power.larc.nasa.gov/docs/methodology/)
- [NASA NEX-GDDP-CMIP6](https://nccs.smce.nasa.gov/data-collections/nex-gddp-cmip6/)
- [Embrapa — Gerenciamento anual de Coffea canephora em Rondônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf)
- [Embrapa — Manejo de plantas daninhas em Café na Amazônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1040714/1/Cafe-na-AmazoniaSANTOS.pdf)
