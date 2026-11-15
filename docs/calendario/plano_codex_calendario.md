# Calendário técnico do CEREJÁ

O SQL `20261114_calendario_agricola.sql` é referência histórica e não deve ser aplicado em paralelo. A implementação está nas migrações `006` a `008`: usa a malha existente, cadastro canônico no schema `agro` e tabelas privadas com Supabase Auth para Minha lavoura. As migrações são aditivas e não alteram as séries climáticas.

A grade escura mostra a safra outubro–setembro, com linhas agrupadas em Café e Entrelinhas e nomes fixos na rolagem horizontal. Barra verde indica plantio, laranja colheita, cinza corte ou roçada e azul manejo. O título acessível e o painel de detalhes também identificam atividade, fase, água, período e fonte. A linha pontilhada marca o mês atual apenas na safra corrente.

| Tipo da regra publicada | Apresentação |
| --- | --- |
| `sazonal` | Barra pelos meses aplicáveis; dezembro–janeiro e intervalos separados preservam seu significado. |
| `condicional` | Orientação sem barra: **Depende das condições**. |
| `apos_plantio` | Período projetado se houver plantio real informado, limitado à safra exibida. |

`GET /api/calendario`: aceita `safra` (ano de outubro), `cultura` (ID), `fase`, `agua`, `plantio` (data real ISO, exige cultura) e `municipio` (IBGE). Todos são opcionais. Sem coordenadas consultadas o site apresenta referências estaduais e gerais. Usar o filtro de fase e água para obter o contexto específico.

O raio de estudo não é o limite da cidade. A [Malha Municipal simplificada do IBGE](https://servicodados.ibge.gov.br/api/docs/malhas?versao=3), salva na migração 008, localiza o ponto para uso de regras municipais. Em fronteira ou quando não se resolve o município com segurança, o motor usa a referência estadual e depois a geral. A grade não usa dados, imagens ou períodos agrícolas do jogo de referência.

As referências iniciais são a [Circular Técnica 125 da Embrapa Rondônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf) para a implantação e a colheita dos grupos Conilon e Robusta em lavouras clonais de sequeiro, e [Cultivos intercalares em cafezais](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1023762/1/17431.pdf) para a orientação condicional de feijão-comum. A regra de milheto fica em rascunho até revisão de evidência específica. Não há datas aprovadas de corte ou colheita dessas entrelinhas. Novas regras entram em `agro.cereja_rules` com ID, versão, contexto e referência por página; apenas versões validadas aparecem na grade e no motor, e o arquivamento de uma versão publicada retira a regra de circulação.

`POST /api/recomendacoes` aceita coordenadas `lat`/`lon`, `reference_date` e objeto opcional `field` com `phase`, `age_years`, `spacing_m`, `water`, `soil_ph`, `goal` e `can_manage`. O resultado inclui fontes, lacunas, cobertura climática, justificativas e versão do método; a rota não grava avaliações. Nematoides ficaram fora do levantamento inicial.

**Minha lavoura** registra o plantio real, o encerramento do ciclo, as datas prevista e realizada de uma tarefa, e as avaliações salvas pelo produtor. As tarefas não são criadas a partir de uma janela técnica. Vínculos entre ciclo, talhão e tarefa não atravessam contas nem talhões.
