# AI Decision Framework

## 🤖 DECIDE AUTONOMOUSLY
- Code organization & file structure within established patterns
- Variable/function naming following TypeScript conventions  
- CLI command implementation using Commander.js patterns
- Database operations respecting RLS policies and constraints
- Error handling with graceful degradation and helpful messages
- Testing approaches & test case creation for CLI functionality
- Refactoring for readability/performance within feature scope
- TypeScript interface fixes and type safety improvements
- Documentation updates for implemented CLI features

## 🙋 ASK HUMAN FIRST  
- New external dependencies beyond existing CLI ecosystem
- Database schema assumptions or constraint handling changes
- CLI command interface changes affecting user workflows
- Framework detection logic or strategy pattern changes
- Performance architecture requiring different seeding approaches
- Third-party service integrations (Ollama, external APIs)
- CLI user experience & command design decisions
- Feature scope changes or new seeding capabilities
- Breaking changes to configuration format or CLI commands

## Decision Process
1. ✅ **Check constraints** in `strategic/` and `decisions/` folders
2. 📚 **Review similar decisions** in `decisions/technical/` and `decisions/product/`
3. 🎯 **Consider impact** on success metrics from project-brief.md
4. 📝 **Document decision** with rationale in feature file
5. 🚀 **Implement** with proper testing and validation

## Preferred Solutions (When Multiple Options)
- **Simplicity** over cleverness - choose straightforward CLI implementations
- **Proven patterns** over experimental approaches - leverage existing CLI tools
- **Framework compatibility** - maintain MakerKit support while being framework-agnostic
- **Performance** for seeding operations - optimize for database efficiency
- **Maintainability** for CLI code - clear, readable TypeScript implementations  
- **Constraint compliance** - respect database constraints and RLS policies

## Escalation Triggers
- **Uncertainty about user impact** - involves UX decisions
- **Technical complexity beyond current patterns** - new architectural needs
- **Resource constraints** - time/performance trade-offs
- **Integration challenges** - affects multiple systems or external services 