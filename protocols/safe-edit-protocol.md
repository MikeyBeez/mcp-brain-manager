# Safe AI-Assisted Code Editing Protocol

## Overview
This protocol enables AI systems to make precise, verifiable code modifications without introducing unintended changes.

## Quick Reference

### 1. Create Change Specification
```typescript
// Specify exact text to find and replace
const edit = {
  oldText: "const { length = 16 }",
  newText: "const { length = 24 }"
};
```

### 2. Backup Original
```bash
cp target.ts /tmp/target.backup.ts
```

### 3. Apply Edit
```typescript
filesystem:edit_file({
  path: "target.ts",
  edits: [edit]
})
```

### 4. Verify Changes
```bash
diff -uwB /tmp/target.backup.ts target.ts
```

### 5. Rollback if Needed
```bash
cp /tmp/target.backup.ts target.ts
```

## Key Principles

1. **Exact Text Matching**: Always use precise text, never line numbers
2. **Incremental Changes**: Break complex edits into small steps
3. **Always Verify**: Diff every change before proceeding
4. **Maintain Backups**: Ensure rollback capability

## Tested Operations

✅ **Additions**: Adding new functions, comments, imports
✅ **Deletions**: Removing code blocks, documentation
✅ **Inline Changes**: Modifying values, text within lines

## Example: Comprehensive Edit

```typescript
// Change a default value
{
  oldText: "precision = 10",
  newText: "precision = 15"
}

// Change error message
{
  oldText: "throw new Error('options must be non-empty');",
  newText: "throw new Error('options cannot be empty - provide at least one');"
}

// Add new constant
{
  oldText: "import * as crypto from 'crypto';\n\n// Documentation",
  newText: "import * as crypto from 'crypto';\n\nconst MAX_RETRIES = 3;\n\n// Documentation"
}
```

## Success Metrics

- 100% success rate in all tests
- Zero unintended modifications
- Precise control over changes

## See Also

- Full documentation: https://github.com/MikeyBeez/mcp-test-editing
- Origin conversation: CHAT_2025_01_17_001