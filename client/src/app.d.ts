declare global {
  namespace App {
    namespace Superforms {
      /** Every form's `message`. Typed so a toast knows which flavour to show
       *  rather than guessing from the text. */
      type Message = { type: 'success' | 'error'; text: string };
    }
  }
}

export {};
