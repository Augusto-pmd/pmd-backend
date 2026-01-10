const fs = require('fs');
const path = require('path');

// Map TypeORM types to PostgreSQL types
function mapTypeORMToPostgres(type, options = {}) {
  if (type === 'uuid') return 'uuid';
  if (type === 'varchar') {
    const length = options.length || 255;
    return `varchar(${length})`;
  }
  if (type === 'text') return 'text';
  if (type === 'boolean') return 'boolean';
  if (type === 'integer') return 'integer';
  if (type === 'bigint') return 'bigint';
  if (type === 'decimal') {
    const precision = options.precision || 10;
    const scale = options.scale || 2;
    return `decimal(${precision}, ${scale})`;
  }
  if (type === 'date') return 'date';
  if (type === 'timestamp') return 'timestamp';
  if (type === 'jsonb') return 'jsonb';
  if (type === 'enum') {
    // Return as varchar for now, enum types need special handling
    return 'varchar(50)';
  }
  return 'text'; // fallback
}

// Extract columns from entity file content
function extractColumns(entityContent, entityName) {
  const columns = [];
  const lines = entityContent.split('\n');
  
  let currentColumn = null;
  let inColumnDecorator = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (!line || line.startsWith('//') || line.startsWith('*')) continue;
    
    // Detect @Column decorator
    if (line.includes('@Column')) {
      inColumnDecorator = true;
      currentColumn = { options: {} };
      continue;
    }
    
    // Extract column options from decorator
    if (inColumnDecorator) {
      if (line.includes('type:')) {
        const typeMatch = line.match(/type:\s*['"]([^'"]+)['"]/);
        if (typeMatch) currentColumn.options.type = typeMatch[1];
        
        const lengthMatch = line.match(/length:\s*(\d+)/);
        if (lengthMatch) currentColumn.options.length = parseInt(lengthMatch[1]);
        
        const precisionMatch = line.match(/precision:\s*(\d+)/);
        if (precisionMatch) currentColumn.options.precision = parseInt(precisionMatch[1]);
        
        const scaleMatch = line.match(/scale:\s*(\d+)/);
        if (scaleMatch) currentColumn.options.scale = parseInt(scaleMatch[1]);
        
        const nullableMatch = line.match(/nullable:\s*(true|false)/);
        if (nullableMatch) currentColumn.options.nullable = nullableMatch[1] === 'true';
        
        const defaultMatch = line.match(/default:\s*([^,}]+)/);
        if (defaultMatch) currentColumn.options.default = defaultMatch[1].trim();
      }
      
      if (line.includes('@PrimaryGeneratedColumn')) {
        currentColumn = { options: { type: 'uuid', primary: true } };
        inColumnDecorator = false;
      }
      
      if (line.includes('@CreateDateColumn')) {
        currentColumn = { options: { type: 'timestamp', name: 'created_at' } };
        inColumnDecorator = false;
      }
      
      if (line.includes('@UpdateDateColumn')) {
        currentColumn = { options: { type: 'timestamp', name: 'updated_at' } };
        inColumnDecorator = false;
      }
      
      // Column property definition
      if (line.match(/^\w+(\??):\s*\w+/)) {
        const propMatch = line.match(/^(\w+)(\??):\s*(\w+)/);
        if (propMatch && currentColumn) {
          currentColumn.name = propMatch[1];
          if (propMatch[2] === '?') {
            currentColumn.options.nullable = true;
          }
          inColumnDecorator = false;
        }
      }
      
      // Check if decorator block ended
      if (line.includes(')') && !line.includes('@')) {
        inColumnDecorator = false;
      }
    }
    
    // Detect property with @JoinColumn (foreign key)
    if (line.includes('@JoinColumn')) {
      const nameMatch = line.match(/name:\s*['"]([^'"]+)['"]/);
      if (nameMatch && currentColumn) {
        currentColumn.name = nameMatch[1];
        currentColumn.options.type = 'uuid';
      }
    }
    
    // Property definition without decorator
    if (line.match(/^\w+(\??):\s*\w+/) && !currentColumn) {
      const propMatch = line.match(/^(\w+)(\??):\s*(\w+)/);
      if (propMatch && !line.includes('@')) {
        // This might be a relation property, skip for now
      }
    }
  }
  
  return columns;
}

// Simplified manual extraction based on known patterns
const entities = {
  'users': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'email', type: 'varchar(255)', nullable: false },
    { name: 'password', type: 'varchar(255)', nullable: false },
    { name: 'fullName', type: 'varchar(255)', nullable: false },
    { name: 'phone', type: 'varchar(255)', nullable: true },
    { name: 'isActive', type: 'boolean', nullable: false, default: true },
    { name: 'role_id', type: 'uuid', nullable: true },
    { name: 'organization_id', type: 'uuid', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'roles': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'name', type: 'user_role_enum', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'permissions', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'organizations': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'name', type: 'varchar(255)', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'works': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'name', type: 'varchar(255)', nullable: false },
    { name: 'client', type: 'varchar(255)', nullable: false },
    { name: 'address', type: 'text', nullable: false },
    { name: 'start_date', type: 'date', nullable: false },
    { name: 'end_date', type: 'date', nullable: true },
    { name: 'status', type: 'work_status_enum', nullable: false },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'work_type', type: 'work_type_enum', nullable: true },
    { name: 'supervisor_id', type: 'uuid', nullable: true },
    { name: 'organization_id', type: 'uuid', nullable: true },
    { name: 'total_budget', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'total_expenses', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'total_incomes', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'physical_progress', type: 'decimal(5,2)', nullable: false, default: 0 },
    { name: 'economic_progress', type: 'decimal(5,2)', nullable: false, default: 0 },
    { name: 'financial_progress', type: 'decimal(5,2)', nullable: false, default: 0 },
    { name: 'allow_post_closure_expenses', type: 'boolean', nullable: false, default: false },
    { name: 'post_closure_enabled_by_id', type: 'uuid', nullable: true },
    { name: 'post_closure_enabled_at', type: 'timestamp', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'contracts': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'supplier_id', type: 'uuid', nullable: false },
    { name: 'rubric_id', type: 'uuid', nullable: false },
    { name: 'amount_total', type: 'decimal(15,2)', nullable: false },
    { name: 'amount_executed', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'payment_terms', type: 'text', nullable: true },
    { name: 'is_blocked', type: 'boolean', nullable: false, default: false },
    { name: 'status', type: 'contract_status_enum', nullable: false },
    { name: 'observations', type: 'text', nullable: true },
    { name: 'validity_date', type: 'date', nullable: true },
    { name: 'scope', type: 'text', nullable: true },
    { name: 'specifications', type: 'text', nullable: true },
    { name: 'closed_by_id', type: 'uuid', nullable: true },
    { name: 'closed_at', type: 'timestamp', nullable: true },
    { name: 'start_date', type: 'date', nullable: true },
    { name: 'end_date', type: 'date', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'expenses': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'supplier_id', type: 'uuid', nullable: true },
    { name: 'contract_id', type: 'uuid', nullable: true },
    { name: 'rubric_id', type: 'uuid', nullable: false },
    { name: 'amount', type: 'decimal(15,2)', nullable: false },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'purchase_date', type: 'date', nullable: false },
    { name: 'document_type', type: 'document_type_enum', nullable: false },
    { name: 'document_number', type: 'varchar(100)', nullable: true },
    { name: 'state', type: 'expense_state_enum', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'observations', type: 'text', nullable: true },
    { name: 'created_by_id', type: 'uuid', nullable: false },
    { name: 'validated_by_id', type: 'uuid', nullable: true },
    { name: 'validated_at', type: 'timestamp', nullable: true },
    { name: 'vat_amount', type: 'decimal(15,2)', nullable: true },
    { name: 'vat_rate', type: 'decimal(5,2)', nullable: true },
    { name: 'vat_perception', type: 'decimal(15,2)', nullable: true },
    { name: 'vat_withholding', type: 'decimal(15,2)', nullable: true },
    { name: 'iibb_perception', type: 'decimal(15,2)', nullable: true },
    { name: 'income_tax_withholding', type: 'decimal(15,2)', nullable: true },
    { name: 'is_post_closure', type: 'boolean', nullable: false, default: false },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'incomes': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'type', type: 'income_type_enum', nullable: false },
    { name: 'amount', type: 'decimal(15,2)', nullable: false },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'date', type: 'date', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'document_number', type: 'varchar(100)', nullable: true },
    { name: 'is_validated', type: 'boolean', nullable: false, default: false },
    { name: 'validated_by_id', type: 'uuid', nullable: true },
    { name: 'validated_at', type: 'timestamp', nullable: true },
    { name: 'observations', type: 'text', nullable: true },
    { name: 'payment_method', type: 'payment_method_enum', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'accounting_records': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'accounting_type', type: 'accounting_type_enum', nullable: false },
    { name: 'expense_id', type: 'uuid', nullable: true },
    { name: 'income_id', type: 'uuid', nullable: true },
    { name: 'work_id', type: 'uuid', nullable: true },
    { name: 'supplier_id', type: 'uuid', nullable: true },
    { name: 'organization_id', type: 'uuid', nullable: true },
    { name: 'date', type: 'date', nullable: false },
    { name: 'month', type: 'integer', nullable: false },
    { name: 'year', type: 'integer', nullable: false },
    { name: 'month_status', type: 'month_status_enum', nullable: false },
    { name: 'document_number', type: 'varchar(100)', nullable: true },
    { name: 'description', type: 'varchar(255)', nullable: true },
    { name: 'amount', type: 'decimal(15,2)', nullable: false },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'vat_amount', type: 'decimal(15,2)', nullable: true },
    { name: 'vat_rate', type: 'decimal(5,2)', nullable: true },
    { name: 'vat_perception', type: 'decimal(15,2)', nullable: true },
    { name: 'vat_withholding', type: 'decimal(15,2)', nullable: true },
    { name: 'iibb_perception', type: 'decimal(15,2)', nullable: true },
    { name: 'income_tax_withholding', type: 'decimal(15,2)', nullable: true },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'suppliers': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'name', type: 'varchar(255)', nullable: false },
    { name: 'cuit', type: 'varchar(50)', nullable: true },
    { name: 'email', type: 'varchar(255)', nullable: true },
    { name: 'phone', type: 'varchar(50)', nullable: true },
    { name: 'category', type: 'varchar(255)', nullable: true },
    { name: 'status', type: 'supplier_status_enum', nullable: false },
    { name: 'type', type: 'supplier_type_enum', nullable: true },
    { name: 'fiscal_condition', type: 'fiscal_condition_enum', nullable: true },
    { name: 'address', type: 'text', nullable: true },
    { name: 'created_by_id', type: 'uuid', nullable: true },
    { name: 'organization_id', type: 'uuid', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'rubrics': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'name', type: 'varchar(255)', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'code', type: 'varchar(50)', nullable: true },
    { name: 'is_active', type: 'boolean', nullable: false, default: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'cashboxes': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'status', type: 'cashbox_status_enum', nullable: false },
    { name: 'opening_balance_ars', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'opening_balance_usd', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'closing_balance_ars', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'closing_balance_usd', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'difference_ars', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'difference_usd', type: 'decimal(15,2)', nullable: false, default: 0 },
    { name: 'difference_approved', type: 'boolean', nullable: false, default: false },
    { name: 'difference_approved_by_id', type: 'uuid', nullable: true },
    { name: 'difference_approved_at', type: 'timestamp', nullable: true },
    { name: 'opening_date', type: 'date', nullable: false },
    { name: 'closing_date', type: 'date', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'cash_movements': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'cashbox_id', type: 'uuid', nullable: false },
    { name: 'type', type: 'cash_movement_type_enum', nullable: false },
    { name: 'amount', type: 'decimal(15,2)', nullable: false },
    { name: 'currency', type: 'currency_enum', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'expense_id', type: 'uuid', nullable: true },
    { name: 'income_id', type: 'uuid', nullable: true },
    { name: 'date', type: 'date', nullable: false },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'work_schedule': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'stage_name', type: 'varchar(255)', nullable: false },
    { name: 'start_date', type: 'date', nullable: false },
    { name: 'end_date', type: 'date', nullable: false },
    { name: 'actual_end_date', type: 'date', nullable: true },
    { name: 'state', type: 'schedule_state_enum', nullable: false },
    { name: 'order', type: 'integer', nullable: true },
    { name: 'description', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'alerts': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'type', type: 'alert_type_enum', nullable: false },
    { name: 'severity', type: 'alert_severity_enum', nullable: false },
    { name: 'title', type: 'varchar(255)', nullable: false },
    { name: 'message', type: 'text', nullable: false },
    { name: 'is_read', type: 'boolean', nullable: false, default: false },
    { name: 'status', type: 'alert_status_enum', nullable: false },
    { name: 'user_id', type: 'uuid', nullable: true },
    { name: 'assigned_to_id', type: 'uuid', nullable: true },
    { name: 'resolved_by_id', type: 'uuid', nullable: true },
    { name: 'resolved_at', type: 'timestamp', nullable: true },
    { name: 'work_id', type: 'uuid', nullable: true },
    { name: 'supplier_id', type: 'uuid', nullable: true },
    { name: 'expense_id', type: 'uuid', nullable: true },
    { name: 'contract_id', type: 'uuid', nullable: true },
    { name: 'cashbox_id', type: 'uuid', nullable: true },
    { name: 'document_id', type: 'uuid', nullable: true },
    { name: 'metadata', type: 'jsonb', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'audit_log': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'user_id', type: 'uuid', nullable: true },
    { name: 'action', type: 'varchar(100)', nullable: false },
    { name: 'module', type: 'varchar(100)', nullable: false },
    { name: 'entity_id', type: 'uuid', nullable: true },
    { name: 'entity_type', type: 'varchar(100)', nullable: true },
    { name: 'previous_value', type: 'jsonb', nullable: true },
    { name: 'new_value', type: 'jsonb', nullable: true },
    { name: 'ip_address', type: 'varchar(50)', nullable: true },
    { name: 'user_agent', type: 'varchar(500)', nullable: true },
    { name: 'device_info', type: 'jsonb', nullable: true },
    { name: 'criticality', type: 'varchar(50)', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
  'val': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'code', type: 'varchar(50)', nullable: false },
    { name: 'expense_id', type: 'uuid', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'work_budgets': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'type', type: 'budget_type_enum', nullable: false },
    { name: 'amount', type: 'decimal(15,2)', nullable: false },
    { name: 'description', type: 'varchar(500)', nullable: true },
    { name: 'date', type: 'date', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'work_documents': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: false },
    { name: 'name', type: 'varchar(255)', nullable: true },
    { name: 'type', type: 'work_document_type_enum', nullable: false },
    { name: 'status', type: 'work_document_status_enum', nullable: false },
    { name: 'version', type: 'varchar(50)', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_by_id', type: 'uuid', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'work_users': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'work_id', type: 'uuid', nullable: false },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'role', type: 'varchar(255)', nullable: true },
    { name: 'assigned_at', type: 'timestamp', nullable: false },
  ],
  'supplier_documents': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'supplier_id', type: 'uuid', nullable: false },
    { name: 'document_type', type: 'supplier_document_type_enum', nullable: false },
    { name: 'file_url', type: 'varchar(500)', nullable: true },
    { name: 'document_number', type: 'varchar(255)', nullable: true },
    { name: 'expiration_date', type: 'date', nullable: true },
    { name: 'is_valid', type: 'boolean', nullable: false, default: true },
    { name: 'version', type: 'varchar(50)', nullable: true },
    { name: 'notes', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
    { name: 'updated_at', type: 'timestamp', nullable: false },
  ],
  'exchange_rates': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'date', type: 'date', nullable: false },
    { name: 'rate_ars_to_usd', type: 'decimal(10,4)', nullable: false },
    { name: 'rate_usd_to_ars', type: 'decimal(10,4)', nullable: false },
    { name: 'created_by_id', type: 'uuid', nullable: false },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
  'backups': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'type', type: 'backup_type_enum', nullable: false },
    { name: 'status', type: 'backup_status_enum', nullable: false },
    { name: 'file_path', type: 'varchar(500)', nullable: false },
    { name: 'storage_url', type: 'varchar(500)', nullable: true },
    { name: 'file_size', type: 'bigint', nullable: false },
    { name: 'error_message', type: 'text', nullable: true },
    { name: 'created_by_id', type: 'uuid', nullable: true },
    { name: 'started_at', type: 'timestamp', nullable: true },
    { name: 'completed_at', type: 'timestamp', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
  'offline_items': [
    { name: 'id', type: 'uuid', nullable: false, primary: true },
    { name: 'item_type', type: 'varchar(100)', nullable: false },
    { name: 'data', type: 'jsonb', nullable: false },
    { name: 'user_id', type: 'uuid', nullable: false },
    { name: 'is_synced', type: 'boolean', nullable: false, default: false },
    { name: 'synced_at', type: 'timestamp', nullable: true },
    { name: 'error_message', type: 'text', nullable: true },
    { name: 'created_at', type: 'timestamp', nullable: false },
  ],
};

// Generate SQL to check for missing columns
function generateCheckSQL(tableName, columns) {
  const columnNames = columns.map(c => `'${c.name}'`).join(', ');
  return `
-- Check missing columns for ${tableName}
SELECT 
    '${tableName}' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = '${tableName}'
  AND column_name IN (${columnNames})
ORDER BY column_name;`;
}

// Generate ALTER TABLE statements
function generateAlterTableSQL(tableName, columns) {
  const statements = [];
  
  for (const col of columns) {
    if (col.primary) continue; // Skip primary keys
    
    let sql = `ALTER TABLE ${tableName}\n  ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`;
    
    if (col.nullable === false && !col.default) {
      // For NOT NULL without default, we'll make it nullable first
      sql += ' NULL';
    } else if (col.nullable !== false) {
      sql += ' NULL';
    }
    
    if (col.default !== undefined) {
      sql += ` DEFAULT ${col.default}`;
    }
    
    sql += ';';
    statements.push(sql);
  }
  
  return statements.join('\n\n');
}

// Generate report
let report = '# Schema Audit Report\n\n';
report += '## Overview\n\n';
report += `Generated: ${new Date().toISOString()}\n\n`;
report += `Total Entities: ${Object.keys(entities).length}\n\n`;

let allAlterStatements = [];

for (const [tableName, columns] of Object.entries(entities)) {
  report += `## Table: ${tableName}\n\n`;
  report += `Total Columns: ${columns.length}\n\n`;
  report += '### Columns:\n\n';
  report += '| Column Name | Type | Nullable | Default |\n';
  report += '|-------------|------|----------|----------|\n';
  
  for (const col of columns) {
    report += `| ${col.name} | ${col.type} | ${col.nullable !== false ? 'YES' : 'NO'} | ${col.default || '-'} |\n`;
  }
  
  report += '\n### SQL Check Query:\n\n';
  report += '```sql\n';
  report += generateCheckSQL(tableName, columns);
  report += '\n```\n\n';
  
  report += '### ALTER TABLE Statements:\n\n';
  report += '```sql\n';
  const alterSQL = generateAlterTableSQL(tableName, columns);
  report += alterSQL;
  report += '\n```\n\n';
  
  allAlterStatements.push(`-- ============================================================================\n-- Table: ${tableName}\n-- ============================================================================\n\n${alterSQL}`);
  
  report += '---\n\n';
}

// Write report
fs.writeFileSync('SCHEMA_AUDIT_REPORT.md', report);

// Write final SQL script
const finalSQL = `-- ============================================================================
-- Schema Alignment SQL Script
-- ============================================================================
-- Purpose: Add missing columns to align PostgreSQL schema with TypeORM entities
-- Generated: ${new Date().toISOString()}
-- 
-- IMPORTANT: 
-- - Execute this script manually against production database
-- - All columns are added with IF NOT EXISTS (safe to run multiple times)
-- - Columns are nullable by default to prevent data loss
-- - No foreign key constraints are added (TypeORM handles relationships)
-- ============================================================================

${allAlterStatements.join('\n\n')}

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run this query to verify all columns exist:
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'users', 'roles', 'organizations', 'works', 'contracts', 'expenses',
    'incomes', 'accounting_records', 'suppliers', 'rubrics', 'cashboxes',
    'cash_movements', 'work_schedule', 'alerts', 'audit_log', 'val',
    'work_budgets', 'work_documents', 'work_users', 'supplier_documents',
    'exchange_rates', 'backups', 'offline_items'
  )
ORDER BY table_name, column_name;
`;

fs.writeFileSync('schema-align-final.sql', finalSQL);

console.log('✅ Schema audit complete!');
console.log('📄 Report: SCHEMA_AUDIT_REPORT.md');
console.log('📄 SQL Script: schema-align-final.sql');
