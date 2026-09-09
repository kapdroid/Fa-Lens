# A schema that validates a field the handler ignores promises more than the code does

`list_modules` and `get_matrix` both took a `companyId` in their Zod input schema, which validated the field's shape (a well-formed id) but the handlers never read it back out to scope the query — they answered from whatever company the bound control-plane collaborators were already scoped to. A request that named a different company's id would validate cleanly and be answered from the wrong company's data, silently.

Schema validation checks shape; it does not check that the shape is used. When a use-case's input includes a scope field (company, tenant, org), the handler must compare that field against the scope its collaborators are actually bound to and refuse the call before running, rather than accepting the field for documentation purposes only. Reviewing a schema without reading whether the handler consumes every field it declares will miss this class of bug.

Source: U-014, 2026-09-09 (round-1 adr-reviewer finding).
