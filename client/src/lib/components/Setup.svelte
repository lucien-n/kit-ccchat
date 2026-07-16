<script lang="ts">
  import { setup } from "$lib/app";
  import { community } from "$lib/stores/community.svelte";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import * as Form from "$lib/components/ui/form";
  import { Input } from "$lib/components/ui/input";
  import { apiErrorMessage, fail, toastMessage } from "$lib/forms";
  import { inviteLink } from "$lib/invite";
  import { setupBody } from "@ccchat/shared";
  import { Check, Copy } from "@lucide/svelte";
  import { defaults, setMessage, superForm } from "sveltekit-superforms";
  import { zod4, zod4Client } from "sveltekit-superforms/adapters";

  let inviteCode = $state("");
  let copied = $state(false);
  const link = $derived(inviteCode ? inviteLink(inviteCode) : "");

  const form = superForm(
    defaults(
      { communityName: "", username: "", displayName: "", password: "" },
      zod4(setupBody),
    ),
    {
      SPA: true,
      validators: zod4Client(setupBody),
      resetForm: false,
      onUpdate: async ({ form }) => {
        if (!form.valid) return;
        try {
          inviteCode = await setup(form.data);
        } catch (err) {
          setMessage(form, fail(apiErrorMessage(err, "something went wrong")));
        }
      },
      onUpdated: toastMessage,
    },
  );

  const { form: formData, enhance, submitting } = form;

  async function copy() {
    await navigator.clipboard.writeText(link);
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    {#if inviteCode}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">{community.name} is live</Card.Title>
        <Card.Description
          >Send this link to your friends so they can join.</Card.Description
        >
      </Card.Header>

      <Card.Content class="space-y-4">
        <button
          type="button"
          onclick={copy}
          class="bg-muted hover:bg-muted/70 flex w-full items-center justify-between gap-3 rounded-lg px-4 py-4 text-left transition-colors"
        >
          <span class="font-mono text-sm break-all">{link}</span>
          {#if copied}
            <Check class="size-5 shrink-0 text-emerald-500" />
          {:else}
            <Copy class="text-muted-foreground size-5 shrink-0" />
          {/if}
        </button>
        <p class="text-muted-foreground text-center text-sm">
          Clicking it opens ccchat with the code already filled in. It never expires and
          any number of people can use it - the code on its own is
          <code class="bg-muted rounded px-1 py-0.5 font-mono">{inviteCode}</code>.
        </p>
      </Card.Content>

      <Card.Footer class="mt-2">
        <Button class="w-full" onclick={() => (community.needsSetup = false)}
          >Enter {community.name}</Button
        >
      </Card.Footer>
    {:else}
      <Card.Header class="text-center">
        <Card.Title class="text-2xl">Welcome to ccchat</Card.Title>
        <Card.Description>
          This community is brand new. Name it and create your owner account - you'll get
          an invite code for your friends.
        </Card.Description>
      </Card.Header>

      <form method="POST" use:enhance>
        <Card.Content class="space-y-4">
          <Form.Field {form} name="communityName">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Community name</Form.Label>
                <Input
                  {...props}
                  bind:value={$formData.communityName}
                  placeholder="e.g. The Group Chat"
                  autocomplete="off"
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          <Form.Field {form} name="username">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Your username</Form.Label>
                <Input
                  {...props}
                  bind:value={$formData.username}
                  placeholder="lowercase, 2–24 chars"
                  autocomplete="username"
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>

          <Form.Field {form} name="password">
            <Form.Control>
              {#snippet children({ props })}
                <Form.Label>Your password</Form.Label>
                <Input
                  {...props}
                  type="password"
                  bind:value={$formData.password}
                  placeholder="at least 8 characters"
                  autocomplete="new-password"
                />
              {/snippet}
            </Form.Control>
            <Form.FieldErrors />
          </Form.Field>
        </Card.Content>

        <Card.Footer class="mt-6 flex-col gap-3">
          <Form.Button class="w-full" disabled={$submitting}>
            {$submitting ? "Creating…" : "Create community"}
          </Form.Button>
          <p class="text-muted-foreground text-center text-xs">
            Whoever fills this in first becomes the owner, so do it now - before you share
            the address.
          </p>
        </Card.Footer>
      </form>
    {/if}
  </Card.Root>
</div>
