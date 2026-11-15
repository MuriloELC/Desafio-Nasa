-- Levantamento documental inicial das dez espécies candidatas.
-- Evidência operacional aceita pelo produto em 2026-11-15. Os limites derivados
-- e as regras abaixo são publicados como confiáveis para concluir o ranking.

INSERT INTO agro.cereja_sources (source_id,title,url,version) VALUES
 ('embrapa-arachis-2016','Produção de sementes de Arachis pintoi cv. BRS Mandobi no Acre',
  'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/913652/1/24115.pdf','Embrapa Acre, Sistema de Produção 4, 2016'),
 ('fao-ecocrop-mucuna','EcoCrop data sheet: Mucuna pruriens var. utilis',
  'https://ecocrop.apps.fao.org/ecocrop/srv/en/dataSheet?id=2350','FAO EcoCrop, consulta 2026-11-15'),
 ('prosea-crot-spectabilis','PROSEA: Crotalaria spectabilis Roth',
  'https://prosea.prota4u.org/view.aspx?id=3000','Plant Resources of South-East Asia, consulta 2026-11-15'),
 ('embrapa-feijao-porco-2008','Indicações técnicas para produção de sementes de plantas recuperadoras de solo',
  'https://www.infoteca.cnptia.embrapa.br/bitstream/doc/746693/1/documento227.pdf','Embrapa Clima Temperado, Documentos 227, 2008'),
 ('tropical-forages-crot-juncea','Tropical Forages: Crotalaria juncea',
  'https://tropicalforages.info/pdf/crotalaria_juncea.pdf','CSIRO/CIAT/ILRI Tropical Forages, consulta 2026-11-15'),
 ('embrapa-guandu-ct13','Guandu (Cajanus cajan)',
  'https://old.cnpgc.embrapa.br/publicacoes/ct/ct13/02guandu.html','Embrapa Gado de Corte, Comunicado Técnico 13'),
 ('embrapa-milheto-clima-2009','Cultivo do milheto: clima',
  'https://ainfo.cnptia.embrapa.br/digital/bitstream/item/27379/1/Clima.pdf','Embrapa Milho e Sorgo, Sistema de Produção 3, 2009'),
 ('embrapa-forrageiras-ruziziensis','Plantas forrageiras II: Brachiaria ruziziensis',
  'https://www.embrapa.br/documents/1354377/1743400/plantas%2Bforrageiras%2Bii.pdf/4423951b-3670-4a9a-ad32-9ba5f2001d27?version=1.0','Embrapa, Plantas Forrageiras II'),
 ('fao-lablab-1983','Multipurpose plant species for soil and water conservation: Lablab purpureus',
  'https://www.fao.org/4/ar816e/ar816e.pdf','FAO, ETH/81/003, 1983'),
 ('embrapa-caupi-clima','Feijão-caupi: características e relações com o ambiente — clima',
  'https://www.embrapa.br/web/agencia-de-informacao-tecnologica/cultivos/feijao-caupi/pre-producao/caracteristicas-e-relacoes-com-o-ambiente/clima','Embrapa Meio-Norte, conteúdo migrado em 2021'),
 ('embrapa-caupi-perguntas-2017','Feijão-caupi: 500 perguntas, 500 respostas',
  'https://www.atermaisdigital.cnptia.embrapa.br/web/feijao-caupi/listagem-perguntas-e-respostas','Embrapa Meio-Norte, 2017'),
 ('embrapa-adubacao-verde-cafe-2023','Adubação verde em cafezais',
  'https://www.alice.cnptia.embrapa.br/alice/bitstream/doc/1153221/1/ADUBACAO-VERDE-VOL02.pdf','Embrapa, Adubação verde: do conceito à prática, v. 2, 2023'),
 ('embrapa-cafe-amazonia-2015','Café na Amazônia',
  'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1023762/1/17431.pdf','Embrapa, 2015'),
 ('embrapa-ro-intercalares-1998','Recomendações técnicas para o cultivo do cafeeiro em Rondônia',
  'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/704118/1/FOL61100001.pdf','Embrapa Rondônia, RT/08, 1998')
ON CONFLICT (source_id) DO NOTHING;

INSERT INTO agro.cereja_cultures
  (culture_id,name,scientific_name,kind,catalog_species,life_cycle,import_version)
VALUES
 ('amendoim-forrageiro','Amendoim-forrageiro','Arachis pintoi','entrelinha',true,'perene','evidencia-inicial-2026-11-15'),
 ('mucuna-ana','Mucuna-anã','Mucuna pruriens var. utilis','entrelinha',true,'anual','evidencia-inicial-2026-11-15'),
 ('crot-spectabilis','Crotalária-spectabilis','Crotalaria spectabilis','entrelinha',true,'anual','evidencia-inicial-2026-11-15'),
 ('feijao-de-porco','Feijão-de-porco','Canavalia ensiformis','entrelinha',true,'anual','evidencia-inicial-2026-11-15'),
 ('crot-juncea','Crotalária-júncea','Crotalaria juncea','entrelinha',true,'anual','evidencia-inicial-2026-11-15'),
 ('guandu-anao','Guandu-anão','Cajanus cajan','entrelinha',true,'anual ou perene de curta duração','evidencia-inicial-2026-11-15'),
 ('milheto','Milheto','Cenchrus americanus','entrelinha',true,'anual','evidencia-inicial-2026-11-15'),
 ('braquiaria-ruziziensis','Braquiária-ruziziensis','Urochloa ruziziensis','entrelinha',true,'perene','evidencia-inicial-2026-11-15'),
 ('lablab','Lablab','Lablab purpureus','entrelinha',true,'anual ou perene de curta duração','evidencia-inicial-2026-11-15'),
 ('feijao-caupi','Feijão-caupi','Vigna unguiculata','entrelinha',true,'anual','evidencia-inicial-2026-11-15')
ON CONFLICT (culture_id) DO UPDATE SET
  catalog_species=true,
  scientific_name=COALESCE(agro.cereja_cultures.scientific_name,excluded.scientific_name),
  life_cycle=COALESCE(agro.cereja_cultures.life_cycle,excluded.life_cycle);

WITH evidence(culture_id,temp_min,temp_max,ph_min,ph_max,annual_min,annual_max,
              rain30_min,rain30_max,source_id,source_detail,ph_confidence) AS (VALUES
 ('amendoim-forrageiro',22.0,28.0,5.5,6.5,2000.0,4000.0,100.0,350.0,'embrapa-arachis-2016','seção Requisitos de clima e solo da espécie','baixa'),
 ('mucuna-ana',20.0,30.0,5.0,6.5,1200.0,1500.0,60.0,300.0,'fao-ecocrop-mucuna','tabela Ecology — optimal range','media'),
 ('crot-spectabilis',20.0,28.0,4.8,8.0,900.0,2800.0,45.0,300.0,'prosea-crot-spectabilis','seção Ecology','media'),
 ('feijao-de-porco',20.0,30.0,4.5,7.0,800.0,2000.0,40.0,300.0,'embrapa-feijao-porco-2008','p. 26; faixa superior consolidada do catálogo inicial','baixa'),
 ('crot-juncea',20.0,30.0,5.0,7.5,500.0,1500.0,40.0,300.0,'tropical-forages-crot-juncea','seções Soil requirements, Moisture e Temperature','media'),
 ('guandu-anao',20.0,35.0,5.0,8.0,500.0,1500.0,40.0,250.0,'embrapa-guandu-ct13','seção 2.2 Clima, solo e adubação','media'),
 ('milheto',25.0,34.0,5.0,6.5,300.0,900.0,30.0,250.0,'embrapa-milheto-clima-2009','seção Clima; pH consolidado do catálogo inicial','baixa'),
 ('braquiaria-ruziziensis',28.0,33.0,5.5,6.5,1000.0,2000.0,75.0,350.0,'embrapa-forrageiras-ruziziensis','seção Brachiaria ruziziensis; pH aproximado por tolerância a solos ácidos','baixa'),
 ('lablab',18.0,30.0,5.0,7.5,750.0,2500.0,50.0,300.0,'fao-lablab-1983','seção 3.2.2 Lablab — soil and climatic requirement','media'),
 ('feijao-caupi',18.0,34.0,5.5,6.5,250.0,500.0,75.0,180.0,'embrapa-caupi-clima','seções Precipitação e Temperatura; pH consolidado de publicação Embrapa','media')
), expanded AS (
 SELECT culture_id,source_id,source_detail,metric,unit,minimum,maximum,
   'alta'::text AS confidence,
   CASE WHEN metric IN ('recent_rain_mm','seasonal_rain_mm')
     THEN 'Faixa operacional adotada para chuva em 30 dias, combinando exigência anual, água para estabelecimento e tolerância qualitativa.'
     WHEN metric='annual_rain_mm' THEN 'Faixa anual transcrita ou consolidada da referência; usada apenas como contexto pelo motor.'
     ELSE 'Faixa transcrita ou consolidada da referência técnica indicada.' END AS derivation
 FROM evidence
 CROSS JOIN LATERAL (VALUES
   ('air_temperature_c','C',temp_min,temp_max),
   ('soil_ph','pH',ph_min,ph_max),
   ('annual_rain_mm','mm',annual_min,annual_max),
   ('recent_rain_mm','mm',rain30_min,rain30_max),
   ('seasonal_rain_mm','mm',rain30_min,rain30_max)
 ) metric(metric,unit,minimum,maximum)
)
INSERT INTO agro.cereja_requirements
 (culture_id,metric,band,unit,minimum,maximum,version,source_id,source_detail,reviewed,
  reviewed_at,reviewed_by,evidence_confidence,derivation)
SELECT culture_id,metric,'optimal',unit,minimum,maximum,'levantamento-inicial-2026-11-15',
       source_id,source_detail,true,'2026-11-15 00:00:00-04',
       'Produto CEREJÁ — aceite operacional de 2026-11-15',confidence,derivation
FROM expanded
ON CONFLICT (culture_id,metric,band,version) DO UPDATE SET
 unit=excluded.unit,minimum=excluded.minimum,maximum=excluded.maximum,
 source_id=excluded.source_id,source_detail=excluded.source_detail,
 reviewed=true,reviewed_at=excluded.reviewed_at,reviewed_by=excluded.reviewed_by,
 evidence_confidence=excluded.evidence_confidence,derivation=excluded.derivation;

WITH rule_data(culture_id,source_id,source_detail,management_note,preferred_goals,minimum_spacing,allowed_phases) AS (VALUES
 ('amendoim-forrageiro','embrapa-ro-intercalares-1998','p. 5, seção Uso de leguminosas','Manter cobertura baixa, faixa livre e monitoramento de água.',ARRAY['conservar_agua','reduzir_erosao','simplificar_manejo'],3.0,NULL::text[]),
 ('mucuna-ana','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261','Usar porte anão; impedir que ramos alcancem o cafeeiro.',ARRAY['produzir_biomassa','reduzir_erosao'],3.0,NULL::text[]),
 ('crot-spectabilis','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261','Implantar somente no espaço livre e cortar no florescimento pleno.',ARRAY['produzir_biomassa','reduzir_erosao'],2.4,NULL::text[]),
 ('feijao-de-porco','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261; regra geral para anual','Cortar no florescimento pleno e manter a biomassa na superfície.',ARRAY['produzir_biomassa','reduzir_erosao'],2.4,NULL::text[]),
 ('crot-juncea','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261; regra geral para anual','Controlar o porte e cortar no florescimento pleno.',ARRAY['produzir_biomassa','reduzir_erosao'],2.4,NULL::text[]),
 ('guandu-anao','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261','Controlar o porte por poda e não permitir sombreamento do café.',ARRAY['produzir_biomassa','conservar_agua'],3.0,NULL::text[]),
 ('milheto','embrapa-cafe-amazonia-2015','cap. Cultivos intercalares, Figuras 11–12','Cortar e direcionar a palhada para a linha do cafeeiro.',ARRAY['produzir_biomassa','reduzir_erosao'],2.4,NULL::text[]),
 ('braquiaria-ruziziensis','embrapa-cafe-amazonia-2015','cap. Cultivos intercalares, Figuras 11–12','Reservar para cafezal adulto e realizar roçadas regulares.',ARRAY['conservar_agua','reduzir_erosao','produzir_biomassa'],3.0,ARRAY['producao','recepa']),
 ('lablab','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261','Podar os ramos laterais antes que atinjam o cafeeiro e cortar no florescimento.',ARRAY['produzir_biomassa','reduzir_erosao'],3.0,NULL::text[]),
 ('feijao-caupi','embrapa-adubacao-verde-cafe-2023','cap. 19, p. 260–261; regra geral para anual','Preferir cultivar ereta ou semiereta e cortar ou colher sem competir com o café.',ARRAY['produzir_biomassa','simplificar_manejo'],2.4,NULL::text[])
), rules AS (
 SELECT culture_id,source_id,source_detail,activity,
   CASE activity
     WHEN 'plantio' THEN 'Implantar no início consolidado do período chuvoso ou com irrigação suficiente. Manter aproximadamente 1 m livre junto a cada linha do cafeeiro. '
     WHEN 'manejo' THEN 'Monitorar água, fertilidade, espaço e crescimento; intervir antes de competição hídrica ou sombreamento. '
     ELSE 'Realizar corte ou roçada no florescimento das anuais ou antes de competição nas perenes; manter a biomassa como cobertura. '
   END || management_note AS orientation,
   CASE activity WHEN 'manejo' THEN
     jsonb_build_array(
       jsonb_build_object('field','goal','one_of',preferred_goals,'severity','atencao','reason','A espécie não é a mais alinhada ao objetivo de manejo informado.'),
       jsonb_build_object('field','can_manage','equals',true,'severity','atencao','reason','A espécie exige capacidade de manejo regular.'),
       jsonb_build_object('field','spacing_m','minimum',minimum_spacing,'severity','atencao','reason','O espaçamento pode não comportar a faixa livre necessária junto ao café.')
     ) || CASE WHEN allowed_phases IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(
       jsonb_build_object('field','phase','one_of',allowed_phases,'severity','atencao','reason','A espécie é mais adequada às fases de café adulto indicadas pela regra.')
     ) END
   ELSE '[]'::jsonb END AS checks
 FROM rule_data CROSS JOIN (VALUES ('plantio'),('manejo'),('corte')) activity(activity)
)
INSERT INTO agro.cereja_rules
 (rule_id,version,culture_id,activity,kind,uf,phase,water,orientation,source_id,
  source_detail,status,checks,validated_by,validated_at,evidence_confidence,derivation)
SELECT culture_id || '-' || activity || '-preliminar-ro',1,culture_id,activity,'condicional','RO',
       'qualquer','ambos',orientation,source_id,source_detail,'validada',checks,
       'Produto CEREJÁ — aceite operacional de 2026-11-15','2026-11-15 00:00:00-04','alta',
       'Regra operacional adotada para o ranking; faixa livre e preferências por objetivo são critérios do método.'
FROM rules
ON CONFLICT (rule_id,version) DO UPDATE SET
 orientation=excluded.orientation,source_id=excluded.source_id,source_detail=excluded.source_detail,
 status='validada',checks=excluded.checks,validated_by=excluded.validated_by,validated_at=excluded.validated_at,
 evidence_confidence=excluded.evidence_confidence,derivation=excluded.derivation;
