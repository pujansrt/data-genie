# Contributing to Data-Genie
First off, thank you for considering contributing to Data-Genie! It's people like you that make Data-Genie such a great tool.

## How Can I Contribute?

### Reporting Bugs
* Check the [GitHub Issues](https://github.com/pujansrt/data-genie/issues) to see if the bug has already been reported.
* Use the **Bug Report** template to provide as much detail as possible.

### Suggesting Enhancements
* Open an issue using the **Feature Request** template.
* Explain why the feature would be useful to most users.

### Pull Requests
1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`npm test`).
4. Format your code with Prettier (`npm run format` if available).
5. Submit a Pull Request!

## Example Issues
Here are some great places to start:
* **Add a new Filter:** Implement a simple filter like `EndsWith` or `Contains` in `src/filters/field-filters.ts`.
* **Documentation:** Improve the examples in `src/examples` or clarify the README.
* **New Transformers:** Add a `LowerCase` or `UpperCase` field transformer.

## Development Setup
```bash
npm install
npm test
npm run build
```

---
*By contributing to this project, you agree to abide by its terms.*
