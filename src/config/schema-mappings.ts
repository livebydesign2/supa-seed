export interface TableFieldMapping {
  name: string;
  emailField?: string;
  idField: string;
  nameField?: string;
  bioField?: string;
  pictureField?: string;
  userField?: string;
  titleField?: string;
  descriptionField?: string;
  categoryField?: string;
  publicField?: string;
  typeField?: string;
  makeField?: string;
  modelField?: string;
  yearField?: string;
}

export interface SchemaMapping {
  userTable: TableFieldMapping;
  setupTable?: TableFieldMapping;
  baseTemplateTable?: TableFieldMapping;
}

export const SCHEMA_MAPPINGS: Record<string, SchemaMapping> = {
  makerkit: {
    userTable: {
      name: 'accounts',
      emailField: 'email',
      idField: 'id',
      nameField: 'name',
      pictureField: 'picture_url'
    },
    setupTable: {
      name: 'setups',
      userField: 'user_id',
      idField: 'id',
      titleField: 'title',
      descriptionField: 'description',
      categoryField: 'category',
      publicField: 'is_public'
    },
    baseTemplateTable: {
      name: 'base_templates',
      idField: 'id',
      descriptionField: 'description',
      typeField: 'type',
      makeField: 'make',
      modelField: 'model',
      yearField: 'year'
    }
  },
  
  'makerkit-profiles': {
    userTable: {
      name: 'profiles',
      emailField: 'email',
      idField: 'id',
      nameField: 'display_name',
      bioField: 'bio',
      pictureField: 'avatar_url'
    },
    setupTable: {
      name: 'setups',
      userField: 'user_id',
      idField: 'id',
      titleField: 'title',
      descriptionField: 'description',
      categoryField: 'category',
      publicField: 'is_public'
    }
  },
  
  simple: {
    userTable: {
      name: 'profiles',
      emailField: 'email',
      idField: 'id',
      nameField: 'display_name'
    },
    setupTable: {
      name: 'setups',
      userField: 'profile_id',
      idField: 'id',
      titleField: 'title',
      descriptionField: 'description'
    }
  },
  
  custom: {
    userTable: {
      name: 'users',
      emailField: 'email',
      idField: 'id',
      nameField: 'name'
    },
    setupTable: {
      name: 'posts',
      userField: 'user_id',
      idField: 'id',
      titleField: 'title',
      descriptionField: 'content'
    }
  }
};

/**
 * Get field mapping with fallbacks
 */
export function getFieldWithFallback(
  mapping: TableFieldMapping | undefined,
  fieldType: keyof TableFieldMapping,
  fallbacks: string[]
): string | undefined {
  if (!mapping) return fallbacks[0];
  
  const value = mapping[fieldType];
  if (value) return value as string;
  
  // Try fallbacks
  for (const fallback of fallbacks) {
    if (fallback in mapping && mapping[fallback as keyof TableFieldMapping]) {
      return mapping[fallback as keyof TableFieldMapping] as string;
    }
  }
  
  return fallbacks[0];
}

/**
 * Merge custom mappings with defaults
 */
export function mergeSchemaMapping(
  defaultMapping: SchemaMapping,
  customMapping?: Partial<SchemaMapping>
): SchemaMapping {
  if (!customMapping) return defaultMapping;
  
  return {
    userTable: {
      ...defaultMapping.userTable,
      ...(customMapping.userTable || {})
    },
    setupTable: customMapping.setupTable ? {
      ...defaultMapping.setupTable,
      ...customMapping.setupTable
    } : defaultMapping.setupTable,
    baseTemplateTable: customMapping.baseTemplateTable ? {
      ...defaultMapping.baseTemplateTable,
      ...customMapping.baseTemplateTable
    } : defaultMapping.baseTemplateTable
  };
}