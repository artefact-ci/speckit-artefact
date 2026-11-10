# @artefact-ci/sdd

L'installeur de la méthode Artefact CI. Il installe Spec Kit 1.3.2 (via `uvx`), l'extension git, l'extension `artefact-product` et le preset `artefact-sdd`, réapplique les hooks git, génère les fichiers d'agent de l'outil du projet, puis déduit `stack.yml` et écrit la constitution de base. Il ne pose aucune question : il fait, puis affiche un rapport.

## Usage

```sh
artefact-sdd init   --source <clone de speckit-artefact> [--integration <outil>]
artefact-sdd update --source <clone de speckit-artefact>
```

| Option | Rôle |
| --- | --- |
| `--source <dir>` | clone de `speckit-artefact` d'où l'extension (`extension/`) et le preset (`preset/`) sont installés en `--dev`. Obligatoire en phase 4 : la source « release GitHub » arrive en phase 5. |
| `--integration <outil>` | outil du projet pour `specify init` (`claude` par défaut). Ignoré quand `.specify/` existe : l'intégration du projet est gardée. Ignoré par `update`. |
| `--help` | affiche l'usage |

Il faut [uv](https://docs.astral.sh/uv/) et Node 24.11 ou plus. Depuis ce dépôt : `pnpm --filter @artefact-ci/sdd build`, puis `node packages/sdd/dist/cli.mjs init --source .` dans le projet.

## Ce que `init` touche

| Étape | Effet |
| --- | --- |
| Spec Kit | `specify init --here` si `.specify/` est absent, avec `--force` dès que le dossier n'est pas vide (`.git` compris) |
| Migration | si le preset `boilerplate` est installé, il est retiré (`specify preset remove boilerplate`) |
| Composants | extension git, `artefact-product`, `artefact-sdd` ; déjà installés, ils ne sont pas réinstallés (c'est le rôle d'`update`) |
| Hooks | clé `hooks:` de `.specify/extensions.yml` : les 10 hooks git du boilerplate ; le reste du fichier est gardé |
| Agents | `.claude/agents/<nom>.md` (Claude Code) et `.agents/agents/<nom>/agent.md` (Antigravity, relecteurs seulement) ; ces fichiers lisent les consignes de `.specify/extensions/artefact-product/agents/` |
| `stack.yml` | écrit seulement s'il est absent ; déduit de `nx.json`, `next.config.*`, `bun.lock` et du gestionnaire de paquets ; une clé non déduite reste vide avec `# à compléter` |
| Constitution | `.specify/memory/constitution.md` écrite seulement si elle est absente ou encore le gabarit vierge |

Un dossier `docs/agents/` hérité du boilerplate n'est jamais supprimé : le rapport le liste comme obsolète et dit si chaque consigne est identique à celle du boilerplate ou modifiée sur place (à reporter alors dans les docs du projet).

`init` lancé deux fois de suite laisse `git status` vide la deuxième fois.

## Ce que `update` touche

Il réinstalle l'extension (`extension add --dev … --force`) et le preset (`preset update --dev`, soit un retrait puis un ajout), puis régénère les fichiers d'agent et réapplique les hooks. `installed_at` change dans les registres de `.specify/` : c'est attendu. Il ne touche jamais `stack.yml` ni la constitution, et s'arrête si `.specify/` est absent.
