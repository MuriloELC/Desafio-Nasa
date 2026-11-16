# Frontend CEREJÁ

Interface React/TanStack do piloto `CACOAL_R20`. O fluxo público consome `/api/consulta` e `/api/recomendacoes`. O backend Python/Supabase é a fonte dos valores ambientais e das avaliações; a imagem de satélite usa o serviço World Imagery da Esri com atribuição no mapa.

## Execução

Use `docker compose up --build web frontend gateway` na raiz do repositório e abra `http://localhost:8000`. O gateway mantém frontend e API na mesma origem. Para verificar o frontend isoladamente:

```sh
npm ci
npm test
npx tsc --noEmit
npm run lint -- --quiet
npm run build
```

Rotas: `/` (apresentação), `/chat` (contexto e coordenadas), `/minha-terra` (mapa, indicadores, informações editáveis, estratégia e candidatas) e `/aprender` (guia visual e fontes).

O marcador da conversa é uma grade de coordenadas aproximada, não um mapa cadastral. O backend confirma se o ponto pertence ao círculo piloto. SoilGrids é estimativa regional; pH local somente entra na avaliação se o produtor informar uma análise do talhão. Períodos climáticos incompletos aparecem com `days_available` e `days_expected` e não entram como totais completos.

Veja [o plano de integração](../docs/PLAN.md), [a proveniência SoilGrids](../docs/soilgrids_cacoal.md) e [o roteiro da demo](../docs/demo_integrada.md).
