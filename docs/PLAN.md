# Plano de execução do CEREJÁ - duas sprints

## Resumo

Consolidar a branch `codex/consolidacao` usando:

- frontend Vidal como interface oficial, importado para `frontend/`;
- backend Python/Supabase existente como fonte única de dados e decisões;
- calendário e conteúdo educativo da Anab, reimplementados em React;
- SoilGrids como contexto regional de solo;
- Minha Lavoura integrada com Supabase Auth;
- demo reproduzível via Docker Compose.

O IMERG permanecerá inalterado: sem modificações no extrator, backfill, agregação ou dados existentes. A interface continuará respeitando `days_available` e nunca apresentará períodos incompletos como totais completos.

## Sprint 1 - jornada principal integrada

- Importar o frontend Vidal no diretório `frontend/`, normalizar lint/line endings, restaurar o documento exigido pelos testes e manter build React/TanStack funcional.
- Criar cliente TypeScript para `GET /api/consulta`, `GET /api/calendario`, `POST /api/recomendacoes` e `/api/config`.
- Definir o ViewModel `EvidenceStatus` com `observado`, `informado`, `referencia` e `indisponivel`:
  - observações climáticas e propriedades estáticas: `observado`;
  - respostas do produtor: `informado`;
  - regras agronômicas e calendário: `referencia`;
  - dados ausentes ou períodos incompletos: `indisponivel`.
- Adaptar o onboarding para coletar coordenadas, fase, idade, espaçamento, regime hídrico, pH local opcional, capacidade de manejo e verificações de solo/umidade. Nematoides ficam fora do levantamento inicial.
- Substituir resultados demonstrativos pelo diagnóstico e pelas candidatas retornadas pela API. Nenhum número ambiental permanecerá hardcoded no fluxo principal.
- Integrar o calendário real, preservando fonte, versão da regra, escopo municipal, janela temporal e orientação.
- Criar composição Docker com:
  - serviço Python/Supabase interno;
  - serviço React;
  - gateway único para encaminhar `/api/*` ao backend e as demais rotas ao frontend.
- Manter a interface Python atual apenas como fallback interno, sem expô-la como produto final.

**Aceite da sprint:** o usuário marca um ponto em Cacoal, informa o contexto da lavoura, vê dados reais com proveniência, compara candidatas explicáveis e abre o calendário, tudo pela interface Vidal e sem valores simulados.

## Sprint 2 - solo, caderno de campo e qualidade

- Obter e recortar SoilGrids para o raio de 20 km de Cacoal:
  - `phh2o`, 0-5 cm, convertido para pH;
  - `clay`, 0-5 cm, convertido de g/kg para porcentagem.
- Registrar produto, versão, URL, profundidade, escala, unidade e data de obtenção; importar pelos mecanismos de `static_properties` existentes.
- Exibir SoilGrids como estimativa regional observada, com resolução e profundidade. Não usar o pH regional como substituto automático da análise local nem como critério decisório quando o produtor não informar pH.
- Integrar Supabase Auth em um contexto React com sessão mantida somente em memória.
- Implementar Minha Lavoura:
  - cadastro e seleção de talhões;
  - ciclos de café e entrelinha;
  - tarefas planejadas, realizadas ou canceladas;
  - execução e salvamento explícito de avaliações;
  - consulta de avaliações anteriores.
- Adaptar da proposta Anab os textos de conservação, calendário mensal e conteúdo “Aprender”, sempre ligados às regras publicadas e às evidências disponíveis.
- Adicionar estados de carregamento, API indisponível, ponto fora da área, catálogo ausente, período climático incompleto e autenticação expirada.
- Finalizar roteiro de demonstração de 90 segundos, documentação Docker e checklist operacional.

**Aceite da sprint:** o usuário consegue autenticar, cadastrar um talhão, executar e salvar uma avaliação, consultar contexto SoilGrids devidamente rotulado e registrar tarefas de manejo.

## Interfaces e compatibilidade

- Não criar endpoints novos; preservar os contratos atuais do backend.
- Tipar no frontend as respostas existentes e convertê-las para ViewModels sem transportar objetos de demonstração.
- Usar chamadas relativas a `/api`, mantendo banco, chaves Supabase e `DATABASE_URL` exclusivamente no backend.
- Preservar as regras atuais:
  - precipitação POWER e IMERG nunca são somadas;
  - somente períodos com `days_available == days_expected` alimentam avaliações;
  - recomendações continuam conservadoras: `favoravel`, `atencao`, `sem_dados` ou `desfavoravel`;
  - dados privados permanecem isolados pelas políticas RLS e pelo usuário derivado do token.
- IMERG fica expressamente fora das mudanças destas sprints.

## Testes e validação

- Backend: manter os 15 testes locais atuais e executar os testes de banco/Auth em ambiente Supabase descartável.
- Frontend: testar adaptadores de API, onboarding, estados de evidência, calendário, autenticação e Minha Lavoura.
- Contratos: fixtures reais das três APIs devem ser consumidas sem valores implícitos ou fallback simulado.
- SoilGrids: validar escala, profundidade, unidade, cobertura das 60 células e ausência de uso automático como análise local.
- E2E pelo gateway Docker:
  - jornada pública completa em desktop e celular;
  - ponto fora da área;
  - período IMERG incompleto;
  - falha do banco;
  - login, logout, isolamento entre duas contas e salvamento de avaliação.
- Qualidade final: build, testes, lint crítico, smoke browser e roteiro de 90 segundos devem passar em ambiente limpo.

## Premissas

- Duas sprints com aproximadamente duas semanas cada.
- Alvo final: demo Docker integrada usando o Supabase existente.
- Branch de consolidação: `codex/consolidacao`.
- Área piloto permanece `CACOAL_R20`, explicitamente descrita como círculo de 20 km, não como limite municipal.
- Novas fontes ambientais, balanço hídrico, prescrição de adubação, expansão municipal e alterações no IMERG ficam fora do escopo.
- O relatório original permanece como registro da decisão; ao término, README e documentação de validação serão atualizados com o estado efetivamente entregue.

## Ajuste de aceite em 15/11/2026

Por decisão do time, esta entrega concentra o aceite na importação SoilGrids, no gateway Docker e no protótipo público funcionando. A jornada visual em desktop/celular, a validação de autenticação e isolamento entre duas contas e os testes de banco descartável ficam fora deste aceite. Os testes unitários já existentes para sessão e caderno permanecem no projeto.
