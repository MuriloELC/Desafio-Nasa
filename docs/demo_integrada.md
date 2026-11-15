# Demonstração integrada CEREJÁ

## Preparação

1. Configure `.env` conforme `.env.example` em um Supabase de demonstração. Mantenha `DATABASE_URL` e chaves apenas no backend.
2. Execute `docker compose build`, `docker compose run --rm etl migrate` e, em banco novo, `docker compose run --rm etl init-grid` e a importação do catálogo descrita no README.
3. Verifique que POWER, IMERG e catálogo estão carregados. A importação SoilGrids já foi concluída no Supabase do piloto; a [proveniência e os comandos](soilgrids_cacoal.md) permitem reproduzi-la.
4. Execute `docker compose up web frontend gateway` e acesse `http://localhost:8000`.
   Com os serviços ativos, rode `node scripts/verify_cereja_gateway.mjs http://127.0.0.1:8000 --capture`. O verificador exige resposta React na raiz, contratos reais das três APIs, SoilGrids na célula central e pH regional ausente dos campos informados à recomendação. Ele grava as respostas públicas em `tests/fixtures/api_real/` para a revisão de contrato.
5. Para demonstrar o caderno privado, habilite Auth por e-mail no Supabase e use uma conta de demonstração. Não compartilhe credenciais no roteiro.

## Roteiro de 90 segundos

| Tempo | Ação | Evidência a mostrar |
| --- | --- | --- |
| 0–15 s | Abrir a página inicial e explicar o piloto de café Canéfora em Cacoal. | Círculo de 20 km, não o limite municipal. |
| 15–30 s | Iniciar a conversa, escolher Cacoal e informar um ponto do talhão. | Latitude e longitude reais, verificadas pela API. |
| 30–45 s | Abrir “Minha Terra”. | Valores observados, fonte, data, resolução e ausência explícita quando faltar dado. |
| 45–65 s | Completar contexto de campo e comparar candidatas. | Estado conservador, razões, dados faltantes e cobertura climática; POWER e IMERG separados. |
| 65–75 s | Abrir o calendário técnico/“Aprender”. | Mês, regra, versão, orientação e fonte publicada. |
| 75–90 s | Abrir “Minha Lavoura” com conta de demonstração. | Talhão, tarefa e avaliação salva com data e versão. |

## Checklist operacional

- [x] Frontend importado, TypeScript, build, lint e testes locais.
- [x] APIs públicas e caderno privado conectados no código, sem números ambientais simulados no fluxo ativo.
- [x] Recortes SoilGrids obtidos e validados em 60/60 células; produto, escala, profundidade e SHA-256 documentados.
- [x] Migração de metadados e importação SoilGrids verificadas no Supabase: 60 células por métrica, 0–5 cm.
- [x] Gateway Docker executado; página React e três APIs públicas verificadas em `http://127.0.0.1:8000`.
- [ ] Jornada em desktop/celular e Auth/RLS excluídos deste aceite por decisão do time em 15/11/2026.
- [ ] Testes de banco descartável excluídos deste aceite por decisão do time em 15/11/2026.

## Estados a verificar na revisão final

Ponto fora da área, catálogo ausente, período incompleto, API/banco indisponível, autenticação expirada, tentativa de registrar ciclo ou tarefa em outro talhão e recarga da página sem sessão. A interface deve mostrar a limitação e não substituir dado faltante por valores de demonstração.
