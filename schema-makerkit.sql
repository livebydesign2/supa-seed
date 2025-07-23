-- Enhanced Schema for MakerKit Compatibility
-- This schema adds the missing tables needed for supa-seed to work with existing MakerKit projects

-- =====================================================
-- MISSING TABLES FOR SUPA-SEED COMPATIBILITY
-- =====================================================

-- Categories for organizing content
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Gear items/products
CREATE TABLE IF NOT EXISTS public.gear_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.categories(id),
    make VARCHAR(255),
    model VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    weight VARCHAR(50),
    dimensions VARCHAR(100),
    image_url TEXT,
    affiliate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Base templates (vehicles, backpacks, etc.)
CREATE TABLE IF NOT EXISTS public.base_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL, -- 'Vehicle', 'Backpack', etc.
    make VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    capacity VARCHAR(50),
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Setups/content (if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.setups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL, -- References auth.users or profiles
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    base_template_id UUID REFERENCES public.base_templates(id),
    is_public BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Junction table for setup-gear relationships
CREATE TABLE IF NOT EXISTS public.setup_gear_items (
    setup_id UUID NOT NULL REFERENCES public.setups(id) ON DELETE CASCADE,
    gear_item_id UUID NOT NULL REFERENCES public.gear_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    priority INTEGER DEFAULT 1, -- 1=essential, 2=important, 3=nice-to-have
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (setup_id, gear_item_id)
);

-- Junction table for setup-base template relationships
CREATE TABLE IF NOT EXISTS public.setup_base_templates (
    setup_id UUID NOT NULL REFERENCES public.setups(id) ON DELETE CASCADE,
    base_template_id UUID NOT NULL REFERENCES public.base_templates(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now') NOT NULL,
    PRIMARY KEY (setup_id, base_template_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_categories_name ON public.categories(name);
CREATE INDEX IF NOT EXISTS idx_gear_items_category_id ON public.gear_items(category_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_make_model ON public.gear_items(make, model);
CREATE INDEX IF NOT EXISTS idx_base_templates_type ON public.base_templates(type);
CREATE INDEX IF NOT EXISTS idx_setups_user_id ON public.setups(user_id);
CREATE INDEX IF NOT EXISTS idx_setups_category ON public.setups(category);
CREATE INDEX IF NOT EXISTS idx_setups_public ON public.setups(is_public);
CREATE INDEX IF NOT EXISTS idx_setup_gear_items_setup_id ON public.setup_gear_items(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_gear_items_gear_item_id ON public.setup_gear_items(gear_item_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.setup_base_templates ENABLE ROW LEVEL SECURITY;

-- Categories - publicly readable
CREATE POLICY IF NOT EXISTS "categories_read" ON public.categories
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "categories_manage" ON public.categories
    FOR ALL TO authenticated
    USING (true);

-- Gear items - publicly readable
CREATE POLICY IF NOT EXISTS "gear_items_read" ON public.gear_items
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "gear_items_manage" ON public.gear_items
    FOR ALL TO authenticated
    USING (true);

-- Base templates - publicly readable
CREATE POLICY IF NOT EXISTS "base_templates_read" ON public.base_templates
    FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "base_templates_manage" ON public.base_templates
    FOR ALL TO authenticated
    USING (true);

-- Setups - public ones readable by all, private ones only by owner
CREATE POLICY IF NOT EXISTS "setups_read" ON public.setups
    FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "setups_manage" ON public.setups
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Setup gear items - follow setup permissions
CREATE POLICY IF NOT EXISTS "setup_gear_items_read" ON public.setup_gear_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.setups s
            WHERE s.id = setup_gear_items.setup_id
            AND (s.is_public = true OR s.user_id = auth.uid())
        )
    );

CREATE POLICY IF NOT EXISTS "setup_gear_items_manage" ON public.setup_gear_items
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.setups s
            WHERE s.id = setup_gear_items.setup_id
            AND s.user_id = auth.uid()
        )
    );

-- Setup base templates - follow setup permissions
CREATE POLICY IF NOT EXISTS "setup_base_templates_read" ON public.setup_base_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.setups s
            WHERE s.id = setup_base_templates.setup_id
            AND (s.is_public = true OR s.user_id = auth.uid())
        )
    );

CREATE POLICY IF NOT EXISTS "setup_base_templates_manage" ON public.setup_base_templates
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.setups s
            WHERE s.id = setup_base_templates.setup_id
            AND s.user_id = auth.uid()
        )
    );

-- =====================================================
-- PERMISSIONS
-- =====================================================

-- Grant appropriate permissions
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;

GRANT SELECT ON public.gear_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gear_items TO authenticated;

GRANT SELECT ON public.base_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.base_templates TO authenticated;

GRANT SELECT ON public.setups TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.setups TO authenticated;

GRANT SELECT ON public.setup_gear_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.setup_gear_items TO authenticated;

GRANT SELECT ON public.setup_base_templates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.setup_base_templates TO authenticated;

-- =====================================================
-- STORAGE BUCKETS
-- =====================================================

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES 
    ('setup-images', 'setup-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('gear-images', 'gear-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY IF NOT EXISTS "setup_images_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'setup-images');

CREATE POLICY IF NOT EXISTS "setup_images_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'setup-images');

CREATE POLICY IF NOT EXISTS "gear_images_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'gear-images');

CREATE POLICY IF NOT EXISTS "gear_images_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'gear-images');

CREATE POLICY IF NOT EXISTS "profile_images_read" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

CREATE POLICY IF NOT EXISTS "profile_images_upload" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'profile-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample categories (customize for your domain)
INSERT INTO public.categories (name, description, icon, color) VALUES 
    ('Primary', 'Main category items', '⭐', '#22c55e'),
    ('Secondary', 'Supporting items', '📋', '#3b82f6'),
    ('Tools', 'Tools and utilities', '🔧', '#f59e0b'),
    ('Resources', 'Resources and materials', '📚', '#ef4444'),
    ('Documentation', 'Guides and documentation', '📝', '#8b5cf6')
ON CONFLICT (name) DO NOTHING;

-- Insert sample base templates (customize for your domain)
INSERT INTO public.base_templates (type, make, model, year, description) VALUES 
    ('Project', 'Standard', 'Basic', NULL, 'Standard project template'),
    ('Project', 'Premium', 'Advanced', NULL, 'Advanced project template'),
    ('Collection', 'Starter', 'Essential', NULL, 'Essential collection template'),
    ('Collection', 'Professional', 'Complete', NULL, 'Complete collection template')
ON CONFLICT DO NOTHING;