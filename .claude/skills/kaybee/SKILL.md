```markdown
# kaybee Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches the core development patterns and conventions used in the `kaybee` TypeScript repository. It covers file naming, import/export styles, commit message conventions, and testing patterns. By following these guidelines, contributors can ensure consistency and maintainability across the codebase.

## Coding Conventions

### File Naming
- Use **camelCase** for all file names.
  - Example: `userService.ts`, `dataFetcher.test.ts`

### Imports
- Use **relative imports** for all internal modules.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Exports
- Use a **mixed export style** (both named and default exports are present).
  - Example (named export):
    ```typescript
    export function fetchData() { ... }
    ```
  - Example (default export):
    ```typescript
    export default UserService;
    ```

### Commit Messages
- Follow the **Conventional Commits** specification.
- Use the `refactor` prefix for refactoring changes.
  - Example:
    ```
    refactor: improve data fetching logic for performance
    ```
- Average commit message length: ~62 characters.

## Workflows

### Refactoring Code
**Trigger:** When improving code structure or readability without changing external behavior.
**Command:** `/refactor`

1. Identify code that can be improved (e.g., simplify logic, rename variables).
2. Make changes following TypeScript best practices and the coding conventions above.
3. Write a commit message starting with `refactor:`.
4. Run tests to ensure nothing is broken.
5. Push your changes.

## Testing Patterns

- Test files use the `*.test.*` naming pattern.
  - Example: `userService.test.ts`
- The testing framework is **unknown** (not detected), but tests should be colocated with the code or in a `tests` directory.
- Example test file:
  ```typescript
  import { fetchData } from './dataFetcher';

  test('fetchData returns expected results', () => {
    // test implementation
  });
  ```

## Commands
| Command    | Purpose                                      |
|------------|----------------------------------------------|
| /refactor  | Start a code refactoring workflow            |
```
