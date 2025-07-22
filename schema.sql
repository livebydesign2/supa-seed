-- Supa Seed Database Schema
-- This file contains the required database schema for the Supa Seed framework

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- REQUIRED TABLES
-- =============================================

-- Accounts table (main user profiles)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    username VARCHAR(100) UNIQUE,
    bio TEXT,
    picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories for organizing content
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main content/setup table
CREATE TABLE IF NOT EXISTS setups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    featured_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- OPTIONAL TABLES (for gear management)
-- =============================================

-- Gear items/products
CREATE TABLE IF NOT EXISTS gear_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id),
    make VARCHAR(255),
    model VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    weight VARCHAR(50),
    dimensions VARCHAR(100),
    image_url TEXT,
    affiliate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Junction table for setup-gear relationships
CREATE TABLE IF NOT EXISTS setup_gear_items (
    setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
    gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    priority INTEGER DEFAULT 1, -- 1=essential, 2=important, 3=nice-to-have
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (setup_id, gear_item_id)
);

-- Base templates for common setups (vehicles, backpacks, etc.)
CREATE TABLE IF NOT EXISTS base_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL, -- 'vehicle', 'backpack', 'shelter', etc.
    make VARCHAR(255),
    model VARCHAR(255),
    year INTEGER,
    specifications JSONB, -- Flexible storage for type-specific data
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Link setups to their base templates
CREATE TABLE IF NOT EXISTS setup_base_templates (
    setup_id UUID NOT NULL REFERENCES setups(id) ON DELETE CASCADE,
    base_template_id UUID NOT NULL REFERENCES base_templates(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (setup_id, base_template_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at DESC);

-- Setups indexes
CREATE INDEX IF NOT EXISTS idx_setups_account_id ON setups(account_id);
CREATE INDEX IF NOT EXISTS idx_setups_category ON setups(category);
CREATE INDEX IF NOT EXISTS idx_setups_is_public ON setups(is_public);
CREATE INDEX IF NOT EXISTS idx_setups_created_at ON setups(created_at DESC);

-- Gear items indexes
CREATE INDEX IF NOT EXISTS idx_gear_items_category_id ON gear_items(category_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_make_model ON gear_items(make, model);

-- Setup gear items indexes
CREATE INDEX IF NOT EXISTS idx_setup_gear_items_setup_id ON setup_gear_items(setup_id);
CREATE INDEX IF NOT EXISTS idx_setup_gear_items_gear_item_id ON setup_gear_items(gear_item_id);

-- Base templates indexes
CREATE INDEX IF NOT EXISTS idx_base_templates_type ON base_templates(type);
CREATE INDEX IF NOT EXISTS idx_base_templates_make_model ON base_templates(make, model);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE setups ENABLE ROW LEVEL SECURITY;
ALTER TABLE gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_gear_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE setup_base_templates ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (customize based on your needs)

-- Accounts: Users can view all public profiles, only edit their own
CREATE POLICY "Public accounts are viewable by everyone" ON accounts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own account" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own account" ON accounts
    FOR UPDATE USING (auth.uid() = id);

-- Categories: Public read access, authenticated users can create
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create categories" ON categories
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Setups: Public setups viewable by all, private setups only by owner
CREATE POLICY "Public setups are viewable by everyone" ON setups
    FOR SELECT USING (is_public = true OR auth.uid() = account_id);

CREATE POLICY "Users can insert their own setups" ON setups
    FOR INSERT WITH CHECK (auth.uid() = account_id);

CREATE POLICY "Users can update their own setups" ON setups
    FOR UPDATE USING (auth.uid() = account_id);

CREATE POLICY "Users can delete their own setups" ON setups
    FOR DELETE USING (auth.uid() = account_id);

-- Gear items: Public read access
CREATE POLICY "Gear items are viewable by everyone" ON gear_items
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create gear items" ON gear_items
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Setup gear items: Linked to setup permissions
CREATE POLICY "Setup gear items follow setup permissions" ON setup_gear_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM setups 
            WHERE setups.id = setup_gear_items.setup_id 
            AND (setups.is_public = true OR auth.uid() = setups.account_id)
        )
    );

CREATE POLICY "Users can manage their setup gear items" ON setup_gear_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM setups 
            WHERE setups.id = setup_gear_items.setup_id 
            AND auth.uid() = setups.account_id
        )
    );

-- Base templates: Public read access
CREATE POLICY "Base templates are viewable by everyone" ON base_templates
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create base templates" ON base_templates
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Setup base templates: Follow setup permissions
CREATE POLICY "Setup base templates follow setup permissions" ON setup_base_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM setups 
            WHERE setups.id = setup_base_templates.setup_id 
            AND (setups.is_public = true OR auth.uid() = setups.account_id)
        )
    );

CREATE POLICY "Users can manage their setup base templates" ON setup_base_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM setups 
            WHERE setups.id = setup_base_templates.setup_id 
            AND auth.uid() = setups.account_id
        )
    );

-- =============================================
-- STORAGE BUCKETS (for images)
-- =============================================

-- Create storage bucket for setup images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('setup-images', 'setup-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for gear images  
INSERT INTO storage.buckets (id, name, public)
VALUES ('gear-images', 'gear-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for profile images
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for setup images
CREATE POLICY "Setup images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'setup-images');

CREATE POLICY "Authenticated users can upload setup images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'setup-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own setup images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'setup-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own setup images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'setup-images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Similar policies for other buckets
CREATE POLICY "Gear images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'gear-images');

CREATE POLICY "Profile images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'profile-images');

-- =============================================
-- SAMPLE DATA (optional)
-- =============================================

-- Insert default categories
INSERT INTO categories (name, description, icon, color) VALUES 
    ('Backpacking', 'Multi-day hiking with overnight camping', '🎒', '#22c55e'),
    ('Car Camping', 'Vehicle-based camping adventures', '🚗', '#3b82f6'),
    ('Day Hiking', 'Single-day trail adventures', '🥾', '#f59e0b'),
    ('Overlanding', 'Vehicle-dependent travel and camping', '🚛', '#ef4444'),
    ('Ultralight', 'Minimalist backpacking approach', '⚖️', '#8b5cf6'),
    ('Photography', 'Outdoor photography expeditions', '📸', '#ec4899'),
    ('Rock Climbing', 'Climbing gear and equipment', '🧗', '#f97316'),
    ('Winter Sports', 'Cold weather outdoor activities', '❄️', '#06b6d4')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- FUNCTIONS (optional helpers)
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setups_updated_at BEFORE UPDATE ON setups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gear_items_updated_at BEFORE UPDATE ON gear_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();