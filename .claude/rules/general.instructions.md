---
description: General workflow rules for all development tasks. Use when making code changes, implementing features, or working on any part of the codebase. Ensures proper version control hygiene and encourages creative problem-solving.
paths:
  - "**/*"
---

# General Development Rules

These rules apply to all development work across the entire codebase. Follow these practices consistently to maintain code quality and project momentum.

## Version Control Discipline

### Before Starting Work

- **Review recent commit history** to understand recent changes and context
- Check for any work-in-progress or incomplete implementations
- Understand the current state of the feature/area you're working on

### Commit Frequently

Make commits at these key moments:

1. **After completing a logical unit of work** - Don't bundle unrelated changes
2. **Before making risky changes** - Create a checkpoint you can revert to
3. **When user confirms/finalizes changes** - Lock in approved work immediately
4. **After fixing bugs** - Each fix deserves its own commit
5. **Before switching contexts** - Commit current progress before moving to different tasks

### Commit Message Guidelines

Write clear, descriptive commit messages:

```
feat: add user authentication flow
fix: resolve navbar overflow on mobile
refactor: extract payment processing logic
docs: update API endpoint documentation
style: format components with consistent spacing
```

Use conventional commit prefixes: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

## Creative Collaboration

### Proactive Suggestions

Don't just implement what's asked - think ahead and suggest:

- **Enhancements**: "This component could also support X, which would enable Y"
- **Edge cases**: "Consider handling Z scenario - here's how we could approach it"
- **Performance wins**: "We could optimize this by doing A instead of B"
- **UX improvements**: "Users might benefit from C feature here"
- **Architectural ideas**: "This pattern could be reused for D and E"

### When to Offer Ideas

- After completing a requested implementation
- When you notice potential improvements during code review
- When the current approach has obvious extension points
- When similar patterns exist elsewhere that could be unified
- When you see opportunities to reduce future technical debt

### How to Present Suggestions

Be specific and actionable:

```
✅ "We could add a loading skeleton here using the same pattern from
   UserCard. Want me to implement it?"

❌ "This could be improved."
```

Provide context on effort and impact:

```
✅ "Adding pagination would take ~30 minutes and handle the case
   where users have 100+ items. Should I add it?"
```

## Workflow Best Practices

### Incremental Development

1. Start with the minimal working implementation
2. Commit the foundation
3. Add enhancements in separate commits
4. Suggest further improvements after each milestone

### Communication Checkpoints

- Confirm understanding before major implementations
- Show progress on complex tasks (don't go silent for too long)
- Ask for feedback at natural breakpoints
- Highlight decisions that might need user input

### Quality Standards

- Write self-documenting code with clear naming
- Include comments for non-obvious logic
- Consider edge cases and error handling
- Test critical paths before committing
- Keep commits atomic and reversible

## Summary

**Always**: Check history → Make changes → Commit frequently → Suggest improvements

**Never**: Make large uncommitted changes, implement silently without checkpoints, or miss opportunities to enhance the user's vision.
