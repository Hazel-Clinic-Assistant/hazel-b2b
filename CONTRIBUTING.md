# Contributing to Hazel B2B

## Branch rules

- **`main` is always deployable.** Never commit directly to main.
- All changes go through a pull request and require at least one review before merging.

## Branch naming

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<short-description>` | `feat/dashboard-stats` |
| Bug fix | `fix/<short-description>` | `fix/intake-form-validation` |
| Setup / config | `setup/<short-description>` | `setup/github-workflow` |
| Hotfix | `hotfix/<short-description>` | `hotfix/vapi-voice-crash` |

## Workflow

```bash
# 1. Always start from an up-to-date main
git checkout main
git pull origin main

# 2. Create your branch
git checkout -b feat/your-feature

# 3. Make changes, then commit
git add <files>
git commit -m "short description of what and why"

# 4. Push your branch
git push -u origin feat/your-feature

# 5. Open a pull request on GitHub
gh pr create --title "Your title" --body "What this does and why"
```

## Pull request checklist

- [ ] Branch is up to date with main (`git pull origin main` then rebase if needed)
- [ ] `npm run build` passes locally
- [ ] Changes are described clearly in the PR body
- [ ] At least one teammate has reviewed and approved

## Merging

Use **Squash and merge** on GitHub so main stays clean — one commit per feature.
