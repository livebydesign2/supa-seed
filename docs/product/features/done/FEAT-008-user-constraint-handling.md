# FEAT-008: User Constraint Handling

## **🤖 AI AGENT QUICK START** *(Read this first - 30 seconds)*

**Problem**: SupaSeed v2.4.8 fails to create additional users due to MakerKit `unique_personal_account` constraint violations  
**Solution**: Add constraint detection and graceful handling for MakerKit user limitations  
**Status**: Active | **Priority**: P1 | **Complexity**: Medium  
**Owner**: AI Agent | **Updated**: 2025-07-30

---

## **🎯 Problem & Opportunity**

### **Current Pain Points**
- **100% Additional User Creation Failure**: All attempts to create additional users fail with constraint violations
- **Constraint Ignorance**: Framework doesn't understand MakerKit's `unique_personal_account` constraint
- **No Graceful Degradation**: Framework crashes instead of adapting to constraint limits
- **Poor Error Messages**: Generic constraint violation messages instead of actionable guidance

### **Critical Evidence**
```bash
# v2.4.8 Result - Additional user creation completely fails
🆕 Creating 3 additional users with personas...
⚠️ casual_camper user creation failed: duplicate key value violates unique constraint "unique_personal_account"
⚠️ expert_overlander user creation failed: duplicate key value violates unique constraint "unique_personal_account"  
⚠️ van_life user creation failed: duplicate key value violates unique constraint "unique_personal_account"
✅ Additional user creation: 0 successful, 3 failed
```

### **Root Cause Analysis**
1. **MakerKit Constraint**: `unique_personal_account` limits personal accounts per workspace
2. **Framework Ignorance**: SupaSeed doesn't detect or respect this constraint
3. **No Pre-validation**: Framework attempts creation without checking existing limits
4. **No Fallback Strategy**: When constraint hit, framework doesn't adapt or retry

---

## **💡 Solution Vision**

### **Target State**
```
Configuration: additionalUsers.count: 10
Pre-check: MakerKit allows max 5 personal accounts, 3 exist
Adaptation: Create 2 additional users (within constraint limits)
Result: ✅ 2 successful, 0 failed, clear explanation of constraint limits
```

### **Core Principle**
**Constraint Awareness**: Framework detects database constraints and adapts generation to work within limits instead of failing

---

## **📋 Requirements**

### **REQ-001: Constraint Detection**
**As a** framework preparing to create users  
**I want** to detect MakerKit constraint limits before attempting creation  
**So that** I can plan user creation within safe limits

**Acceptance Criteria**:
- [ ] Detect `unique_personal_account` constraint existence
- [ ] Determine maximum allowed personal accounts per workspace
- [ ] Count existing personal accounts
- [ ] Calculate safe additional user count

### **REQ-002: Graceful Degradation**
**As a** framework hitting constraint limits  
**I want** to create as many users as safely possible  
**So that** I provide maximum value within constraints instead of failing completely

**Acceptance Criteria**:
- [ ] Reduce requested user count to fit within constraints
- [ ] Clear logging explaining constraint limits and adaptations
- [ ] No constraint violation errors during execution
- [ ] Successful creation of maximum possible users

### **REQ-003: Enhanced Error Handling**
**As a** developer using SupaSeed  
**I want** clear explanations when user creation is limited by constraints  
**So that** I understand why fewer users were created than requested

**Acceptance Criteria**:
- [ ] Clear messages explaining constraint limits
- [ ] Actionable guidance for working within constraints
- [ ] No generic database error messages
- [ ] Success metrics showing actual vs requested user counts

---

## **🔄 Implementation Tasks**

### **Phase 1: Constraint Analysis** *(Est: 2 hours)*

**TASK-001** 🤖 **[AI TASK]** - Analyze MakerKit Constraints ⏳
- [ ] Research `unique_personal_account` constraint in MakerKit
- [ ] Document constraint behavior and limits
- [ ] Identify constraint detection methods
- [ ] Test constraint behavior in development environment

**TASK-002** 🤖 **[AI TASK]** - Locate User Creation Logic ⏳
- [ ] Find where additional user creation happens
- [ ] Identify current error handling approach
- [ ] Document current constraint violation handling
- [ ] Map user creation flow and failure points

### **Phase 2: Core Implementation** *(Est: 3 hours)*

**TASK-003** 🤖 **[AI TASK]** - Add Constraint Detection ⏳
- [ ] Implement `unique_personal_account` constraint detection
- [ ] Add existing personal account counting
- [ ] Calculate safe additional user creation limits
- [ ] Add pre-creation constraint validation

**TASK-004** 🤖 **[AI TASK]** - Implement Graceful Degradation ⏳
- [ ] Adapt requested user count to constraint limits
- [ ] Add clear logging for constraint adaptations
- [ ] Implement constraint-safe user creation loop
- [ ] Add success/failure reporting with explanations

### **Phase 3: Testing & Validation** *(Est: 1 hour)*

**TASK-005** 🤖 **[AI TASK]** - Test Constraint Handling ⏳
- [ ] Test with various user count requests vs constraint limits
- [ ] Validate graceful degradation behavior
- [ ] Test error messages and logging clarity
- [ ] Ensure no constraint violations occur

---

## **🧪 Testing Strategy**

### **Critical Test Cases**
```javascript
// Test Case 1: Within Constraint Limits
{
  "additionalUsers": { "count": 2 }  // Well within limits
}
// Expected: 2 users created successfully

// Test Case 2: Exceeding Constraint Limits
{
  "additionalUsers": { "count": 100 }  // Intentionally high
}
// Expected: Create maximum allowed, clear explanation

// Test Case 3: At Constraint Boundary
{
  "additionalUsers": { "count": 1 }  // When at limit
}
// Expected: Adapt to actual availability, no errors
```

### **Validation Points**
- [ ] No constraint violation errors during execution
- [ ] Clear logging explains constraint adaptations
- [ ] Maximum possible users created within constraints
- [ ] Actionable error messages for constraint limits

---

## **📊 Success Metrics**
- [ ] Zero constraint violation errors during user creation
- [ ] Clear explanation when fewer users created than requested
- [ ] Maximum user creation within MakerKit constraint limits
- [ ] Graceful handling of various constraint scenarios
- [ ] Improved developer experience with actionable guidance