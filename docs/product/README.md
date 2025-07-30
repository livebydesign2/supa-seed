# SupaSeed Product Documentation

**AI-First Database Seeding CLI Tool**

This documentation system is optimized for AI agents working on database seeding capabilities, framework integrations, and CLI features while maintaining high code quality and clear architectural context.

---

## 🚀 Quick Start for AI Agents

### **Every AI Agent Must Start Here:**
1. **Read** `ai-context/project-brief.md` ← Core project identity
2. **Check** `ai-context/current-state.md` ← What's happening now  
3. **Review** `ai-context/decision-framework.md` ← What you can decide vs escalate
4. **Follow** `ai-context/implementation-rules.md` ← Code standards & patterns

### **When Working on Features:**
1. **Find** the feature in `features/active/FEAT-XXX-name.md`
2. **Follow** the mandatory AI workflow in the feature file
3. **Use** `todo_write` tool for multi-step tasks
4. **Update** progress as you work
5. **Test** thoroughly before marking complete

### **Essential Documentation References:**
- **Testing Strategy**: `@reference/testing-strategy.md` - **MANDATORY** testing workflow for all AI agents
- **Local Development**: `@reference/local-development.md` - Development environment setup
- **Installation Guide**: `@reference/installation.md` - CLI installation and configuration
- **Troubleshooting**: `@reference/troubleshooting.md` - Common issues & solutions
- **Technical ADRs**: `@decisions/technical/` - Architecture decision records

---

## 📁 Documentation Structure

```
docs/product/
├── ai-context/                    # 🤖 AI-optimized context (always loaded)
│   ├── project-brief.md           # Core identity & constraints (300 tokens)
│   ├── current-state.md           # What's happening right now (200 tokens)
│   ├── decision-framework.md      # AI decision boundaries (400 tokens)
│   └── implementation-rules.md    # Code standards & patterns (300 tokens)
│
├── strategic/                     # 🎯 Human strategic input
│   ├── vision.md                  # Product vision & target users
│   ├── roadmap.md                 # Feature prioritization & timeline
│   └── research/                  # Market research & user insights
│
├── features/                      # 📋 State-based feature organization
│   ├── backlog/                   # Features planned but not started
│   ├── active/                    # Features currently being worked on
│   ├── done/                      # Completed features (for reference)
│   └── template/                  # Templates for new features
│       └── feature-template.md    # Comprehensive feature spec template
│
├── decisions/                     # 🏗️ Architecture Decision Records
│   ├── technical/                 # Technical architecture decisions
│   ├── product/                   # Product direction decisions
│   └── archived/                  # Historical decisions
│
└── reference/                     # 📚 Query-able knowledge base
    ├── patterns/                  # Development patterns & guides
    ├── examples/                  # Implementation examples
    └── troubleshooting/           # Common issues & solutions
```

**Related Documentation:**
- **Complete docs structure**: `@docs/README.md` - Full documentation index
- **Development guides**: `@docs/dev/` - Technical implementation guides
- **Brand guidelines**: `@docs/brand/` - Visual identity and design system

---

## 🔄 AI-First Development Workflow

### **Feature Lifecycle**
```
💡 Idea → 📝 Spec → 🏗️ Build → 🧪 Test → ✅ Ship → 📊 Learn
```

### **1. Feature Planning (Human-Led)**
- **Human** creates feature spec using `features/template/feature-template.md`
- **Human** places in `features/backlog/FEAT-XXX-name.md`
- **Human** updates `ai-context/current-state.md` with priorities

### **2. Feature Development (AI-Led)**
- **AI Agent** moves feature from `backlog/` to `active/`
- **AI Agent** follows mandatory workflow in feature file:
  1. 📊 Show current progress
  2. 🔍 Research & understand context
  3. 📋 Create todo list with `todo_write`
  4. 📝 Document progress
  5. 🧪 Test implementation
  6. 💾 Commit with descriptive messages

### **3. Feature Completion (Collaborative)**
- **AI Agent** implements according to acceptance criteria
- **Human** reviews and approves
- **AI Agent** moves feature to `features/done/`
- **Human** updates strategic documents as needed

---

## 📋 Feature Specification Format

Each feature uses our comprehensive template that combines:

- **🤖 AI Quick Start** - 30-second context for agents
- **⚠️ Mandatory Workflow** - Step-by-step process
- **🎯 Problem & Opportunity** - Why this feature matters
- **💡 Solution Vision** - What we're building
- **📋 Requirements** - User stories with acceptance criteria
- **🏗️ Technical Design** - Implementation approach
- **🔄 Implementation Tasks** - Phased task breakdown
- **🧪 Testing Strategy** - How to validate quality
- **📊 Progress Tracking** - Status and blockers
- **🔗 Links & References** - Codebase context

---

## 🎯 Design Principles

### **For AI Agents**
- **Context First** - Always read ai-context files before starting
- **Spec-Driven** - Follow feature specifications precisely
- **Test-Driven** - Validate implementation thoroughly
- **Progress-Driven** - Update status as you work
- **Quality-Driven** - Production-ready code only

### **For Human Product Owners**
- **Clarity First** - Write clear, specific requirements
- **Context Rich** - Provide business reasoning
- **Constraint Clear** - Define boundaries and limitations
- **Feedback Fast** - Review and approve quickly
- **Iteration Ready** - Expect rapid feature cycles

### **For the System**
- **AI-Optimized** - Structured for machine parsing
- **Human-Readable** - Clear for human review
- **Version-Controlled** - Track all changes
- **Searchable** - Easy to find information
- **Maintainable** - Easy to update and evolve

---

## 🛠️ Tools & Integration

### **Required AI Tools**
- `todo_write` - Task management for complex features
- `codebase_search` - Understanding existing patterns
- `edit_file` - Making code changes
- `run_terminal_cmd` - Running tests and builds

### **Development Stack**
- **CLI Framework**: Commander.js + TypeScript
- **Database**: Supabase (PostgreSQL with RLS support)
- **Target Integrations**: MakerKit + Generic Supabase schemas
- **Language**: TypeScript (strict mode)
- **Architecture**: Modular feature-based organization

### **Quality Gates**
- **TypeScript**: Zero compilation errors
- **Tests**: All tests passing (`npm test`)
- **CLI Functionality**: All commands work properly
- **Schema Compatibility**: MakerKit + generic schemas supported
- **Data Integrity**: Constraint-aware seeding without violations

---

## 📊 Success Metrics

### **Development Velocity**
- **Feature Cycle Time**: Spec → Ship in <1 week
- **Bug Rate**: <5% of features require post-ship fixes
- **Context Switch Time**: AI agent productive in <5 minutes

### **Quality Metrics**
- **User Satisfaction**: Features meet acceptance criteria
- **Performance**: All pages load <500ms
- **Security**: Zero data access violations
- **Accessibility**: 100% WCAG compliance

### **Process Metrics**
- **Documentation Coverage**: 100% of features have specs
- **Decision Tracking**: All major decisions documented
- **Knowledge Retention**: AI agents can work independently

---

## 🚨 Common Pitfalls & Solutions

### **For AI Agents**
- ❌ **Starting without reading context** → ✅ Always read ai-context files first
- ❌ **Skipping the mandatory workflow** → ✅ Follow the 6-step process every time
- ❌ **Not using todo_write for complex tasks** → ✅ Break down multi-step work
- ❌ **Forgetting to update progress** → ✅ Document as you work
- ❌ **Ignoring existing patterns** → ✅ Check `@docs/dev/` for established patterns

### **For Humans**
- ❌ **Vague requirements** → ✅ Write specific, testable acceptance criteria
- ❌ **Missing business context** → ✅ Explain why the feature matters
- ❌ **Unclear constraints** → ✅ Define technical and business boundaries
- ❌ **Slow feedback** → ✅ Review AI work within 24 hours

---

## 🔄 Continuous Improvement

This documentation system evolves based on:
- **AI Agent feedback** - What works, what doesn't
- **Human experience** - Pain points and successes  
- **Project outcomes** - Feature quality and velocity
- **Industry best practices** - Latest AI-first development patterns

### **How to Contribute**
1. **Identify** improvement opportunities
2. **Document** the problem and proposed solution
3. **Test** changes with real features
4. **Update** templates and processes
5. **Share** learnings with the team

---

## 📚 Additional Resources

### **Core Documentation**
- **Main Documentation Index**: `@docs/README.md` - Complete documentation structure
- **Development Setup**: `@docs/dev/setup.md` - Environment configuration
- **System Architecture**: `@docs/dev/architecture.md` - Technical architecture
- **Integration Patterns**: `@docs/dev/system-integration.md` - System integration guide
- **Error Handling**: `@docs/dev/error-handling.md` - Error handling patterns
- **Troubleshooting**: `@docs/dev/troubleshooting.md` - Common issues & solutions

### **Testing & Quality**
- **E2E Testing**: `@docs/testing/campfire-e2e-integration.md` - End-to-end testing
- **MakerKit Updates**: `@docs/dev/makerkit-update-process.md` - Safe update process

### **Design & Brand**
- **Brand Colors**: `@docs/brand/colors.md` - Campfire visual identity
- **Social Features**: `@docs/dev/social-features-reference.md` - Community patterns

### **External Resources**
- **MakerKit Documentation**: https://makerkit.dev/docs
- **Supabase RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **Next.js App Router**: https://nextjs.org/docs/app
- **shadcn/ui Components**: https://ui.shadcn.com/

---

**Last Updated**: 2025-01-29  
**Version**: 1.0.0  
**Status**: Active - Ready for AI-first development