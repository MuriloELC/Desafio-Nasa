-- TerraShift | Calendario agronomico | PostgreSQL / Supabase
-- Arquivo de referência histórica; não executar no CEREJÁ.
-- O SQL operacional está nas migrações 006 a 008, no diretório migrations.
-- Regras de calendario = referencia tecnica. Tarefas = fatos da lavoura.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.cal_fontes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  url text NOT NULL UNIQUE,
  entidade text NOT NULL,
  ano_publicacao smallint,
  observacao text,
  criado_em timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cal_culturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  nome text NOT NULL,
  nome_cientifico text,
  tipo text NOT NULL CHECK (tipo IN ('principal', 'intercalar')),
  ciclo text NOT NULL CHECK (ciclo IN ('anual', 'perene')),
  ativo boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.cal_atividades (
  codigo text PRIMARY KEY,
  nome text NOT NULL,
  categoria text NOT NULL CHECK (categoria IN
    ('plantio', 'colheita', 'corte', 'manejo', 'analise', 'monitoramento')),
  cor_hex text CHECK (cor_hex ~ '^#[0-9a-fA-F]{6}$')
);

-- Janelas/criterios tecnicos aplicaveis a regioes e fases distintas.
-- 'sazonal': comeca/termina em meses do ano (ex.: OUT-MAR).
-- 'apos_plantio': dias relativos a data de semeadura, sem inventar mes fixo.
-- 'condicional': depende de fenomenologia, clima ou vistoria em campo.
CREATE TABLE IF NOT EXISTS public.cal_regras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cultura_id uuid NOT NULL REFERENCES public.cal_culturas(id),
  atividade_codigo text NOT NULL REFERENCES public.cal_atividades(codigo),
  uf char(2) NOT NULL DEFAULT 'RO',
  municipio_ibge char(7),
  fase_cafe text NOT NULL DEFAULT 'qualquer'
    CHECK (fase_cafe IN ('qualquer', 'implantacao', 'formacao', 'producao', 'recepa')),
  sistema_agua text NOT NULL DEFAULT 'ambos'
    CHECK (sistema_agua IN ('ambos', 'sequeiro', 'irrigado')),
  tipo text NOT NULL CHECK (tipo IN ('sazonal', 'apos_plantio', 'condicional')),
  inicio_mes smallint CHECK (inicio_mes BETWEEN 1 AND 12),
  fim_mes smallint CHECK (fim_mes BETWEEN 1 AND 12),
  dias_apos_plantio_min integer CHECK (dias_apos_plantio_min >= 0),
  dias_apos_plantio_max integer CHECK (dias_apos_plantio_max >= 0),
  fenologia_codigo text,
  condicoes jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(condicoes) = 'object'),
  classificacao text NOT NULL DEFAULT 'recomendada'
    CHECK (classificacao IN ('recomendada', 'possivel', 'monitorar')),
  orientacao text NOT NULL,
  fonte_id uuid NOT NULL REFERENCES public.cal_fontes(id),
  pagina_fonte text,
  status_revisao text NOT NULL DEFAULT 'rascunho'
    CHECK (status_revisao IN ('rascunho', 'validada', 'arquivada')),
  versao integer NOT NULL DEFAULT 1 CHECK (versao > 0),
  criado_em timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (tipo = 'sazonal' AND inicio_mes IS NOT NULL AND fim_mes IS NOT NULL
       AND dias_apos_plantio_min IS NULL AND dias_apos_plantio_max IS NULL)
    OR
    (tipo = 'apos_plantio' AND inicio_mes IS NULL AND fim_mes IS NULL
       AND dias_apos_plantio_min IS NOT NULL AND dias_apos_plantio_max IS NOT NULL
       AND dias_apos_plantio_max >= dias_apos_plantio_min)
    OR
    (tipo = 'condicional' AND inicio_mes IS NULL AND fim_mes IS NULL
       AND dias_apos_plantio_min IS NULL AND dias_apos_plantio_max IS NULL)
  )
);

-- Limites climaticos tipados: ligar metrica_codigo ao dicionario de dados NASA.
-- Permanecem vazios ate existir limiar agronomico documentado para cada especie.
CREATE TABLE IF NOT EXISTS public.cal_limites_climaticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regra_id uuid NOT NULL REFERENCES public.cal_regras(id) ON DELETE CASCADE,
  metrica_codigo text NOT NULL,
  agregacao_dias integer CHECK (agregacao_dias > 0),
  minimo numeric,
  maximo numeric,
  unidade text NOT NULL,
  justificativa text,
  fonte_id uuid NOT NULL REFERENCES public.cal_fontes(id),
  status_revisao text NOT NULL DEFAULT 'rascunho'
    CHECK (status_revisao IN ('rascunho','validada','arquivada')),
  CHECK (minimo IS NOT NULL OR maximo IS NOT NULL),
  CHECK (minimo IS NULL OR maximo IS NULL OR minimo <= maximo)
);

-- Talhao de exemplo para tornar esta migration executavel isoladamente.
-- O Codex deve reaproveitar o cadastro geografico de talhoes do projeto,
-- substituindo esta tabela/relacoes caso ja exista.
CREATE TABLE IF NOT EXISTS public.cal_talhoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  municipio_ibge char(7),
  uf char(2) NOT NULL DEFAULT 'RO',
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id)
);

-- Um talhao pode ter cafe perene e varios ciclos intercalares.
CREATE TABLE IF NOT EXISTS public.cal_ciclos_cultivo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talhao_id uuid NOT NULL,
  cultura_id uuid NOT NULL REFERENCES public.cal_culturas(id),
  ciclo_cafe_pai_id uuid,
  plantado_em date,
  encerrado_em date,
  estado text NOT NULL DEFAULT 'planejado'
    CHECK (estado IN ('planejado', 'ativo', 'encerrado', 'cancelado')),
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, user_id, talhao_id),
  FOREIGN KEY (talhao_id, user_id)
    REFERENCES public.cal_talhoes(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (ciclo_cafe_pai_id, user_id, talhao_id)
    REFERENCES public.cal_ciclos_cultivo(id, user_id, talhao_id),
  CHECK (encerrado_em IS NULL OR plantado_em IS NULL OR encerrado_em >= plantado_em)
);

-- Ocorrencias concretas: tanto operacoes previstas quanto executadas.
CREATE TABLE IF NOT EXISTS public.cal_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talhao_id uuid NOT NULL,
  ciclo_id uuid,
  regra_id uuid REFERENCES public.cal_regras(id),
  atividade_codigo text NOT NULL REFERENCES public.cal_atividades(codigo),
  titulo text NOT NULL,
  previsto_inicio date,
  previsto_fim date,
  realizado_em date,
  estado text NOT NULL DEFAULT 'planejada'
    CHECK (estado IN ('planejada', 'em_andamento', 'concluida', 'cancelada')),
  origem text NOT NULL DEFAULT 'produtor'
    CHECK (origem IN ('produtor', 'motor_recomendacao')),
  observacoes text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (talhao_id, user_id)
    REFERENCES public.cal_talhoes(id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (ciclo_id, user_id, talhao_id)
    REFERENCES public.cal_ciclos_cultivo(id, user_id, talhao_id),
  CHECK (previsto_fim IS NULL OR previsto_inicio IS NULL OR previsto_fim >= previsto_inicio),
  CHECK (estado <> 'concluida' OR realizado_em IS NOT NULL)
);

-- Avaliacoes historicas do motor climaticos, para explicabilidade.
CREATE TABLE IF NOT EXISTS public.cal_avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  talhao_id uuid NOT NULL,
  regra_id uuid NOT NULL REFERENCES public.cal_regras(id),
  avaliado_em timestamptz NOT NULL DEFAULT now(),
  dados_referencia_em date,
  grade_celula_id text,
  indicadores jsonb NOT NULL DEFAULT '{}'::jsonb,
  resultado text NOT NULL CHECK (resultado IN
    ('favoravel', 'atencao', 'desfavoravel', 'sem_dados')),
  justificativa text NOT NULL,
  algoritmo_versao text NOT NULL,
  FOREIGN KEY (talhao_id, user_id)
    REFERENCES public.cal_talhoes(id, user_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cal_limites_regra_idx ON public.cal_limites_climaticos(regra_id);
CREATE INDEX IF NOT EXISTS cal_regras_consulta_idx
  ON public.cal_regras(cultura_id, uf, fase_cafe, tipo, status_revisao);
CREATE INDEX IF NOT EXISTS cal_regras_municipio_idx
  ON public.cal_regras(municipio_ibge) WHERE municipio_ibge IS NOT NULL;
CREATE INDEX IF NOT EXISTS cal_talhoes_usuario_idx
  ON public.cal_talhoes(user_id);
CREATE INDEX IF NOT EXISTS cal_ciclos_talhao_idx
  ON public.cal_ciclos_cultivo(user_id, talhao_id, estado);
CREATE INDEX IF NOT EXISTS cal_tarefas_periodo_idx
  ON public.cal_tarefas(user_id, talhao_id, previsto_inicio);
CREATE INDEX IF NOT EXISTS cal_avaliacoes_talhao_idx
  ON public.cal_avaliacoes(user_id, talhao_id, avaliado_em DESC);

-- RLS + grants: catalogo de leitura aos autenticados;
-- cadastros/operacoes pertencem exclusivamente ao produtor.
ALTER TABLE public.cal_fontes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_culturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_regras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_limites_climaticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_talhoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_ciclos_cultivo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cal_avaliacoes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cal_fontes, public.cal_culturas, public.cal_atividades,
  public.cal_regras, public.cal_limites_climaticos, public.cal_talhoes, public.cal_ciclos_cultivo,
  public.cal_tarefas, public.cal_avaliacoes FROM anon, authenticated;
GRANT SELECT ON public.cal_fontes, public.cal_culturas, public.cal_atividades,
  public.cal_regras, public.cal_limites_climaticos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cal_talhoes,
  public.cal_ciclos_cultivo, public.cal_tarefas, public.cal_avaliacoes TO authenticated;

DROP POLICY IF EXISTS cal_fontes_read ON public.cal_fontes;
CREATE POLICY cal_fontes_read ON public.cal_fontes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cal_culturas_read ON public.cal_culturas;
CREATE POLICY cal_culturas_read ON public.cal_culturas FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cal_atividades_read ON public.cal_atividades;
CREATE POLICY cal_atividades_read ON public.cal_atividades FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS cal_regras_read ON public.cal_regras;
CREATE POLICY cal_regras_read ON public.cal_regras FOR SELECT TO authenticated
  USING (status_revisao = 'validada');
DROP POLICY IF EXISTS cal_limites_read ON public.cal_limites_climaticos;
CREATE POLICY cal_limites_read ON public.cal_limites_climaticos FOR SELECT TO authenticated
  USING (status_revisao = 'validada');

DROP POLICY IF EXISTS cal_talhoes_select ON public.cal_talhoes;
DROP POLICY IF EXISTS cal_talhoes_insert ON public.cal_talhoes;
DROP POLICY IF EXISTS cal_talhoes_update ON public.cal_talhoes;
DROP POLICY IF EXISTS cal_talhoes_delete ON public.cal_talhoes;
CREATE POLICY cal_talhoes_select ON public.cal_talhoes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_talhoes_insert ON public.cal_talhoes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_talhoes_update ON public.cal_talhoes FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_talhoes_delete ON public.cal_talhoes FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cal_ciclos_select ON public.cal_ciclos_cultivo;
DROP POLICY IF EXISTS cal_ciclos_insert ON public.cal_ciclos_cultivo;
DROP POLICY IF EXISTS cal_ciclos_update ON public.cal_ciclos_cultivo;
DROP POLICY IF EXISTS cal_ciclos_delete ON public.cal_ciclos_cultivo;
CREATE POLICY cal_ciclos_select ON public.cal_ciclos_cultivo FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_ciclos_insert ON public.cal_ciclos_cultivo FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_ciclos_update ON public.cal_ciclos_cultivo FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_ciclos_delete ON public.cal_ciclos_cultivo FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cal_tarefas_select ON public.cal_tarefas;
DROP POLICY IF EXISTS cal_tarefas_insert ON public.cal_tarefas;
DROP POLICY IF EXISTS cal_tarefas_update ON public.cal_tarefas;
DROP POLICY IF EXISTS cal_tarefas_delete ON public.cal_tarefas;
CREATE POLICY cal_tarefas_select ON public.cal_tarefas FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_tarefas_insert ON public.cal_tarefas FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_tarefas_update ON public.cal_tarefas FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_tarefas_delete ON public.cal_tarefas FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS cal_avaliacoes_select ON public.cal_avaliacoes;
DROP POLICY IF EXISTS cal_avaliacoes_insert ON public.cal_avaliacoes;
DROP POLICY IF EXISTS cal_avaliacoes_update ON public.cal_avaliacoes;
DROP POLICY IF EXISTS cal_avaliacoes_delete ON public.cal_avaliacoes;
CREATE POLICY cal_avaliacoes_select ON public.cal_avaliacoes FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_avaliacoes_insert ON public.cal_avaliacoes FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_avaliacoes_update ON public.cal_avaliacoes FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY cal_avaliacoes_delete ON public.cal_avaliacoes FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Seeds: o catalogo e as janelas do cafe abaixo usam dados tecnicos da Embrapa.
INSERT INTO public.cal_fontes(titulo, url, entidade, ano_publicacao)
VALUES
('Gerenciamento anual da produção de Coffea canephora em Rondônia',
 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf',
 'Embrapa Rondônia', 2012),
('Café na Amazônia',
 'https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1023755/1/LivroCafenaAmazoniaDigital2015.pdf',
 'Embrapa Rondônia', 2015)
ON CONFLICT (url) DO NOTHING;

INSERT INTO public.cal_culturas(slug,nome,nome_cientifico,tipo,ciclo)
VALUES
('cafe-conilon','Café Conilon','Coffea canephora','principal','perene'),
('cafe-robusta','Café Robusta','Coffea canephora','principal','perene'),
('milheto','Milheto','Cenchrus americanus','intercalar','anual'),
('feijao-comum','Feijão-comum','Phaseolus vulgaris','intercalar','anual'),
('braquiaria','Braquiária','Urochloa spp.','intercalar','perene')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.cal_atividades(codigo,nome,categoria,cor_hex)
VALUES
('plantio','Plantio / Semeadura','plantio','#65A30D'),
('colheita','Colheita','colheita','#C65A22'),
('corte','Corte da cobertura','corte','#64748B'),
('rocada','Roçada','corte','#64748B'),
('analise_solo','Análise de solo','analise','#A855F7'),
('adubacao','Adubação','manejo','#2563EB'),
('poda','Poda','manejo','#2563EB'),
('monitoramento','Monitoramento','monitoramento','#D97706')
ON CONFLICT (codigo) DO NOTHING;

-- Plantio de cafe de sequeiro: outubro-dezembro na fase de implantacao.
INSERT INTO public.cal_regras
 (cultura_id,atividade_codigo,uf,fase_cafe,sistema_agua,tipo,inicio_mes,fim_mes,
  classificacao,orientacao,fonte_id,pagina_fonte,status_revisao)
SELECT c.id,'plantio','RO','implantacao','sequeiro','sazonal',10,12,
  'recomendada',
  'Janela de referencia para implantacao de cafe canefora em sequeiro; confirmar chuva regularizada, solo e condicoes locais.',
  f.id,'p. 1-2','validada'
FROM public.cal_culturas c CROSS JOIN public.cal_fontes f
WHERE c.slug IN ('cafe-conilon','cafe-robusta')
  AND f.url = 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf'
  AND NOT EXISTS (SELECT 1 FROM public.cal_regras r
    WHERE r.cultura_id=c.id AND r.atividade_codigo='plantio'
      AND r.uf='RO' AND r.fase_cafe='implantacao' AND r.sistema_agua='sequeiro'
      AND r.inicio_mes=10 AND r.fim_mes=12);

-- Colheita Conilon, simplificacao dos materiais de diferentes precocidades.
INSERT INTO public.cal_regras
 (cultura_id,atividade_codigo,uf,fase_cafe,tipo,inicio_mes,fim_mes,
  classificacao,orientacao,fonte_id,pagina_fonte,status_revisao)
SELECT c.id,'colheita','RO','producao','sazonal',4,6,
  'recomendada',
  'Colher preferencialmente com 80%-90% dos frutos maduros; datas variam entre clones precoces, medios e tardios.',
  f.id,'p. 3','validada'
FROM public.cal_culturas c CROSS JOIN public.cal_fontes f
WHERE c.slug='cafe-conilon'
  AND f.url='https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf'
  AND NOT EXISTS (SELECT 1 FROM public.cal_regras r WHERE r.cultura_id=c.id
    AND r.atividade_codigo='colheita' AND r.uf='RO' AND r.fase_cafe='producao'
    AND r.inicio_mes=4 AND r.fim_mes=6);

-- Colheita Robusta junho-julho (regra geral, dependente da maturacao).
INSERT INTO public.cal_regras
 (cultura_id,atividade_codigo,uf,fase_cafe,tipo,inicio_mes,fim_mes,
  classificacao,orientacao,fonte_id,pagina_fonte,status_revisao)
SELECT c.id,'colheita','RO','producao','sazonal',6,7,
  'recomendada',
  'Referencia geral para o grupo Robusta em Rondonia; confirmar maturacao antes de programar a colheita.',
  f.id,'p. 3','validada'
FROM public.cal_culturas c CROSS JOIN public.cal_fontes f
WHERE c.slug='cafe-robusta'
  AND f.url='https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/999518/1/ct125cafeicultura.pdf'
  AND NOT EXISTS (SELECT 1 FROM public.cal_regras r WHERE r.cultura_id=c.id
    AND r.atividade_codigo='colheita' AND r.uf='RO' AND r.fase_cafe='producao'
    AND r.inicio_mes=6 AND r.fim_mes=7);

-- Culturas intercalares: regras condicionais, SEM inventar meses ou dias.
INSERT INTO public.cal_regras
 (cultura_id,atividade_codigo,uf,fase_cafe,tipo,fenologia_codigo,condicoes,
  classificacao,orientacao,fonte_id,pagina_fonte,status_revisao)
SELECT c.id,'plantio','RO','formacao','condicional','inicio_periodo_chuvoso',
  CASE WHEN c.slug = 'feijao-comum'
    THEN '{"verificar_historico_nematoides":true,"verificar_espacamento":true}'::jsonb
    ELSE '{"verificar_espacamento":true}'::jsonb END,
  'monitorar',
  CASE WHEN c.slug = 'feijao-comum'
    THEN 'Semear no periodo chuvoso somente quando o espacamento e a fase do cafe permitem; nao recomendar em area com historico de nematoides.'
    ELSE 'Cultivar no periodo chuvoso, respeitando o espacamento, idade do cafezal e potencial de competicao por agua e nutrientes.' END,
  f.id,'p. 169-170','validada'
FROM public.cal_culturas c CROSS JOIN public.cal_fontes f
WHERE c.slug IN ('milheto','feijao-comum')
  AND f.url='https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1023755/1/LivroCafenaAmazoniaDigital2015.pdf'
  AND NOT EXISTS (SELECT 1 FROM public.cal_regras r
    WHERE r.cultura_id=c.id AND r.atividade_codigo='plantio'
      AND r.uf='RO' AND r.fase_cafe='formacao' AND r.tipo='condicional'
      AND r.fenologia_codigo='inicio_periodo_chuvoso');

INSERT INTO public.cal_regras
 (cultura_id,atividade_codigo,uf,fase_cafe,tipo,fenologia_codigo,
  classificacao,orientacao,fonte_id,pagina_fonte,status_revisao)
SELECT c.id,'rocada','RO','producao','condicional','necessidade_manejo_entrelinha',
  'monitorar',
  'Manejar a cobertura conforme porte, competicao com cafe e cobertura de solo. Manter palhada; evitar deixar solo exposto.',
  f.id,'p. 171-173','validada'
FROM public.cal_culturas c CROSS JOIN public.cal_fontes f
WHERE c.slug='braquiaria'
  AND f.url='https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1023755/1/LivroCafenaAmazoniaDigital2015.pdf'
  AND NOT EXISTS (SELECT 1 FROM public.cal_regras r
    WHERE r.cultura_id=c.id AND r.atividade_codigo='rocada' AND r.uf='RO'
      AND r.fase_cafe='producao' AND r.tipo='condicional'
      AND r.fenologia_codigo='necessidade_manejo_entrelinha');

-- Vista opcional: marca os 12 meses de janelas anuais, inclusive OUT-MAR.
CREATE OR REPLACE VIEW public.cal_grade_anual
WITH (security_invoker = true) AS
SELECT
  r.id AS regra_id, c.id AS cultura_id, c.nome AS cultura,
  a.codigo AS atividade_codigo, a.nome AS atividade, a.categoria, a.cor_hex,
  r.uf, r.municipio_ibge, r.fase_cafe, r.sistema_agua,
  r.inicio_mes, r.fim_mes, m.mes,
  CASE WHEN r.inicio_mes <= r.fim_mes
    THEN m.mes BETWEEN r.inicio_mes AND r.fim_mes
    ELSE m.mes >= r.inicio_mes OR m.mes <= r.fim_mes
  END AS ativo,
  r.classificacao, r.orientacao, r.fonte_id
FROM public.cal_regras r
JOIN public.cal_culturas c ON c.id=r.cultura_id
JOIN public.cal_atividades a ON a.codigo=r.atividade_codigo
CROSS JOIN generate_series(1,12) AS m(mes)
WHERE r.tipo='sazonal' AND r.status_revisao='validada';
GRANT SELECT ON public.cal_grade_anual TO authenticated;

COMMIT;
