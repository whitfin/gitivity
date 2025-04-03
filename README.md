# Gitivity

[![Build Status](https://img.shields.io/github/actions/workflow/status/whitfin/gitivity/ci.yml?branch=main)](https://github.com/whitfin/gitivity/actions) [![Published Version](https://img.shields.io/npm/v/gitivity.svg)](https://npmjs.com/package/gitivity) [![Published Downloads](https://img.shields.io/npm/dt/gitivity)](https://npmjs.com/package/gitivity)

A dumb utility to help you mirror your GitLab and GitHub contributions.

This tool exists for those people who regularly work on both and want to replicate their
activity from one to the other. It is extremely basic, but will serve the purpose for most
users. Right now it only supports GitHub and GitLab, on the public endpoints. If there's
any interest I might add support for Enterprise versions, or other APIs (Bitbucket, etc).

This tool will attempt to replicate "activity" as defined by each service, in order to
make charts match across services. This may not always be possible, so don't expect to see
identical charts - but they should generally be pretty close. Please also keep in mind that
their definitions of activity can change at any point, but I'll do my best to keep up!

## Getting Started

You can install `gitivity` from either this repository, or from `npm`:

```bash
npm i -g gitivity
npm i -g whitfin/gitivity
```

Using `gitivity` from the CLI is simple, with you typically only needing `mirror`:

```bash
gitivity mirror <service> <token> <target>
```

For for example, exporting GitLab activity into a new repo inside `my-gitlab-activity`:

```bash
gitivity mirror gitlab glpat-_******************* my-gitlab-activity
```

You can then create a private GitHub repository and use it as a remote, which will mirror
the activity to your profile.

## Discrete Steps

If you would prefer to do this as discrete steps, you can use the `export` and `import`
commands directly. The `mirror` command is simply a convenient chain of these commands:

```bash
gitivity export <service> <token>
gitivity import <target>
```

Both of these commands work via `stdio` so you can pipe between them, or buffer to files
as an interim:

```bash
gitivity export gitlab glpat-_******************* > export.jsonl
gitivity import my-gitlab-activity < export.jsonl
```

The main difference with this approach is that `export` lacks the context of the output
repository. The `mirror` command has this context, and so we can use the latest commit
time from the repository to support incremental exports.

## How It Works

The idea here is pretty simple. You first export your commit data from a service (e.g. GitLab)
and then import it into a repository locally. For each exported commit, a new empty
commit will be generated with a matching timestamp and author.

The message of the commit contains an identifier we can use to filter out duplicate
commits on subsequent runs by scanning the Git log. This means that you can safely
schedule this to run daily or weekly without fear of duplicates.

If you have a lot of commits, it **will** take a long time to run initially. Making a
commit takes about 25ms (on my machine), so expect a few minutes if you're porting over
thousands of commits. Subsequent runs of this tool will speed up as it will only create
commits for newly exported commits.

## Help & Issues

Although this is a tool primarily designed for my own use I'm happy to hear and consider
feedback, even though I'll likely try to avoid getting too broad when it comes to things
like new features. Feel free to file issues if you need help and/or have suggestions!
