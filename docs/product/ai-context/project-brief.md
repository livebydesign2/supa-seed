# SupaSeed: AI Context Brief

**Domain**: Database seeding CLI tool for Supabase applications  
**Architecture**: TypeScript CLI + Supabase integration + Framework detection  
**Users**: Developers working with Supabase databases (especially MakerKit)  
**Core Value**: Intelligent, constraint-aware test data generation with zero schema violations

## Product Vision
Automate database seeding for Supabase applications with framework-aware intelligence, realistic test data, and constraint compliance.

## Current Phase
v2.4.3 - TypeScript cleanup & production hardening after successful MakerKit integration

## Key Constraints
- **Technical**: MakerKit compatibility, RLS compliance, constraint-aware seeding
- **Business**: Personal use tool, AI-first development, rapid iteration  
- **Architectural**: Framework-agnostic design, modular feature organization

## Success Metrics
- **Primary**: Zero constraint violations during seeding
- **Secondary**: Framework detection accuracy (>95%)
- **Technical**: CLI responsiveness (<30s for typical operations)

## Key Features (High-Level)
- Automatic schema detection & framework identification
- Constraint-aware data generation (foreign keys, RLS, triggers)  
- MakerKit-specific integration patterns
- Realistic test data across multiple domains (outdoor gear focus)
- Hybrid user strategies (existing + new user generation)

---
**🏠 Project Location**: `/Users/tylerbarnard/Developer/Apps/supa-seed/` (navigate here first)  
**🔗 Context Files**: decision-framework.md, current-state.md, implementation-rules.md  
**📋 Strategic Source**: strategic/roadmap.md, strategic/vision.md  
**📚 Decisions Log**: decisions/technical/, decisions/product/ 