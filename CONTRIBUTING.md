# Git workflow

Accepted by the owner on 2026-09-08. These rules apply to contributors and coding
agents. The owner authorizes agents to commit and push completed changes;
every merge requires the owner's explicit approval.

## Branches and change scope

- Keep `main` deployable. Make changes on short-lived branches and merge by PR;
  do not commit or push changes directly to `main`.
- Use descriptive `feat/`, `fix/`, `docs/` or `chore/` branch names.
- Implement each user story on its own short-lived branch and submit it through
  its own PR. Include the story ID in the branch name, for example
  `feat/us4-1-import-inventory`. One branch has one primary user story.
- Create each story branch from its current Bolt integration branch and target
  that Bolt branch with the story PR. When several stories need a shared contract
  or foundation change, deliver that prerequisite in a separate focused child
  branch and merge it before the dependent story branches.
- After all included stories are integrated and the runnable Bolt passes its
  required checks, squash-merge the owner-approved Bolt branch into `main`.
- Keep each branch and PR focused on one coherent change. Avoid unrelated cleanup.
- Preserve existing working-tree changes. Never discard, overwrite or include
  unrelated files merely to obtain a clean tree.

## Commits and pull requests

- Make small, meaningful commits using Conventional Commits, for example
  `docs: define Git workflow` or `feat(inventory): import stock movements`.
- Review the staged diff before committing. Stage specific files or hunks;
  do not sweep existing work into a commit.
- A PR explains the problem, resulting behavior, relevant validation and material
  limitations. Link its user story, AI-DLC requirements, decisions, acceptance
  criteria, and validation evidence.
- Require applicable build, tests, contract validation and security checks before
  merging. Documentation-only changes need relevant documentation checks, not
  unrelated application tests. Record what ran; do not claim missing checks passed.
- Obtain explicit owner merge approval. Do not enable auto-merge or otherwise
  merge on the owner's behalf without that approval for the concrete PR.
- Story PRs may retain their individual commits while integrating into a Bolt.
  Squash-merge each completed, approved Bolt PR into `main` as one trunk commit,
  then delete its merged Bolt and story branches.

## History, repository contents and releases

- Never force-push `main`. Obtain explicit approval before rewriting any published
  branch history, including force-pushing a rebased or amended branch.
- Track source, infrastructure, contracts, migrations and curated AI-DLC artifacts.
  Exclude secrets, license keys, generated datasets, model binaries, temporary
  files and machine-local state. Track reproducible data generators and artifact
  references instead. Preserve necessary versioned AI-DLC records.
- Use versioned release tags, release notes and immutable container images;
  deployments should identify an exact image digest. Do not retarget release tags
  or overwrite released image versions.

## GitHub enforcement

Protect `main` with required PRs, applicable status checks, and blocked force pushes
and deletion. Configure squash merging. For this solo repository, the owner's
explicit merge approval is the review gate; required-review settings must permit
the actual author/reviewer arrangement.

This file defines policy. Remote branch protection and required checks must be
verified/configured separately; their enforcement is not implied by this document.
