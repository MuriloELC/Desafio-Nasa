# Refinamento necessário para o motor de recomendação

## Situação atual

O motor `cereja-regras-1` é deliberadamente conservador. Ele avalia as dez espécies do catálogo, mas só usa regras com estado `validada` e faixas com `reviewed = true`. As faixas importadas do CSV continuam como rascunho e as regras validadas de entrelinha ainda não cobrem as dez espécies. Por isso, candidatas com a mesma ausência de evidência recebem `sem_dados` e são ordenadas alfabeticamente.

Um desempate numérico sem essas evidências criaria precisão falsa. Para produzir uma ordem agronômica defensável, é necessário:

1. **Revisar requisitos por espécie:** temperatura, pH local, chuva recente e sazonal, fase do café, regime hídrico e espaçamento, sempre com fonte, página, versão e responsável pela revisão.
2. **Publicar regras específicas:** implantação, manutenção, roçada/corte, competição hídrica, faixa livre junto ao cafeeiro e restrições por nematoide.
3. **Transformar respostas do produtor em critérios:** objetivo do manejo, cobertura atual, capacidade de intervenção e análise local precisam afetar cada espécie de maneira explícita.
4. **Definir o desempate:** primeiro restrições impeditivas; depois adequação às faixas revisadas; depois cobertura dos dados; por fim critérios secundários documentados. Ordem alfabética deve ser usada apenas para empate real.
5. **Validar com especialistas e casos de campo:** montar casos esperados para formação, produção e recepa, em sequeiro e irrigado, e registrar a decisão esperada de um agrônomo.
6. **Versionar e explicar:** cada resultado precisa indicar regra, fonte, dado usado, dado ausente e versão do método.

## Critério mínimo para deixar de empatar

Uma espécie só pode receber posição distinta quando tiver, no mínimo, uma regra validada aplicável ao contexto e todas as faixas obrigatórias revisadas. Caso contrário, deve continuar como `sem_dados`. O produto pode destacar as três primeiras apenas quando houver diferença de evidência; não deve chamar um empate alfabético de recomendação.

## Próxima implementação sugerida

- criar uma matriz de validação das dez espécies e reduzir o primeiro ciclo às três com melhor evidência publicada;
- registrar as faixas revisadas em `agro.cereja_requirements`;
- registrar regras específicas em `agro.cereja_rules`;
- adicionar ao retorno `score_components`, `rank`, `confidence` e `tie`;
- criar testes de regressão com cenários revisados por especialista antes de habilitar o ranking no frontend.
