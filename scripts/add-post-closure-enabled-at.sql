-- Script SQL idempotente para agregar columna post_closure_enabled_at a tabla works
-- Ejecutar manualmente en la base de datos de producción (Render)
-- Protocolo: DB viva - cambios manuales, idempotentes y conscientes

DO $$ 
BEGIN
    -- Verificar si la columna ya existe antes de agregarla
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'works' 
          AND column_name = 'post_closure_enabled_at'
    ) THEN
        -- Agregar la columna solo si no existe
        ALTER TABLE works 
        ADD COLUMN post_closure_enabled_at TIMESTAMP NULL;
        
        RAISE NOTICE 'Columna post_closure_enabled_at agregada exitosamente a la tabla works';
    ELSE
        RAISE NOTICE 'Columna post_closure_enabled_at ya existe en la tabla works. No se realizaron cambios.';
    END IF;
END $$;
