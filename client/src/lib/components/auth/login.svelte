<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { clearInviteFromUrl, readInviteFromUrl } from "$lib/invite";
  import { community } from "$lib/stores/community.svelte";
  import { onMount } from "svelte";
  import LoginForm from "./login-form.svelte";
  import RegisterForm from "./register-form.svelte";

  const linkedInvite = readInviteFromUrl();
  onMount(clearInviteFromUrl);

  let mode = $state<"login" | "register">(linkedInvite ? "register" : "login");

  function toggleMode() {
    mode = mode === "login" ? "register" : "login";
  }
</script>

<div class="grid min-h-dvh place-items-center p-4">
  <Card.Root class="w-full max-w-md">
    <Card.Header class="text-center">
      <Card.Title class="text-2xl">{community.name}</Card.Title>
      <Card.Description>
        {#if mode === "login"}
          Welcome back.
        {:else if linkedInvite}
          You've been invited. Pick a username and password to join.
        {:else}
          Join with an invite code from the server owner.
        {/if}
      </Card.Description>
    </Card.Header>

    {#if mode === "login"}
      <LoginForm />
    {:else}
      <RegisterForm invite={linkedInvite} />
    {/if}

    <Card.Footer class="flex-col pt-0">
      <Button
        type="button"
        variant="link"
        class="text-muted-foreground"
        onclick={toggleMode}
      >
        {mode === "login"
          ? "Have an invite code? Register"
          : "Already have an account? Log in"}
      </Button>
    </Card.Footer>
  </Card.Root>
</div>
