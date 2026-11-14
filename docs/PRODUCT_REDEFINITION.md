# Redefinição do produto Cerejá

Data: 14 de novembro de 2026
Status: nova fonte de verdade do produto

## Problema final

Produtores de café Canéfora de Rondônia precisam manter a entrelinha protegida sem aumentar indevidamente a competição com o cafeeiro. A escolha não é apenas “qual planta melhora o solo”: depende do risco hídrico daquele período, irrigação, idade e espaçamento do cafezal, exposição atual, capacidade de manejo e objetivo do produtor.

Formulação final:

> Como ajudar o produtor a comparar estratégias de cobertura para a entrelinha do seu talhão, deixando claro quando cada alternativa faz sentido, quais riscos cria e qual evidência ambiental alterou a avaliação?

A existência do problema é sustentada por materiais da Embrapa para Rondônia: o manejo deve considerar idade, espaçamento, água, clima, solo e recursos, e o solo não deve permanecer totalmente descoberto, ao mesmo tempo em que a competição precisa ser controlada.

## Público

Principal: pequeno e médio produtor de café Canéfora/Robusta de Rondônia.

Secundário: técnico rural, extensionista ou agrônomo que queira revisar as evidências e discutir a decisão com o produtor.

## Situação de uso

Antes de implantar, renovar ou roçar a cobertura da entrelinha, especialmente na transição entre período chuvoso e seco. O produtor abre o Cerejá no celular, delimita o talhão, responde poucas perguntas e compara alternativas para o contexto atual.

## Solução

O Cerejá é uma ferramenta de apoio à decisão, não um receituário. Ele combina:

1. área selecionada;
2. sinais ambientais regionais;
3. contexto declarado do cafezal;
4. objetivo e capacidade de manejo;
5. regras agronômicas rastreáveis;

para classificar estratégias como:

- **Faz sentido estudar agora**;
- **Adequada com ressalvas**;
- **Pouco adequada neste momento**;
- **Dados insuficientes**.

## Diferencial

Aplicativos de gestão cafeeira organizam custos, chuva e adubação. Aplicativos de plantas de cobertura partem de laudo e catálogo de espécies. O Cerejá ocupa outro recorte: transforma o contexto orbital e as condições do cafezal em uma **comparação explicável de trade-offs da entrelinha**, específica para o momento e objetivo do talhão.

O diferencial não é “usar NASA”; é mostrar como um sinal NASA muda a cautela hídrica, a janela de manejo ou a adequação relativa entre alternativas.

## Dados

### Informados pelo produtor

- polígono ou ponto do talhão;
- idade do cafezal;
- espaçamento entre linhas;
- irrigação e tipo, se houver;
- manejo atual da entrelinha;
- nível de exposição do solo;
- objetivo prioritário;
- capacidade/frequência de manejo;
- problemas conhecidos, especialmente nematoides, quando houver laudo.

### Externos

| Fonte                 | Sinal                                                       | Decisão que pode alterar                                           | Limitação principal                           |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| NASA POWER / IMERG    | chuva histórica, sazonalidade, intensidade e transição seca | janela de implantação e cautela com exposição/erosão               | grade regional; não mede o talhão diretamente |
| NASA SMAP L4          | umidade superficial/contexto hídrico                        | ressalva de competição por água e necessidade de confirmação local | ~9 km; não substitui sensor                   |
| NASA NEX-GDDP-CMIP6   | tendência futura de temperatura/precipitação                | prioridade de adaptação de longo prazo                             | ~25 km e incerteza entre modelos/cenários     |
| Embrapa               | regras de manejo e fatores de compatibilidade               | filtros, ressalvas e evidências agronômicas                        | generalização exige validação local           |
| análise de solo/laudo | textura, química e problemas específicos                    | confirmação e exclusões                                            | depende de coleta e interpretação adequadas   |

Cobertura/NDVI pode entrar futuramente por MODIS/Landsat/AppEEARS, mas só se a resolução e a série temporal responderem uma pergunta concreta. Não atribuir NDVI à NASA POWER.

## Papel NASA

NASA entra em três pontos do mecanismo:

1. **Risco hídrico atual/sazonal:** chuva e umidade qualificam a chance de competição e a urgência de manter palhada.
2. **Janela de estabelecimento:** distribuição da chuva altera quando uma cobertura viva pode ser estudada.
3. **Adaptação:** projeções futuras mudam a prioridade de soluções persistentes, sem determinar espécie sozinhas.

Teste contrafactual da demo:

- sem o sinal hídrico, duas estratégias podem parecer equivalentes;
- com seca sazonal e sem irrigação, cobertura permanente recebe ressalva de competição e manejo;
- com irrigação declarada e solo exposto, a mesma cobertura pode subir para “faz sentido estudar agora”.

## Mecanismo

Motor inicial determinístico:

```text
perfil do talhão
+ sinais ambientais
+ objetivo
+ catálogo de estratégias
+ regras com fonte
↓
filtros de segurança
↓
adequação qualitativa
↓
razões + riscos + pré-condições + evidências
```

Não haverá machine learning nem score percentual no MVP. Cada regra possui identificador, entrada, efeito, justificativa e fonte. A UI mostra as razões em linguagem simples e permite abrir o detalhe técnico.

## Feature assinatura

### O que muda se eu escolher esta cobertura?

Em 15–30 segundos, o jurado alterna entre três estratégias e vê simultaneamente:

- perfil do solo e cobertura mudar;
- risco hídrico e necessidade de manejo mudar;
- trade-off dominante mudar;
- quatro fases mudarem: agora, estabelecimento, período seco e próxima chuva;
- evidência que causou a mudança ficar destacada.

## Fluxo

1. Landing explica público, problema e mecanismo em menos de 30 segundos.
2. Produtor delimita o talhão.
3. Responde somente dados que o satélite não conhece.
4. Escolhe o objetivo prioritário.
5. Transição mostra quais fontes estão sendo consultadas.
6. **Minha Terra** resume “como está a área” e “o que merece atenção”.
7. Produtor compara três estratégias e abre benefícios, riscos e evidências.
8. Visualiza o próximo passo: o que confirmar no campo/técnico.

## Limitações

- MVP sem consulta ao vivo; fixtures são explicitamente simuladas.
- Mapa atual é ilustrativo, não geográfico.
- Dados orbitais têm resolução regional.
- Estratégias não definem dose, cultivar, semente, defensivo ou irrigação.
- Matéria orgânica, textura, compactação, fertilidade e nematoides exigem dados de campo/laudo.
- O produto não substitui responsável técnico.

## Riscos

- Competição hídrica entre cobertura e café.
- Hospedagem de nematoides/pragas por espécie incompatível.
- Cobertura mal manejada aumentar operação, custo ou competição.
- Generalizar evidência de café Arábica/Cerrado para Canéfora/Rondônia.
- Fazer parecer que precisão de satélite equivale ao talhão.
- Recomendar espécie sem disponibilidade, histórico ou validação local.

## MVP

- dois cenários demonstrativos de Rondônia com saídas diferentes;
- onboarding com polígono, irrigação, idade, espaçamento, manejo, exposição e objetivo;
- quatro sinais ambientais simulados e rastreáveis;
- motor determinístico com três estratégias;
- comparação de benefícios, riscos, trade-offs e evidências;
- feature “O que muda se…”;
- trajetória em quatro fases;
- Aprender com conceitos essenciais.

## O que removeremos do projeto antigo

- calendário de cultivo do café;
- análise de doenças;
- scores e percentuais sem método;
- métricas ambientais decorativas;
- rotas e componentes sem papel no fluxo;
- recomendações categóricas e perfis fora de Rondônia no MVP.

## O que reutilizaremos

- marca, paleta, assets do café e linguagem acolhedora;
- landing, chat, transição orbital e shell responsivo;
- `InfoTerm`, componentes Radix e persistência local;
- ilustrações de território e solo;
- testes e organização TypeScript.

## Plano de implementação

1. Criar fixtures de dois talhões e tipos de evidência.
2. Implementar motor determinístico auditável.
3. Ajustar onboarding aos fatores que mudam a decisão.
4. Reconstruir Minha Terra como comparador explicável.
5. Reescrever landing para pitch de 30 segundos.
6. Ajustar transição para fontes e consequências reais.
7. Atualizar Aprender, documentação e roteiro de demo.
8. Executar testes, lint, build e revisão responsiva.

## Fontes de validação

- [Embrapa — Gerenciamento anual da produção de Coffea canephora em Rondônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf)
- [Embrapa — Manejo de plantas daninhas em Café na Amazônia](https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1040714/1/Cafe-na-AmazoniaSANTOS.pdf)
- [Embrapa — Café na Amazônia](https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1023755/1/LivroCafenaAmazoniaDigital2015.pdf)
- [NASA POWER — Temporal APIs](https://power.larc.nasa.gov/docs/services/api/temporal/)
- [NASA POWER — Metodologia e fontes](https://power.larc.nasa.gov/docs/methodology/)
- [NASA NEX-GDDP-CMIP6](https://nccs.smce.nasa.gov/data-collections/nex-gddp-cmip6/)
- [Plantas de Cobertura — referência concorrencial](https://plantasdecobertura.com/)
- [Café Smart — referência concorrencial](https://play.google.com/store/apps/details?id=com.org.mais_cafe&hl=pt_BR)
