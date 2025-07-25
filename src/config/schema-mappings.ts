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
  // Storage-related fields
  filePathField?: string;
  fileNameField?: string;
  fileSizeField?: string;
  fileTypeField?: string;
  altTextField?: string;
  storageBucketField?: string;
  uploadStatusField?: string;
}

export interface SchemaMapping {
  userTable: TableFieldMapping;
  setupTable?: TableFieldMapping;
  baseTemplateTable?: TableFieldMapping;
  mediaAttachmentsTable?: TableFieldMapping;
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
    },
    mediaAttachmentsTable: {
      name: 'media_attachments',
      idField: 'id',
      userField: 'account_id',
      filePathField: 'file_path',
      fileNameField: 'file_name',
      fileSizeField: 'file_size',
      fileTypeField: 'file_type',
      altTextField: 'alt_text',
      descriptionField: 'description',
      storageBucketField: 'storage_bucket',
      uploadStatusField: 'upload_status',
      publicField: 'is_public'
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
    },
    mediaAttachmentsTable: {
      name: 'media_attachments',
      idField: 'id',
      userField: 'user_id',
      filePathField: 'file_path',
      fileNameField: 'file_name',
      fileSizeField: 'file_size',
      fileTypeField: 'file_type',
      altTextField: 'alt_text',
      descriptionField: 'description',
      storageBucketField: 'storage_bucket',
      uploadStatusField: 'upload_status',
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
    },
    mediaAttachmentsTable: {
      name: 'media_attachments',
      idField: 'id',
      userField: 'profile_id',
      filePathField: 'file_path',
      fileNameField: 'file_name',
      fileSizeField: 'file_size',
      fileTypeField: 'file_type',
      altTextField: 'alt_text',
      descriptionField: 'description',
      storageBucketField: 'storage_bucket',
      uploadStatusField: 'upload_status',
      publicField: 'is_public'
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
    },
    mediaAttachmentsTable: {
      name: 'media_attachments',
      idField: 'id',
      userField: 'user_id',
      filePathField: 'file_path',
      fileNameField: 'file_name',
      fileSizeField: 'file_size',
      fileTypeField: 'file_type',
      altTextField: 'alt_text',
      descriptionField: 'description',
      storageBucketField: 'storage_bucket',
      uploadStatusField: 'upload_status',
      publicField: 'is_public'
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
    } : defaultMapping.baseTemplateTable,
    mediaAttachmentsTable: customMapping.mediaAttachmentsTable ? {
      ...defaultMapping.mediaAttachmentsTable,
      ...customMapping.mediaAttachmentsTable
    } : defaultMapping.mediaAttachmentsTable
  };
}