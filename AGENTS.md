# Instructions for Agents

Never remove existing comments. You may add new or edit comments to clarify code, but always insert a blank line before a comment (except at the start of a code block).

All markdown output must comply with markdownlint rules for consistency and readability.

Use `pnpm` for installing and managing JavaScript packages, unless specifically instructed otherwise. Do not use `npm` or `yarn` by default.

## Typescript and Javascript Guidelines

- Use async/await format instead of .then() for promises.
- Use optional chaining (?.) and nullish coalescing (??) operators.
- Use function() instead of arrow functions (=>) for React components, except for inline functions.
