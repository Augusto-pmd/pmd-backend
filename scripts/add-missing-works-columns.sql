-- Script SQL idempotente para agregar TODAS las columnas faltantes a tabla works
-- Ejecutar manualmente en la base de datos de producción (Render)
-- Protocolo: DB viva - cambios manuales, idempotentes y conscientes
-- 
-- Columnas que se agregan:
-- - work_type (ENUM, nullable)
-- - organization_id (UUID, nullable, FK)
-- - allow_post_closure_expenses (BOOLEAN, default false)
-- - post_closure_enabled_by_id (UUID, nullable, FK)
-- - post_closure_enabled_at (TIMESTAMP, nullable)

DO $$ 
BEGIN
    -- 1. Crear work_type_enum si no existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'work_type_enum') THEN
        CREATE TYPE work_type_enum AS ENUM ('house', 'local', 'expansion', 'renovation', 'other');
        RAISE NOTICE 'Tipo ENUM work_type_enum creado';
    END IF;

    -- 2. Agregar work_type si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'work_type'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN work_type work_type_enum NULL;
        RAISE NOTICE 'Columna work_type agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna work_type ya existe';
    END IF;

    -- 3. Agregar organization_id si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN organization_id uuid NULL;
        RAISE NOTICE 'Columna organization_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna organization_id ya existe';
    END IF;

    -- 4. Agregar allow_post_closure_expenses si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'allow_post_closure_expenses'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN allow_post_closure_expenses boolean NOT NULL DEFAULT false;
        RAISE NOTICE 'Columna allow_post_closure_expenses agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna allow_post_closure_expenses ya existe';
    END IF;

    -- 5. Agregar post_closure_enabled_by_id si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'post_closure_enabled_by_id'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN post_closure_enabled_by_id uuid NULL;
        RAISE NOTICE 'Columna post_closure_enabled_by_id agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna post_closure_enabled_by_id ya existe';
    END IF;

    -- 6. Agregar post_closure_enabled_at si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'post_closure_enabled_at'
    ) THEN
        ALTER TABLE works 
        ADD COLUMN post_closure_enabled_at TIMESTAMP NULL;
        RAISE NOTICE 'Columna post_closure_enabled_at agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna post_closure_enabled_at ya existe';
    END IF;

    -- 7. Agregar foreign key para organization_id si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND constraint_name = 'FK_works_organization'
    ) THEN
        ALTER TABLE works 
        ADD CONSTRAINT FK_works_organization 
        FOREIGN KEY (organization_id) 
        REFERENCES organizations(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key FK_works_organization agregada exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key FK_works_organization ya existe';
    END IF;

    -- 8. Agregar foreign key para post_closure_enabled_by_id si no existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND constraint_name = 'FK_works_post_closure_enabled_by'
    ) THEN
        ALTER TABLE works 
        ADD CONSTRAINT FK_works_post_closure_enabled_by 
        FOREIGN KEY (post_closure_enabled_by_id) 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        RAISE NOTICE 'Foreign key FK_works_post_closure_enabled_by agregada exitosamente';
    ELSE
        RAISE NOTICE 'Foreign key FK_works_post_closure_enabled_by ya existe';
    END IF;

    RAISE NOTICE 'Script completado: Todas las columnas faltantes han sido verificadas/agregadas';
END $$;
