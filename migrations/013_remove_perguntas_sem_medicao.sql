-- Remove verificações binárias que não carregam uma medição agronômica.
UPDATE agro.cereja_rules AS rule
SET checks = COALESCE((
  SELECT jsonb_agg(item ORDER BY position)
  FROM jsonb_array_elements(rule.checks) WITH ORDINALITY AS entries(item,position)
  WHERE item->>'field' NOT IN ('soil_assessed','moisture_checked')
), '[]'::jsonb)
WHERE EXISTS (
  SELECT 1 FROM jsonb_array_elements(rule.checks) AS item
  WHERE item->>'field' IN ('soil_assessed','moisture_checked')
);
