-- Torna auditável quem revisou cada faixa e quem validou cada regra.
-- As restrições são NOT VALID para não atribuir retrospectivamente um responsável
-- desconhecido às evidências existentes; elas já valem para novas gravações.
ALTER TABLE agro.cereja_requirements
  ADD COLUMN reviewed_by text,
  ADD COLUMN evidence_confidence text NOT NULL DEFAULT 'baixa'
    CHECK (evidence_confidence IN ('baixa', 'media', 'alta')),
  ADD COLUMN derivation text,
  ADD CONSTRAINT cereja_requirements_review_audit
    CHECK (NOT reviewed OR (reviewed_by IS NOT NULL AND btrim(reviewed_by) <> '')) NOT VALID;

ALTER TABLE agro.cereja_rules
  ADD COLUMN validated_by text,
  ADD COLUMN validated_at timestamptz,
  ADD COLUMN evidence_confidence text NOT NULL DEFAULT 'baixa'
    CHECK (evidence_confidence IN ('baixa', 'media', 'alta')),
  ADD COLUMN derivation text,
  ADD CONSTRAINT cereja_rules_validation_audit
    CHECK (status <> 'validada' OR (
      validated_by IS NOT NULL AND btrim(validated_by) <> '' AND validated_at IS NOT NULL
    )) NOT VALID;
