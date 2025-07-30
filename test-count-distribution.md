# Setup Count Distribution Test Cases

## Test Case 1: Exact Count Distribution
**Configuration**:
```json
{
  "tables": {
    "setups": {
      "count": 8,
      "categories": ["overlanding", "van-life", "car-camping", "backpacking"]
    }
  }
}
```

**Expected Behavior** (v2.4.8):
- Generate exactly 8 setups total
- Distribute across all available users  
- Example: 5 users → 1-2 setups per user (8 distributed)

**Previous Behavior** (v2.4.7):
- Generated 60,000+ setups (random per user × user count)

## Test Case 2: Edge Case - Count < Users
**Configuration**:
```json
{
  "tables": {
    "setups": {
      "count": 3
    }
  }
}
```

**Expected Behavior**:
- 10 users, 3 total setups
- 3 users get 1 setup each, 7 users get 0 setups
- Total: exactly 3 setups

## Test Case 3: Legacy Fallback
**Configuration**:
```json
{
  "setupsPerUser": 2
}
```

**Expected Behavior**:
- Uses legacy per-user logic
- Warning logged about legacy mode
- Each user gets 1-2 setups (random)

## Test Case 4: Safety Limit
**Configuration**:
```json
{
  "tables": {
    "setups": {
      "count": 5000
    }
  }
}
```

**Expected Behavior**:
- Error thrown: exceeds reasonable limit of 1000
- Process fails fast before generation
- Clear error message with guidance

## Validation Points
1. **Total Count Respect**: Configuration count = actual generated count
2. **Distribution Logic**: Reasonable spread across users
3. **Safety Limits**: Prevents accidental massive generation
4. **Backward Compatibility**: Legacy setupsPerUser still works
5. **Clear Logging**: Obvious which mode is being used