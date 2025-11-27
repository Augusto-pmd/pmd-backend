-- ============================================
-- PMD SYSTEM - MIGRACIÓN OFICIAL DE ROLES
-- Roles finales: ADMIN, OPERATOR, AUDITOR
-- ============================================

BEGIN;

-- ============================================
-- 1. Normalizar nombres de roles existentes
-- ============================================
UPDATE roles 
SET name = 'admin'
WHERE name IN ('administration', 'direction');

UPDATE roles 
SET name = 'operator'
WHERE name IN ('supervisor', 'operator');

-- ============================================
-- 2. Crear rol AUDITOR si no existe
-- ============================================
INSERT INTO roles (name, description)
SELECT 'auditor', 'Auditor role with read-only access to all modules'
WHERE NOT EXISTS (
    SELECT 1 FROM roles WHERE name = 'auditor'
);

-- ============================================
-- 3. Obtener IDs actuales de roles PMD
-- ============================================
WITH role_ids AS (
    SELECT name, id FROM roles WHERE name IN ('admin','operator','auditor')
)

-- ============================================
-- 4. Reasignar usuarios que tengan roles viejos
-- ============================================

-- Usuarios con roles 'administration' o 'direction' → ADMIN
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE role_id IN (
    SELECT id FROM roles WHERE name IN ('administration','direction')
);

-- Usuarios con rol 'supervisor' → OPERATOR
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'operator')
WHERE role_id IN (
    SELECT id FROM roles WHERE name = 'supervisor')
;

-- ============================================
-- 5. Asegurar que todos los usuarios tengan un rol válido PMD
--    (admin por defecto si hubiera alguno sin rol)
-- ============================================
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'admin')
WHERE role_id NOT IN (
    SELECT id FROM roles WHERE name IN ('admin','operator','auditor')
);

-- ============================================
-- 6. LOG FINAL - Verificación
-- ============================================
SELECT 
    u.id AS user_id,
    u.email,
    r.name AS final_role
FROM users u
LEFT JOIN roles r ON r.id = u.role_id
ORDER BY u.id;

COMMIT;

