# Scripts Directory

Utility scripts for development, testing, and maintenance.

## `/testing`

Test scripts for validating system behavior:

- `test-prompt-generation.js` - Tests prompt generation logic
- `test-prompt-output.js` - Tests prompt output quality and structure

## Usage

### Running Test Scripts

```bash
# Test prompt generation
node scripts/testing/test-prompt-generation.js

# Test prompt output
node scripts/testing/test-prompt-output.js
```

## Adding New Scripts

When adding new scripts:
1. Place in appropriate subdirectory (`/testing`, `/deployment`, `/maintenance`)
2. Add description to this README
3. Include usage examples
4. Document any environment variables or prerequisites
