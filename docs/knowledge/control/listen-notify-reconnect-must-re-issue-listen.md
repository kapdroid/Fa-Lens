# A Bus that reconnects but forgets to re-LISTEN goes silently deaf

A LISTEN/NOTIFY subscription lives on one connection. If that connection drops and the client transparently reconnects — which looks like correct, resilient behaviour, and passes any test that never breaks the connection — the new connection is not subscribed to anything until `LISTEN <channel>` runs again on it. A `Bus.subscribe` that reconnects without re-issuing `LISTEN` compiles, looks like it handles the failure case, and then silently stops delivering messages after the first reconnect. No ordinary publish/subscribe test catches this, because it never exercises a reconnect.

The test that catches it has to terminate the backend connection mid-subscription (not just simulate an error) and then assert that a message published after reconnection still arrives. U-011's `bus.test.ts` does this by killing the underlying connection during an active subscription and asserting the next publish is still delivered.

Source: U-011, 2026-09-09 (round-1 adr-reviewer finding).
