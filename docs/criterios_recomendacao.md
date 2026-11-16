# Dados necessários para recomendar coberturas nas entrelinhas

A localização marcada é um ponto, não o polígono da lavoura. Nenhuma espécie deve ser apresentada como recomendação individual antes de cruzar dados observados, análise de solo e condições de manejo informadas pelo produtor.

| Indicador | Fonte prevista | Estado atual |
|---|---|---|
| Temperatura média, mínima e máxima | NASA POWER diário | Histórico de Cacoal desde 01/01/2000 carregado até o último dado disponível, 12/11/2026 |
| Chuva acumulada e distribuição | IMERG Final diário; POWER como comparação | IMERG Final começa em junho de 2000; 9.253 dias mapeados e carga de Cacoal em andamento. Não fundir produtos como se fossem uma série única |
| Déficit hídrico | Balanço hídrico com capacidade de armazenamento do solo e evapotranspiração | Não calculado; chuva menos evapotranspiração isolada não basta |
| pH, P, K, Ca, Mg, matéria orgânica | Análise de solo da propriedade | Não disponível em raster com precisão suficiente para decisão individual |
| Argila, silte e areia | SoilGrids, mais análise local quando possível | Importação manual disponível; resolução e incerteza precisam aparecer no resultado |
| Idade do café, espaçamento, cobertura atual, capacidade de manejo e irrigação | Produtor e assistência técnica | Coletados no onboarding; nematoides ficaram fora do levantamento inicial |

## Evidência agronômica inicial

- **Braquiária (Urochloa spp.)**: produz cobertura e palhada, mas exige manejo da competição com o cafeeiro, sobretudo por água em períodos secos. A espécie exata importa: o protótipo usa *U. ruziziensis*, enquanto o exemplo enviado cita *U. decumbens*; não tratar as duas como equivalentes. Fonte: [Embrapa, Documento 159, manejo de plantas daninhas do café](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1027715/1/Doc159cafe.pdf).
- **Milheto (Pennisetum glaucum)**: opção anual de biomassa; a implantação deve coincidir com umidade suficiente, especialmente no início do estabelecimento. Fonte: [Embrapa, sistemas de cultivo de plantas de cobertura](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1066067/1/Sistemasdecultivodeplantasdecobertura.pdf).
- **Crotalária-júncea (Crotalaria juncea)**: leguminosa para biomassa e fixação biológica de N. Os números de produção publicados são contextuais, não parâmetros garantidos para cada cafezal. Fonte: [Embrapa, Documento 159](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1027715/1/Doc159cafe.pdf).
- **Amendoim-forrageiro (Arachis pintoi)**: cobertura perene de baixo porte; publicação da Embrapa relata adaptação em áreas com precipitação anual superior a 1.200 mm. A distribuição da chuva e o estabelecimento ainda precisam ser avaliados. Fonte: [Embrapa, requisitos de clima e solo da espécie](https://www.bdpa.cnptia.embrapa.br/consulta/busca?b=pc&biblioteca=&busca=%28autoria%3A%22WADT%2C+P.+G.+S%22%29&id=920237&paginaAtual=1&paginacao=t&qFacets=%28autoria-sort).

## Regra de produto para a próxima etapa

Mostrar **candidatas com justificativa e dados faltantes**, não um escore agronômico definitivo. Se faltar umidade do solo, análise de fertilidade ou informação sobre a competição com o café, sinalizar a lacuna e pedir verificação local. Usar o histórico diário da célula que contém a propriedade, indicando resolução, fonte, período coberto e dias ausentes. A regra de semeadura deve considerar chuva recente e previsão/observação local, sem calendário fixo para todos os municípios.
