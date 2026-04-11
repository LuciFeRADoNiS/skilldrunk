"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createApiKey, revokeApiKey } from "@/app/actions/api-keys";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

export function ApiKeysClient({ keys }: { keys: ApiKeyRow[] }) {
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [writeScope, setWriteScope] = useState(false);
  const [justCreated, setJustCreated] = useState<{ name: string; key: string } | null>(null);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    const scopes: Array<"read" | "write"> = writeScope ? ["read", "write"] : ["read"];
    startTransition(async () => {
      const result = await createApiKey({ name: name.trim(), scopes });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setJustCreated({ name: result.name, key: result.key });
      setName("");
      setWriteScope(false);
      toast.success("API key created. Copy it now — it won't be shown again.");
    });
  }

  function handleRevoke(id: string, keyName: string) {
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await revokeApiKey(id);
      if (!result.ok) {
        toast.error(result.error ?? "Failed to revoke.");
        return;
      }
      toast.success("Key revoked.");
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Copy failed — select and copy manually.");
    }
  }

  return (
    <div className="space-y-10">
      <section className="rounded-lg border p-6">
        <h2 className="text-lg font-semibold">Create a new key</h2>
        <form onSubmit={handleCreate} className="mt-4 space-y-4">
          <div>
            <label htmlFor="key-name" className="mb-1 block text-sm font-medium">
              Name
            </label>
            <Input
              id="key-name"
              placeholder="e.g. my-laptop-cli"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="scope-write"
              checked={writeScope}
              onChange={(e) => setWriteScope(e.target.checked)}
            />
            <label htmlFor="scope-write">
              Allow write actions (vote, comment, publish skills)
            </label>
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            Create API key
          </Button>
        </form>

        {justCreated && (
          <div className="mt-6 rounded-md border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-900">
              New key “{justCreated.name}” created. Copy it now — you won&apos;t see it again.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 overflow-x-auto rounded bg-white px-3 py-2 font-mono text-xs">
                {justCreated.key}
              </code>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => copy(justCreated.key)}
              >
                Copy
              </Button>
            </div>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold">Your keys</h2>
        {keys.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-lg border">
            {keys.map((key) => {
              const revoked = !!key.revoked_at;
              return (
                <li key={key.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      {revoked && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          revoked
                        </span>
                      )}
                      {key.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                    <div className="mt-1 font-mono text-xs text-muted-foreground">
                      {key.prefix}… · created {new Date(key.created_at).toLocaleDateString()}
                      {key.last_used_at
                        ? ` · last used ${new Date(key.last_used_at).toLocaleDateString()}`
                        : " · never used"}
                    </div>
                  </div>
                  {!revoked && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleRevoke(key.id, key.name)}
                      disabled={pending}
                    >
                      Revoke
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
