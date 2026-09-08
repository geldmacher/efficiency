# Release installation features

| Feature | Drive | Expected observation |
| --- | --- | --- |
| [First installation](first-install.md) | Packaged CLI, local assets, empty isolated homes | Correct source and controlled Codex cache; preview leaves homes unchanged |
| [Update](update.md) | Older release to current working target; identical repeat | New bytes, retained old release and plugin; repeat is a no-op |
| [Failure rollback](rollback.md) | Codex driver fails after materializing an update | Old source and marketplace restored; native cache recovery explicitly unverified |

The single driver exercises all three features. These checks complement the existing release, target, policy and link suites; they do not replace real host activation evidence.
