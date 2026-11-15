# Validação do piloto CEREJÁ

## Consolidação React + gateway

O frontend oficial está em `frontend/`. O roteiro abaixo da interface Python é histórico e **não comprova** a jornada React. A validação da consolidação exige:

```bash
cd frontend
npm ci
npx tsc --noEmit
npm run lint -- --quiet
npm test
npm run build
cd ..
docker compose config --quiet
docker compose up --build web frontend gateway
node scripts/verify_cereja_gateway.mjs http://127.0.0.1:8000 --capture
```

Em 15/11/2026, TypeScript, lint, build e 45 testes frontend passaram na rodada final. A migração `009` foi aplicada, SoilGrids foi importado com 60 células por métrica e o gateway retornou a página React, 6 regras de calendário e 10 candidatas. `verify_cereja_gateway.mjs --capture` gravou respostas reais das três APIs em `tests/fixtures/api_real/`; o teste que as consome passou. Testes do componente principal verificam que o pH regional aparece como estimativa, mas **não** é enviado como pH local; períodos IMERG incompletos permanecem fora da avaliação; pontos fora da área não permitem avaliação; falha da API não apresenta dados demonstrativos; e resultados antigos desaparecem quando o campo muda.

Por decisão do time em 15/11/2026, a validação visual em desktop/celular, autenticação, isolamento entre contas e testes de banco descartável ficaram fora deste aceite. O protótipo público integrado permanece ativo em `http://127.0.0.1:8000` enquanto os containers `web`, `frontend` e `gateway` estiverem em execução.

Os testes Python locais registraram 14 aprovados, 3 ignorados por dependerem de banco descartável e 1 bloqueado pela restrição de soquete local do ambiente de execução (`WinError 10013`). Portanto, a suíte backend completa ainda precisa rodar no ambiente integrado.

Para o aceite final, testar no navegador em largura desktop e celular: conversa → ponto dentro/fora do círculo → diagnóstico → campos de lavoura → candidatas → calendário → conta → talhão/ciclo/tarefa/avaliação salva. Repetir com API/banco indisponível, catálogo ausente, IMERG incompleto e sessão expirada. Verificar que `/api/*` é servido pelo Python e as demais rotas pelo React, sem chaves no bundle. O [roteiro de 90 segundos](demo_integrada.md) organiza a demonstração.

`verify_cereja_gateway.mjs` é uma checagem HTTP e captura de contratos; não substitui o smoke no navegador da interface React. O antigo `scripts/smoke_cereja_browser.mjs` abaixo exercita a interface Python histórica.

## Histórico da interface Python

## Banco e catálogo

- Aplicar as migrações num PostgreSQL/PostGIS descartável com os papéis do Supabase e seu schema `auth` (ou no Supabase local). O ETL existente continua responsável pela malha e pelas séries.
- Rodar a importação sem `--apply`, conferir o diff, aplicar e rodar de novo. A segunda execução deve devolver listas de alterações vazias. O calendário deve funcionar antes da importação; o motor precisa do catálogo.
- `tests/fixtures/cereja.sql` cria observações **sintéticas somente para teste**. Não executar no Supabase que contém o histórico real.
- `pytest -q` roda os testes do ETL e do site. Para verificar o banco use `CEREJA_TEST_DATABASE_URL` apontando para o banco descartável inicializado e carregado. Para testar cadastro, login, renovação e logout, informe também `CEREJA_TEST_GOTRUE_URL`, a URL de um Supabase Auth de teste usando o mesmo banco e confirmação local automática. Os testes privados criam e apagam apenas contas geradas para aquele teste.

## Navegador

Com o site rodando, execute `node scripts/smoke_cereja_browser.mjs http://127.0.0.1:8000`. Se necessário, defina `CHROME_BINARY` com o caminho para o Chrome. O script valida a grade de 12 meses no desktop e celular, o foco e a abertura de detalhes pelo teclado, a coluna fixa, a seleção de ponto no mapa, o diagnóstico, as dez candidatas e a ausência de diagnóstico fora da região. Um segundo argumento com prefixo de arquivo salva capturas.

## Latência

Com o catálogo e as séries carregados no ambiente de verificação, execute:

```bash
docker compose run --rm --entrypoint python etl scripts/benchmark_cereja.py --requests 50 --workers 5
```

O ensaio HTTP usa a mesma máquina e as mesmas cinco coordenadas para as versões antiga e nova. Compara campo a campo o diagnóstico antigo com o novo e mede p50/p95: consulta antiga, nova sem cache, nova com cache e avaliação de cobertura sem cache. Metas de p95: 1.000 ms, 300 ms e 1.500 ms para os três últimos cenários. O cache de consulta armazena dados por célula, portanto ainda há uma ida ao banco para resolver a localização.

Cada requisição no serviço registra duração, método e status; o repositório registra separadamente o tempo de aquisição de uma conexão e o tempo de consulta. Nenhum desses registros contém coordenadas, campos do produtor ou tokens de autenticação.

No Supabase do projeto, uma medição SQL somente leitura reduziu a consulta dos últimos valores, para uma célula, de **882 ms** para **2,7 ms** com os índices existentes. Esse número é do PostgreSQL. O ensaio HTTP local usa dados sintéticos de volume semelhante; não mede a latência de rede do Supabase hospedado.

Resultado da rodada final, com PostgreSQL/PostGIS e Supabase Auth descartáveis, cerca de 275 mil linhas POWER e 175 mil IMERG, 50 requisições em cada cenário e concorrência de 5:

| Cenário | p50 | p95 |
| --- | ---: | ---: |
| Consulta anterior | 346,9 ms | 380,9 ms |
| Consulta nova sem cache | 14,6 ms | 19,3 ms |
| Consulta nova com cache | 13,5 ms | 18,6 ms |
| Recomendação sem cache | 26,0 ms | 41,0 ms |

Os valores coincidiram nas cinco células. As migrações passaram em banco novo, a segunda importação ficou sem diferenças e os 18 testes passaram, incluindo autenticação e isolamento entre duas contas. O roteiro do Chrome passou em desktop e celular.
