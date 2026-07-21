import { getContext, setContext } from "svelte";
import { toast } from "svelte-sonner";
import { api, type Channel } from "$lib/api";
import { apiErrorMessage } from "$lib/forms";
import { channels } from "$lib/stores/channels.svelte";

const KEY = Symbol("channel");

export class ChannelContext {
  #read: () => Channel;

  confirmingDeletion = $state(false);
  busy = $state(false);

  constructor(read: () => Channel) {
    this.#read = read;
  }

  get channel(): Channel {
    return this.#read();
  }

  async remove() {
    this.busy = true;
    try {
      await api.channels.delete(this.channel.id);
      await channels.load();
      this.confirmingDeletion = false;
    } catch (e) {
      toast.error(apiErrorMessage(e, "failed to delete channel"));
    }
    this.busy = false;
  }
}

export function setChannelContext(read: () => Channel): ChannelContext {
  return setContext(KEY, new ChannelContext(read));
}

export function getChannelContext(): ChannelContext {
  return getContext<ChannelContext>(KEY);
}
