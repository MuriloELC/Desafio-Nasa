# Cerejá

Ferramenta de apoio à decisão para produtores de café Canéfora de Rondônia. O Cerejá cruza contexto declarado do cafezal com sinais ambientais regionais para comparar estratégias de cobertura da entrelinha, mostrando benefícios, riscos, trade-offs e evidências.

## Desenvolvimento

```sh
npm install
npm run dev
```

Rotas principais:

- `/` — pitch e problema;
- `/chat` — delimitação e contexto do talhão;
- `/analisando` — transição explicativa;
- `/minha-terra` — comparador principal e plano de campo;
- `/calendario` — endereço legado mantido por compatibilidade;
- `/aprender` — conceitos em linguagem simples.

## Dados e limites

O MVP não possui backend nem consulta ao vivo. Cenários e sinais NASA são fixtures explicitamente simuladas. O mapa é ilustrativo e não gera geometria geográfica. Nenhuma saída substitui análise de solo ou assistência técnica.

Leia primeiro:

- [`docs/PRODUCT_REDEFINITION.md`](docs/PRODUCT_REDEFINITION.md)
- [`docs/AUDIT_CURRENT_PRODUCT.md`](docs/AUDIT_CURRENT_PRODUCT.md)
- [`docs/DADOS_NECESSARIOS_PRODUCAO.md`](docs/DADOS_NECESSARIOS_PRODUCAO.md)
- [`docs/FRONTEND_DEMO.md`](docs/FRONTEND_DEMO.md)

## Verificações

```sh
npm test
npm run lint
npm run build
```

O projeto permanece conectado ao Lovable. Preserve o histórico publicado e as regras de `AGENTS.md`.
