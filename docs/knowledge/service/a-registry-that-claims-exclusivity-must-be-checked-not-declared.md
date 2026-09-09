# A registry that claims to be the only place a verb can be declared must prove it at run time, not just at compile time

The service package's contract test set out to assert "the registry is the only place a verb is declared, so a skin cannot invent one." The first pass proved this by shape alone: the module's exports were typed such that only the registry object had verb entries. That is a compile-time promise (`as const`, a narrow export surface) — it says nothing about what a skin can still do at run time, such as importing an internal builder function and constructing a verb-shaped object outside the registry.

The fix: the contract test checks the package's actual exports for the absence of any verb object or register/builder function beside the registry itself, and the registry itself is frozen (`Object.freeze`) so it cannot be extended after module load. "Only the registry can declare a verb" is a run-time property, not a type-system one — prove it by inspecting what is exported and whether the registry is mutable, not by trusting the type signature.

Source: U-014, 2026-09-09 (round-1 adr-reviewer finding).
