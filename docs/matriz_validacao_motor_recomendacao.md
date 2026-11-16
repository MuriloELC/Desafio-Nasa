# Matriz de validação do motor de recomendação

Esta matriz registra a evidência operacional usada pelo motor. Por decisão de produto em 15/11/2026, os valores disponíveis foram aceitos como confiáveis para publicação; fonte, detalhe, versão, responsável e data permanecem registrados para auditoria.

As quatro faixas obrigatórias do primeiro ciclo são temperatura do ar, pH local, chuva recente e chuva sazonal. Além delas, deve existir ao menos uma regra validada aplicável à fase do café e ao regime hídrico informados.

| Espécie | Faixas preenchidas | Regras validadas | Confiança operacional | Estado editorial |
| --- | ---: | --- | --- | --- |
| Amendoim-forrageiro | 5/5 | sim | alta | publicado |
| Braquiária-ruziziensis | 5/5 | sim | alta | publicado |
| Crotalária-júncea | 5/5 | sim | alta | publicado |
| Crotalária-spectabilis | 5/5 | sim | alta | publicado |
| Feijão-caupi | 5/5 | sim | alta | publicado |
| Feijão-de-porco | 5/5 | sim | alta | publicado |
| Guandu-anão | 5/5 | sim | alta | publicado |
| Lablab | 5/5 | sim | alta | publicado |
| Milheto | 5/5 | sim | alta | publicado |
| Mucuna-anã | 5/5 | sim | alta | publicado |

## Faixas operacionais publicadas

Chuva recente e chuva sazonal usam a mesma janela operacional de 30 dias porque o motor compara o mês atual com o mesmo mês dos cinco anos anteriores. Esses limites são aproximações operacionais aceitas para esta versão; não são conversões diretas de chuva anual.

| Espécie | Temperatura (°C) | pH | Chuva anual (mm) | Chuva em 30 dias (mm) | Fonte principal |
| --- | ---: | ---: | ---: | ---: | --- |
| Amendoim-forrageiro | 22–28 | 5,5–6,5 | 2.000–4.000 | 100–350 | [Embrapa Acre, 2016](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/913652/1/24115.pdf) |
| Mucuna-anã | 20–30 | 5,0–6,5 | 1.200–1.500 | 60–300 | [FAO EcoCrop](https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2350) |
| Crotalária-spectabilis | 20–28 | 4,8–8,0 | 900–2.800 | 45–300 | [PROSEA](https://prosea.prota4u.org/view.aspx?id=3000) |
| Feijão-de-porco | 20–30 | 4,5–7,0 | 800–2.000 | 40–300 | [Embrapa, Documento 227](https://www.infoteca.cnptia.embrapa.br/bitstream/doc/746693/1/documento227.pdf) |
| Crotalária-júncea | 20–30 | 5,0–7,5 | 500–1.500 | 40–300 | [Tropical Forages](https://tropicalforages.info/pdf/crotalaria_juncea.pdf) |
| Guandu-anão | 20–35 | 5,0–8,0 | 500–1.500 | 40–250 | [Embrapa Gado de Corte](https://old.cnpgc.embrapa.br/publicacoes/ct/ct13/02guandu.html) |
| Milheto | 25–34 | 5,0–6,5 | 300–900 | 30–250 | [Embrapa Milho e Sorgo](https://ainfo.cnptia.embrapa.br/digital/bitstream/item/27379/1/Clima.pdf) |
| Braquiária-ruziziensis | 28–33 | 5,5–6,5 | 1.000–2.000 | 75–350 | [Embrapa, Plantas Forrageiras II](https://www.embrapa.br/documents/1354377/1743400/plantas%2Bforrageiras%2Bii.pdf/4423951b-3670-4a9a-ad32-9ba5f2001d27?version=1.0) |
| Lablab | 18–30 | 5,0–7,5 | 750–2.500 | 50–300 | [FAO, ETH/81/003](https://www.fao.org/4/ar816e/ar816e.pdf) |
| Feijão-caupi | 18–34 | 5,5–6,5 | 250–500 | 75–180 | [Embrapa Meio-Norte](https://www.embrapa.br/web/agencia-de-informacao-tecnologica/cultivos/feijao-caupi/pre-producao/caracteristicas-e-relacoes-com-o-ambiente/clima) |

As regras de plantio, manejo e corte usam [Adubação verde em cafezais, cap. 19, p. 260–261](https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1153221/1/ADUBACAO-VERDE-VOL02.pdf), [Café na Amazônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1023762/1/17431.pdf) e a [RT/08 da Embrapa Rondônia, p. 5](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/704118/1/FOL61100001.pdf). Extrapolações entre espécies permanecem registradas em `derivation` e foram aceitas para uso operacional.

## Aceite operacional

As dez espécies receberam temperatura, pH, chuva anual, chuva recente e chuva sazonal em `012_cereja_evidencia_inicial.sql`. As faixas e regras foram promovidas para uso operacional com confiança alta e aceite de produto registrado. Nematoides ficaram fora deste ciclo por decisão de escopo.

Para cada espécie, a migração registra:

1. As quatro faixas obrigatórias em `agro.cereja_requirements`, com `reviewed = true`, `reviewed_at`, `reviewed_by`, `source_id`, `source_detail` e versão.
2. Regras específicas de implantação, manutenção, roçada/corte, competição hídrica e faixa livre junto ao cafeeiro em `agro.cereja_rules`, com responsável e data de validação.
3. Regras de fase, regime hídrico, capacidade de manejo, umidade, espaçamento e objetivo de manejo usadas no ranking.

O motor preserva `tie = true` quando duas ou mais espécies obtêm os mesmos componentes de pontuação. O frontend não usa ordem alfabética para inventar diferenças entre itens empatados.
