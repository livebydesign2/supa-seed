-- Minimal Supa Seed Database Schema
-- This file contains the bare minimum required tables for basic Supa Seed functionality

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- MINIMAL REQUIRED TABLES
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_accounts_email ON accounts(email);
CREATE INDEX IF NOT EXISTS idx_setups_account_id ON setups(account_id);

-- Insert basic categories
INSERT INTO categories (name, description) VALUES 
    ('Backpacking', 'Multi-day hiking with overnight camping'),
    ('Car Camping', 'Vehicle-based camping adventures'),
    ('Day Hiking', 'Single-day trail adventures'),
    ('General', 'General outdoor activities')
ON CONFLICT (name) DO NOTHING;