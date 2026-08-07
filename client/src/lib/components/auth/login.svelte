<script lang="ts">
  import { m } from "$lib/paraglide/messages";
  import { clearInviteFromUrl, readInviteFromUrl } from "$lib/invite";
  import { community } from "$lib/stores";
  import { Button } from "&/button";
  import * as Card from "&/card";
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
          {m.auth_welcome_back()}
        {:else if linkedInvite}
          {m.auth_invited()}
        {:else}
          {m.auth_join_prompt()}
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
        {mode === "login" ? m.auth_have_invite() : m.auth_have_account()}
      </Button>
    </Card.Footer>
  </Card.Root>
</div>
