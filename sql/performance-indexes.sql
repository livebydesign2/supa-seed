-- Performance Indexes for SupaSeed v2.4.1
-- Optimized for 12-user scale with 36+ setups and related data
-- These indexes support efficient querying for typical platform operations

-- =============================================================================
-- ACCOUNTS TABLE INDEXES (MakerKit Compatible)
-- =============================================================================

-- Primary indexes for user lookup and authentication
CREATE INDEX IF NOT EXISTS idx_accounts_email 
    ON accounts (email);

CREATE INDEX IF NOT EXISTS idx_accounts_is_personal 
    ON accounts (is_personal_account) 
    WHERE is_personal_account = true;

-- Composite index for user filtering and pagination
CREATE INDEX IF NOT EXISTS idx_accounts_created_active 
    ON accounts (created_at DESC, is_personal_account) 
    WHERE is_personal_account = true;

-- Index for JSONB public_data searches (MakerKit specific)
CREATE INDEX IF NOT EXISTS idx_accounts_public_data_gin 
    ON accounts USING gin (public_data);

-- Specific indexes for common public_data queries
CREATE INDEX IF NOT EXISTS idx_accounts_username 
    ON accounts ((public_data->>'username')) 
    WHERE public_data ? 'username';

CREATE INDEX IF NOT EXISTS idx_accounts_bio 
    ON accounts ((public_data->>'bio')) 
    WHERE public_data ? 'bio';

-- =============================================================================
-- SETUPS TABLE INDEXES
-- =============================================================================

-- Primary foreign key index for user setups
CREATE INDEX IF NOT EXISTS idx_setups_account_id 
    ON setups (account_id);

-- Composite index for user setup pagination
CREATE INDEX IF NOT EXISTS idx_setups_user_created 
    ON setups (account_id, created_at DESC);

-- Index for public setups browsing
CREATE INDEX IF NOT EXISTS idx_setups_public_created 
    ON setups (created_at DESC) 
    WHERE is_public = true;

-- Index for setup title searches
CREATE INDEX IF NOT EXISTS idx_setups_title_search 
    ON setups USING gin (to_tsvector('english', title));

-- Index for category-based filtering
CREATE INDEX IF NOT EXISTS idx_setups_category 
    ON setups (category_id) 
    WHERE category_id IS NOT NULL;

-- Composite index for category + public browsing
CREATE INDEX IF NOT EXISTS idx_setups_category_public 
    ON setups (category_id, created_at DESC) 
    WHERE is_public = true AND category_id IS NOT NULL;

-- Index for setup statistics and analytics
CREATE INDEX IF NOT EXISTS idx_setups_stats 
    ON setups (total_weight, total_price) 
    WHERE total_weight IS NOT NULL OR total_price IS NOT NULL;

-- =============================================================================
-- GEAR ITEMS TABLE INDEXES
-- =============================================================================

-- Index for setup-item relationships
CREATE INDEX IF NOT EXISTS idx_gear_items_setup_id 
    ON gear_items (setup_id);

-- Composite index for setup item ordering
CREATE INDEX IF NOT EXISTS idx_gear_items_setup_order 
    ON gear_items (setup_id, item_order);

-- Index for item name searches
CREATE INDEX IF NOT EXISTS idx_gear_items_name_search 
    ON gear_items USING gin (to_tsvector('english', name));

-- Index for price-based filtering and sorting
CREATE INDEX IF NOT EXISTS idx_gear_items_price 
    ON gear_items (price) 
    WHERE price IS NOT NULL;

-- Index for weight-based filtering (ultralight users)
CREATE INDEX IF NOT EXISTS idx_gear_items_weight 
    ON gear_items (weight_grams) 
    WHERE weight_grams IS NOT NULL;

-- Index for brand-based filtering
CREATE INDEX IF NOT EXISTS idx_gear_items_brand 
    ON gear_items (brand) 
    WHERE brand IS NOT NULL;

-- =============================================================================
-- CATEGORIES TABLE INDEXES
-- =============================================================================

-- Index for category hierarchy queries
CREATE INDEX IF NOT EXISTS idx_categories_parent 
    ON categories (parent_id) 
    WHERE parent_id IS NOT NULL;

-- Index for category name searches
CREATE INDEX IF NOT EXISTS idx_categories_name 
    ON categories (name);

-- Index for active categories
CREATE INDEX IF NOT EXISTS idx_categories_active 
    ON categories (is_active) 
    WHERE is_active = true;

-- =============================================================================
-- BASE TEMPLATES TABLE INDEXES (if exists)
-- =============================================================================

-- Index for template usage
CREATE INDEX IF NOT EXISTS idx_base_templates_category 
    ON base_templates (category_id) 
    WHERE category_id IS NOT NULL;

-- Index for public templates
CREATE INDEX IF NOT EXISTS idx_base_templates_public 
    ON base_templates (is_public) 
    WHERE is_public = true;

-- =============================================================================
-- PERFORMANCE MONITORING INDEXES
-- =============================================================================

-- Index for created_at timestamp queries across all tables
-- Useful for analytics and reporting

CREATE INDEX IF NOT EXISTS idx_accounts_created_at 
    ON accounts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_setups_created_at 
    ON setups (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gear_items_created_at 
    ON gear_items (created_at DESC);

-- =============================================================================
-- PARTIAL INDEXES FOR COMMON QUERY PATTERNS
-- =============================================================================

-- Index for recent public setups (most common query)
CREATE INDEX IF NOT EXISTS idx_setups_recent_public 
    ON setups (created_at DESC, account_id) 
    WHERE is_public = true 
    AND created_at > NOW() - INTERVAL '30 days';

-- Index for active users with setups
CREATE INDEX IF NOT EXISTS idx_accounts_with_setups 
    ON accounts (created_at DESC) 
    WHERE is_personal_account = true 
    AND id IN (SELECT DISTINCT account_id FROM setups);

-- =============================================================================
-- ANALYTICS AND REPORTING INDEXES
-- =============================================================================

-- Index for user activity analytics
CREATE INDEX IF NOT EXISTS idx_setups_activity_analysis 
    ON setups (account_id, DATE(created_at));

-- Index for gear popularity analytics
CREATE INDEX IF NOT EXISTS idx_gear_items_popularity 
    ON gear_items (name, brand) 
    WHERE name IS NOT NULL;

-- Index for price trend analysis
CREATE INDEX IF NOT EXISTS idx_gear_items_price_trends 
    ON gear_items (created_at, price) 
    WHERE price IS NOT NULL;

-- =============================================================================
-- COVERING INDEXES FOR COMMON QUERIES
-- =============================================================================

-- Covering index for setup list queries
CREATE INDEX IF NOT EXISTS idx_setups_list_covering 
    ON setups (account_id, created_at DESC) 
    INCLUDE (title, description, total_weight, total_price, is_public);

-- Covering index for gear item queries within setups
CREATE INDEX IF NOT EXISTS idx_gear_items_setup_covering 
    ON gear_items (setup_id, item_order) 
    INCLUDE (name, brand, price, weight_grams);

-- =============================================================================
-- CONSTRAINTS AND PERFORMANCE NOTES
-- =============================================================================

-- Note: These indexes are optimized for:
-- 1. 12-user scale with moderate activity
-- 2. 36+ setups with average 6-8 items each
-- 3. Common query patterns: user setups, public browsing, searches
-- 4. MakerKit schema compatibility (accounts table focus)
-- 5. Analytics and reporting queries

-- Performance considerations:
-- - Partial indexes reduce storage overhead
-- - GIN indexes support full-text search
-- - Covering indexes reduce index lookups
-- - Timestamp indexes support efficient pagination

-- Monitor index usage with:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- ORDER BY idx_scan DESC;

-- Drop unused indexes if needed:
-- SELECT schemaname, tablename, indexname 
-- FROM pg_stat_user_indexes 
-- WHERE idx_scan = 0;